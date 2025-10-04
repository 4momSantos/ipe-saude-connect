import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignafyCreateDocumentRequest {
  name: string;
  signers: Array<{
    name: string;
    email: string;
    order: number;
  }>;
  document_url?: string;
  message?: string;
}

interface AssignafyResponse {
  status: number;
  message: string;
  data: {
    document_id?: string;
    signature_url?: string;
    [key: string]: any;
  };
}

async function sendEmail(to: string[], subject: string, html: string, apiKey: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Sistema de Credenciamento <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Resend API error:", error);
    throw new Error(`Failed to send email: ${response.status}`);
  }

  return await response.json();
}

async function createAssignafyDocument(
  apiKey: string,
  documentData: AssignafyCreateDocumentRequest
): Promise<AssignafyResponse> {
  const response = await fetch("https://api.assinafy.com.br/v1/documents", {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(documentData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Assinafy API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { signatureRequestId } = await req.json();

    // Buscar dados da signature request
    const { data: signatureRequest, error: requestError } = await supabase
      .from("signature_requests")
      .select(`
        *,
        workflow_execution:workflow_executions (
          id,
          started_by,
          workflow:workflows (name)
        ),
        step_execution:workflow_step_executions (
          id,
          node_id
        )
      `)
      .eq("id", signatureRequestId)
      .single();

    if (requestError || !signatureRequest) {
      throw new Error("Signature request not found");
    }

    // Buscar dados da inscrição relacionada
    const { data: execution } = await supabase
      .from("workflow_executions")
      .select(`
        id,
        inscricao:inscricoes_edital (
          id,
          candidato_id,
          edital:editais (id, titulo, numero),
          candidato:profiles!inscricoes_edital_candidato_id_fkey (id, nome, email)
        )
      `)
      .eq("id", signatureRequest.workflow_execution_id)
      .single();

    const inscricaoData = execution?.inscricao as any;
    const candidato = inscricaoData?.candidato;

    // Integração com Assinafy
    if (signatureRequest.provider === "assinafy") {
      const assifafyApiKey = Deno.env.get("ASSINAFY_API_KEY");
      if (!assifafyApiKey) {
        throw new Error("ASSINAFY_API_KEY not configured");
      }

      try {
        const assifafyResponse = await createAssignafyDocument(assifafyApiKey, {
          name: `Documento - ${inscricaoData?.edital?.titulo || "Credenciamento"}`,
          signers: signatureRequest.signers,
          document_url: signatureRequest.document_url,
          message: `Solicitação de assinatura para o edital ${inscricaoData?.edital?.numero || "N/A"}`,
        });

        console.log("Assinafy document created:", assifafyResponse.data.document_id);

        // Atualizar signature request com ID externo da Assinafy
        await supabase
          .from("signature_requests")
          .update({
            external_id: assifafyResponse.data.document_id,
            metadata: {
              ...signatureRequest.metadata,
              assinafy_data: assifafyResponse.data,
              sent_at: new Date().toISOString(),
            },
          })
          .eq("id", signatureRequestId);
      } catch (error) {
        console.error("Assinafy integration error:", error);
        await supabase
          .from("signature_requests")
          .update({
            status: "failed",
            metadata: {
              ...signatureRequest.metadata,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          })
          .eq("id", signatureRequestId);
        throw error;
      }
    }

    // Enviar email para o candidato
    if (candidato?.email) {
      await sendEmail(
        [candidato.email],
        "Documento para Assinatura",
        `
          <h2>Olá ${candidato.nome || "Candidato"},</h2>
          <p>Um documento está aguardando sua assinatura.</p>
          <p><strong>Edital:</strong> ${inscricaoData?.edital?.titulo || "N/A"}</p>
          <p><strong>Provedor:</strong> ${signatureRequest.provider === "assinafy" ? "Assinafy" : signatureRequest.provider}</p>
          <p>Por favor, acesse o sistema para assinar o documento.</p>
          <p>Atenciosamente,<br/>Equipe de Credenciamento</p>
        `,
        resendApiKey
      );

      console.log(`Email enviado para candidato: ${candidato.email}`);
    }

    // Buscar analistas para notificar
    const { data: analistas } = await supabase
      .from("user_roles")
      .select("user_id, profiles:profiles!user_roles_user_id_fkey(id, nome, email)")
      .eq("role", "analista");

    // Criar notificações in-app para analistas
    if (analistas && analistas.length > 0) {
      const notifications = analistas.map(analista => ({
        user_id: analista.user_id,
        title: "Nova Solicitação de Assinatura",
        message: `Documento aguardando assinatura de ${candidato?.nome || "candidato"} via ${signatureRequest.provider}`,
        type: "signature",
        related_id: signatureRequestId,
        related_type: "signature_request",
      }));

      await supabase.from("app_notifications").insert(notifications);
      console.log(`Notificações criadas para ${analistas.length} analistas`);

      // Enviar emails para analistas
      for (const analista of analistas) {
        const analistaProfile = analista.profiles as any;
        if (analistaProfile?.email) {
          await sendEmail(
            [analistaProfile.email],
            "Nova Solicitação de Assinatura",
            `
              <h2>Olá ${analistaProfile.nome || "Analista"},</h2>
              <p>Uma nova solicitação de assinatura foi criada.</p>
              <p><strong>Candidato:</strong> ${candidato?.nome || "N/A"}</p>
              <p><strong>Edital:</strong> ${inscricaoData?.edital?.titulo || "N/A"}</p>
              <p><strong>Provedor:</strong> ${signatureRequest.provider === "assinafy" ? "Assinafy" : signatureRequest.provider}</p>
              <p>Acesse o sistema para acompanhar o processo.</p>
              <p>Atenciosamente,<br/>Sistema de Credenciamento</p>
            `,
            resendApiKey
          );
        }
      }
    }

    // Atualizar status para enviado
    await supabase
      .from("signature_requests")
      .update({ 
        status: "sent",
        metadata: {
          ...signatureRequest.metadata,
          sent_at: new Date().toISOString(),
        }
      })
      .eq("id", signatureRequestId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Emails e notificações enviados com sucesso",
        provider: signatureRequest.provider,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-signature-request:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
