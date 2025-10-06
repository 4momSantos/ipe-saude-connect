/**
 * Workflow Orchestrator
 * Orquestrador principal que integra todas as fases
 */

import { 
  WorkflowNode, 
  WorkflowEdge, 
  DependencyGraph,
  OrchestratorConfig,
  NodeExecutionResult
} from './types.ts';
import { GraphBuilder } from './graph-builder.ts';
import { ContextManager } from './context-manager.ts';
import { ExecutionScheduler } from './execution-scheduler.ts';
import { StateTracker } from './state-tracker.ts';
import { ConditionalNavigator } from './conditional-navigator.ts';
import { JoinStrategyHandler } from './join-strategy.ts';
import { getExecutor } from '../executors/index.ts';

export class WorkflowOrchestrator {
  private graph!: DependencyGraph;
  private graphBuilder: GraphBuilder;
  private contextManager: ContextManager;
  private scheduler: ExecutionScheduler;
  private stateTracker: StateTracker;
  private conditionalNavigator: ConditionalNavigator;
  private joinStrategyHandler: JoinStrategyHandler;
  private config: OrchestratorConfig;
  private supabaseClient: any;

  constructor(supabaseClient: any, config: Partial<OrchestratorConfig> = {}) {
    this.supabaseClient = supabaseClient;
    
    // Configuração padrão
    this.config = {
      maxParallelNodes: config.maxParallelNodes || 1, // Sequencial por padrão
      enableConditionals: config.enableConditionals !== false,
      enableJoinStrategies: config.enableJoinStrategies !== false,
      stateUpdateInterval: config.stateUpdateInterval || 1000,
      debug: config.debug || false
    };

    // Inicializar componentes
    this.graphBuilder = new GraphBuilder();
    this.contextManager = new ContextManager();
    this.scheduler = new ExecutionScheduler(this.config);
    this.stateTracker = new StateTracker(supabaseClient);
    this.conditionalNavigator = new ConditionalNavigator(this.contextManager);
    this.joinStrategyHandler = new JoinStrategyHandler(this.stateTracker);

    console.log('[ORCHESTRATOR] Inicializado com config:', this.config);
  }

  /**
   * Inicializa o workflow
   */
  async initialize(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    inputData: Record<string, any> = {}
  ): Promise<void> {
    console.log('[ORCHESTRATOR] === INICIALIZAÇÃO ===');
    
    // 1. Construir grafo de dependências
    this.graph = this.graphBuilder.build(nodes, edges);
    
    // 2. Inicializar contexto
    this.contextManager = new ContextManager(inputData);
    
    // 3. Inicializar fila de execução
    this.scheduler.initialize(this.graph);
    
    // 4. Inicializar estados dos nós
    for (const [nodeId, node] of this.graph.nodes) {
      this.stateTracker.initializeNode(nodeId, node.type);
    }

    console.log('[ORCHESTRATOR] Workflow inicializado:', {
      nodes: this.graph.nodes.size,
      edges: this.graph.edges.length,
      parallelGroups: this.graph.parallelGroups.length,
      criticalPath: this.graph.criticalPath.length
    });
  }

  /**
   * Executa o workflow
   */
  async execute(executionId: string): Promise<boolean> {
    console.log('[ORCHESTRATOR] === EXECUÇÃO INICIADA ===');
    console.log('[ORCHESTRATOR] Execution ID:', executionId);

    try {
      while (!this.scheduler.isComplete(this.graph)) {
        // 1. Verificar se há falhas
        if (this.scheduler.hasFailed()) {
          console.error('[ORCHESTRATOR] Workflow falhou');
          return false;
        }

        // 2. Verificar se está bloqueado
        if (this.scheduler.isBlocked()) {
          console.log('[ORCHESTRATOR] Workflow bloqueado (aguardando input externo)');
          return true; // Pausado, não é falha
        }

        // 3. Obter próximos nós prontos
        const nextNodes = this.scheduler.getNextNodes(this.graph);
        
        if (nextNodes.length === 0) {
          // Aguardar nós em execução
          await this.sleep(this.config.stateUpdateInterval);
          continue;
        }

        // 4. Executar nós em paralelo (dentro do limite)
        const executions = nextNodes.map(nodeId => 
          this.executeNode(nodeId, executionId)
        );

        await Promise.all(executions);

        // Debug periódico
        if (this.config.debug) {
          this.debug();
        }
      }

      console.log('[ORCHESTRATOR] === EXECUÇÃO CONCLUÍDA ===');
      return true;

    } catch (error: any) {
      console.error('[ORCHESTRATOR] Erro fatal:', error.message);
      return false;
    }
  }

