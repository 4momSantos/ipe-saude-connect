import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessarDocumentoRequest {
  generated_document_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generated_document_id }: ProcessarDocumentoRequest = await req.json();
    
    if (!generated_document_id) {
      throw new Error('generated_document_id é obrigatório');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Buscar documento pendente
    const { data: docRecord, error: docError } = await supabase
      .from('generated_documents')
      .select(`
        *,
        template:document_templates(*),
        credenciado:credenciados(
          id,
          nome,
          cpf,
          cnpj,
          email,
          telefone,
          endereco,
          cidade,
          estado,
          cep,
          numero_credenciado,
          status,
          inscricao_id,
          inscricao:inscricoes_edital(
            id,
            dados_inscricao,
            edital:editais(titulo, numero_edital, objeto)
          )
        )
      `)
      .eq('id', generated_document_id)
      .single();

    if (docError || !docRecord) {
      throw new Error(`Documento não encontrado: ${docError?.message}`);
    }

    const credenciado = docRecord.credenciado;
    const template = docRecord.template;

    if (!template) {
      throw new Error('Template não encontrado');
    }

    // Preparar placeholders
    const placeholders = {
      credenciado_nome: credenciado.nome || 'Não informado',
      credenciado_documento: credenciado.cpf || credenciado.cnpj || 'Não informado',
      credenciado_cpf: credenciado.cpf || '',
      credenciado_cnpj: credenciado.cnpj || '',
      credenciado_email: credenciado.email || '',
      credenciado_telefone: credenciado.telefone || '',
      credenciado_endereco: credenciado.endereco || '',
      numero_credenciado: credenciado.numero_credenciado || credenciado.id.substring(0, 8).toUpperCase(),
      status_anterior: docRecord.status_anterior || '',
      status_novo: docRecord.status_novo || '',
      motivo_rescisao: docRecord.motivo || 'Não informado',
      motivo_suspensao: docRecord.motivo || 'Não informado',
      motivo_reativacao: docRecord.motivo || 'Reativação após regularização',
      data_atual: new Date().toLocaleDateString('pt-BR'),
      data_atual_extenso: formatarDataExtenso(new Date()),
      data_suspensao_inicio: docRecord.valido_de ? new Date(docRecord.valido_de).toLocaleDateString('pt-BR') : '',
      data_suspensao_fim: docRecord.valido_ate ? new Date(docRecord.valido_ate).toLocaleDateString('pt-BR') : '',
      dias_suspensao: docRecord.valido_ate && docRecord.valido_de 
        ? Math.ceil((new Date(docRecord.valido_ate).getTime() - new Date(docRecord.valido_de).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      data_validade: docRecord.valido_ate ? new Date(docRecord.valido_ate).toLocaleDateString('pt-BR') : 'Indeterminado',
      edital_numero: credenciado.inscricao?.edital?.numero_edital || '',
      edital_titulo: credenciado.inscricao?.edital?.titulo || '',
      numero_documento: generated_document_id.substring(0, 12).toUpperCase(),
      condicoes_reativacao: 'Regularização das pendências identificadas'
    };

    // Preencher template HTML
    let documentoHtml = template.template_html;
    for (const [key, value] of Object.entries(placeholders)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      documentoHtml = documentoHtml.replace(regex, String(value) || '');
    }

    // Atualizar documento
    const { error: updateError } = await supabase
      .from('generated_documents')
      .update({
        documento_html: documentoHtml,
        metadata: {
          ...docRecord.metadata,
          processed_at: new Date().toISOString(),
          placeholders_used: placeholders
        }
      })
      .eq('id', generated_document_id);

    if (updateError) {
      throw new Error(`Erro ao atualizar documento: ${updateError.message}`);
    }

    console.log(`[PROCESSAR_DOCUMENTO] ✅ Documento ${generated_document_id} processado`);

    return new Response(
      JSON.stringify({
        success: true,
        document_id: generated_document_id,
        tipo_documento: docRecord.tipo_documento,
        requer_assinatura: docRecord.requer_assinatura
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[PROCESSAR_DOCUMENTO] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function formatarDataExtenso(data: Date): string {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return `${data.getDate()} de ${meses[data.getMonth()]} de ${data.getFullYear()}`;
}
