import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { documento_id } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[AUTO_OCR] Iniciando processamento para documento:', documento_id);

    // 1. Buscar documento com dados da inscrição e config do edital
    const { data: documento, error: docError } = await supabase
      .from('inscricao_documentos')
      .select(`
        *,
        inscricoes_edital (
          id,
          dados_inscricao,
          edital_id,
          analisado_por,
          editais (uploads_config)
        )
      `)
      .eq('id', documento_id)
      .single();

    if (docError || !documento) {
      console.error('[AUTO_OCR] Documento não encontrado:', docError);
      return new Response(JSON.stringify({ error: 'Documento não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Buscar OCR config do edital
    const ocrConfig = documento.inscricoes_edital?.editais?.uploads_config?.[documento.tipo_documento]?.ocrConfig;
    
    if (!ocrConfig || !ocrConfig.enabled) {
      console.log('[AUTO_OCR] OCR não habilitado para este documento');
      return new Response(JSON.stringify({ message: 'OCR não habilitado' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[AUTO_OCR] Configuração OCR encontrada:', {
      documentType: ocrConfig.documentType,
      minConfidence: ocrConfig.minConfidence,
      autoValidate: ocrConfig.autoValidate
    });

    // 3. Processar OCR
    const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('process-ocr', {
      body: {
        fileUrl: documento.arquivo_url,
        documentType: ocrConfig.documentType || documento.tipo_documento,
        expectedFields: (ocrConfig.expectedFields || []).map((f: any) => f.ocrField)
      }
    });

    if (ocrError) {
      console.error('[AUTO_OCR] Erro ao processar OCR:', ocrError);
      throw ocrError;
    }

    console.log('[AUTO_OCR] OCR processado:', {
      success: ocrResult.success,
      confidence: ocrResult.confidence
    });

    // 4. Salvar resultado no documento
    await supabase
      .from('inscricao_documentos')
      .update({
        ocr_processado: true,
        ocr_resultado: ocrResult.data || {},
        ocr_confidence: ocrResult.confidence || 0
      })
      .eq('id', documento_id);

    // 5. Detectar discrepâncias
    const discrepancias = detectarDiscrepancias(
      ocrResult.data || {},
      documento.inscricoes_edital?.dados_inscricao || {},
      ocrConfig.expectedFields || []
    );

    console.log('[AUTO_OCR] Discrepâncias detectadas:', discrepancias.length);

    // 6. Registrar evento
    await supabase.from('inscricao_eventos').insert({
      inscricao_id: documento.inscricoes_edital?.id,
      tipo_evento: 'ocr_processado',
      descricao: `OCR processado: ${ocrResult.success ? 'sucesso' : 'falha'} (${(ocrResult.confidence || 0).toFixed(1)}% confiança)`,
      dados: {
        documento_id,
        confidence: ocrResult.confidence,
        discrepancias: discrepancias.length,
        success: ocrResult.success
      }
    });

    // 7. Se há discrepâncias críticas, notificar analista
    if (discrepancias.length > 0 && documento.inscricoes_edital?.analisado_por) {
      const discrepanciasCriticas = discrepancias.filter(d => d.severidade === 'alta');
      
      if (discrepanciasCriticas.length > 0) {
        await supabase.from('app_notifications').insert({
          user_id: documento.inscricoes_edital.analisado_por,
          type: 'warning',
          title: 'Discrepâncias Críticas no OCR',
          message: `${discrepanciasCriticas.length} divergência(s) crítica(s) encontrada(s) em ${documento.tipo_documento}`,
          related_type: 'documento',
          related_id: documento_id
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      confidence: ocrResult.confidence,
      discrepancias: discrepancias.length 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[AUTO_OCR] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function detectarDiscrepancias(
  ocrData: Record<string, any>,
  dadosInscricao: Record<string, any>,
  expectedFields: Array<{ ocrField: string; contextField: string }>
) {
  const discrepancias: Array<{
    campo: string;
    esperado: string;
    encontrado: string;
    severidade: 'alta' | 'moderada' | 'baixa';
  }> = [];

  for (const field of expectedFields) {
    const valorOCR = ocrData[field.ocrField];
    const valorInscricao = getNestedValue(dadosInscricao, field.contextField);

    if (valorOCR && valorInscricao) {
      const normalized1 = normalize(valorOCR);
      const normalized2 = normalize(valorInscricao);

      if (normalized1 !== normalized2) {
        // Calcular similaridade (Levenshtein simplificado)
        const similaridade = calcularSimilaridade(normalized1, normalized2);
        
        discrepancias.push({
          campo: field.ocrField,
          esperado: String(valorInscricao),
          encontrado: String(valorOCR),
          severidade: similaridade > 80 ? 'baixa' : similaridade > 60 ? 'moderada' : 'alta'
        });
      }
    }
  }

  return discrepancias;
}

function normalize(val: any): string {
  return String(val)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .trim();
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

function calcularSimilaridade(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 100;
  
  const editDistance = levenshtein(longer, shorter);
  return ((longer.length - editDistance) / longer.length) * 100;
}

function levenshtein(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
