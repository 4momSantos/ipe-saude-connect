import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CFMResponse {
  code: number;
  code_message: string;
  data: Array<{
    nome: string;
    inscricao: string;
    inscricao_tipo: string;
    situacao: string;
    especialidade_lista: string[];
    ano_formatura: number;
    instituicao_graduacao: string;
  }>;
}

serve(async (req) => {
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
        JSON.stringify({ error: 'Body JSON inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Body JSON inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { inscricao, uf } = body;

    if (!inscricao || typeof inscricao !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Campo "inscricao" (CRM) é obrigatório e deve ser string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!uf || typeof uf !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Campo "uf" é obrigatório e deve ser string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar formato
    const cleanCRM = inscricao.replace(/\D/g, '');
    if (cleanCRM.length < 4 || cleanCRM.length > 10) {
      return new Response(
        JSON.stringify({ error: 'CRM deve ter entre 4 e 10 dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanUF = uf.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(cleanUF)) {
      return new Response(
        JSON.stringify({ error: 'UF deve ter exatamente 2 letras' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = Deno.env.get('INFOSIMPLES_API_TOKEN');
    if (!token) {
      console.error('INFOSIMPLES_API_TOKEN não configurado');
      return new Response(
        JSON.stringify({ error: 'Token da API não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Validando CRM:', cleanCRM, 'UF:', cleanUF);

    const apiUrl = `https://api.infosimples.com/api/v2/consultas/cfm/cadastro?token=${token}&timeout=600&inscricao=${cleanCRM}&uf=${cleanUF}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error('Erro na API do CFM:', response.status, await response.text());
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar API do CFM' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: CFMResponse = await response.json();

    if (data.code !== 200 || !data.data || data.data.length === 0) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'CRM não encontrado ou inválido' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const medico = data.data[0];

    return new Response(
      JSON.stringify({
        valid: true,
        data: {
          nome: medico.nome,
          crm: medico.inscricao,
          uf: cleanUF,
          tipo_inscricao: medico.inscricao_tipo,
          situacao: medico.situacao,
          especialidades: medico.especialidade_lista || [],
          ano_formatura: medico.ano_formatura,
          instituicao: medico.instituicao_graduacao,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao validar CRM:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
