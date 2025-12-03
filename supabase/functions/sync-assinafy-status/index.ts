/**
 * Edge Function: sync-assinafy-status
 * Fallback manual para sincronizar status de contratos com Assinafy
 * 
 * Busca todos os contratos pendentes de assinatura,
 * consulta a API do Assinafy para cada um,
 * e atualiza o status localmente.
 * 
 * Útil quando webhooks falham ou não são recebidos.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  contratoId: string;
  previousStatus: string;
  newStatus: string;
  assinafyStatus: string;
  updated: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[SYNC] Iniciando sincronização manual - ${requestId}`);

  try {
    // Configuração
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const assignafyApiKey = Deno.env.get('ASSINAFY_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!assignafyApiKey) {
      throw new Error('Missing ASSINAFY_API_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar contratos pendentes com signature_requests
    console.log('[SYNC] Buscando contratos pendentes...');
    
    const { data: contratos, error: fetchError } = await supabase
      .from('contratos')
      .select(`
        id,
        numero_contrato,
        status,
        inscricao_id,
        signature_requests!inner(
          id,
          external_id,
          status,
          metadata
        )
      `)
      .in('status', ['aguardando_assinatura', 'pendente_assinatura'])
      .not('signature_requests.external_id', 'is', null)
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    if (!contratos || contratos.length === 0) {
      console.log('[SYNC] Nenhum contrato pendente encontrado');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum contrato pendente de sincronização',
          totalProcessed: 0,
          results: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SYNC] ${contratos.length} contratos encontrados`);

    const results: SyncResult[] = [];

    // Processar cada contrato
    for (const contrato of contratos) {
      const signatureRequest = (contrato as any).signature_requests?.[0];
      if (!signatureRequest?.external_id) {
        console.warn(`[SYNC] Contrato ${contrato.id} sem external_id, pulando...`);
        continue;
      }

      const externalId = signatureRequest.external_id;
      
      try {
        console.log(`[SYNC] Consultando Assinafy para documento ${externalId}...`);

        // Consultar API do Assinafy
        const assignafyResponse = await fetch(
          `https://api.assinafy.com.br/v1/documents/${externalId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${assignafyApiKey}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );

        if (!assignafyResponse.ok) {
          const errorText = await assignafyResponse.text();
          console.error(`[SYNC] Erro Assinafy API: ${assignafyResponse.status} - ${errorText}`);
          
          results.push({
            contratoId: contrato.id,
            previousStatus: contrato.status,
            newStatus: contrato.status,
            assinafyStatus: 'error',
            updated: false,
            error: `API Error: ${assignafyResponse.status}`
          });
          continue;
        }

        const assignafyData = await assignafyResponse.json();
        const assignafyStatus = assignafyData.status || assignafyData.document?.status;

        console.log(`[SYNC] Status no Assinafy: ${assignafyStatus}`);

        // Verificar se precisa atualizar
        let shouldUpdate = false;
        let newContratoStatus = contrato.status;
        let newSignatureStatus = signatureRequest.status;

        if (assignafyStatus === 'signed' || assignafyStatus === 'completed') {
          if (contrato.status !== 'assinado') {
            shouldUpdate = true;
            newContratoStatus = 'assinado';
            newSignatureStatus = 'signed';
          }
        }

        if (shouldUpdate) {
          console.log(`[SYNC] Atualizando contrato ${contrato.id} para 'assinado'`);

          // Atualizar signature_request
          const { error: srError } = await supabase
            .from('signature_requests')
            .update({
              status: newSignatureStatus,
              external_status: assignafyStatus,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              metadata: {
                ...signatureRequest.metadata,
                synced_at: new Date().toISOString(),
                synced_via: 'manual_sync'
              }
            })
            .eq('id', signatureRequest.id);

          if (srError) throw srError;

          // Atualizar contrato
          const { error: contratoError } = await supabase
            .from('contratos')
            .update({
              status: newContratoStatus,
              assinado_em: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', contrato.id);

          if (contratoError) throw contratoError;

          // Ativar credenciado
          const { data: credenciado } = await supabase
            .from('credenciados')
            .select('id')
            .eq('inscricao_id', contrato.inscricao_id)
            .maybeSingle();

          if (credenciado) {
            console.log(`[SYNC] Ativando credenciado ${credenciado.id}`);
            
            const { error: credError } = await supabase
              .from('credenciados')
              .update({
                status: 'Ativo',
                observacoes: `Ativado via sincronização manual em ${new Date().toISOString()}`,
                updated_at: new Date().toISOString()
              })
              .eq('id', credenciado.id);

            if (credError) {
              console.error(`[SYNC] Erro ao ativar credenciado: ${credError.message}`);
            }
          }

          console.log(`[SYNC] ✅ Contrato ${contrato.id} sincronizado com sucesso`);

          results.push({
            contratoId: contrato.id,
            previousStatus: contrato.status,
            newStatus: newContratoStatus,
            assinafyStatus: assignafyStatus,
            updated: true
          });
        } else {
          console.log(`[SYNC] Contrato ${contrato.id} já está atualizado`);
          
          results.push({
            contratoId: contrato.id,
            previousStatus: contrato.status,
            newStatus: contrato.status,
            assinafyStatus: assignafyStatus,
            updated: false
          });
        }

      } catch (error: any) {
        console.error(`[SYNC] Erro ao processar contrato ${contrato.id}:`, error.message);
        
        results.push({
          contratoId: contrato.id,
          previousStatus: contrato.status,
          newStatus: contrato.status,
          assinafyStatus: 'error',
          updated: false,
          error: error.message
        });
      }
    }

    const totalUpdated = results.filter(r => r.updated).length;
    
    console.log(`[SYNC] Sincronização concluída: ${totalUpdated}/${results.length} atualizados`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sincronização concluída: ${totalUpdated} contratos atualizados`,
        totalProcessed: results.length,
        totalUpdated,
        results
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[SYNC] Erro geral:', error.message);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