  /**
   * Executa um nó individual
   */
  private async executeNode(nodeId: string, executionId: string): Promise<void> {
    const node = this.graph.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} não encontrado no grafo`);
    }

    console.log(`[ORCHESTRATOR] >>> Executando node[${nodeId}] (${node.type})`);

    try {
      // 1. Marcar como em execução
      this.scheduler.startNode(nodeId);
      this.stateTracker.transition(nodeId, 'running');

      // 2. Criar snapshot do contexto
      this.contextManager.createSnapshot(nodeId);

      // 3. Criar step execution
      const { data: stepExecution } = await this.supabaseClient
        .from('workflow_step_executions')
        .insert({
          execution_id: executionId,
          node_id: nodeId,
          node_type: node.type,
          status: 'running',
          input_data: this.contextManager.getGlobal()
        })
        .select()
        .single();

      if (!stepExecution) {
        throw new Error('Falha ao criar step execution');
      }

      // 4. Obter executor apropriado
      const executor = getExecutor(node.type);

      // 5. Montar nó para executor (compatibilidade)
      const workflowNode: WorkflowNode = {
        id: nodeId,
        type: node.type,
        data: node.data
      };

      // 6. Executar nó
      const result: NodeExecutionResult = await executor.execute(
        this.supabaseClient,
        executionId,
        stepExecution.id,
        workflowNode,
        this.contextManager.getGlobal()
      );

      // 7. Processar resultado
      if (result.shouldPause) {
        console.log(`[ORCHESTRATOR] Node[${nodeId}] pausado`);
        this.scheduler.pauseNode(nodeId);
        this.stateTracker.transition(nodeId, 'paused', 'Aguardando input externo');
        return;
      }

      // 8. Mesclar output no contexto
      if (result.outputData) {
        this.contextManager.mergeNodeOutput(nodeId, result.outputData);
      }

      // 9. Marcar como completo
      this.scheduler.completeNode(nodeId);
      this.stateTracker.transition(nodeId, 'completed');

      console.log(`[ORCHESTRATOR] <<< Node[${nodeId}] concluído`);

    } catch (error: any) {
      console.error(`[ORCHESTRATOR] Erro no node[${nodeId}]:`, error.message);
      this.scheduler.failNode(nodeId);
      this.stateTracker.setError(nodeId, error.message);
      throw error;
    }
  }

  /**
   * Retoma um nó pausado com novos dados
   */
  async resumeNode(nodeId: string, resumeData: Record<string, any>): Promise<void> {
    console.log(`[ORCHESTRATOR] Retomando node[${nodeId}]`);

    // Atualizar contexto com novos dados
    this.contextManager.setGlobalBatch(resumeData);

    // Retomar na fila
    this.scheduler.resumeNode(nodeId);
    this.stateTracker.transition(nodeId, 'ready', 'Retomado com novos dados');
  }

  /**
   * Obtém progresso do workflow
   */
  getProgress(): number {
    return this.scheduler.calculateProgress(this.graph.nodes.size);
  }

  /**
   * Obtém contexto atual
   */
  getContext(): Record<string, any> {
    return this.contextManager.export();
  }

  /**
   * Obtém estados de todos os nós
   */
  getStates(): Map<string, any> {
    return this.stateTracker.getAllStates();
  }

  /**
   * Debug: imprime estado completo
   */
  debug(): void {
    console.log('[ORCHESTRATOR] === DEBUG ===');
    this.scheduler.debug();
    this.stateTracker.debug();
    this.contextManager.debug();
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
