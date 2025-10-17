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

    // Buscar documentos com query direta
    let query = supabase
      .from('documentos_credenciados')
      .select(`
        *,
        credenciado:credenciados!documentos_credenciados_credenciado_id_fkey(
          id, nome, cpf, status
        )
      `, { count: 'exact' });

    // Aplicar filtros
    if (termo) {
      query = query.or(`numero_documento.ilike.%${termo}%,observacoes.ilike.%${termo}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (tipo_documento) {
      query = query.eq('tipo_documento', tipo_documento);
    }
    if (credenciado_id) {
      query = query.eq('credenciado_id', credenciado_id);
    }
    if (data_inicio) {
      query = query.gte('data_emissao', data_inicio);
    }
    if (data_fim) {
      query = query.lte('data_emissao', data_fim);
    }
    if (apenas_com_numero) {
      query = query.not('numero_documento', 'is', null);
    }

    // Ordenação e paginação
    query = query
      .order('data_emissao', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

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
