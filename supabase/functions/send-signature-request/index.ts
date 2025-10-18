/**
 * Edge Function: send-signature-request (V2 - PDF Direct)
 * 
 * Envia contratos para assinatura na Assinafy usando PDF direto (sem HTML).
 * 
 * Features:
 * - PDF direto via base64 ou download de Storage
 * - Polling com backoff exponencial (15 tentativas)
 * - Logs estruturados em JSON
 * - Modo DEV com auto-simulação
 * - Envio de e-mail via Resend
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===== HELPER: Get or Create Signer (Idempotente) =====
async function getOrCreateSigner(
  assignafyApiKey: string,
  assignafyAccountId: string,
  email: string,
  fullName: string
): Promise<{ id: string; created: boolean }> {
  
  // 1. Tentar buscar signatário existente
  const searchResponse = await fetch(
    `https://api.assinafy.com.br/v1/accounts/${assignafyAccountId}/signers?email=${encodeURIComponent(email)}`,
    {
      method: 'GET',
      headers: {
        'X-Api-Key': assignafyApiKey,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    const existingSigner = searchData.data?.find((s: any) => s.email === email);
    
    if (existingSigner) {
      console.log(JSON.stringify({
        level: 'info',
        action: 'signer_found',
        signer_id: existingSigner.id,
        email
      }));
      
      return { id: existingSigner.id, created: false };
    }
  }
  
  // 2. Se não existe, criar novo
  const createResponse = await fetch(
    `https://api.assinafy.com.br/v1/accounts/${assignafyAccountId}/signers`,
    {
      method: 'POST',
      headers: {
        'X-Api-Key': assignafyApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        full_name: fullName,
        email: email
      })
    }
  );
  
  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Erro ao criar signatário: ${errorText}`);
  }
  
  const createData = await createResponse.json();
  console.log(JSON.stringify({
    level: 'info',
    action: 'signer_created',
    signer_id: createData.data.id,
    email
  }));
  
  return { id: createData.data.id, created: true };
}

// Force redeploy: 2025-10-18T00:16:00Z
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let signatureRequestId: string | undefined;

  try {
    const requestData = await req.json();
    signatureRequestId = requestData.signatureRequestId;
    
    // ✅ Gerar trace_id para correlacionar logs
    const traceId = crypto.randomUUID();
    
    // Inicializar clientes
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    
    const assignafyApiKey = Deno.env.get('ASSINAFY_API_KEY');
    const assignafyAccountId = Deno.env.get('ASSINAFY_ACCOUNT_ID');
    const isDev = Deno.env.get('ENVIRONMENT') === 'development';
    
    console.log(JSON.stringify({ 
      trace_id: traceId,
      level: "info", 
      action: "signature_request_init", 
      signatureRequestId,
      isDev
    }));
    
    // Buscar signature request com dados completos
    const { data: signatureRequest, error: fetchError } = await supabaseAdmin
      .from('signature_requests')
      .select(`
        *,
        contratos (
          id,
          numero_contrato,
          documento_url,
          inscricao_id,
          inscricoes_edital (
            candidato_id,
            dados_inscricao,
            profiles (email, nome)
          )
        )
      `)
      .eq('id', signatureRequestId)
      .single();
    
    if (fetchError || !signatureRequest) {
      throw new Error(`Signature request não encontrado: ${signatureRequestId}`);
    }
    
    const contrato = signatureRequest.contratos;
    const inscricao = contrato.inscricoes_edital;
    const candidato = inscricao.profiles;
    
    console.log(JSON.stringify({
      level: 'info',
      action: 'signature_request_start',
      contrato_id: contrato.id,
      numero_contrato: contrato.numero_contrato,
      candidato_email: candidato.email
    }));
    
    // ===== OBTER PDF BYTES =====
    let pdfBytes: Uint8Array;
    
    // Prioridade 1: base64 no metadata
    if (signatureRequest.metadata?.pdf_bytes_base64) {
      console.log(JSON.stringify({
        level: 'info',
        action: 'pdf_source_base64',
        contrato_id: contrato.id
      }));
      
      const base64Data = signatureRequest.metadata.pdf_bytes_base64.replace(/^data:application\/pdf;base64,/, '');
      pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
    // Prioridade 2: download do Storage
    } else if (contrato.documento_url) {
      console.log(JSON.stringify({
        level: 'info',
        action: 'pdf_fetch_start',
        url: contrato.documento_url
      }));
      
      const pdfResponse = await fetch(contrato.documento_url);
      if (!pdfResponse.ok) {
        throw new Error(`Erro ao baixar PDF: ${pdfResponse.statusText}`);
      }
      
      pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
      
      console.log(JSON.stringify({
        level: 'info',
        action: 'pdf_fetch_success',
        size_bytes: pdfBytes.length
      }));
      
    } else {
      throw new Error('Contrato inválido: PDF não encontrado (sem base64 nem documento_url)');
    }
    
    // ===== MODO DEV: SIMULAR ASSINATURA =====
    if (isDev) {
      console.log(JSON.stringify({
        level: 'info',
        action: 'dev_mode_simulation',
        message: 'Simulando assinatura automática em 10 segundos'
      }));
      
      // Atualizar para sent
      await supabaseAdmin
        .from('signature_requests')
        .update({
          status: 'sent',
          external_id: 'dev_mode_doc_id',
          metadata: {
            ...signatureRequest.metadata,
            dev_mode: true,
            simulated: true,
            sent_at: new Date().toISOString()
          }
        })
        .eq('id', signatureRequestId);
      
      // Simular assinatura após 10s
      setTimeout(async () => {
        await supabaseAdmin
          .from('signature_requests')
          .update({
            status: 'signed',
            signed_at: new Date().toISOString(),
            metadata: {
              ...signatureRequest.metadata,
              dev_mode: true,
              simulated: true,
              signed_at: new Date().toISOString()
            }
          })
          .eq('id', signatureRequestId);
        
        await supabaseAdmin
          .from('contratos')
          .update({ status: 'assinado', assinado_em: new Date().toISOString() })
          .eq('id', contrato.id);
        
        console.log(JSON.stringify({
          level: 'info',
          action: 'dev_mode_signed',
          contrato_id: contrato.id
        }));
      }, 10000);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'DEV MODE: Assinatura simulada em 10s',
          signatureRequestId,
          devMode: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ===== PRODUÇÃO: ENVIAR À ASSINAFY =====
    if (!assignafyApiKey || !assignafyAccountId) {
      throw new Error('Credenciais Assinafy não configuradas');
    }
    
    console.log(JSON.stringify({
      level: 'info',
      action: 'assinafy_upload_start',
      contrato_id: contrato.id,
      size_bytes: pdfBytes.length
    }));
    
    // 1. Get or Create Signatário (idempotente)
    const { id: signerId, created: signerCreated } = await getOrCreateSigner(
      assignafyApiKey,
      assignafyAccountId,
      candidato.email,
      candidato.nome || candidato.email
    );

    console.log(JSON.stringify({
      level: 'info',
      action: signerCreated ? 'signer_created' : 'signer_reused',
      signer_id: signerId,
      email: candidato.email
    }));
    
    // 2. Upload do documento
    const formData = new FormData();
    const pdfBlob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
    formData.append('file', pdfBlob, `${contrato.numero_contrato}.pdf`);
    
    const uploadResponse = await fetch(
      `https://api.assinafy.com.br/v1/accounts/${assignafyAccountId}/documents`,
      {
        method: 'POST',
        headers: {
          'X-Api-Key': assignafyApiKey
        },
        body: formData
      }
    );
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Erro ao fazer upload do documento: ${errorText}`);
    }
    
    const uploadData = await uploadResponse.json();
    const documentId = uploadData.data.id;
    
    console.log(JSON.stringify({
      trace_id: traceId,
      level: 'info',
      action: 'assinafy_upload_complete',
      document_id: documentId
    }));
    
    // ✅ CRITICAL: Salvar external_id IMEDIATAMENTE com retry automático
    let updateSuccess = false;
    for (let retry = 0; retry < 2; retry++) {
      const { data, error } = await supabaseAdmin
        .from('signature_requests')
        .update({ 
          external_id: documentId,
          metadata: {
            ...signatureRequest.metadata,
            uploaded_at: new Date().toISOString(),
            document_id: documentId,
            trace_id: traceId
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', signatureRequestId)
        .select();

      if (!error && data && data.length > 0) {
        updateSuccess = true;
        console.log(JSON.stringify({
          trace_id: traceId,
          level: 'info',
          action: 'external_id_saved',
          document_id: documentId,
          signature_request_id: signatureRequestId,
          retry_attempt: retry
        }));
        break;
      } else if (error) {
        console.error(JSON.stringify({
          trace_id: traceId,
          level: 'error',
          action: 'update_external_id_failed',
          error: error.message,
          retry_attempt: retry
        }));
        
        if (retry === 0) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    if (!updateSuccess) {
      throw new Error('CRITICAL: Falha ao salvar external_id após 2 tentativas');
    }
    
    // 3. Aguardar processamento com backoff exponencial
    const pollingStartTime = Date.now();
    
    console.log(JSON.stringify({
      trace_id: traceId,
      level: 'info',
      action: 'polling_start',
      document_id: documentId,
      max_attempts: 20
    }));

    await new Promise(resolve => setTimeout(resolve, 5000)); // ✅ Delay inicial de 5s (compromisso)
    
    let documentReady = false;
    const maxAttempts = 20;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(JSON.stringify({
        trace_id: traceId,
        level: 'info',
        action: 'polling_attempt',
        document_id: documentId,
        attempt,
        elapsed_seconds: Math.floor((Date.now() - pollingStartTime) / 1000)
      }));
      
      try {
        const statusResponse = await fetch(
          `https://api.assinafy.com.br/v1/accounts/${assignafyAccountId}/documents/${documentId}`,
          {
            method: 'GET',
            headers: {
              'X-Api-Key': assignafyApiKey,
              'Content-Type': 'application/json'
            }
          }
        );

        // 404: Documento processando (normal)
        if (statusResponse.status === 404) {
          if (attempt <= 6) { // ✅ Tolerar até 30s
            console.log(JSON.stringify({
              trace_id: traceId,
              level: 'info',
              action: 'document_processing',
              attempt,
              message: '404 - aguardando processamento Assinafy'
            }));
            
            // Backoff 1.5
            const delay = Math.min(2000 * Math.pow(1.5, attempt - 1), 20000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            throw new Error('Documento não encontrado após 30s - possível falha no upload');
          }
        }

        // 5xx: Erro servidor Assinafy
        if (statusResponse.status >= 500) {
          console.warn(JSON.stringify({
            trace_id: traceId,
            level: 'warn',
            action: 'assinafy_server_error',
            status: statusResponse.status,
            attempt
          }));
          
          if (attempt <= 10) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
          throw new Error(`Assinafy server error: ${statusResponse.status}`);
        }

        // 4xx (exceto 404): Erro permanente
        if (statusResponse.status >= 400) {
          throw new Error(`Assinafy client error: ${statusResponse.status}`);
        }

        // 200 OK: Processar resposta
        const statusData = await statusResponse.json();
        
        // Verificar se documento está pronto
        if (statusData.data?.status === 'pending_signature' || statusData.data?.status === 'active') {
          console.log(JSON.stringify({
            trace_id: traceId,
            level: 'info',
            action: 'document_ready',
            document_id: documentId,
            assinafy_status: statusData.data.status,
            elapsed_seconds: Math.floor((Date.now() - pollingStartTime) / 1000),
            polling_attempts: attempt
          }));

          // ✅ Atualizar status para 'sent'
          await supabaseAdmin
            .from('signature_requests')
            .update({
              status: 'sent',
              external_status: statusData.data.status,
              metadata: {
                ...signatureRequest.metadata,
                ready_at: new Date().toISOString(),
                polling_attempts: attempt,
                total_duration_seconds: Math.floor((Date.now() - pollingStartTime) / 1000),
                trace_id: traceId
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', signatureRequestId);

          documentReady = true;
          break;
        }

        console.log(JSON.stringify({
          trace_id: traceId,
          level: 'info',
          action: 'document_still_processing',
          attempt,
          status: statusData.data?.status
        }));

      } catch (error: any) {
        console.error(JSON.stringify({
          trace_id: traceId,
          level: 'error',
          action: 'polling_error',
          attempt,
          error: error.message
        }));

        if (attempt === maxAttempts) {
          throw error;
        }
      }

      // Backoff 1.5
      const delay = Math.min(2000 * Math.pow(1.5, attempt - 1), 20000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    if (!documentReady) {
      console.warn(JSON.stringify({
        trace_id: traceId,
        level: 'warn',
        action: 'polling_timeout',
        document_id: documentId,
        attempts: maxAttempts,
        elapsed_seconds: Math.floor((Date.now() - pollingStartTime) / 1000),
        message: 'Documento ainda processando - marcando para retry manual'
      }));
      
      // Atualizar signature_request como "needs_retry"
      await supabaseAdmin
        .from('signature_requests')
        .update({ 
          status: 'needs_retry',
          external_id: documentId,
          metadata: {
            ...signatureRequest.metadata,
            timeout_at: new Date().toISOString(),
            retry_available: true,
            last_attempt_info: {
              max_attempts: maxAttempts,
              document_id: documentId,
              message: 'Timeout aguardando processamento Assinafy'
            },
            trace_id: traceId
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', signatureRequestId);
      
      return new Response(
        JSON.stringify({
          success: false,
          retry_available: true,
          message: 'Timeout aguardando Assinafy. Aguarde 1-2min e tente reenviar.',
          signatureRequestId,
          externalId: documentId,
          trace_id: traceId
        }),
        { 
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 4. Solicitar assinatura
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
      level: 'info',
      action: 'assignment_created',
      assignment_id: assignmentId
    }));
    
    // 5. Buscar URL de assinatura
    const docDetailsResponse = await fetch(
      `https://api.assinafy.com.br/v1/accounts/${assignafyAccountId}/documents/${documentId}`,
      {
        headers: {
          'X-Api-Key': assignafyApiKey
        }
      }
    );
    
    let signatureUrl = '';
    if (docDetailsResponse.ok) {
      const docDetails = await docDetailsResponse.json();
      signatureUrl = docDetails.data?.assignments?.[0]?.signature_url || '';
    }
    
    // 6. Atualizar signature_request
    await supabaseAdmin
      .from('signature_requests')
      .update({
        external_id: documentId,
        status: 'sent',
        external_status: 'sent',
        metadata: {
          ...signatureRequest.metadata,
          assinafy_document_id: documentId,
          assinafy_assignment_id: assignmentId,
          assinafy_signer_id: signerId,
          signature_url: signatureUrl,
          sent_at: new Date().toISOString()
        }
      })
      .eq('id', signatureRequestId);
    
    // 7. Enviar e-mail se houver URL de assinatura
    if (signatureUrl) {
      try {
        // Declarar HTML como constante (evita erro de JSON multi-linha)
        const emailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">🖊️ Contrato Pronto para Assinatura</h1></div><div style="padding: 30px; background: #f9fafb;"><h2 style="color: #1f2937;">Olá ${candidato.nome || 'Candidato'},</h2><p style="font-size: 16px; color: #4b5563; line-height: 1.6;">Seu contrato de credenciamento está pronto e aguardando sua assinatura digital.</p><div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;"><p style="margin: 5px 0;"><strong>Número do Contrato:</strong> ${contrato.numero_contrato}</p><p style="margin: 5px 0;"><strong>Provedor:</strong> Assinafy (Assinatura Digital Segura)</p></div><div style="text-align: center; margin: 30px 0;"><a href="${signatureUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">🖊️ Assinar Contrato Agora</a></div><p style="font-size: 14px; color: #6b7280; text-align: center;">Ou copie e cole este link no navegador:<br/><code style="background: #e5e7eb; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all; font-size: 12px;">${signatureUrl}</code></p><div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b;"><p style="margin: 0; font-size: 14px; color: #92400e;">⏰ <strong>Atenção:</strong> Este link é válido por 30 dias.</p></div></div><div style="background: #1f2937; padding: 20px; text-align: center;"><p style="color: #9ca3af; margin: 0; font-size: 14px;">Sistema de Credenciamento<br/>Em caso de dúvidas, entre em contato com nossa equipe.</p></div></div>`;
        
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Contratos <onboarding@resend.dev>",
            to: [candidato.email],
            subject: "🖊️ Contrato Pronto para Assinatura Digital",
            html: emailHtml
          })
        });
        
        if (!emailResponse.ok) {
          throw new Error(`Erro ao enviar e-mail: ${emailResponse.status}`);
        }
        
        console.log(JSON.stringify({
          level: 'info',
          action: 'signature_email_sent',
          contrato_id: contrato.id,
          email: candidato.email
        }));
      } catch (emailError) {
        console.error(JSON.stringify({
          level: 'error',
          action: 'email_send_failed',
          error: emailError instanceof Error ? emailError.message : 'Unknown'
        }));
        // Não falha a operação se e-mail falhar
      }
    }
    
    console.log(JSON.stringify({
      trace_id: traceId,
      level: 'info',
      action: 'signature_flow_complete',
      signature_request_id: signatureRequestId,
      document_id: documentId,
      total_duration_seconds: Math.floor((Date.now() - pollingStartTime) / 1000)
    }));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Documento enviado para assinatura com sucesso',
        signatureRequestId,
        documentId,
        externalId: documentId,
        signatureUrl,
        trace_id: traceId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error: any) {
    console.error(JSON.stringify({
      level: 'error',
      action: 'signature_request_failed',
      error: error.message,
      stack: error.stack
    }));
    
    // Atualizar status para failed
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      if (signatureRequestId) {
        await supabaseAdmin
          .from('signature_requests')
          .update({
            status: 'failed',
            metadata: {
              error: error.message,
              failed_at: new Date().toISOString()
            }
          })
          .eq('id', signatureRequestId);
      }
    } catch (updateError) {
      console.error('Erro ao atualizar status para failed:', updateError);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        context: {
          timestamp: new Date().toISOString(),
          environment: Deno.env.get('ENVIRONMENT')
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
