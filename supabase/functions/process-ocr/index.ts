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
      console.log('[RG] Starting RG field extraction...');
      
      // Nome completo - Múltiplas tentativas
      if (expectedFields.includes('nome')) {
        let nomeMatch = normalizedText.match(/(?:NOME|NOME\s+COMPLETO|TITULAR)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*(?:FILIACAO|FILIAÇÃO|NASCIMENTO|RG|CPF|DOCUMENTO|\d))/i);
        if (!nomeMatch) {
          // Fallback 1: Após "NOME" sem dois pontos
          nomeMatch = normalizedText.match(/NOME\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)(?=\s*(?:FILIACAO|FILIAÇÃO|CPF|RG))/i);
        }
        if (!nomeMatch) {
          // Fallback 2: Nome no início do documento
          nomeMatch = normalizedText.match(/^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)(?=\s*(?:RG|CPF|FILIACAO))/i);
        }
        if (nomeMatch) {
          data.nome = nomeMatch[1].trim();
          console.log(`[RG] ✓ Nome found: ${data.nome}`);
        } else {
          console.log('[RG] ✗ Nome not found');
        }
      }
      
      // Número do RG - Múltiplas tentativas
      if (expectedFields.includes('rg')) {
        let rgMatch = normalizedText.match(/(?:RG|REGISTRO\s+GERAL|REGISTRO\s*GERAL|IDENTIDADE)[:\s#\-]*(\d{1,2}\.?\d{3}\.?\d{3}[\-\.]?\d{1,2})/i);
        if (!rgMatch) {
          // Fallback 1: Após "GERAL" sem marcador
          rgMatch = normalizedText.match(/GERAL\s+(\d{1,2}\.?\d{3}\.?\d{3}[\-\.]?\d{1,2})/i);
        }
        if (!rgMatch) {
          // Fallback 2: Sequência de 7-10 dígitos com pontos/traços (evitar CPF)
          const matches = normalizedText.match(/\b(\d{1,2}\.?\d{3}\.?\d{3}[\-\.]?\d{1,2})\b/g);
          if (matches && matches.length > 0) {
            // Pegar o primeiro que não seja CPF (11 dígitos)
            for (const match of matches) {
              const digitsOnly = match.replace(/\D/g, '');
              if (digitsOnly.length >= 7 && digitsOnly.length <= 10) {
                rgMatch = [match, match];
                break;
              }
            }
          }
        }
        if (rgMatch) {
          data.rg = rgMatch[1].replace(/\D/g, '');
          console.log(`[RG] ✓ RG found: ${data.rg}`);
        } else {
          console.log('[RG] ✗ RG not found');
        }
      }
      
      // CPF - Múltiplas tentativas com fallbacks refinados
      if (expectedFields.includes('cpf')) {
        let cpfMatch = normalizedText.match(/(?:CPF|REGISTRO\s+GERAL[\-\s]*CPF)[:\s]*(\d{3}\.?\d{3}\.?\d{3}[\-\.]?\d{2})/i);
        if (!cpfMatch) {
          // Fallback 1: Padrão XXX.XXX.XXX-XX isolado
          cpfMatch = normalizedText.match(/\b(\d{3}\.\d{3}\.\d{3}[\-]\d{2})\b/);
        }
        if (!cpfMatch) {
          // Fallback 2: CPF próximo a "DATA DE NASCIMENTO" (comum no verso)
          cpfMatch = normalizedText.match(/(?:DATA\s+DE\s+NASCIMENTO|NASCIMENTO|NASC)[\s\S]{0,100}?(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\.\s]?\d{2})/i);
        }
        if (!cpfMatch) {
          // Fallback 3: CPF após "NATURALIDADE" ou "FILIAÇÃO" (comum no verso)
          cpfMatch = normalizedText.match(/(?:NATURALIDADE|FILIAÇÃO|FILIACAO|MÃE|PAI)[\s\S]{0,200}?(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\.\s]?\d{2})/i);
        }
        if (!cpfMatch) {
          // Fallback 4: CPF isolado em linha própria (com quebras de linha)
          cpfMatch = text.match(/^\s*(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\.\s]?\d{2})\s*$/m);
        }
        if (!cpfMatch) {
          // Fallback 5: CPF no final do documento (últimas 300 caracteres - verso inferior direito)
          const lastChars = normalizedText.slice(-300);
          cpfMatch = lastChars.match(/\b(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\.\s]?\d{2})\b/);
        }
        if (!cpfMatch) {
          // Fallback 6: Qualquer sequência de 11 dígitos com pontos/traço/espaços
          const matches = normalizedText.match(/\b(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\.\s]?\d{2})\b/g);
          if (matches && matches.length > 0) {
            // Pegar o que tem exatamente 11 dígitos
            for (const match of matches) {
              const digitsOnly = match.replace(/\D/g, '');
              if (digitsOnly.length === 11) {
                cpfMatch = [match, match];
                break;
              }
            }
          }
        }
        if (cpfMatch) {
          data.cpf = cpfMatch[1].replace(/[^\d]/g, '');
          console.log(`[RG] ✓ CPF found: ${data.cpf}`);
        } else {
          console.log('[RG] ✗ CPF not found');
        }
      }
      
      // Data de nascimento - Múltiplas tentativas
      if (expectedFields.includes('data_nascimento')) {
        let dataMatch = normalizedText.match(/(?:DATA\s+DE\s+NASCIMENTO|NASCIMENTO|NASC)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (!dataMatch) {
          // Fallback 1: Formato DD/MMM/AAAA
          dataMatch = normalizedText.match(/\b(\d{2}\/(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\/\d{4})\b/i);
        }
        if (!dataMatch) {
          // Fallback 2: Após "BIRTH" ou "NASCIMENTO" sem dois pontos
          dataMatch = normalizedText.match(/(?:BIRTH|NASCIMENTO)\s+(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        }
        if (!dataMatch) {
          // Fallback 3: Procurar padrão de data isolado (evitar datas de emissão)
          const matches = normalizedText.match(/\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/g);
          if (matches && matches.length > 0) {
            // Pegar a primeira data que parece ser de nascimento (1950-2010)
            for (const match of matches) {
              const year = parseInt(match.split(/[\/\-]/)[2]);
              if (year >= 1950 && year <= 2010) {
                dataMatch = [match, match];
                break;
              }
            }
          }
        }
        if (dataMatch) {
          data.data_nascimento = dataMatch[1];
          console.log(`[RG] ✓ Data nascimento found: ${data.data_nascimento}`);
        } else {
          console.log('[RG] ✗ Data nascimento not found');
        }
      }
      
      // Órgão emissor - Múltiplas tentativas
      if (expectedFields.includes('orgao_emissor')) {
        let orgaoMatch = normalizedText.match(/(?:ORGAO\s+EMISSOR|ÓRGÃO\s+EMISSOR|EMISSOR)[:\s]*([A-Z]{2,10}[\/\-\s]?[A-Z]{2})\b/i);
        if (!orgaoMatch) {
          // Fallback 1: SSP/UF ou SSP UF
          orgaoMatch = normalizedText.match(/\b(SSP|PC|PM|DETRAN|IFP|IIRGD)[\s\/\-]*(SP|RJ|MG|BA|RS|PR|SC|PE|CE|PA|MA|GO|MT|MS|DF|ES|RN|PB|PI|AL|SE|RO|AC|AM|RR|AP|TO)\b/i);
          if (orgaoMatch) orgaoMatch[1] = `${orgaoMatch[1]}/${orgaoMatch[2]}`;
        }
        if (!orgaoMatch) {
          // Fallback 2: Estado + "SECRETARIA" indica SSP do estado
          const estadoMatch = normalizedText.match(/ESTADO\s+DE\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*SECRETARIA)/i);
          if (estadoMatch) {
            const estadosMap: Record<string, string> = {
              'SÃO PAULO': 'SSP/SP',
              'RIO DE JANEIRO': 'SSP/RJ',
              'MINAS GERAIS': 'SSP/MG',
              'MATO GROSSO DO SUL': 'SSP/MS',
              'BAHIA': 'SSP/BA',
              'RIO GRANDE DO SUL': 'SSP/RS'
            };
            const nomeEstado = estadoMatch[1].trim().toUpperCase();
            if (estadosMap[nomeEstado]) {
              orgaoMatch = [estadosMap[nomeEstado], estadosMap[nomeEstado]];
            }
          }
        }
        if (orgaoMatch) {
          data.orgao_emissor = orgaoMatch[1].toUpperCase();
          console.log(`[RG] ✓ Órgão emissor found: ${data.orgao_emissor}`);
        } else {
          console.log('[RG] ✗ Órgão emissor not found');
        }
      }
      
      // Data de emissão - Múltiplas tentativas
      if (expectedFields.includes('data_emissao')) {
        let dataEmissaoMatch = normalizedText.match(/(?:EMISSAO|EMISSÃO|EXPEDIÇÃO|EXPEDICAO|DATA\s+EXPEDIÇÃO)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (!dataEmissaoMatch) {
          // Fallback 1: Formato DD/MMM/AAAA
          dataEmissaoMatch = normalizedText.match(/(?:EMISSAO|DEPLOAD)\s+(\d{2}\/(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\/\d{4})/i);
        }
        if (!dataEmissaoMatch) {
          // Fallback 2: Procurar data mais recente (após 2000)
          const matches = normalizedText.match(/\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/g);
          if (matches && matches.length > 0) {
            for (const match of matches) {
              const year = parseInt(match.split(/[\/\-]/)[2]);
              if (year >= 2000 && year <= new Date().getFullYear()) {
                dataEmissaoMatch = [match, match];
                break;
              }
            }
          }
        }
        if (dataEmissaoMatch) {
          data.data_emissao = dataEmissaoMatch[1];
          console.log(`[RG] ✓ Data emissão found: ${data.data_emissao}`);
        } else {
          console.log('[RG] ✗ Data emissão not found');
        }
      }
      
      // Filiação (pai e mãe) - Múltiplas tentativas
      if (expectedFields.includes('filiacao')) {
        let filiacaoMatch = normalizedText.match(/(?:FILIACAO|FILIAÇÃO)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s,]+?)(?=\s*(?:NATURALIDADE|RG|CPF|NASCIMENTO|DOC\.))/i);
        if (!filiacaoMatch) {
          // Fallback 1: Capturar nomes após FILIAÇÃO até próximo campo
          filiacaoMatch = normalizedText.match(/FILIAÇÃO\s+((?:[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+\s*){2,})(?=\s*(?:NATURALIDADE|DOC|CARTÓRIO))/i);
        }
        if (filiacaoMatch) {
          data.filiacao = filiacaoMatch[1].trim();
          console.log(`[RG] ✓ Filiação found: ${data.filiacao}`);
        } else {
          console.log('[RG] ✗ Filiação not found');
        }
      }
      
      console.log(`[RG] Extraction complete. Fields found: ${Object.keys(data).length}`);
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
      console.log('[CPF] Starting CPF field extraction...');
      
      // Nome completo
      if (expectedFields.includes('nome')) {
        let nomeMatch = normalizedText.match(/(?:NOME|NOME\s+COMPLETO|TITULAR)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*(?:CPF|NASCIMENTO|SITUACAO|DATA|\d))/i);
        if (!nomeMatch) {
          // Fallback: capturar nome no início
          nomeMatch = normalizedText.match(/^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)(?=\s*(?:CPF|\d{3}\.))/i);
        }
        if (nomeMatch) {
          data.nome = nomeMatch[1].trim();
          console.log(`[CPF] ✓ Nome found: ${data.nome}`);
        } else {
          console.log('[CPF] ✗ Nome not found');
        }
      }
      
      // Número do CPF
      if (expectedFields.includes('cpf')) {
        let cpfMatch = normalizedText.match(/(?:CPF|CADASTRO)[:\s#\-]*(\d{3}\.?\d{3}\.?\d{3}[\-\.]?\d{2})/i);
        if (!cpfMatch) {
          // Fallback: procurar padrão de CPF isolado
          cpfMatch = normalizedText.match(/\b(\d{3}\.?\d{3}\.?\d{3}[\-\.]?\d{2})\b/);
        }
        if (cpfMatch) {
          data.cpf = cpfMatch[1].replace(/[^\d]/g, '');
          console.log(`[CPF] ✓ CPF found: ${data.cpf}`);
        } else {
          console.log('[CPF] ✗ CPF not found');
        }
      }
      
      // Data de nascimento
      if (expectedFields.includes('data_nascimento')) {
        let dataMatch = normalizedText.match(/(?:NASCIMENTO|NASC|DATA\s+DE\s+NASCIMENTO)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (!dataMatch) {
          dataMatch = normalizedText.match(/\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/);
        }
        if (dataMatch) {
          data.data_nascimento = dataMatch[1];
          console.log(`[CPF] ✓ Data nascimento found: ${data.data_nascimento}`);
        } else {
          console.log('[CPF] ✗ Data nascimento not found');
        }
      }
      
      // Situação cadastral
      if (expectedFields.includes('situacao')) {
        const situacaoMatch = normalizedText.match(/(?:SITUACAO|SITUAÇÃO)[:\s]+(REGULAR|IRREGULAR|SUSPENSA|CANCELADA|NULA|PENDENTE)/i);
        if (situacaoMatch) {
          data.situacao = situacaoMatch[1].toUpperCase();
          console.log(`[CPF] ✓ Situação found: ${data.situacao}`);
        }
      }
      
      // Data de emissão do comprovante
      if (expectedFields.includes('data_emissao')) {
        const dataEmissaoMatch = normalizedText.match(/(?:EMISSAO|EMISSÃO|EMITIDO)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (dataEmissaoMatch) {
          data.data_emissao = dataEmissaoMatch[1];
          console.log(`[CPF] ✓ Data emissão found: ${data.data_emissao}`);
        }
      }
      
      console.log(`[CPF] Extraction complete. Fields found: ${Object.keys(data).length}`);
      break;

    case 'crm':
      console.log('[CRM] Starting CRM field extraction...');
      
      // Nome do médico - after NOME/MÉDICO marker
      if (expectedFields.includes('nome')) {
        let nomeMatch = normalizedText.match(/(?:NOME|MÉDICO|MEDICO|PROFISSIONAL)\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s+(?:CRM|CPF|RG|ESPECIALIDADE|CONSELHO|\d))/i);
        if (!nomeMatch) {
          // Fallback: try to capture full name at start
          nomeMatch = normalizedText.match(/^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,50}?)(?=\s+(?:CRM|CPF|RG))/i);
        }
        if (nomeMatch) {
          data.nome = nomeMatch[1].trim();
          console.log(`[CRM] ✓ Nome found: ${data.nome}`);
        } else {
          console.log('[CRM] ✗ Nome not found');
        }
      }
      
      // Número do CRM - 4 to 8 digits
      if (expectedFields.includes('crm')) {
        let crmMatch = normalizedText.match(/(?:CRM|REGISTRO|Nº|NUMERO)[:\s#\-\/]*(\d{4,8})/i);
        if (!crmMatch) {
          // Fallback: find sequence after CRM word
          crmMatch = normalizedText.match(/CRM[:\s#\-\/]*([A-Z]{2})?[:\s#\-\/]*(\d{4,8})/i);
          if (crmMatch) crmMatch[1] = crmMatch[2]; // Use second capture group
        }
        if (crmMatch) {
          data.crm = crmMatch[1];
          console.log(`[CRM] ✓ Número CRM found: ${data.crm}`);
        } else {
          console.log('[CRM] ✗ Número CRM not found');
        }
      }
      
      // UF do CRM - 2 uppercase letters
      if (expectedFields.includes('uf_crm')) {
        let ufMatch = normalizedText.match(/CRM[:\s#\-\/]*([A-Z]{2})[:\s#\-\/]*\d{4,8}/i);
        if (!ufMatch) {
          // Fallback: UF after CRM number
          ufMatch = normalizedText.match(/CRM[:\s#\-\/]*\d{4,8}[:\s#\-\/]*([A-Z]{2})/i);
        }
        if (!ufMatch) {
          // Fallback: isolated 2 uppercase letters near CRM
          ufMatch = normalizedText.match(/\b([A-Z]{2})\b.*?CRM|CRM.*?\b([A-Z]{2})\b/i);
          if (ufMatch) ufMatch[1] = ufMatch[1] || ufMatch[2];
        }
        if (ufMatch) {
          data.uf_crm = ufMatch[1].toUpperCase();
          console.log(`[CRM] ✓ UF found: ${data.uf_crm}`);
        } else {
          console.log('[CRM] ✗ UF not found');
        }
      }
      
      // Especialidades - multiple specialties
      if (expectedFields.includes('especialidades')) {
        let especMatch = normalizedText.match(/(?:ESPECIALIDADE|ESPECIALIDADES|ÁREA|TITULO|RQE)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s,\/\-]+?)(?=\s+(?:CRM|CPF|RG|RQE\s*\d|\d{4,}))/i);
        if (especMatch) {
          // Split by common separators
          const especialidades = especMatch[1]
            .split(/[,\/\n]/)
            .map(e => e.trim())
            .filter(e => e.length > 3); // Filter out short strings
          data.especialidades = especialidades;
          console.log(`[CRM] ✓ Especialidades found: ${especialidades.join(', ')}`);
        } else {
          console.log('[CRM] ✗ Especialidades not found');
        }
      }
      
      // CPF (opcional)
      if (expectedFields.includes('cpf')) {
        let cpfMatch = normalizedText.match(/(\d{3}\.?\d{3}\.?\d{3}[\-\.]?\d{2})/);
        if (cpfMatch) {
          data.cpf = cpfMatch[1].replace(/[^\d]/g, '');
          console.log(`[CRM] ✓ CPF found: ${data.cpf}`);
        }
      }
      
      console.log(`[CRM] Extraction complete. Fields found: ${Object.keys(data).length}`);
      break;

    case 'cnpj':
      console.log('[CNPJ] Starting CNPJ field extraction...');
      
      // CNPJ - formato XX.XXX.XXX/XXXX-XX com múltiplos fallbacks
      if (expectedFields.includes('cnpj')) {
        let cnpjMatch = normalizedText.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}[\-\.]?\d{2})/);
        if (!cnpjMatch) {
          // Fallback 1: 14 dígitos sem formatação
          cnpjMatch = normalizedText.match(/\b(\d{14})\b/);
        }
        if (!cnpjMatch) {
          // Fallback 2: formato com espaços
          cnpjMatch = normalizedText.match(/(\d{2}\s+\d{3}\s+\d{3}\s+\d{4}\s+\d{2})/);
        }
        if (cnpjMatch) {
          data.cnpj = cnpjMatch[1].replace(/[^\d]/g, '');
          console.log(`[CNPJ] ✓ CNPJ found: ${data.cnpj}`);
        } else {
          console.log('[CNPJ] ✗ CNPJ not found');
        }
      }
      
      // Razão Social com fallbacks
      if (expectedFields.includes('razao_social')) {
        let razaoMatch = normalizedText.match(/(?:RAZAO\s*SOCIAL|NOME\s*EMPRESARIAL|FIRMA)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9\s&\-\.]+?)(?=\s*(?:NOME\s*FANTASIA|CNPJ|CNAE|SITUACAO|ENDERECO|\n\n))/i);
        if (!razaoMatch) {
          // Fallback 1: texto maiúsculo longo no início
          razaoMatch = normalizedText.match(/^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s&\-\.]{10,80}?)(?=\s*(?:CNPJ|\d{2}\.\d{3}))/im);
        }
        if (!razaoMatch) {
          // Fallback 2: linha antes de CNPJ
          razaoMatch = normalizedText.match(/([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s&\-\.]{10,80}?)\s*(?=CNPJ|\d{2}\.\d{3}\.\d{3})/i);
        }
        if (razaoMatch) {
          data.razao_social = razaoMatch[1].trim();
          console.log(`[CNPJ] ✓ Razão Social found: ${data.razao_social}`);
        } else {
          console.log('[CNPJ] ✗ Razão Social not found');
        }
      }
      
      // Nome Fantasia com tratamento de ausência
      if (expectedFields.includes('nome_fantasia')) {
        let fantasiaMatch = normalizedText.match(/(?:NOME\s*FANTASIA|FANTASIA)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9\s&\-\.]+?)(?=\s*(?:CNPJ|CNAE|SITUACAO|ENDERECO|\n\n))/i);
        if (fantasiaMatch) {
          const fantasia = fantasiaMatch[1].trim();
          // Verificar indicadores de ausência
          if (/\*\*\*|NAO\s*INFORMAD|IDEM|SEM\s*NOME\s*FANTASIA/i.test(fantasia)) {
            data.nome_fantasia = null;
            console.log('[CNPJ] Nome Fantasia: nao informado');
          } else {
            data.nome_fantasia = fantasia;
            console.log(`[CNPJ] Nome Fantasia found: ${data.nome_fantasia}`);
          }
        }
      }
      
      // Tipo de Empresa (MEI, LTDA, SA, EIRELI)
      if (expectedFields.includes('tipo_empresa')) {
        const tipoMatch = normalizedText.match(/\b(MEI|LTDA|S\.?A\.?|EIRELI|EPP|ME)\b/i);
        if (tipoMatch) {
          data.tipo_empresa = tipoMatch[1].toUpperCase();
          console.log(`[CNPJ] ✓ Tipo Empresa found: ${data.tipo_empresa}`);
        }
      }
      
      // Situação Cadastral com fallback e normalização
      if (expectedFields.includes('situacao_cadastral')) {
        let situacaoMatch = normalizedText.match(/(?:SITUACAO\s*CADASTRAL|STATUS)[:\s]+(ATIVA|ACTIVA|REGULAR|SUSPENSA|INAPTA|BAIXADA|NULA)/i);
        if (!situacaoMatch) {
          // Fallback: palavra isolada
          situacaoMatch = normalizedText.match(/\b(ATIVA|ACTIVA|SUSPENSA|INAPTA|BAIXADA)\b/i);
        }
        if (situacaoMatch) {
          let situacao = situacaoMatch[1].toUpperCase();
          // Normalizar variações
          if (situacao === 'ACTIVA' || situacao === 'REGULAR') situacao = 'ATIVA';
          data.situacao_cadastral = situacao;
          console.log(`[CNPJ] ✓ Situação Cadastral found: ${data.situacao_cadastral}`);
        }
      }
      
      // Data de Abertura com fallback e validação
      if (expectedFields.includes('data_abertura')) {
        let dataAberturaMatch = normalizedText.match(/(?:DATA\s*(?:DE\s*)?ABERTURA|INICIO\s*ATIVIDADE)[:\s]+(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (!dataAberturaMatch) {
          // Fallback: primeira data no texto
          dataAberturaMatch = normalizedText.match(/\b(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\b/);
        }
        if (dataAberturaMatch) {
          const dataParts = dataAberturaMatch[1].split(/[\/\-\.]/);
          const year = parseInt(dataParts[2]);
          // Validar se data é razoável (não futuro, não antes de 1900)
          if (year >= 1900 && year <= new Date().getFullYear()) {
            data.data_abertura = dataAberturaMatch[1].replace(/[\-\.]/g, '/');
            console.log(`[CNPJ] ✓ Data Abertura found: ${data.data_abertura}`);
          } else {
            console.log(`[CNPJ] ✗ Data Abertura inválida: ${dataAberturaMatch[1]}`);
          }
        }
      }
      
      // Data de Situação
      if (expectedFields.includes('data_situacao')) {
        const dataSitMatch = normalizedText.match(/(?:DATA\s*(?:DA\s*)?SITUACAO)[:\s]+(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (dataSitMatch) {
          data.data_situacao = dataSitMatch[1].replace(/[\-\.]/g, '/');
          console.log(`[CNPJ] ✓ Data Situação found: ${data.data_situacao}`);
        }
      }
      
      // Motivo Situação
      if (expectedFields.includes('motivo_situacao')) {
        const motivoMatch = normalizedText.match(/(?:MOTIVO\s*(?:DA\s*)?SITUACAO)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^\n]{5,100})/i);
        if (motivoMatch) {
          data.motivo_situacao = motivoMatch[1].trim();
          console.log(`[CNPJ] ✓ Motivo Situação found: ${data.motivo_situacao}`);
        }
      }
      
      // Data de Emissão
      if (expectedFields.includes('data_emissao')) {
        let dataEmissaoMatch = normalizedText.match(/(?:EMISSAO|EMITIDO|DATA\s*EMISSAO)[:\s]+(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (!dataEmissaoMatch) {
          // Fallback: última data do documento
          const todasDatas = normalizedText.match(/\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}/g);
          if (todasDatas && todasDatas.length > 0) {
            const ultimaData = todasDatas[todasDatas.length - 1];
            dataEmissaoMatch = ['', ultimaData] as RegExpMatchArray;
          }
        }
        if (dataEmissaoMatch && dataEmissaoMatch[1]) {
          data.data_emissao = dataEmissaoMatch[1].replace(/[\-\.]/g, '/');
          console.log(`[CNPJ] ✓ Data Emissão found: ${data.data_emissao}`);
        }
      }
      
      // CNAE Principal - Refinar padrões
      if (expectedFields.includes('cnae_principal')) {
        let cnaeMatch = normalizedText.match(/(?:CNAE\s*PRINCIPAL|ATIVIDADE\s*PRINCIPAL)[:\s]+(\d{4}[\-\/\s]\d[\-\/\s]\d{2})\s*[\-\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^(\n]{10,100})/i);
        if (!cnaeMatch) {
          // Fallback 1: CNAE com espaços em vez de hífen
          cnaeMatch = normalizedText.match(/(?:CNAE\s*PRINCIPAL)[:\s]+(\d{4}\s*\d\s*\d{2})\s*[\-\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^\n]{10,80})/i);
        }
        if (!cnaeMatch) {
          // Fallback 2: Primeira sequência CNAE no texto
          cnaeMatch = normalizedText.match(/(\d{4}[\-\/]\d[\-\/]\d{2})\s*[\-\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^\n]{10,80})/);
        }
        if (cnaeMatch) {
          const codigo = cnaeMatch[1].replace(/\s/g, '-');
          data.cnae_principal = `${codigo} - ${cnaeMatch[2].trim()}`;
          console.log(`[CNPJ] ✓ CNAE Principal found: ${data.cnae_principal}`);
        } else {
          console.log('[CNPJ] ✗ CNAE Principal not found');
        }
      }
      
      // CNAEs Secundários - Melhorar parsing
      if (expectedFields.includes('cnaes_secundarios')) {
        const cnaesSecMatch = normalizedText.match(/(?:CNAE\s*SECUNDAR[IÍ]|ATIVIDADE\s*SECUNDAR)[:\s]+(.+?)(?=\s*(?:ENDERECO|CAPITAL|PORTE|NATUREZA|\n\n))/is);
        if (cnaesSecMatch) {
          const cnaes = cnaesSecMatch[1]
            .match(/\d{4}[\-\/\s]\d[\-\/\s]\d{2}\s*[\-\s]*[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^\n]{10,100}/gi);
          if (cnaes) {
            // Limitar a 10 CNAEs para evitar ruído
            data.cnaes_secundarios = cnaes.slice(0, 10).map(c => {
              const normalized = c.trim().replace(/\s+/g, ' ');
              return normalized.replace(/(\d{4})\s+(\d)\s+(\d{2})/, '$1-$2-$3');
            });
            console.log(`[CNPJ] ✓ CNAEs Secundários found: ${data.cnaes_secundarios.length} items`);
          }
        } else {
          console.log('[CNPJ] ✗ CNAEs Secundários not found');
        }
      }
      
      // Logradouro - Múltiplas tentativas (parar antes de Município)
      if (expectedFields.includes('logradouro')) {
        let logMatch = normalizedText.match(/(?:LOGRADOURO|ENDERECO|ENDEREÇO)[:\s]+((?:RUA|AVENIDA|AV|ALAMEDA|AL|TRAVESSA|TRAV|TV|PRACA|PCA|RODOVIA|ROD|ESTRADA|EST)[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\.]+?)(?=\s*(?:MUNICIPIO|MUN[IÍ]CIPIO|NUMERO|N[UÚ]MERO|,\s*\d|\d+|BAIRRO))/i);
        if (!logMatch) {
          // Fallback 1: Padrão de endereço sem marcador (parar antes de Município)
          logMatch = normalizedText.match(/\b(RUA|AVENIDA|AV|ALAMEDA|TRAVESSA|RODOVIA)\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{5,60}?)(?=\s*(?:MUNICIPIO|MUN[IÍ]CIPIO|[,\d]))/i);
          if (logMatch) logMatch[1] = `${logMatch[1]} ${logMatch[2]}`;
        }
        if (!logMatch) {
          // Fallback 2: Qualquer texto antes de número ou município
          logMatch = normalizedText.match(/(?:ENDERECO)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s,\.]{10,60}?)(?=\s*(?:\d{1,5}\b|MUNICIPIO|MUN[IÍ]CIPIO))/i);
        }
        if (logMatch) {
          data.logradouro = logMatch[1].trim();
          console.log(`[CNPJ] ✓ Logradouro found: ${data.logradouro}`);
        } else {
          console.log('[CNPJ] ✗ Logradouro not found');
        }
      }
      
      // Número - Aceitar variações
      if (expectedFields.includes('numero')) {
        let numeroMatch = normalizedText.match(/(?:NUMERO|N[UÚ]MERO|Nº)[:\s]*(\d+|S\/N|SN|S\.N\.)/i);
        if (!numeroMatch) {
          // Fallback: número após logradouro
          numeroMatch = normalizedText.match(/(?:RUA|AVENIDA|AV)[^,\n]+[,\s]+(\d+|S\/N)/i);
        }
        if (numeroMatch) {
          data.numero = numeroMatch[1].replace(/\./g, '');
          console.log(`[CNPJ] ✓ Número found: ${data.numero}`);
        } else {
          console.log('[CNPJ] ✗ Número not found');
        }
      }
      
      // Complemento com fallback
      if (expectedFields.includes('complemento')) {
        let complementoMatch = normalizedText.match(/(?:COMPLEMENTO)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9\s]+?)(?=\s*(?:BAIRRO|CEP|MUNICIPIO))/i);
        if (!complementoMatch) {
          // Fallback: SALA, ANDAR, APTO após número
          complementoMatch = normalizedText.match(/\b(SALA|ANDAR|APTO|CONJUNTO)\s+([A-Z0-9]+)/i);
          if (complementoMatch) complementoMatch[1] = `${complementoMatch[1]} ${complementoMatch[2]}`;
        }
        if (complementoMatch) {
          data.complemento = complementoMatch[1].trim();
          console.log(`[CNPJ] ✓ Complemento found: ${data.complemento}`);
        }
      }
      
      // Bairro com fallback
      if (expectedFields.includes('bairro')) {
        let bairroMatch = normalizedText.match(/(?:BAIRRO|DISTRITO)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*(?:MUNICIPIO|CIDADE|CEP|UF))/i);
        if (!bairroMatch) {
          // Fallback: texto após CEP ou antes de cidade
          bairroMatch = normalizedText.match(/\d{5}[\-\.]?\d{3}\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{5,40}?)(?=\s*(?:SP|RJ|MG|[A-Z]{2}))/i);
        }
        if (bairroMatch) {
          data.bairro = bairroMatch[1].trim();
          console.log(`[CNPJ] ✓ Bairro found: ${data.bairro}`);
        }
      }
      
      // Município com múltiplos fallbacks
      if (expectedFields.includes('municipio')) {
        let municipioMatch = normalizedText.match(/(?:MUNICIPIO|MUN[IÍ]CIPIO|CIDADE)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*(?:UF|ESTADO|SITUACAO|CEP|[A-Z]{2}\b))/i);
        if (!municipioMatch) {
          // Fallback 1: Captura "Munícipio NOME"
          municipioMatch = normalizedText.match(/MUN[IÍ]CIPIO\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*(?:SITUACAO|UF|ESTADO))/i);
        }
        if (!municipioMatch) {
          // Fallback 2: nome antes de UF (após bairro/CEP)
          municipioMatch = normalizedText.match(/(?:BAIRRO|CEP)[:\s]+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9\s\-\.]+?\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{5,40}?)\s+(?:SP|RJ|MG|BA|RS|PR|SC|PE|CE|PA|MA|GO|MT|MS|DF|ES|RN|PB|PI|AL|SE|RO|AC|AM|RR|AP|TO)\b/i);
        }
        if (municipioMatch) {
          data.municipio = municipioMatch[1].trim();
          console.log(`[CNPJ] ✓ Município found: ${data.municipio}`);
        } else {
          console.log('[CNPJ] ✗ Município not found');
        }
      }
      
      // UF com múltiplos fallbacks
      if (expectedFields.includes('uf')) {
        let ufMatch = normalizedText.match(/(?:UF|ESTADO)[:\s]+([A-Z]{2})\b/i);
        if (!ufMatch) {
          // Fallback 1: 2 letras maiúsculas após cidade/CEP
          ufMatch = normalizedText.match(/\d{5}[\-\.]?\d{3}\s+[A-Z\s]+?\s+([A-Z]{2})\b/i);
        }
        if (!ufMatch) {
          // Fallback 2: UF isolada no final de endereço
          ufMatch = normalizedText.match(/\b([A-Z]{2})\s*\d{5}/i);
        }
        if (!ufMatch) {
          // Fallback 3: Lista completa de UFs do Brasil
          ufMatch = normalizedText.match(/\b(SP|RJ|MG|BA|RS|PR|SC|PE|CE|PA|MA|GO|MT|MS|DF|ES|RN|PB|PI|AL|SE|RO|AC|AM|RR|AP|TO)\b/);
        }
        if (ufMatch) {
          data.uf = ufMatch[1].toUpperCase();
          console.log(`[CNPJ] ✓ UF found: ${data.uf}`);
        }
      }
      
      // CEP - Aceitar com/sem hífen
      if (expectedFields.includes('cep')) {
        let cepMatch = normalizedText.match(/(?:CEP)[:\s]*(\d{5}[\-\.]?\d{3})/i);
        if (!cepMatch) {
          // Fallback: CEP sem marcador, 8 dígitos
          cepMatch = normalizedText.match(/\b(\d{5}[\-\.]?\d{3})\b/);
        }
        if (cepMatch) {
          data.cep = cepMatch[1].replace(/[^\d]/g, '');
          console.log(`[CNPJ] ✓ CEP found: ${data.cep}`);
        } else {
          console.log('[CNPJ] ✗ CEP not found');
        }
      }
      
      // Capital Social - Normalizar valores
      if (expectedFields.includes('capital_social')) {
        let capitalMatch = normalizedText.match(/(?:CAPITAL\s*SOCIAL)[:\s]+R?\$?\s*([\d\.,]+)/i);
        if (!capitalMatch) {
          // Fallback: Valor monetário após palavra "CAPITAL"
          capitalMatch = normalizedText.match(/CAPITAL[^0-9]{0,20}([\d\.,]+)/i);
        }
        if (capitalMatch) {
          // Converter para número decimal (1.000,00 -> 1000.00)
          const valor = capitalMatch[1].replace(/\./g, '').replace(',', '.');
          data.capital_social = parseFloat(valor).toFixed(2);
          console.log(`[CNPJ] ✓ Capital Social found: ${data.capital_social}`);
        } else {
          console.log('[CNPJ] ✗ Capital Social not found');
        }
      }
      
      // Porte - Expandir opções e normalizar
      if (expectedFields.includes('porte')) {
        let porteMatch = normalizedText.match(/(?:PORTE)[:\s]+(MEI|ME|EPP|MICROEMPRESA|MICRO\s*EMPRESA|PEQUENO\s*PORTE|DEMAIS)/i);
        if (!porteMatch) {
          // Fallback: Buscar siglas isoladas
          porteMatch = normalizedText.match(/\b(MEI|ME|EPP)\b/i);
        }
        if (porteMatch) {
          let porte = porteMatch[1].toUpperCase().replace(/\s+/g, ' ');
          // Normalizar para siglas padrão
          if (porte.includes('MICROEMPRESA') || porte.includes('MICRO EMPRESA')) porte = 'ME';
          if (porte.includes('PEQUENO PORTE')) porte = 'EPP';
          data.porte = porte;
          console.log(`[CNPJ] ✓ Porte found: ${data.porte}`);
        } else {
          console.log('[CNPJ] ✗ Porte not found');
        }
      }
      
      // Natureza Jurídica - Melhorar parsing
      if (expectedFields.includes('natureza_juridica')) {
        let naturezaMatch = normalizedText.match(/(?:NATUREZA\s*JUR[IÍ]DICA)[:\s]+(\d{3}[\-\/]\d)\s*[\-\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^\n]{10,80})/i);
        if (!naturezaMatch) {
          // Fallback: Só descrição sem código
          naturezaMatch = normalizedText.match(/(?:NATUREZA\s*JUR[IÍ]DICA)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^\n]{10,80})/i);
          if (naturezaMatch) naturezaMatch[2] = naturezaMatch[1];
        }
        if (naturezaMatch) {
          data.natureza_juridica = naturezaMatch[2] ? `${naturezaMatch[1]} - ${naturezaMatch[2].trim()}` : naturezaMatch[1].trim();
          console.log(`[CNPJ] ✓ Natureza Jurídica found: ${data.natureza_juridica}`);
        } else {
          console.log('[CNPJ] ✗ Natureza Jurídica not found');
        }
      }
      
      // Email - Aceitar múltiplos, retornar o primeiro válido
      if (expectedFields.includes('email')) {
        const emailMatches = normalizedText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/gi);
        if (emailMatches && emailMatches.length > 0) {
          // Filtrar emails comuns de domínios públicos se houver corporativo
          const corporateEmail = emailMatches.find(e => !/@(gmail|hotmail|yahoo|outlook|uol)\./.test(e));
          data.email = (corporateEmail || emailMatches[0]).toLowerCase();
          console.log(`[CNPJ] ✓ Email found: ${data.email}`);
        } else {
          console.log('[CNPJ] ✗ Email not found');
        }
      }
      
      // Telefone - Aceitar múltiplos formatos
      if (expectedFields.includes('telefone')) {
        let telefoneMatch = normalizedText.match(/(?:TELEFONE|FONE|TEL)[:\s]*(\(?\d{2}\)?\s*\d{4,5}[\-\s]?\d{4})/i);
        if (!telefoneMatch) {
          // Fallback 1: (11) 99999-9999
          telefoneMatch = normalizedText.match(/\((\d{2})\)\s*(\d{4,5})[\-\s]?(\d{4})/);
          if (telefoneMatch) telefoneMatch[1] = telefoneMatch[0];
        }
        if (!telefoneMatch) {
          // Fallback 2: 11999999999
          telefoneMatch = normalizedText.match(/\b(\d{10,11})\b/);
        }
        if (telefoneMatch) {
          data.telefone = telefoneMatch[1].replace(/[^\d]/g, '');
          console.log(`[CNPJ] ✓ Telefone found: ${data.telefone}`);
        } else {
          console.log('[CNPJ] ✗ Telefone not found');
        }
      }
      
      // Situação Especial - Novo campo
      if (expectedFields.includes('situacao_especial')) {
        let sitEspecialMatch = normalizedText.match(/(?:SITUA[CÇ][AÃ]O\s*ESPECIAL)[:\s]+(FUSAO|FUSÃO|CISAO|CISÃO|INCORPORA[CÇ][AÃ]O|TRANSFORMA[CÇ][AÃ]O|EXTIN[CÇ][AÃ]O|LIQUIDA[CÇ][AÃ]O|NENHUMA|N[AÃ]O\s*H[AÁ]|SEM\s*SITUA[CÇ][AÃ]O)/i);
        if (!sitEspecialMatch) {
          // Fallback: detectar palavras-chave isoladas
          sitEspecialMatch = normalizedText.match(/\b(FUSAO|FUSÃO|CISAO|CISÃO|INCORPORA[CÇ][AÃ]O|TRANSFORMA[CÇ][AÃ]O)\b/i);
        }
        if (sitEspecialMatch) {
          data.situacao_especial = sitEspecialMatch[1].toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          console.log(`[CNPJ] ✓ Situação Especial found: ${data.situacao_especial}`);
        } else {
          data.situacao_especial = null;
          console.log('[CNPJ] Situação Especial: nenhuma');
        }
      }
      
      // Data Situação Especial - Novo campo
      if (expectedFields.includes('data_situacao_especial')) {
        let dataSitEspecialMatch = normalizedText.match(/(?:DATA\s*SITUA[CÇ][AÃ]O\s*ESPECIAL)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (!dataSitEspecialMatch && data.situacao_especial) {
          // Fallback: data após menção de situação especial
          const regex = new RegExp(`${data.situacao_especial}[^\\d]+(\\d{2}[\\/\\-\\.]\\d{2}[\\/\\-\\.]\\d{4})`, 'i');
          dataSitEspecialMatch = normalizedText.match(regex);
        }
        if (dataSitEspecialMatch) {
          data.data_situacao_especial = dataSitEspecialMatch[1].replace(/[\-\.]/g, '/');
          console.log(`[CNPJ] ✓ Data Situação Especial found: ${data.data_situacao_especial}`);
        }
      }
      
      // Opção Simples Nacional - Novo campo
      if (expectedFields.includes('opcao_simples_nacional')) {
        let simplesMatch = normalizedText.match(/(?:OP[CÇ][AÃ]O\s*PELO\s*SIMPLES|SIMPLES\s*NACIONAL)[:\s]+(SIM|N[AÃ]O|NAO\s*OPTANTE|OPTANTE)/i);
        if (!simplesMatch) {
          // Fallback: detectar contexto
          if (/OPTANTE\s*PELO\s*SIMPLES/i.test(normalizedText)) {
            simplesMatch = ['', 'SIM'];
          } else if (/N[AÃ]O\s*OPTANTE|NAO\s*OPTANTE/i.test(normalizedText)) {
            simplesMatch = ['', 'NAO'];
          }
        }
        if (simplesMatch) {
          data.opcao_simples_nacional = /SIM|OPTANTE/i.test(simplesMatch[1]) ? 'SIM' : 'NAO';
          console.log(`[CNPJ] ✓ Opção Simples Nacional found: ${data.opcao_simples_nacional}`);
        }
      }
      
      // Data Opção Simples - Novo campo
      if (expectedFields.includes('data_opcao_simples')) {
        let dataOpcaoMatch = normalizedText.match(/(?:DATA\s*(?:DE\s*)?OP[CÇ][AÃ]O\s*(?:PELO\s*)?SIMPLES)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (!dataOpcaoMatch) {
          // Fallback: data após "optante pelo simples"
          dataOpcaoMatch = normalizedText.match(/OPTANTE\s*PELO\s*SIMPLES[^0-9]{0,20}(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        }
        if (dataOpcaoMatch) {
          data.data_opcao_simples = dataOpcaoMatch[1].replace(/[\-\.]/g, '/');
          console.log(`[CNPJ] ✓ Data Opção Simples found: ${data.data_opcao_simples}`);
        }
      }
      
      // Data Exclusão Simples - Novo campo
      if (expectedFields.includes('data_exclusao_simples')) {
        let dataExclusaoMatch = normalizedText.match(/(?:DATA\s*(?:DE\s*)?EXCLUS[AÃ]O\s*(?:DO\s*)?SIMPLES)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (!dataExclusaoMatch) {
          // Fallback: data após "excluído do simples"
          dataExclusaoMatch = normalizedText.match(/EXCLU[IÍ]D[OA]\s*DO\s*SIMPLES[^0-9]{0,20}(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        }
        if (dataExclusaoMatch) {
          data.data_exclusao_simples = dataExclusaoMatch[1].replace(/[\-\.]/g, '/');
          console.log(`[CNPJ] ✓ Data Exclusão Simples found: ${data.data_exclusao_simples}`);
        }
      }
      
      // Opção MEI - Novo campo
      if (expectedFields.includes('opcao_mei')) {
        const isMEI = /MEI|MICROEMPREENDEDOR\s*INDIVIDUAL/i.test(normalizedText) || 
                     (data.porte && data.porte === 'MEI');
        data.opcao_mei = isMEI ? 'SIM' : 'NAO';
        console.log(`[CNPJ] ✓ Opção MEI found: ${data.opcao_mei}`);
      }
      
      // Ente Federativo Responsável - Novo campo
      if (expectedFields.includes('ente_federativo_responsavel')) {
        let enteMatch = normalizedText.match(/(?:ENTE\s*FEDERATIVO|RESPONS[AÁ]VEL)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^\n]{5,60}?)(?=\s*(?:\n|CPF|QUALIFICA))/i);
        if (!enteMatch) {
          // Fallback: detectar órgãos públicos
          enteMatch = normalizedText.match(/\b(UNIÃO|ESTADO\s*DE\s*[A-Z]{2,20}|MUNIC[IÍ]PIO\s*DE\s*[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{3,40})\b/i);
        }
        if (enteMatch) {
          data.ente_federativo_responsavel = enteMatch[1].trim();
          console.log(`[CNPJ] ✓ Ente Federativo found: ${data.ente_federativo_responsavel}`);
        }
      }
      
      // Qualificação Responsável - Novo campo
      if (expectedFields.includes('qualificacao_responsavel')) {
        let qualifMatch = normalizedText.match(/(?:QUALIFICA[CÇ][AÃ]O)[:\s]+(S[OÓ]CIO|ADMINISTRADOR|PROCURADOR|DIRETOR|PRESIDENTE|S[OÓ]CIO[\-\s]ADMINISTRADOR)/i);
        if (!qualifMatch) {
          // Fallback: detectar palavras-chave isoladas
          qualifMatch = normalizedText.match(/\b(S[OÓ]CIO|ADMINISTRADOR|PROCURADOR|DIRETOR|PRESIDENTE)\b/i);
        }
        if (qualifMatch) {
          data.qualificacao_responsavel = qualifMatch[1].toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          console.log(`[CNPJ] ✓ Qualificação Responsável found: ${data.qualificacao_responsavel}`);
        }
      }
      
      // Nome Responsável - Novo campo
      if (expectedFields.includes('nome_responsavel')) {
        let nomeRespMatch = normalizedText.match(/(?:NOME\s*(?:DO\s*)?RESPONS[AÁ]VEL|NOME\s*(?:DO\s*)?S[OÓ]CIO)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*(?:CPF|QUALIFICA|QSA|\n))/i);
        if (!nomeRespMatch) {
          // Fallback: nome após qualificação
          nomeRespMatch = normalizedText.match(/(?:S[OÓ]CIO|ADMINISTRADOR)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)(?=\s*CPF)/i);
        }
        if (nomeRespMatch) {
          data.nome_responsavel = nomeRespMatch[1].trim();
          console.log(`[CNPJ] ✓ Nome Responsável found: ${data.nome_responsavel}`);
        }
      }
      
      // CPF Responsável - Novo campo
      if (expectedFields.includes('cpf_responsavel')) {
        let cpfRespMatch = normalizedText.match(/(?:CPF\s*(?:DO\s*)?RESPONS[AÁ]VEL|CPF\s*(?:DO\s*)?S[OÓ]CIO)[:\s]*(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\s]?\d{2})/i);
        if (!cpfRespMatch && data.nome_responsavel) {
          // Fallback: CPF após nome do responsável
          const regex = new RegExp(`${data.nome_responsavel.split(' ')[0]}[^\\d]+(\\d{3}[\.\\s]?\\d{3}[\.\\s]?\\d{3}[\\-\\s]?\\d{2})`, 'i');
          cpfRespMatch = normalizedText.match(regex);
        }
        if (cpfRespMatch) {
          data.cpf_responsavel = cpfRespMatch[1].replace(/[^\d]/g, '');
          console.log(`[CNPJ] ✓ CPF Responsável found: ${data.cpf_responsavel}`);
        }
      }
      
      // Sócios (QSA) - Novo campo (array)
      if (expectedFields.includes('socios')) {
        const sociosArray: Array<{nome: string; cpf?: string; qualificacao?: string; percentual?: string}> = [];
        
        // Buscar seção de QSA ou Sócios
        const qsaMatch = normalizedText.match(/(?:QUADRO\s*DE\s*S[OÓ]CIOS|QSA|S[OÓ]CIOS)[:\s]+(.+?)(?=\s*(?:CAPITAL|ATIVIDADE|CNAE|ENDERECO|\n\n))/is);
        
        if (qsaMatch) {
          // Padrão: Nome do Sócio seguido de CPF
          const sociosMatches = qsaMatch[1].matchAll(/([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)\s+CPF[:\s]*(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\s]?\d{2})/gi);
          
          for (const match of sociosMatches) {
            const socio: {nome: string; cpf?: string; qualificacao?: string; percentual?: string} = {
              nome: match[1].trim(),
              cpf: match[2].replace(/[^\d]/g, '')
            };
            
            // Tentar extrair qualificação próxima ao nome
            const qualifRegex = new RegExp(`${socio.nome}[^\\n]{0,50}(S[OÓ]CIO|ADMINISTRADOR|PROCURADOR)`, 'i');
            const qualifMatch = normalizedText.match(qualifRegex);
            if (qualifMatch) {
              socio.qualificacao = qualifMatch[1].toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            }
            
            // Tentar extrair percentual
            const percRegex = new RegExp(`${socio.nome}[^\\n]{0,50}(\\d{1,3}[\\.,]?\\d*)\\s*%`, 'i');
            const percMatch = normalizedText.match(percRegex);
            if (percMatch) {
              socio.percentual = percMatch[1].replace(',', '.');
            }
            
            sociosArray.push(socio);
          }
        }
        
        if (sociosArray.length > 0) {
          data.socios = sociosArray;
          console.log(`[CNPJ] ✓ Sócios found: ${sociosArray.length} sócio(s)`);
        } else {
          console.log('[CNPJ] ✗ Sócios not found');
        }
      }
      
      // Capital Social Data - Novo campo
      if (expectedFields.includes('capital_social_data')) {
        let capitalDataMatch = normalizedText.match(/(?:DATA\s*(?:DO\s*)?CAPITAL|CAPITAL\s*SOCIAL\s*EM)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (!capitalDataMatch && data.capital_social) {
          // Fallback: data próxima ao valor do capital
          capitalDataMatch = normalizedText.match(/CAPITAL\s*SOCIAL[^0-9]{0,50}(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        }
        if (capitalDataMatch) {
          data.capital_social_data = capitalDataMatch[1].replace(/[\-\.]/g, '/');
          console.log(`[CNPJ] ✓ Capital Social Data found: ${data.capital_social_data}`);
        }
      }
      
      console.log(`[CNPJ] Extraction complete. Fields found: ${Object.keys(data).length}`);
      break;

    case 'comprovante_endereco':
      console.log('[COMPROVANTE] Starting address proof field extraction...');
      
      // Nome do titular/destinatário
      if (expectedFields.includes('nome')) {
        let nomeMatch = normalizedText.match(/(?:NOME|DESTINATARIO|DESTINATÁRIO|TITULAR|CLIENTE)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*(?:ENDERECO|ENDEREÇO|RUA|AV|CPF|CEP))/i);
        if (!nomeMatch) {
          nomeMatch = normalizedText.match(/^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)(?=\s*(?:RUA|AV|ENDERECO))/i);
        }
        if (nomeMatch) {
          data.nome = nomeMatch[1].trim();
          console.log(`[COMPROVANTE] ✓ Nome found: ${data.nome}`);
        } else {
          console.log('[COMPROVANTE] ✗ Nome not found');
        }
      }
      
      // Logradouro
      if (expectedFields.includes('logradouro')) {
        let logMatch = normalizedText.match(/(?:LOGRADOURO|ENDERECO|ENDEREÇO)[:\s]+((?:RUA|AVENIDA|AV|ALAMEDA|TRAVESSA|PRACA|ROD)[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\.]+?)(?=\s*(?:NUMERO|N[UÚ]MERO|,\s*\d|\d+|BAIRRO))/i);
        if (!logMatch) {
          // Fallback: procurar padrão de rua/av seguido de nome
          logMatch = normalizedText.match(/\b(RUA|AVENIDA|AV|ALAMEDA|TRAVESSA)\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{5,50}?)(?=\s*[,\d])/i);
          if (logMatch) logMatch[1] = `${logMatch[1]} ${logMatch[2]}`;
        }
        if (logMatch) {
          data.logradouro = logMatch[1].trim();
          console.log(`[COMPROVANTE] ✓ Logradouro found: ${data.logradouro}`);
        } else {
          console.log('[COMPROVANTE] ✗ Logradouro not found');
        }
      }
      
      // Número
      if (expectedFields.includes('numero')) {
        const numeroMatch = normalizedText.match(/(?:NUMERO|N[UÚ]MERO|Nº)[:\s]*(\d+|S\/N)/i);
        if (numeroMatch) {
          data.numero = numeroMatch[1];
          console.log(`[COMPROVANTE] ✓ Número found: ${data.numero}`);
        }
      }
      
      // Complemento
      if (expectedFields.includes('complemento')) {
        const complementoMatch = normalizedText.match(/(?:COMPLEMENTO|COMPL|APT|APTO|SALA)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9\s]+?)(?=\s*(?:BAIRRO|CEP|CIDADE))/i);
        if (complementoMatch) {
          data.complemento = complementoMatch[1].trim();
          console.log(`[COMPROVANTE] ✓ Complemento found: ${data.complemento}`);
        }
      }
      
      // Bairro
      if (expectedFields.includes('bairro')) {
        const bairroMatch = normalizedText.match(/(?:BAIRRO|DISTRITO)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*(?:CIDADE|MUNICIPIO|CEP|UF))/i);
        if (bairroMatch) {
          data.bairro = bairroMatch[1].trim();
          console.log(`[COMPROVANTE] ✓ Bairro found: ${data.bairro}`);
        }
      }
      
      // CEP
      if (expectedFields.includes('cep')) {
        const cepMatch = normalizedText.match(/(?:CEP)[:\s]*(\d{5}[\-\.]?\d{3})/i);
        if (cepMatch) {
          data.cep = cepMatch[1].replace(/[^\d]/g, '');
          console.log(`[COMPROVANTE] ✓ CEP found: ${data.cep}`);
        } else {
          console.log('[COMPROVANTE] ✗ CEP not found');
        }
      }
      
      // Cidade
      if (expectedFields.includes('cidade')) {
        let cidadeMatch = normalizedText.match(/(?:CIDADE|MUNICIPIO|MUNIC)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*(?:ESTADO|UF|CEP|\d))/i);
        if (!cidadeMatch) {
          // Fallback: cidade antes de UF
          cidadeMatch = normalizedText.match(/([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{3,30}?)[\s\-\/]+([A-Z]{2})\b/);
          if (cidadeMatch) cidadeMatch[1] = cidadeMatch[1];
        }
        if (cidadeMatch) {
          data.cidade = cidadeMatch[1].trim();
          console.log(`[COMPROVANTE] ✓ Cidade found: ${data.cidade}`);
        } else {
          console.log('[COMPROVANTE] ✗ Cidade not found');
        }
      }
      
      // Estado (UF)
      if (expectedFields.includes('estado')) {
        let estadoMatch = normalizedText.match(/(?:ESTADO|UF)[:\s]+([A-Z]{2})\b/i);
        if (!estadoMatch) {
          // Fallback: 2 letras maiúsculas isoladas
          estadoMatch = normalizedText.match(/\b([A-Z]{2})\b/);
        }
        if (estadoMatch) {
          data.estado = estadoMatch[1].toUpperCase();
          console.log(`[COMPROVANTE] ✓ Estado found: ${data.estado}`);
        } else {
          console.log('[COMPROVANTE] ✗ Estado not found');
        }
      }
      
      // Data de emissão/vencimento
      if (expectedFields.includes('data_emissao')) {
        const dataMatch = normalizedText.match(/(?:EMISSAO|EMISSÃO|DATA)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (dataMatch) {
          data.data_emissao = dataMatch[1];
          console.log(`[COMPROVANTE] ✓ Data emissão found: ${data.data_emissao}`);
        }
      }
      
      console.log(`[COMPROVANTE] Extraction complete. Fields found: ${Object.keys(data).length}`);
      break;

    case 'diploma':
      console.log('[DIPLOMA] Starting diploma field extraction...');
      
      // Nome do diplomado
      if (expectedFields.includes('nome')) {
        let nomeMatch = normalizedText.match(/(?:OUTORGA|CONFERE|DIPLOMA|CERTIFICA)[:\s]+(?:A|O|QUE|DE)?[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*(?:CURSO|GRAU|GRADUAÇÃO|CONCLUIU|COLOU))/i);
        if (!nomeMatch) {
          // Fallback: nome próximo ao início
          nomeMatch = normalizedText.match(/(?:NOME)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)(?=\s*(?:CURSO|CPF|RG))/i);
        }
        if (nomeMatch) {
          data.nome = nomeMatch[1].trim();
          console.log(`[DIPLOMA] ✓ Nome found: ${data.nome}`);
        } else {
          console.log('[DIPLOMA] ✗ Nome not found');
        }
      }
      
      // Curso/Graduação
      if (expectedFields.includes('curso')) {
        let cursoMatch = normalizedText.match(/(?:CURSO|GRADUAÇÃO|GRADUACAO|BACHAREL|LICENCIATURA)[:\s]+(?:DE|EM)?[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*(?:PELA|NA|INSTITUIÇÃO|UNIVERSIDADE|FACULDADE|EM\s+\d{2}))/i);
        if (!cursoMatch) {
          // Fallback: padrão "EM <CURSO>"
          cursoMatch = normalizedText.match(/\bEM\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{5,40}?)(?=\s*(?:PELA|NA|INSTITUIÇÃO))/i);
        }
        if (cursoMatch) {
          data.curso = cursoMatch[1].trim();
          console.log(`[DIPLOMA] ✓ Curso found: ${data.curso}`);
        } else {
          console.log('[DIPLOMA] ✗ Curso not found');
        }
      }
      
      // Instituição de ensino
      if (expectedFields.includes('instituicao')) {
        let instMatch = normalizedText.match(/(?:INSTITUIÇÃO|INSTITUICAO|UNIVERSIDADE|FACULDADE|ESCOLA|CENTRO)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-]+?)(?=\s*(?:EM|DATA|CONCLUSAO|OUTORGADO|\d{2}[\/\-]))/i);
        if (!instMatch) {
          // Fallback: padrão "PELA/NA <INSTITUICAO>"
          instMatch = normalizedText.match(/(?:PELA|NA)\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-]{10,60}?)(?=\s*(?:EM|DATA|\d{2}[\/\-]))/i);
        }
        if (instMatch) {
          data.instituicao = instMatch[1].trim();
          console.log(`[DIPLOMA] ✓ Instituição found: ${data.instituicao}`);
        } else {
          console.log('[DIPLOMA] ✗ Instituição not found');
        }
      }
      
      // Data de conclusão/colação de grau
      if (expectedFields.includes('data_conclusao')) {
        let dataMatch = normalizedText.match(/(?:CONCLUSÃO|CONCLUSAO|COLACAO|COLAÇÃO|DATA)[:\s]+(?:DE\s+GRAU)?[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (!dataMatch) {
          // Fallback: padrão "EM dd/mm/yyyy"
          dataMatch = normalizedText.match(/\bEM\s+(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/i);
        }
        if (dataMatch) {
          data.data_conclusao = dataMatch[1];
          console.log(`[DIPLOMA] ✓ Data conclusão found: ${data.data_conclusao}`);
        } else {
          console.log('[DIPLOMA] ✗ Data conclusão not found');
        }
      }
      
      // Grau obtido
      if (expectedFields.includes('grau')) {
        const grauMatch = normalizedText.match(/(?:GRAU|TÍTULO|TITULO)[:\s]+(BACHAREL|LICENCIADO|TECNÓLOGO|TECNOLOGO|MESTRE|DOUTOR)/i);
        if (grauMatch) {
          data.grau = grauMatch[1].toUpperCase();
          console.log(`[DIPLOMA] ✓ Grau found: ${data.grau}`);
        }
      }
      
      // Número do registro/diploma
      if (expectedFields.includes('numero_registro')) {
        const registroMatch = normalizedText.match(/(?:REGISTRO|DIPLOMA|N[UÚ]MERO)[:\s#]*(\d{4,10})/i);
        if (registroMatch) {
          data.numero_registro = registroMatch[1];
          console.log(`[DIPLOMA] ✓ Número registro found: ${data.numero_registro}`);
        }
      }
      
      console.log(`[DIPLOMA] Extraction complete. Fields found: ${Object.keys(data).length}`);
      break;

    case 'certidao':
      console.log('[CERTIDAO] Starting birth certificate field extraction...');
      
      // Nome registrado
      if (expectedFields.includes('nome')) {
        let nomeMatch = normalizedText.match(/(?:NOME|REGISTRADO|NASCIDO)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*(?:FILHO|FILHA|NASCIDO|NASCIDA|DATA|LIVRO))/i);
        if (!nomeMatch) {
          // Fallback: procurar nome completo no início
          nomeMatch = normalizedText.match(/^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)(?=\s*(?:FILHO|NASCIDO))/i);
        }
        if (nomeMatch) {
          data.nome = nomeMatch[1].trim();
          console.log(`[CERTIDAO] ✓ Nome found: ${data.nome}`);
        } else {
          console.log('[CERTIDAO] ✗ Nome not found');
        }
      }
      
      // Tipo de certidão
      if (expectedFields.includes('tipo_certidao')) {
        let tipoMatch = normalizedText.match(/(?:CERTIDÃO|CERTIDAO)[:\s]+(?:DE\s+)?(NASCIMENTO|CASAMENTO|OBITO|ÓBITO)/i);
        if (!tipoMatch) {
          // Inferir do contexto
          if (normalizedText.includes('NASCIMENTO') || normalizedText.includes('NASCIDO')) {
            data.tipo_certidao = 'NASCIMENTO';
          } else if (normalizedText.includes('CASAMENTO')) {
            data.tipo_certidao = 'CASAMENTO';
          } else if (normalizedText.includes('OBITO') || normalizedText.includes('ÓBITO')) {
            data.tipo_certidao = 'ÓBITO';
          }
        } else {
          data.tipo_certidao = tipoMatch[1].toUpperCase();
        }
        if (data.tipo_certidao) {
          console.log(`[CERTIDAO] ✓ Tipo found: ${data.tipo_certidao}`);
        } else {
          console.log('[CERTIDAO] ✗ Tipo not found');
        }
      }
      
      // Data de nascimento/evento
      if (expectedFields.includes('data_nascimento')) {
        let dataMatch = normalizedText.match(/(?:NASCIMENTO|NASCIDO|DATA\s+DO\s+EVENTO)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (!dataMatch) {
          // Fallback: primeira data encontrada
          dataMatch = normalizedText.match(/\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/);
        }
        if (dataMatch) {
          data.data_nascimento = dataMatch[1];
          console.log(`[CERTIDAO] ✓ Data nascimento found: ${data.data_nascimento}`);
        }
      }
      
      // Data de emissão/expedição
      if (expectedFields.includes('data_emissao')) {
        const dataEmissaoMatch = normalizedText.match(/(?:EMISSAO|EMISSÃO|EXPEDIÇÃO|EXPEDICAO|EMITIDA)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i);
        if (dataEmissaoMatch) {
          data.data_emissao = dataEmissaoMatch[1];
          console.log(`[CERTIDAO] ✓ Data emissão found: ${data.data_emissao}`);
        } else {
          console.log('[CERTIDAO] ✗ Data emissão not found');
        }
      }
      
      // Nome do pai
      if (expectedFields.includes('pai')) {
        const paiMatch = normalizedText.match(/(?:PAI|FILHO\s+DE)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)(?=\s*(?:MAE|MÃE|E\s+DE))/i);
        if (paiMatch) {
          data.pai = paiMatch[1].trim();
          console.log(`[CERTIDAO] ✓ Nome do pai found`);
        }
      }
      
      // Nome da mãe
      if (expectedFields.includes('mae')) {
        const maeMatch = normalizedText.match(/(?:MAE|MÃE|E\s+DE)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,60}?)(?=\s*(?:LIVRO|FOLHA|TERMO|DATA))/i);
        if (maeMatch) {
          data.mae = maeMatch[1].trim();
          console.log(`[CERTIDAO] ✓ Nome da mãe found`);
        }
      }
      
      // Livro
      if (expectedFields.includes('livro')) {
        const livroMatch = normalizedText.match(/(?:LIVRO)[:\s]+(\w+)/i);
        if (livroMatch) {
          data.livro = livroMatch[1];
          console.log(`[CERTIDAO] ✓ Livro found: ${data.livro}`);
        }
      }
      
      // Folha
      if (expectedFields.includes('folha')) {
        const folhaMatch = normalizedText.match(/(?:FOLHA|FLS)[:\s]+(\d+)/i);
        if (folhaMatch) {
          data.folha = folhaMatch[1];
          console.log(`[CERTIDAO] ✓ Folha found: ${data.folha}`);
        }
      }
      
      // Termo
      if (expectedFields.includes('termo')) {
        const termoMatch = normalizedText.match(/(?:TERMO)[:\s]+(\d+)/i);
        if (termoMatch) {
          data.termo = termoMatch[1];
          console.log(`[CERTIDAO] ✓ Termo found: ${data.termo}`);
        }
      }
      
      // Cartório
      if (expectedFields.includes('cartorio')) {
        const cartorioMatch = normalizedText.match(/(?:CARTORIO|CARTÓRIO|OFICIAL)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-]{10,60}?)(?=\s*(?:LIVRO|FOLHA|DATA))/i);
        if (cartorioMatch) {
          data.cartorio = cartorioMatch[1].trim();
          console.log(`[CERTIDAO] ✓ Cartório found`);
        }
      }
      
      console.log(`[CERTIDAO] Extraction complete. Fields found: ${Object.keys(data).length}`);
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
