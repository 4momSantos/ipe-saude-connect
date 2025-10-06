/**
 * Tipos do Orquestrador Cognitivo de Workflow
 */

// Estados expandidos dos nós
export type NodeStatus = 
  | 'pending'    // Aguardando dependências
  | 'ready'      // Pronto para executar
  | 'running'    // Em execução
  | 'paused'     // Pausado (aguardando input externo)
  | 'completed'  // Concluído com sucesso
  | 'failed'     // Falhou
  | 'skipped'    // Pulado (condição não atendida)
  | 'blocked';   // Bloqueado por dependência falhada

// Estado detalhado de um nó
export interface NodeState {
  nodeId: string;
  status: NodeStatus;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  progress?: number; // 0-100
  retryCount?: number;
  blockedBy?: string[]; // IDs dos nós que bloqueiam este
  metadata?: Record<string, any>;
  transitions: StateTransition[]; // Histórico de transições
}

// Transição de estado
export interface StateTransition {
  from: NodeStatus;
  to: NodeStatus;
  timestamp: string;
  reason?: string;
}

// Nó do workflow
export interface WorkflowNode {
  id: string;
  type: string;
  data: {
    type: string;
    label: string;
    [key: string]: any;
  };
}

// Aresta do workflow
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string; // Expressão condicional opcional
  label?: string;
}

// Aresta condicional
export interface ConditionalEdge extends WorkflowEdge {
  condition: string; // Ex: "{context.status} === 'approved'"
  priority?: number; // Para múltiplas saídas
}

// Grafo de dependências
export interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  edges: WorkflowEdge[];
  entryNode: string;
  exitNodes: string[];
  parallelGroups: string[][]; // Grupos de nós que podem executar em paralelo
  criticalPath: string[]; // Caminho crítico
}

// Nó do grafo com metadados
export interface GraphNode {
  id: string;
  type: string;
  data: any;
  dependencies: string[]; // IDs dos nós predecessores
  dependents: string[]; // IDs dos nós sucessores
  isParallel: boolean; // Pode executar em paralelo com outros
  isJoin: boolean; // É um ponto de junção
  joinStrategy?: JoinStrategy;
}

// Estratégias de junção
export type JoinStrategy = 
  | 'wait_all'        // Aguarda todos os predecessores
  | 'wait_any'        // Aguarda qualquer predecessor
  | 'first_complete'; // Executa assim que o primeiro completar

// Configuração do join node
export interface JoinConfig {
  strategy: JoinStrategy;
  timeout?: number; // Timeout em ms
  onTimeout?: 'fail' | 'continue'; // O que fazer no timeout
}

// Contexto do workflow
export interface WorkflowContext {
  global: Record<string, any>; // Contexto global
  nodes: Record<string, Record<string, any>>; // Contexto local por nó
  snapshots: ContextSnapshot[]; // Histórico de snapshots
}

// Snapshot do contexto
export interface ContextSnapshot {
  timestamp: string;
  nodeId: string;
  global: Record<string, any>;
  local: Record<string, any>;
}

// Fila de execução
export interface ExecutionQueue {
  ready: string[]; // Prontos para executar
  running: string[]; // Em execução
  waiting: string[]; // Aguardando dependências
  paused: string[]; // Pausados
  completed: string[]; // Concluídos
  failed: string[]; // Falhados
}

// Configuração do orquestrador
export interface OrchestratorConfig {
  maxParallelNodes: number; // Máximo de nós em paralelo
  enableConditionals: boolean; // Habilitar navegação condicional
  enableJoinStrategies: boolean; // Habilitar estratégias de junção
  stateUpdateInterval: number; // Intervalo de atualização de estado (ms)
  debug: boolean; // Modo debug
}

// Resultado da execução de um nó
export interface NodeExecutionResult {
  outputData: Record<string, any>;
  shouldPause?: boolean;
  shouldContinue?: boolean;
  nextNodes?: string[]; // Nós a serem executados em seguida (para condicionais)
}

// Executor de nó (interface existente, mantida para compatibilidade)
export interface NodeExecutor {
  execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: Record<string, any>
  ): Promise<NodeExecutionResult>;
}
