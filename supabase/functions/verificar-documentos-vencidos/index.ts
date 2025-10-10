// FASE 8.1: Edge Function - Verificar Documentos Vencidos
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

    console.log("[DOCS_VENCIDOS] Verificando documentos vencidos");

    const hoje = new Date();
    const dataLimite30 = new Date(hoje);
    dataLimite30.setDate(hoje.getDate() + 30);

    const dataLimite15 = new Date(hoje);
    dataLimite15.setDate(hoje.getDate() + 15);

    const dataLimite7 = new Date(hoje);
    dataLimite7.setDate(hoje.getDate() + 7);

    // Buscar documentos próximos do vencimento
    const { data: documentos, error } = await supabase
      .from("inscricao_documentos")
      .select(`
        id,
        tipo_documento,
        data_validade,
        prazo_alerta_dias,
        alerta_enviado,
        vencimento_notificado,
        is_current,
        inscricao:inscricao_id (
          id,
          candidato_id,
          edital:edital_id (
            titulo
          )
        )
      `)
      .eq("is_current", true)
      .eq("status", "aprovado")
      .not("data_validade", "is", null)
      .lte("data_validade", dataLimite30.toISOString().split('T')[0]);

    if (error) throw error;

    let alertas30 = 0;
    let alertas15 = 0;
    let alertas7 = 0;
    let vencidos = 0;

    for (const doc of documentos || []) {
      const dataValidade = new Date(doc.data_validade);
      const diasRestantes = Math.ceil((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      let deveNotificar = false;
      let mensagem = "";
      let tipo = "info";

      if (diasRestantes < 0 && !doc.vencimento_notificado) {
        // Vencido
        mensagem = `O documento ${doc.tipo_documento} está VENCIDO desde ${dataValidade.toLocaleDateString('pt-BR')}.`;
        tipo = "error";
        deveNotificar = true;
        vencidos++;

        await supabase
          .from("inscricao_documentos")
          .update({ vencimento_notificado: true })
          .eq("id", doc.id);

      } else if (diasRestantes <= 7 && !doc.alerta_enviado) {
        mensagem = `O documento ${doc.tipo_documento} vence em ${diasRestantes} dias (${dataValidade.toLocaleDateString('pt-BR')}). Por favor, providencie a renovação com urgência.`;
        tipo = "error";
        deveNotificar = true;
        alertas7++;

      } else if (diasRestantes <= 15 && !doc.alerta_enviado) {
        mensagem = `O documento ${doc.tipo_documento} vence em ${diasRestantes} dias (${dataValidade.toLocaleDateString('pt-BR')}). Atente-se ao prazo.`;
        tipo = "warning";
        deveNotificar = true;
        alertas15++;

      } else if (diasRestantes <= 30 && !doc.alerta_enviado) {
        mensagem = `O documento ${doc.tipo_documento} vence em ${diasRestantes} dias (${dataValidade.toLocaleDateString('pt-BR')}).`;
        tipo = "info";
        deveNotificar = true;
        alertas30++;
      }

      if (deveNotificar && doc.inscricao?.candidato_id) {
        // Criar notificação
        await supabase
          .from("app_notifications")
          .insert({
            user_id: doc.inscricao.candidato_id,
            type: tipo,
            title: "Documento Próximo do Vencimento",
            message: mensagem,
            related_type: "documento",
            related_id: doc.id
          });

        // Marcar alerta como enviado
        if (diasRestantes >= 0) {
          await supabase
            .from("inscricao_documentos")
            .update({ alerta_enviado: true })
            .eq("id", doc.id);
        }

        console.log(`[DOCS_VENCIDOS] Notificação enviada para documento ${doc.id}`);
      }
    }

    const resultado = {
      success: true,
      totalVerificados: documentos?.length || 0,
      alertas30Dias: alertas30,
      alertas15Dias: alertas15,
      alertas7Dias: alertas7,
      vencidos: vencidos,
      dataVerificacao: new Date().toISOString()
    };

    console.log("[DOCS_VENCIDOS] Resultado:", resultado);

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[DOCS_VENCIDOS] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
