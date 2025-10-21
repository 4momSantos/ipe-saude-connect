/**
 * Edge Function: send-signature-request (V3 - Async Webhook)
 * 
 * Envia contratos para assinatura na Assinafy usando arquitetura assíncrona.
 * 
 * Features:
 * - PDF direto via base64 ou download de Storage
 * - Upload rápido (~2s)
 * - Assinafy processa PDF e envia webhook document_metadata_ready
 * - Webhook cria assignment e envia email
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

// ===== HELPER: Wait for Document to be Ready =====
async function waitForDocumentReady(
  documentId: string,
  assinafyApiKey: string,
  maxAttempts: number = 15,  // ✅ Aumentado de 10 para 15 (30s total)
  intervalMs: number = 2000
): Promise<boolean> {
  console.log(JSON.stringify({
    level: 'info',
    action: 'polling_document_start',
    document_id: documentId,
    max_attempts: maxAttempts
  }));
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `https://api.assinafy.com.br/v1/documents/${documentId}`,
        {
          method: 'GET',
          headers: {
            'X-Api-Key': assinafyApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(JSON.stringify({
          level: 'error',
          action: 'polling_document_error',
          document_id: documentId,
          status: response.status,
          attempt
        }));
        
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        continue;
      }

      const docData = await response.json();
      const status = docData.data?.status || docData.status;

      console.log(JSON.stringify({
        level: 'info',
        action: 'polling_document_status',
        document_id: documentId,
        status,
        attempt,
        max_attempts: maxAttempts
      }));

      if (status === 'ready' || status === 'pending' || status === 'metadata_ready') {
        console.log(JSON.stringify({
          level: 'info',
          action: 'document_ready',
          document_id: documentId,
          status,
          attempts: attempt
        }));
        return true;
      }

      if (status === 'error' || status === 'rejected' || status === 'failed') {
        console.error(JSON.stringify({
          level: 'error',
          action: 'document_processing_failed',
          document_id: documentId,
          status
        }));
        return false;
      }

      // Aguardar antes da próxima tentativa (se não for a última)
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        action: 'polling_exception',
        document_id: documentId,
        error: error.message,
        attempt
      }));
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
  }

  console.error(JSON.stringify({
    level: 'error',
    action: 'polling_timeout',
    document_id: documentId,
    max_attempts: maxAttempts,
    total_time_seconds: (maxAttempts * intervalMs) / 1000
  }));
  
  return false;
}

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
    
    // 3. Salvar external_id e atualizar status para 'processing'
    let updateSuccess = false;
    for (let retry = 0; retry < 2; retry++) {
      const { data, error } = await supabaseAdmin
        .from('signature_requests')
        .update({ 
          external_id: documentId,
          status: 'processing',
          metadata: {
            ...signatureRequest.metadata,
            assinafy_signer_id: signerId,
            contrato_id: contrato.id,
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
    
    // ==================================================
    // ✅ AGUARDAR DOCUMENTO FICAR PRONTO (POLLING)
    // ==================================================

    console.log(JSON.stringify({
      trace_id: traceId,
      level: 'info',
      action: 'waiting_for_document_ready',
      document_id: documentId,
      signer_id: signerId
    }));

    const isReady = await waitForDocumentReady(documentId, assignafyApiKey);

    if (!isReady) {
      const errorMsg = 'Documento não ficou pronto para assinatura após 20 segundos';
      
      console.error(JSON.stringify({
        trace_id: traceId,
        level: 'error',
        action: 'document_not_ready',
        document_id: documentId,
        error: errorMsg
      }));
      
      // Atualizar signature_request com erro
      await supabaseAdmin
        .from('signature_requests')
        .update({
          status: 'failed',
          metadata: {
            ...signatureRequest.metadata,
            error: errorMsg,
            error_timestamp: new Date().toISOString(),
            assinafy_document_id: documentId,
            assinafy_status: 'uploaded_timeout',
            trace_id: traceId
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', signatureRequestId);

      return new Response(
        JSON.stringify({ 
          success: false,
          error: errorMsg,
          signature_request_id: signatureRequestId,
          document_id: documentId,
          retry_available: true,
          trace_id: traceId
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ==================================================
    // ✅ CRIAR ASSIGNMENT (DOCUMENTO PRONTO)
    // ==================================================

    console.log(JSON.stringify({
      trace_id: traceId,
      level: 'info',
      action: 'creating_assignment',
      document_id: documentId,
      signer_id: signerId
    }));

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
      trace_id: traceId,
      level: 'info',
      action: 'assignment_created',
      assignment_id: assignmentId
    }));

    // Buscar URL de assinatura
    const docDetailsResponse = await fetch(
      `https://api.assinafy.com.br/v1/documents/${documentId}`,
      { method: 'GET', headers: { 'X-Api-Key': assignafyApiKey } }
    );

    let signatureUrl = '';
    if (docDetailsResponse.ok) {
      const docDetails = await docDetailsResponse.json();
      signatureUrl = docDetails.data?.signing_url || 
                     docDetails.data?.assignments?.[0]?.signing_url || '';
    }

    // Atualizar para 'pending' com assignment_id e URL
    await supabaseAdmin
      .from('signature_requests')
      .update({
        status: 'pending',
        metadata: {
          ...signatureRequest.metadata,
          assinafy_signer_id: signerId,
          assinafy_assignment_id: assignmentId,
          signature_url: signatureUrl,
          contrato_id: contrato.id,
          document_id: documentId,
          trace_id: traceId,
          assignment_created_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', signatureRequestId);

    console.log(JSON.stringify({
      trace_id: traceId,
      level: 'info',
      action: 'signature_request_ready',
      assignment_id: assignmentId,
      has_signature_url: !!signatureUrl
    }));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Contrato enviado para assinatura com sucesso!',
        status: 'pending',
        signatureRequestId,
        documentId,
        assignmentId,
        signatureUrl,
        externalId: documentId,
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
