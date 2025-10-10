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
        ocr_resultado,
        is_current,
        inscricao_id
      `)
      .eq("is_current", true)
      .eq("status", "aprovado")
      .not("ocr_resultado", "is", null);

    if (error) throw error;

    let alertas30 = 0;
    let alertas15 = 0;
    let alertas7 = 0;
    let vencidos = 0;

    for (const doc of documentos || []) {
      // Extrair data de validade do OCR
      const dataValidadeStr = doc.ocr_resultado?.dataValidade;
      if (!dataValidadeStr) continue;

      const dataValidade = new Date(dataValidadeStr);
      if (isNaN(dataValidade.getTime())) continue;

      const diasRestantes = Math.ceil((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      // Buscar candidato da inscrição
      const { data: inscricao } = await supabase
        .from('inscricoes_edital')
        .select('candidato_id, edital_id')
        .eq('id', doc.inscricao_id)
        .single();

      if (!inscricao?.candidato_id) continue;

      let deveNotificar = false;
      let mensagem = "";
      let tipo = "info";

      if (diasRestantes < 0) {
        // Vencido
        mensagem = `O documento ${doc.tipo_documento} está VENCIDO desde ${dataValidade.toLocaleDateString('pt-BR')}.`;
        tipo = "error";
        deveNotificar = true;
        vencidos++;

      } else if (diasRestantes <= 7) {
        mensagem = `O documento ${doc.tipo_documento} vence em ${diasRestantes} dias (${dataValidade.toLocaleDateString('pt-BR')}). Por favor, providencie a renovação com urgência.`;
        tipo = "error";
        deveNotificar = true;
        alertas7++;

      } else if (diasRestantes <= 15) {
        mensagem = `O documento ${doc.tipo_documento} vence em ${diasRestantes} dias (${dataValidade.toLocaleDateString('pt-BR')}). Atente-se ao prazo.`;
        tipo = "warning";
        deveNotificar = true;
        alertas15++;

      } else if (diasRestantes <= 30) {
        mensagem = `O documento ${doc.tipo_documento} vence em ${diasRestantes} dias (${dataValidade.toLocaleDateString('pt-BR')}).`;
        tipo = "info";
        deveNotificar = true;
        alertas30++;
      }

      if (deveNotificar) {
        // Criar notificação
        await supabase
          .from("app_notifications")
          .insert({
            user_id: inscricao.candidato_id,
            type: tipo,
            title: "Documento Próximo do Vencimento",
            message: mensagem,
            related_type: "documento",
            related_id: doc.id
          });

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
