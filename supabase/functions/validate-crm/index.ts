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
    const { inscricao, uf } = await req.json();

    if (!inscricao || !uf) {
      return new Response(
        JSON.stringify({ error: 'CRM e UF são obrigatórios' }),
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

    console.log('Validando CRM:', inscricao, 'UF:', uf);

    const apiUrl = `https://api.infosimples.com/api/v2/consultas/cfm/cadastro?token=${token}&timeout=600&inscricao=${inscricao}&uf=${uf}`;
    
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
          uf: uf,
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
