/**
 * WEBHOOK TRIGGER
 * Recebe POST de sistemas externos e dispara workflows
 * 
 * ENDPOINTS:
 * POST /webhook-trigger/:workflowId/:webhookId
 * 
 * AUTENTICAÇÃO:
 * - Bearer token
 * - API Key (X-API-Key header)
 * - Webhook secret (X-Webhook-Secret header com HMAC signature)
 * 
 * VALIDAÇÃO:
 * - Payload contra schema (se definido)
 * - Webhook ativo
 * - Autenticação válida
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-webhook-secret",
};

interface WebhookConfig {
  id: string;
  workflow_id: string;
  webhook_id: string;
  auth_type: 'none' | 'bearer' | 'apikey' | 'secret';
  api_key_hash?: string;
  webhook_secret?: string;
  payload_schema?: any;
  is_active: boolean;
  rate_limit_per_minute?: number;
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Só aceitar POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // 1. EXTRAIR workflowId e webhookId da URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Espera: /webhook-trigger/{workflowId}/{webhookId}
    if (pathParts.length < 3) {
      throw new Error("Invalid URL format. Expected: /webhook-trigger/{workflowId}/{webhookId}");
    }

    const workflowId = pathParts[1];
    const webhookId = pathParts[2];

    console.log('[WEBHOOK_TRIGGER]', {
      level: 'INFO',
      type: 'WEBHOOK_RECEIVED',
      workflow_id: workflowId,
      webhook_id: webhookId,
      method: req.method,
      source_ip: req.headers.get('x-forwarded-for') || 'unknown'
    });

    // 2. CRIAR CLIENT SUPABASE (SERVICE_ROLE para validar webhook)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 3. BUSCAR WEBHOOK CONFIG
    const { data: webhookConfig, error: webhookError } = await supabaseClient
      .from("workflow_webhooks")
      .select("*")
      .eq("workflow_id", workflowId)
      .eq("webhook_id", webhookId)
      .single();

    if (webhookError || !webhookConfig) {
      throw new Error("Webhook not found");
    }

    if (!webhookConfig.is_active) {
      throw new Error("Webhook is inactive");
    }

    // 4. VALIDAR AUTENTICAÇÃO
    await validateAuth(req, webhookConfig);

    // 5. PARSEAR PAYLOAD
    const payload = await req.json();

    // 6. VALIDAR PAYLOAD contra schema (se definido)
    if (webhookConfig.payload_schema) {
      validatePayload(payload, webhookConfig.payload_schema);
    }

    // 7. RATE LIMITING (verificar últimas execuções)
    if (webhookConfig.rate_limit_per_minute) {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      
      const { count } = await supabaseClient
        .from("workflow_queue")
        .select("*", { count: 'exact', head: true })
        .eq("workflow_id", workflowId)
        .gte("created_at", oneMinuteAgo);

      if (count && count >= webhookConfig.rate_limit_per_minute) {
        throw new Error("Rate limit exceeded");
      }
    }

    // 8. ENFILEIRAR WORKFLOW
    const { data: queueItem, error: queueError } = await supabaseClient
      .from("workflow_queue")
      .insert({
        workflow_id: workflowId,
        workflow_version: 1, // TODO: pegar do workflow
        input_data: {
          ...payload,
          __trigger_source: 'webhook',
          __webhook_id: webhookId,
          __source_ip: req.headers.get('x-forwarded-for'),
          __triggered_at: new Date().toISOString()
        },
        status: 'pending',
        attempts: 0
      })
      .select()
      .single();

    if (queueError) {
      console.error('[WEBHOOK_TRIGGER] Queue error:', queueError);
      throw new Error(`Failed to queue workflow: ${queueError.message}`);
    }

    // 9. REGISTRAR WEBHOOK EVENT
    await supabaseClient
      .from("webhook_events")
      .insert({
        webhook_id: webhookConfig.id,
        workflow_id: workflowId,
        queue_id: queueItem.id,
        payload,
        source_ip: req.headers.get('x-forwarded-for'),
        status: 'success'
      });

    console.log('[WEBHOOK_TRIGGER]', {
      level: 'INFO',
      type: 'WORKFLOW_QUEUED_FROM_WEBHOOK',
      workflow_id: workflowId,
      webhook_id: webhookId,
      queue_id: queueItem.id
    });

    // 10. RETORNAR SUCESSO
    return new Response(
      JSON.stringify({
        success: true,
        queueId: queueItem.id,
        workflowId,
        status: 'queued',
        message: 'Webhook received and workflow queued'
      }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error('[WEBHOOK_TRIGGER]', {
      level: 'ERROR',
      type: 'WEBHOOK_FAILED',
      error: error.message
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: error.message.includes('Unauthorized') ? 401 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Validar autenticação do webhook
 */
async function validateAuth(req: Request, config: WebhookConfig): Promise<void> {
  if (config.auth_type === 'none') {
    return;
  }

  if (config.auth_type === 'bearer') {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Missing or invalid Bearer token');
    }
    // TODO: Validar token contra tabela de API keys
  }

  if (config.auth_type === 'apikey') {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      throw new Error('Unauthorized: Missing X-API-Key header');
    }
    
    // Hash e comparar
    const apiKeyHash = await hashString(apiKey);
    if (apiKeyHash !== config.api_key_hash) {
      throw new Error('Unauthorized: Invalid API key');
    }
  }

  if (config.auth_type === 'secret') {
    const signature = req.headers.get('x-webhook-secret');
    if (!signature) {
      throw new Error('Unauthorized: Missing X-Webhook-Secret header');
    }
    
    // TODO: Validar HMAC signature
    // const body = await req.text();
    // const expectedSignature = await hmacSign(body, config.webhook_secret);
    // if (signature !== expectedSignature) {
    //   throw new Error('Unauthorized: Invalid webhook signature');
    // }
  }
}

/**
 * Validação básica de payload
 */
function validatePayload(payload: any, schema: any): void {
  if (schema.required && Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in payload)) {
        throw new Error(`Required field missing: ${field}`);
      }
    }
  }
}

/**
 * Hash simples de string (SHA-256)
 */
async function hashString(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
