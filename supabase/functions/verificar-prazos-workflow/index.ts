// FASE 9.2: Edge Function - Verificar Prazos de Workflow
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[PRAZOS_WORKFLOW] Verificando prazos de workflow");

    const agora = new Date();

    // Buscar execuções de workflow em andamento
    const { data: execucoes, error } = await supabase
      .from("workflow_executions")
      .select(`
        id,
        workflow_id,
        started_at,
        metadata,
        inscricao:inscricoes_edital!workflow_execution_id (
          id,
          candidato_id,
          edital:edital_id (
            titulo
          )
        )
      `)
      .eq("status", "running");

    if (error) throw error;

    let alertas80 = 0;
    let alertas90 = 0;
    let estourados = 0;

    // SLA padrão: 15 dias (configurável por workflow no futuro)
    const SLA_DIAS = 15;
    const SLA_MS = SLA_DIAS * 24 * 60 * 60 * 1000;

    for (const exec of execucoes || []) {
      const inicio = new Date(exec.started_at);
      const tempoDecorrido = agora.getTime() - inicio.getTime();
      const percentualDecorrido = (tempoDecorrido / SLA_MS) * 100;

      let deveNotificar = false;
      let mensagem = "";
      let tipo = "info";

      const diasRestantes = Math.ceil((SLA_MS - tempoDecorrido) / (1000 * 60 * 60 * 24));

      // Verificar se tem inscrição vinculada
      const inscricao = Array.isArray(exec.inscricao) ? exec.inscricao[0] : exec.inscricao;
      const edital = inscricao?.edital ? (Array.isArray(inscricao.edital) ? inscricao.edital[0] : inscricao.edital) : null;
      const editalTitulo = edital?.titulo || 'edital não identificado';

      if (percentualDecorrido >= 100) {
        // Estourou o prazo
        mensagem = `O processo de análise da sua inscrição no edital "${editalTitulo}" ULTRAPASSOU o prazo de ${SLA_DIAS} dias.`;
        tipo = "error";
        deveNotificar = true;
        estourados++;

      } else if (percentualDecorrido >= 90) {
        mensagem = `O processo de análise da sua inscrição está próximo do prazo limite. Restam aproximadamente ${diasRestantes} dias.`;
        tipo = "warning";
        deveNotificar = true;
        alertas90++;

      } else if (percentualDecorrido >= 80) {
        mensagem = `O processo de análise da sua inscrição está em andamento. Prazo estimado: ${diasRestantes} dias.`;
        tipo = "info";
        deveNotificar = true;
        alertas80++;
      }

      if (deveNotificar && inscricao?.candidato_id) {
        // Criar notificação para candidato
        await supabase
          .from("app_notifications")
          .insert({
            user_id: inscricao.candidato_id,
            type: tipo,
            title: "Atualização do Processo",
            message: mensagem,
            related_type: "workflow",
            related_id: exec.id
          });

        console.log(`[PRAZOS_WORKFLOW] Notificação enviada para execução ${exec.id}`);
      }

      // Se estourou, notificar gestores também
      if (percentualDecorrido >= 100) {
        // Buscar gestores
        const { data: gestores } = await supabase.rpc("get_gestores");

        for (const gestor of gestores || []) {
          await supabase
            .from("app_notifications")
            .insert({
              user_id: gestor.id,
              type: "error",
              title: "Prazo de Workflow Estourado",
              message: `O workflow da inscrição no edital "${editalTitulo}" ultrapassou o SLA de ${SLA_DIAS} dias.`,
              related_type: "workflow",
              related_id: exec.id
            });
        }
      }
    }

    const resultado = {
      success: true,
      totalVerificados: execucoes?.length || 0,
      alertas80Porcento: alertas80,
      alertas90Porcento: alertas90,
      prazosEstourados: estourados,
      dataVerificacao: new Date().toISOString()
    };

    console.log("[PRAZOS_WORKFLOW] Resultado:", resultado);

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[PRAZOS_WORKFLOW] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
