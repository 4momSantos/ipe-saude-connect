/**
 * FASE 3: Workflow Orchestrator V2
 * 
 * Orquestrador de workflow enterprise-grade com:
 * - State machine segura com transições validadas
 * - Checkpoints síncronos antes/depois de cada nó
 * - Isolamento completo por executionId
 * - Event sourcing e métricas
 * - Retry inteligente com backoff exponencial
 * - Resume idempotente
 */

import { GraphBuilder } from './graph-builder.ts';
import { ContextManager } from './context-manager.ts';
import { ExecutionScheduler } from './execution-scheduler.ts';
import { ConditionalNavigator } from './conditional-navigator.ts';
import { JoinStrategyHandler } from './join-strategy.ts';
import { StateMachine, NodeStatus, WorkflowEvent, InvalidTransitionError } from './state-machine.ts';
import { CheckpointManager, CheckpointError } from './checkpoint-manager.ts';
import { RetryStrategy } from './retry-strategy.ts';
import { getExecutor } from '../executors/index.ts';
import type { WorkflowNode, WorkflowEdge, ExecutionContext } from '../executors/types.ts';

interface OrchestratorConfig {
  maxRetries?: number;
  enableCheckpoints?: boolean;
  enableMetrics?: boolean;
}

/**
 * Orquestrador V2 com isolamento completo e persistência confiável
 */
export class WorkflowOrchestratorV2 {
  private graphBuilder: GraphBuilder;
  private context: ContextManager;
  private stateMachine: StateMachine;
  private checkpointManager: CheckpointManager;
  private retryStrategy: RetryStrategy;
  
  // Estado isolado desta execução
  private executionId!: string;
  private graph: any; // DependencyGraph gerado
  private nodeStates: Map<string, NodeStatus> = new Map();
  private nodeStartTimes: Map<string, number> = new Map();
  private completedNodes: Set<string> = new Set();
  
  constructor(
    private supabaseClient: any,
    private config: OrchestratorConfig = {}
  ) {
    // Inicializar componentes básicos
    this.graphBuilder = new GraphBuilder();
    this.context = new ContextManager({});
    
    // State machine será inicializada com executionId
    this.stateMachine = null as any; // temporário
    this.checkpointManager = null as any; // temporário
    this.retryStrategy = new RetryStrategy({
      maxAttempts: config.maxRetries || 3
    });
  }

  /**
   * Inicializa orquestrador com dados do workflow
   */
  async initialize(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    inputData: ExecutionContext,
    executionId: string
  ): Promise<void> {
    this.executionId = executionId;
    
    // Inicializar componentes que dependem de executionId
    this.stateMachine = new StateMachine(executionId, this.supabaseClient);
    this.checkpointManager = new CheckpointManager(executionId, this.supabaseClient);
    
    // Construir grafo usando a API existente
    this.graph = this.graphBuilder.build(nodes, edges);
    
    // Inicializar contexto com dados iniciais
    this.context = new ContextManager(inputData);
    
    // Inicializar estados dos nós
    for (const node of nodes) {
      this.nodeStates.set(node.id, NodeStatus.PENDING);
    }
    
    // Marcar nó de entrada como pronto
    this.transitionNode(this.graph.entryNode, WorkflowEvent.START, 'Nó inicial');

    console.log(`[ORCHESTRATOR_V2] Initialized`, {
      execution_id: executionId,
      total_nodes: nodes.length,
      entry_node: this.graph.entryNode
    });
  }

