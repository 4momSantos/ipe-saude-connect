/**
 * FASE 1: State Machine Segura
 * 
 * State machine robusta com validação de transições e logs estruturados.
 * Baseada em padrões de workflow engines como n8n, Temporal e Camunda.
 */

// Estados válidos do workflow
export enum NodeStatus {
  PENDING = 'pending',
  READY = 'ready',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  SKIPPED = 'skipped'
}

// Eventos que causam transições de estado
export enum WorkflowEvent {
  START = 'START',
  CONTINUE = 'CONTINUE',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  COMPLETE = 'COMPLETE',
  FAIL = 'FAIL',
  SKIP = 'SKIP',
  BLOCK = 'BLOCK',
  UNBLOCK = 'UNBLOCK',
  RETRY = 'RETRY'
}

// Matriz de transições válidas: [estado atual] -> [eventos permitidos] -> [novo estado]
const VALID_TRANSITIONS: Record<NodeStatus, Partial<Record<WorkflowEvent, NodeStatus>>> = {
  [NodeStatus.PENDING]: {
    [WorkflowEvent.START]: NodeStatus.RUNNING,
    [WorkflowEvent.SKIP]: NodeStatus.SKIPPED,
    [WorkflowEvent.BLOCK]: NodeStatus.BLOCKED
  },
  [NodeStatus.READY]: {
    [WorkflowEvent.START]: NodeStatus.RUNNING,
    [WorkflowEvent.SKIP]: NodeStatus.SKIPPED,
    [WorkflowEvent.BLOCK]: NodeStatus.BLOCKED
  },
  [NodeStatus.RUNNING]: {
    [WorkflowEvent.COMPLETE]: NodeStatus.COMPLETED,
    [WorkflowEvent.FAIL]: NodeStatus.FAILED,
    [WorkflowEvent.PAUSE]: NodeStatus.PAUSED,
    [WorkflowEvent.SKIP]: NodeStatus.SKIPPED
  },
  [NodeStatus.PAUSED]: {
    [WorkflowEvent.RESUME]: NodeStatus.RUNNING,
    [WorkflowEvent.FAIL]: NodeStatus.FAILED,
    [WorkflowEvent.SKIP]: NodeStatus.SKIPPED
  },
  [NodeStatus.BLOCKED]: {
    [WorkflowEvent.UNBLOCK]: NodeStatus.READY,
    [WorkflowEvent.SKIP]: NodeStatus.SKIPPED,
    [WorkflowEvent.FAIL]: NodeStatus.FAILED
  },
  [NodeStatus.FAILED]: {
    [WorkflowEvent.RETRY]: NodeStatus.PENDING
  },
  [NodeStatus.COMPLETED]: {},
  [NodeStatus.SKIPPED]: {}
};

// Erro customizado para transições inválidas
export class InvalidTransitionError extends Error {
  constructor(
    public currentState: NodeStatus,
    public event: WorkflowEvent,
    public nodeId: string,
    public executionId: string
  ) {
    super(
      `Invalid transition: Cannot apply event "${event}" to state "${currentState}" ` +
      `(node: ${nodeId}, execution: ${executionId})`
    );
    this.name = 'InvalidTransitionError';
  }
}

// Interface para log estruturado
export interface StateTransitionLog {
  level: 'info' | 'warn' | 'error';
  type: 'STATE_TRANSITION';
  execution_id: string;
  node_id: string;
  from_state: NodeStatus;
  to_state: NodeStatus;
  event: WorkflowEvent;
  reason?: string;
  timestamp: string;
}

/**
 * State Machine com validação rigorosa de transições
 */
export class StateMachine {
  constructor(
    private executionId: string,
    private supabaseClient: any
  ) {}

  /**
   * Aplica um evento ao estado atual e retorna o novo estado
   * Lança InvalidTransitionError se a transição for inválida
   */
  applyEvent(
    currentState: NodeStatus,
    event: WorkflowEvent,
    nodeId: string,
    reason?: string
  ): NodeStatus {
    // Validar transição
    const allowedTransitions = VALID_TRANSITIONS[currentState];
    const newState = allowedTransitions?.[event];

    if (!newState) {
      throw new InvalidTransitionError(currentState, event, nodeId, this.executionId);
    }

    // Log estruturado
    this.logTransition({
      level: 'info',
      type: 'STATE_TRANSITION',
      execution_id: this.executionId,
      node_id: nodeId,
      from_state: currentState,
      to_state: newState,
      event,
      reason,
      timestamp: new Date().toISOString()
    });

    // Persistir evento no banco (fire-and-forget para não bloquear)
    this.persistEvent(nodeId, currentState, newState, event, reason).catch(err => {
      console.error('[STATE_MACHINE] Erro ao persistir evento:', err);
    });

    return newState;
  }

  /**
   * Valida se uma transição é permitida sem aplicá-la
   */
  canTransition(currentState: NodeStatus, event: WorkflowEvent): boolean {
    const allowedTransitions = VALID_TRANSITIONS[currentState];
    return !!allowedTransitions?.[event];
  }

  /**
   * Retorna os eventos permitidos para um estado
   */
  getAllowedEvents(state: NodeStatus): WorkflowEvent[] {
    const transitions = VALID_TRANSITIONS[state];
    return Object.keys(transitions || {}) as WorkflowEvent[];
  }

  /**
   * Log estruturado de transição
   */
  private logTransition(log: StateTransitionLog): void {
    const logMessage = `[STATE] execution=${log.execution_id} node=${log.node_id} ` +
      `from=${log.from_state} to=${log.to_state} event=${log.event}` +
      (log.reason ? ` reason="${log.reason}"` : '');
    
    console.log(logMessage);
    
    // Log JSON para ferramentas de monitoramento
    console.log(JSON.stringify(log));
  }

  /**
   * Persiste evento no banco para event sourcing
   */
  private async persistEvent(
    nodeId: string,
    fromState: NodeStatus,
    toState: NodeStatus,
    event: WorkflowEvent,
    reason?: string
  ): Promise<void> {
    const { error } = await this.supabaseClient
      .from('workflow_events')
      .insert({
        execution_id: this.executionId,
        node_id: nodeId,
        event_type: 'STATE_TRANSITION',
        from_state: fromState,
        to_state: toState,
        payload: {
          event,
          reason,
          timestamp: new Date().toISOString()
        }
      });

    if (error) {
      throw new Error(`Failed to persist event: ${error.message}`);
    }
  }

  /**
   * Retorna a matriz completa de transições (para debug)
   */
  static getTransitionMatrix(): typeof VALID_TRANSITIONS {
    return VALID_TRANSITIONS;
  }
}
