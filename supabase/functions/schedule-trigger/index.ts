/**
 * SCHEDULE TRIGGER
 * Executa workflows agendados (cron jobs)
 * 
 * DEVE SER CHAMADO A CADA 1 MINUTO via pg_cron:
 * 
 * SELECT cron.schedule(
 *   'process-workflow-schedules',
 *   '* * * * *', -- A cada minuto
 *   $$
 *   SELECT net.http_post(
 *     url := 'https://PROJECT_REF.supabase.co/functions/v1/schedule-trigger',
 *     headers := '{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_KEY"}'::jsonb
 *   ) as request_id;
 *   $$
 * );
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SCHEDULE_TRIGGER] Iniciando processamento de schedules');

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    
    // 1. BUSCAR SCHEDULES ATIVOS que devem rodar agora
    // Busca schedules com next_run_at <= now OR next_run_at IS NULL
    const { data: schedules, error: schedulesError } = await supabaseClient
      .from("workflow_schedules")
      .select(`
        *,
        workflow:workflows(id, name, is_active, version)
      `)
      .eq("is_active", true)
      .or(`next_run_at.is.null,next_run_at.lte.${now.toISOString()}`);

    if (schedulesError) {
      console.error('[SCHEDULE_TRIGGER] Erro ao buscar schedules:', schedulesError);
      throw schedulesError;
    }

    if (!schedules || schedules.length === 0) {
      console.log('[SCHEDULE_TRIGGER] Nenhum schedule para processar');
      return new Response(
        JSON.stringify({ processed: 0, message: 'No schedules to process' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[SCHEDULE_TRIGGER] ${schedules.length} schedules encontrados`);

    const results = [];

    // 2. PROCESSAR CADA SCHEDULE
    for (const schedule of schedules) {
      try {
        const workflow = (schedule.workflow as any);
        
        // Verificar se workflow está ativo
        if (!workflow || !workflow.is_active) {
          console.log(`[SCHEDULE_TRIGGER] Workflow ${schedule.workflow_id} inativo, pulando`);
          continue;
        }

        console.log(`[SCHEDULE_TRIGGER] Processando schedule ${schedule.id} para workflow ${workflow.name}`);

        // 3. ENFILEIRAR WORKFLOW
        const { data: queueItem, error: queueError } = await supabaseClient
          .from("workflow_queue")
          .insert({
            workflow_id: schedule.workflow_id,
            workflow_version: workflow.version,
            input_data: {
              ...schedule.input_data,
              __trigger_source: 'schedule',
              __schedule_id: schedule.id,
              __cron_expression: schedule.cron_expression,
              __triggered_at: now.toISOString()
            },
            status: 'pending',
            attempts: 0
          })
          .select()
          .single();

        if (queueError) {
          console.error(`[SCHEDULE_TRIGGER] Erro ao enfileirar workflow ${schedule.workflow_id}:`, queueError);
          throw queueError;
        }

        // 4. ATUALIZAR SCHEDULE (last_run_at e calcular next_run_at)
        const nextRunAt = calculateNextRun(schedule.cron_expression, schedule.timezone);
        
        await supabaseClient
          .from("workflow_schedules")
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRunAt
          })
          .eq("id", schedule.id);

        results.push({
          scheduleId: schedule.id,
          workflowId: schedule.workflow_id,
          queueId: queueItem.id,
          status: 'queued',
          nextRunAt
        });

        console.log(`[SCHEDULE_TRIGGER] ✓ Workflow ${workflow.name} enfileirado`);

      } catch (error: any) {
        console.error(`[SCHEDULE_TRIGGER] ✗ Erro ao processar schedule ${schedule.id}:`, error);
        results.push({
          scheduleId: schedule.id,
          workflowId: schedule.workflow_id,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`[SCHEDULE_TRIGGER] Processamento concluído: ${results.length} schedules processados`);

    return new Response(
      JSON.stringify({
        processed: results.length,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error('[SCHEDULE_TRIGGER] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

/**
 * Calcular próxima execução baseado em cron expression
 * 
 * TODO: Implementar parser completo de cron
 * Por ora, apenas adiciona 1 dia para testes
 */
function calculateNextRun(cronExpression: string, timezone: string): string {
  // Simples implementação: adicionar 1 dia
  // TODO: Usar biblioteca como cron-parser para calcular corretamente
  const now = new Date();
  const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 dia
  
  return nextRun.toISOString();
}
