import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const ALERT_THRESHOLD_DAYS = 5;
const EXPIRY_THRESHOLD_DAYS = 7;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[CHECK_DEADLINES] Iniciando verificação de prazos de assinatura');

    const now = new Date();
    const alertDate = new Date(now.getTime() - ALERT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
    const expiryDate = new Date(now.getTime() - EXPIRY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    // Buscar assinaturas pendentes há mais de 5 dias (alerta)
    const { data: alertSignatures, error: alertError } = await supabase
      .from('signature_requests')
      .select(`
        *,
        workflow_executions!workflow_execution_id(
          id,
          started_by,
          context
        )
      `)
      .eq('status', 'sent')
      .lt('created_at', alertDate.toISOString())
      .gte('created_at', expiryDate.toISOString());

    if (alertError) throw alertError;

    console.log(`[CHECK_DEADLINES] Encontradas ${alertSignatures?.length || 0} assinaturas para alerta`);

    // Criar notificações de alerta
    let alertsCreated = 0;
    for (const signature of alertSignatures || []) {
      const workflow = signature.workflow_executions;
      if (!workflow?.started_by) continue;

      const daysPending = Math.floor(
        (now.getTime() - new Date(signature.created_at).getTime()) / (24 * 60 * 60 * 1000)
      );

      const { error: notificationError } = await supabase
        .from('app_notifications')
        .insert({
          user_id: workflow.started_by,
          type: 'warning',
          title: 'Assinatura Próxima de Expirar',
          message: `Documento enviado há ${daysPending} dias ainda não foi assinado. Prazo máximo: 7 dias.`,
          related_type: 'signature',
          related_id: signature.id
        });

      if (!notificationError) {
        alertsCreated++;
        console.log(`[CHECK_DEADLINES] Alerta criado para signature ${signature.id}`);
      }
    }

    // Buscar assinaturas expiradas (>7 dias)
    const { data: expiredSignatures, error: expiredError } = await supabase
      .from('signature_requests')
      .select('*')
      .eq('status', 'sent')
      .lt('created_at', expiryDate.toISOString());

    if (expiredError) throw expiredError;

    console.log(`[CHECK_DEADLINES] Encontradas ${expiredSignatures?.length || 0} assinaturas expiradas`);

    // Marcar como expiradas
    let expiredCount = 0;
    for (const signature of expiredSignatures || []) {
      const { error: updateError } = await supabase
        .from('signature_requests')
        .update({
          status: 'expired',
          external_status: 'deadline_exceeded',
          updated_at: now.toISOString()
        })
        .eq('id', signature.id);

      if (!updateError) {
        expiredCount++;
        console.log(`[CHECK_DEADLINES] Assinatura ${signature.id} marcada como expirada`);
      }
    }

    const result = {
      success: true,
      alertsCreated,
      expiredCount,
      timestamp: now.toISOString()
    };

    console.log('[CHECK_DEADLINES] Verificação concluída:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('[CHECK_DEADLINES] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
