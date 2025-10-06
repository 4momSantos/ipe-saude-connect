/**
 * Dependency Graph Builder
 * Fase 1: Construção do grafo de dependências
 */

import { 
  WorkflowNode, 
  WorkflowEdge, 
  DependencyGraph, 
  GraphNode,
  JoinStrategy 
} from './types.ts';

export class GraphBuilder {
  /**
   * Constrói o grafo de dependências a partir dos nós e arestas
   */
  build(nodes: WorkflowNode[], edges: WorkflowEdge[]): DependencyGraph {
    const graph: DependencyGraph = {
      nodes: new Map(),
      edges,
      entryNode: '',
      exitNodes: [],
      parallelGroups: [],
      criticalPath: []
    };

    // 1. Criar nós do grafo
    for (const node of nodes) {
      const graphNode: GraphNode = {
        id: node.id,
        type: node.type,
        data: node.data,
        dependencies: [],
        dependents: [],
        isParallel: false,
        isJoin: false
      };
      
      // Detectar join nodes
      if (node.data.joinConfig) {
        graphNode.isJoin = true;
        graphNode.joinStrategy = node.data.joinConfig.strategy as JoinStrategy;
      }
      
      graph.nodes.set(node.id, graphNode);
    }

    // 2. Mapear dependências e dependentes
    for (const edge of edges) {
      const sourceNode = graph.nodes.get(edge.source);
      const targetNode = graph.nodes.get(edge.target);
      
      if (!sourceNode || !targetNode) {
        throw new Error(`[GRAPH_BUILDER] Aresta inválida: ${edge.source} -> ${edge.target}`);
      }
      
      sourceNode.dependents.push(edge.target);
      targetNode.dependencies.push(edge.source);
    }

    // 3. Identificar nó de entrada (START)
    const startNodes = Array.from(graph.nodes.values()).filter(n => 
      n.type === 'start' || n.dependencies.length === 0
    );
    
    if (startNodes.length === 0) {
      throw new Error('[GRAPH_BUILDER] Nenhum nó de entrada encontrado');
    }
    
    graph.entryNode = startNodes[0].id;

    // 4. Identificar nós de saída (END ou sem dependentes)
    graph.exitNodes = Array.from(graph.nodes.values())
      .filter(n => n.type === 'end' || n.dependents.length === 0)
      .map(n => n.id);

    // 5. Detectar ciclos
    this.detectCycles(graph);

    // 6. Identificar nós paralelos
    graph.parallelGroups = this.identifyParallelNodes(graph);

    // 7. Calcular caminho crítico
    graph.criticalPath = this.calculateCriticalPath(graph);

    console.log('[GRAPH_BUILDER] Grafo construído:', {
      totalNodes: graph.nodes.size,
      totalEdges: edges.length,
      entryNode: graph.entryNode,
      exitNodes: graph.exitNodes,
      parallelGroups: graph.parallelGroups.length,
      criticalPath: graph.criticalPath
    });

    return graph;
  }

  /**
   * Detecta ciclos no grafo usando DFS
   */
  private detectCycles(graph: DependencyGraph): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const node = graph.nodes.get(nodeId);
      if (!node) return false;

