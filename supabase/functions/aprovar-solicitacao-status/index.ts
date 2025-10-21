import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AprovarSolicitacaoStatusRequest {
  solicitacao_id: string;
  observacoes?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[aprovar-solicitacao-status] Iniciando processamento');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('[aprovar-solicitacao-status] Token de autorização não fornecido');
      return new Response(
        JSON.stringify({ error: 'Token de autorização não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('[aprovar-solicitacao-status] Erro de autenticação:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[aprovar-solicitacao-status] Usuário autenticado:', user.id);

    // Check user role
    const { data: userRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError || !userRoles || userRoles.length === 0) {
      console.error('[aprovar-solicitacao-status] Erro ao verificar permissões:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Sem permissões para aprovar solicitações' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roles = userRoles.map(r => r.role);
    const hasPermission = roles.some(role => ['gestor', 'admin', 'analista'].includes(role));

    if (!hasPermission) {
      console.error('[aprovar-solicitacao-status] Usuário sem permissão adequada:', roles);
      return new Response(
        JSON.stringify({ error: 'Sem permissões para aprovar solicitações de status' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: AprovarSolicitacaoStatusRequest = await req.json();
    const { solicitacao_id, observacoes } = body;

    if (!solicitacao_id) {
      return new Response(
        JSON.stringify({ error: 'ID da solicitação é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[aprovar-solicitacao-status] Buscando solicitação:', solicitacao_id);

    // Fetch the request
    const { data: solicitacao, error: solicitacaoError } = await supabaseClient
      .from('solicitacoes_alteracao')
      .select('*')
      .eq('id', solicitacao_id)
      .single();

    if (solicitacaoError || !solicitacao) {
      console.error('[aprovar-solicitacao-status] Erro ao buscar solicitação:', solicitacaoError);
      return new Response(
        JSON.stringify({ error: 'Solicitação não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that it's a status change request
    if (solicitacao.tipo_alteracao !== 'status') {
      console.error('[aprovar-solicitacao-status] Tipo de solicitação inválido:', solicitacao.tipo_alteracao);
      return new Response(
        JSON.stringify({ error: 'Solicitação não é de alteração de status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that it's pending
    if (solicitacao.status !== 'Pendente') {
      console.error('[aprovar-solicitacao-status] Solicitação não está pendente:', solicitacao.status);
      return new Response(
        JSON.stringify({ error: 'Solicitação não está pendente' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[aprovar-solicitacao-status] Extraindo dados propostos:', solicitacao.dados_propostos);

    // Extract proposed data
    const dadosPropostos = solicitacao.dados_propostos;
    
    // Call alterar-status-credenciado edge function with service role
    const { data: alteracaoData, error: alteracaoError } = await supabaseClient.functions.invoke(
      'alterar-status-credenciado',
      {
        body: {
          credenciado_id: solicitacao.credenciado_id,
          novo_status: dadosPropostos.novo_status,
          justificativa: dadosPropostos.justificativa,
          data_inicio: dadosPropostos.data_inicio,
          data_fim: dadosPropostos.data_fim,
          data_efetiva: dadosPropostos.data_efetiva,
          motivo_detalhado: dadosPropostos.motivo_detalhado,
        },
        headers: {
          authorization: `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (alteracaoError) {
      console.error('[aprovar-solicitacao-status] Erro ao alterar status do credenciado:', alteracaoError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao alterar status do credenciado',
          details: alteracaoError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[aprovar-solicitacao-status] Status do credenciado alterado com sucesso');

    // Update request status to Aprovada
    const { error: updateError } = await supabaseClient
      .from('solicitacoes_alteracao')
      .update({
        status: 'Aprovada',
        analisado_em: new Date().toISOString(),
        analisado_por: user.id,
        observacoes_analise: observacoes || 'Solicitação aprovada automaticamente',
      })
      .eq('id', solicitacao_id);

    if (updateError) {
      console.error('[aprovar-solicitacao-status] Erro ao atualizar solicitação:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar status da solicitação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[aprovar-solicitacao-status] Solicitação atualizada com sucesso');

    // Get credenciado inscription ID for notification
    const { data: credenciado } = await supabaseClient
      .from('credenciados')
      .select('inscricao_id')
      .eq('id', solicitacao.credenciado_id)
      .single();

    // Create notification for credenciado
    if (credenciado?.inscricao_id) {
      const { data: inscricao } = await supabaseClient
        .from('inscricoes_edital')
        .select('candidato_id')
        .eq('id', credenciado.inscricao_id)
        .single();

      if (inscricao?.candidato_id) {
        await supabaseClient.from('app_notifications').insert({
          user_id: inscricao.candidato_id,
          titulo: 'Solicitação de Alteração de Status Aprovada',
          mensagem: `Sua solicitação para alterar o status para "${dadosPropostos.novo_status}" foi aprovada.`,
          tipo: 'solicitacao_aprovada',
          link: `/credenciados/${solicitacao.credenciado_id}`,
        });

        console.log('[aprovar-solicitacao-status] Notificação criada para candidato:', inscricao.candidato_id);
      }
    }

    // Log audit
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'aprovar_solicitacao_status',
      table_name: 'solicitacoes_alteracao',
      record_id: solicitacao_id,
      details: {
        credenciado_id: solicitacao.credenciado_id,
        novo_status: dadosPropostos.novo_status,
        observacoes,
      },
    });

    console.log('[aprovar-solicitacao-status] Audit log registrado');

    return new Response(
      JSON.stringify({
        message: 'Solicitação de alteração de status aprovada e executada com sucesso',
        alteracao: alteracaoData,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[aprovar-solicitacao-status] Erro não tratado:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
