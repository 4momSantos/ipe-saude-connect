/**
 * Execution Scheduler
 * Fase 3: Escalonamento de execução com suporte a paralelismo
 */

import { ExecutionQueue, NodeStatus, DependencyGraph, OrchestratorConfig } from './types.ts';
import { GraphBuilder } from './graph-builder.ts';

export class ExecutionScheduler {
  private queue: ExecutionQueue;
  private config: OrchestratorConfig;
  private graphBuilder: GraphBuilder;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.graphBuilder = new GraphBuilder();
    this.queue = {
      ready: [],
      running: [],
      waiting: [],
      paused: [],
      completed: [],
      failed: []
    };
  }

  /**
   * Inicializa a fila com o nó de entrada
   */
  initialize(graph: DependencyGraph): void {
    this.queue = {
      ready: [graph.entryNode],
      running: [],
      waiting: Array.from(graph.nodes.keys()).filter(id => id !== graph.entryNode),
      paused: [],
      completed: [],
      failed: []
    };
    
    console.log('[SCHEDULER] Fila inicializada:', {
      ready: this.queue.ready.length,
      waiting: this.queue.waiting.length
    });
  }

  /**
   * Obtém próximos nós prontos para executar (respeitando limite de paralelismo)
   */
  getNextNodes(graph: DependencyGraph): string[] {
    const availableSlots = this.config.maxParallelNodes - this.queue.running.length;
    
    if (availableSlots <= 0) {
      console.log('[SCHEDULER] Limite de paralelismo atingido:', this.config.maxParallelNodes);
      return [];
    }

    // Verificar quais nós da fila de espera estão prontos
    const completedSet = new Set(this.queue.completed);
    const nowReady: string[] = [];

    for (const nodeId of this.queue.waiting) {
      if (this.graphBuilder.isNodeReady(nodeId, graph, completedSet)) {
        nowReady.push(nodeId);
      }
    }

    // Mover para ready
    for (const nodeId of nowReady) {
      this.moveNode(nodeId, 'waiting', 'ready');
    }

    // Retornar até availableSlots nós
    const nodesToExecute = this.queue.ready.slice(0, availableSlots);
    
    console.log('[SCHEDULER] Próximos nós:', {
      available: availableSlots,
      ready: this.queue.ready.length,
      selected: nodesToExecute.length,
      nodes: nodesToExecute
    });

    return nodesToExecute;
  }

  /**
   * Marca nó como em execução
   */
  startNode(nodeId: string): void {
    this.moveNode(nodeId, 'ready', 'running');
    console.log(`[SCHEDULER] Node[${nodeId}] iniciado. Running: ${this.queue.running.length}/${this.config.maxParallelNodes}`);
  }

  /**
   * Marca nó como completo
   */
  completeNode(nodeId: string): void {
    this.moveNode(nodeId, 'running', 'completed');
    console.log(`[SCHEDULER] Node[${nodeId}] completado. Total: ${this.queue.completed.length}`);
  }

  /**
   * Marca nó como pausado
   */
  pauseNode(nodeId: string): void {
    this.moveNode(nodeId, 'running', 'paused');
    console.log(`[SCHEDULER] Node[${nodeId}] pausado`);
  }

  /**
   * Retoma nó pausado
   */
  resumeNode(nodeId: string): void {
    this.moveNode(nodeId, 'paused', 'ready');
    console.log(`[SCHEDULER] Node[${nodeId}] retomado`);
  }

  /**
   * Marca nó como falhado
   */
  failNode(nodeId: string): void {
    this.moveNode(nodeId, 'running', 'failed');
    console.log(`[SCHEDULER] Node[${nodeId}] falhou`);
  }

  /**
   * Move nó entre filas
   */
  private moveNode(nodeId: string, from: keyof ExecutionQueue, to: keyof ExecutionQueue): void {
    const fromQueue = this.queue[from];
    const toQueue = this.queue[to];

    const index = fromQueue.indexOf(nodeId);
    if (index > -1) {
      fromQueue.splice(index, 1);
      toQueue.push(nodeId);
    }
  }

  /**
   * Verifica se o workflow está completo
   */
  isComplete(graph: DependencyGraph): boolean {
    // Completo se todos os nós de saída estão completos
    return graph.exitNodes.every(exitId => this.queue.completed.includes(exitId));
  }

  /**
   * Verifica se o workflow falhou
   */
  hasFailed(): boolean {
    return this.queue.failed.length > 0;
  }

  /**
   * Verifica se o workflow está bloqueado (paused sem nós running)
   */
  isBlocked(): boolean {
    return this.queue.paused.length > 0 && 
           this.queue.running.length === 0 && 
           this.queue.ready.length === 0;
  }

  /**
   * Obtém status da fila
   */
  getQueueStatus(): ExecutionQueue {
    return {
      ready: [...this.queue.ready],
      running: [...this.queue.running],
      waiting: [...this.queue.waiting],
      paused: [...this.queue.paused],
      completed: [...this.queue.completed],
      failed: [...this.queue.failed]
    };
  }

  /**
   * Calcula progresso do workflow (0-100)
   */
  calculateProgress(totalNodes: number): number {
    const completed = this.queue.completed.length;
    return Math.round((completed / totalNodes) * 100);
  }

  /**
   * Debug: imprime estado da fila
   */
  debug(): void {
    console.log('[SCHEDULER] === DEBUG ===');
    console.log('[SCHEDULER] Ready:', this.queue.ready);
    console.log('[SCHEDULER] Running:', this.queue.running);
    console.log('[SCHEDULER] Waiting:', this.queue.waiting.slice(0, 5), '...');
    console.log('[SCHEDULER] Paused:', this.queue.paused);
    console.log('[SCHEDULER] Completed:', this.queue.completed.length);
    console.log('[SCHEDULER] Failed:', this.queue.failed);
  }

  /**
   * Reseta a fila (para testes)
   */
  reset(): void {
    this.queue = {
      ready: [],
      running: [],
      waiting: [],
      paused: [],
      completed: [],
      failed: []
    };
  }
}
