/**
 * Edge Function: diagnostic-assinafy
 * Diagnóstico completo da integração com Assinafy
 * 
 * Retorna:
 * - Status de configuração (secrets)
 * - Testes de conectividade com API Assinafy
 * - Status de contratos e assinaturas recentes
 * - Recomendações de correção
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      overall_status: 'ANALYZING...',
      environment: {},
      secrets: {},
      assinafy_tests: {},
      database_status: {},
      recommendations: []
    };

    // ========================================
    // 1. VERIFICAR ENVIRONMENT E SECRETS
    // ========================================
    
    const environment = Deno.env.get("ENVIRONMENT") || 'NOT_SET';
    const devMode = environment !== "production";
    const apiKey = Deno.env.get("ASSINAFY_API_KEY");
    const accountId = Deno.env.get("ASSINAFY_ACCOUNT_ID");
    const resendKey = Deno.env.get("RESEND_API_KEY");

    diagnostics.environment = {
      ENVIRONMENT: environment,
      DEV_MODE: devMode,
      ready_for_production: environment === 'production' && !!apiKey && !!accountId,
      mode_description: devMode 
        ? '⚠️ MODO DESENVOLVIMENTO - Assinaturas serão simuladas'
        : '✅ MODO PRODUÇÃO - Emails reais serão enviados'
    };

    diagnostics.secrets = {
      ENVIRONMENT: {
        configured: !!environment && environment !== 'NOT_SET',
        value: environment,
        valid: environment === 'production',
        status: environment === 'production' ? '✅' : '❌'
      },
      ASSINAFY_API_KEY: {
        configured: !!apiKey,
        length: apiKey?.length || 0,
        preview: apiKey ? apiKey.substring(0, 10) + '...' : 'NOT_SET',
        valid: (apiKey?.length || 0) > 20,
        status: (apiKey?.length || 0) > 20 ? '✅' : '❌'
      },
      ASSINAFY_ACCOUNT_ID: {
        configured: !!accountId,
        value: accountId || 'NOT_SET',
        valid: (accountId?.length || 0) > 10,
        status: (accountId?.length || 0) > 10 ? '✅' : '❌'
      },
      RESEND_API_KEY: {
        configured: !!resendKey,
        preview: resendKey ? resendKey.substring(0, 10) + '...' : 'NOT_SET',
        required: false,
        status: !!resendKey ? '✅' : '⚠️ (opcional)'
      }
    };

    // ========================================
    // 2. TESTES DE CONECTIVIDADE ASSINAFY
    // ========================================

    if (apiKey && accountId) {
      // Teste 1: Autenticação
      try {
        console.log('🧪 [DIAGNOSTIC] Testando autenticação Assinafy...');
        
        const authResponse = await fetch('https://api.assinafy.com.br/v1/accounts', {
          method: 'GET',
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json'
          }
        });

        diagnostics.assinafy_tests.authentication = {
          status: authResponse.status,
          success: authResponse.status === 200,
          message: authResponse.status === 200 
            ? '✅ API Key válida - Autenticação bem-sucedida'
            : `❌ Falha na autenticação (HTTP ${authResponse.status})`,
          timestamp: new Date().toISOString()
        };

        if (authResponse.ok) {
          const authData = await authResponse.json();
          diagnostics.assinafy_tests.authentication.account_info = authData;
        } else {
          diagnostics.assinafy_tests.authentication.error = await authResponse.text();
        }

      } catch (error) {
        diagnostics.assinafy_tests.authentication = {
          success: false,
          message: '❌ Erro ao conectar com Assinafy',
          error: error instanceof Error ? error.message : String(error)
        };
      }

      // Teste 2: Acesso à Workspace
      try {
        console.log('🧪 [DIAGNOSTIC] Testando acesso à workspace...');
        
        const workspaceResponse = await fetch(
          `https://api.assinafy.com.br/v1/accounts/${accountId}/signers`,
          {
            method: 'GET',
            headers: {
              'X-Api-Key': apiKey,
              'Content-Type': 'application/json'
            }
          }
        );

        diagnostics.assinafy_tests.workspace_access = {
          status: workspaceResponse.status,
          success: workspaceResponse.status === 200,
          message: workspaceResponse.status === 200
            ? '✅ Workspace acessível - Account ID correto'
            : `❌ Falha ao acessar workspace (HTTP ${workspaceResponse.status})`,
          timestamp: new Date().toISOString()
        };

        if (workspaceResponse.ok) {
          const workspaceData = await workspaceResponse.json();
          diagnostics.assinafy_tests.workspace_access.signers_count = workspaceData.data?.length || 0;
          diagnostics.assinafy_tests.workspace_access.signers = workspaceData.data || [];
        } else {
          diagnostics.assinafy_tests.workspace_access.error = await workspaceResponse.text();
        }

      } catch (error) {
        diagnostics.assinafy_tests.workspace_access = {
          success: false,
          message: '❌ Erro ao acessar workspace',
          error: error instanceof Error ? error.message : String(error)
        };
      }

      // Teste 3: Verificar Webhooks
      try {
        console.log('🧪 [DIAGNOSTIC] Verificando configuração de webhooks...');
        
        const webhookResponse = await fetch(
          `https://api.assinafy.com.br/v1/accounts/${accountId}/webhooks/subscriptions`,
          {
            method: 'GET',
            headers: {
              'X-Api-Key': apiKey,
              'Content-Type': 'application/json'
            }
          }
        );

        diagnostics.assinafy_tests.webhook_status = {
          status: webhookResponse.status,
          success: webhookResponse.status === 200,
          timestamp: new Date().toISOString()
        };

        if (webhookResponse.ok) {
          const webhookData = await webhookResponse.json();
          const isActive = webhookData.data?.is_active || false;
          const webhookUrl = webhookData.data?.url || 'NOT_CONFIGURED';
          
          diagnostics.assinafy_tests.webhook_status.configured = isActive;
          diagnostics.assinafy_tests.webhook_status.url = webhookUrl;
          diagnostics.assinafy_tests.webhook_status.events = webhookData.data?.events || [];
          diagnostics.assinafy_tests.webhook_status.message = isActive
            ? '✅ Webhook configurado e ativo'
            : '⚠️ Webhook não configurado - assinaturas não atualizarão automaticamente';
        } else {
          diagnostics.assinafy_tests.webhook_status.error = await webhookResponse.text();
          diagnostics.assinafy_tests.webhook_status.message = '❌ Não foi possível verificar webhooks';
        }

      } catch (error) {
        diagnostics.assinafy_tests.webhook_status = {
          success: false,
          message: '❌ Erro ao verificar webhooks',
          error: error instanceof Error ? error.message : String(error)
        };
      }

    } else {
      diagnostics.assinafy_tests = {
        skipped: true,
        reason: 'API Key ou Account ID não configurados',
        message: '⚠️ Testes de conectividade não executados - configure os secrets primeiro'
      };
    }

    // ========================================
    // 3. VERIFICAR STATUS NO BANCO DE DADOS
    // ========================================

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Contratos recentes
      const { data: contratos, error: contratosError } = await supabase
        .from('contratos')
        .select('id, numero_contrato, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (contratosError) throw contratosError;

      diagnostics.database_status.recent_contracts = {
        count: contratos?.length || 0,
        pending_signature: contratos?.filter(c => c.status === 'pendente_assinatura').length || 0,
        signed: contratos?.filter(c => c.status === 'assinado').length || 0,
        contracts: contratos || []
      };

      // Signature Requests recentes
      const { data: signatures, error: signaturesError } = await supabase
        .from('signature_requests')
        .select('id, status, dev_mode, external_id, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (signaturesError) throw signaturesError;

      const devModeCount = signatures?.filter(s => s.dev_mode === true).length || 0;
      const productionCount = signatures?.filter(s => s.dev_mode === false).length || 0;

      diagnostics.database_status.recent_signatures = {
        total: signatures?.length || 0,
        dev_mode: devModeCount,
        production_mode: productionCount,
        pending: signatures?.filter(s => s.status === 'pending').length || 0,
        signed: signatures?.filter(s => s.status === 'signed').length || 0,
        rejected: signatures?.filter(s => s.status === 'rejected').length || 0,
        signatures: signatures || []
      };

      // ⚠️ ALERTA: Se há muitas assinaturas em dev_mode
      if (devModeCount > productionCount && devModeCount > 0) {
        diagnostics.recommendations.push(
          '⚠️ ATENÇÃO: Detectadas assinaturas em modo desenvolvimento. Configure ENVIRONMENT=production para enviar emails reais.'
        );
      }

    } catch (error) {
      diagnostics.database_status.error = error instanceof Error ? error.message : String(error);
      diagnostics.recommendations.push('❌ Erro ao consultar banco de dados');
    }

    // ========================================
    // 4. GERAR RECOMENDAÇÕES
    // ========================================

    const allSecretsConfigure = 
      diagnostics.secrets.ENVIRONMENT.valid &&
      diagnostics.secrets.ASSINAFY_API_KEY.valid &&
      diagnostics.secrets.ASSINAFY_ACCOUNT_ID.valid;

    const allTestsPassed = 
      diagnostics.assinafy_tests.authentication?.success &&
      diagnostics.assinafy_tests.workspace_access?.success;

    if (!diagnostics.secrets.ENVIRONMENT.valid) {
      diagnostics.recommendations.push(
        '❌ CRÍTICO: Configure o secret ENVIRONMENT=production (exatamente esta string, minúsculo)'
      );
    }

    if (!diagnostics.secrets.ASSINAFY_API_KEY.valid) {
      diagnostics.recommendations.push(
        '❌ CRÍTICO: Configure o secret ASSINAFY_API_KEY com sua chave da API Assinafy'
      );
    }

    if (!diagnostics.secrets.ASSINAFY_ACCOUNT_ID.valid) {
      diagnostics.recommendations.push(
        '❌ CRÍTICO: Configure o secret ASSINAFY_ACCOUNT_ID com o ID da sua workspace'
      );
    }

    if (diagnostics.assinafy_tests.authentication?.success === false) {
      diagnostics.recommendations.push(
        '❌ API Key inválida ou expirada. Verifique em: https://app.assinafy.com.br/settings/api'
      );
    }

    if (diagnostics.assinafy_tests.workspace_access?.success === false) {
      diagnostics.recommendations.push(
        '❌ Account ID inválido. Verifique em: https://app.assinafy.com.br/settings/workspace'
      );
    }

    if (diagnostics.assinafy_tests.webhook_status?.configured === false) {
      diagnostics.recommendations.push(
        '⚠️ Webhook não configurado. Configure em: https://app.assinafy.com.br/settings/webhooks',
        `   URL do webhook: ${Deno.env.get('SUPABASE_URL')}/functions/v1/assinafy-webhook-finalizacao`,
        '   Eventos: document.signed, document.rejected, document.expired, document.viewed'
      );
    }

    if (allSecretsConfigure && allTestsPassed) {
      diagnostics.recommendations.push(
        '✅ Sistema configurado corretamente e pronto para uso em produção!'
      );
    }

    // ========================================
    // 5. DETERMINAR STATUS GERAL
    // ========================================

    if (!allSecretsConfigure) {
      diagnostics.overall_status = '❌ CONFIGURAÇÃO INCOMPLETA';
    } else if (!allTestsPassed) {
      diagnostics.overall_status = '⚠️ PROBLEMAS DE CONECTIVIDADE';
    } else if (diagnostics.assinafy_tests.webhook_status?.configured === false) {
      diagnostics.overall_status = '⚠️ WEBHOOK NÃO CONFIGURADO';
    } else {
      diagnostics.overall_status = '✅ SISTEMA PRONTO PARA PRODUÇÃO';
    }

    // ========================================
    // 6. RESUMO EXECUTIVO
    // ========================================

    diagnostics.summary = {
      configuration_complete: allSecretsConfigure,
      api_connectivity: allTestsPassed,
      webhook_configured: diagnostics.assinafy_tests.webhook_status?.configured === true,
      production_ready: allSecretsConfigure && allTestsPassed && !devMode,
      next_steps: diagnostics.recommendations.length > 0 
        ? diagnostics.recommendations 
        : ['✅ Tudo pronto! Aprove um credenciado para testar o fluxo completo.']
    };

    console.log('✅ [DIAGNOSTIC] Diagnóstico completo gerado');
    console.log(JSON.stringify(diagnostics, null, 2));

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );

  } catch (error) {
    console.error('❌ [DIAGNOSTIC] Erro fatal:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString()
      }, null, 2),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});
