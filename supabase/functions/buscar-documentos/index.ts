import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers para permitir requisições do frontend
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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    );

    const body = await req.json();
    const {
      termo,
      status,
      tipo_documento,
      credenciado_id,
      data_inicio,
      data_fim,
      apenas_com_numero,
      limit = 50,
      offset = 0
    } = body;

    console.log('[buscar-documentos] Iniciando busca:', { 
      termo, status, tipo_documento, 
      limit, offset 
    });

    const inicioExecucao = Date.now();

    // Buscar documentos credenciados
    let query = supabase
      .from('documentos_credenciados')
      .select('*');

    // Aplicar filtros de busca
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
    if (apenas_com_numero === true) {
      query = query.not('numero_documento', 'is', null);
    }

    // Ordenação e paginação
    const { data, error } = await query
      .order('data_emissao', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[buscar-documentos] Erro ao buscar:', error);
      throw new Error(error.message);
    }

    // Buscar dados dos credenciados para os documentos encontrados
    const credenciadoIds = [...new Set(data?.map((d: any) => d.credenciado_id).filter(Boolean) || [])];
    
    let credenciadosMap: Map<string, any> = new Map();
    if (credenciadoIds.length > 0) {
      const { data: credenciados } = await supabase
        .from('credenciados')
        .select('id, nome, cpf, status')
        .in('id', credenciadoIds);
      
      credenciadosMap = new Map(credenciados?.map((c: any) => [c.id, c]) || []);
    }
    
    // Combinar dados
    const resultado = (data ?? []).map((doc: any) => {
      const credenciado = credenciadosMap.get(doc.credenciado_id);
      return {
        ...doc,
        credenciado_nome: credenciado?.nome || '',
        credenciado_cpf: credenciado?.cpf || '',
        credenciado_status: credenciado?.status || ''
      };
    });
    
    const tempoExecucao = Date.now() - inicioExecucao;

    console.log('[buscar-documentos] Busca concluída:', {
      total: resultado.length,
      tempo_ms: tempoExecucao
    });

    return new Response(JSON.stringify({
      success: true,
      data: resultado,
      meta: {
        total: resultado.length,
        tempo_ms: tempoExecucao,
        offset,
        limit,
        has_more: resultado.length === limit
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
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
