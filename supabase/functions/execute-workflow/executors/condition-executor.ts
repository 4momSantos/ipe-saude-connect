/**
 * Executor para nós do tipo CONDITION
 * Suporta JSON Logic (seguro) e fallback para expressões JavaScript
 */

import { NodeExecutor, WorkflowNode, ExecutionContext, NodeExecutionResult } from './types.ts';
import { ExpressionEvaluator } from '../lib/expression-evaluator.ts';

export class ConditionExecutor implements NodeExecutor {
  async execute(
    supabaseClient: any,
    executionId: string,
    stepExecutionId: string,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    console.log('[CONDITION_EXECUTOR] Avaliando condição');
    
    try {
      let result: boolean;
      
      // Verificar se tem configuração de expressão condicional (novo formato)
      if (node.data.conditionalExpression) {
        const config = node.data.conditionalExpression;
        
        if (config.mode === 'visual' && config.visualRules) {
          // Converter regras visuais para JSON Logic
          const jsonLogic = this.convertVisualToJsonLogic(config.visualRules);
          result = ExpressionEvaluator.evaluate(jsonLogic, context);
        } else if (config.expertExpression) {
          // Usar expressão JSON Logic direta
          result = ExpressionEvaluator.evaluate(config.expertExpression, context);
        } else {
          result = true; // Padrão
        }
        
        console.log(`[CONDITION_EXECUTOR] Resultado (JSON Logic): ${result}`);
      } 
      // Fallback para formato antigo (conditionConfig)
      else if (node.data.conditionConfig) {
        const expression = node.data.conditionConfig.expression || 'true';
        console.log(`[CONDITION_EXECUTOR] Usando formato legado: ${expression}`);
        result = this.evaluateLegacyExpression(expression, context);
      } 
      // Sem configuração
      else {
        console.log('[CONDITION_EXECUTOR] Sem configuração de condição, retornando true');
        result = true;
      }
      
      return {
        outputData: {
          ...context,
          conditionResult: result,
          lastConditionTimestamp: new Date().toISOString()
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
  
  /**
   * Converte regras visuais para JSON Logic
   */
  private convertVisualToJsonLogic(rules: any[]): object {
    if (!rules || rules.length === 0) {
      return { "===": [1, 1] }; // Sempre true
    }

    const conditions = rules.map(rule => {
      const value = isNaN(Number(rule.value)) ? rule.value : Number(rule.value);

      switch (rule.operator) {
        case '===':
          return { "===": [{ "var": rule.field }, value] };
        case '!==':
          return { "!": { "===": [{ "var": rule.field }, value] } };
        case '>':
          return { ">": [{ "var": rule.field }, value] };
        case '<':
          return { "<": [{ "var": rule.field }, value] };
        case '>=':
          return { ">=": [{ "var": rule.field }, value] };
        case '<=':
          return { "<=": [{ "var": rule.field }, value] };
        case 'contains':
          return { "in": [value, { "var": rule.field }] };
        case 'in':
          return { "in": [{ "var": rule.field }, value] };
        default:
          return { "===": [{ "var": rule.field }, value] };
      }
    });

    if (conditions.length === 1) {
      return conditions[0];
    }

    const connector = rules[0]?.connector || 'and';
    return connector === 'and' 
      ? { "and": conditions }
      : { "or": conditions };
  }

  /**
   * Avaliação legada (JavaScript com validação)
   * DEPRECADO - manter apenas para compatibilidade
   */
  private evaluateLegacyExpression(expression: string, context: ExecutionContext): boolean {
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
      
      if (typeof value === 'string') return `"${value}"`;
      if (value === null || value === undefined) return 'null';
      return String(value);
    });
    
    console.log(`[CONDITION_EXECUTOR] Expressão resolvida (legacy): ${resolvedExpression}`);
    
    return this.safeEval(resolvedExpression);
  }
  
  /**
   * Avaliação segura com timeout
   * DEPRECADO - usar JSON Logic ao invés
   */
  private safeEval(expression: string): boolean {
    const allowedPattern = /^[\s\d+\-*/%()<=>&|!"'.\w]+$/;
    
    if (!allowedPattern.test(expression)) {
      throw new Error('Expressão contém caracteres não permitidos');
    }
    
    const dangerous = ['eval', 'Function', 'constructor', 'prototype', '__proto__', 'fetch', 'import'];
    for (const keyword of dangerous) {
      if (expression.includes(keyword)) {
        throw new Error(`Palavra-chave não permitida: ${keyword}`);
      }
    }
    
    try {
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
