/**
 * Edge Function: assinafy-webhook-finalizacao
 * Processa callbacks da Assinafy para finalizar o credenciamento (sem workflows)
 * 
 * Fluxo:
 * 1. Recebe evento do Assinafy (document.signed/rejected/expired)
 * 2. Valida X-Webhook-Secret (HMAC SHA-256)
 * 3. Atualiza signature_requests
 * 4. Se assinado:
 *    - Atualiza contrato → 'assinado'
 *    - Cria/ativa credenciado → trigger cria certificado automaticamente
 * 5. Retorna sempre 200 (idempotente)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface WebhookPayload {
  event: 'document.signed' | 'document.rejected' | 'document.expired' | 'document.viewed';
  document: {
    id: string;
    status?: string;
    [key: string]: any;
  };
  signer?: {
    name: string;
    email: string;
    cpf?: string;
    signed_at?: string;
  };
  data?: any;
}

/**
 * Valida webhook secret (simples comparação ou HMAC)
 */
function validateWebhookSecret(
  receivedSecret: string | null,
  expectedSecret: string
): boolean {
  if (!receivedSecret) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'validation_error',
      error: 'Missing X-Webhook-Secret header'
    }));
    return false;
  }

  const isValid = receivedSecret === expectedSecret;
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'secret_validation',
    valid: isValid
  }));

  return isValid;
}

