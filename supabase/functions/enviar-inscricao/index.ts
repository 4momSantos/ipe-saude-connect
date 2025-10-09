import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { inscricao_id } = await req.json();

    if (!inscricao_id) {
      throw new Error('inscricao_id é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[ENVIAR_INSCRICAO] Processando envio da inscrição:', inscricao_id);

    // Buscar dados da inscrição
    const { data: inscricao, error: inscricaoError } = await supabase
      .from('inscricoes_edital')
      .select(`
        id,
        edital_id,
        candidato_id,
        status,
        is_rascunho,
        editais (
          id,
          titulo,
          numero_edital
        )
      `)
      .eq('id', inscricao_id)
      .single();

    if (inscricaoError) throw inscricaoError;
    if (!inscricao) throw new Error('Inscrição não encontrada');

    // Validar que está em rascunho
    if (inscricao.status !== 'rascunho' && !inscricao.is_rascunho) {
      throw new Error('Inscrição já foi enviada anteriormente');
    }

    // Atualizar inscrição para aguardando_analise
    const { error: updateError } = await supabase
      .from('inscricoes_edital')
      .update({ 
        status: 'aguardando_analise',
        is_rascunho: false 
      })
      .eq('id', inscricao_id);

    if (updateError) throw updateError;

    console.log('[ENVIAR_INSCRICAO] Inscrição atualizada para aguardando_analise');

    // Notificar analistas sobre nova inscrição
    const { data: analistas } = await supabase.rpc('get_gestores');
    
    if (analistas && analistas.length > 0) {
      const notifications = analistas.map((analista: any) => ({
        user_id: analista.id,
        type: 'info',
        title: 'Nova Inscrição Recebida',
        message: `Uma nova inscrição foi recebida no edital "${(inscricao.editais as any).titulo}" e aguarda análise.`,
        related_type: 'inscricao',
        related_id: inscricao_id
      }));

      await supabase.from('app_notifications').insert(notifications);
      console.log('[ENVIAR_INSCRICAO] Notificações enviadas para', analistas.length, 'analistas');
    }

    // Notificar candidato sobre envio bem-sucedido
    await supabase.from('app_notifications').insert({
      user_id: inscricao.candidato_id,
      type: 'success',
      title: 'Inscrição Enviada',
      message: `Sua inscrição no edital "${(inscricao.editais as any).titulo}" foi enviada com sucesso e está em análise.`,
      related_type: 'inscricao',
      related_id: inscricao_id
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        inscricao_id,
        status: 'aguardando_analise' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('[ENVIAR_INSCRICAO] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
