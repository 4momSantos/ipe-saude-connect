import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache simples em memória (5 min TTL)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

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
      data_fim,
      incluir_prazos,
      incluir_ocr,
      status_credenciado,
      apenas_habilitados,
      apenas_com_numero,
      incluir_nao_credenciados,
      limit = 50,
      offset = 0
    } = await req.json();

    // Gerar chave de cache
    const cacheKey = JSON.stringify({
      termo, status, tipo_documento, credenciado_id,
      data_inicio, data_fim, incluir_prazos, incluir_ocr,
      status_credenciado, apenas_habilitados, 
      apenas_com_numero, incluir_nao_credenciados,
      limit, offset
    });

    // Verificar cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[CACHE HIT]', { termo, offset });
      return new Response(JSON.stringify(cached.data), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        },
      });
    }

    console.log('[buscar-documentos] Iniciando busca:', { termo, status, tipo_documento, incluir_prazos, incluir_ocr, limit, offset });

    const inicioExecucao = Date.now();

    // Usar nova função SQL otimizada
    const { data, error } = await supabase.rpc('buscar_documentos_v2', {
      p_termo: termo || null,
      p_status: status || null,
      p_tipo_documento: tipo_documento || null,
      p_credenciado_id: credenciado_id || null,
      p_data_inicio: data_inicio || null,
      p_data_fim: data_fim || null,
      p_incluir_prazos: incluir_prazos ?? false,
      p_incluir_ocr: incluir_ocr ?? false,
      p_status_credenciado: status_credenciado || null,
      p_apenas_habilitados: apenas_habilitados ?? null,
      p_apenas_com_numero: apenas_com_numero ?? null,
      p_incluir_nao_credenciados: incluir_nao_credenciados ?? false,
      p_limit: limit,
      p_offset: offset
    });

    if (error) {
      console.error('[buscar-documentos] Erro ao buscar:', error);
      throw error;
    }

    const tempoExecucao = Date.now() - inicioExecucao;

    console.log('[buscar-documentos] Busca concluída:', {
      total: data.length,
      tempo_ms: tempoExecucao,
      offset,
      limit
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

    const resultado = {
      success: true, 
      data,
      meta: {
        total: data.length,
        tempo_ms: tempoExecucao,
        offset,
        limit,
        has_more: data.length === limit
      }
    };

    // Armazenar no cache
    cache.set(cacheKey, { data: resultado, timestamp: Date.now() });

    // Limpar cache antigo (>10 min)
    for (const [key, value] of cache.entries()) {
      if (Date.now() - value.timestamp > 10 * 60 * 1000) {
        cache.delete(key);
      }
    }

    return new Response(JSON.stringify(resultado), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300'
      },
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
