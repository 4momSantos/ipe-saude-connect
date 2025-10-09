import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[REGRAS_SUSPENSAO] Iniciando verificação de regras');

    // Buscar credenciados que violam regras
    const { data: violacoes, error: violacoesError } = await supabaseClient
      .rpc('verificar_regras_suspensao_automatica');

    if (violacoesError) throw violacoesError;

    if (!violacoes || violacoes.length === 0) {
      console.log('[REGRAS_SUSPENSAO] Nenhuma violação detectada');
      return new Response(
        JSON.stringify({ processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[REGRAS_SUSPENSAO] ${violacoes.length} violações detectadas`);

    for (const v of violacoes) {
      // Verificar se já foi aplicada recentemente (evitar duplicatas)
      const { data: logRecente } = await supabaseClient
        .from('logs_regras_suspensao')
        .select('id')
        .eq('credenciado_id', v.credenciado_id)
        .eq('regra_id', v.regra_id)
        .gte('aplicado_em', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (logRecente) {
        console.log(`[REGRAS_SUSPENSAO] Regra já aplicada recentemente para credenciado ${v.credenciado_nome}`);
        continue;
      }

      // Aplicar ação
      if (v.acao === 'suspensao') {
        const { data: regra } = await supabaseClient
          .from('regras_suspensao_automatica')
          .select('duracao_dias')
          .eq('id', v.regra_id)
          .single();

        const duracao = regra?.duracao_dias || 30;

        await supabaseClient.from('credenciados').update({
          status: 'Suspenso',
          suspensao_inicio: new Date().toISOString().split('T')[0],
          suspensao_fim: new Date(Date.now() + duracao * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          motivo_suspensao: v.motivo,
          suspensao_automatica: true
        }).eq('id', v.credenciado_id);

        console.log(`[REGRAS_SUSPENSAO] ✅ Credenciado ${v.credenciado_nome} suspenso por ${duracao} dias`);
      } else if (v.acao === 'alerta' || v.acao === 'notificacao') {
        // Criar notificação
        const { data: credenciado } = await supabaseClient
          .from('credenciados')
          .select('inscricao_id')
          .eq('id', v.credenciado_id)
          .single();

        if (credenciado?.inscricao_id) {
          const { data: inscricao } = await supabaseClient
            .from('inscricoes_edital')
            .select('candidato_id')
            .eq('id', credenciado.inscricao_id)
            .single();

          if (inscricao?.candidato_id) {
            await supabaseClient.from('app_notifications').insert({
              user_id: inscricao.candidato_id,
              type: 'warning',
              title: 'Alerta de Conformidade',
              message: v.motivo,
              related_type: 'credenciado',
              related_id: v.credenciado_id
            });
          }
        }

        console.log(`[REGRAS_SUSPENSAO] ⚠️ Alerta enviado para ${v.credenciado_nome}`);
      }

      // Registrar log
      await supabaseClient.from('logs_regras_suspensao').insert({
        regra_id: v.regra_id,
        credenciado_id: v.credenciado_id,
        acao_aplicada: v.acao,
        motivo: v.motivo,
        dados_gatilho: v.dados_gatilho
      });

      // Registrar em audit_logs
      await supabaseClient.from('audit_logs').insert({
        user_id: null,
        action: `suspensao_automatica_${v.acao}`,
        resource_type: 'credenciado',
        resource_id: v.credenciado_id,
        metadata: {
          regra_id: v.regra_id,
          regra_nome: v.regra_nome,
          motivo: v.motivo
        }
      });
    }

    return new Response(
      JSON.stringify({ processed: violacoes.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[REGRAS_SUSPENSAO] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
