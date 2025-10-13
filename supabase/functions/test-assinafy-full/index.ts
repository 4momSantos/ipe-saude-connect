import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  interface TestResult {
    name: string;
    status: string;
    details: any;
    http_status?: number;
    error?: string;
  }

  const report: {
    timestamp: string;
    tests: TestResult[];
    overall_status: string;
    summary?: any;
    error?: any;
  } = {
    timestamp: new Date().toISOString(),
    tests: [],
    overall_status: 'unknown'
  };

  try {
    console.log('🧪 INICIANDO TESTE COMPLETO ASSINAFY');

    const apiKey = Deno.env.get('ASSINAFY_API_KEY');
    const accountId = Deno.env.get('ASSINAFY_ACCOUNT_ID');

    // TESTE 1: Validar Credenciais
    console.log('\n📋 TESTE 1: Validando credenciais...');
    const test1: TestResult = {
      name: 'Credenciais',
      status: 'running',
      details: {}
    };

    if (!apiKey || !accountId) {
      test1.status = 'failed';
      test1.error = 'Credenciais não configuradas';
      report.tests.push(test1);
      throw new Error('Credenciais não configuradas');
    }

    test1.details = {
      api_key_length: apiKey.length,
      account_id: accountId
    };
    test1.status = 'passed';
    report.tests.push(test1);
    console.log('✅ Credenciais OK');

    // TESTE 2: Criar Signatário de Teste
    console.log('\n📋 TESTE 2: Criando signatário de teste...');
    const test2: TestResult = {
      name: 'Criar Signatário',
      status: 'running',
      details: {}
    };

    const testEmail = `teste-${Date.now()}@finfloow.test`;
    const testName = 'Usuario Teste Finfloow';

    const createSignerResponse = await fetch(
      `https://api.assinafy.com.br/v1/accounts/${accountId}/signers`,
      {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: testName,
          email: testEmail
        })
      }
    );

    test2.http_status = createSignerResponse.status;
    test2.details.request_url = `https://api.assinafy.com.br/v1/accounts/${accountId}/signers`;

    if (!createSignerResponse.ok) {
      const errorText = await createSignerResponse.text();
      test2.status = 'failed';
      test2.error = errorText;
      test2.details.error_body = errorText;
      report.tests.push(test2);
      throw new Error(`Falha ao criar signatário: ${errorText}`);
    }

    const signerData = await createSignerResponse.json();
    const signerId = signerData.data.id;
    test2.status = 'passed';
    test2.details.signer_id = signerId;
    test2.details.response = signerData;
    report.tests.push(test2);
    console.log('✅ Signatário criado:', signerId);

    // TESTE 3: Criar PDF Simples
    console.log('\n📋 TESTE 3: Gerando PDF de teste...');
    const test3: TestResult = {
      name: 'Gerar PDF',
      status: 'running',
      details: {}
    };

    // Criar PDF simples usando Deno
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 55
>>
stream
BT
/F1 12 Tf
100 700 Td
(Contrato de Teste Finfloow) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
422
%%EOF`;

    const pdfBytes = new TextEncoder().encode(pdfContent);
    test3.details.pdf_size = pdfBytes.length;
    test3.status = 'passed';
    report.tests.push(test3);
    console.log('✅ PDF criado:', pdfBytes.length, 'bytes');

    // TESTE 4: Upload do Documento (CRÍTICO)
    console.log('\n📋 TESTE 4: Fazendo upload do documento...');
    const test4: TestResult = {
      name: 'Upload Documento',
      status: 'running',
      details: {}
    };

    const formData = new FormData();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    formData.append('file', blob, 'teste-finfloow.pdf');

    test4.details.form_data = {
      blob_size: blob.size,
      blob_type: blob.type,
      file_name: 'teste-finfloow.pdf'
    };

    const uploadResponse = await fetch(
      `https://api.assinafy.com.br/v1/accounts/${accountId}/documents`,
      {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey
        },
        body: formData
      }
    );

    test4.http_status = uploadResponse.status;
    test4.details.response_headers = Object.fromEntries(uploadResponse.headers.entries());

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      test4.status = 'failed';
      test4.error = errorText;
      test4.details.error_body = errorText;
      report.tests.push(test4);
      throw new Error(`Falha no upload: ${errorText}`);
    }

    const uploadData = await uploadResponse.json();
    
    // 🔍 ANÁLISE CRÍTICA DA ESTRUTURA DA RESPOSTA
    test4.details.full_upload_response = uploadData;
    test4.details.has_id_direct = uploadData.id !== undefined;
    test4.details.has_data_id = uploadData.data?.id !== undefined;
    test4.details.has_document_id = uploadData.document?.id !== undefined;
    
    // Tentar extrair documentId de diferentes locais
    const documentId = uploadData.id || uploadData.data?.id || uploadData.document?.id;
    
    if (!documentId) {
      test4.status = 'failed';
      test4.error = 'Document ID não encontrado em nenhuma estrutura conhecida';
      test4.details.analysis = {
        checked_paths: ['uploadData.id', 'uploadData.data.id', 'uploadData.document.id'],
        found: false,
        response_keys: Object.keys(uploadData)
      };
      report.tests.push(test4);
      throw new Error('Document ID não encontrado na resposta');
    }
    
    test4.status = 'passed';
    test4.details.document_id = documentId;
    test4.details.id_location = uploadData.id ? 'uploadData.id' : 
                                uploadData.data?.id ? 'uploadData.data.id' : 
                                'uploadData.document.id';
    report.tests.push(test4);
    console.log('✅ Documento criado:', documentId);
    console.log('📍 ID encontrado em:', test4.details.id_location);

    // TESTE 5: Solicitar Assinatura (CRÍTICO)
    console.log('\n📋 TESTE 5: Solicitando assinatura...');
    const test5: TestResult = {
      name: 'Solicitar Assinatura',
      status: 'running',
      details: {}
    };

    const assignmentPayload = {
      method: 'virtual',
      signer_ids: [signerId],
      message: 'Teste de assinatura do sistema Finfloow'
    };

    test5.details.payload = assignmentPayload;
    test5.details.document_id_used = documentId;

    const assignmentResponse = await fetch(
      `https://api.assinafy.com.br/v1/documents/${documentId}/assignments`,
      {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assignmentPayload)
      }
    );

    test5.http_status = assignmentResponse.status;

    if (!assignmentResponse.ok) {
      const errorText = await assignmentResponse.text();
      test5.status = 'failed';
      test5.error = errorText;
      test5.details.error_body = errorText;
      report.tests.push(test5);
      throw new Error(`Falha ao solicitar assinatura: ${errorText}`);
    }

    const assignmentData = await assignmentResponse.json();
    test5.status = 'passed';
    test5.details.assignment_response = assignmentData;
    test5.details.assignment_id = assignmentData.id || assignmentData.data?.id;
    report.tests.push(test5);
    console.log('✅ Assinatura solicitada:', assignmentData.id || assignmentData.data?.id);

    // RESULTADO FINAL
    report.overall_status = 'SUCCESS';
    report.summary = {
      all_tests_passed: true,
      document_created: documentId,
      assignment_created: assignmentData.id || assignmentData.data?.id,
      signer_created: signerId,
      ready_for_production: true,
      critical_finding: {
        document_id_location: test4.details.id_location,
        message: 'Use esta estrutura para extrair documentId em send-signature-request'
      }
    };

    console.log('\n✅ ============================================');
    console.log('✅ TODOS OS TESTES PASSARAM!');
    console.log('✅ Sistema está 100% funcional');
    console.log('✅ ID do documento encontrado em:', test4.details.id_location);
    console.log('✅ ============================================');

    return new Response(
      JSON.stringify(report, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('\n❌ ============================================');
    console.error('❌ ERRO NO TESTE');
    console.error('❌', errorMessage);
    console.error('❌ ============================================');

    report.overall_status = 'FAILED';
    report.error = {
      message: errorMessage,
      stack: errorStack
    };

    return new Response(
      JSON.stringify(report, null, 2),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