      for (const dependentId of node.dependents) {
        if (!visited.has(dependentId)) {
          if (dfs(dependentId, [...path])) {
            return true;
          }
        } else if (recursionStack.has(dependentId)) {
          const cycle = [...path, dependentId];
          throw new Error(`[GRAPH_BUILDER] Ciclo detectado: ${cycle.join(' -> ')}`);
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const [nodeId] of graph.nodes) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }
  }

  /**
   * Identifica grupos de nós que podem executar em paralelo
   */
  private identifyParallelNodes(graph: DependencyGraph): string[][] {
    const parallelGroups: string[][] = [];
    const levels = this.topologicalLevels(graph);

    for (const level of levels) {
      if (level.length > 1) {
        // Nós no mesmo nível podem executar em paralelo
        parallelGroups.push(level);
        
        // Marcar nós como paralelos
        for (const nodeId of level) {
          const node = graph.nodes.get(nodeId);
          if (node) {
            node.isParallel = true;
          }
        }
      }
    }

    return parallelGroups;
  }

  /**
   * Retorna níveis topológicos (BFS por níveis)
   */
  private topologicalLevels(graph: DependencyGraph): string[][] {
    const levels: string[][] = [];
    const inDegree = new Map<string, number>();
    
    // Calcular grau de entrada
    for (const [nodeId, node] of graph.nodes) {
      inDegree.set(nodeId, node.dependencies.length);
    }

    let currentLevel = [graph.entryNode];
    const visited = new Set<string>();

    while (currentLevel.length > 0) {
      levels.push([...currentLevel]);
      const nextLevel: string[] = [];

      for (const nodeId of currentLevel) {
        visited.add(nodeId);
        const node = graph.nodes.get(nodeId);
        if (!node) continue;

        for (const dependentId of node.dependents) {
          const currentInDegree = inDegree.get(dependentId) || 0;
          inDegree.set(dependentId, currentInDegree - 1);

          if (inDegree.get(dependentId) === 0 && !visited.has(dependentId)) {
            nextLevel.push(dependentId);
          }
        }
      }

      currentLevel = nextLevel;
    }

    return levels;
  }

  /**
   * Calcula o caminho crítico (maior caminho do início ao fim)
   */
  private calculateCriticalPath(graph: DependencyGraph): string[] {
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string>();
    
    // Inicializar distâncias
    for (const [nodeId] of graph.nodes) {
      distances.set(nodeId, 0);
    }
    
    distances.set(graph.entryNode, 0);

    // Ordenação topológica
    const sortedNodes = this.topologicalSort(graph);

    // Calcular maior caminho
    for (const nodeId of sortedNodes) {
      const node = graph.nodes.get(nodeId);
      if (!node) continue;

      const currentDist = distances.get(nodeId) || 0;

      for (const dependentId of node.dependents) {
        const newDist = currentDist + 1; // Peso 1 para cada nó
        const currentDepDist = distances.get(dependentId) || 0;

        if (newDist > currentDepDist) {
          distances.set(dependentId, newDist);
          predecessors.set(dependentId, nodeId);
        }
      }
    }

    // Encontrar nó de saída com maior distância
    let maxDist = 0;
    let endNode = '';
    
    for (const exitNode of graph.exitNodes) {
      const dist = distances.get(exitNode) || 0;
      if (dist > maxDist) {
        maxDist = dist;
        endNode = exitNode;
      }
    }

    // Reconstruir caminho crítico
    const path: string[] = [];
    let current = endNode;
    
    while (current) {
      path.unshift(current);
      current = predecessors.get(current) || '';
    }

    return path;
  }

  /**
   * Ordenação topológica (Kahn's algorithm)
   */
  private topologicalSort(graph: DependencyGraph): string[] {
    const sorted: string[] = [];
    const inDegree = new Map<string, number>();
    
    // Calcular grau de entrada
    for (const [nodeId, node] of graph.nodes) {
      inDegree.set(nodeId, node.dependencies.length);
    }

    // Fila com nós de grau 0
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      sorted.push(nodeId);

      const node = graph.nodes.get(nodeId);
      if (!node) continue;

      for (const dependentId of node.dependents) {
        const newDegree = (inDegree.get(dependentId) || 0) - 1;
        inDegree.set(dependentId, newDegree);

        if (newDegree === 0) {
          queue.push(dependentId);
        }
      }
    }

    if (sorted.length !== graph.nodes.size) {
      throw new Error('[GRAPH_BUILDER] Grafo contém ciclos');
    }

    return sorted;
  }

  /**
   * Verifica se um nó está pronto para executar (todas dependências completas)
   */
  isNodeReady(nodeId: string, graph: DependencyGraph, completedNodes: Set<string>): boolean {
    const node = graph.nodes.get(nodeId);
    if (!node) return false;

    // Join nodes têm lógica especial
    if (node.isJoin && node.joinStrategy) {
      return this.checkJoinStrategy(node, completedNodes);
    }

    // Nó normal: todas dependências devem estar completas
    return node.dependencies.every(depId => completedNodes.has(depId));
  }

  /**
   * Verifica estratégia de junção
   */
  private checkJoinStrategy(node: GraphNode, completedNodes: Set<string>): boolean {
    const completedDeps = node.dependencies.filter(depId => completedNodes.has(depId));

    switch (node.joinStrategy) {
      case 'wait_all':
        return completedDeps.length === node.dependencies.length;
      
      case 'wait_any':
        return completedDeps.length > 0;
      
      case 'first_complete':
        return completedDeps.length > 0;
      
      default:
        return completedDeps.length === node.dependencies.length;
    }
  }
}
