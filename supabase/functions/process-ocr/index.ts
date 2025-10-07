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

    // Get Google Cloud Vision API key
    const apiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
    if (!apiKey) {
      console.error('Google Cloud Vision API key not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Serviço de OCR não configurado. Configure a chave API do Google Cloud Vision.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Process OCR with Google Cloud Vision
    const ocrResult = await processWithGoogleVision(fileUrl, documentType, expectedFields, apiKey);

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
 * Process document with Google Cloud Vision API
 */
async function processWithGoogleVision(
  fileUrl: string,
  documentType: string,
  expectedFields: string[],
  apiKey: string
): Promise<{ success: boolean; data: Record<string, any>; confidence: number; message: string }> {
  try {
    // Fetch the image from the URL
    const imageResponse = await fetch(fileUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Convert to base64 using chunks to avoid stack overflow
    const bytes = new Uint8Array(imageBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Image = btoa(binary);

    console.log('Calling Google Cloud Vision API...');

    // Call Google Cloud Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'DOCUMENT_TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Google Cloud Vision API error:', errorText);
      throw new Error(`Google Cloud Vision API error: ${visionResponse.statusText}`);
    }

    const visionData = await visionResponse.json();
    
    // Extract text from response
    const textAnnotations = visionData.responses?.[0]?.textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) {
      console.warn('No text detected in document');
      return {
        success: false,
        data: {},
        confidence: 0,
        message: 'Nenhum texto foi detectado no documento'
      };
    }

    // The first annotation contains all the text
    const fullText = textAnnotations[0]?.description || '';
    console.log('Extracted text length:', fullText.length);

    // Calculate average confidence
    const confidenceScores = textAnnotations
      .slice(1) // Skip the first one (full text)
      .map((annotation: any) => annotation.confidence || 0)
      .filter((score: number) => score > 0);
    
    const avgConfidence = confidenceScores.length > 0
      ? Math.round((confidenceScores.reduce((a: number, b: number) => a + b, 0) / confidenceScores.length) * 100)
      : 75;

    // Parse the text based on document type
    const extractedData = parseDocumentText(fullText, documentType, expectedFields);

    console.log('Parsed fields:', Object.keys(extractedData));

    return {
      success: true,
      data: extractedData,
      confidence: avgConfidence,
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
  const normalizedText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');

  console.log('Parsing document type:', documentType);

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
      if (expectedFields.includes('nome')) {
        const nomeMatch = normalizedText.match(/(?:nome|name)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+?)(?:\s+(?:cpf|nasc|cat|reg))/i);
        if (nomeMatch) data.nome = nomeMatch[1].trim();
      }
      if (expectedFields.includes('cpf')) {
        const cpfMatch = normalizedText.match(/(?:cpf)[:\s]*([0-9.]{11,14})/i);
        if (cpfMatch) data.cpf = cpfMatch[1];
      }
      if (expectedFields.includes('numero_cnh')) {
        const cnhMatch = normalizedText.match(/(?:registro|número|numero|cnh)[:\s]*([0-9]{11})/i);
        if (cnhMatch) data.numero_cnh = cnhMatch[1];
      }
      if (expectedFields.includes('categoria')) {
        const catMatch = normalizedText.match(/(?:categoria|cat)[:\s]*([A-E]{1,5})/i);
        if (catMatch) data.categoria = catMatch[1];
      }
      if (expectedFields.includes('validade')) {
        const validadeMatch = normalizedText.match(/(?:validade|val)[:\s]*([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4})/i);
        if (validadeMatch) data.validade = validadeMatch[1];
      }
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
 * EXEMPLO DE INTEGRAÇÃO COM GOOGLE CLOUD VISION:
 * 
 * import { ImageAnnotatorClient } from '@google-cloud/vision';
 * 
 * async function processWithGoogleVision(fileUrl: string) {
 *   const client = new ImageAnnotatorClient({
 *     credentials: JSON.parse(Deno.env.get('GOOGLE_CREDENTIALS') || '{}')
 *   });
 *   
 *   const [result] = await client.textDetection(fileUrl);
 *   const detections = result.textAnnotations;
 *   const text = detections?.[0]?.description || '';
 *   
 *   // Parse text baseado no tipo de documento
 *   return parseDocumentText(text, documentType);
 * }
 * 
 * 
 * EXEMPLO DE INTEGRAÇÃO COM AWS TEXTRACT:
 * 
 * import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
 * 
 * async function processWithAWSTextract(fileUrl: string) {
 *   const client = new TextractClient({
 *     region: Deno.env.get('AWS_REGION'),
 *     credentials: {
 *       accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
 *       secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!
 *     }
 *   });
 *   
 *   const command = new AnalyzeDocumentCommand({
 *     Document: { S3Object: { Bucket: 'bucket', Name: 'key' } },
 *     FeatureTypes: ['FORMS', 'TABLES']
 *   });
 *   
 *   const response = await client.send(command);
 *   return parseTextractResponse(response);
 * }
 */
