/**
 * Tipos compartilhados entre executores de nós
 */

export interface WorkflowNode {
  id: string;
  type: string;
  data: {
    type: string;
    label: string;
    [key: string]: any;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface ExecutionContext {
  [key: string]: any;
}

export interface NodeExecutionResult {
  outputData: ExecutionContext;
  shouldPause?: boolean;
  shouldContinue?: boolean;
}

export interface NodeExecutor {
  execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult>;
}

/**
 * Configuração do Loop Node
 */
export interface LoopNodeConfig {
  items: string | any[]; // Expressão ou array direto
  executionMode: 'sequential' | 'parallel';
  itemVariable?: string; // Default: 'currentItem'
  indexVariable?: string; // Default: 'index'
  continueOnError?: boolean;
  loopBody?: {
    startNodeId: string;
    endNodeId: string;
  };
  maxConcurrency?: number; // Default: 3
  iterationTimeout?: number; // Default: 30000ms
  checkpointEvery?: number; // Default: 10
}

/**
 * Output do Loop Node
 */
export interface LoopNodeOutput {
  results: any[];
  successResults: any[];
  errors: Array<{
    index: number;
    item: any;
    error: string;
    retryCount?: number;
  }>;
  stats: {
    successCount: number;
    failureCount: number;
    totalTime: number;
    avgTime: number;
  };
}
