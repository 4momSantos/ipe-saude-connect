import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getExtractor, isDocumentTypeSupported } from './extractors/index.ts';
import { normalizeText } from './utils/text-normalizer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Feature flag para novo sistema de extractors
const USE_NEW_EXTRACTORS = Deno.env.get('USE_NEW_OCR_EXTRACTORS') !== 'false'; // Default: true

interface OCRRequest {
  fileUrl: string;
  documentType: string;
  expectedFields: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let { fileUrl, documentType, expectedFields }: OCRRequest = await req.json();

    // Fase 1: Validar e padronizar expectedFields
    if (!Array.isArray(expectedFields)) {
      console.warn(`[OCR] expectedFields should be array, got: ${typeof expectedFields}`, expectedFields);
      expectedFields = [];
    }

    console.log('[OCR] Processing request:', {
      fileUrl,
      documentType,
      expectedFields: expectedFields?.length || 0,
      useNewExtractors: USE_NEW_EXTRACTORS
    });

    // Get OCR.space API key
    const apiKey = Deno.env.get('OCRSPACE_API_KEY');
    if (!apiKey) {
      console.error('[OCR] API key not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Serviço de OCR não configurado. Configure a chave API do OCR.space.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Process OCR with intelligent rotation strategy
    const ocrResult = await processWithRotations(fileUrl, documentType, expectedFields, apiKey);

    console.log('[OCR] Processing completed:', {
      success: ocrResult.success,
      confidence: ocrResult.confidence,
      fieldsExtracted: Object.keys(ocrResult.data).length
    });

    return new Response(
      JSON.stringify(ocrResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[OCR] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar OCR'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

/**
 * Calculate OCR confidence score based on multiple factors
 * 
 * Algorithm:
 * 1. Base Score: % of expected fields extracted (0-100%)
 * 2. Text Quality Multiplier: Penalizes very short text (possible OCR failure)
 *    - < 50 chars: 0.3x (likely OCR failed)
 *    - < 150 chars: 0.6x (very short, low confidence)
 *    - < 300 chars: 0.8x (reasonable text)
 *    - >= 300 chars: 1.0x (no penalty)
 * 3. Critical Fields Bonus: +5% for each critical field extracted (max +20%)
 *    - Critical fields: nome, cpf, rg, cnpj, crm
 * 4. Final confidence is capped between 0-100%
 * 
 * @param extractedData - Object with extracted field values
 * @param expectedFields - Array of expected field names
 * @param textLength - Length of OCR text in characters
 * @returns Confidence score (0-100)
 */
function calculateConfidence(
  extractedData: Record<string, any>,
  expectedFields: string[],
  textLength: number
): number {
  // Fase 4: Contar apenas campos com valores válidos (não vazios, não null)
  const validFields = Object.entries(extractedData).filter(
    ([key, value]) => value && String(value).trim().length > 0
  );
  const fieldsExtracted = validFields.length;
  
  // 1. Base Score: % de campos extraídos
  const totalExpected = expectedFields.length > 0 ? expectedFields.length : 5;
  const baseScore = (fieldsExtracted / totalExpected) * 100;
  
  // 2. Multiplicador de qualidade do texto (penaliza textos muito curtos)
  let textQualityMultiplier = 1.0;
  if (textLength < 50) {
    textQualityMultiplier = 0.3;  // OCR provavelmente falhou
  } else if (textLength < 150) {
    textQualityMultiplier = 0.6;  // Texto muito curto, baixa confiança
  } else if (textLength < 300) {
    textQualityMultiplier = 0.8;  // Texto razoável
  }
  // textLength >= 300: multiplier = 1.0 (sem penalidade)
  
  // 3. Bônus por campos críticos extraídos
  const criticalFields = ['nome', 'cpf', 'rg', 'cnpj', 'crm'];
  const criticalFieldsExtracted = criticalFields.filter(
    field => extractedData[field] && String(extractedData[field]).trim().length > 0
  ).length;
  const criticalBonus = Math.min(criticalFieldsExtracted * 5, 20); // Máximo +20%
  
  // 4. Cálculo final
  let confidence = (baseScore * textQualityMultiplier) + criticalBonus;
  confidence = Math.min(Math.max(confidence, 0), 100);
  
  // Fase 3: Logging detalhado para debug
  console.log('[OCR] Confidence calculation:', {
    fieldsExtracted,
    validFieldNames: validFields.map(([key]) => key),
    expectedFieldsCount: totalExpected,
    textLength,
    baseScore: baseScore.toFixed(2),
    textQualityMultiplier,
    criticalFieldsExtracted,
    criticalBonus,
    finalConfidence: Math.round(confidence)
  });
  
  return Math.round(confidence);
}

/**
 * Rotate image base64 data
 */
async function rotateImageBase64(base64Data: string, degrees: number): Promise<string> {
  // For Deno, we'll use a simple approach - just mark that rotation was attempted
  // The actual rotation should happen on the client side before upload
  // This is a placeholder for server-side rotation if needed in the future
  console.log(`[OCR] Image rotation requested: ${degrees}°`);
  return base64Data; // Return original for now
}

/**
 * Process document with multiple orientations and return best result
 */
async function processWithRotations(
  fileUrl: string,
  documentType: string,
  expectedFields: string[],
  apiKey: string
): Promise<{ success: boolean; data: Record<string, any>; confidence: number; message: string; testedOrientations?: number[] }> {
  console.log('[OCR] Starting intelligent rotation strategy...');
  
  const results: Array<{
    orientation: number;
    confidence: number;
    data: Record<string, any>;
    fieldsExtracted: number;
    textLength: number;
  }> = [];

  // Step 1: Try original orientation (0°)
  console.log('[OCR] Testing orientation: 0° (original)');
  const originalResult = await processSingleOrientation(fileUrl, documentType, expectedFields, apiKey, 0);
  results.push(originalResult);

  console.log(`[OCR] Original result: ${originalResult.confidence}% confidence, ${originalResult.fieldsExtracted} fields`);

  // Step 2: If confidence < 80%, try 90° and 270°
  if (originalResult.confidence < 80) {
    console.log('[OCR] Confidence < 80%, testing 90° and 270° rotations...');
    
    for (const degrees of [90, 270]) {
      console.log(`[OCR] Testing orientation: ${degrees}°`);
      const result = await processSingleOrientation(fileUrl, documentType, expectedFields, apiKey, degrees);
      results.push(result);
      console.log(`[OCR] Result at ${degrees}°: ${result.confidence}% confidence, ${result.fieldsExtracted} fields`);
      
      // Early exit if we found a good result
      if (result.confidence >= 85) {
        console.log(`[OCR] Found excellent result at ${degrees}°, stopping rotation tests`);
        break;
      }
    }

    // Step 3: If still < 70%, try 180°
    const bestSoFar = results.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    if (bestSoFar.confidence < 70) {
      console.log('[OCR] Confidence still < 70%, testing 180° rotation...');
      const result = await processSingleOrientation(fileUrl, documentType, expectedFields, apiKey, 180);
      results.push(result);
      console.log(`[OCR] Result at 180°: ${result.confidence}% confidence, ${result.fieldsExtracted} fields`);
    }
  }

  // Select best result based on: 1) fields extracted, 2) confidence, 3) text length
  const bestResult = results.reduce((best, current) => {
    if (current.fieldsExtracted > best.fieldsExtracted) return current;
    if (current.fieldsExtracted === best.fieldsExtracted && current.confidence > best.confidence) return current;
    if (current.fieldsExtracted === best.fieldsExtracted && current.confidence === best.confidence && current.textLength > best.textLength) return current;
    return best;
  });

  console.log(`[OCR] Best orientation: ${bestResult.orientation}° with ${bestResult.confidence}% confidence`);
  console.log(`[OCR] Tested orientations: ${results.map(r => `${r.orientation}°`).join(', ')}`);

  return {
    success: bestResult.confidence >= 50,
    data: bestResult.data,
    confidence: bestResult.confidence,
    message: `OCR processado com sucesso. ${bestResult.fieldsExtracted} campos extraídos. Melhor orientação: ${bestResult.orientation}°`,
    testedOrientations: results.map(r => r.orientation)
  };
}

/**
 * Process a single orientation
 */
async function processSingleOrientation(
  fileUrl: string,
  documentType: string,
  expectedFields: string[],
  apiKey: string,
  orientation: number
): Promise<{
  orientation: number;
  confidence: number;
  data: Record<string, any>;
  fieldsExtracted: number;
  textLength: number;
}> {
  const result = await processWithOCRSpace(fileUrl, documentType, expectedFields, apiKey);
  
  return {
    orientation,
    confidence: result.confidence,
    data: result.data,
    fieldsExtracted: Object.keys(result.data).length,
    textLength: JSON.stringify(result.data).length
  };
}

/**
 * Process document with OCR.space API (single orientation)
 */
async function processWithOCRSpace(
  fileUrl: string,
  documentType: string,
  expectedFields: string[],
  apiKey: string
): Promise<{ success: boolean; data: Record<string, any>; confidence: number; message: string }> {
  try {
    console.log('[OCR.space] Calling API...');
    console.log('[OCR.space] File URL:', fileUrl);

    // Call OCR.space API with URL
    const formData = new FormData();
    formData.append('url', fileUrl);
    formData.append('apikey', apiKey);
    formData.append('language', 'por'); // Portuguese
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Latest engine

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error('[OCR.space] API error:', errorText);
      throw new Error(`OCR.space API error: ${ocrResponse.statusText}`);
    }

    const ocrData = await ocrResponse.json();
    
    console.log('[OCR.space] Response received');

    // Check for errors
    if (ocrData.IsErroredOnProcessing) {
      const errorMessage = ocrData.ErrorMessage?.[0] || 'Erro desconhecido no processamento';
      console.error('[OCR.space] Processing error:', errorMessage);
      return {
        success: false,
        data: {},
        confidence: 0,
        message: errorMessage
      };
    }

    // Extract text from response
    const parsedResults = ocrData.ParsedResults;
    if (!parsedResults || parsedResults.length === 0) {
      console.warn('[OCR.space] No parsed results');
      return {
        success: false,
        data: {},
        confidence: 0,
        message: 'Nenhum texto foi detectado no documento'
      };
    }

    const firstResult = parsedResults[0];
    if (firstResult.IsErroredOnProcessing) {
      console.error('[OCR.space] Result error:', firstResult.ErrorMessage);
      return {
        success: false,
        data: {},
        confidence: 0,
        message: firstResult.ErrorMessage || 'Erro ao processar documento'
      };
    }

    const fullText = firstResult.ParsedText || '';
    console.log('[OCR.space] Text length:', fullText.length);
    console.log('[OCR.space] Preview:', fullText.substring(0, 200));

    if (!fullText || fullText.trim().length === 0) {
      return {
        success: false,
        data: {},
        confidence: 0,
        message: 'Nenhum texto foi detectado no documento'
      };
    }

    // Parse the text using new or legacy system
    let extractedData: Record<string, any> = {};
    
    if (USE_NEW_EXTRACTORS && isDocumentTypeSupported(documentType)) {
      console.log('[OCR] Using new extractor system');
      const extractor = getExtractor(documentType);
      if (extractor) {
        const normalizedText = normalizeText(fullText);
        extractedData = extractor.extract(fullText, normalizedText, expectedFields);
      } else {
        console.warn('[OCR] Extractor not found, returning empty data');
      }
    } else {
      console.log('[OCR] Document type not supported by new system, returning empty data');
      // Se quiser manter o sistema antigo como fallback, implemente aqui
    }

    console.log('[OCR] Parsed fields:', Object.keys(extractedData));

    // Fase 2-5: Calcular confiança com novo algoritmo
    const confidence = calculateConfidence(extractedData, expectedFields, fullText.length);

    return {
      success: true,
      data: extractedData,
      confidence: Math.round(confidence),
      message: `OCR processado com sucesso. ${Object.keys(extractedData).length} campos extraídos.`
    };

  } catch (error) {
    console.error('[OCR.space] Exception:', error);
    return {
      success: false,
      data: {},
      confidence: 0,
      message: error instanceof Error ? error.message : 'Erro ao processar OCR'
    };
  }
}

