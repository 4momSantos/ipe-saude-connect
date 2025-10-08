/**
 * Loop Executor - Processa arrays de items sequencialmente ou em paralelo
 * FASE 2: Event-driven concurrency, métricas detalhadas, checkpoints paralelos, timeout com cancelamento
 */

import {
  NodeExecutor,
  WorkflowNode,
  ExecutionContext,
  NodeExecutionResult,
  LoopNodeConfig,
  LoopNodeOutput,
  IterationMetrics,
} from './types.ts';

/**
 * Helper class para controlar concorrência em execução paralela
 * Event-driven (sem busy-waiting) para melhor performance de CPU
 */
class ConcurrencyLimiter {
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private running = 0;
  private maxConcurrency: number;

  constructor(maxConcurrency: number) {
    this.maxConcurrency = maxConcurrency;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.running >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift()!;
    this.running++;

    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    this.running = 0;
  }
}

/**
 * Executor para Loop Node
 */
export class LoopExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log(`[LoopExecutor] Iniciando execução do loop node ${node.id}`);

    const config = node.data as unknown as LoopNodeConfig;
    const startTime = Date.now();

    // Defaults
    const itemVariable = config.itemVariable || 'currentItem';
    const indexVariable = config.indexVariable || 'index';
    const continueOnError = config.continueOnError ?? false;
    const maxConcurrency = config.maxConcurrency || 3;
    const iterationTimeout = config.iterationTimeout || 30000;
    const checkpointEvery = config.checkpointEvery || 10;
    const executionMode = config.executionMode || 'sequential';

    // Resolver items
    let items: any[];
    if (typeof config.items === 'string') {
      const resolved = this.resolveExpression(config.items, context);
      items = Array.isArray(resolved) ? resolved : [];
    } else {
      items = Array.isArray(config.items) ? config.items : [];
    }

    // Validações
    if (!items || items.length === 0) {
      console.warn('[LoopExecutor] Array de items vazio');
      return {
        outputData: {
          results: [],
          successResults: [],
          errors: [],
          stats: {
            successCount: 0,
            failureCount: 0,
            totalTime: 0,
            avgTime: 0,
          },
        },
      };
    }

    console.log(`[LoopExecutor] Processando ${items.length} items em modo ${executionMode}`);

    // Executar baseado no modo
    let output: LoopNodeOutput;
    if (executionMode === 'parallel') {
      output = await this.executeParallel(
        items,
        supabaseClient,
        executionId,
        stepExecutionId,
        node,
        context,
        itemVariable,
        indexVariable,
        continueOnError,
        maxConcurrency,
        iterationTimeout,
        checkpointEvery
      );
    } else {
      output = await this.executeSequential(
        items,
        supabaseClient,
        executionId,
        stepExecutionId,
        node,
        context,
        itemVariable,
        indexVariable,
        continueOnError,
        checkpointEvery
      );
    }

    const totalTime = Date.now() - startTime;
    output.stats.totalTime = totalTime;
    output.stats.avgTime = items.length > 0 ? totalTime / items.length : 0;

    console.log(
      `[LoopExecutor] Concluído: ${output.stats.successCount} sucessos, ${output.stats.failureCount} falhas em ${totalTime}ms`
    );

    return {
      outputData: output,
    };
  }

  /**
   * Execução sequencial (um item por vez)
   */
  private async executeSequential(
    items: any[],
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext,
    itemVariable: string,
    indexVariable: string,
    continueOnError: boolean,
    checkpointEvery: number
  ): Promise<LoopNodeOutput> {
    const results: any[] = [];
    const successResults: any[] = [];
    const errors: LoopNodeOutput['errors'] = [];
    const metrics: IterationMetrics[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const startTime = Date.now();
      let success = false;

      try {
        // Criar contexto isolado para esta iteração
        const iterationContext = this.createIterationContext(
          context,
          item,
          i,
          itemVariable,
          indexVariable
        );

        // Executar loop body
        const result = await this.executeLoopBody(
          iterationContext,
          supabaseClient,
          executionId,
          stepExecutionId,
          node
        );

        results.push(result);
        successResults.push(result);
        success = true;

        // Checkpoint periódico
        if ((i + 1) % checkpointEvery === 0) {
          await this.saveIntermediateCheckpoint(
            supabaseClient,
            executionId,
            stepExecutionId,
            node.id,
            i + 1,
            items.length,
            successResults
          );
        }
      } catch (error: any) {
        const errorInfo = {
          index: i,
          item,
          error: error.message || String(error),
          retryCount: 0,
        };
        errors.push(errorInfo);
        results.push(null);

        console.error(`[LoopExecutor] Erro na iteração ${i}:`, error.message);

        if (!continueOnError) {
          console.log('[LoopExecutor] Interrompendo loop devido a erro');
          break;
        }
      } finally {
        const endTime = Date.now();
        metrics.push({
          index: i,
          startTime,
          endTime,
          duration: endTime - startTime,
          success,
        });
      }
    }

    // Calcular estatísticas
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);

    return {
      results,
      successResults,
      errors,
      metrics,
      stats: {
        successCount: successResults.length,
        failureCount: errors.length,
        totalTime: 0, // Será preenchido no execute()
        avgTime: 0,
        minTime: durations.length > 0 ? durations[0] : undefined,
        maxTime: durations.length > 0 ? durations[durations.length - 1] : undefined,
        p95Time: durations.length > 0 
          ? durations[Math.floor(durations.length * 0.95)] 
          : undefined,
      },
    };
  }

  /**
   * Execução paralela dos items com métricas e checkpoints
   */
  private async executeParallel(
    items: any[],
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext,
    itemVariable: string,
    indexVariable: string,
    continueOnError: boolean,
    maxConcurrency: number,
    iterationTimeout: number,
    checkpointEvery: number
  ): Promise<LoopNodeOutput> {
    const limiter = new ConcurrencyLimiter(maxConcurrency);
    const results: any[] = [];
    const successResults: any[] = [];
    const errors: any[] = [];
    const metrics: IterationMetrics[] = [];
    
    let completedCount = 0;
    const checkpointLock = { mutex: false };

    console.log(`[LOOP] Executando ${items.length} items em paralelo (max concurrency: ${maxConcurrency})`);

    const promises = items.map((item, i) =>
      limiter.add(async () => {
        const iterStartTime = Date.now();
        let success = false;

        try {
          const iterationContext = this.createIterationContext(
            context,
            item,
            i,
            itemVariable,
            indexVariable
          );

          const result = await this.executeWithTimeout(
            (signal) => this.executeLoopBody(
              iterationContext,
              supabaseClient,
              executionId,
              stepExecutionId,
              node,
              signal
            ),
            iterationTimeout
          );

          results[i] = result;
          successResults.push(result);
          success = true;

          // Incrementar contador de forma thread-safe
          completedCount++;

          // Checkpoint periódico
          if (completedCount % checkpointEvery === 0) {
            // Adquirir lock simples
            while (checkpointLock.mutex) {
              await new Promise(r => setTimeout(r, 10));
            }
            checkpointLock.mutex = true;

            try {
              await this.saveIntermediateCheckpoint(
                supabaseClient,
                executionId,
                stepExecutionId,
                node.id,
                completedCount,
                items.length,
                successResults
              );
              console.log(`[LOOP] Checkpoint salvo: ${completedCount}/${items.length} completados`);
            } finally {
              checkpointLock.mutex = false;
            }
          }

        } catch (error: any) {
          const errorMsg = error.message || String(error);
          console.error(`[LOOP] Erro no item ${i}:`, errorMsg);

          errors.push({
            index: i,
            item,
            error: errorMsg,
          });

          if (!continueOnError) {
            throw new Error(
              `Loop falhou no item ${i}: ${errorMsg}`
            );
          }
        } finally {
          const iterEndTime = Date.now();
          metrics.push({
            index: i,
            startTime: iterStartTime,
            endTime: iterEndTime,
            duration: iterEndTime - iterStartTime,
            success
          });
        }
      })
    );

    await Promise.all(promises);

    // Calcular estatísticas detalhadas
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const avgTime = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0;

    const output: LoopNodeOutput = {
      results,
      successResults,
      errors,
      metrics,
      stats: {
        successCount: successResults.length,
        failureCount: errors.length,
        totalTime: 0, // Será preenchido no execute()
        avgTime,
        minTime: durations.length > 0 ? durations[0] : undefined,
        maxTime: durations.length > 0 ? durations[durations.length - 1] : undefined,
        p95Time: durations.length > 0 
          ? durations[Math.floor(durations.length * 0.95)] 
          : undefined
      },
    };

    console.log(`[LOOP] Paralelo concluído: ${output.stats.successCount} sucessos, ${output.stats.failureCount} falhas`);
    console.log(`[LOOP] Performance: avg=${avgTime.toFixed(0)}ms, min=${output.stats.minTime}ms, max=${output.stats.maxTime}ms, p95=${output.stats.p95Time}ms`);

    if (errors.length > 0 && !continueOnError) {
      throw new Error(`Loop paralelo falhou com ${errors.length} erros`);
    }

    return output;
  }

  /**
   * Criar contexto isolado para uma iteração
   */
  private createIterationContext(
    globalContext: ExecutionContext,
    item: any,
    index: number,
    itemVariable: string,
    indexVariable: string
  ): ExecutionContext {
    return {
      ...globalContext,
      loop: {
        [itemVariable]: item,
        [indexVariable]: index,
      },
    };
  }

  /**
   * Executar o corpo do loop (stub por enquanto)
   * FASE 3: Será integrado com orchestrator para executar sub-workflows
   */
  private async executeLoopBody(
    iterationContext: ExecutionContext,
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    signal?: AbortSignal
  ): Promise<any> {
    // Checar se operação foi cancelada
    if (signal?.aborted) {
      throw new Error('Operation aborted by timeout');
    }

    // STUB: Simula processamento
    // Na Fase 3, aqui será executado o sub-workflow definido em loopBody
    
    console.log(`[LOOP] Executando iteração para item:`, iterationContext.loop);
    
    // Simular processamento async com suporte a cancelamento
    await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, Math.random() * 100);
      
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Operation aborted'));
        });
      }
    });
    
    return {
      processed: true,
      item: iterationContext.loop,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Salvar checkpoint intermediário
   * FASE 3: Será integrado com workflow_checkpoints table
   */
  private async saveIntermediateCheckpoint(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    nodeId: string,
    currentIndex: number,
    totalItems: number,
    partialResults: any[]
  ): Promise<void> {
    console.log(
      `[LoopExecutor] Checkpoint: ${currentIndex}/${totalItems} items processados`
    );

    // STUB: Na Fase 3, isso salvará no workflow_checkpoints
    // Por enquanto, apenas log
  }

  /**
   * Executar promise com timeout e cancelamento real via AbortController
   */
  private async executeWithTimeout<T>(
    fn: (signal?: AbortSignal) => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const controller = new AbortController();
    
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    
    try {
      const result = await fn(controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        throw new Error(`Timeout após ${timeoutMs}ms`);
      }
      throw error;
    }
  }

  /**
   * Resolver expressão no contexto
   * Simplificado - na prática, usaria ContextManager.resolveObject()
   */
  private resolveExpression(expression: string, context: ExecutionContext): any {
    // STUB: Implementação simplificada
    // Na prática, isso usaria o ContextManager para resolver variáveis
    try {
      // Remover chaves se houver
      const cleanExpr = expression.replace(/^\{|\}$/g, '').trim();

      // Tentar acessar propriedade do contexto
      const parts = cleanExpr.split('.');
      let value: any = context;

      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return [];
        }
      }

      return value;
    } catch (error) {
      console.error('[LoopExecutor] Erro ao resolver expressão:', error);
      return [];
    }
  }
}
