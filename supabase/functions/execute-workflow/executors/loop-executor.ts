/**
 * Loop Executor - Processa arrays de items sequencialmente ou em paralelo
 */

import {
  NodeExecutor,
  WorkflowNode,
  ExecutionContext,
  NodeExecutionResult,
  LoopNodeConfig,
  LoopNodeOutput,
} from './types.ts';

/**
 * Classe auxiliar para limitar concorrência
 */
class ConcurrencyLimiter {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;

  constructor(private maxConcurrency: number) {}

  async add<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.maxConcurrency) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
    }
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
      // Expressão - será resolvido pelo ContextManager
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
        itemVariable,
        indexVariable,
        continueOnError,
        maxConcurrency,
        iterationTimeout,
        checkpointEvery,
        context,
        supabaseClient,
        executionId,
        stepExecutionId,
        node
      );
    } else {
      output = await this.executeSequential(
        items,
        itemVariable,
        indexVariable,
        continueOnError,
        checkpointEvery,
        context,
        supabaseClient,
        executionId,
        stepExecutionId,
        node
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
    itemVariable: string,
    indexVariable: string,
    continueOnError: boolean,
    checkpointEvery: number,
    context: ExecutionContext,
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode
  ): Promise<LoopNodeOutput> {
    const results: any[] = [];
    const successResults: any[] = [];
    const errors: LoopNodeOutput['errors'] = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

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
        successCount++;

        // Checkpoint periódico
        if ((i + 1) % checkpointEvery === 0) {
          await this.saveIntermediateCheckpoint(
            supabaseClient,
            executionId,
            stepExecutionId,
            node.id,
            i + 1,
            items.length,
            results
          );
        }
      } catch (error: any) {
        failureCount++;
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
      }
    }

    return {
      results,
      successResults,
      errors,
      stats: {
        successCount,
        failureCount,
        totalTime: 0, // Será preenchido no execute()
        avgTime: 0,
      },
    };
  }

  /**
   * Execução paralela (múltiplos items simultaneamente)
   */
  private async executeParallel(
    items: any[],
    itemVariable: string,
    indexVariable: string,
    continueOnError: boolean,
    maxConcurrency: number,
    iterationTimeout: number,
    checkpointEvery: number,
    context: ExecutionContext,
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode
  ): Promise<LoopNodeOutput> {
    const limiter = new ConcurrencyLimiter(maxConcurrency);
    const results: any[] = new Array(items.length).fill(null);
    const successResults: any[] = [];
    const errors: LoopNodeOutput['errors'] = [];
    let successCount = 0;
    let failureCount = 0;

    const promises = items.map((item, i) =>
      limiter.add(async () => {
        try {
          const iterationContext = this.createIterationContext(
            context,
            item,
            i,
            itemVariable,
            indexVariable
          );

          const result = await this.executeWithTimeout(
            () =>
              this.executeLoopBody(
                iterationContext,
                supabaseClient,
                executionId,
                stepExecutionId,
                node
              ),
            iterationTimeout
          );

          results[i] = result;
          successResults.push(result);
          successCount++;
        } catch (error: any) {
          failureCount++;
          errors.push({
            index: i,
            item,
            error: error.message || String(error),
            retryCount: 0,
          });

          console.error(`[LoopExecutor] Erro na iteração paralela ${i}:`, error.message);

          if (!continueOnError) {
            throw error;
          }
        }
      })
    );

    await Promise.all(promises);

    return {
      results,
      successResults,
      errors,
      stats: {
        successCount,
        failureCount,
        totalTime: 0,
        avgTime: 0,
      },
    };
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
   * Na Fase 3, isso será integrado com o orchestrator para executar sub-workflows
   */
  private async executeLoopBody(
    iterationContext: ExecutionContext,
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode
  ): Promise<any> {
    // STUB: Por enquanto, apenas retorna os dados da iteração
    // Na Fase 3, isso executará o subworkflow definido em loopBody
    console.log(
      `[LoopExecutor] Executando loop body para item:`,
      iterationContext.loop
    );

    // Simular processamento
    await new Promise((resolve) => setTimeout(resolve, 10));

    return {
      processed: true,
      item: iterationContext.loop,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Salvar checkpoint intermediário (stub)
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
   * Executar com timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
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
