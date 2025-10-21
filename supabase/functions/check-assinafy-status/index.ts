/**
 * Edge Function: check-assinafy-status
 * 
 * Verifica manualmente o status de um contrato no Assinafy e sincroniza com o banco.
 * Útil para casos onde o webhook falhou ou não foi processado.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckStatusRequest {
  contratoId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contratoId }: CheckStatusRequest = await req.json();

    if (!contratoId) {
      throw new Error('contratoId é obrigatório');
    }

    console.log('[CHECK_ASSINAFY] Verificando status do contrato:', contratoId);

    // Credenciais
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const assifafyApiKey = Deno.env.get('ASSINAFY_API_KEY');
    const assifafyAccountId = Deno.env.get('ASSINAFY_ACCOUNT_ID');

    if (!assifafyApiKey || !assifafyAccountId) {
      throw new Error('Credenciais da Assinafy não configuradas');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar signature_request
    const { data: signatureRequest, error: srError } = await supabase
      .from('signature_requests')
      .select('id, external_id, status, external_status, contrato_id, metadata')
      .eq('contrato_id', contratoId)
      .maybeSingle();

    if (srError) {
      console.error('[CHECK_ASSINAFY] Erro ao buscar signature_request:', srError);
      throw new Error(`Erro ao buscar signature_request: ${srError.message}`);
    }

    if (!signatureRequest) {
      throw new Error('Signature request não encontrado para este contrato');
    }

    // Buscar document_id do external_id ou metadata
    const documentId = signatureRequest.external_id || 
                      (signatureRequest.metadata as any)?.document_id ||
                      (signatureRequest.metadata as any)?.assinafy_document_id;

    if (!documentId) {
      throw new Error('Signature request ainda não possui external_id da Assinafy');
    }

    console.log('[CHECK_ASSINAFY] Document ID:', documentId);

    // Consultar Assinafy
    const assifafyUrl = `https://api.assinafy.com.br/v1/accounts/${assifafyAccountId}/documents/${documentId}`;
    
    console.log('[CHECK_ASSINAFY] Consultando Assinafy URL:', assifafyUrl);
    
    const assifafyResponse = await fetch(assifafyUrl, {
      method: 'GET',
      headers: {
        'X-Api-Key': assifafyApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!assifafyResponse.ok) {
      const errorText = await assifafyResponse.text();
      throw new Error(`Erro ao consultar Assinafy: ${assifafyResponse.status} - ${errorText}`);
    }

    const assifafyData = await assifafyResponse.json();
    console.log('[CHECK_ASSINAFY] Resposta Assinafy:', JSON.stringify(assifafyData));

    // Extrair status do documento
    const documentStatus = assifafyData.status || 'unknown';
    let newStatus = signatureRequest.status;
    let newExternalStatus = documentStatus;

    // Mapear status da Assinafy para nosso sistema
    if (documentStatus === 'signed' || documentStatus === 'completed') {
      newStatus = 'completed';
      
      // Atualizar contrato
      await supabase
        .from('contratos')
        .update({
          status: 'assinado',
          assinado_em: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', contratoId);

      // Ativar credenciado
      const { data: contrato } = await supabase
        .from('contratos')
        .select('inscricao_id')
        .eq('id', contratoId)
        .single();

      if (contrato?.inscricao_id) {
        console.log('[CHECK_ASSINAFY] Sincronizando dados do credenciado...');
        
        // Chamar função SQL que extrai dados do contrato
        const { data: credenciadoId, error: syncError } = await supabase
          .rpc('sync_approved_inscricao_to_credenciado_v2', {
            p_inscricao_id: contrato.inscricao_id
          });

        if (syncError) {
          console.error('[CHECK_ASSINAFY] ❌ Erro ao sincronizar:', syncError);
        } else {
          console.log('[CHECK_ASSINAFY] ✅ Credenciado sincronizado:', credenciadoId);
        }

        // Buscar ID do credenciado para gerar certificado
        let finalCredenciadoId = credenciadoId;
        
        if (!finalCredenciadoId) {
          const { data: credenciadoData } = await supabase
            .from('credenciados')
            .select('id')
            .eq('inscricao_id', contrato.inscricao_id)
            .single();
          
          finalCredenciadoId = credenciadoData?.id;
        }

        if (finalCredenciadoId) {
          console.log('[CHECK_ASSINAFY] Gerando certificado para:', finalCredenciadoId);
          await supabase.functions.invoke('gerar-certificado', {
            body: { credenciadoId: finalCredenciadoId }
          });
        }
      }

      console.log('[CHECK_ASSINAFY] Contrato atualizado para assinado');
    } else if (documentStatus === 'rejected' || documentStatus === 'expired') {
      newStatus = 'failed';
    }

    // Atualizar signature_request
    await supabase
      .from('signature_requests')
      .update({
        status: newStatus,
        external_status: newExternalStatus,
        metadata: {
          ...(signatureRequest.metadata as any || {}),
          last_sync_at: new Date().toISOString(),
          assinafy_data: assifafyData
        }
      })
      .eq('id', signatureRequest.id);

    return new Response(
      JSON.stringify({
        success: true,
        signed: documentStatus === 'signed' || documentStatus === 'completed',
        status: documentStatus,
        message: `Status sincronizado: ${documentStatus}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[CHECK_ASSINAFY] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});