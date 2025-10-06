/**
 * Executor para nós do tipo WEBHOOK e HTTP
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

export class WebhookExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log('[WEBHOOK_EXECUTOR] Fazendo chamada HTTP');
    
    const httpConfig = node.data.httpConfig || node.data.webhookConfig;
    
    if (!httpConfig || !httpConfig.url) {
      console.error('[WEBHOOK_EXECUTOR] ❌ URL não configurada');
      return {
        outputData: { ...context, httpSuccess: false, httpError: 'URL não configurada' },
        shouldContinue: true
      };
    }
    
    const method = (httpConfig.method || 'GET').toUpperCase();
    const url = this.resolveVariables(httpConfig.url, context);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(httpConfig.headers || {})
    };
    
    // Resolver variáveis nos headers
    for (const key in headers) {
      headers[key] = this.resolveVariables(headers[key], context);
    }
    
    let body: any = null;
    if (['POST', 'PUT', 'PATCH'].includes(method) && httpConfig.body) {
      body = this.resolveVariables(JSON.stringify(httpConfig.body), context);
    }
    
    console.log(`[WEBHOOK_EXECUTOR] ${method} ${url}`);
    
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? body : undefined
      });
      
      const responseData = await response.text();
      let parsedData: any = responseData;
      
      try {
        parsedData = JSON.parse(responseData);
      } catch {
        // Manter como texto se não for JSON
      }
      
      if (!response.ok) {
        console.error(`[WEBHOOK_EXECUTOR] ❌ HTTP ${response.status}: ${responseData}`);
        return {
          outputData: {
            ...context,
            httpSuccess: false,
            httpStatus: response.status,
            httpError: responseData,
            httpResponse: parsedData
          },
          shouldContinue: true
        };
      }
      
      console.log(`[WEBHOOK_EXECUTOR] ✅ HTTP ${response.status}`);
      return {
        outputData: {
          ...context,
          httpSuccess: true,
          httpStatus: response.status,
          httpResponse: parsedData,
          webhookCalled: true,
          httpCalled: true
        },
        shouldContinue: true
      };
    } catch (err: any) {
      console.error('[WEBHOOK_EXECUTOR] ❌ Exceção:', err);
      return {
        outputData: {
          ...context,
          httpSuccess: false,
          httpError: err.message
        },
        shouldContinue: true
      };
    }
  }
  
  private resolveVariables(template: string, context: ExecutionContext): string {
    if (!template) return template;
    
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      const parts = path.split('.');
      let value: any = context;
      
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return match;
        }
      }
      
      return String(value || match);
    });
  }
}
