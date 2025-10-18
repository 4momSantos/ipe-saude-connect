import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReprocessResult {
  signature_request_id: string;
  contrato_id: string;
  numero_contrato: string;
  document_id: string;
  status: 'reprocessed' | 'still_processing' | 'failed' | 'error';
  signature_url?: string;
  email_sent?: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[REPROCESS] Iniciando reprocessamento de contratos travados');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const assignafyApiKey = Deno.env.get('ASSINAFY_API_KEY');
    const assignafyAccountId = Deno.env.get('ASSINAFY_ACCOUNT_ID');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!assignafyApiKey || !assignafyAccountId) {
      throw new Error('Credenciais Assinafy não configuradas');
    }

    const { data: stuckRequests, error: fetchError } = await supabase
      .from('signature_requests')
      .select(`
        id,
        external_id,
        metadata,
        contratos!inner (
          id,
          numero_contrato,
          inscricao_id,
          inscricoes_edital!inner (
            candidato_id,
            dados_inscricao,
            profiles!inner (
              email,
              nome
            )
          )
        )
      `)
      .eq('status', 'processing')
      .not('external_id', 'is', null)
      .is('metadata->>signature_url', null)
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Erro ao buscar contratos: ${fetchError.message}`);
    }

    if (!stuckRequests || stuckRequests.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum contrato travado encontrado',
          processed: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[REPROCESS] ${stuckRequests.length} contratos travados encontrados`);

    const results: ReprocessResult[] = [];

    for (const sr of stuckRequests) {
      const documentId = sr.external_id;
      const signerId = sr.metadata?.assinafy_signer_id;
      const contratoId = sr.metadata?.contrato_id;
      const contrato = sr.contratos[0];
      const inscricao = contrato.inscricoes_edital[0];
      const profile = inscricao.profiles[0];

      console.log(`[REPROCESS] Processando ${contrato.numero_contrato} (doc: ${documentId})`);

      try {
        const statusResponse = await fetch(
          `https://api.assinafy.com.br/v1/accounts/${assignafyAccountId}/documents/${documentId}`,
          { headers: { 'X-Api-Key': assignafyApiKey } }
        );

        if (!statusResponse.ok) {
          throw new Error(`Erro ao consultar Assinafy: ${statusResponse.status}`);
        }

        const docData = await statusResponse.json();
        const docStatus = docData.data?.status || docData.status;

        console.log(`[REPROCESS] Status Assinafy: ${docStatus}`);

        if (docStatus === 'processing') {
          results.push({
            signature_request_id: sr.id,
            contrato_id: contratoId,
            numero_contrato: contrato.numero_contrato,
            document_id: documentId,
            status: 'still_processing',
            error: 'Documento ainda está sendo processado pelo Assinafy'
          });
          continue;
        }

        if (docStatus === 'failed' || docStatus === 'error') {
          await supabase
            .from('signature_requests')
            .update({
              status: 'failed',
              metadata: {
                ...sr.metadata,
                error: 'Documento falhou no processamento Assinafy',
                assinafy_status: docStatus
              }
            })
            .eq('id', sr.id);

          results.push({
            signature_request_id: sr.id,
            contrato_id: contratoId,
            numero_contrato: contrato.numero_contrato,
            document_id: documentId,
            status: 'failed',
            error: `Status Assinafy: ${docStatus}`
          });
          continue;
        }

        if (docStatus === 'metadata_ready' || docStatus === 'ready') {
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
                expires_at: null,
                auto_place: true
              })
            }
          );

          if (!assignmentResponse.ok) {
            const errorText = await assignmentResponse.text();
            throw new Error(`Erro ao criar assignment: ${errorText}`);
          }

          const assignmentData = await assignmentResponse.json();
          const assignmentId = assignmentData.data?.id || assignmentData.id;

          console.log(`[REPROCESS] Assignment criado: ${assignmentId}`);

          const docDetailsResponse = await fetch(
            `https://api.assinafy.com.br/v1/accounts/${assignafyAccountId}/documents/${documentId}`,
            { headers: { 'X-Api-Key': assignafyApiKey } }
          );

          let signatureUrl = '';
          if (docDetailsResponse.ok) {
            const docDetails = await docDetailsResponse.json();
            signatureUrl = docDetails.data?.assignments?.[0]?.signature_url || '';
          }

          await supabase
            .from('signature_requests')
            .update({
              status: 'pending',
              external_status: 'pending_signature',
              metadata: {
                ...sr.metadata,
                assinafy_assignment_id: assignmentId,
                signature_url: signatureUrl,
                reprocessed_at: new Date().toISOString(),
                reprocessed_by: 'manual_function'
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', sr.id);

          console.log(`[REPROCESS] signature_request atualizado para 'pending'`);

          let emailSent = false;
          if (signatureUrl && profile.email && resendApiKey) {
            try {
              const candidatoNome = profile.nome || 'Candidato';
              const emailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">🖊️ Contrato Pronto para Assinatura</h1></div><div style="padding: 30px; background: #f9fafb;"><h2 style="color: #1f2937;">Olá ${candidatoNome},</h2><p style="font-size: 16px; color: #4b5563; line-height: 1.6;">Seu contrato de credenciamento está pronto e aguardando sua assinatura digital.</p><div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;"><p style="margin: 5px 0;"><strong>Número do Contrato:</strong> ${contrato.numero_contrato}</p><p style="margin: 5px 0;"><strong>Provedor:</strong> Assinafy (Assinatura Digital Segura)</p></div><div style="text-align: center; margin: 30px 0;"><a href="${signatureUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">🖊️ Assinar Contrato Agora</a></div><p style="font-size: 14px; color: #6b7280; text-align: center;">Ou copie e cole este link no navegador:<br/><code style="background: #e5e7eb; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all; font-size: 12px;">${signatureUrl}</code></p><div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b;"><p style="margin: 0; font-size: 14px; color: #92400e;">⏰ <strong>Atenção:</strong> Este link é válido por 30 dias.</p></div></div><div style="background: #1f2937; padding: 20px; text-align: center;"><p style="color: #9ca3af; margin: 0; font-size: 14px;">Sistema de Credenciamento<br/>Em caso de dúvidas, entre em contato com nossa equipe.</p></div></div>`;

              const emailResponse = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${resendApiKey}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  from: "Contratos <onboarding@resend.dev>",
                  to: [profile.email],
                  subject: "🖊️ Contrato Pronto para Assinatura Digital",
                  html: emailHtml
                })
              });

              if (emailResponse.ok) {
                emailSent = true;
                console.log(`[REPROCESS] Email enviado para ${profile.email}`);
              }
            } catch (emailError: any) {
              console.error(`[REPROCESS] Erro ao enviar email: ${emailError.message}`);
            }
          }

          results.push({
            signature_request_id: sr.id,
            contrato_id: contratoId,
            numero_contrato: contrato.numero_contrato,
            document_id: documentId,
            status: 'reprocessed',
            signature_url: signatureUrl,
            email_sent: emailSent
          });
        }

      } catch (error: any) {
        console.error(`[REPROCESS] Erro ao processar ${contrato.numero_contrato}: ${error.message}`);
        results.push({
          signature_request_id: sr.id,
          contrato_id: contratoId,
          numero_contrato: contrato.numero_contrato,
          document_id: documentId,
          status: 'error',
          error: error.message
        });
      }
    }

    const elapsedTime = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'reprocessed').length;

    console.log(`[REPROCESS] Concluído em ${elapsedTime}ms - ${successCount}/${results.length} sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        reprocessed: successCount,
        elapsed_ms: elapsedTime,
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[REPROCESS] Erro fatal:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
