import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { 
      termo, 
      status, 
      tipo_documento, 
      credenciado_id, 
      data_inicio, 
      data_fim 
    } = await req.json();

    console.log('[buscar-documentos] Iniciando busca:', { termo, status, tipo_documento });

    const inicioExecucao = Date.now();

    // Chamar função SQL
    const { data, error } = await supabase.rpc('buscar_documentos', {
      p_termo: termo || null,
      p_status: status || null,
      p_tipo_documento: tipo_documento || null,
      p_credenciado_id: credenciado_id || null,
      p_data_inicio: data_inicio || null,
      p_data_fim: data_fim || null,
      p_limit: 50
    });

    if (error) {
      console.error('[buscar-documentos] Erro ao buscar:', error);
      throw error;
    }

    const tempoExecucao = Date.now() - inicioExecucao;

    console.log('[buscar-documentos] Busca concluída:', {
      total: data.length,
      tempo_ms: tempoExecucao
    });

    // Registrar busca (async, não espera)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      supabase.from('historico_buscas').insert({
        usuario_id: user.id,
        termo_busca: termo,
        filtros: { status, tipo_documento, credenciado_id, data_inicio, data_fim },
        total_resultados: data.length,
        tempo_execucao_ms: tempoExecucao
      }).then(() => {
        console.log('[buscar-documentos] Histórico registrado');
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      meta: {
        total: data.length,
        tempo_ms: tempoExecucao
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[buscar-documentos] Erro:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
