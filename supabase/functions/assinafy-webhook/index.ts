/**
 * Edge Function: assinafy-webhook
 * Recebe callbacks da API Assinafy quando documentos são assinados/rejeitados/expirados
 * 
 * Features:
 * - Validação HMAC SHA-256 com ASSINAFY_WEBHOOK_SECRET
 * - Logs estruturados em JSON
 * - Processamento de múltiplos eventos (signed, rejected, expired, viewed)
 * - Continuação automática do workflow
 * - Tratamento robusto de erros
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-assinafy-signature",
};

interface AssignafyWebhookPayload {
  event: string;
  document: {
    id: string;
    status?: string;
    [key: string]: any;
  };
  signer?: {
    name: string;
    email: string;
    signed_at?: string;
  };
  data?: any;
}

/**
 * Valida assinatura HMAC do webhook
 */
async function validateHmacSignature(
  payload: string,
  receivedSignature: string | null,
  secret: string
): Promise<boolean> {
  if (!receivedSignature) {
    console.error(JSON.stringify({
      level: "error",
      action: "hmac_validation",
      error: "Missing X-Assinafy-Signature header"
    }));
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const payloadData = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, payloadData);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const isValid = expectedSignature === receivedSignature;

    console.log(JSON.stringify({
      level: isValid ? "info" : "warn",
      action: "hmac_validation",
      valid: isValid,
      expectedLength: expectedSignature.length,
      receivedLength: receivedSignature.length
    }));

    return isValid;
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      action: "hmac_validation_failed",
      error: error instanceof Error ? error.message : "Unknown error"
    }));
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(JSON.stringify({
    level: "info",
    requestId,
    action: "webhook_received",
    method: req.method,
    url: req.url
  }));

  try {
    // Validar variáveis de ambiente
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const webhookSecret = Deno.env.get("ASSINAFY_WEBHOOK_SECRET");

    if (!supabaseUrl || !supabaseKey) {
      console.error(JSON.stringify({
        level: "error",
        requestId,
        action: "config_error",
        error: "Missing Supabase configuration"
      }));
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Ler payload e assinatura
    const payloadText = await req.text();
    const receivedSignature = req.headers.get("X-Assinafy-Signature");

    console.log(JSON.stringify({
      level: "info",
      requestId,
      action: "webhook_payload_received",
      payloadLength: payloadText.length,
      hasSignature: !!receivedSignature
    }));

    // Validar HMAC (se secret estiver configurado)
    if (webhookSecret) {
      const isValid = await validateHmacSignature(payloadText, receivedSignature, webhookSecret);
      if (!isValid) {
        console.error(JSON.stringify({
          level: "error",
          requestId,
          action: "webhook_unauthorized",
          reason: "Invalid HMAC signature"
        }));
        return new Response(
          JSON.stringify({ error: "Unauthorized: Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.warn(JSON.stringify({
        level: "warn",
        requestId,
        action: "hmac_skipped",
        message: "ASSINAFY_WEBHOOK_SECRET not configured, skipping HMAC validation"
      }));
    }

    // Parse payload
    let payload: AssignafyWebhookPayload;
    try {
      payload = JSON.parse(payloadText);
      console.log(JSON.stringify({
        level: "info",
        requestId,
        action: "payload_parsed",
        event: payload.event,
        documentId: payload.document?.id
      }));
    } catch (parseError) {
      console.error(JSON.stringify({
        level: "error",
        requestId,
        action: "payload_parse_failed",
        error: parseError instanceof Error ? parseError.message : "Unknown"
      }));
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar campos obrigatórios
    if (!payload.document?.id || !payload.event) {
      console.error(JSON.stringify({
        level: "error",
        requestId,
        action: "validation_failed",
        error: "Missing required fields: document.id and event"
      }));
      return new Response(
        JSON.stringify({ error: "Missing required fields: document.id and event" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const documentId = payload.document.id;
    const eventType = payload.event;

    // Buscar signature request pelo external_id
    const { data: signatureRequest, error: fetchError } = await supabase
      .from("signature_requests")
      .select("*")
      .eq("external_id", documentId)
      .eq("provider", "assinafy")
      .maybeSingle();

    if (fetchError) {
      console.error(JSON.stringify({
        level: "error",
        requestId,
        action: "database_error",
        error: fetchError.message,
        documentId
      }));
      return new Response(
        JSON.stringify({ error: "Database error", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!signatureRequest) {
      console.error(JSON.stringify({
        level: "error",
        requestId,
        action: "signature_request_not_found",
        documentId,
        event: eventType
      }));
      return new Response(
        JSON.stringify({ error: "Signature request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(JSON.stringify({
      level: "info",
      requestId,
      action: "processing_event",
      event: eventType,
      documentId,
      signatureRequestId: signatureRequest.id
    }));

    // Processar diferentes eventos
    let newStatus = signatureRequest.status;
    const updatedMetadata = { ...signatureRequest.metadata };

    switch (eventType) {
      case "document.signed":
        newStatus = "signed";
        updatedMetadata.signed_at = new Date().toISOString();
        updatedMetadata.signer_data = payload.signer;
        updatedMetadata.assinafy_event = payload;

        console.log(JSON.stringify({
          level: "info",
          requestId,
          action: "document_signed",
          documentId,
          signerName: payload.signer?.name
        }));

        // Criar notificação de conclusão
        if (signatureRequest.workflow_execution_id) {
          const { data: execution } = await supabase
            .from("workflow_executions")
            .select("started_by")
            .eq("id", signatureRequest.workflow_execution_id)
            .single();

          if (execution?.started_by) {
            await supabase.from("app_notifications").insert({
              user_id: execution.started_by,
              title: "Documento Assinado",
              message: `O documento foi assinado com sucesso por ${payload.signer?.name || "signatário"}`,
              type: "success",
              related_id: signatureRequest.id,
              related_type: "signature_request",
            });
          }
        }

        // Atualizar workflow execution step para completed
        if (signatureRequest.step_execution_id) {
          await supabase
            .from("workflow_step_executions")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              output_data: { signature_completed: true, signer: payload.signer },
            })
            .eq("id", signatureRequest.step_execution_id);

          console.log(JSON.stringify({
            level: "info",
            requestId,
            action: "step_completed",
            stepExecutionId: signatureRequest.step_execution_id
          }));

          // Continuar workflow automaticamente
          try {
            const { data: continueResult, error: continueError } = await supabase.functions.invoke(
              "continue-workflow",
              {
                body: {
                  stepExecutionId: signatureRequest.step_execution_id,
                  decision: "approved"
                }
              }
            );

            if (continueError) {
              console.error(JSON.stringify({
                level: "error",
                requestId,
                action: "continue_workflow_failed",
                error: continueError.message
              }));
            } else {
              console.log(JSON.stringify({
                level: "info",
                requestId,
                action: "workflow_continued",
                result: continueResult
              }));
            }
          } catch (continueErr) {
            console.error(JSON.stringify({
              level: "error",
              requestId,
              action: "continue_workflow_exception",
              error: continueErr instanceof Error ? continueErr.message : "Unknown"
            }));
          }
        }
        break;

      case "document.rejected":
        newStatus = "rejected";
        updatedMetadata.rejected_at = new Date().toISOString();
        updatedMetadata.rejection_reason = payload.data?.reason || "No reason provided";
        updatedMetadata.assinafy_event = payload;

        console.log(JSON.stringify({
          level: "warn",
          requestId,
          action: "document_rejected",
          documentId,
          reason: payload.data?.reason
        }));

        // Atualizar workflow execution step para failed
        if (signatureRequest.step_execution_id) {
          await supabase
            .from("workflow_step_executions")
            .update({
              status: "failed",
              error_message: `Documento rejeitado: ${payload.data?.reason || "sem motivo"}`,
              completed_at: new Date().toISOString(),
            })
            .eq("id", signatureRequest.step_execution_id);
        }
        break;

      case "document.expired":
        newStatus = "expired";
        updatedMetadata.expired_at = new Date().toISOString();
        updatedMetadata.assinafy_event = payload;

        console.log(JSON.stringify({
          level: "warn",
          requestId,
          action: "document_expired",
          documentId
        }));
        break;

      case "document.viewed":
        updatedMetadata.last_viewed_at = new Date().toISOString();
        updatedMetadata.viewer = payload.signer;

        console.log(JSON.stringify({
          level: "info",
          requestId,
          action: "document_viewed",
          documentId,
          viewerEmail: payload.signer?.email
        }));
        break;

      default:
        console.log(JSON.stringify({
          level: "info",
          requestId,
          action: "unhandled_event",
          event: eventType,
          documentId
        }));
    }

    // Atualizar signature request
    const { error: updateError } = await supabase
      .from("signature_requests")
      .update({
        status: newStatus,
        external_status: eventType,
        metadata: updatedMetadata,
        completed_at: ["signed", "rejected", "expired"].includes(newStatus)
          ? new Date().toISOString()
          : signatureRequest.completed_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", signatureRequest.id);

    if (updateError) {
      console.error(JSON.stringify({
        level: "error",
        requestId,
        action: "update_failed",
        error: updateError.message,
        signatureRequestId: signatureRequest.id
      }));
      return new Response(
        JSON.stringify({ error: "Failed to update signature request", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(JSON.stringify({
      level: "info",
      requestId,
      action: "webhook_processed",
      signatureRequestId: signatureRequest.id,
      newStatus,
      event: eventType
    }));

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook processed successfully",
        event: eventType,
        requestId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      requestId,
      action: "webhook_error",
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
