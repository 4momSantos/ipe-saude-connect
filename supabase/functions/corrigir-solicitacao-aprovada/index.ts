import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CorrigirSolicitacaoRequest {
  solicitacao_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { solicitacao_id }: CorrigirSolicitacaoRequest = await req.json();

    console.log('[CORRIGIR] Iniciando correção:', solicitacao_id);

    // Buscar a solicitação
    const { data: solicitacao, error: solicitacaoError } = await supabase
      .from('solicitacoes_alteracao')
      .select('*')
      .eq('id', solicitacao_id)
      .single();

    if (solicitacaoError || !solicitacao) {
      throw new Error(`Solicitação não encontrada: ${solicitacaoError?.message}`);
    }

    if (solicitacao.tipo_alteracao !== 'status') {
      throw new Error('Esta função só corrige solicitações de status');
    }

    console.log('[CORRIGIR] Solicitação encontrada:', solicitacao);

    // Extrair dados propostos
    const dadosPropostos = solicitacao.dados_propostos;
    
    // Preparar payload para alterar-status-credenciado
    const payload = {
      credenciado_id: solicitacao.credenciado_id,
      novo_status: dadosPropostos.novo_status,
      justificativa: dadosPropostos.justificativa,
      data_inicio: dadosPropostos.data_inicio,
      data_fim: dadosPropostos.data_fim,
      data_efetiva: dadosPropostos.data_efetiva,
      motivo_detalhado: dadosPropostos.motivo_detalhado,
    };

    console.log('[CORRIGIR] Chamando alterar-status-credenciado:', payload);

    // Chamar a edge function de alteração de status
    const { data: resultAlteracao, error: errorAlteracao } = await supabase.functions.invoke(
      'alterar-status-credenciado',
      { body: payload }
    );

    if (errorAlteracao) {
      console.error('[CORRIGIR] Erro ao alterar status:', errorAlteracao);
      throw errorAlteracao;
    }

    console.log('[CORRIGIR] Status alterado com sucesso:', resultAlteracao);

    // Criar notificação para o credenciado
    const { data: inscricao } = await supabase
      .from('inscricoes')
      .select('user_id')
      .eq('id', solicitacao.credenciado_id)
      .single();

    if (inscricao?.user_id) {
      await supabase.from('app_notifications').insert({
        user_id: inscricao.user_id,
        title: 'Solicitação de Alteração de Status Aprovada',
        message: `Sua solicitação de alteração de status para "${dadosPropostos.novo_status}" foi aprovada.`,
        type: 'info',
        link: `/credenciados/${solicitacao.credenciado_id}`,
      });
    }

    console.log('[CORRIGIR] Correção concluída com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Status do credenciado corrigido com sucesso',
        credenciado_id: solicitacao.credenciado_id,
        novo_status: dadosPropostos.novo_status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CORRIGIR] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
