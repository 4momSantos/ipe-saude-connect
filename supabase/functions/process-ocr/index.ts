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

    const { fileUrl, documentType, expectedFields }: OCRRequest = await req.json();

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

    // Process OCR with OCR.space
    const ocrResult = await processWithOCRSpace(fileUrl, documentType, expectedFields, apiKey);

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
 * Process document with OCR.space API
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

    // Calculate confidence based on text length and fields extracted
    const textLength = fullText.length;
    const fieldsExtracted = Object.keys(extractedData).length;
    const totalExpected = expectedFields?.length || 5;
    
    let confidence = (fieldsExtracted / totalExpected) * 100;
    if (textLength < 50) confidence *= 0.5;
    else if (textLength < 100) confidence *= 0.7;
    
    confidence = Math.min(Math.max(confidence, 0), 100);

    return {
      success: true,
      data: extractedData,
      confidence: Math.round(confidence),
      message: `OCR processado com sucesso. ${fieldsExtracted} campos extraídos.`
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

