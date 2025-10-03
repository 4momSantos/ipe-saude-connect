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
    const { cpf, nome, data_nascimento } = await req.json();

    if (!cpf || !nome || !data_nascimento) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'CPF, nome e data de nascimento são obrigatórios' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiToken = Deno.env.get('INFOSIMPLES_API_TOKEN');
    if (!apiToken) {
      console.error('INFOSIMPLES_API_TOKEN não configurado');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Serviço de validação temporariamente indisponível' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Limpar CPF (remover pontos e traços)
    const cleanCpf = cpf.replace(/\D/g, '');

    console.log('Consultando NIT/PIS/PASEP para CPF:', cleanCpf);

    const response = await fetch(
      `https://api.infosimples.com/api/v2/consultas/cnis/pre-inscricao?token=${apiToken}&cpf=${cleanCpf}&nome=${encodeURIComponent(nome)}&data_nascimento=${data_nascimento}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Erro na API InfoSimples:', response.status, await response.text());
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Erro ao consultar NIT/PIS/PASEP' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const result = await response.json();

    console.log('Resposta da API InfoSimples:', JSON.stringify(result));

    // Verificar se a consulta foi bem-sucedida
    if (result.code === 200 && result.data && result.data.length > 0) {
      const nitData = result.data[0];
      
      return new Response(
        JSON.stringify({
          valid: true,
          data: {
            nit: nitData.nit,
            cpf: cleanCpf,
            nome: nome,
            data_nascimento: data_nascimento,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se não encontrou dados
    return new Response(
      JSON.stringify({
        valid: false,
        message: result.code_message || 'NIT/PIS/PASEP não encontrado',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return new Response(
      JSON.stringify({
        valid: false,
        message: 'Erro interno ao processar requisição',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
