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

    console.log('[NOTIFICAR_DESCRED] Iniciando verificação');

    // Notificar 30 dias antes
    const data30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: em30dias } = await supabaseClient
      .from('credenciados')
      .select('*, inscricao:inscricoes_edital(candidato_id)')
      .eq('data_descredenciamento_programado', data30Dias)
      .eq('status', 'Ativo');

    for (const cred of em30dias || []) {
      if (cred.inscricao?.candidato_id) {
        await supabaseClient.from('app_notifications').insert({
          user_id: cred.inscricao.candidato_id,
          type: 'warning',
          title: 'Descredenciamento em 30 dias',
          message: `Seu credenciamento será encerrado em 30 dias. Motivo: ${cred.motivo_descredenciamento || 'Não especificado'}`,
          related_type: 'credenciado',
          related_id: cred.id
        });
      }
    }

    // Notificar 7 dias antes
    const data7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: em7dias } = await supabaseClient
      .from('credenciados')
      .select('*, inscricao:inscricoes_edital(candidato_id)')
      .eq('data_descredenciamento_programado', data7Dias)
      .eq('status', 'Ativo');

    for (const cred of em7dias || []) {
      if (cred.inscricao?.candidato_id) {
        await supabaseClient.from('app_notifications').insert({
          user_id: cred.inscricao.candidato_id,
          type: 'error',
          title: 'URGENTE: Descredenciamento em 7 dias',
          message: 'Seu credenciamento será encerrado em 7 dias!',
          related_type: 'credenciado',
          related_id: cred.id
        });
      }
    }

    console.log(`[NOTIFICAR_DESCRED] ✅ Notificados: ${em30dias?.length || 0} (30 dias), ${em7dias?.length || 0} (7 dias)`);

    return new Response(
      JSON.stringify({
        notificados_30dias: em30dias?.length || 0,
        notificados_7dias: em7dias?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[NOTIFICAR_DESCRED] Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
