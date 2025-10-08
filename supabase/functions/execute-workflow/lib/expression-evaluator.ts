/**
 * Expression Evaluator - Backend (Deno)
 * Motor seguro de avaliação de expressões usando JSON Logic
 */

// Importação inline do json-logic-js
const jsonLogic = {
  apply: (rule: any, data: any): any => {
    const operations: Record<string, (a: any, b?: any) => any> = {
      '===': (a: any, b: any) => a === b,
      '!==': (a: any, b: any) => a !== b,
      '>': (a: any, b: any) => a > b,
      '<': (a: any, b: any) => a < b,
      '>=': (a: any, b: any) => a >= b,
      '<=': (a: any, b: any) => a <= b,
      'and': (values: any[]) => values.every(v => evaluate(v)),
      'or': (values: any[]) => values.some(v => evaluate(v)),
      '!': (value: any) => !evaluate(value),
      'in': (a: any, b: any) => {
        if (Array.isArray(b)) return b.includes(a);
        if (typeof b === 'string') return b.includes(a);
        return false;
      },
      'var': (path: string) => {
        const parts = path.split('.');
        let value = data;
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            return undefined;
          }
        }
        return value;
      }
    };

    const evaluate = (node: any): any => {
      if (typeof node !== 'object' || node === null) {
        return node;
      }

      const [operator, ...args] = Object.entries(node)[0] || [];
      if (!operator) return node;

      const operation = operations[operator];
      if (!operation) {
        throw new Error(`Operador não suportado: ${operator}`);
      }

      if (operator === 'var') {
        return operation(args as any);
      }

      if (operator === 'and' || operator === 'or') {
        return operation(args);
      }

      if (operator === '!') {
        return operation(args);
      }

      const evaluatedArgs = Array.isArray(args) 
        ? args.map(arg => evaluate(arg))
        : [evaluate(args)];

      if (evaluatedArgs.length === 2) {
        return operation(evaluatedArgs[0], evaluatedArgs[1]);
      } else if (evaluatedArgs.length === 1) {
        return operation(evaluatedArgs[0]);
      }
      return operation(evaluatedArgs[0], evaluatedArgs[1]);
    };

    return evaluate(rule);
  }
};

export type EvaluationMode = 'json-logic';

export interface ExpressionValidation {
  valid: boolean;
  error?: string;
}

/**
 * Classe principal para avaliação segura de expressões
 */
export class ExpressionEvaluator {
  private static readonly TIMEOUT_MS = 100;

  /**
   * Avalia uma expressão com contexto fornecido
   */
  static evaluate(
    expression: string | object,
    context: Record<string, any>
  ): any {
    const startTime = Date.now();

    try {
      const result = this.evaluateJsonLogic(expression, context);

      const executionTime = Date.now() - startTime;

      if (executionTime > this.TIMEOUT_MS) {
        throw new Error(`Execução excedeu o timeout de ${this.TIMEOUT_MS}ms`);
      }

      return result;
    } catch (error: any) {
      throw new Error(`Erro ao avaliar expressão: ${error.message}`);
    }
  }

  /**
   * Avalia expressão usando JSON Logic (SEGURO)
   */
  private static evaluateJsonLogic(
    rule: string | object,
    context: Record<string, any>
  ): any {
    try {
      const parsedRule = typeof rule === 'string' ? JSON.parse(rule) : rule;
      return jsonLogic.apply(parsedRule, context);
    } catch (error: any) {
      throw new Error(`JSON Logic inválido: ${error.message}`);
    }
  }

  /**
   * Valida expressão antes de executar
   */
  static validate(expression: string | object): ExpressionValidation {
    try {
      const rule = typeof expression === 'string' ? JSON.parse(expression) : expression;
      
      if (typeof rule !== 'object' || rule === null) {
        return { valid: false, error: 'JSON Logic deve ser um objeto' };
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }
}
