/**
 * Executor para nós do tipo WEBHOOK e HTTP
 * Enterprise-grade: retry, backoff, timeout, SSRF prevention
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

// Lista de IPs/ranges privados bloqueados (SSRF prevention)
const BLOCKED_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^0\./,
  /^localhost$/i,
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i
];

export class WebhookExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log('[HTTP_EXECUTOR] Iniciando requisição HTTP');
    
    const httpConfig = node.data.httpConfig || node.data.webhookConfig;
    
    if (!httpConfig || !httpConfig.url) {
      console.error('[HTTP_EXECUTOR] ❌ URL não configurada');
      return {
        outputData: { ...context, httpSuccess: false, httpError: 'URL não configurada' },
        shouldContinue: true
      };
    }
    
    const startTime = Date.now();
    
    try {
      // 1. Resolver variáveis
      const url = this.resolveVariables(httpConfig.url, context);
      
      // 2. SSRF Prevention
      if (!this.isUrlSafe(url)) {
        throw new Error('URL bloqueada por segurança (SSRF prevention)');
      }
      
      // 3. Construir request
      const method = (httpConfig.method || 'GET').toUpperCase();
      const timeout = httpConfig.timeout || 30000;
      const headers = this.buildHeaders(httpConfig, context);
      const body = this.buildBody(httpConfig, method, context);
      
      console.log(`[HTTP_EXECUTOR] ${method} ${url} (timeout: ${timeout}ms)`);
      
      // 4. Executar com retry
      const retryConfig = httpConfig.retry || { enabled: false, maxAttempts: 1, statusCodes: [], backoffStrategy: 'exponential' };
      const response = await this.fetchWithRetry(url, method, headers, body, timeout, retryConfig);
      
      // 5. Parse resposta
      const responseData = await this.parseResponse(response, httpConfig.responseType);
      const timingMs = Date.now() - startTime;
      
      // 6. Validar status
      const isSuccess = this.validateStatus(response.status, httpConfig.validateStatus);
      
      // 7. Logs de métricas
      console.log(`[HTTP_EXECUTOR] ✅ ${response.status} ${response.statusText} (${timingMs}ms)`);
      
      if (!isSuccess) {
        console.warn(`[HTTP_EXECUTOR] ⚠️ Status ${response.status} considerado falha pela validação customizada`);
        return {
          outputData: {
            ...context,
            httpSuccess: false,
            httpStatus: response.status,
            httpStatusText: response.statusText,
            httpHeaders: this.headersToObject(response.headers),
            httpBody: responseData,
            httpTimingMs: timingMs,
            httpError: `Validação de status falhou: ${response.status}`
          },
          shouldContinue: true
        };
      }
      
      return {
        outputData: {
          ...context,
          httpSuccess: true,
          httpStatus: response.status,
          httpStatusText: response.statusText,
          httpHeaders: this.headersToObject(response.headers),
          httpBody: responseData,
          httpResponse: responseData, // Alias para compatibilidade
          httpTimingMs: timingMs,
          webhookCalled: true,
          httpCalled: true
        },
        shouldContinue: true
      };
      
    } catch (err: any) {
      const timingMs = Date.now() - startTime;
      console.error(`[HTTP_EXECUTOR] ❌ Erro (${timingMs}ms):`, err.message);
      
      return {
        outputData: {
          ...context,
          httpSuccess: false,
          httpError: err.message,
          httpTimingMs: timingMs
        },
        shouldContinue: true
      };
    }
  }
  
  /**
   * Fetch com retry e backoff exponencial
   */
  private async fetchWithRetry(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: string | null,
    timeout: number,
    retryConfig: any
  ): Promise<Response> {
    const maxAttempts = retryConfig.enabled ? (retryConfig.maxAttempts || 3) : 1;
    const backoffStrategy = retryConfig.backoffStrategy || 'exponential';
    const initialDelayMs = retryConfig.initialDelayMs || 1000;
    const retryStatusCodes = retryConfig.statusCodes || [];
    
    let lastError: Error | null = null;
    let lastResponse: Response | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // AbortSignal para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          method,
          headers,
          body: body || undefined,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        lastResponse = response;
        
        // Verificar se deve fazer retry baseado no status
        if (retryStatusCodes.includes(response.status) && attempt < maxAttempts) {
          const delay = this.calculateBackoff(attempt, backoffStrategy, initialDelayMs);
          console.log(`[HTTP_EXECUTOR] 🔄 Retry ${attempt}/${maxAttempts} após ${delay}ms (status ${response.status})`);
          await this.sleep(delay);
          continue;
        }
        
        // Retornar resposta
        return response;
        
      } catch (error: any) {
        lastError = error;
        
        // Retry em erros de rede
        if (attempt < maxAttempts) {
          const delay = this.calculateBackoff(attempt, backoffStrategy, initialDelayMs);
          console.log(`[HTTP_EXECUTOR] 🔄 Retry ${attempt}/${maxAttempts} após ${delay}ms (erro: ${error.message})`);
          await this.sleep(delay);
        }
      }
    }
    
    // Esgotaram as tentativas
    if (lastResponse) {
      return lastResponse;
    }
    
    throw lastError || new Error('Falha na requisição HTTP após múltiplas tentativas');
  }
  
  /**
   * Calcula delay para backoff (exponencial ou fixo)
   */
  private calculateBackoff(attempt: number, strategy: string, initialDelayMs: number): number {
    if (strategy === 'exponential') {
      // Exponencial: 1s, 2s, 4s, 8s...
      return initialDelayMs * Math.pow(2, attempt - 1);
    } else {
      // Fixo: 1s, 1s, 1s...
      return initialDelayMs;
    }
  }
  
  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Constrói headers (incluindo autenticação)
   */
  private buildHeaders(httpConfig: any, context: ExecutionContext): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(httpConfig.headers || {})
    };
    
    // Resolver variáveis nos headers
    for (const key in headers) {
      headers[key] = this.resolveVariables(headers[key], context);
    }
    
    // Adicionar autenticação
    const auth = httpConfig.authentication;
    if (auth && auth.type !== 'none') {
      switch (auth.type) {
        case 'bearer':
          const token = this.resolveVariables(auth.token || '', context);
          headers['Authorization'] = `Bearer ${token}`;
          break;
          
        case 'basic':
          const username = this.resolveVariables(auth.username || '', context);
          const password = this.resolveVariables(auth.password || '', context);
          const encoded = btoa(`${username}:${password}`);
          headers['Authorization'] = `Basic ${encoded}`;
          break;
          
        case 'apiKey':
          const headerName = auth.apiKeyHeader || 'X-API-Key';
          const apiKey = this.resolveVariables(auth.apiKey || '', context);
          headers[headerName] = apiKey;
          break;
      }
    }
    
    return headers;
  }
  
  /**
   * Constrói body da requisição
   */
  private buildBody(httpConfig: any, method: string, context: ExecutionContext): string | null {
    if (!['POST', 'PUT', 'PATCH'].includes(method)) {
      return null;
    }
    
    if (!httpConfig.body) {
      return null;
    }
    
    // Resolver variáveis no body
    return this.resolveVariables(httpConfig.body, context);
  }
  
  /**
   * Parse resposta baseado no tipo
   */
  private async parseResponse(response: Response, responseType?: string): Promise<any> {
    const type = responseType || 'json';
    
    try {
      switch (type) {
        case 'json':
          return await response.json();
        case 'text':
          return await response.text();
        case 'blob':
          return await response.blob();
        default:
          return await response.text();
      }
    } catch (error) {
      // Fallback para text se falhar
      return await response.text();
    }
  }
  
  /**
   * Valida status HTTP
   */
  private validateStatus(status: number, validateStatusExpression?: string): boolean {
    if (!validateStatusExpression) {
      // Default: 2xx é sucesso
      return status >= 200 && status < 300;
    }
    
    try {
      // Avaliar expressão JavaScript
      const func = new Function('status', `return ${validateStatusExpression}`);
      return Boolean(func(status));
    } catch (error) {
      console.error('[HTTP_EXECUTOR] Erro ao avaliar validateStatus:', error);
      return status >= 200 && status < 300;
    }
  }
  
  /**
   * SSRF Prevention: bloqueia IPs privados e localhost
   */
  private isUrlSafe(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Bloquear IPs privados
      for (const pattern of BLOCKED_IP_RANGES) {
        if (pattern.test(hostname)) {
          console.error(`[HTTP_EXECUTOR] 🛡️ SSRF: Bloqueado acesso a ${hostname}`);
          return false;
        }
      }
      
      // Bloquear file:// e outros protocolos perigosos
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        console.error(`[HTTP_EXECUTOR] 🛡️ SSRF: Protocolo não permitido ${urlObj.protocol}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[HTTP_EXECUTOR] ❌ URL inválida:', error);
      return false;
    }
  }
  
  /**
   * Converte Headers para objeto
   */
  private headersToObject(headers: Headers): Record<string, string> {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  
  /**
   * Resolve variáveis no formato {{variavel}}
   */
  private resolveVariables(template: string, context: ExecutionContext): string {
    if (!template) return template;
    
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const trimmedPath = path.trim();
      const parts = trimmedPath.split('.');
      let value: any = context;
      
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          console.warn(`[HTTP_EXECUTOR] Variável não encontrada: ${trimmedPath}`);
          return match; // Manter placeholder se não encontrar
        }
      }
      
      return String(value !== null && value !== undefined ? value : match);
    });
  }
}