  /**
   * Executa workflow completo
   */
  async execute(): Promise<{ status: 'completed' | 'failed'; context: ExecutionContext }> {
    console.log(`[ORCHESTRATOR_V2] Starting execution ${this.executionId}`);
    
    try {
      // Registrar evento de início
      await this.recordEvent('WORKFLOW_STARTED');
      
      while (true) {
        // Obter próximo nó pronto para executar
        const nodeId = this.getNextReadyNode();
        
        if (!nodeId) {
          // Verificar se terminou (todos exit nodes completados)
          if (this.isExecutionComplete()) {
            console.log(`[ORCHESTRATOR_V2] Execution completed ${this.executionId}`);
            await this.recordEvent('WORKFLOW_COMPLETED');
            return { status: 'completed', context: this.context.getGlobal() };
          }
          
          // Verificar se está bloqueado (tem nós pausados)
          if (Array.from(this.nodeStates.values()).some(s => s === NodeStatus.PAUSED)) {
            console.warn(`[ORCHESTRATOR_V2] Workflow paused`, {
              execution_id: this.executionId
            });
            break;
          }
          
          break;
        }

        // Executar nó
        await this.executeNode(nodeId);
        
        // Verificar falhas
        const state = this.nodeStates.get(nodeId);
        if (state === NodeStatus.FAILED) {
          console.error(`[ORCHESTRATOR_V2] Node failed, stopping execution`, {
            execution_id: this.executionId,
            node_id: nodeId
          });
          await this.recordEvent('WORKFLOW_FAILED', nodeId);
          return { status: 'failed', context: this.context.getGlobal() };
        }
      }

      return { status: 'completed', context: this.context.export() };

    } catch (error) {
      console.error(`[ORCHESTRATOR_V2] Execution failed:`, error);
      await this.recordEvent('WORKFLOW_FAILED', undefined, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Executa um nó específico com checkpoint e retry
   */
  private async executeNode(nodeId: string): Promise<void> {
    const node = this.graph.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const startTime = Date.now();
    this.nodeStartTimes.set(nodeId, startTime);

    try {
      console.log(`[ORCHESTRATOR_V2] Executing node ${nodeId}`, {
        execution_id: this.executionId,
        node_type: node.type
      });

      // Transição: READY -> RUNNING
      this.transitionNode(nodeId, WorkflowEvent.START, 'Iniciando execução');
      
      // Registrar evento
      await this.recordEvent('STEP_STARTED', nodeId);

      // CHECKPOINT PRÉ-EXECUÇÃO
      if (this.config.enableCheckpoints !== false) {
        await this.checkpointManager.saveCheckpoint(
          nodeId,
          NodeStatus.RUNNING,
          this.context.export(),
          { phase: 'pre-execution' }
        );
      }

      // Criar step execution no banco
      const { data: stepData, error: stepError } = await this.supabaseClient
        .from('workflow_step_executions')
        .insert({
          execution_id: this.executionId,
          node_id: nodeId,
          node_type: node.type,
          status: 'running',
          input_data: this.context.getGlobal(),
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (stepError) {
        throw new Error(`Failed to create step execution: ${stepError.message}`);
      }

      const stepExecutionId = stepData.id;

      // Obter executor e executar com retry
      const executor = getExecutor(node.type);
      const { result: executionResult } = await this.retryStrategy.execute(
        () => executor.execute(
          this.supabaseClient,
          this.executionId,
          stepExecutionId,
          node,
          this.context.export()
        ),
        {
          executionId: this.executionId,
          nodeId,
          nodeType: node.type
        }
      );

      // Atualizar contexto com output
      if (executionResult.outputData) {
        this.context.mergeNodeOutput(nodeId, executionResult.outputData);
      }

      // Processar resultado
      if (executionResult.shouldPause) {
        // PAUSA: salvar checkpoint e aguardar resume
        this.transitionNode(nodeId, WorkflowEvent.PAUSE, 'Nó requer interação');
        
        await this.checkpointManager.saveCheckpoint(
          nodeId,
          NodeStatus.PAUSED,
          this.context.export(),
          { phase: 'paused', reason: 'awaiting_input' }
        );

        await this.supabaseClient
          .from('workflow_step_executions')
          .update({
            status: 'paused',
            output_data: executionResult.outputData
          })
          .eq('id', stepExecutionId);

        await this.recordEvent('STEP_PAUSED', nodeId);
        
      } else {
        // COMPLETADO: checkpoint pós-execução
        this.transitionNode(nodeId, WorkflowEvent.COMPLETE, 'Execução concluída');
        
        if (this.config.enableCheckpoints !== false) {
          await this.checkpointManager.saveCheckpoint(
            nodeId,
            NodeStatus.COMPLETED,
            this.context.export(),
            { phase: 'post-execution' }
          );
        }

        await this.supabaseClient
          .from('workflow_step_executions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            output_data: executionResult.outputData
          })
          .eq('id', stepExecutionId);

        await this.recordEvent('STEP_COMPLETED', nodeId);

        // Marcar nó como completo
        this.completedNodes.add(nodeId);

        // Processar nós seguintes
        await this.processNextNodes(nodeId);
      }

      // Registrar métrica
      if (this.config.enableMetrics !== false) {
        await this.recordMetric(nodeId, node.type, startTime, 'success');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`[ORCHESTRATOR_V2] Node execution failed:`, {
        execution_id: this.executionId,
        node_id: nodeId,
        error: errorMessage
      });

      // Transição: * -> FAILED
      try {
        this.transitionNode(nodeId, WorkflowEvent.FAIL, errorMessage);
      } catch (transitionError) {
        // Ignorar erro de transição inválida, já estamos em estado de falha
        console.error('[ORCHESTRATOR_V2] Failed to transition to FAILED state:', transitionError);
      }

      // Salvar checkpoint de falha
      if (this.config.enableCheckpoints !== false) {
        try {
          await this.checkpointManager.saveCheckpoint(
            nodeId,
            NodeStatus.FAILED,
            this.context.export(),
            { phase: 'failed', error: errorMessage }
          );
        } catch (checkpointError) {
          console.error('[ORCHESTRATOR_V2] Failed to save failure checkpoint:', checkpointError);
        }
      }

      await this.recordEvent('STEP_FAILED', nodeId, { error: errorMessage });
      
      // Registrar métrica de falha
      if (this.config.enableMetrics !== false) {
        await this.recordMetric(nodeId, node.type, startTime, 'failed', errorMessage);
      }

      throw error;
    }
  }

  /**
   * Processa nós seguintes após completar um nó
   */
  private async processNextNodes(nodeId: string): Promise<void> {
    const node = this.graph.nodes.get(nodeId);
    if (!node) return;
    
    // Marcar dependentes como potencialmente prontos
    for (const dependentId of node.dependents) {
      const dependentNode = this.graph.nodes.get(dependentId);
      if (!dependentNode) continue;

      // Verificar se todas dependências estão completas
      const allDepsComplete = dependentNode.dependencies.every((depId: string) => 
        this.completedNodes.has(depId)
      );

      if (allDepsComplete && this.nodeStates.get(dependentId) === NodeStatus.PENDING) {
        this.transitionNode(dependentId, WorkflowEvent.START, 'Dependências completas');
      }
    }
  }

  /**
   * Obtém próximo nó pronto para executar
   */
  private getNextReadyNode(): string | null {
    for (const [nodeId, state] of this.nodeStates.entries()) {
      if (state === NodeStatus.READY) {
        return nodeId;
      }
    }
    return null;
  }

  /**
   * Verifica se execução está completa
   */
  private isExecutionComplete(): boolean {
    return this.graph.exitNodes.every((exitId: string) => 
      this.completedNodes.has(exitId)
    );
  }


  /**
   * Resume workflow de um checkpoint
   * Idempotente: não duplica steps já executados
   */
  async resumeWorkflow(resumeNodeId: string, resumeData?: Record<string, any>): Promise<void> {
    console.log(`[ORCHESTRATOR_V2] Resuming from node ${resumeNodeId}`, {
      execution_id: this.executionId
    });

    // Carregar checkpoint
    const checkpoint = await this.checkpointManager.loadCheckpoint(resumeNodeId);
    if (!checkpoint) {
      throw new Error(`No checkpoint found for node ${resumeNodeId}`);
    }

    // Restaurar contexto
    if (resumeData) {
      this.context.setGlobalBatch(resumeData);
    } else {
      this.context = new ContextManager(checkpoint.context);
    }

    // Transição: PAUSED -> RUNNING
    this.transitionNode(resumeNodeId, WorkflowEvent.RESUME, 'Retomando execução');
    
    await this.recordEvent('STEP_RESUMED', resumeNodeId);
  }

  /**
   * Aplica transição de estado com validação
   */
  private transitionNode(nodeId: string, event: WorkflowEvent, reason?: string): void {
    const currentState = this.nodeStates.get(nodeId) || NodeStatus.PENDING;
    
    try {
      const newState = this.stateMachine.applyEvent(currentState, event, nodeId, reason);
      this.nodeStates.set(nodeId, newState);
    } catch (error) {
      if (error instanceof InvalidTransitionError) {
        console.warn(`[ORCHESTRATOR_V2] Invalid transition ignored: ${error.message}`);
        // Ignorar transições inválidas em alguns casos (ex: já está no estado final)
      } else {
        throw error;
      }
    }
  }

  /**
   * Registra evento no banco
   */
  private async recordEvent(
    eventType: string,
    nodeId?: string,
    payload?: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabaseClient
        .from('workflow_events')
        .insert({
          execution_id: this.executionId,
          node_id: nodeId,
          event_type: eventType,
          payload: payload || {}
        });
    } catch (error) {
      console.error('[ORCHESTRATOR_V2] Failed to record event:', error);
    }
  }

  /**
   * Registra métrica de performance
   */
  private async recordMetric(
    nodeId: string,
    nodeType: string,
    startTime: number,
    status: 'success' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const duration = Date.now() - startTime;
    const retryMetrics = this.retryStrategy.getMetrics();

    try {
      await this.supabaseClient
        .from('workflow_metrics')
        .insert({
          execution_id: this.executionId,
          node_id: nodeId,
          node_type: nodeType,
          duration_ms: duration,
          status,
          retry_count: retryMetrics.attempts.length - 1,
          error_message: errorMessage,
          metadata: {
            retry_metrics: retryMetrics
          }
        });
    } catch (error) {
      console.error('[ORCHESTRATOR_V2] Failed to record metric:', error);
    }
  }

  /**
   * Obtém estado atual de um nó
   */
  getNodeState(nodeId: string): NodeStatus | undefined {
    return this.nodeStates.get(nodeId);
  }

  /**
   * Exporta contexto atual
   */
  getContext(): ExecutionContext {
    return this.context.getGlobal();
  }

  /**
   * Debug: exibe estado completo
   */
  debug(): void {
    console.log('[ORCHESTRATOR_V2] Debug info:', {
      execution_id: this.executionId,
      node_states: Object.fromEntries(this.nodeStates),
      completed_nodes: Array.from(this.completedNodes)
    });
  }
}
