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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let signatureRequestId: string | undefined;

  try {
    const requestData = await req.json();
    signatureRequestId = requestData.signatureRequestId;
    
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
      level: 'info',
      action: 'assinafy_upload_complete',
      document_id: documentId
    }));
    
    // 3. Aguardar processamento com backoff exponencial
    console.log(JSON.stringify({
      level: 'info',
      action: 'polling_document_start',
      documentId
    }));

    await new Promise(resolve => setTimeout(resolve, 10000)); // Delay inicial de 10s (Fase 1)
    
    let documentReady = false;
    const maxAttempts = 20; // Aumentado de 15 para 20
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const delay = Math.min(2000 * Math.pow(1.3, attempt - 1), 20000); // Max 20s (aumentado)
      await new Promise(resolve => setTimeout(resolve, delay));

      console.log(JSON.stringify({
        level: 'info',
        action: 'polling_document_status',
        document_id: documentId,
        attempt
      }));
      
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

      if (statusResponse.status === 404) {
        const errorText = await statusResponse.text();
        console.log(JSON.stringify({
          level: 'warn',
          action: '404_detail',
          attempt,
          response_body: errorText,
          document_id: documentId
        }));
        
        // Tolerar 404 nos primeiros 5 attempts (60s com novo delay de 10s)
        if (attempt <= 5) {
          console.log(JSON.stringify({
            level: 'info',
            action: 'document_still_processing',
            attempt,
            message: 'Aguardando processamento - PDF complexo pode levar até 2 minutos'
          }));
          continue;
        }
        
        // Após 5 attempts: verificar se documento realmente foi criado
        if (attempt === 6) {
          console.log(JSON.stringify({
            level: 'info',
            action: 'verify_document_exists',
            attempt
          }));
          
          const allDocsResponse = await fetch(
            `https://api.assinafy.com.br/v1/accounts/${assignafyAccountId}/documents?page=1&per_page=50`,
            {
              method: 'GET',
              headers: {
                'X-Api-Key': assignafyApiKey,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (allDocsResponse.ok) {
            const allDocs = await allDocsResponse.json();
            const found = allDocs.data?.find((d: any) => d.id === documentId);
            
            if (!found) {
              console.error(JSON.stringify({
                level: 'error',
                action: 'document_not_found_in_assinafy',
                document_id: documentId,
                message: 'Upload pode ter falhado - documento não existe na Assinafy'
              }));
              throw new Error(`Documento ${documentId} não encontrado na Assinafy após upload`);
            } else {
              console.log(JSON.stringify({
                level: 'info',
                action: 'document_exists_but_not_ready',
                document_id: documentId,
                status: found.status,
                message: 'Documento existe mas ainda não está pronto'
              }));
            }
          }
        }
        
        // Continuar tentando
        continue;
      }
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        
        // Verificar se documento está pronto
        if (statusData.data?.status === 'pending_signature' || statusData.data?.status === 'active') {
          documentReady = true;
          console.log(JSON.stringify({
            level: 'info',
            action: 'document_ready',
            attempt,
            status: statusData.data?.status
          }));
          break;
        }
        
        console.log(JSON.stringify({
          level: 'info',
          action: 'document_processing',
          attempt,
          status: statusData.data?.status
        }));
        continue;
      }
      
      console.log(JSON.stringify({
        level: 'error',
        action: 'polling_error',
        status: statusResponse.status,
        statusText: statusResponse.statusText,
        attempt
      }));
    }
    
    if (!documentReady) {
      console.warn(JSON.stringify({
        level: 'warn',
        action: 'polling_timeout',
        document_id: documentId,
        attempts: maxAttempts,
        message: 'Documento ainda processando - marcando para retry manual'
      }));
      
      // Buscar supabase client para atualizar
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      // Atualizar signature_request como "needs_retry" (não "failed")
      await supabaseAdmin
        .from('signature_requests')
        .update({ 
          status: 'needs_retry',
          metadata: {
            ...signatureRequest.metadata,
            timeout_at: new Date().toISOString(),
            retry_available: true,
            last_attempt_info: {
              max_attempts: maxAttempts,
              document_id: documentId,
              message: 'Timeout aguardando processamento Assinafy'
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', signatureRequestId);
      
      // Retornar 202 (Accepted) ao invés de 500 (Server Error)
      return new Response(
        JSON.stringify({
          success: false,
          retry_available: true,
          message: 'Documento ainda processando na Assinafy. Aguarde 2-3 minutos e tente reenviar manualmente.',
          signatureRequestId,
          action_required: 'manual_retry'
        }),
        { 
          status: 202, // Accepted (processamento assíncrono pendente)
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
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signature request processed successfully',
        signatureRequestId,
        provider: 'assinafy',
        assinafy_document_id: documentId,
        assinafy_assignment_id: assignmentId,
        signature_url: signatureUrl
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
