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
