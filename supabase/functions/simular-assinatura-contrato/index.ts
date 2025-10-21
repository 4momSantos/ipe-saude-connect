/**
 * Edge Function: simular-assinatura-contrato
 * 
 * APENAS PARA DEBUG/DESENVOLVIMENTO
 * Permite "forçar" assinatura de contratos sem passar pelo Assinafy.
 * 
 * Uso:
 * POST /functions/v1/simular-assinatura-contrato
 * Body: { contrato_id: "uuid", force: true }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SimularAssinaturaRequest {
  contrato_id: string;
  force?: boolean;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let contrato_id: string | undefined;

  try {
    const requestBody: SimularAssinaturaRequest = await req.json();
    contrato_id = requestBody.contrato_id;
    const force = requestBody.force;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'simular_assinatura_start',
      method: req.method,
      contrato_id
    }));

    if (!contrato_id) {
      throw new Error('contrato_id é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar contrato
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('*, inscricoes_edital!inner(candidato_id, dados_inscricao)')
      .eq('id', contrato_id)
      .single();

    if (contratoError || !contrato) {
      throw new Error(`Contrato não encontrado: ${contratoError?.message}`);
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'contrato_encontrado',
      contrato_id,
      numero_contrato: contrato.numero_contrato,
      status_atual: contrato.status
    }));

    // Verificar se já está assinado
    if (contrato.status === 'assinado' && !force) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Contrato já está assinado. Use force=true para forçar.',
        contrato: {
          id: contrato.id,
          numero_contrato: contrato.numero_contrato,
          status: contrato.status
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Atualizar contrato para 'assinado'
    const { data: contratoAtualizado, error: updateError } = await supabase
      .from('contratos')
      .update({
        status: 'assinado',
        assinado_em: new Date().toISOString().split('T')[0], // Apenas data YYYY-MM-DD
        // updated_at será atualizado automaticamente pelo banco
      })
      .eq('id', contrato_id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Erro ao atualizar contrato: ${updateError.message}`);
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'contrato_assinado',
      contrato_id,
      numero_contrato: contratoAtualizado.numero_contrato,
      trigger_ira_criar_credenciado: true
    }));

    // Aguardar 1s para trigger processar
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verificar se credenciado foi criado
    const { data: credenciado } = await supabase
      .from('credenciados')
      .select('id, nome, status')
      .eq('inscricao_id', contrato.inscricao_id)
      .maybeSingle();

    const elapsedTime = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      message: 'Contrato assinado com sucesso. Credenciado será criado automaticamente pelo trigger.',
      contrato: {
        id: contratoAtualizado.id,
        numero_contrato: contratoAtualizado.numero_contrato,
        status: contratoAtualizado.status,
        assinado_em: contratoAtualizado.assinado_em
      },
      credenciado: credenciado ? {
        id: credenciado.id,
        nome: credenciado.nome,
        status: credenciado.status
      } : null,
      elapsed_ms: elapsedTime
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'error',
      error: error.message,
      error_hint: error.hint,
      error_details: error.details,
      stack: error.stack,
      contrato_id: contrato_id || 'unknown'
    }));

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
