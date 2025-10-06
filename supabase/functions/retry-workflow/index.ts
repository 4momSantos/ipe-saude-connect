import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Autenticação do usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { inscricaoId } = await req.json();

    console.log('[RETRY_WORKFLOW] Iniciando reenvio para inscrição:', inscricaoId);
    console.log('[RETRY_WORKFLOW] Candidato:', user.id);

    // 1. Buscar inscrição e validar
    const { data: inscricao, error: inscricaoError } = await supabase
      .from('inscricoes_edital')
      .select(`
        *,
        editais (
          workflow_id,
          workflow_version
        ),
        workflow_executions (
          status
        )
      `)
      .eq('id', inscricaoId)
      .eq('candidato_id', user.id)
      .single();

    if (inscricaoError || !inscricao) {
      console.error('[RETRY_WORKFLOW] Erro ao buscar inscrição:', inscricaoError);
      throw new Error('Inscrição não encontrada ou você não tem permissão');
    }

    console.log('[RETRY_WORKFLOW] Inscrição encontrada:', {
      status: inscricao.status,
      retry_count: inscricao.retry_count,
      workflow_status: inscricao.workflow_executions?.status
    });

    // 2. Validar se pode reenviar
    const canRetry = 
      (inscricao.status === 'inabilitado' || inscricao.workflow_executions?.status === 'failed') &&
      inscricao.retry_count < 3;

    if (!canRetry) {
      if (inscricao.retry_count >= 3) {
        return new Response(
          JSON.stringify({ 
            error: 'Limite de tentativas excedido. Entre em contato com o suporte.' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Esta inscrição não está em estado que permita reenvio.' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 3. Verificar se workflow está configurado
    if (!inscricao.editais?.workflow_id) {
      throw new Error('Edital não possui workflow configurado');
    }

    // 4. Preparar input_data
    const inputData = {
      inscricaoId: inscricao.id,
      candidatoId: inscricao.candidato_id,
      editalId: inscricao.edital_id,
      dadosInscricao: inscricao.dados_inscricao,
      isRetry: true,
      previousExecutionId: inscricao.workflow_execution_id
    };

    // 5. Inserir na fila
    const { data: queueItem, error: queueError } = await supabase
      .from('workflow_queue')
      .insert({
        inscricao_id: inscricao.id,
        workflow_id: inscricao.editais.workflow_id,
        workflow_version: inscricao.editais.workflow_version || 1,
        input_data: inputData,
        status: 'pending',
        attempts: 0
      })
      .select()
      .single();

    if (queueError) {
      console.error('[RETRY_WORKFLOW] Erro ao inserir na fila:', queueError);
      throw new Error('Erro ao criar item na fila de processamento');
    }

    console.log('[RETRY_WORKFLOW] Item criado na fila:', queueItem.id);

    // 6. Atualizar inscrição
    const { error: updateError } = await supabase
      .from('inscricoes_edital')
      .update({
        status: 'pendente_workflow',
        retry_count: inscricao.retry_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', inscricao.id);

    if (updateError) {
      console.error('[RETRY_WORKFLOW] Erro ao atualizar inscrição:', updateError);
      throw new Error('Erro ao atualizar status da inscrição');
    }

    // 7. Registrar no audit log
    await supabase.rpc('log_audit_event', {
      p_action: 'workflow_retry',
      p_resource_type: 'inscricao',
      p_resource_id: inscricao.id,
      p_metadata: {
        queue_id: queueItem.id,
        retry_count: inscricao.retry_count + 1,
        previous_status: inscricao.status
      }
    });

    console.log('[RETRY_WORKFLOW] ✅ Reenvio configurado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        queueId: queueItem.id,
        message: 'Reenvio iniciado com sucesso'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[RETRY_WORKFLOW] ❌ Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao processar reenvio' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
