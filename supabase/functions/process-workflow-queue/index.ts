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

    // Processar cada item da fila (batch de 5)
    const limitedItems = queueItems.slice(0, 5);
    
    for (const item of limitedItems) {
      console.log(`[WORKER] Processando item ${item.queue_id}`);

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

        // DETECTAR CALLBACK DEV
        if (queueData.input_data?.__dev_callback) {
          console.log(`[WORKER] 🔧 DEV Callback detectado para signature`);
          
          const { signature_request_id, execution_id, step_execution_id, delay_seconds } = queueData.input_data;
          
          // Aguardar delay simulado
          await new Promise(resolve => setTimeout(resolve, delay_seconds * 1000));
          
          // Completar signature_request
          await supabase
            .from('signature_requests')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              metadata: { dev_mode_auto_complete: true }
            })
            .eq('id', signature_request_id);
          
          // Completar step_execution
          await supabase
            .from('workflow_step_executions')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              output_data: { dev_mode_signed: true }
            })
            .eq('id', step_execution_id);
          
          // Invocar continue-workflow
          await supabase.functions.invoke('continue-workflow', {
            body: {
              stepExecutionId: step_execution_id,
              decision: 'approved'
            }
          });
          
          // Marcar job como completed
          await supabase
            .from('workflow_queue')
            .update({ status: 'completed', processed_at: new Date().toISOString() })
            .eq('id', item.queue_id);
          
          results.push({
            inscricao_id: item.inscricao_id || 'dev-callback',
            status: 'dev_callback_success',
          });
          
          continue; // Próximo item
        }

        // Verificar feature flag use_orchestrator_v2
        const { data: editalData } = await supabase
          .from('inscricoes_edital')
          .select('edital:editais(use_orchestrator_v2)')
          .eq('id', item.inscricao_id)
          .single();

        const useV2 = (editalData?.edital as any)?.use_orchestrator_v2 || false;
        const functionName = useV2 ? 'execute-workflow-v2' : 'execute-workflow';

        console.log(`[WORKER] Usando ${functionName} para inscrição ${item.inscricao_id}`);

        // Processar workflow (tentar v2, fallback para v1)
        let executeResult: any;
        let executeError: any;

        try {
          const result = await supabase.functions.invoke(functionName, {
            body: {
              workflowId: item.workflow_id,
              inputData: queueData.input_data,
              inscricaoId: item.inscricao_id,
            }
          });
          executeResult = result.data;
          executeError = result.error;
        } catch (err: any) {
          console.error(`[WORKER] Erro ao invocar ${functionName}:`, err);
          
          // Fallback para v1 se v2 falhar
          if (useV2) {
            console.log('[WORKER] Tentando fallback para execute-workflow (v1)');
            const fallbackResult = await supabase.functions.invoke('execute-workflow', {
              body: {
                workflowId: item.workflow_id,
                inputData: queueData.input_data,
                inscricaoId: item.inscricao_id,
              }
            });
            executeResult = fallbackResult.data;
            executeError = fallbackResult.error;
          } else {
            throw err;
          }
        }

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
