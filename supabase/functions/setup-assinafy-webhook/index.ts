import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASSINAFY_API_KEY = Deno.env.get('ASSINAFY_API_KEY');
    const ASSINAFY_WEBHOOK_SECRET = Deno.env.get('ASSINAFY_WEBHOOK_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

    if (!ASSINAFY_API_KEY) {
      throw new Error('ASSINAFY_API_KEY não configurada');
    }

    if (!ASSINAFY_WEBHOOK_SECRET) {
      throw new Error('ASSINAFY_WEBHOOK_SECRET não configurada');
    }

    if (!SUPABASE_URL) {
      throw new Error('SUPABASE_URL não configurada');
    }

    const webhookUrl = `${SUPABASE_URL}/functions/v1/assinafy-webhook-finalizacao`;

    console.log('[SETUP] Registrando webhook na Assinafy:', webhookUrl);

    // Registrar webhook na Assinafy
    const response = await fetch('https://api.assinafy.com.br/v1/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': ASSINAFY_API_KEY,
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: [
          'document.signed',
          'document.rejected',
          'document.expired',
          'document.viewed'
        ],
        secret: ASSINAFY_WEBHOOK_SECRET
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SETUP] Erro ao registrar webhook:', response.status, errorText);
      throw new Error(`Erro ao registrar webhook na Assinafy: ${response.status} - ${errorText}`);
    }

    const webhookData = await response.json();

    console.log('[SETUP] Webhook registrado com sucesso:', webhookData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook da Assinafy registrado com sucesso',
        webhook: webhookData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[SETUP] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
