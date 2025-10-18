import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extrair contrato_id se fornecido
    let requestBody = {};
    try {
      requestBody = await req.json();
    } catch {
      // Body vazio ou inválido, usar comportamento padrão
    }
    
    const { contrato_id } = requestBody as { contrato_id?: string };
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const assignafyApiKey = Deno.env.get('ASSINAFY_API_KEY');
    const assignafyAccountId = Deno.env.get('ASSINAFY_ACCOUNT_ID');
    
    if (contrato_id) {
      console.log(`🔍 Processando contrato específico: ${contrato_id}`);
    } else {
      console.log('🔍 Buscando todos os contratos órfãos...');
    }
    
    // 1. Buscar contratos órfãos (todos ou específico)
    let queryBuilder = supabaseAdmin
      .from('signature_requests')
      .select(`
        *,
        contratos (
          numero_contrato,
          inscricoes_edital (
            profiles (email, nome)
          )
        )
      `)
      .not('external_id', 'is', null)
      .is('metadata->>assinafy_assignment_id', null)
      .in('status', ['processing', 'pending']);

    // ✅ Aplicar filtros condicionalmente
    if (contrato_id) {
      queryBuilder = queryBuilder.eq('contrato_id', contrato_id);
    } else {
      queryBuilder = queryBuilder.order('created_at', { ascending: false }).limit(20);
    }

    const { data: signatureRequests, error: fetchError } = await queryBuilder;
    
    if (fetchError) throw fetchError;

    // Validação específica para processamento individual
    if (contrato_id && (!signatureRequests || signatureRequests.length === 0)) {
      throw new Error(`Contrato ${contrato_id} não encontrado ou não é órfão`);
    }
    
    console.log(`📊 Encontrados ${signatureRequests?.length || 0} contrato(s)`);
    
    const results = [];
    
    // 2. Processar cada contrato
    for (const sr of signatureRequests || []) {
      const contrato = sr.contratos;
      const candidato = contrato.inscricoes_edital.profiles;
      const documentId = sr.external_id;
      
      console.log(`\n🔧 Processando: ${contrato.numero_contrato}`);
      
      try {
        // 2a. Get or create signer
        console.log(`   → Buscando signer: ${candidato.email}`);
        
        const searchResponse = await fetch(
          `https://api.assinafy.com.br/v1/accounts/${assignafyAccountId}/signers?search=${encodeURIComponent(candidato.email)}`,
          {
            method: 'GET',
            headers: { 'X-Api-Key': assignafyApiKey! }
          }
        );
        
        let signerId;
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const existingSigner = searchData.data?.find((s: any) => s.email === candidato.email);
          
          if (existingSigner) {
            signerId = existingSigner.id;
            console.log(`   ✅ Signer encontrado: ${signerId}`);
          } else {
            // Criar novo signer
            console.log(`   → Criando novo signer...`);
            const createResponse = await fetch(
              `https://api.assinafy.com.br/v1/accounts/${assignafyAccountId}/signers`,
              {
                method: 'POST',
                headers: {
                  'X-Api-Key': assignafyApiKey!,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  full_name: candidato.nome || candidato.email,
                  email: candidato.email
                })
              }
            );
            
            if (!createResponse.ok) {
              throw new Error(`Erro ao criar signer: ${await createResponse.text()}`);
            }
            
            const createData = await createResponse.json();
            signerId = createData.data.id;
            console.log(`   ✅ Signer criado: ${signerId}`);
          }
        }
        
        // 2b. Criar assignment
        console.log(`   → Criando assignment...`);
        
        const assignmentResponse = await fetch(
          `https://api.assinafy.com.br/v1/documents/${documentId}/assignments`,
          {
            method: 'POST',
            headers: {
              'X-Api-Key': assignafyApiKey!,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              method: 'virtual',
              signer_ids: [signerId],
              message: `Por favor, assine o contrato ${contrato.numero_contrato}.`,
              expires_at: null
            })
          }
        );
        
        if (!assignmentResponse.ok) {
          const errorText = await assignmentResponse.text();
          throw new Error(`Erro ao criar assignment: ${errorText}`);
        }
        
        const assignmentData = await assignmentResponse.json();
        const assignmentId = assignmentData.data?.id || assignmentData.id;
        
        console.log(`   ✅ Assignment criado: ${assignmentId}`);
        
        // 2c. Buscar signature_url
        console.log(`   → Buscando URL de assinatura...`);
        
        const docResponse = await fetch(
          `https://api.assinafy.com.br/v1/documents/${documentId}`,
          {
            method: 'GET',
            headers: { 'X-Api-Key': assignafyApiKey! }
          }
        );
        
        let signatureUrl = '';
        if (docResponse.ok) {
          const docData = await docResponse.json();
          signatureUrl = docData.data?.signing_url || '';
          console.log(`   ✅ URL obtida: ${signatureUrl ? 'Sim' : 'Não'}`);
        }
        
        // 2d. Atualizar no banco
        console.log(`   → Salvando no banco...`);
        
        const { error: updateError } = await supabaseAdmin
          .from('signature_requests')
          .update({
            status: 'pending',
            metadata: {
              ...sr.metadata,
              assinafy_assignment_id: assignmentId,
              signature_url: signatureUrl,
              reprocessed_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', sr.id);
        
        if (updateError) throw updateError;
        
        console.log(`   ✅ Salvo no banco`);
        
        results.push({
          contrato: contrato.numero_contrato,
          status: 'success',
          assignment_id: assignmentId,
          signature_url: signatureUrl,
          email: candidato.email
        });
        
      } catch (error: any) {
        console.error(`   ❌ Erro: ${error.message}`);
        
        results.push({
          contrato: contrato.numero_contrato,
          status: 'failed',
          error: error.message,
          email: candidato.email
        });
      }
    }
    
    // 3. Retornar relatório
    const summary = {
      total: signatureRequests?.length || 0,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      details: results,
      single_contract: !!contrato_id
    };
    
    console.log('\n📊 RESUMO FINAL:');
    console.log(`   Total: ${summary.total}`);
    console.log(`   ✅ Sucesso: ${summary.success}`);
    console.log(`   ❌ Falhas: ${summary.failed}`);
    if (contrato_id) {
      console.log(`   🎯 Processamento individual: ${contrato_id}`);
    }
    
    return new Response(
      JSON.stringify(summary, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error: any) {
    console.error('❌ ERRO FATAL:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
