import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('Processing OCR request:', {
      fileUrl,
      documentType,
      expectedFields: expectedFields.length
    });

    // Get OCR.space API key
    const apiKey = Deno.env.get('OCRSPACE_API_KEY');
    if (!apiKey) {
      console.error('OCR.space API key not configured');
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

    console.log('OCR processing completed:', {
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
    console.error('Error processing OCR:', error);
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
    console.log('Calling OCR.space API...');
    console.log('File URL:', fileUrl);

    // Call OCR.space API with URL (no need for base64 conversion)
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
      console.error('OCR.space API error:', errorText);
      throw new Error(`OCR.space API error: ${ocrResponse.statusText}`);
    }

    const ocrData = await ocrResponse.json();
    
    console.log('OCR.space response:', JSON.stringify(ocrData, null, 2));

    // Check for errors
    if (ocrData.IsErroredOnProcessing) {
      const errorMessage = ocrData.ErrorMessage?.[0] || 'Erro desconhecido no processamento';
      console.error('OCR.space processing error:', errorMessage);
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
      console.warn('No parsed results from OCR.space');
      return {
        success: false,
        data: {},
        confidence: 0,
        message: 'Nenhum texto foi detectado no documento'
      };
    }

    const firstResult = parsedResults[0];
    if (firstResult.IsErroredOnProcessing) {
      console.error('OCR.space result error:', firstResult.ErrorMessage);
      return {
        success: false,
        data: {},
        confidence: 0,
        message: firstResult.ErrorMessage || 'Erro ao processar documento'
      };
    }

    const fullText = firstResult.ParsedText || '';
    console.log('Extracted text length:', fullText.length);
    console.log('First 200 chars:', fullText.substring(0, 200));

    if (!fullText || fullText.trim().length === 0) {
      return {
        success: false,
        data: {},
        confidence: 0,
        message: 'Nenhum texto foi detectado no documento'
      };
    }

    // Parse the text based on document type
    const extractedData = parseDocumentText(fullText, documentType, expectedFields);

    console.log('Parsed fields:', Object.keys(extractedData));

    // Calculate confidence based on text length and fields extracted
    // OCR.space doesn't provide confidence scores, so we estimate:
    // - Good text extraction (>100 chars) + fields found = 85%
    // - Good text extraction + some fields = 75%
    // - Minimal text or no fields = 60%
    const textLength = fullText.length;
    const fieldsExtracted = Object.keys(extractedData).length;
    
    let confidence = 60;
    if (textLength > 100 && fieldsExtracted >= expectedFields.length * 0.8) {
      confidence = 85;
    } else if (textLength > 50 && fieldsExtracted > 0) {
      confidence = 75;
    } else if (fieldsExtracted > 0) {
      confidence = 70;
    }

    return {
      success: true,
      data: extractedData,
      confidence,
      message: `OCR processado com sucesso. ${Object.keys(extractedData).length} campos extraídos.`
    };

  } catch (error) {
    console.error('Error processing OCR:', error);
    return {
      success: false,
      data: {},
      confidence: 0,
      message: error instanceof Error ? error.message : 'Erro ao processar OCR'
    };
  }
}

/**
 * Parse extracted text based on Brazilian document types
 */
