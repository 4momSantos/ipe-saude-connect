import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();
    
    console.log('[validate-cnpj] Validando CNPJ:', cnpj);

    if (!cnpj) {
      return new Response(
        JSON.stringify({ valid: false, message: 'CNPJ não informado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Remove formatação do CNPJ
    const cleanCNPJ = cnpj.replace(/\D/g, '');

    if (cleanCNPJ.length !== 14) {
      return new Response(
        JSON.stringify({ valid: false, message: 'CNPJ deve ter 14 dígitos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Buscar dados do CNPJ na BrasilAPI
    console.log('[validate-cnpj] Consultando BrasilAPI para CNPJ:', cleanCNPJ);
    
    const brasilApiResponse = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!brasilApiResponse.ok) {
      console.error('[validate-cnpj] Erro na BrasilAPI:', brasilApiResponse.status);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'CNPJ não encontrado na Receita Federal' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const cnpjData = await brasilApiResponse.json();
    console.log('[validate-cnpj] Dados recebidos da BrasilAPI');

    // Validar situação cadastral
    const isSituacaoAtiva = cnpjData.descricao_situacao_cadastral?.toLowerCase().includes('ativa');

    return new Response(
      JSON.stringify({
        valid: true,
        data: {
          cnpj: cnpjData.cnpj,
          razao_social: cnpjData.razao_social,
          nome_fantasia: cnpjData.nome_fantasia,
          situacao_cadastral: cnpjData.descricao_situacao_cadastral,
          data_inicio_atividade: cnpjData.data_inicio_atividade,
          porte: cnpjData.porte,
          natureza_juridica: cnpjData.natureza_juridica,
          endereco: {
            logradouro: cnpjData.logradouro,
            numero: cnpjData.numero,
            complemento: cnpjData.complemento,
            bairro: cnpjData.bairro,
            cidade: cnpjData.municipio,
            estado: cnpjData.uf,
            cep: cnpjData.cep,
          },
          cnae_fiscal: cnpjData.cnae_fiscal_descricao,
          situacao_ativa: isSituacaoAtiva,
        },
        message: 'CNPJ validado com sucesso',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[validate-cnpj] Erro:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        message: error instanceof Error ? error.message : 'Erro ao validar CNPJ' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
