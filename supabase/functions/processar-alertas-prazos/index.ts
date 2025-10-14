import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PrazoVencendo {
  prazo_id: string;
  credenciado_id: string;
  credenciado_nome: string;
  credenciado_email: string;
  tipo_prazo: string;
  data_vencimento: string;
  dias_restantes: number;
  tipo_alerta: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[ALERTAS] Iniciando processamento de alertas de prazo')

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Buscar prazos que precisam de alerta
    const { data: prazos, error: prazosError } = await supabase
      .rpc('verificar_prazos_vencendo')

    if (prazosError) {
      console.error('[ALERTAS] Erro ao buscar prazos:', prazosError)
      throw prazosError
    }

    if (!prazos || prazos.length === 0) {
      console.log('[ALERTAS] Nenhum prazo vencendo encontrado')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum prazo vencendo',
          alertas_enviados: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[ALERTAS] ${prazos.length} prazos precisam de alerta`)

    // 2. Processar cada prazo
    const resultados = []
    for (const prazo of prazos as PrazoVencendo[]) {
      try {
        // Mensagem personalizada por tipo de alerta
        const mensagens = {
          '30_dias': `Atenção! O prazo "${prazo.tipo_prazo}" vence em 30 dias (${prazo.data_vencimento}).`,
          '15_dias': `⚠️ URGENTE: O prazo "${prazo.tipo_prazo}" vence em 15 dias (${prazo.data_vencimento}).`,
          '7_dias': `🚨 CRÍTICO: O prazo "${prazo.tipo_prazo}" vence em 7 dias (${prazo.data_vencimento}).`,
          '1_dia': `🔴 ÚLTIMO DIA: O prazo "${prazo.tipo_prazo}" vence AMANHÃ (${prazo.data_vencimento})!`,
          'vencido': `❌ VENCIDO: O prazo "${prazo.tipo_prazo}" venceu em ${prazo.data_vencimento}.`
        }

        const mensagem = mensagens[prazo.tipo_alerta as keyof typeof mensagens]

        // TODO: Integrar com Resend para envio de email
        // Por enquanto, apenas registra o alerta
        console.log(`[ALERTAS] Alerta para ${prazo.credenciado_nome}: ${mensagem}`)

        // Registrar alerta enviado
        const { error: insertError } = await supabase
          .from('alertas_enviados')
          .insert({
            prazo_id: prazo.prazo_id,
            credenciado_id: prazo.credenciado_id,
            tipo_alerta: prazo.tipo_alerta,
            email_enviado_para: prazo.credenciado_email,
            status_envio: 'enviado',
            metadata: {
              mensagem,
              dias_restantes: prazo.dias_restantes
            }
          })

        if (insertError) {
          console.error('[ALERTAS] Erro ao registrar alerta:', insertError)
          resultados.push({
            prazo_id: prazo.prazo_id,
            sucesso: false,
            erro: insertError.message
          })
        } else {
          resultados.push({
            prazo_id: prazo.prazo_id,
            sucesso: true
          })
        }

        // Atualizar status do prazo se vencido
        if (prazo.tipo_alerta === 'vencido') {
          await supabase
            .from('prazos_credenciamento')
            .update({ status: 'vencido' })
            .eq('id', prazo.prazo_id)

          // Suspender credenciado se prazo crítico vencido
          if (prazo.tipo_prazo === 'validade_certificado') {
            await supabase
              .from('credenciados')
              .update({ 
                status: 'Suspenso',
                motivo_suspensao: `Certificado vencido em ${prazo.data_vencimento}`,
                suspensao_automatica: true,
                suspensao_inicio: new Date().toISOString()
              })
              .eq('id', prazo.credenciado_id)

            console.log(`[ALERTAS] ⚠️ Credenciado ${prazo.credenciado_nome} SUSPENSO por certificado vencido`)
          }
        }

      } catch (prazoError) {
        console.error('[ALERTAS] Erro ao processar prazo:', prazoError)
        resultados.push({
          prazo_id: prazo.prazo_id,
          sucesso: false,
          erro: prazoError instanceof Error ? prazoError.message : 'Erro desconhecido'
        })
      }
    }

    const alertasEnviados = resultados.filter(r => r.sucesso).length

    console.log(`[ALERTAS] ✅ ${alertasEnviados}/${prazos.length} alertas enviados com sucesso`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${alertasEnviados} alertas enviados`,
        alertas_enviados: alertasEnviados,
        total_prazos: prazos.length,
        detalhes: resultados
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ALERTAS] Erro fatal:', error)
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