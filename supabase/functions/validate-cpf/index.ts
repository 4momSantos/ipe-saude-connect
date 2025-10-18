import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Converte data do formato brasileiro DD/MM/YYYY para ISO YYYY-MM-DD
 */
function convertBRDateToISO(brDate: string): string {
  const [day, month, year] = brDate.split('/');
  return `${year}-${month}-${day}`;
}

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

    const { cpf, birthdate } = body;

    if (!cpf || typeof cpf !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, message: 'CPF é obrigatório e deve ser string' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!birthdate || typeof birthdate !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, message: 'Data de nascimento é obrigatória' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validar formato CPF
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) {
      return new Response(
        JSON.stringify({ valid: false, message: 'CPF deve ter 11 dígitos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validar formato da data (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
      console.error('Invalid date format:', birthdate);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Formato de data inválido. Use YYYY-MM-DD' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validar que a data é do passado
    const birthdateDate = new Date(birthdate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (birthdateDate >= today) {
      console.error('Future birthdate provided:', birthdate);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Data de nascimento deve ser uma data passada' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Função para calcular idade sem problemas de timezone
    const calculateAge = (birthdate: string): number => {
      const birth = new Date(birthdate + 'T12:00:00'); // Adicionar horário para evitar timezone
      const today = new Date();
      
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age;
    };

    // Validar idade mínima (18 anos)
    const minAge = 18;
    const age = calculateAge(birthdate);
    
    if (age < minAge) {
      console.error('Age below minimum:', { birthdate, calculatedAge: age });
      return new Response(
        JSON.stringify({ 
          valid: false,
          code: 'age-restriction',
          message: `É necessário ter pelo menos ${minAge} anos (idade calculada: ${age} anos)` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiToken = Deno.env.get('INFOSIMPLES_API_TOKEN');
    if (!apiToken) {
      console.error('INFOSIMPLES_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Token de API não configurado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('[VALIDATE_CPF] Request details:', {
      cpf_masked: cleanCPF.substring(0, 3) + '***' + cleanCPF.substring(9),
      birthdate,
      birthdate_parsed: new Date(birthdate + 'T12:00:00').toISOString(),
      calculated_age: calculateAge(birthdate),
      timezone_offset: new Date().getTimezoneOffset()
    });

    const url = new URL('https://api.infosimples.com/api/v2/consultas/receita-federal/cpf');
    url.searchParams.append('token', apiToken);
    url.searchParams.append('cpf', cleanCPF);
    url.searchParams.append('birthdate', birthdate);
    url.searchParams.append('timeout', '600');

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('InfoSimples API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Erro ao consultar CPF na Receita Federal' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const result = await response.json();
    console.log('InfoSimples response:', JSON.stringify(result, null, 2));

    // Verificar erros de autenticação/autorização da API
    if (result.code === 603 || result.code === 401 || result.code === 403) {
      console.error('InfoSimples token error:', result.code_message, result.errors);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Serviço de validação de CPF temporariamente indisponível. Entre em contato com o suporte.',
          details: 'Token da API InfoSimples precisa ser renovado ou está bloqueado.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    // Tratamento específico para código 608 (erro de data de nascimento divergente)
    if (result.code === 608) {
      console.log('Birthdate mismatch detected (code 608)');
      const errors = result.errors || [];
      const isBirthdateMismatch = errors.some((error: string) => 
        error.toLowerCase().includes('data de nascimento') || 
        error.toLowerCase().includes('divergente') ||
        error.toLowerCase().includes('birthdate')
      );
      
      if (isBirthdateMismatch) {
        return new Response(
          JSON.stringify({ 
            valid: false,
            code: 'birthdate-mismatch',
            birthdate_mismatch: true,
            message: 'A data de nascimento não confere com a cadastrada na Receita Federal. Verifique se digitou corretamente.',
            details: errors.length > 0 ? errors[0] : 'Data de nascimento divergente'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      // Outros erros 608
      return new Response(
        JSON.stringify({ 
          valid: false,
          code: 'validation-rejected', 
          message: 'Dados informados foram rejeitados pela Receita Federal',
          details: errors.length > 0 ? errors.join('; ') : result.code_message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (result.code === 200 && result.data && result.data.length > 0) {
      const cpfData = result.data[0];
      
      // Normalizar data para formato ISO YYYY-MM-DD
      const dataNascimentoBR = cpfData.normalizado_data_nascimento || cpfData.data_nascimento;
      const dataNascimentoISO = dataNascimentoBR && dataNascimentoBR.includes('/') 
        ? convertBRDateToISO(dataNascimentoBR) 
        : dataNascimentoBR;

      console.log('[CPF_VALIDATION] Convertendo data de nascimento:', {
        formato_original: dataNascimentoBR,
        formato_iso: dataNascimentoISO
      });

      return new Response(
        JSON.stringify({ 
          valid: true, 
          data: {
            nome: cpfData.nome || cpfData.nome_civil || cpfData.nome_social,
            cpf: cpfData.cpf,
            data_nascimento: dataNascimentoISO,
            situacao_cadastral: cpfData.situacao_cadastral,
            data_inscricao: cpfData.data_inscricao,
          },
          message: 'CPF validado com sucesso'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: result.code_message || 'CPF não encontrado ou inválido' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error validating CPF:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        message: 'Erro ao processar validação de CPF' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
