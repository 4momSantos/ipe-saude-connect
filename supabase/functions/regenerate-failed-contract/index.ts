import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegenerateContractRequest {
  contrato_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { contrato_id }: RegenerateContractRequest = await req.json();

    if (!contrato_id) {
      return new Response(
        JSON.stringify({ error: 'contrato_id é obrigatório' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('[REGENERATE] Iniciando regeneração do contrato:', contrato_id);

    // 1. Buscar dados do contrato original
    const { data: contratoOriginal, error: contratoError } = await supabaseClient
      .from('contratos')
      .select('inscricao_id, numero_contrato')
      .eq('id', contrato_id)
      .single();

    if (contratoError || !contratoOriginal) {
      console.error('[REGENERATE] Erro ao buscar contrato:', contratoError);
      return new Response(
        JSON.stringify({ error: 'Contrato não encontrado' }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('[REGENERATE] Contrato encontrado:', contratoOriginal.numero_contrato);

    // 2. Deletar signature_request vinculado (se existir)
    const { error: deleteSignatureError } = await supabaseClient
      .from('signature_requests')
      .delete()
      .eq('contrato_id', contrato_id);

    if (deleteSignatureError) {
      console.warn('[REGENERATE] Erro ao deletar signature_request:', deleteSignatureError);
    } else {
      console.log('[REGENERATE] Signature request deletado (se existia)');
    }

    // 3. Deletar contrato órfão
    const { error: deleteContratoError } = await supabaseClient
      .from('contratos')
      .delete()
      .eq('id', contrato_id);

    if (deleteContratoError) {
      console.error('[REGENERATE] Erro ao deletar contrato:', deleteContratoError);
      return new Response(
        JSON.stringify({ error: 'Erro ao deletar contrato antigo' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('[REGENERATE] Contrato órfão deletado com sucesso');

    // 4. Invocar gerar-contrato-assinatura para recriar
    const { data: novoContrato, error: gerarContratoError } = await supabaseClient.functions.invoke(
      'gerar-contrato-assinatura',
      {
        body: { 
          inscricao_id: contratoOriginal.inscricao_id 
        }
      }
    );

    if (gerarContratoError) {
      console.error('[REGENERATE] Erro ao gerar novo contrato:', gerarContratoError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao gerar novo contrato', 
          details: gerarContratoError 
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('[REGENERATE] Novo contrato gerado com sucesso:', novoContrato);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Contrato regenerado com sucesso',
        contrato_antigo_numero: contratoOriginal.numero_contrato,
        contrato_novo: novoContrato
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('[REGENERATE] Erro fatal:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
});
