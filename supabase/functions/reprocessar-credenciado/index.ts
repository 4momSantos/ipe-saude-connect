import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { inscricao_id } = await req.json();

    if (!inscricao_id) {
      throw new Error('inscricao_id é obrigatório');
    }

    console.log(`[reprocessar-credenciado] Iniciando reprocessamento: ${inscricao_id}`);

    // Chamar a função SQL sync_credenciado_from_contract
    const { data, error } = await supabase.rpc('sync_credenciado_from_contract', {
      p_inscricao_id: inscricao_id
    });

    if (error) {
      console.error('[reprocessar-credenciado] Erro:', error);
      throw error;
    }

    console.log(`[reprocessar-credenciado] Sucesso! Credenciado ID: ${data}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        credenciado_id: data,
        inscricao_id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[reprocessar-credenciado] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
