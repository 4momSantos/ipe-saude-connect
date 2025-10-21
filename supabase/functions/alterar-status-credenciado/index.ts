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

    // Autenticação - Detectar se é chamada interna (service role) ou externa (JWT usuário)
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    // Verificar se é service role key (chamada interna de outra edge function)
    const isServiceRole = token === supabaseKey;
    
    let userId: string | null = null;
    let userEmail: string | null = null;
    let roles: any[] = [];

    if (isServiceRole) {
      console.log('[ALTERAR_STATUS] ✅ Chamada via service role (interna)');
      // Bypass de validação - edge function interna pode prosseguir
    } else {
      console.log('[ALTERAR_STATUS] Validando JWT de usuário...');
      // Validação normal para chamadas do frontend
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error('[ALTERAR_STATUS] ❌ Erro de autenticação:', authError);
        return new Response(
          JSON.stringify({ error: 'Não autenticado' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = user.id;
      userEmail = user.email || null;

      // Validar permissões (gestor/admin)
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      roles = userRoles || [];
      const hasPermission = roles.some(r => ['gestor', 'admin'].includes(r.role));

      if (!hasPermission) {
        console.error('[ALTERAR_STATUS] ❌ Usuário sem permissão');
        return new Response(
          JSON.stringify({ error: 'Apenas gestores e administradores podem alterar status de credenciados' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[ALTERAR_STATUS] ✅ Usuário autenticado:', userEmail);
    }

    const body: AlterarStatusRequest = await req.json();

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

    // Buscar nome do gestor/responsável
    let gestorNome = 'Sistema';
    
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', userId)
        .single();

      gestorNome = profile?.nome || userEmail || 'Gestor';
    }

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
        alterado_por: userId || 'system',
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
        user_id: userId || 'system',
        user_email: userEmail || 'system@interno',
        user_role: isServiceRole ? 'system' : roles.map(r => r.role).join(', '),
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
          credenciado_nome: credenciadoAtual.nome,
          via_service_role: isServiceRole
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
