/**
 * Join Strategy Handler
 * Fase 5: Estratégias de junção para nós paralelos
 */

import { JoinStrategy, JoinConfig, GraphNode, NodeState } from './types.ts';
import { StateTracker } from './state-tracker.ts';

export class JoinStrategyHandler {
  private stateTracker: StateTracker;
  private joinTimeouts: Map<string, number>;

  constructor(stateTracker: StateTracker) {
    this.stateTracker = stateTracker;
    this.joinTimeouts = new Map();
  }

  /**
   * Verifica se um join node está pronto para executar
   */
  isJoinReady(
    joinNode: GraphNode,
    completedNodes: Set<string>
  ): boolean {
    const config = this.getJoinConfig(joinNode);
    const strategy = config.strategy;

    const completedDeps = joinNode.dependencies.filter(depId => 
      completedNodes.has(depId)
    );

    const totalDeps = joinNode.dependencies.length;

    console.log(`[JOIN_STRATEGY] Node[${joinNode.id}] strategy=${strategy}: ${completedDeps.length}/${totalDeps} completos`);

    switch (strategy) {
      case 'wait_all':
        return completedDeps.length === totalDeps;

      case 'wait_any':
        return completedDeps.length > 0;

      case 'first_complete':
        return completedDeps.length > 0;

      default:
        return completedDeps.length === totalDeps;
    }
  }

  /**
   * Configura timeout para um join node (se configurado)
   */
  setupTimeout(
    joinNode: GraphNode,
    onTimeout: () => void
  ): void {
    const config = this.getJoinConfig(joinNode);
    
    if (!config.timeout) {
      return;
    }

    console.log(`[JOIN_STRATEGY] Configurando timeout de ${config.timeout}ms para node[${joinNode.id}]`);

    const timeoutId = setTimeout(() => {
      console.warn(`[JOIN_STRATEGY] Timeout atingido para node[${joinNode.id}]`);
      
      if (config.onTimeout === 'fail') {
        this.stateTracker.setError(
          joinNode.id,
          `Timeout de ${config.timeout}ms atingido (estratégia: ${config.strategy})`
        );
      }
      
      onTimeout();
    }, config.timeout);

    this.joinTimeouts.set(joinNode.id, timeoutId);
  }

  /**
   * Cancela timeout de um join node
   */
  clearTimeout(nodeId: string): void {
    const timeoutId = this.joinTimeouts.get(nodeId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.joinTimeouts.delete(nodeId);
      console.log(`[JOIN_STRATEGY] Timeout cancelado para node[${nodeId}]`);
    }
  }

  /**
   * Obtém configuração de join (com defaults)
   */
  private getJoinConfig(joinNode: GraphNode): JoinConfig {
    const defaultConfig: JoinConfig = {
      strategy: 'wait_all',
      onTimeout: 'fail'
    };

    if (joinNode.data.joinConfig) {
      return { ...defaultConfig, ...joinNode.data.joinConfig };
    }

    return defaultConfig;
  }

  /**
   * Calcula progresso de um join node
   */
  calculateJoinProgress(
    joinNode: GraphNode,
    completedNodes: Set<string>
  ): number {
    const completedDeps = joinNode.dependencies.filter(depId => 
      completedNodes.has(depId)
    ).length;

    const totalDeps = joinNode.dependencies.length;
    
    if (totalDeps === 0) return 100;
    
    return Math.round((completedDeps / totalDeps) * 100);
  }

  /**
   * Obtém dependências pendentes de um join node
   */
  getPendingDependencies(
    joinNode: GraphNode,
    completedNodes: Set<string>
  ): string[] {
    return joinNode.dependencies.filter(depId => 
      !completedNodes.has(depId)
    );
  }

  /**
   * Valida configuração de join
   */
  validateJoinConfig(config: JoinConfig): { valid: boolean; error?: string } {
    const validStrategies: JoinStrategy[] = ['wait_all', 'wait_any', 'first_complete'];
    
    if (!validStrategies.includes(config.strategy)) {
      return {
        valid: false,
        error: `Estratégia inválida: ${config.strategy}. Use: ${validStrategies.join(', ')}`
      };
    }

    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number' || config.timeout <= 0) {
        return {
          valid: false,
          error: 'Timeout deve ser um número positivo'
        };
      }
    }

    if (config.onTimeout && !['fail', 'continue'].includes(config.onTimeout)) {
      return {
        valid: false,
        error: 'onTimeout deve ser "fail" ou "continue"'
      };
    }

    return { valid: true };
  }

  /**
   * Cria configuração de join com valores padrão
   */
  createJoinConfig(
    strategy: JoinStrategy = 'wait_all',
    timeout?: number,
    onTimeout?: 'fail' | 'continue'
  ): JoinConfig {
    const config: JoinConfig = { strategy };
    
    if (timeout !== undefined) {
      config.timeout = timeout;
    }
    
    if (onTimeout !== undefined) {
      config.onTimeout = onTimeout;
    }

    return config;
  }

  /**
   * Limpa todos os timeouts ativos
   */
  clearAllTimeouts(): void {
    for (const [nodeId, timeoutId] of this.joinTimeouts) {
      clearTimeout(timeoutId);
      console.log(`[JOIN_STRATEGY] Timeout limpo para node[${nodeId}]`);
    }
    this.joinTimeouts.clear();
  }

  /**
   * Debug: mostra status de todos os joins
   */
  debug(joinNodes: GraphNode[], completedNodes: Set<string>): void {
    console.log('[JOIN_STRATEGY] === DEBUG ===');
    
    for (const node of joinNodes) {
      const config = this.getJoinConfig(node);
      const progress = this.calculateJoinProgress(node, completedNodes);
      const pending = this.getPendingDependencies(node, completedNodes);
      
      console.log(`[JOIN_STRATEGY] Node[${node.id}]:`, {
        strategy: config.strategy,
        progress: `${progress}%`,
        dependencies: `${node.dependencies.length - pending.length}/${node.dependencies.length}`,
        pending: pending.length > 0 ? pending : 'none',
        timeout: config.timeout ? `${config.timeout}ms` : 'none'
      });
    }
  }
}
