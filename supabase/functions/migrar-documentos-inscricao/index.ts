import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrarDocumentosRequest {
  inscricao_id: string;
  credenciado_id: string;
}

// Mapeamento de tipos de documentos para validade padrão (em meses)
const validadePorTipo: Record<string, number> = {
  'CNPJ': 24,
  'Contrato Social': 0, // sem vencimento
  'Alvará Sanitário': 12,
  'Certidão Negativa Federal': 6,
  'Certidão Negativa Estadual': 6,
  'Certidão Negativa Municipal': 6,
  'CNES': 24,
  'CRM': 12,
  'RG': 0, // sem vencimento
  'CPF': 0, // sem vencimento
  'CNH': 60, // 5 anos
  'Comprovante de Residência': 3,
  'Certidão de Regularidade': 6,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = new Date().toISOString();
  console.log(`[MIGRAR_DOCUMENTOS] ${startTime} - Iniciando migração`);

  try {
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

    const { inscricao_id, credenciado_id }: MigrarDocumentosRequest = await req.json();

    if (!inscricao_id || !credenciado_id) {
      throw new Error("Campos obrigatórios: inscricao_id, credenciado_id");
    }

    console.log(`[MIGRAR_DOCUMENTOS] Migrando documentos da inscrição ${inscricao_id} para credenciado ${credenciado_id}`);

    // 0. Verificar se documentos já foram migrados (idempotência)
    const { data: existingDocs, error: existingError } = await supabase
      .from("documentos_credenciados")
      .select("id")
      .eq("credenciado_id", credenciado_id)
      .eq("origem", "migrado")
      .limit(1);

    if (existingError) {
      console.error(`[MIGRAR_DOCUMENTOS] Erro ao verificar documentos existentes:`, existingError);
    }

    if (existingDocs && existingDocs.length > 0) {
      console.log(`[MIGRAR_DOCUMENTOS] ⚠️ Documentos já foram migrados anteriormente (${existingDocs.length} docs encontrados)`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Documentos já existem, nenhuma ação necessária",
          total_migrados: 0,
          skipped: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Buscar todos os documentos da inscrição
    const { data: docs, error: docsError } = await supabase
      .from("inscricao_documentos")
      .select("id, tipo_documento, arquivo_url, arquivo_nome, arquivo_tamanho, created_at, status, ocr_resultado")
      .eq("inscricao_id", inscricao_id)
      .in("status", ["validado", "aprovado", "pendente"]); // Migrar documentos relevantes

    if (docsError) {
      console.error(`[MIGRAR_DOCUMENTOS] Erro ao buscar documentos:`, docsError);
      throw new Error(`Erro ao buscar documentos: ${docsError.message}`);
    }

    if (!docs || docs.length === 0) {
      console.log(`[MIGRAR_DOCUMENTOS] Nenhum documento encontrado para migração`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum documento para migrar",
          total_migrados: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[MIGRAR_DOCUMENTOS] ${docs.length} documentos encontrados para migração`);

    // 2. Preparar documentos para inserção
    const hoje = new Date();
    const documentosInsert = docs.map((doc) => {
      const mesesValidade = validadePorTipo[doc.tipo_documento] || 12;
      
      // Calcular data de vencimento
      let dataVencimento = null;
      if (mesesValidade > 0) {
        const dataEmissao = new Date(doc.created_at);
        dataVencimento = new Date(dataEmissao);
        dataVencimento.setMonth(dataVencimento.getMonth() + mesesValidade);
      }

      // Extrair data de emissão do OCR se disponível
      let dataEmissao = doc.created_at;
      if (doc.ocr_resultado?.dataEmissao) {
        try {
          dataEmissao = new Date(doc.ocr_resultado.dataEmissao).toISOString();
        } catch (e) {
          console.warn(`[MIGRAR_DOCUMENTOS] Erro ao parsear data de emissão do OCR para documento ${doc.id}`);
        }
      }

      return {
        credenciado_id,
        inscricao_id,
        documento_origem_id: doc.id,
        tipo_documento: doc.tipo_documento,
        descricao: `Documento migrado da inscrição`,
        url_arquivo: doc.arquivo_url,
        arquivo_nome: doc.arquivo_nome,
        arquivo_tamanho: doc.arquivo_tamanho,
        storage_path: doc.arquivo_url, // Storage path é o mesmo que URL por enquanto
        data_emissao: dataEmissao ? new Date(dataEmissao).toISOString().split('T')[0] : null,
        data_vencimento: dataVencimento ? dataVencimento.toISOString().split('T')[0] : null,
        meses_validade: mesesValidade,
        status: 'ativo',
        origem: 'migrado',
        metadata: {
          migrado_em: hoje.toISOString(),
          status_original: doc.status,
          ocr_resultado: doc.ocr_resultado
        }
      };
    });

    // 3. Desativar documentos antigos do mesmo tipo antes de inserir novos
    const tiposDocumentos = [...new Set(documentosInsert.map(d => d.tipo_documento))];
    
    console.log(`[MIGRAR_DOCUMENTOS] Desativando documentos antigos dos tipos: ${tiposDocumentos.join(', ')}`);
    
    const { error: deactivateError } = await supabase
      .from("documentos_credenciados")
      .update({ is_current: false })
      .eq("credenciado_id", credenciado_id)
      .in("tipo_documento", tiposDocumentos)
      .eq("is_current", true);

    if (deactivateError) {
      console.warn(`[MIGRAR_DOCUMENTOS] Aviso ao desativar documentos antigos:`, deactivateError);
    }

    // 4. Inserir novos documentos na tabela documentos_credenciados
    const { data: insertedDocs, error: insertError } = await supabase
      .from("documentos_credenciados")
      .insert(documentosInsert)
      .select("id, tipo_documento");

    if (insertError) {
      console.error(`[MIGRAR_DOCUMENTOS] Erro ao inserir documentos:`, insertError);
      throw new Error(`Erro ao inserir documentos: ${insertError.message}`);
    }

    console.log(`[MIGRAR_DOCUMENTOS] ${insertedDocs?.length || 0} documentos migrados com sucesso`);

    // 5. Registrar histórico (o trigger já deve fazer isso automaticamente)
    // Mas vamos adicionar um log extra para rastreabilidade
    if (insertedDocs && insertedDocs.length > 0) {
      const historico = insertedDocs.map((doc) => ({
        documento_id: doc.id,
        status_anterior: null,
        status_novo: 'ativo',
        acao: 'migracao',
        comentario: `Documento migrado automaticamente da inscrição ${inscricao_id}`,
        metadata: {
          inscricao_id,
          credenciado_id,
          migrado_em: hoje.toISOString()
        }
      }));

      await supabase.from("documentos_credenciados_historico").insert(historico);
      console.log(`[MIGRAR_DOCUMENTOS] Histórico de migração registrado`);
    }

    const endTime = new Date().toISOString();
    console.log(`[MIGRAR_DOCUMENTOS] ${endTime} - Migração concluída com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${insertedDocs?.length || 0} documentos migrados com sucesso`,
        total_migrados: insertedDocs?.length || 0,
        documentos: insertedDocs
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    const errorTime = new Date().toISOString();
    console.error(`[MIGRAR_DOCUMENTOS] ${errorTime} - Erro:`, error);
    
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
