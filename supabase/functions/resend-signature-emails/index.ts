import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendEmailsRequest {
  contratoIds: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { contratoIds }: ResendEmailsRequest = await req.json();

    if (!contratoIds || contratoIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'IDs de contratos não fornecidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[RESEND_EMAILS] Processando ${contratoIds.length} contratos`);

    // Buscar contratos com dados de inscrição
    const { data: contratos, error: fetchError } = await supabase
      .from('contratos')
      .select(`
        *,
        inscricao:inscricoes_edital(
          candidato_id,
          dados_inscricao,
          candidato:profiles(nome, email)
        )
      `)
      .eq('status', 'pendente_assinatura')
      .in('id', contratoIds);

    if (fetchError) {
      throw new Error(`Erro ao buscar contratos: ${fetchError.message}`);
    }

    const results = [];
    
    for (const contrato of contratos || []) {
      try {
        // Buscar ou criar signature_request
        let { data: signatureRequest, error: signatureError } = await supabase
          .from('signature_requests')
          .select('*')
          .eq('contrato_id', contrato.id)
          .maybeSingle();

        // Se não existe signature request, criar
        if (!signatureRequest) {
          const { data: newSignature, error: createError } = await supabase
            .from('signature_requests')
            .insert({
              contrato_id: contrato.id,
              inscricao_id: contrato.inscricao_id,
              status: 'pending',
              signers: [
                {
                  email: contrato.inscricao.candidato.email,
                  name: contrato.inscricao.candidato.nome,
                  role: 'Credenciado'
                }
              ]
            })
            .select()
            .single();

          if (createError) {
            console.error(`[RESEND_EMAILS] Erro ao criar signature request para contrato ${contrato.id}:`, createError);
            results.push({
              contrato_id: contrato.id,
              success: false,
              error: createError.message
            });
            continue;
          }

          signatureRequest = newSignature;
        }

        // Invocar send-signature-request
        const { error: sendError } = await supabase.functions.invoke('send-signature-request', {
          body: { signatureRequestId: signatureRequest.id }
        });

        if (sendError) {
          console.error(`[RESEND_EMAILS] Erro ao enviar e-mail para contrato ${contrato.id}:`, sendError);
          results.push({
            contrato_id: contrato.id,
            success: false,
            error: sendError.message
          });
        } else {
          console.log(`[RESEND_EMAILS] E-mail enviado com sucesso para ${contrato.inscricao.candidato.email}`);
          results.push({
            contrato_id: contrato.id,
            success: true,
            email: contrato.inscricao.candidato.email
          });
        }

      } catch (error) {
        console.error(`[RESEND_EMAILS] Erro ao processar contrato ${contrato.id}:`, error);
        results.push({
          contrato_id: contrato.id,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        total_processed: results.length,
        total_success: successCount,
        total_errors: errorCount,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[RESEND_EMAILS] Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
