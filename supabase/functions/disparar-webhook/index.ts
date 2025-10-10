// FASE 6.4: Edge Function - Disparar Webhook
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

  try {
    const { evento, payload } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[WEBHOOK] Disparando webhook para evento: ${evento}`);

    // Buscar webhooks inscritos neste evento
    const { data: subscriptions, error } = await supabase
      .from("webhook_subscriptions")
      .select("*")
      .eq("ativo", true)
      .contains("eventos", [evento]);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[WEBHOOK] Nenhum webhook inscrito para evento: ${evento}`);
      return new Response(
        JSON.stringify({ success: true, webhooksSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deliveries = [];

    for (const sub of subscriptions) {
      try {
        // Criar assinatura HMAC
        const signature = await createHmacSignature(JSON.stringify(payload), sub.secret);

        // Enviar webhook
        const webhookResponse = await fetch(sub.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-IPE-Signature": signature,
            "X-IPE-Event": evento
          },
          body: JSON.stringify(payload)
        });

        const responseBody = await webhookResponse.text();

        // Registrar delivery
        await supabase
          .from("webhook_deliveries")
          .insert({
            subscription_id: sub.id,
            evento,
            payload,
            response_status: webhookResponse.status,
            response_body: responseBody,
            tentativas: 1,
            sucesso: webhookResponse.ok
          });

        deliveries.push({
          subscription: sub.nome,
          status: webhookResponse.status,
          success: webhookResponse.ok
        });

        console.log(`[WEBHOOK] Enviado para ${sub.nome}: ${webhookResponse.status}`);

      } catch (error: any) {
        console.error(`[WEBHOOK] Erro ao enviar para ${sub.nome}:`, error);

        // Registrar falha
        await supabase
          .from("webhook_deliveries")
          .insert({
            subscription_id: sub.id,
            evento,
            payload,
            response_status: 0,
            response_body: error.message,
            tentativas: 1,
            sucesso: false
          });

        deliveries.push({
          subscription: sub.nome,
          status: 0,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        evento,
        webhooksSent: deliveries.length,
        deliveries
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[WEBHOOK] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function createHmacSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
