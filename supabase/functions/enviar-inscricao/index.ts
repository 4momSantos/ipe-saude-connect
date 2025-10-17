import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inscricao_id } = await req.json();

    if (!inscricao_id) {
      throw new Error('inscricao_id é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[ENVIAR_INSCRICAO] Processando envio da inscrição:', inscricao_id);

    // Buscar dados da inscrição e configuração do edital
    const { data: inscricao, error: inscricaoError } = await supabase
      .from('inscricoes_edital')
      .select(`
        id,
        edital_id,
        candidato_id,
        status,
        is_rascunho,
        dados_inscricao,
        editais (
          id,
          titulo,
          numero_edital,
          max_especialidades
        )
      `)
      .eq('id', inscricao_id)
      .single();

    if (inscricaoError) throw inscricaoError;
    if (!inscricao) throw new Error('Inscrição não encontrada');

    // Validar que está em rascunho
    if (inscricao.status !== 'rascunho' && !inscricao.is_rascunho) {
      throw new Error('Inscrição já foi enviada anteriormente');
    }

    // ✅ FASE 6: Validação de especialidades no backend
    const editalData = inscricao.editais as any;
    const maxEspecialidades = editalData?.max_especialidades || 5;
    const especialidadesIds = inscricao.dados_inscricao?.especialidades_ids || [];
    
    if (Array.isArray(especialidadesIds) && especialidadesIds.length > maxEspecialidades) {
      throw new Error(
        `Número de especialidades (${especialidadesIds.length}) excede o máximo permitido (${maxEspecialidades}). ` +
        `Por favor, remova ${especialidadesIds.length - maxEspecialidades} especialidade(s) antes de enviar.`
      );
    }

    console.log('[ENVIAR_INSCRICAO] Validação de especialidades OK:', {
      selecionadas: especialidadesIds.length,
      maximo: maxEspecialidades
    });

    // FASE 5: Validação dinâmica de uploads obrigatórios
    const { data: editalConfig, error: editalError } = await supabase
      .from('editais')
      .select('uploads_config, inscription_template_id, inscription_templates!inner(anexos_obrigatorios)')
      .eq('id', inscricao.edital_id)
      .single();

    if (editalError) throw editalError;

    // Determinar documentos obrigatórios baseado na hierarquia
    let documentosObrigatorios: string[] = [];
    if (editalConfig.uploads_config && Object.keys(editalConfig.uploads_config).length > 0) {
      documentosObrigatorios = Object.entries(editalConfig.uploads_config as any)
        .filter(([_, config]: [string, any]) => config.obrigatorio && config.habilitado)
        .map(([tipo]) => tipo);
    } else if (editalConfig.inscription_templates) {
      const template = editalConfig.inscription_templates as any;
      if (template.anexos_obrigatorios && Array.isArray(template.anexos_obrigatorios)) {
        documentosObrigatorios = template.anexos_obrigatorios
          .filter((a: any) => a.obrigatorio)
          .map((a: any) => a.tipo || a.id);
      }
    }

    // Validar se todos os documentos obrigatórios foram enviados
    if (documentosObrigatorios.length > 0) {
      const documentosEnviados = inscricao.dados_inscricao?.documentos || [];
      const tiposEnviados = documentosEnviados
        .filter((d: any) => d.arquivo || d.url)
        .map((d: any) => d.tipo);

      const faltantes = documentosObrigatorios.filter(tipo => !tiposEnviados.includes(tipo));

      if (faltantes.length > 0) {
        throw new Error(`Documentos obrigatórios faltando: ${faltantes.join(', ')}`);
      }

      console.log('[ENVIAR_INSCRICAO] Validação de uploads OK:', {
        obrigatorios: documentosObrigatorios.length,
        enviados: tiposEnviados.length
      });
    }

    // Atualizar inscrição para aguardando_analise
    const { error: updateError } = await supabase
      .from('inscricoes_edital')
      .update({ 
        status: 'aguardando_analise',
        is_rascunho: false 
      })
      .eq('id', inscricao_id);

    if (updateError) throw updateError;

    console.log('[ENVIAR_INSCRICAO] Inscrição atualizada para aguardando_analise');

    // Notificar analistas sobre nova inscrição
    const { data: analistas } = await supabase.rpc('get_gestores');
    
    if (analistas && analistas.length > 0) {
      const notifications = analistas.map((analista: any) => ({
        user_id: analista.id,
        type: 'info',
        title: 'Nova Inscrição Recebida',
        message: `Uma nova inscrição foi recebida no edital "${(inscricao.editais as any).titulo}" e aguarda análise.`,
        related_type: 'inscricao',
        related_id: inscricao_id
      }));

      await supabase.from('app_notifications').insert(notifications);
      console.log('[ENVIAR_INSCRICAO] Notificações enviadas para', analistas.length, 'analistas');
    }

    // Notificar candidato sobre envio bem-sucedido
    await supabase.from('app_notifications').insert({
      user_id: inscricao.candidato_id,
      type: 'success',
      title: 'Inscrição Enviada',
      message: `Sua inscrição no edital "${(inscricao.editais as any).titulo}" foi enviada com sucesso e está em análise.`,
      related_type: 'inscricao',
      related_id: inscricao_id
    });

    // Buscar email do candidato
    const emailCandidato = inscricao.dados_inscricao?.endereco_correspondencia?.email || 
                           inscricao.dados_inscricao?.dados_pessoais?.email || 
                           'Não disponível';

    return new Response(
      JSON.stringify({ 
        success: true, 
        inscricao_id,
        status: 'aguardando_analise',
        email_candidato: emailCandidato
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('[ENVIAR_INSCRICAO] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
