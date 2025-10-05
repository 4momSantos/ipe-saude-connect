import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

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

async function sendEmail(to: string[], subject: string, html: string, apiKey: string, cc?: string[], bcc?: string[]) {
  const emailData: any = {
    from: "Sistema de Credenciamento <onboarding@resend.dev>",
    to,
    subject,
    html,
  };
  
  if (cc && cc.length > 0) emailData.cc = cc;
  if (bcc && bcc.length > 0) emailData.bcc = bcc;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Resend API error:", error);
    throw new Error(`Failed to send email: ${response.status}`);
  }

  return await response.json();
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const emailRequest: EmailRequest = await req.json();
    
    console.log('[SEND-EMAIL] Processing email:', {
      to: emailRequest.to,
      subject: emailRequest.subject,
      hasContext: !!emailRequest.context
    });

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
    let resolvedCc: string[] | undefined;
    let resolvedBcc: string[] | undefined;
    
    if (emailRequest.cc) {
      const ccResolved = await resolveVariables(emailRequest.cc, emailRequest.context, supabase);
      resolvedCc = [ccResolved];
    }
    if (emailRequest.bcc) {
      const bccResolved = await resolveVariables(emailRequest.bcc, emailRequest.context, supabase);
      resolvedBcc = [bccResolved];
    }

    // Enviar email
    const result = await sendEmail(
      [resolvedTo],
      resolvedSubject,
      resolvedBody.replace(/\n/g, "<br>"),
      resendApiKey,
      resolvedCc,
      resolvedBcc
    );

    console.log("✓ Email sent successfully:", {
      to: resolvedTo,
      subject: resolvedSubject,
      id: result.id,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.id,
        to: resolvedTo 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SEND-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
