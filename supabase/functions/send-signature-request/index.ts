/**
 * Edge Function: send-signature-request
 * Cria documento de assinatura na Assinafy e registra no sistema.
 * 
 * Features:
 * - Retry com backoff exponencial (3 tentativas)
 * - Logs estruturados em JSON
 * - Modo DEV com auto-simulação
 * - Validação robusta de resposta da API
 * - Tratamento de erros detalhado
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignafyCreateDocumentRequest {
  name: string;
  signers: Array<{
    name: string;
    email: string;
    order: number;
  }>;
  document_url?: string;
  message?: string;
}

interface AssignafyDocumentResponse {
  id: string;
  status: string;
  signature_url?: string;
  [key: string]: any;
}

/**
 * Envia email usando Resend API
 */
async function sendEmail(to: string[], subject: string, html: string, apiKey: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Sistema de Credenciamento <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(JSON.stringify({ level: "error", service: "resend", status: response.status, error }));
    throw new Error(`Failed to send email: ${response.status}`);
  }

  return await response.json();
}

/**
 * Cria documento na Assinafy com retry e backoff exponencial
 */
async function createAssignafyDocumentWithRetry(
  apiKey: string,
  accountId: string,
  documentData: AssignafyCreateDocumentRequest,
  maxAttempts: number = 3
): Promise<AssignafyDocumentResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(JSON.stringify({
        level: "info",
        service: "assinafy",
        action: "create_document",
        attempt,
        maxAttempts,
        payload: documentData
      }));

      const response = await fetch(`https://api.assinafy.com.br/v1/accounts/${accountId}/documents`, {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(documentData),
      });

      const responseText = await response.text();
      
      console.log(JSON.stringify({
        level: response.ok ? "info" : "error",
        service: "assinafy",
        action: "create_document_response",
        attempt,
        status: response.status,
        statusText: response.statusText,
        response: responseText
      }));

      if (!response.ok) {
        throw new Error(`Assinafy API error: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      
      // Validar resposta
      if (!data || !data.id) {
        throw new Error("Invalid Assinafy response: missing document ID");
      }

      console.log(JSON.stringify({
        level: "info",
        service: "assinafy",
        action: "document_created",
        documentId: data.id,
        attempt
      }));

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      console.error(JSON.stringify({
        level: "error",
        service: "assinafy",
        action: "create_document_failed",
        attempt,
        maxAttempts,
        error: lastError.message,
        willRetry: attempt < maxAttempts
      }));

      if (attempt < maxAttempts) {
        // Backoff exponencial: 1s, 2s, 4s
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        console.log(JSON.stringify({
          level: "info",
          service: "assinafy",
          action: "retry_delay",
          delayMs,
          nextAttempt: attempt + 1
        }));
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(`Assinafy integration failed after ${maxAttempts} attempts: ${lastError?.message}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(JSON.stringify({
    level: "info",
    requestId,
    action: "request_start",
    method: req.method
  }));

  try {
    // Configuração
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const assifafyApiKey = Deno.env.get("ASSINAFY_API_KEY");
    const assifafyAccountId = Deno.env.get("ASSINAFY_ACCOUNT_ID");
    
    // 🔍 DIAGNÓSTICO: Verificar ENVIRONMENT
    const envValue = Deno.env.get("ENVIRONMENT");
    console.log(JSON.stringify({
      level: "info",
      action: "environment_check",
      ENVIRONMENT_raw: envValue,
      ENVIRONMENT_exists: !!envValue,
      ENVIRONMENT_is_production: envValue === "production",
      ENVIRONMENT_comparison: {
        actual: envValue,
        expected: "production",
        match: envValue === "production"
      }
    }));
    
    const DEV_MODE = envValue !== "production";
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { signatureRequestId } = await req.json();

    console.log(JSON.stringify({
      level: "info",
      requestId,
      action: "processing_signature_request",
      signatureRequestId,
      devMode: DEV_MODE,
      environment: {
        ENVIRONMENT: envValue || "NOT_SET",
        ASSINAFY_API_KEY_configured: !!assifafyApiKey,
        ASSINAFY_ACCOUNT_ID_configured: !!assifafyAccountId,
        will_call_assinafy: !DEV_MODE && !!assifafyApiKey && !!assifafyAccountId
      }
    }));

    // Buscar dados da signature request
    const { data: signatureRequest, error: requestError } = await supabase
      .from("signature_requests")
      .select(`
        *,
        workflow_execution:workflow_executions (
          id,
          started_by
        )
      `)
      .eq("id", signatureRequestId)
      .single();

    if (requestError || !signatureRequest) {
      throw new Error(`Signature request not found: ${requestError?.message || "unknown"}`);
    }

    // Buscar dados da inscrição relacionada
    const { data: execution } = await supabase
      .from("workflow_executions")
      .select(`
        id,
        inscricao:inscricoes_edital (
          id,
          candidato_id,
          edital:editais (id, titulo, numero),
          candidato:profiles!inscricoes_edital_candidato_id_fkey (id, nome, email)
        )
      `)
      .eq("id", signatureRequest.workflow_execution_id)
      .single();

    const inscricaoData = execution?.inscricao as any;
    const candidato = inscricaoData?.candidato;

    // ====== MODO DESENVOLVIMENTO ======
    if (DEV_MODE) {
      console.log(JSON.stringify({
        level: "info",
        requestId,
        action: "dev_mode_simulation",
        message: "Simulando assinatura automática em 10 segundos"
      }));

      // Atualizar para enviado
      await supabase
        .from("signature_requests")
        .update({
          status: "sent",
          external_status: "dev_mode_simulated",
          metadata: {
            ...signatureRequest.metadata,
            dev_mode: true,
            simulated_at: new Date().toISOString(),
          }
        })
        .eq("id", signatureRequestId);

      // Agendar callback simulado
      setTimeout(async () => {
        console.log(JSON.stringify({
          level: "info",
          requestId,
          action: "dev_mode_auto_complete",
          signatureRequestId
        }));

        await supabase
          .from("signature_requests")
          .update({
            status: "signed",
            external_status: "document.signed",
            completed_at: new Date().toISOString(),
            metadata: {
              ...signatureRequest.metadata,
              dev_mode: true,
              auto_signed_at: new Date().toISOString(),
            }
          })
          .eq("id", signatureRequestId);

        // Atualizar step execution
        if (signatureRequest.step_execution_id) {
          await supabase
            .from("workflow_step_executions")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              output_data: { signature_completed: true, dev_mode: true }
            })
            .eq("id", signatureRequest.step_execution_id);

          // Continuar workflow
          await supabase.functions.invoke("continue-workflow", {
            body: {
              stepExecutionId: signatureRequest.step_execution_id,
              decision: "approved"
            }
          });
        }
      }, 10000);

      return new Response(
        JSON.stringify({
          success: true,
          devMode: true,
          message: "DEV MODE: Assinatura será simulada em 10 segundos"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== MODO PRODUÇÃO ======
    if (signatureRequest.provider === "assinafy") {
      if (!assifafyApiKey) {
        throw new Error("ASSINAFY_API_KEY not configured");
      }
      
      if (!assifafyAccountId) {
        throw new Error("ASSINAFY_ACCOUNT_ID not configured");
      }

      try {
        // Criar documento na Assinafy com retry
        const assifafyResponse = await createAssignafyDocumentWithRetry(
          assifafyApiKey,
          assifafyAccountId,
          {
            name: `Documento - ${inscricaoData?.edital?.titulo || "Credenciamento"}`,
            signers: signatureRequest.signers,
            document_url: signatureRequest.document_url,
            message: `Solicitação de assinatura para o edital ${inscricaoData?.edital?.numero || "N/A"}`,
          }
        );

        // Extrair URL de assinatura
        const signatureUrl = assifafyResponse.signature_url || 
                            assifafyResponse.signers?.[0]?.signature_url ||
                            null;

        console.log(JSON.stringify({
          level: "info",
          requestId,
          action: "assinafy_document_created",
          documentId: assifafyResponse.id,
          signatureRequestId,
          signatureUrl: signatureUrl ? "present" : "missing"
        }));

        // Atualizar signature request com ID externo da Assinafy
        await supabase
          .from("signature_requests")
          .update({
            external_id: assifafyResponse.id,
            status: "sent",
            external_status: assifafyResponse.status || "created",
            metadata: {
              ...signatureRequest.metadata,
              assinafy_data: assifafyResponse,
              signature_url: signatureUrl,
              sent_at: new Date().toISOString(),
            },
          })
          .eq("id", signatureRequestId);

        console.log(JSON.stringify({
          level: "info",
          requestId,
          action: "signature_request_updated",
          signatureRequestId,
          externalId: assifafyResponse.id
        }));
      } catch (error) {
        console.error(JSON.stringify({
          level: "error",
          requestId,
          action: "assinafy_integration_failed",
          error: error instanceof Error ? error.message : "Unknown error"
        }));

        await supabase
          .from("signature_requests")
          .update({
            status: "failed",
            external_status: "api_error",
            metadata: {
              ...signatureRequest.metadata,
              error: error instanceof Error ? error.message : "Unknown error",
              failed_at: new Date().toISOString(),
            },
          })
          .eq("id", signatureRequestId);

        throw error;
      }
    }

    // Enviar email para o candidato
    if (candidato?.email) {
      // Buscar signature_url do metadata atualizado
      const { data: updatedSigRequest } = await supabase
        .from("signature_requests")
        .select("metadata")
        .eq("id", signatureRequestId)
        .single();
      
      const signatureUrl = updatedSigRequest?.metadata?.signature_url;

      try {
        await sendEmail(
          [candidato.email],
          "🖊️ Contrato Pronto para Assinatura Digital",
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">🖊️ Contrato Pronto para Assinatura</h1>
              </div>
              
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937;">Olá ${candidato.nome || "Candidato"},</h2>
                
                <p style="font-size: 16px; color: #4b5563; line-height: 1.6;">
                  Seu contrato de credenciamento está pronto e aguardando sua assinatura digital.
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                  <p style="margin: 5px 0;"><strong>Edital:</strong> ${inscricaoData?.edital?.titulo || "N/A"}</p>
                  <p style="margin: 5px 0;"><strong>Número:</strong> ${inscricaoData?.edital?.numero || "N/A"}</p>
                  <p style="margin: 5px 0;"><strong>Provedor:</strong> Assinafy (Assinatura Digital Segura)</p>
                </div>
                
                ${signatureUrl ? `
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${signatureUrl}" 
                       style="display: inline-block; 
                              padding: 16px 40px; 
                              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                              color: white; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              font-size: 18px;
                              font-weight: bold;
                              box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      🖊️ Assinar Contrato Agora
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; color: #6b7280; text-align: center;">
                    Ou copie e cole este link no navegador:<br/>
                    <code style="background: #e5e7eb; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all; font-size: 12px;">
                      ${signatureUrl}
                    </code>
                  </p>
                ` : `
                  <p style="color: #dc2626; background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
                    ⚠️ Link de assinatura temporariamente indisponível. Por favor, acesse o sistema para obter o link.
                  </p>
                `}
                
                <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b;">
                  <p style="margin: 0; font-size: 14px; color: #92400e;">
                    ⏰ <strong>Atenção:</strong> Este link é válido por 7 dias. Após esse período, será necessário solicitar um novo contrato.
                  </p>
                </div>
              </div>
              
              <div style="background: #1f2937; padding: 20px; text-align: center;">
                <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                  Sistema de Credenciamento Médico<br/>
                  Em caso de dúvidas, entre em contato com nossa equipe.
                </p>
              </div>
            </div>
          `,
          resendApiKey
        );

        console.log(JSON.stringify({
          level: "info",
          requestId,
          action: "email_sent_to_candidate",
          email: candidato.email
        }));
      } catch (emailError) {
        console.error(JSON.stringify({
          level: "error",
          requestId,
          action: "email_failed",
          recipient: "candidate",
          error: emailError instanceof Error ? emailError.message : "Unknown"
        }));
      }
    }

    // Buscar analistas para notificar
    const { data: analistas } = await supabase
      .from("user_roles")
      .select("user_id, profiles:profiles!user_roles_user_id_fkey(id, nome, email)")
      .eq("role", "analista");

    // Criar notificações in-app para analistas
    if (analistas && analistas.length > 0) {
      const notifications = analistas.map(analista => ({
        user_id: analista.user_id,
        title: "Nova Solicitação de Assinatura",
        message: `Documento aguardando assinatura de ${candidato?.nome || "candidato"} via ${signatureRequest.provider}`,
        type: "signature",
        related_id: signatureRequestId,
        related_type: "signature_request",
      }));

      await supabase.from("app_notifications").insert(notifications);
      
      console.log(JSON.stringify({
        level: "info",
        requestId,
        action: "notifications_created",
        count: analistas.length
      }));

      // Enviar emails para analistas
      for (const analista of analistas) {
        const analistaProfile = analista.profiles as any;
        if (analistaProfile?.email) {
          try {
            await sendEmail(
              [analistaProfile.email],
              "Nova Solicitação de Assinatura",
              `
                <h2>Olá ${analistaProfile.nome || "Analista"},</h2>
                <p>Uma nova solicitação de assinatura foi criada.</p>
                <p><strong>Candidato:</strong> ${candidato?.nome || "N/A"}</p>
                <p><strong>Edital:</strong> ${inscricaoData?.edital?.titulo || "N/A"}</p>
                <p><strong>Provedor:</strong> ${signatureRequest.provider === "assinafy" ? "Assinafy" : signatureRequest.provider}</p>
                <p>Acesse o sistema para acompanhar o processo.</p>
                <p>Atenciosamente,<br/>Sistema de Credenciamento</p>
              `,
              resendApiKey
            );
          } catch (emailError) {
            console.error(JSON.stringify({
              level: "error",
              requestId,
              action: "email_failed",
              recipient: "analyst",
              email: analistaProfile.email,
              error: emailError instanceof Error ? emailError.message : "Unknown"
            }));
          }
        }
      }
    }

    console.log(JSON.stringify({
      level: "info",
      requestId,
      action: "request_completed",
      signatureRequestId
    }));

    return new Response(
      JSON.stringify({
        success: true,
        message: "Signature request processed successfully",
        provider: signatureRequest.provider,
        signatureRequestId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      requestId,
      action: "request_failed",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }));

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
