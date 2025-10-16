import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlterarStatusRequest {
  credenciado_id: string;
  novo_status: 'Ativo' | 'Suspenso' | 'Descredenciado' | 'Afastado' | 'Inativo';
  justificativa: string;
  data_inicio?: string; // Para Suspenso/Afastado
  data_fim?: string; // Para Suspenso/Afastado
  data_efetiva?: string; // Para Descredenciado
  motivo_detalhado?: string; // Para Descredenciado
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Autenticação
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar permissões (gestor/admin)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasPermission = roles?.some(r => ['gestor', 'admin'].includes(r.role));

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Apenas gestores e administradores podem alterar status de credenciados' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: AlterarStatusRequest = await req.json();

    console.log('[ALTERAR_STATUS] Requisição recebida:', {
      credenciado_id: body.credenciado_id,
      novo_status: body.novo_status,
      justificativa_length: body.justificativa?.length,
      data_inicio: body.data_inicio,
      data_fim: body.data_fim,
      data_efetiva: body.data_efetiva
    });

    // Validar status permitido
    const statusPermitidos = ['Ativo', 'Suspenso', 'Descredenciado', 'Afastado', 'Inativo'];
    if (!statusPermitidos.includes(body.novo_status)) {
      console.error('[ALTERAR_STATUS] Status inválido:', body.novo_status);
      return new Response(
        JSON.stringify({ 
          error: `Status "${body.novo_status}" não é válido. Valores permitidos: ${statusPermitidos.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validações
    if (!body.justificativa || body.justificativa.length < 100) {
      return new Response(
        JSON.stringify({ error: 'Justificativa deve ter no mínimo 100 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ((body.novo_status === 'Suspenso' || body.novo_status === 'Afastado') && (!body.data_inicio || !body.data_fim)) {
      return new Response(
        JSON.stringify({ error: 'Data início e fim são obrigatórias para status Suspenso/Afastado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.novo_status === 'Descredenciado' && !body.data_efetiva) {
      return new Response(
        JSON.stringify({ error: 'Data efetiva é obrigatória para descredenciamento' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar credenciado atual
    const { data: credenciadoAtual, error: fetchError } = await supabase
      .from('credenciados')
      .select('status, nome, email, inscricao_id')
      .eq('id', body.credenciado_id)
      .single();

    if (fetchError || !credenciadoAtual) {
      return new Response(
        JSON.stringify({ error: 'Credenciado não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar transição de status
    if (credenciadoAtual.status === 'Descredenciado' && body.novo_status === 'Ativo') {
      return new Response(
        JSON.stringify({ error: 'Não é possível reativar um credenciado descredenciado. É necessária nova inscrição.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar nome do gestor
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('id', user.id)
      .single();

    const gestorNome = profile?.nome || user.email;

    // Preparar dados de atualização
    const updateData: any = {
      status: body.novo_status,
      updated_at: new Date().toISOString()
    };

    if (body.novo_status === 'Suspenso') {
      updateData.suspensao_inicio = body.data_inicio;
      updateData.suspensao_fim = body.data_fim;
      updateData.motivo_suspensao = body.justificativa;
      updateData.suspensao_automatica = false;
    } else if (body.novo_status === 'Afastado') {
      updateData.suspensao_inicio = body.data_inicio;
      updateData.suspensao_fim = body.data_fim;
      updateData.motivo_suspensao = `[AFASTADO] ${body.justificativa}`;
      updateData.suspensao_automatica = false;
    } else if (body.novo_status === 'Descredenciado') {
      updateData.data_descredenciamento_programado = body.data_efetiva;
      updateData.motivo_descredenciamento = body.motivo_detalhado || body.justificativa;
      // Limpar dados de suspensão
      updateData.suspensao_inicio = null;
      updateData.suspensao_fim = null;
      updateData.motivo_suspensao = null;
    } else if (body.novo_status === 'Ativo') {
      // Limpar todos os campos de suspensão/descredenciamento
      updateData.suspensao_inicio = null;
      updateData.suspensao_fim = null;
      updateData.motivo_suspensao = null;
      updateData.data_descredenciamento_programado = null;
    } else if (body.novo_status === 'Inativo') {
      updateData.motivo_suspensao = body.justificativa;
    }

    // Atualizar credenciado
    const { error: updateError } = await supabase
      .from('credenciados')
      .update(updateData)
      .eq('id', body.credenciado_id);

    if (updateError) {
      console.error('[ALTERAR_STATUS] Erro ao atualizar credenciado:', updateError);
      throw updateError;
    }

    // Registrar em historico_status_credenciado (trigger já faz isso, mas garantimos)
    const { error: historicoError } = await supabase
      .from('historico_status_credenciado')
      .insert({
        credenciado_id: body.credenciado_id,
        status_anterior: credenciadoAtual.status,
        status_novo: body.novo_status,
        motivo: body.justificativa,
        alterado_por: user.id,
        alterado_por_nome: gestorNome,
        metadata: {
          data_inicio: body.data_inicio,
          data_fim: body.data_fim,
          data_efetiva: body.data_efetiva,
          motivo_detalhado: body.motivo_detalhado,
          automatico: false
        }
      });

    if (historicoError) {
      console.warn('[ALTERAR_STATUS] Erro ao registrar histórico (trigger pode ter feito):', historicoError);
    }

    // Registrar em credenciado_historico
    const descricaoHistorico = `Status alterado de "${credenciadoAtual.status}" para "${body.novo_status}". Motivo: ${body.justificativa.substring(0, 200)}${body.justificativa.length > 200 ? '...' : ''}`;
    
    await supabase
      .from('credenciado_historico')
      .insert({
        credenciado_id: body.credenciado_id,
        tipo: 'alteracao_status',
        descricao: descricaoHistorico,
        usuario_responsavel: gestorNome
      });

    // Criar notificação para o credenciado (buscar via inscricao_id)
    if (credenciadoAtual.inscricao_id) {
      const { data: inscricao } = await supabase
        .from('inscricoes_edital')
        .select('candidato_id')
        .eq('id', credenciadoAtual.inscricao_id)
        .single();

      if (inscricao?.candidato_id) {
        const notificationTitle = body.novo_status === 'Ativo' 
          ? '✅ Status Atualizado: Ativo'
          : body.novo_status === 'Suspenso'
          ? '⏸️ Credenciamento Suspenso'
          : body.novo_status === 'Descredenciado'
          ? '🚫 Credenciamento Encerrado'
          : body.novo_status === 'Afastado'
          ? '📋 Afastamento Registrado'
          : '⚠️ Status Atualizado';

        const notificationMessage = `Seu credenciamento teve o status alterado para "${body.novo_status}". ${body.justificativa.substring(0, 150)}`;

        await supabase
          .from('app_notifications')
          .insert({
            user_id: inscricao.candidato_id,
            type: body.novo_status === 'Ativo' ? 'success' : body.novo_status === 'Descredenciado' ? 'error' : 'warning',
            title: notificationTitle,
            message: notificationMessage,
            related_type: 'credenciado',
            related_id: body.credenciado_id
          });
      }
    }

    // Log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        user_email: user.email,
        user_role: roles?.map(r => r.role).join(', '),
        action: 'credenciado_status_changed',
        resource_type: 'credenciado',
        resource_id: body.credenciado_id,
        old_values: { status: credenciadoAtual.status },
        new_values: { status: body.novo_status },
        metadata: {
          justificativa: body.justificativa,
          data_inicio: body.data_inicio,
          data_fim: body.data_fim,
          data_efetiva: body.data_efetiva,
          credenciado_nome: credenciadoAtual.nome
        }
      });

    console.log(`[ALTERAR_STATUS] Status de ${credenciadoAtual.nome} alterado: ${credenciadoAtual.status} → ${body.novo_status}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Status alterado de "${credenciadoAtual.status}" para "${body.novo_status}" com sucesso`,
        status_anterior: credenciadoAtual.status,
        status_novo: body.novo_status
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[ALTERAR_STATUS] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
