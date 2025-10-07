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
      
      // CNPJ - formato XX.XXX.XXX/XXXX-XX
      if (expectedFields.includes('cnpj')) {
        const cnpjMatch = normalizedText.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}[\-\.]?\d{2})/);
        if (cnpjMatch) {
          data.cnpj = cnpjMatch[1].replace(/[^\d]/g, '');
          console.log(`[CNPJ] ✓ CNPJ found: ${data.cnpj}`);
        } else {
          console.log('[CNPJ] ✗ CNPJ not found');
        }
      }
      
      // Razão Social
      if (expectedFields.includes('razao_social')) {
        let razaoMatch = normalizedText.match(/(?:RAZAO\s*SOCIAL|NOME\s*EMPRESARIAL)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9\s&\-\.]+?)(?=\s*(?:NOME\s*FANTASIA|CNPJ|CNAE|SITUACAO|ENDERECO|\n\n))/i);
        if (razaoMatch) {
          data.razao_social = razaoMatch[1].trim();
          console.log(`[CNPJ] ✓ Razão Social found: ${data.razao_social}`);
        } else {
          console.log('[CNPJ] ✗ Razão Social not found');
        }
      }
      
      // Nome Fantasia
      if (expectedFields.includes('nome_fantasia')) {
        const fantasiaMatch = normalizedText.match(/(?:NOME\s*FANTASIA|FANTASIA)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9\s&\-\.]+?)(?=\s*(?:CNPJ|CNAE|SITUACAO|ENDERECO|\n\n))/i);
        if (fantasiaMatch) {
          data.nome_fantasia = fantasiaMatch[1].trim();
          console.log(`[CNPJ] ✓ Nome Fantasia found: ${data.nome_fantasia}`);
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
      
      // Situação Cadastral
      if (expectedFields.includes('situacao_cadastral')) {
        const situacaoMatch = normalizedText.match(/(?:SITUACAO\s*CADASTRAL)[:\s]+(ATIVA|SUSPENSA|INAPTA|BAIXADA|NULA)/i);
        if (situacaoMatch) {
          data.situacao_cadastral = situacaoMatch[1].toUpperCase();
          console.log(`[CNPJ] ✓ Situação Cadastral found: ${data.situacao_cadastral}`);
        }
      }
      
      // Data de Abertura
      if (expectedFields.includes('data_abertura')) {
        const dataAberturaMatch = normalizedText.match(/(?:DATA\s*(?:DE\s*)?ABERTURA|INICIO\s*ATIVIDADE)[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
        if (dataAberturaMatch) {
          data.data_abertura = dataAberturaMatch[1];
          console.log(`[CNPJ] ✓ Data Abertura found: ${data.data_abertura}`);
        }
      }
      
      // CNAE Principal
      if (expectedFields.includes('cnae_principal')) {
        const cnaeMatch = normalizedText.match(/(?:CNAE\s*PRINCIPAL|ATIVIDADE\s*PRINCIPAL)[:\s]+(\d{4}[\-\/]\d[\-\/]\d{2})\s*[\-\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^(\n]{10,100})/i);
        if (cnaeMatch) {
          data.cnae_principal = `${cnaeMatch[1]} - ${cnaeMatch[2].trim()}`;
          console.log(`[CNPJ] ✓ CNAE Principal found: ${data.cnae_principal}`);
        }
      }
      
      // CNAEs Secundários
      if (expectedFields.includes('cnaes_secundarios')) {
        const cnaesSecMatch = normalizedText.match(/(?:CNAE\s*SECUNDAR[IÍ]|ATIVIDADE\s*SECUNDAR)[:\s]+(.+?)(?=\s*(?:ENDERECO|CAPITAL|PORTE|NATUREZA|\n\n))/is);
        if (cnaesSecMatch) {
          const cnaes = cnaesSecMatch[1]
            .match(/\d{4}[\-\/]\d[\-\/]\d{2}\s*[\-\s]*[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^\n]{10,100}/gi);
          if (cnaes) {
            data.cnaes_secundarios = cnaes.map(c => c.trim());
            console.log(`[CNPJ] ✓ CNAEs Secundários found: ${data.cnaes_secundarios.length} items`);
          }
        }
      }
      
      // Logradouro
      if (expectedFields.includes('logradouro')) {
        const logradouroMatch = normalizedText.match(/(?:LOGRADOURO|ENDERECO)[:\s]+((?:RUA|AVENIDA|AV|ALAMEDA|TRAVESSA|PRACA|ROD)[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\.]+?)(?=\s*(?:NUMERO|N[UÚ]MERO|,\s*\d|\d+))/i);
        if (logradouroMatch) {
          data.logradouro = logradouroMatch[1].trim();
          console.log(`[CNPJ] ✓ Logradouro found: ${data.logradouro}`);
        }
      }
      
      // Número
      if (expectedFields.includes('numero')) {
        const numeroMatch = normalizedText.match(/(?:NUMERO|N[UÚ]MERO)[:\s]+(\d+|S\/N)/i);
        if (numeroMatch) {
          data.numero = numeroMatch[1];
          console.log(`[CNPJ] ✓ Número found: ${data.numero}`);
        }
      }
      
      // Complemento
      if (expectedFields.includes('complemento')) {
        const complementoMatch = normalizedText.match(/(?:COMPLEMENTO)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9\s]+?)(?=\s*(?:BAIRRO|CEP|MUNICIPIO))/i);
        if (complementoMatch) {
          data.complemento = complementoMatch[1].trim();
          console.log(`[CNPJ] ✓ Complemento found: ${data.complemento}`);
        }
      }
      
      // Bairro
      if (expectedFields.includes('bairro')) {
        const bairroMatch = normalizedText.match(/(?:BAIRRO|DISTRITO)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*(?:MUNICIPIO|CIDADE|CEP))/i);
        if (bairroMatch) {
          data.bairro = bairroMatch[1].trim();
          console.log(`[CNPJ] ✓ Bairro found: ${data.bairro}`);
        }
      }
      
      // Município
      if (expectedFields.includes('municipio')) {
        const municipioMatch = normalizedText.match(/(?:MUNICIPIO|CIDADE)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?=\s*(?:UF|ESTADO|CEP))/i);
        if (municipioMatch) {
          data.municipio = municipioMatch[1].trim();
          console.log(`[CNPJ] ✓ Município found: ${data.municipio}`);
        }
      }
      
      // UF
      if (expectedFields.includes('uf')) {
        const ufMatch = normalizedText.match(/(?:UF|ESTADO)[:\s]+([A-Z]{2})\b/i);
        if (ufMatch) {
          data.uf = ufMatch[1].toUpperCase();
          console.log(`[CNPJ] ✓ UF found: ${data.uf}`);
        }
      }
      
      // CEP
      if (expectedFields.includes('cep')) {
        const cepMatch = normalizedText.match(/(?:CEP)[:\s]+(\d{5}[\-\.]?\d{3})/i);
        if (cepMatch) {
          data.cep = cepMatch[1].replace(/[^\d]/g, '');
          console.log(`[CNPJ] ✓ CEP found: ${data.cep}`);
        }
      }
      
      // Capital Social
      if (expectedFields.includes('capital_social')) {
        const capitalMatch = normalizedText.match(/(?:CAPITAL\s*SOCIAL)[:\s]+R?\$?\s*([\d\.,]+)/i);
        if (capitalMatch) {
          data.capital_social = capitalMatch[1].replace(/\./g, '').replace(',', '.');
          console.log(`[CNPJ] ✓ Capital Social found: ${data.capital_social}`);
        }
      }
      
      // Porte
      if (expectedFields.includes('porte')) {
        const porteMatch = normalizedText.match(/(?:PORTE)[:\s]+(MEI|ME|EPP|DEMAIS)/i);
        if (porteMatch) {
          data.porte = porteMatch[1].toUpperCase();
          console.log(`[CNPJ] ✓ Porte found: ${data.porte}`);
        }
      }
      
      // Natureza Jurídica
      if (expectedFields.includes('natureza_juridica')) {
        const naturezaMatch = normalizedText.match(/(?:NATUREZA\s*JUR[IÍ]DICA)[:\s]+(\d{3}[\-\/]\d)\s*[\-\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^\n]{10,80})/i);
        if (naturezaMatch) {
          data.natureza_juridica = `${naturezaMatch[1]} - ${naturezaMatch[2].trim()}`;
          console.log(`[CNPJ] ✓ Natureza Jurídica found: ${data.natureza_juridica}`);
        }
      }
      
      // Email
      if (expectedFields.includes('email')) {
        const emailMatch = normalizedText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/i);
        if (emailMatch) {
          data.email = emailMatch[1].toLowerCase();
          console.log(`[CNPJ] ✓ Email found: ${data.email}`);
        }
      }
      
      // Telefone
      if (expectedFields.includes('telefone')) {
        const telefoneMatch = normalizedText.match(/(?:TELEFONE|FONE|TEL)[:\s]*(\(?\d{2}\)?\s*\d{4,5}[\-\s]?\d{4})/i);
        if (telefoneMatch) {
          data.telefone = telefoneMatch[1].replace(/[^\d]/g, '');
          console.log(`[CNPJ] ✓ Telefone found: ${data.telefone}`);
        }
      }
      
      console.log(`[CNPJ] Extraction complete. Fields found: ${Object.keys(data).length}`);
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
