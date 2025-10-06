/**
 * Executor para nós do tipo CONDITION
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';

export class ConditionExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log('[CONDITION_EXECUTOR] Avaliando condição');
    
    const conditionConfig = node.data.conditionConfig || {};
    const expression = conditionConfig.expression || 'true';
    
    console.log(`[CONDITION_EXECUTOR] Expressão: ${expression}`);
    
    try {
      const result = this.evaluateExpression(expression, context);
      console.log(`[CONDITION_EXECUTOR] Resultado: ${result}`);
      
      return {
        outputData: {
          ...context,
          conditionResult: result,
          lastConditionExpression: expression
        },
        shouldContinue: true
      };
    } catch (err: any) {
      console.error('[CONDITION_EXECUTOR] ❌ Erro ao avaliar condição:', err);
      return {
        outputData: {
          ...context,
          conditionResult: false,
          conditionError: err.message
        },
        shouldContinue: true
      };
    }
  }
  
  private evaluateExpression(expression: string, context: ExecutionContext): boolean {
    // Resolver variáveis no formato {context.path}
    const resolvedExpression = expression.replace(/\{([^}]+)\}/g, (match, path) => {
      const parts = path.split('.');
      let value: any = context;
      
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return 'undefined';
        }
      }
      
      // Converter para representação segura
      if (typeof value === 'string') return `"${value}"`;
      if (value === null || value === undefined) return 'null';
      return String(value);
    });
    
    console.log(`[CONDITION_EXECUTOR] Expressão resolvida: ${resolvedExpression}`);
    
    // Avaliação segura (sandbox limitado)
    return this.safeEval(resolvedExpression);
  }
  
  private safeEval(expression: string): boolean {
    // Lista de operadores permitidos
    const allowedPattern = /^[\s\d+\-*/%()<=>&|!"'.\w]+$/;
    
    if (!allowedPattern.test(expression)) {
      throw new Error('Expressão contém caracteres não permitidos');
    }
    
    // Remover palavras-chave perigosas
    const dangerous = ['eval', 'Function', 'constructor', 'prototype', '__proto__'];
    for (const keyword of dangerous) {
      if (expression.includes(keyword)) {
        throw new Error(`Palavra-chave não permitida: ${keyword}`);
      }
    }
    
    try {
      // Usar Function constructor com escopo limitado
      const func = new Function(`
        "use strict";
        return (${expression}) ? true : false;
      `);
      
      return func();
    } catch (err: any) {
      throw new Error(`Erro ao avaliar expressão: ${err.message}`);
    }
  }
}
