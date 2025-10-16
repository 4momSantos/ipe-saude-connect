import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalisarInscricaoRequest {
  inscricao_id: string;
  analista_id: string;
  decisao: 'aprovado' | 'rejeitado';
  comentarios?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = new Date().toISOString();
  console.log(`[ANALISAR_INSCRICAO] ${startTime} - Iniciando processamento`);

  try {
    // Setup Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse and validate request
    const { 
      inscricao_id, 
      analista_id, 
      decisao, 
      comentarios 
    }: AnalisarInscricaoRequest = await req.json();

    if (!inscricao_id || !analista_id || !decisao) {
      throw new Error("Campos obrigatórios: inscricao_id, analista_id, decisao");
    }

    if (!['aprovado', 'rejeitado'].includes(decisao)) {
      throw new Error("Decisão deve ser 'aprovado' ou 'rejeitado'");
    }

    console.log(`[ANALISAR_INSCRICAO] Processando decisão: ${decisao} para inscrição ${inscricao_id}`);

    // 1. Buscar inscrição e análise
    const { data: inscricao, error: inscricaoError } = await supabase
      .from("inscricoes_edital")
      .select("*, editais(titulo), profiles:candidato_id(nome, email)")
      .eq("id", inscricao_id)
      .single();

    if (inscricaoError || !inscricao) {
      console.error(`[ANALISAR_INSCRICAO] Erro ao buscar inscrição:`, inscricaoError);
      throw new Error(`Inscrição não encontrada: ${inscricaoError?.message}`);
    }

    console.log(`[ANALISAR_INSCRICAO] Inscrição encontrada - Edital: ${inscricao.editais?.titulo}`);

    // 2. Buscar ou criar análise
    let { data: analise, error: analiseError } = await supabase
      .from("analises")
      .select("*")
      .eq("inscricao_id", inscricao_id)
      .single();

    if (analiseError && analiseError.code === 'PGRST116') {
      // Análise não existe, criar uma
      console.log(`[ANALISAR_INSCRICAO] Criando nova análise`);
      const { data: novaAnalise, error: criarError } = await supabase
        .from("analises")
        .insert({
          inscricao_id,
          analista_id,
          status: decisao,
          parecer: comentarios,
          analisado_em: new Date().toISOString(),
        })
        .select()
        .single();

      if (criarError) {
        console.error(`[ANALISAR_INSCRICAO] Erro ao criar análise:`, criarError);
        throw new Error(`Erro ao criar análise: ${criarError.message}`);
      }
      analise = novaAnalise;
    } else if (analiseError) {
      console.error(`[ANALISAR_INSCRICAO] Erro ao buscar análise:`, analiseError);
      throw new Error(`Erro ao buscar análise: ${analiseError.message}`);
    } else {
      // Atualizar análise existente
      console.log(`[ANALISAR_INSCRICAO] Atualizando análise existente`);
      const { error: updateError } = await supabase
        .from("analises")
        .update({
          analista_id,
          status: decisao,
          parecer: comentarios,
          analisado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", analise.id);

      if (updateError) {
        console.error(`[ANALISAR_INSCRICAO] Erro ao atualizar análise:`, updateError);
        throw new Error(`Erro ao atualizar análise: ${updateError.message}`);
      }
    }

    // 3. Atualizar status da inscrição
    const { error: updateInscricaoError } = await supabase
      .from("inscricoes_edital")
      .update({
        status: decisao,
        analisado_por: analista_id,
        analisado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", inscricao_id);

    if (updateInscricaoError) {
      console.error(`[ANALISAR_INSCRICAO] Erro ao atualizar inscrição:`, updateInscricaoError);
      throw new Error(`Erro ao atualizar inscrição: ${updateInscricaoError.message}`);
    }

    console.log(`[ANALISAR_INSCRICAO] Análise registrada com sucesso`);

    // 4. Processar ações baseadas na decisão
    if (decisao === 'aprovado') {
      console.log(`[ANALISAR_INSCRICAO] Inscrição aprovada - gerando contrato`);
      
      // Chamar função para gerar contrato com assinatura
      try {
        const { data: contratoData, error: contratoError } = await supabase.functions.invoke(
          "gerar-contrato-assinatura",
          {
            body: {
              inscricao_id,
            }
          }
        );

        if (contratoError) {
          console.error(`[ANALISAR_INSCRICAO] Erro ao gerar contrato:`, contratoError);
          // Não falha a operação principal
        } else {
          console.log(`[ANALISAR_INSCRICAO] Contrato gerado com sucesso:`, contratoData);
        }
      } catch (contratoError) {
        console.error(`[ANALISAR_INSCRICAO] Erro ao invocar gerar-contrato:`, contratoError);
        // Não falha a operação principal
      }

      // Migrar documentos da inscrição para o credenciado
      console.log('[ANALISAR_INSCRICAO] Migrando documentos para credenciado');
      
      try {
        // Buscar credenciado criado
        const { data: credenciado } = await supabase
          .from('credenciados')
          .select('id')
          .eq('inscricao_id', inscricao_id)
          .single();
        
        if (credenciado) {
          const { data: migracao, error: migracaoError } = await supabase.functions.invoke(
            'migrar-documentos-inscricao',
            {
              body: {
                inscricao_id,
                credenciado_id: credenciado.id
              }
            }
          );
          
          if (migracaoError) {
            console.error('[ANALISAR_INSCRICAO] Erro ao migrar documentos:', migracaoError);
          } else {
            console.log('[ANALISAR_INSCRICAO] Documentos migrados:', migracao);
          }
        } else {
          console.warn('[ANALISAR_INSCRICAO] Credenciado não encontrado para inscrição:', inscricao_id);
        }
      } catch (err) {
        console.error('[ANALISAR_INSCRICAO] Erro ao invocar migração de documentos:', err);
        // Não falha a operação principal
      }

      // Notificar candidato sobre aprovação
      await supabase.from("app_notifications").insert({
        user_id: inscricao.candidato_id,
        type: 'success',
        title: 'Inscrição Aprovada',
        message: `Parabéns! Sua inscrição para o edital "${inscricao.editais?.titulo || 'N/A'}" foi aprovada. O contrato será gerado em breve.`,
        related_type: 'inscricao',
        related_id: inscricao_id,
      });

    } else {
      // decisao === 'rejeitado'
      console.log(`[ANALISAR_INSCRICAO] Inscrição rejeitada - notificando candidato`);
      
      // Notificar candidato sobre reprovação
      await supabase.from("app_notifications").insert({
        user_id: inscricao.candidato_id,
        type: 'warning',
        title: 'Inscrição Não Aprovada',
        message: `Sua inscrição para o edital "${inscricao.editais?.titulo || 'N/A'}" não foi aprovada. ${comentarios ? 'Motivo: ' + comentarios : 'Verifique os requisitos e corrija os documentos, se necessário.'}`,
        related_type: 'inscricao',
        related_id: inscricao_id,
      });
    }

    // 5. Log de auditoria
    try {
      await supabase.rpc("log_audit_event", {
        p_action: `inscricao_${decisao}`,
        p_resource_type: "analise",
        p_resource_id: analise?.id,
        p_metadata: {
          inscricao_id,
          analista_id,
          decisao,
          edital_id: inscricao.edital_id,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (auditError) {
      console.error(`[ANALISAR_INSCRICAO] Erro ao registrar log de auditoria:`, auditError);
    }

    const endTime = new Date().toISOString();
    console.log(`[ANALISAR_INSCRICAO] ${endTime} - Processamento concluído com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        message: decisao === 'aprovado' 
          ? 'Inscrição aprovada com sucesso. Contrato será gerado.' 
          : 'Inscrição rejeitada. Candidato foi notificado.',
        data: {
          inscricao_id,
          analise_id: analise?.id,
          decisao,
          timestamp: endTime,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    const errorTime = new Date().toISOString();
    console.error(`[ANALISAR_INSCRICAO] ${errorTime} - Erro:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: errorTime,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
