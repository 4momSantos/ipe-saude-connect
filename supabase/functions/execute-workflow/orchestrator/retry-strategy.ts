/**
 * FASE 4: Estratégia de Retry com Backoff Exponencial
 * 
 * Sistema de retry inteligente com backoff exponencial e jitter
 * para evitar thundering herd problem.
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

export interface RetryAttempt {
  attempt: number;
  delayMs: number;
  timestamp: string;
  error?: string;
}

export interface RetryMetrics {
  total_attempts: number;
  total_delay_ms: number;
  success: boolean;
  final_error?: string;
  attempts: RetryAttempt[];
}

// Configuração padrão de retry
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,      // 1s
  maxDelayMs: 30000,          // 30s
  backoffMultiplier: 2,       // exponencial: 1s, 2s, 4s...
  jitterFactor: 0.1           // 10% de variação aleatória
};

/**
 * Estratégia de retry com backoff exponencial
 */
export class RetryStrategy {
  private config: RetryConfig;
  private attempts: RetryAttempt[] = [];

  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Executa operação com retry automático
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: { executionId: string; nodeId: string; nodeType: string }
  ): Promise<{ result: T; metrics: RetryMetrics }> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        // Aguardar delay se não for primeira tentativa
        if (attempt > 1) {
          const delay = this.calculateDelay(attempt);
          console.log(`[RETRY] Waiting ${delay}ms before attempt ${attempt}/${this.config.maxAttempts}`, {
            execution_id: context.executionId,
            node_id: context.nodeId
          });
          await this.sleep(delay);
        }

        // Log da tentativa
        console.log(`[RETRY] Attempt ${attempt}/${this.config.maxAttempts}`, {
          execution_id: context.executionId,
          node_id: context.nodeId,
          node_type: context.nodeType
        });

        // Executar operação
        const startTime = Date.now();
        const result = await operation();
        
        // Sucesso! Registrar métricas
        const metrics: RetryMetrics = {
          total_attempts: attempt,
          total_delay_ms: this.getTotalDelay(),
          success: true,
          attempts: this.attempts
        };

        console.log(`[RETRY] Success after ${attempt} attempt(s)`, {
          execution_id: context.executionId,
          node_id: context.nodeId,
          ...metrics
        });

        return { result, metrics };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Registrar tentativa falha
        this.attempts.push({
          attempt,
          delayMs: attempt > 1 ? this.calculateDelay(attempt) : 0,
          timestamp: new Date().toISOString(),
          error: lastError.message
        });

        // Log do erro
        console.error(`[RETRY] Attempt ${attempt} failed:`, {
          execution_id: context.executionId,
          node_id: context.nodeId,
          error: lastError.message,
          will_retry: attempt < this.config.maxAttempts
        });

        // Se for última tentativa, lançar erro
        if (attempt >= this.config.maxAttempts) {
          const metrics: RetryMetrics = {
            total_attempts: attempt,
            total_delay_ms: this.getTotalDelay(),
            success: false,
            final_error: lastError.message,
            attempts: this.attempts
          };

          console.error(`[RETRY] Max attempts reached, giving up`, {
            execution_id: context.executionId,
            node_id: context.nodeId,
            ...metrics
          });

          throw lastError;
        }
      }
    }

    // Nunca deve chegar aqui, mas TypeScript exige
    throw lastError || new Error('Unknown retry error');
  }

  /**
   * Calcula delay para próxima tentativa com backoff exponencial e jitter
   */
  private calculateDelay(attempt: number): number {
    // Backoff exponencial
    const exponentialDelay = this.config.initialDelayMs * 
      Math.pow(this.config.backoffMultiplier, attempt - 2);
    
    // Aplicar limite máximo
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);
    
    // Adicionar jitter (variação aleatória) para evitar thundering herd
    const jitter = cappedDelay * this.config.jitterFactor * (Math.random() - 0.5);
    const finalDelay = Math.round(cappedDelay + jitter);
    
    return finalDelay;
  }

  /**
   * Calcula delay total de todas as tentativas
   */
  private getTotalDelay(): number {
    return this.attempts.reduce((sum, attempt) => sum + attempt.delayMs, 0);
  }

  /**
   * Aguarda delay especificado
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verifica se erro é retryable
   */
  static isRetryableError(error: Error): boolean {
    // Erros de rede são retryable
    if (error.message.includes('network') || 
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED')) {
      return true;
    }

    // Erros 5xx do servidor são retryable
    if (error.message.includes('500') || 
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('504')) {
      return true;
    }

    // Rate limit é retryable
    if (error.message.includes('429') || 
        error.message.includes('rate limit')) {
      return true;
    }

    // Erros de validação não são retryable
    if (error.message.includes('validation') ||
        error.message.includes('invalid')) {
      return false;
    }

    // Por padrão, considerar retryable
    return true;
  }

  /**
   * Reseta o estado para nova série de tentativas
   */
  reset(): void {
    this.attempts = [];
  }

  /**
   * Retorna métricas atuais
   */
  getMetrics(): { attempts: RetryAttempt[]; totalDelay: number } {
    return {
      attempts: [...this.attempts],
      totalDelay: this.getTotalDelay()
    };
  }
}
