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

    console.log('[DESCREDENCIAMENTO] Iniciando processamento');

    // Buscar credenciados com descredenciamento para hoje
    const { data: credenciados, error } = await supabaseClient
      .from('credenciados')
      .select('*, inscricao:inscricoes_edital(candidato_id)')
      .eq('data_descredenciamento_programado', new Date().toISOString().split('T')[0])
      .eq('status', 'Ativo');

    if (error) throw error;

    for (const cred of credenciados || []) {
      // Atualizar status
      await supabaseClient.from('credenciados').update({
        status: 'Descredenciado',
        updated_at: new Date().toISOString()
      }).eq('id', cred.id);

      // Invalidar certificados
      await supabaseClient.from('certificados').update({
        status: 'inativo'
      }).eq('credenciado_id', cred.id).eq('status', 'ativo');

      // Notificar credenciado
      if (cred.inscricao?.candidato_id) {
        await supabaseClient.from('app_notifications').insert({
          user_id: cred.inscricao.candidato_id,
          type: 'warning',
          title: 'Descredenciamento Efetivado',
          message: `Seu credenciamento foi encerrado. Motivo: ${cred.motivo_descredenciamento || 'Não especificado'}`,
          related_type: 'credenciado',
          related_id: cred.id
        });
      }

      // Registrar em audit_logs
      await supabaseClient.from('audit_logs').insert({
        user_id: null,
        action: 'descredenciamento_automatico',
        resource_type: 'credenciado',
        resource_id: cred.id,
        metadata: { motivo: cred.motivo_descredenciamento }
      });

      console.log(`[DESCREDENCIAMENTO] ✅ Credenciado ${cred.nome} descredenciado`);
    }

    return new Response(
      JSON.stringify({ processed: credenciados?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[DESCREDENCIAMENTO] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
