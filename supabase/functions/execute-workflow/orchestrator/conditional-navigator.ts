/**
 * Conditional Navigator
 * Fase 5: Navegação condicional e avaliação de expressões
 */

import { ConditionalEdge, WorkflowEdge } from './types.ts';
import { ContextManager } from './context-manager.ts';

export class ConditionalNavigator {
  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  /**
   * Avalia quais arestas condicionais devem ser seguidas
   */
  evaluateConditionals(
    edges: WorkflowEdge[],
    sourceNodeId: string
  ): string[] {
    const outgoingEdges = edges.filter(e => e.source === sourceNodeId);
    const nextNodes: string[] = [];

    // Separar arestas condicionais e normais
    const conditionalEdges = outgoingEdges.filter(e => 'condition' in e) as ConditionalEdge[];
    const normalEdges = outgoingEdges.filter(e => !('condition' in e));

    // Se não há condicionais, retorna todos os targets normais
    if (conditionalEdges.length === 0) {
      return normalEdges.map(e => e.target);
    }

    // Avaliar condicionais por prioridade
    const sortedConditionals = this.sortByPriority(conditionalEdges);

    for (const edge of sortedConditionals) {
      const result = this.evaluateExpression(edge.condition);
      
      console.log(`[CONDITIONAL] Edge[${edge.id}]: "${edge.condition}" = ${result}`);

      if (result) {
        nextNodes.push(edge.target);
        
        // Se a aresta tem prioridade alta, não avaliar outras
        if (edge.priority && edge.priority > 0) {
          break;
        }
      }
    }

    // Se nenhuma condicional foi satisfeita, usar arestas normais (fallback)
    if (nextNodes.length === 0 && normalEdges.length > 0) {
      console.log('[CONDITIONAL] Nenhuma condição satisfeita, usando fallback');
      return normalEdges.map(e => e.target);
    }

    return nextNodes;
  }

  /**
   * Avalia uma expressão condicional
   */
  evaluateExpression(expression: string): boolean {
    try {
      // Resolver variáveis no contexto
      const resolvedExpression = this.contextManager.resolve(expression);
      
      console.log(`[CONDITIONAL] Avaliando: "${expression}" -> "${resolvedExpression}"`);

      // Avaliar expressão
      const result = this.safeEval(resolvedExpression);
      
      return Boolean(result);
    } catch (error: any) {
      console.error(`[CONDITIONAL] Erro ao avaliar "${expression}": ${error.message}`);
      return false;
    }
  }

  /**
   * Avaliação segura de expressões (sandbox limitado)
   */
  private safeEval(expression: string): any {
    // Expressões permitidas: comparações, operadores lógicos, números, strings
    const allowedPattern = /^[a-zA-Z0-9\s._'"=!<>&|()+-/*%]+$/;
    
    if (!allowedPattern.test(expression)) {
      throw new Error('Expressão contém caracteres não permitidos');
    }

    // Sanitizar: remover possíveis injeções
    const sanitized = expression
      .replace(/\beval\b/gi, '')
      .replace(/\bFunction\b/gi, '')
      .replace(/\bimport\b/gi, '')
      .replace(/\brequire\b/gi, '');

    // Avaliar usando Function constructor (mais seguro que eval direto)
    try {
      const fn = new Function(`return ${sanitized}`);
      return fn();
    } catch (error: any) {
      throw new Error(`Erro na avaliação: ${error.message}`);
    }
  }

  /**
   * Ordena arestas condicionais por prioridade (maior primeiro)
   */
  private sortByPriority(edges: ConditionalEdge[]): ConditionalEdge[] {
    return [...edges].sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      return priorityB - priorityA;
    });
  }

  /**
   * Verifica se uma aresta é condicional
   */
  isConditional(edge: WorkflowEdge): boolean {
    return 'condition' in edge && typeof (edge as ConditionalEdge).condition === 'string';
  }

  /**
   * Cria uma aresta condicional
   */
  createConditionalEdge(
    id: string,
    source: string,
    target: string,
    condition: string,
    priority?: number,
    label?: string
  ): ConditionalEdge {
    return {
      id,
      source,
      target,
      condition,
      priority,
      label
    };
  }

  /**
   * Valida sintaxe de uma expressão condicional
   */
  validateExpression(expression: string): { valid: boolean; error?: string } {
    try {
      // Tentar resolver variáveis (sem avaliar)
      const resolved = expression.replace(/\{[^}]+\}/g, 'true');
      
      // Tentar avaliar
      this.safeEval(resolved);
      
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Debug: testa uma expressão com contexto atual
   */
  debugExpression(expression: string): void {
    console.log('[CONDITIONAL] === DEBUG ===');
    console.log('[CONDITIONAL] Expressão original:', expression);
    
    const resolved = this.contextManager.resolve(expression);
    console.log('[CONDITIONAL] Expressão resolvida:', resolved);
    
    try {
      const result = this.safeEval(resolved);
      console.log('[CONDITIONAL] Resultado:', result, `(${typeof result})`);
    } catch (error: any) {
      console.log('[CONDITIONAL] Erro:', error.message);
    }
  }
}
