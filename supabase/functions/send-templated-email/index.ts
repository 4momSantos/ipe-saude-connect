import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  context?: {
    inscricaoId?: string;
    candidatoId?: string;
    analistaId?: string;
    gestorId?: string;
    editalId?: string;
  };
}

async function resolveVariables(
  text: string,
  context: EmailRequest["context"],
  supabase: any
): Promise<string> {
  if (!context) return text;

  const variables: Record<string, any> = {};

  // Buscar dados do candidato
  if (context.candidatoId) {
    const { data: candidato } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", context.candidatoId)
      .single();
    if (candidato) variables.candidato = candidato;
  }

  // Buscar dados do analista
  if (context.analistaId) {
    const { data: analista } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", context.analistaId)
      .single();
    if (analista) variables.analista = analista;
  }

  // Buscar dados do gestor
  if (context.gestorId) {
    const { data: gestor } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", context.gestorId)
      .single();
    if (gestor) variables.gestor = gestor;
  }

  // Buscar dados da inscrição e edital
  if (context.inscricaoId) {
    const { data: inscricao } = await supabase
      .from("inscricoes_edital")
      .select(`
        *,
        edital:editais(*),
        candidato:profiles!inscricoes_edital_candidato_id_fkey(*)
      `)
      .eq("id", context.inscricaoId)
      .single();
    
    if (inscricao) {
      variables.inscricao = inscricao;
      variables.edital = inscricao.edital;
      if (!variables.candidato) variables.candidato = inscricao.candidato;
    }
  }

  // Buscar dados do edital
  if (context.editalId && !variables.edital) {
    const { data: edital } = await supabase
      .from("editais")
      .select("*")
      .eq("id", context.editalId)
      .single();
    if (edital) variables.edital = edital;
  }

  // Substituir variáveis no texto
  let resolved = text;
  for (const [key, value] of Object.entries(variables)) {
    if (value && typeof value === "object") {
      for (const [subKey, subValue] of Object.entries(value)) {
        const pattern = new RegExp(`\\{${key}\\.${subKey}\\}`, "g");
        resolved = resolved.replace(pattern, String(subValue || ""));
      }
    }
  }

  return resolved;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const emailRequest: EmailRequest = await req.json();

    // Resolver variáveis no destinatário
    let resolvedTo = emailRequest.to;
    if (resolvedTo.includes("{")) {
      resolvedTo = await resolveVariables(resolvedTo, emailRequest.context, supabase);
    }

    // Resolver variáveis no assunto e corpo
    const resolvedSubject = await resolveVariables(
      emailRequest.subject,
      emailRequest.context,
      supabase
    );
    const resolvedBody = await resolveVariables(
      emailRequest.body,
      emailRequest.context,
      supabase
    );

    // Resolver CC e BCC se existirem
    let resolvedCc = emailRequest.cc;
    let resolvedBcc = emailRequest.bcc;
    if (resolvedCc?.includes("{")) {
      resolvedCc = await resolveVariables(resolvedCc, emailRequest.context, supabase);
    }
    if (resolvedBcc?.includes("{")) {
      resolvedBcc = await resolveVariables(resolvedBcc, emailRequest.context, supabase);
    }

    // Enviar email
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const emailData: any = {
      from: "Sistema de Credenciamento <onboarding@resend.dev>",
      to: [resolvedTo],
      subject: resolvedSubject,
      html: resolvedBody.replace(/\n/g, "<br>"),
    };

    if (resolvedCc) emailData.cc = [resolvedCc];
    if (resolvedBcc) emailData.bcc = [resolvedBcc];

    const result = await resend.emails.send(emailData);

    console.log("Email sent successfully:", {
      to: resolvedTo,
      subject: resolvedSubject,
      id: result.data?.id,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.data?.id,
        to: resolvedTo 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-templated-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
