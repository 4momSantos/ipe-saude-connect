/**
 * Edge Function: assinafy-webhook-finalizacao
 * Processa callbacks da Assinafy para finalizar o credenciamento
 * 
 * Fluxo:
 * 1. Recebe evento do Assinafy (document.signed/rejected/expired/viewed)
 * 2. Registra auditoria (IP, timestamp, evento)
 * 3. Atualiza signature_requests no banco
 * 4. Se assinado:
 *    - Atualiza contrato → status 'assinado'
 *    - Cria/ativa credenciado → trigger automático cria certificado
 *    - Invoca edge function gerar-certificado
 * 5. Retorna sempre 200 (idempotente para evitar retries)
 * 
 * Segurança: 
 * - Assinafy não utiliza webhook secrets (conforme documentação oficial)
 * - Autenticação ocorre via X-Api-Key nas requisições à API
 * - Logs de auditoria registram IP de origem e user-agent
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: 'document.signed' | 'document.rejected' | 'document.expired' | 'document.viewed' | 'document.metadata_ready';
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

// Função validateWebhookSecret removida - Assinafy não utiliza webhook secrets

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
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // ✅ Assinafy não usa validação de webhook secret segundo documentação oficial
    // A segurança vem da API Key utilizada nas requisições à API
    // Logs de auditoria para rastreabilidade:
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'webhook_received',
      requestId,
      source: 'assinafy',
      clientIP,
      userAgent: req.headers.get('user-agent') || 'unknown'
    }));

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
      case 'document.metadata_ready':
        // Documento processado e pronto para assignment
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'document_metadata_ready',
          requestId,
          documentId
        }));

        try {
          const assignafyApiKey = Deno.env.get('ASSINAFY_API_KEY');
          const assignafyAccountId = Deno.env.get('ASSINAFY_ACCOUNT_ID');
          
          if (!assignafyApiKey || !assignafyAccountId) {
            throw new Error('Missing Assinafy credentials');
          }

          // Buscar dados do contrato
          const contratoId = metadata.contrato_id;
          if (!contratoId) {
            throw new Error('contrato_id não encontrado no metadata');
          }

          const { data: contrato } = await supabase
            .from('contratos')
            .select('numero_contrato, inscricao_id')
            .eq('id', contratoId)
            .single();

          if (!contrato) {
            throw new Error('Contrato não encontrado');
          }

          // Buscar dados do candidato
          const { data: inscricao } = await supabase
            .from('inscricoes_edital')
            .select('candidato_id, dados_inscricao')
            .eq('id', contrato.inscricao_id)
            .single();

          const dadosInscricao = inscricao?.dados_inscricao as any || {};
          const dadosPessoais = dadosInscricao.dadosPessoais || {};
          const candidatoEmail = dadosPessoais.email;
          const candidatoNome = dadosPessoais.nome;

          if (!candidatoEmail) {
            throw new Error('Email do candidato não encontrado');
          }

          // Buscar ou criar signer
          const signerId = metadata.assinafy_signer_id;
          if (!signerId) {
            throw new Error('Signer ID não encontrado no metadata');
          }

          // Criar assignment
          const assignmentResponse = await fetch(
            `https://api.assinafy.com.br/v1/documents/${documentId}/assignments`,
            {
              method: 'POST',
              headers: {
                'X-Api-Key': assignafyApiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                method: 'virtual',
                signer_ids: [signerId],
                message: `Por favor, assine o contrato ${contrato.numero_contrato}.`,
                expires_at: null
              })
            }
          );

          if (!assignmentResponse.ok) {
            const errorText = await assignmentResponse.text();
            throw new Error(`Erro ao criar assignment: ${errorText}`);
          }

          const assignmentData = await assignmentResponse.json();
          const assignmentId = assignmentData.data?.id || assignmentData.id;

          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'assignment_created',
            requestId,
            assignmentId
          }));

          // Buscar URL de assinatura
          const docDetailsResponse = await fetch(
            `https://api.assinafy.com.br/v1/accounts/${assignafyAccountId}/documents/${documentId}`,
            {
              headers: { 'X-Api-Key': assignafyApiKey }
            }
          );

          let signatureUrl = '';
          if (docDetailsResponse.ok) {
            const docDetails = await docDetailsResponse.json();
            signatureUrl = docDetails.data?.assignments?.[0]?.signature_url || '';
          }

          // Atualizar signature_request
          await withRetry(async () => {
            const { error } = await supabase
              .from('signature_requests')
              .update({
                status: 'pending',
                external_status: 'pending_signature',
                metadata: {
                  ...metadata,
                  assinafy_assignment_id: assignmentId,
                  signature_url: signatureUrl,
                  metadata_ready_at: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', signatureRequest.id);

            if (error) throw error;
          });

          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'signature_request_updated',
            requestId,
            status: 'pending',
            has_signature_url: !!signatureUrl
          }));

          // Enviar email se houver URL
          if (signatureUrl && candidatoEmail) {
            try {
              const resendApiKey = Deno.env.get('RESEND_API_KEY');
              if (!resendApiKey) {
                throw new Error('RESEND_API_KEY não configurada');
              }

              const emailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">🖊️ Contrato Pronto para Assinatura</h1></div><div style="padding: 30px; background: #f9fafb;"><h2 style="color: #1f2937;">Olá ${candidatoNome || 'Candidato'},</h2><p style="font-size: 16px; color: #4b5563; line-height: 1.6;">Seu contrato de credenciamento está pronto e aguardando sua assinatura digital.</p><div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;"><p style="margin: 5px 0;"><strong>Número do Contrato:</strong> ${contrato.numero_contrato}</p><p style="margin: 5px 0;"><strong>Provedor:</strong> Assinafy (Assinatura Digital Segura)</p></div><div style="text-align: center; margin: 30px 0;"><a href="${signatureUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">🖊️ Assinar Contrato Agora</a></div><p style="font-size: 14px; color: #6b7280; text-align: center;">Ou copie e cole este link no navegador:<br/><code style="background: #e5e7eb; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all; font-size: 12px;">${signatureUrl}</code></p><div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b;"><p style="margin: 0; font-size: 14px; color: #92400e;">⏰ <strong>Atenção:</strong> Este link é válido por 30 dias.</p></div></div><div style="background: #1f2937; padding: 20px; text-align: center;"><p style="color: #9ca3af; margin: 0; font-size: 14px;">Sistema de Credenciamento<br/>Em caso de dúvidas, entre em contato com nossa equipe.</p></div></div>`;

              const emailResponse = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${resendApiKey}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  from: "Contratos <onboarding@resend.dev>",
                  to: [candidatoEmail],
                  subject: "🖊️ Contrato Pronto para Assinatura Digital",
                  html: emailHtml
                })
              });

              if (!emailResponse.ok) {
                throw new Error(`Erro ao enviar email: ${emailResponse.status}`);
              }

              console.log(JSON.stringify({
                timestamp: new Date().toISOString(),
                event: 'signature_email_sent',
                requestId,
                email: candidatoEmail
              }));

            } catch (emailError: any) {
              console.error(JSON.stringify({
                timestamp: new Date().toISOString(),
                event: 'email_send_failed',
                requestId,
                error: emailError.message
              }));
            }
          }

        } catch (metadataError: any) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'metadata_ready_processing_failed',
            requestId,
            error: metadataError.message
          }));

          // Atualizar como failed
          await supabase
            .from('signature_requests')
            .update({
              status: 'failed',
              metadata: {
                ...metadata,
                error: metadataError.message,
                failed_at: new Date().toISOString()
              }
            })
            .eq('id', signatureRequest.id);
        }
        break;

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
                  const { data: certData, error: certError } = await supabase.functions.invoke('gerar-certificado', {
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
                  } else if (certData?.success) {
                    console.log(JSON.stringify({
                      timestamp: new Date().toISOString(),
                      event: 'certificate_generated',
                      requestId,
                      credenciadoId: credenciado.id,
                      certificadoNumero: certData.certificado.numero_certificado
                    }));

                    // === FASE 3: ENVIAR EMAIL COM CERTIFICADO ===
                    const emailCredenciado = dadosPessoais.email || payload.signer?.email;
                    const nomeCredenciado = dadosPessoais.nome || payload.signer?.name;
                    const siteUrl = Deno.env.get('SITE_URL') || supabaseUrl.replace('.supabase.co', '.app');

                    if (emailCredenciado && certData.certificado.documento_url) {
                      try {
                        await supabase.functions.invoke('send-templated-email', {
                          body: {
                            to: emailCredenciado,
                            subject: 'Certificado de Credenciamento Emitido',
                            body: `
                              <html>
                                <body style="font-family: Arial, sans-serif; padding: 20px; background: #f9fafb;">
                                  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    <h2 style="color: #3b82f6; margin-bottom: 20px;">Certificado de Credenciamento</h2>
                                    <p>Olá <strong>${nomeCredenciado}</strong>,</p>
                                    <p>Seu certificado de credenciamento foi emitido com sucesso!</p>
                                    
                                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                      <p style="margin: 5px 0;"><strong>Número do Certificado:</strong> ${certData.certificado.numero_certificado}</p>
                                      <p style="margin: 5px 0;"><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                                      <p style="margin: 5px 0;"><strong>Validade:</strong> ${new Date(certData.certificado.validoAte).toLocaleDateString('pt-BR')}</p>
                                    </div>

                                    <p style="text-align: center; margin: 30px 0;">
                                      <a href="${certData.certificado.documento_url}" 
                                         style="background: #3b82f6; color: white; padding: 12px 24px; 
                                                text-decoration: none; border-radius: 6px; display: inline-block;">
                                        Baixar Certificado (PDF)
                                      </a>
                                    </p>

                                    <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                                      Você também pode verificar a autenticidade do seu certificado através do QR Code 
                                      ou acessando: <a href="${certData.certificado.verificationUrl}">${certData.certificado.verificationUrl}</a>
                                    </p>

                                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                                    
                                    <p style="color: #6b7280; font-size: 12px; text-align: center;">
                                      Sistema de Credenciamento
                                    </p>
                                  </div>
                                </body>
                              </html>
                            `,
                            context: {
                              inscricaoId,
                              candidatoId: inscricao.candidato_id
                            }
                          }
                        });

                        console.log(JSON.stringify({
                          timestamp: new Date().toISOString(),
                          event: 'certificate_email_sent',
                          requestId,
                          credenciadoId: credenciado.id,
                          email: emailCredenciado
                        }));

                        // === FASE 5: NOTIFICAÇÃO IN-APP ===
                        await supabase
                          .from('app_notifications')
                          .insert({
                            user_id: inscricao.candidato_id,
                            type: 'success',
                            title: 'Certificado Emitido',
                            message: `Seu certificado ${certData.certificado.numero_certificado} foi emitido e está disponível para download.`,
                            related_type: 'certificado',
                            related_id: certData.certificado.id
                          });

                        console.log(JSON.stringify({
                          timestamp: new Date().toISOString(),
                          event: 'certificate_notification_created',
                          requestId,
                          userId: inscricao.candidato_id
                        }));

                      } catch (emailError: any) {
                        console.error(JSON.stringify({
                          timestamp: new Date().toISOString(),
                          event: 'certificate_email_failed',
                          requestId,
                          credenciadoId: credenciado.id,
                          error: emailError.message
                        }));
                      }
                    }
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
