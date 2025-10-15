import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );

  const url = new URL(req.url);
  const path = url.pathname.replace('/rede-analitica', '');
  
  try {
    // GET /perfil/:profissional_id - Perfil completo do profissional
    if (req.method === 'GET' && path.match(/^\/perfil\/[a-z0-9-]+$/)) {
      const profissionalId = path.split('/perfil/')[1];
      
      const { data: perfil } = await supabase
        .from('profissionais_credenciados')
        .select(`
          id, nome, cpf, email, telefone, celular, principal, ativo,
          credenciado:credenciado_id (
            id, nome, cnpj, cidade, estado, latitude, longitude
          ),
          credenciado_crms (
            id, crm, uf_crm, especialidade, especialidade_id,
            horarios_atendimento (
              dia_semana, horario_inicio, horario_fim
            )
          ),
          avaliacoes:avaliacoes_profissionais (
            nota_qualidade, nota_tempo_resposta, nota_experiencia, nota_comunicacao,
            comentario, pontos_fortes, pontos_melhoria, data_avaliacao, origem
          ),
          indicadores:indicadores_profissionais (
            periodo, score_geral, avaliacao_media, atendimentos,
            score_qualidade, score_produtividade, score_pontualidade
          )
        `)
        .eq('id', profissionalId)
        .single();
      
      return new Response(JSON.stringify(perfil), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // GET /rede - Lista consolidada da rede com filtros
    if (req.method === 'GET' && path === '/rede') {
      const especialidade = url.searchParams.get('especialidade');
      const cidade = url.searchParams.get('cidade');
      const uf = url.searchParams.get('uf');
      const scoreMinimo = url.searchParams.get('score_minimo');
      
      let query = supabase
        .from('profissionais_credenciados')
        .select(`
          id, nome, cpf, email, telefone, principal, ativo,
          credenciado:credenciado_id (
            nome, cidade, estado, latitude, longitude
          ),
          credenciado_crms (
            crm, uf_crm, especialidade
          ),
          indicadores:indicadores_profissionais (
            periodo, score_geral, avaliacao_media, atendimentos
          )
        `)
        .eq('ativo', true)
        .order('nome');
      
      const { data: rede } = await query;
      
      // Filtrar por especialidade e score no frontend (após busca)
      let filteredData = rede || [];
      
      if (especialidade) {
        filteredData = filteredData.filter(p => 
          p.credenciado_crms?.some((crm: any) => 
            crm.especialidade?.toLowerCase().includes(especialidade.toLowerCase())
          )
        );
      }
      
      if (cidade) {
        filteredData = filteredData.filter(p =>
          p.credenciado?.cidade?.toLowerCase().includes(cidade.toLowerCase())
        );
      }
      
      if (uf) {
        filteredData = filteredData.filter(p =>
          p.credenciado?.estado === uf
        );
      }
      
      if (scoreMinimo) {
        const minScore = parseFloat(scoreMinimo);
        filteredData = filteredData.filter(p =>
          p.indicadores?.some((i: any) => i.score_geral >= minScore)
        );
      }
      
      return new Response(JSON.stringify(filteredData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // GET /estatisticas - KPIs gerais da rede
    if (req.method === 'GET' && path === '/estatisticas') {
      const { data } = await supabase.rpc('obter_estatisticas_rede');
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // POST /calcular-indicadores - Recalcular indicadores de um profissional
    if (req.method === 'POST' && path === '/calcular-indicadores') {
      const body = await req.json();
      const { profissional_id, periodo } = body;
      
      const { data } = await supabase.rpc('calcular_indicadores_profissional', {
        p_profissional_id: profissional_id,
        p_periodo: periodo || null
      });
      
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Endpoint não encontrado', { 
      status: 404,
      headers: corsHeaders 
    });
    
  } catch (error) {
    console.error('[REDE_ANALITICA] Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
