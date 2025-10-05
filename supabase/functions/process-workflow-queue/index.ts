// FASE 6: Worker para processar fila de workflows
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueItem {
  queue_id: string;
  inscricao_id: string;
  workflow_id: string;
  status: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[WORKER] Iniciando processamento da fila');

    // Buscar workflows pendentes
    const { data: queueItems, error: queueError } = await supabase
      .rpc('process_workflow_queue') as { data: QueueItem[] | null, error: any };

    if (queueError) {
      console.error('[WORKER] Erro ao buscar fila:', queueError);
      throw queueError;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('[WORKER] Nenhum workflow pendente');
      return new Response(
        JSON.stringify({ processed: 0, message: 'Nenhum workflow pendente' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[WORKER] ${queueItems.length} workflows encontrados`);

    const results = [];

    // Processar cada item da fila
    for (const item of queueItems) {
      console.log(`[WORKER] Processando inscrição ${item.inscricao_id}`);

      try {
        // Marcar como processando
        await supabase
          .from('workflow_queue')
          .update({ 
            status: 'processing',
            processing_started_at: new Date().toISOString(),
          })
          .eq('id', item.queue_id);

        // Buscar dados da fila
        const { data: queueData } = await supabase
          .from('workflow_queue')
          .select('*')
          .eq('id', item.queue_id)
          .single();

        if (!queueData) throw new Error('Queue item não encontrado');

        // Chamar execute-workflow
        const { data: executeResult, error: executeError } = await supabase.functions.invoke(
          'execute-workflow',
          {
            body: {
              workflowId: item.workflow_id,
              inputData: queueData.input_data,
              inscricaoId: item.inscricao_id,
            }
          }
        );

        if (executeError) throw executeError;

        // Marcar como concluído
        await supabase
          .from('workflow_queue')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.queue_id);

        results.push({
          inscricao_id: item.inscricao_id,
          status: 'success',
          execution_id: executeResult?.executionId,
        });

        console.log(`[WORKER] ✓ Workflow iniciado para inscrição ${item.inscricao_id}`);

      } catch (error: any) {
        console.error(`[WORKER] ✗ Erro ao processar ${item.inscricao_id}:`, error);

        // Incrementar attempts e marcar erro
        const { data: currentQueue } = await supabase
          .from('workflow_queue')
          .select('attempts, max_attempts')
          .eq('id', item.queue_id)
          .single();

        const newAttempts = (currentQueue?.attempts || 0) + 1;
        const maxAttempts = currentQueue?.max_attempts || 3;

        await supabase
          .from('workflow_queue')
          .update({ 
            status: newAttempts >= maxAttempts ? 'failed' : 'pending',
            attempts: newAttempts,
            error_message: error.message,
            processing_started_at: null,
          })
          .eq('id', item.queue_id);

        results.push({
          inscricao_id: item.inscricao_id,
          status: 'error',
          error: error.message,
          attempts: newAttempts,
        });
      }
    }

    console.log(`[WORKER] Processamento concluído: ${results.length} items`);

    return new Response(
      JSON.stringify({ 
        processed: results.length,
        results,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[WORKER] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
