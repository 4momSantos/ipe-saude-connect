/**
 * Edge Function: processar-contratos-orfaos
 * 
 * Processa inscrições aprovadas que não possuem contrato gerado.
 * Identifica casos onde o trigger falhou e cria os contratos manualmente.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrphanContract {
  inscricao_id: string;
  analise_id: string;
  candidato_nome: string;
  edital_numero: string;
  analisado_em: string;
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

    console.log(JSON.stringify({
      level: "info",
      action: "start_orphan_processing",
      timestamp: new Date().toISOString()
    }));

    // Buscar inscrições aprovadas sem contrato
    const { data: orphans, error: fetchError } = await supabase
      .from("analises")
      .select(`
        id,
        inscricao_id,
        analisado_em,
        inscricao:inscricoes_edital(
          candidato:profiles(nome),
          edital:editais(numero_edital)
        )
      `)
      .eq("status", "aprovado")
      .is("inscricao.contratos.id", null)
      .order("analisado_em", { ascending: false })
      .limit(50);

    if (fetchError) {
      throw new Error(`Erro ao buscar órfãos: ${fetchError.message}`);
    }

    if (!orphans || orphans.length === 0) {
      console.log(JSON.stringify({
        level: "info",
        action: "no_orphans_found"
      }));

      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum contrato órfão encontrado",
          processed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(JSON.stringify({
      level: "info",
      action: "orphans_found",
      count: orphans.length
    }));

    const results = [];

    // Processar cada órfão
    for (const orphan of orphans) {
      try {
        // Gerar número de contrato único
        const numeroContrato = `CONT-${new Date().getFullYear()}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;

        // Criar contrato
        const { data: contrato, error: contratoError } = await supabase
          .from("contratos")
          .insert({
            inscricao_id: orphan.inscricao_id,
            analise_id: orphan.id,
            numero_contrato: numeroContrato,
            status: "pendente_assinatura",
            tipo: "credenciamento",
            dados_contrato: {
              tipo: "credenciamento",
              data_geracao: new Date().toISOString(),
              gerado_via: "processamento_orfaos",
              analise_id: orphan.id
            }
          })
          .select()
          .single();

        if (contratoError) {
          console.error(JSON.stringify({
            level: "error",
            action: "contrato_creation_failed",
            inscricao_id: orphan.inscricao_id,
            error: contratoError.message
          }));

          results.push({
            inscricao_id: orphan.inscricao_id,
            success: false,
            error: contratoError.message
          });
          continue;
        }

        console.log(JSON.stringify({
          level: "info",
          action: "contrato_created",
          inscricao_id: orphan.inscricao_id,
          contrato_id: contrato.id,
          numero_contrato: numeroContrato
        }));

        // Invocar função de geração de contrato para gerar o PDF
        const { error: generateError } = await supabase.functions.invoke(
          "gerar-contrato-assinatura",
          {
            body: {
              inscricao_id: orphan.inscricao_id,
              contrato_id: contrato.id
            }
          }
        );

        if (generateError) {
          console.error(JSON.stringify({
            level: "error",
            action: "pdf_generation_failed",
            contrato_id: contrato.id,
            error: generateError.message
          }));

          results.push({
            inscricao_id: orphan.inscricao_id,
            contrato_id: contrato.id,
            numero_contrato: numeroContrato,
            success: false,
            error: `Contrato criado mas PDF falhou: ${generateError.message}`
          });
          continue;
        }

        results.push({
          inscricao_id: orphan.inscricao_id,
          contrato_id: contrato.id,
          numero_contrato: numeroContrato,
          success: true
        });

      } catch (error) {
        console.error(JSON.stringify({
          level: "error",
          action: "orphan_processing_error",
          inscricao_id: orphan.inscricao_id,
          error: error instanceof Error ? error.message : "Unknown"
        }));

        results.push({
          inscricao_id: orphan.inscricao_id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown"
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log(JSON.stringify({
      level: "info",
      action: "orphan_processing_complete",
      total: orphans.length,
      success: successCount,
      errors: errorCount
    }));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processamento concluído: ${successCount} sucesso, ${errorCount} erros`,
        total_found: orphans.length,
        processed: successCount,
        errors: errorCount,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      action: "fatal_error",
      error: error instanceof Error ? error.message : "Unknown"
    }));

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});