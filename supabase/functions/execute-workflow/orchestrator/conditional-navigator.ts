/**
 * Conditional Navigator
 * Fase 5: Navegação condicional e avaliação de expressões
 * ATUALIZADO: Agora usa JSON Logic para segurança máxima
 */

import { ConditionalEdge, WorkflowEdge } from './types.ts';
import { ContextManager } from './context-manager.ts';
import { ExpressionEvaluator } from '../lib/expression-evaluator.ts';

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
   * Avalia uma expressão condicional usando JSON Logic
   */
  evaluateExpression(expression: string): boolean {
    try {
      // Tentar parsear como JSON Logic primeiro
      try {
        const context = this.contextManager.getGlobal();
        const result = ExpressionEvaluator.evaluate(expression, context);
        console.log(`[CONDITIONAL] JSON Logic avaliado: ${result}`);
        return Boolean(result);
      } catch (jsonError) {
        // Fallback: tentar como expressão simples legacy
        console.log(`[CONDITIONAL] Fallback para avaliação legacy`);
        return this.evaluateLegacy(expression);
      }
    } catch (error: any) {
      console.error(`[CONDITIONAL] Erro ao avaliar "${expression}": ${error.message}`);
      return false;
    }
  }

  /**
   * Avaliação legacy (DEPRECADO - manter apenas para compatibilidade)
   */
  private evaluateLegacy(expression: string): boolean {
    const resolvedExpression = this.contextManager.resolve(expression);
    console.log(`[CONDITIONAL] Legacy avaliando: "${expression}" -> "${resolvedExpression}"`);

    const allowedPattern = /^[a-zA-Z0-9\s._'"=!<>&|()+-/*%]+$/;
    
    if (!allowedPattern.test(resolvedExpression)) {
      throw new Error('Expressão contém caracteres não permitidos');
    }

    const sanitized = resolvedExpression
      .replace(/\beval\b/gi, '')
      .replace(/\bFunction\b/gi, '')
      .replace(/\bimport\b/gi, '')
      .replace(/\brequire\b/gi, '')
      .replace(/\bfetch\b/gi, '');

    try {
      const fn = new Function(`return ${sanitized}`);
      return Boolean(fn());
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
      const validation = ExpressionEvaluator.validate(expression);
      return validation;
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
    
    try {
      const context = this.contextManager.getGlobal();
      const result = ExpressionEvaluator.evaluate(expression, context);
      console.log('[CONDITIONAL] Resultado:', result, `(${typeof result})`);
    } catch (error: any) {
      console.log('[CONDITIONAL] Erro:', error.message);
    }
  }
}
