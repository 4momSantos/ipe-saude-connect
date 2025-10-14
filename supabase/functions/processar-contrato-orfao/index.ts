import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessarContratoRequest {
  contrato_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { contrato_id }: ProcessarContratoRequest = await req.json()
    
    console.log('[PROCESSAR_ORFAO] Iniciando processamento do contrato:', contrato_id)

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Buscar contrato e validar
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select(`
        *,
        inscricao:inscricoes_edital(
          id,
          protocolo,
          candidato_id,
          dados_inscricao
        )
      `)
      .eq('id', contrato_id)
      .single()

    if (contratoError || !contrato) {
      console.error('[PROCESSAR_ORFAO] Contrato não encontrado:', contratoError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Contrato não encontrado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (contrato.status !== 'assinado') {
      console.error('[PROCESSAR_ORFAO] Contrato não está assinado:', contrato.status)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Contrato não está assinado (status: ${contrato.status})` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 2. Verificar se já existe credenciado
    const { data: credenciadoExistente } = await supabase
      .from('credenciados')
      .select('id, nome')
      .eq('inscricao_id', contrato.inscricao_id)
      .maybeSingle()

    if (credenciadoExistente) {
      console.log('[PROCESSAR_ORFAO] Credenciado já existe:', credenciadoExistente.id)
      return new Response(
        JSON.stringify({ 
          success: true,
          already_exists: true,
          credenciado_id: credenciadoExistente.id,
          credenciado_nome: credenciadoExistente.nome,
          contrato_numero: contrato.numero_contrato,
          inscricao_protocolo: contrato.inscricao.protocolo
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Chamar função para criar credenciado
    console.log('[PROCESSAR_ORFAO] Chamando sync_approved_inscricao_to_credenciado_v2...')
    
    const { data: credenciadoId, error: syncError } = await supabase
      .rpc('sync_approved_inscricao_to_credenciado_v2', {
        p_inscricao_id: contrato.inscricao_id
      })

    if (syncError) {
      console.error('[PROCESSAR_ORFAO] Erro ao criar credenciado:', syncError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: syncError.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 4. Buscar credenciado criado
    const { data: credenciado, error: credenciadoError } = await supabase
      .from('credenciados')
      .select('id, nome, cpf, email')
      .eq('id', credenciadoId)
      .single()

    if (credenciadoError || !credenciado) {
      console.error('[PROCESSAR_ORFAO] Erro ao buscar credenciado:', credenciadoError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciado não encontrado após criação' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('[PROCESSAR_ORFAO] ✅ Credenciado criado:', credenciado)

    return new Response(
      JSON.stringify({ 
        success: true,
        credenciado_id: credenciado.id,
        credenciado_nome: credenciado.nome,
        credenciado_cpf: credenciado.cpf,
        credenciado_email: credenciado.email,
        contrato_numero: contrato.numero_contrato,
        inscricao_protocolo: contrato.inscricao.protocolo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[PROCESSAR_ORFAO] Erro fatal:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
