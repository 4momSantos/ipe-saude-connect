import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidateCRMRequest {
  crm: string;
  uf: string;
}

interface CRMValidationResponse {
  valid: boolean;
  crm: string;
  uf: string;
  nome?: string;
  situacao?: string;
  especialidades?: string[];
  error?: string;
  cached?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { crm, uf }: ValidateCRMRequest = await req.json()
    
    console.log('[VALIDATE_CRM] Validando CRM:', crm, 'UF:', uf)

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verificar cache (24h)
    const cacheKey = `${crm}_${uf}`
    const { data: cachedData } = await supabase
      .from('crm_validation_cache')
      .select('*')
      .eq('crm', crm)
      .eq('uf', uf)
      .gt('cached_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle()

    if (cachedData) {
      console.log('[VALIDATE_CRM] ✅ Cache hit para CRM', crm)
      return new Response(
        JSON.stringify({
          valid: cachedData.valid,
          crm: cachedData.crm,
          uf: cachedData.uf,
          nome: cachedData.nome,
          situacao: cachedData.situacao,
          especialidades: cachedData.especialidades,
          cached: true
        } as CRMValidationResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Consultar API do CFM
    console.log('[VALIDATE_CRM] Consultando API CFM...')
    
    try {
      // API do CFM - endpoint público
      const cfmResponse = await fetch(
        `https://portal.cfm.org.br/api/v1/medicos?crm=${crm}&uf=${uf}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Sistema-Credenciamento/1.0'
          }
        }
      )

      // Se retornou 404, CRM não existe
      if (cfmResponse.status === 404) {
        console.log('[VALIDATE_CRM] ❌ CRM não encontrado no CFM')
        
        const result: CRMValidationResponse = {
          valid: false,
          crm,
          uf,
          error: 'CRM não encontrado no cadastro do CFM'
        }
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      if (!cfmResponse.ok) {
        throw new Error(`CFM API retornou ${cfmResponse.status}`)
      }

      const cfmData = await cfmResponse.json()
      
      // Processar resposta
      const isValid = cfmData && cfmData.total > 0 && cfmData.items?.[0]?.situacao === 'ATIVO'
      const medico = cfmData?.items?.[0]
      
      const result: CRMValidationResponse = {
        valid: isValid,
        crm,
        uf,
        nome: medico?.nome,
        situacao: medico?.situacao,
        especialidades: medico?.especialidades?.map((e: any) => e.nome) || [],
        cached: false
      }

      // Salvar no cache
      await supabase
        .from('crm_validation_cache')
        .upsert({
          crm,
          uf,
          valid: isValid,
          nome: result.nome,
          situacao: result.situacao,
          especialidades: result.especialidades,
          cached_at: new Date().toISOString(),
          api_response: cfmData
        })

      console.log('[VALIDATE_CRM] ✅ CRM validado:', isValid ? 'VÁLIDO' : 'INVÁLIDO')

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (apiError) {
      console.error('[VALIDATE_CRM] ⚠️ Erro ao consultar CFM, usando fallback:', apiError)
      
      // Fallback: validação básica de formato
      const isCRMFormatValid = /^\d{4,7}$/.test(crm) && /^[A-Z]{2}$/.test(uf)
      
      return new Response(
        JSON.stringify({
          valid: isCRMFormatValid,
          crm,
          uf,
          error: 'API CFM indisponível - validação de formato apenas',
          cached: false
        } as CRMValidationResponse),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: isCRMFormatValid ? 200 : 400
        }
      )
    }

  } catch (error) {
    console.error('[VALIDATE_CRM] Erro fatal:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})