import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentoCredenciado {
  id: string;
  credenciado_id: string;
  tipo_documento: string;
  data_vencimento: string;
  status: string;
  dias_alerta: number;
  credenciados: {
    nome: string;
    email: string;
    inscricao_id: string;
    inscricoes_edital: {
      candidato_id: string;
    };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[DOCS_CRED] Iniciando verificação de documentos");

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Buscar documentos ativos/vencendo
    const { data: documentos, error } = await supabase
      .from("documentos_credenciados")
      .select(`
        id,
        credenciado_id,
        tipo_documento,
        data_vencimento,
        status,
        dias_alerta,
        credenciados!inner (
          nome,
          email,
          inscricao_id,
          inscricoes_edital!inner (candidato_id)
        )
      `)
      .eq("is_current", true)
      .in("status", ["ativo", "vencendo"])
      .not("data_vencimento", "is", null);

    if (error) throw error;

    let atualizados = 0;
    let notificacoes = 0;

    for (const doc of (documentos || []) as DocumentoCredenciado[]) {
      const dataVenc = new Date(doc.data_vencimento);
      dataVenc.setHours(0, 0, 0, 0);

      const diasRestantes = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      let novoStatus = doc.status;
      let deveNotificar = false;
      let nivelAlerta: "info" | "warning" | "error" = "info";
      let mensagem = "";

      if (diasRestantes < 0) {
        novoStatus = "vencido";
        nivelAlerta = "error";
        mensagem = `O documento ${doc.tipo_documento} está VENCIDO desde ${dataVenc.toLocaleDateString('pt-BR')}. Providencie a renovação imediatamente.`;
        deveNotificar = true;

      } else if (diasRestantes <= 7) {
        novoStatus = "vencendo";
        nivelAlerta = "error";
        mensagem = `URGENTE: ${doc.tipo_documento} vence em ${diasRestantes} dias (${dataVenc.toLocaleDateString('pt-BR')}). Renove com urgência!`;
        deveNotificar = diasRestantes <= 7 && diasRestantes >= 0;

      } else if (diasRestantes <= 15) {
        novoStatus = "vencendo";
        nivelAlerta = "warning";
        mensagem = `Atenção: ${doc.tipo_documento} vence em ${diasRestantes} dias (${dataVenc.toLocaleDateString('pt-BR')}). Providencie a renovação.`;
        deveNotificar = diasRestantes === 15;

      } else if (diasRestantes <= doc.dias_alerta) {
        novoStatus = "vencendo";
        nivelAlerta = "info";
        mensagem = `Lembrete: ${doc.tipo_documento} vence em ${diasRestantes} dias (${dataVenc.toLocaleDateString('pt-BR')}).`;
        deveNotificar = diasRestantes === doc.dias_alerta;

      } else {
        novoStatus = "ativo";
      }

      // Atualizar status se mudou
      if (novoStatus !== doc.status) {
        await supabase
          .from("documentos_credenciados")
          .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
          .eq("id", doc.id);

        atualizados++;
        console.log(`[DOCS_CRED] Status atualizado: ${doc.id} → ${novoStatus}`);
      }

      // Enviar notificação
      if (deveNotificar && doc.credenciados?.inscricoes_edital?.candidato_id) {
        await supabase.from("app_notifications").insert({
          user_id: doc.credenciados.inscricoes_edital.candidato_id,
          type: nivelAlerta,
          title: "Documento Próximo do Vencimento",
          message: mensagem,
          related_type: "documento_credenciado",
          related_id: doc.id
        });

        notificacoes++;
        console.log(`[DOCS_CRED] Notificação enviada para ${doc.credenciado_id}`);
      }
    }

    const resultado = {
      success: true,
      totalVerificados: documentos?.length || 0,
      statusAtualizados: atualizados,
      notificacoesEnviadas: notificacoes,
      timestamp: new Date().toISOString()
    };

    console.log("[DOCS_CRED] Resultado:", resultado);

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[DOCS_CRED] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
