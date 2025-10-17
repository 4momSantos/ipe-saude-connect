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
    // Validação rigorosa de entrada
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ valid: false, message: 'Body JSON inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ valid: false, message: 'Body JSON inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { cpf, nome, data_nascimento } = body;

    if (!cpf || typeof cpf !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, message: 'CPF é obrigatório e deve ser string' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!nome || typeof nome !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, message: 'Nome é obrigatório e deve ser string' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!data_nascimento || typeof data_nascimento !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, message: 'Data de nascimento é obrigatória' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validar formato CPF
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return new Response(
        JSON.stringify({ valid: false, message: 'CPF deve ter 11 dígitos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validar formato data (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data_nascimento)) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Data de nascimento deve estar no formato YYYY-MM-DD' }),
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

    // Verificar erros de autenticação/autorização da API
    if (result.code === 603 || result.code === 401 || result.code === 403) {
      console.error('InfoSimples token error:', result.code_message, result.errors);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Serviço de validação de NIT/PIS/PASEP temporariamente indisponível. Entre em contato com o suporte.',
          details: 'Token da API InfoSimples precisa ser renovado ou está bloqueado.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

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