/**
 * Retry wrapper com backoff exponencial
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'retry_attempt',
          attempt,
          maxAttempts,
          nextDelayMs: delay,
          error: lastError.message
        }));
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'webhook_received',
    requestId,
    method: req.method
  }));

  try {
    // Configuração
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('ASSINAFY_WEBHOOK_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Validar secret
    const receivedSecret = req.headers.get('X-Webhook-Secret');
    
    if (webhookSecret) {
      if (!validateWebhookSecret(receivedSecret, webhookSecret)) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'secret_validation_skipped',
        message: 'ASSINAFY_WEBHOOK_SECRET not configured'
      }));
    }

    // Parse payload
    const payload: WebhookPayload = await req.json();

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'payload_parsed',
      requestId,
      webhookEvent: payload.event,
      documentId: payload.document?.id
    }));

    // Validar campos obrigatórios
    if (!payload.document?.id || !payload.event) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: document.id and event',
          received: true // Retorna 200 para evitar retry do Assinafy
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const documentId = payload.document.id;

    // Buscar signature_request com retry
    const { data: signatureRequest, error: fetchError } = await withRetry(async () => {
      return await supabase
        .from('signature_requests')
        .select('*, metadata')
        .eq('external_id', documentId)
        .eq('provider', 'assinafy')
        .maybeSingle();
    });

    if (fetchError || !signatureRequest) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'signature_request_not_found',
        requestId,
        documentId,
        error: fetchError?.message
      }));

      // Retorna 200 mesmo assim (idempotente)
      return new Response(
        JSON.stringify({ 
          message: 'Signature request not found',
          received: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'processing_webhook',
      requestId,
      signatureRequestId: signatureRequest.id,
      webhookEvent: payload.event
    }));

    // Processar evento
    let newStatus = signatureRequest.status;
    const metadata = signatureRequest.metadata || {};

    switch (payload.event) {
      case 'document.signed':
        newStatus = 'signed';
        metadata.signed_at = new Date().toISOString();
        metadata.signer_data = payload.signer;
        
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'document_signed',
          requestId,
          documentId,
          signerName: payload.signer?.name
        }));

        // Atualizar signature_request com retry
        await withRetry(async () => {
          const { error } = await supabase
            .from('signature_requests')
            .update({
              status: newStatus,
              external_status: payload.event,
              metadata,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', signatureRequest.id);

          if (error) throw error;
        });

        // Buscar contrato vinculado
        const contratoId = metadata.contrato_id;
        if (contratoId) {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'updating_contract',
            requestId,
            contratoId
          }));

          // Atualizar contrato para 'assinado' com retry
          await withRetry(async () => {
            const { error } = await supabase
              .from('contratos')
              .update({
                status: 'assinado',
                assinado_em: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', contratoId);

            if (error) throw error;
          });

          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'contract_signed',
            requestId,
            contratoId
          }));

          // Buscar inscrição vinculada
          const { data: contrato } = await supabase
            .from('contratos')
            .select('inscricao_id')
            .eq('id', contratoId)
            .single();

          if (contrato?.inscricao_id) {
            const inscricaoId = contrato.inscricao_id;

            console.log(JSON.stringify({
              timestamp: new Date().toISOString(),
              event: 'activating_credenciado',
              requestId,
              inscricaoId
            }));

            // Buscar inscrição para obter dados
            const { data: inscricao } = await supabase
              .from('inscricoes_edital')
              .select('dados_inscricao, candidato_id')
              .eq('id', inscricaoId)
              .single();

            if (inscricao) {
              const dadosInscricao = inscricao.dados_inscricao as any || {};
              const dadosPessoais = dadosInscricao.dadosPessoais || {};

              // Atualizar ou criar credenciado com retry
              await withRetry(async () => {
                // Tentar atualizar primeiro
                const { data: existing } = await supabase
                  .from('credenciados')
                  .select('id')
                  .eq('inscricao_id', inscricaoId)
                  .maybeSingle();

                if (existing) {
                  // Atualizar existente
                  const { error } = await supabase
                    .from('credenciados')
                    .update({
                      status: 'Ativo',
                      observacoes: (existing as any).observacoes + 
                        `\nContrato assinado em ${new Date().toISOString()}`,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);

                  if (error) throw error;
                } else {
                  // Criar novo
                  const { error } = await supabase
                    .from('credenciados')
                    .insert({
                      inscricao_id: inscricaoId,
                      nome: dadosPessoais.nome || payload.signer?.name || 'Não informado',
                      cpf: dadosPessoais.cpf || payload.signer?.cpf,
                      email: dadosPessoais.email || payload.signer?.email,
                      status: 'Ativo',
                      observacoes: `Credenciado via assinatura digital em ${new Date().toISOString()}`
                    });

                  if (error) throw error;
                }
              });

              // Buscar ID do credenciado para gerar certificado
              const { data: credenciado } = await supabase
                .from('credenciados')
                .select('id')
                .eq('inscricao_id', inscricaoId)
                .single();

              if (credenciado) {
                console.log(JSON.stringify({
                  timestamp: new Date().toISOString(),
                  event: 'generating_certificate',
                  requestId,
                  credenciadoId: credenciado.id
                }));

                // Gerar certificado automaticamente via edge function
                try {
                  const { error: certError } = await supabase.functions.invoke('gerar-certificado', {
                    body: { credenciadoId: credenciado.id }
                  });

                  if (certError) {
                    console.error(JSON.stringify({
                      timestamp: new Date().toISOString(),
                      event: 'certificate_generation_failed',
                      requestId,
                      credenciadoId: credenciado.id,
                      error: certError.message
                    }));
                  } else {
                    console.log(JSON.stringify({
                      timestamp: new Date().toISOString(),
                      event: 'certificate_generated',
                      requestId,
                      credenciadoId: credenciado.id
                    }));
                  }
                } catch (certGenError: any) {
                  console.error(JSON.stringify({
                    timestamp: new Date().toISOString(),
                    event: 'certificate_generation_error',
                    requestId,
                    credenciadoId: credenciado.id,
                    error: certGenError.message
                  }));
                }
              }

              console.log(JSON.stringify({
                timestamp: new Date().toISOString(),
                event: 'credenciado_activated',
                requestId,
                inscricaoId
              }));
            }
          }
        }
        break;

      case 'document.rejected':
        newStatus = 'rejected';
        metadata.rejected_at = new Date().toISOString();
        metadata.rejection_reason = payload.data?.reason || 'Sem motivo informado';

        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'document_rejected',
          requestId,
          documentId,
          reason: metadata.rejection_reason
        }));

        await withRetry(async () => {
          const { error } = await supabase
            .from('signature_requests')
            .update({
              status: newStatus,
              external_status: payload.event,
              metadata,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', signatureRequest.id);

          if (error) throw error;
        });
        break;

      case 'document.expired':
        newStatus = 'expired';
        metadata.expired_at = new Date().toISOString();

        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'document_expired',
          requestId,
          documentId
        }));

        await withRetry(async () => {
          const { error } = await supabase
            .from('signature_requests')
            .update({
              status: newStatus,
              external_status: payload.event,
              metadata,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', signatureRequest.id);

          if (error) throw error;
        });
        break;

      case 'document.viewed':
        metadata.last_viewed_at = new Date().toISOString();
        metadata.viewer = payload.signer;

        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'document_viewed',
          requestId,
          documentId
        }));

        await withRetry(async () => {
          const { error } = await supabase
            .from('signature_requests')
            .update({
              metadata,
              updated_at: new Date().toISOString()
            })
            .eq('id', signatureRequest.id);

          if (error) throw error;
        });
        break;

      default:
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'unhandled_event',
          requestId,
          webhookEvent: payload.event
        }));
    }

    const elapsedTime = Date.now() - startTime;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'webhook_processed',
      requestId,
      elapsed_ms: elapsedTime,
      status: newStatus
    }));

    // Sempre retorna 200 (idempotente)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        event: payload.event,
        status: newStatus,
        requestId
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    const elapsedTime = Date.now() - startTime;
    
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'webhook_error',
      requestId,
      elapsed_ms: elapsedTime,
      error: error.message,
      stack: error.stack
    }));

    // Mesmo com erro, retorna 200 para evitar retry infinito do Assinafy
    return new Response(
      JSON.stringify({
        error: error.message,
        message: 'Error processed, will not retry',
        requestId
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
