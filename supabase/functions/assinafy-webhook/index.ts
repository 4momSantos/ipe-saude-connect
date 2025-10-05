import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface AssignafyWebhookPayload {
  event: string;
  document_id: string;
  status: string;
  signer?: {
    name: string;
    email: string;
    signed_at?: string;
  };
  data?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar variáveis de ambiente
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validar API Key da Assinafy
    const apiKey = req.headers.get("X-Api-Key");
    const expectedApiKey = Deno.env.get("ASSINAFY_WEBHOOK_SECRET");
    
    if (expectedApiKey && apiKey !== expectedApiKey) {
      console.error("Invalid webhook API key received");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse e validar payload
    let payload: AssignafyWebhookPayload;
    try {
      payload = await req.json();
      console.log("Received Assinafy webhook:", JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.error("Failed to parse webhook payload:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payload.document_id || !payload.event) {
      console.error("Missing required fields in payload");
      return new Response(
        JSON.stringify({ error: "Missing required fields: document_id and event" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar a signature request pelo external_id (document_id da Assinafy)
    const { data: signatureRequest, error: fetchError } = await supabase
      .from("signature_requests")
      .select("*")
      .eq("external_id", payload.document_id)
      .eq("provider", "assinafy")
      .single();

    if (fetchError) {
      console.error("Database error fetching signature request:", fetchError);
      return new Response(
        JSON.stringify({ error: "Database error", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!signatureRequest) {
      console.error("Signature request not found for document_id:", payload.document_id);
      return new Response(
        JSON.stringify({ error: "Signature request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing event ${payload.event} for signature request ${signatureRequest.id}`);

    // Processar diferentes eventos
    let newStatus = signatureRequest.status;
    const updatedMetadata = { ...signatureRequest.metadata };

    switch (payload.event) {
      case "document.signed":
        newStatus = "signed";
        updatedMetadata.signed_at = new Date().toISOString();
        updatedMetadata.signer_data = payload.signer;
        
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
              type: "signature",
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
              output_data: { signature_completed: true, ...payload.data },
            })
            .eq("id", signatureRequest.step_execution_id);

          console.log(`✓ Step ${signatureRequest.step_execution_id} marked as completed`);
          
          // Continuar workflow automaticamente
          try {
            console.log(`Calling continue-workflow for step ${signatureRequest.step_execution_id}...`);
            
            const { data: continueResult, error: continueError } = await supabase.functions.invoke(
              'continue-workflow',
              {
                body: {
                  stepExecutionId: signatureRequest.step_execution_id,
                  decision: 'approved'
                }
              }
            );
            
            if (continueError) {
              console.error('Failed to continue workflow:', continueError);
            } else {
              console.log('✓ Workflow continued successfully:', continueResult);
            }
          } catch (continueErr) {
            console.error('Error calling continue-workflow:', continueErr);
          }
        }
        break;

      case "document.rejected":
        newStatus = "rejected";
        updatedMetadata.rejected_at = new Date().toISOString();
        updatedMetadata.rejection_reason = payload.data?.reason;
        
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
        break;

      case "document.viewed":
        updatedMetadata.last_viewed_at = new Date().toISOString();
        updatedMetadata.viewer = payload.signer;
        break;

      default:
        console.log("Unhandled event type:", payload.event);
    }

    // Atualizar signature request
    const { error: updateError } = await supabase
      .from("signature_requests")
      .update({
        status: newStatus,
        metadata: updatedMetadata,
        completed_at: ["signed", "rejected", "expired"].includes(newStatus)
          ? new Date().toISOString()
          : signatureRequest.completed_at,
      })
      .eq("id", signatureRequest.id);

    if (updateError) {
      console.error("Failed to update signature request:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update signature request", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✓ Signature request ${signatureRequest.id} updated to status: ${newStatus}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook processed successfully",
        event: payload.event,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in assinafy-webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