function parseDocumentText(
  text: string,
  documentType: string,
  expectedFields: string[]
): Record<string, any> {
  const data: Record<string, any> = {};
  
  console.log('Parsing document type:', documentType);
  console.log('Expected fields:', expectedFields);
  console.log('Raw text (first 300 chars):', text.substring(0, 300));
  
  // Normalize text - remove special chars but keep structure
  const normalizedText = text
    .replace(/[•\[\]]/g, '') // Remove bullets and brackets
    .replace(/\s+/g, ' ')     // Normalize multiple spaces
    .trim();

  console.log('Normalized text (first 300 chars):', normalizedText.substring(0, 300));

  switch (documentType) {
    case 'rg':
      // RG patterns
      if (expectedFields.includes('nome')) {
        const nomeMatch = normalizedText.match(/(?:nome|name)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\s+(?:filiac|nasc|rg|doc|nat))/i);
        if (nomeMatch) data.nome = nomeMatch[1].trim();
      }
      if (expectedFields.includes('rg')) {
        const rgMatch = normalizedText.match(/(?:rg|registro)[:\s#]*([0-9.]{7,15})/i);
        if (rgMatch) data.rg = rgMatch[1].replace(/\D/g, '');
      }
      if (expectedFields.includes('cpf')) {
        const cpfMatch = normalizedText.match(/(?:cpf)[:\s]*([0-9.]{11,14})/i);
        if (cpfMatch) data.cpf = cpfMatch[1];
      }
      if (expectedFields.includes('data_nascimento')) {
        const dataMatch = normalizedText.match(/(?:nasc|nascimento)[:\s]*([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4})/i);
        if (dataMatch) data.data_nascimento = dataMatch[1];
      }
      if (expectedFields.includes('orgao_emissor')) {
        const orgaoMatch = normalizedText.match(/(?:orgao|órgão|emissor)[:\s]*([A-Z]{2,10}[\/\-]?[A-Z]{2})/i);
        if (orgaoMatch) data.orgao_emissor = orgaoMatch[1];
      }
      break;

    case 'cnh':
      console.log('[CNH] Starting CNH field extraction...');
      
      // Nome - after "NOME" marker with flexible spacing
      if (expectedFields.includes('nome')) {
        let nomeMatch = normalizedText.match(/(?:NOME|Nome)\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s+(?:DOC|IDENTIDADE|CPF|FILIAÇÃO|FILIACAO|DATA|RG|\d))/i);
        if (nomeMatch) {
          data.nome = nomeMatch[1].trim();
          console.log(`[CNH] ✓ Nome found: ${data.nome}`);
        } else {
          console.log('[CNH] ✗ Nome not found');
        }
      }
      
      // CPF - with or without formatting, may have bracket at start
      if (expectedFields.includes('cpf')) {
        // First try to match formatted CPF
        let cpfMatch = normalizedText.match(/(\d{3}\.?\d{3}\.?\d{3}[\-\.]?\d{2})/);
        if (cpfMatch) {
          data.cpf = cpfMatch[1].replace(/[^\d]/g, '');
          console.log(`[CNH] ✓ CPF found: ${data.cpf}`);
        } else {
          console.log('[CNH] ✗ CPF not found');
        }
      }
      
      // Número CNH - 11 digit sequence without formatting
      if (expectedFields.includes('numero_cnh')) {
        // Try multiple patterns
        let cnhMatch = normalizedText.match(/(?:REGISTRO|LAI|MAIS|EN REGISIRO)\s+(\d{11})/i) || 
                       normalizedText.match(/\b(\d{11})\b/);
        if (cnhMatch) {
          data.numero_cnh = cnhMatch[1];
          console.log(`[CNH] ✓ Número CNH found: ${data.numero_cnh}`);
        } else {
          console.log('[CNH] ✗ Número CNH not found');
        }
      }
      
      // Data de nascimento - DD/MM/YYYY format
      if (expectedFields.includes('data_nascimento')) {
        let dataMatch = normalizedText.match(/(?:DATA NASCIMENTO|NASCIMENTO|NASC)[:\s\-~]*(\d{2}\/\d{2}\/\d{4})/i);
        if (dataMatch) {
          data.data_nascimento = dataMatch[1];
          console.log(`[CNH] ✓ Data nascimento found: ${data.data_nascimento}`);
        } else {
          console.log('[CNH] ✗ Data nascimento not found');
        }
      }
      
      // Categoria - one or more letters A-E
      if (expectedFields.includes('categoria')) {
        let catMatch = normalizedText.match(/(?:CATEGORIA|CAT)[:\s]+([A-E]+)/i) ||
                       normalizedText.match(/\b([A-E]{1,3})\b/);
        if (catMatch) {
          data.categoria = catMatch[1];
          console.log(`[CNH] ✓ Categoria found: ${data.categoria}`);
        } else {
          console.log('[CNH] ✗ Categoria not found');
        }
      }
      
      // Validade
      if (expectedFields.includes('validade')) {
        let validadeMatch = normalizedText.match(/(?:VALIDADE|E VALDADE|VALDADE)[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
        if (validadeMatch) {
          data.validade = validadeMatch[1];
          console.log(`[CNH] ✓ Validade found: ${data.validade}`);
        } else {
          console.log('[CNH] ✗ Validade not found');
        }
      }
      
      console.log(`[CNH] Extraction complete. Fields found: ${Object.keys(data).length}`);
      break;

    case 'cpf':
      if (expectedFields.includes('nome')) {
        const nomeMatch = normalizedText.match(/(?:nome|name)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\s+(?:cpf|nasc))/i);
        if (nomeMatch) data.nome = nomeMatch[1].trim();
      }
      if (expectedFields.includes('cpf')) {
        const cpfMatch = normalizedText.match(/([0-9]{3}[.\-]?[0-9]{3}[.\-]?[0-9]{3}[.\-]?[0-9]{2})/);
        if (cpfMatch) data.cpf = cpfMatch[1];
      }
      if (expectedFields.includes('data_nascimento')) {
        const dataMatch = normalizedText.match(/(?:nasc|nascimento)[:\s]*([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4})/i);
        if (dataMatch) data.data_nascimento = dataMatch[1];
      }
      break;

    case 'crm':
      if (expectedFields.includes('nome')) {
        const nomeMatch = normalizedText.match(/(?:nome|médico|medico)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\s+(?:crm|espec))/i);
        if (nomeMatch) data.nome = nomeMatch[1].trim();
      }
      if (expectedFields.includes('crm')) {
        const crmMatch = normalizedText.match(/(?:crm)[:\s#]*([0-9]{4,8})/i);
        if (crmMatch) data.crm = crmMatch[1];
      }
      if (expectedFields.includes('uf_crm')) {
        const ufMatch = normalizedText.match(/(?:crm[:\s#]*[0-9]{4,8}[\s\-\/]*)([A-Z]{2})/i);
        if (ufMatch) data.uf_crm = ufMatch[1];
      }
      if (expectedFields.includes('especialidades')) {
        const especMatch = normalizedText.match(/(?:especialidade|espec)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s,]+)/i);
        if (especMatch) {
          data.especialidades = especMatch[1].split(',').map(e => e.trim());
        }
      }
      break;

    case 'cnpj':
      if (expectedFields.includes('razao_social')) {
        const razaoMatch = normalizedText.match(/(?:razão|razao|empresa)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\s+(?:cnpj|end))/i);
        if (razaoMatch) data.razao_social = razaoMatch[1].trim();
      }
      if (expectedFields.includes('cnpj')) {
        const cnpjMatch = normalizedText.match(/([0-9]{2}[.\-\/]?[0-9]{3}[.\-\/]?[0-9]{3}[.\-\/]?[0-9]{4}[.\-\/]?[0-9]{2})/);
        if (cnpjMatch) data.cnpj = cnpjMatch[1];
      }
      if (expectedFields.includes('endereco')) {
        const endMatch = normalizedText.match(/(?:endereço|endereco|rua|av)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9\s,.-]+?)(?:\s+(?:cep|cidade|estado))/i);
        if (endMatch) data.endereco = endMatch[1].trim();
      }
      break;

    case 'comprovante_endereco':
      if (expectedFields.includes('nome')) {
        const nomeMatch = normalizedText.match(/(?:nome|destinatário|destinatario)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\s+(?:end|rua|av|cep))/i);
        if (nomeMatch) data.nome = nomeMatch[1].trim();
      }
      if (expectedFields.includes('logradouro')) {
        const logMatch = normalizedText.match(/(?:rua|av|avenida|travessa)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\s*[,\d])/i);
        if (logMatch) data.logradouro = logMatch[1].trim();
      }
      if (expectedFields.includes('cep')) {
        const cepMatch = normalizedText.match(/([0-9]{5}[\-\.]?[0-9]{3})/);
        if (cepMatch) data.cep = cepMatch[1];
      }
      if (expectedFields.includes('cidade')) {
        const cidadeMatch = normalizedText.match(/(?:cidade)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\s+(?:estado|uf|cep))/i);
        if (cidadeMatch) data.cidade = cidadeMatch[1].trim();
      }
      if (expectedFields.includes('estado')) {
        const estadoMatch = normalizedText.match(/(?:estado|uf)[:\s]+([A-Z]{2})/i);
        if (estadoMatch) data.estado = estadoMatch[1];
      }
      break;

    case 'diploma':
      if (expectedFields.includes('nome')) {
        const nomeMatch = normalizedText.match(/(?:outorga|confere|nome)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\s+(?:curso|grau))/i);
        if (nomeMatch) data.nome = nomeMatch[1].trim();
      }
      if (expectedFields.includes('curso')) {
        const cursoMatch = normalizedText.match(/(?:curso|graduação|graduacao)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\s+(?:instituição|instituicao|data))/i);
        if (cursoMatch) data.curso = cursoMatch[1].trim();
      }
      if (expectedFields.includes('instituicao')) {
        const instMatch = normalizedText.match(/(?:instituição|instituicao|universidade)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\s+(?:data|em))/i);
        if (instMatch) data.instituicao = instMatch[1].trim();
      }
      if (expectedFields.includes('data_conclusao')) {
        const dataMatch = normalizedText.match(/(?:conclusão|conclusao|data)[:\s]*([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4})/i);
        if (dataMatch) data.data_conclusao = dataMatch[1];
      }
      break;

    case 'certidao':
      if (expectedFields.includes('nome')) {
        const nomeMatch = normalizedText.match(/(?:nome|registro)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\s+(?:filho|data|cert))/i);
        if (nomeMatch) data.nome = nomeMatch[1].trim();
      }
      if (expectedFields.includes('tipo_certidao')) {
        const tipoMatch = normalizedText.match(/(?:certidão|certidao)[:\s]+(?:de\s+)?([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\s+(?:livro|folha|data))/i);
        if (tipoMatch) data.tipo_certidao = tipoMatch[1].trim();
      }
      if (expectedFields.includes('data_emissao')) {
        const dataMatch = normalizedText.match(/(?:emissão|emissao|expedição|expedicao)[:\s]*([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4})/i);
        if (dataMatch) data.data_emissao = dataMatch[1];
      }
      break;

    default:
      console.warn('Unknown document type:', documentType);
  }

  // Filter only expected fields
  const filteredData: Record<string, any> = {};
  for (const field of expectedFields) {
    if (field in data) {
      filteredData[field] = data[field];
    }
  }

  return filteredData;
}

/**
 * EXEMPLO DE RESPOSTA OCR.space:
 * 
 * {
 *   "ParsedResults": [
 *     {
 *       "ParsedText": "NOME COMPLETO\nCPF 123.456.789-00\nRG 12.345.678-9",
 *       "ErrorMessage": "",
 *       "ErrorDetails": "",
 *       "FileParseExitCode": 1,
 *       "IsErroredOnProcessing": false
 *     }
 *   ],
 *   "OCRExitCode": 1,
 *   "IsErroredOnProcessing": false,
 *   "ProcessingTimeInMilliseconds": "3547"
 * }
 * 
 * DOCUMENTAÇÃO: https://ocr.space/ocrapi
 * 
 * RATE LIMITS (Free Tier):
 * - 25,000 requests/month
 * - 500 requests/hour
 * - Max file size: 1MB (free), 5MB (paid)
 */
