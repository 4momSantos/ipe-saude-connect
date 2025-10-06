/**
 * State Tracker
 * Fase 4: Rastreamento detalhado de estado dos nós
 */

import { NodeState, NodeStatus, StateTransition } from './types.ts';

export class StateTracker {
  private states: Map<string, NodeState>;
  private supabaseClient: any;

  constructor(supabaseClient: any) {
    this.states = new Map();
    this.supabaseClient = supabaseClient;
  }

  /**
   * Inicializa estado de um nó
   */
  initializeNode(nodeId: string, nodeType: string): void {
    const state: NodeState = {
      nodeId,
      status: 'pending',
      transitions: [],
      metadata: { nodeType }
    };
    
    this.states.set(nodeId, state);
    console.log(`[STATE_TRACKER] Node[${nodeId}] inicializado`);
  }

  /**
   * Transiciona estado de um nó
   */
  transition(
    nodeId: string, 
    newStatus: NodeStatus, 
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    const state = this.states.get(nodeId);
    if (!state) {
      console.warn(`[STATE_TRACKER] Node[${nodeId}] não encontrado`);
      return;
    }

    const oldStatus = state.status;
    
    // Registrar transição
    const transition: StateTransition = {
      from: oldStatus,
      to: newStatus,
      timestamp: new Date().toISOString(),
      reason
    };
    
    state.transitions.push(transition);
    state.status = newStatus;

    // Atualizar timestamps
    if (newStatus === 'running' && !state.startedAt) {
      state.startedAt = new Date().toISOString();
    }
    
    if (['completed', 'failed', 'skipped'].includes(newStatus) && !state.completedAt) {
      state.completedAt = new Date().toISOString();
    }

    // Atualizar metadata se fornecido
    if (metadata) {
      state.metadata = { ...state.metadata, ...metadata };
    }

    console.log(`[STATE_TRACKER] Node[${nodeId}]: ${oldStatus} -> ${newStatus}${reason ? ` (${reason})` : ''}`);

    // Persistir no banco (async, não bloqueia)
    this.persistState(nodeId, state).catch(err => {
      console.error(`[STATE_TRACKER] Erro ao persistir estado: ${err.message}`);
    });
  }

  /**
   * Atualiza progresso de um nó (0-100)
   */
  updateProgress(nodeId: string, progress: number): void {
    const state = this.states.get(nodeId);
    if (state) {
      state.progress = Math.min(100, Math.max(0, progress));
      console.log(`[STATE_TRACKER] Node[${nodeId}] progresso: ${state.progress}%`);
    }
  }

  /**
   * Registra erro em um nó
   */
  setError(nodeId: string, errorMessage: string): void {
    const state = this.states.get(nodeId);
    if (state) {
      state.errorMessage = errorMessage;
      this.transition(nodeId, 'failed', errorMessage);
    }
  }

  /**
   * Incrementa contador de retry
   */
  incrementRetry(nodeId: string): void {
    const state = this.states.get(nodeId);
    if (state) {
      state.retryCount = (state.retryCount || 0) + 1;
      console.log(`[STATE_TRACKER] Node[${nodeId}] retry #${state.retryCount}`);
    }
  }

  /**
   * Marca nó como bloqueado por dependências
   */
  setBlocked(nodeId: string, blockedBy: string[]): void {
    const state = this.states.get(nodeId);
    if (state) {
      state.blockedBy = blockedBy;
      this.transition(nodeId, 'blocked', `Bloqueado por: ${blockedBy.join(', ')}`);
    }
  }

  /**
   * Remove bloqueio de um nó
   */
  clearBlocked(nodeId: string): void {
    const state = this.states.get(nodeId);
    if (state) {
      state.blockedBy = [];
      this.transition(nodeId, 'pending', 'Bloqueio removido');
    }
  }

  /**
   * Obtém estado de um nó
   */
  getState(nodeId: string): NodeState | undefined {
    return this.states.get(nodeId);
  }

  /**
   * Obtém todos os estados
   */
  getAllStates(): Map<string, NodeState> {
    return new Map(this.states);
  }

  /**
   * Obtém nós em um determinado status
   */
  getNodesByStatus(status: NodeStatus): string[] {
    return Array.from(this.states.entries())
      .filter(([_, state]) => state.status === status)
      .map(([nodeId, _]) => nodeId);
  }

  /**
   * Calcula duração da execução de um nó (em ms)
   */
  getNodeDuration(nodeId: string): number | null {
    const state = this.states.get(nodeId);
    if (!state || !state.startedAt) return null;

    const endTime = state.completedAt 
      ? new Date(state.completedAt).getTime()
      : Date.now();
    
    const startTime = new Date(state.startedAt).getTime();
    return endTime - startTime;
  }

  /**
   * Obtém histórico de transições de um nó
   */
  getTransitionHistory(nodeId: string): StateTransition[] {
    const state = this.states.get(nodeId);
    return state ? [...state.transitions] : [];
  }

  /**
   * Persiste estado no banco de dados
   */
  private async persistState(nodeId: string, state: NodeState): Promise<void> {
    try {
      // Buscar step_execution_id correspondente
      const { data: stepExecution } = await this.supabaseClient
        .from('workflow_step_executions')
        .select('id')
        .eq('node_id', nodeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!stepExecution) {
        console.warn(`[STATE_TRACKER] Step execution não encontrado para node[${nodeId}]`);
        return;
      }

      // Atualizar step execution
      await this.supabaseClient
        .from('workflow_step_executions')
        .update({
          status: state.status,
          started_at: state.startedAt,
          completed_at: state.completedAt,
          error_message: state.errorMessage,
          output_data: {
            ...state.metadata,
            progress: state.progress,
            retryCount: state.retryCount,
            blockedBy: state.blockedBy,
            transitions: state.transitions
          }
        })
        .eq('id', stepExecution.id);

    } catch (error: any) {
      console.error(`[STATE_TRACKER] Erro ao persistir: ${error.message}`);
    }
  }

  /**
   * Exporta estados para JSON
   */
  export(): Record<string, NodeState> {
    const exported: Record<string, NodeState> = {};
    for (const [nodeId, state] of this.states) {
      exported[nodeId] = { ...state };
    }
    return exported;
  }

  /**
   * Debug: imprime resumo dos estados
   */
  debug(): void {
    console.log('[STATE_TRACKER] === DEBUG ===');
    const summary: Record<NodeStatus, number> = {
      pending: 0,
      ready: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      blocked: 0
    };

    for (const [_, state] of this.states) {
      summary[state.status]++;
    }

    console.log('[STATE_TRACKER] Summary:', summary);
    
    // Mostrar nós em execução
    const running = this.getNodesByStatus('running');
    if (running.length > 0) {
      console.log('[STATE_TRACKER] Running:', running);
    }
  }
}
