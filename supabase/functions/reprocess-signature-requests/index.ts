import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReprocessResult {
  success: boolean;
  contrato_id: string;
  numero_contrato: string;
  inscricao_id: string;
  signature_request_id?: string;
  error?: string;
}

interface ReprocessReport {
  total_found: number;
  total_processed: number;
  total_success: number;
  total_failed: number;
  results: ReprocessResult[];
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'reprocess_signature_requests_started'
    }));

    // 1. Buscar contratos pendentes sem signature_request
    const { data: contratosPendentes, error: fetchError } = await supabase
      .from('contratos')
      .select(`
        id,
        inscricao_id,
        numero_contrato,
        dados_contrato,
        inscricao:inscricoes_edital (
          id,
          dados_inscricao
        )
      `)
      .eq('status', 'pendente_assinatura')
      .is('signature_requests.id', null);

    if (fetchError) {
      throw new Error(`Erro ao buscar contratos: ${fetchError.message}`);
    }

    if (!contratosPendentes || contratosPendentes.length === 0) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'no_contracts_to_reprocess'
      }));

      return new Response(
        JSON.stringify({
          total_found: 0,
          total_processed: 0,
          total_success: 0,
          total_failed: 0,
          results: [],
          message: 'Nenhum contrato pendente encontrado sem signature request',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'contracts_found',
      count: contratosPendentes.length
    }));

    const results: ReprocessResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    // 2. Processar cada contrato
    for (const contrato of contratosPendentes) {
      try {
        const inscricaoData = contrato.inscricao as any;
        const dadosInscricao = inscricaoData?.dados_inscricao || {};
        const dadosPessoais = dadosInscricao.dadosPessoais || dadosInscricao.dados_pessoais || {};

        const candidatoNome = dadosPessoais.nome_completo || dadosPessoais.nome || 'Candidato';
        const candidatoEmail = dadosPessoais.email || dadosInscricao.endereco_correspondencia?.email;
        const candidatoCPF = dadosPessoais.cpf;

        if (!candidatoEmail) {
          throw new Error('Email do candidato não encontrado');
        }

        // 3. Criar signature_request
        const { data: signatureRequest, error: insertError } = await supabase
          .from('signature_requests')
          .insert({
            provider: 'assinafy',
            status: 'pending',
            contrato_id: contrato.id,
            inscricao_id: contrato.inscricao_id,
            workflow_execution_id: null,
            signers: [
              {
                name: candidatoNome,
                email: candidatoEmail,
                cpf: candidatoCPF
              }
            ],
            metadata: {
              contrato_id: contrato.id,
              inscricao_id: contrato.inscricao_id,
              numero_contrato: contrato.numero_contrato,
              document_html: contrato.dados_contrato?.html || '',
              reprocessed: true,
              reprocessed_at: new Date().toISOString()
            },
            step_execution_id: null
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Erro ao criar signature request: ${insertError.message}`);
        }

        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'signature_request_created',
          signature_request_id: signatureRequest.id,
          contrato_id: contrato.id
        }));

        // 4. Invocar send-signature-request
        const { data: sendResult, error: sendError } = await supabase.functions.invoke(
          'send-signature-request',
          {
            body: {
              signatureRequestId: signatureRequest.id
            }
          }
        );

        if (sendError) {
          throw new Error(`Erro ao enviar signature request: ${sendError.message}`);
        }

        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'signature_request_sent',
          signature_request_id: signatureRequest.id,
          contrato_id: contrato.id
        }));

        results.push({
          success: true,
          contrato_id: contrato.id,
          numero_contrato: contrato.numero_contrato,
          inscricao_id: contrato.inscricao_id,
          signature_request_id: signatureRequest.id
        });

        successCount++;

      } catch (error: any) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'reprocess_contract_failed',
          contrato_id: contrato.id,
          error: error.message
        }));

        results.push({
          success: false,
          contrato_id: contrato.id,
          numero_contrato: contrato.numero_contrato,
          inscricao_id: contrato.inscricao_id,
          error: error.message
        });

        failedCount++;
      }
    }

    const report: ReprocessReport = {
      total_found: contratosPendentes.length,
      total_processed: contratosPendentes.length,
      total_success: successCount,
      total_failed: failedCount,
      results,
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'reprocess_signature_requests_completed',
      report
    }));

    return new Response(
      JSON.stringify(report),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'reprocess_signature_requests_error',
      error: error.message,
      stack: error.stack
    }));

    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
