/**
 * MANUAL TRIGGER API
 * Permite disparar workflows diretamente via POST
 * 
 * ENDPOINTS:
 * POST /trigger-workflow
 * Body: { workflowId, inputData?, inscricaoId? }
 * 
 * AUTENTICAÇÃO: Bearer token (user must be authenticated)
 * PERMISSÕES: User deve ter permissão para executar workflow
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. AUTENTICAÇÃO
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // 2. PARSEAR BODY
    const { workflowId, inputData = {}, inscricaoId } = await req.json();

    if (!workflowId) {
      throw new Error("workflowId is required");
    }

    console.log('[TRIGGER_WORKFLOW]', {
      level: 'INFO',
      type: 'MANUAL_TRIGGER_REQUESTED',
      workflow_id: workflowId,
      user_id: user.id,
      has_input_data: !!inputData,
      inscricao_id: inscricaoId
    });

    // 3. VALIDAR WORKFLOW EXISTE E ESTÁ ATIVO
    const { data: workflow, error: workflowError } = await supabaseClient
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      throw new Error("Workflow not found");
    }

    if (!workflow.is_active) {
      throw new Error("Workflow is not active");
    }

    // 4. VERIFICAR PERMISSÕES
    // TODO: Implementar sistema de permissões mais granular
    // Por ora, qualquer usuário autenticado pode disparar workflows
    
    // 5. ENFILEIRAR WORKFLOW
    const { data: queueItem, error: queueError } = await supabaseClient
      .from("workflow_queue")
      .insert({
        inscricao_id: inscricaoId || null,
        workflow_id: workflowId,
        workflow_version: workflow.version,
        input_data: {
          ...inputData,
          __trigger_source: 'manual_api',
          __triggered_by: user.id,
          __triggered_at: new Date().toISOString()
        },
        status: 'pending',
        attempts: 0
      })
      .select()
      .single();

    if (queueError) {
      console.error('[TRIGGER_WORKFLOW] Queue error:', queueError);
      throw new Error(`Failed to queue workflow: ${queueError.message}`);
    }

    console.log('[TRIGGER_WORKFLOW]', {
      level: 'INFO',
      type: 'WORKFLOW_QUEUED',
      workflow_id: workflowId,
      queue_id: queueItem.id,
      user_id: user.id
    });

    // 6. RETORNAR SUCESSO
    return new Response(
      JSON.stringify({
        success: true,
        queueId: queueItem.id,
        workflowId,
        status: 'queued',
        message: 'Workflow queued for execution'
      }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error('[TRIGGER_WORKFLOW]', {
      level: 'ERROR',
      type: 'TRIGGER_FAILED',
      error: error.message
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
