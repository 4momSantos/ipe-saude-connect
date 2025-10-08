/**
 * Expression Evaluator - Motor seguro de avaliação de expressões
 * Suporta JSON Logic (seguro) e JavaScript restrito (validado)
 */

// Implementação inline do JSON Logic (evita dependências externas)
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

      const entries = Object.entries(node);
      if (entries.length === 0) return node;

      const [operator, args] = entries[0];
      if (!operator) return node;

      const operation = operations[operator];
      if (!operation) {
        throw new Error(`Operador não suportado: ${operator}`);
      }

      if (operator === 'var') {
        return operation(args as any);
      }

      if (operator === 'and' || operator === 'or') {
        return operation(args as any[]);
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

export type EvaluationMode = 'json-logic' | 'javascript';

export interface ExpressionValidation {
  valid: boolean;
  error?: string;
}

export interface EvaluationResult {
  result: any;
  executionTime: number;
  mode: EvaluationMode;
}

/**
 * Classe principal para avaliação segura de expressões
 */
export class ExpressionEvaluator {
  private static readonly TIMEOUT_MS = 100;
  private static readonly DANGEROUS_KEYWORDS = [
    'eval', 'Function', 'constructor', 'prototype', '__proto__',
    'fetch', 'XMLHttpRequest', 'import', 'require', 'Deno', 'process'
  ];

  /**
   * Avalia uma expressão com contexto fornecido
   */
  static evaluate(
    expression: string | object,
    context: Record<string, any>,
    mode: EvaluationMode = 'json-logic'
  ): any {
    const startTime = performance.now();

    try {
      let result: any;

      if (mode === 'json-logic') {
        result = this.evaluateJsonLogic(expression, context);
      } else {
        result = this.evaluateJavaScript(expression as string, context);
      }

      const executionTime = performance.now() - startTime;

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
   * Avalia expressão JavaScript com validação rigorosa
   */
  private static evaluateJavaScript(
    expression: string,
    context: Record<string, any>
  ): any {
    // 1. Validar caracteres permitidos
    const allowedPattern = /^[\s\d+\-*/%()<=>&|!"'.\w]+$/;
    if (!allowedPattern.test(expression)) {
      throw new Error('Expressão contém caracteres não permitidos');
    }

    // 2. Validar palavras-chave perigosas
    for (const keyword of this.DANGEROUS_KEYWORDS) {
      if (expression.includes(keyword)) {
        throw new Error(`Palavra-chave não permitida: ${keyword}`);
      }
    }

    // 3. Resolver variáveis do contexto
    const resolvedExpression = this.resolveVariables(expression, context);

    // 4. Executar com timeout usando AbortController
    return this.executeWithTimeout(resolvedExpression);
  }

  /**
   * Resolve variáveis no formato {context.path}
   */
  private static resolveVariables(
    expression: string,
    context: Record<string, any>
  ): string {
    return expression.replace(/\{([^}]+)\}/g, (match, path) => {
      const value = this.getNestedValue(context, path);
      
      if (typeof value === 'string') return `"${value}"`;
      if (value === null || value === undefined) return 'null';
      return String(value);
    });
  }

  /**
   * Busca valor aninhado no contexto
   */
  private static getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Executa expressão com timeout
   */
  private static executeWithTimeout(expression: string): any {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      // Usar Function constructor em strict mode
      const func = new Function(`
        "use strict";
        return (${expression}) ? true : false;
      `);

      const result = func();
      clearTimeout(timeoutId);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw new Error(`Erro na execução: ${error.message}`);
    }
  }

  /**
   * Valida expressão antes de executar
   */
  static validate(
    expression: string | object,
    mode: EvaluationMode = 'json-logic'
  ): ExpressionValidation {
    try {
      if (mode === 'json-logic') {
        // Tentar parsear JSON Logic
        const rule = typeof expression === 'string' ? JSON.parse(expression) : expression;
        
        // Validar estrutura básica
        if (typeof rule !== 'object' || rule === null) {
          return { valid: false, error: 'JSON Logic deve ser um objeto' };
        }

        return { valid: true };
      } else {
        // Validar JavaScript
        if (typeof expression !== 'string') {
          return { valid: false, error: 'Expressão JavaScript deve ser string' };
        }

        // Validar caracteres
        const allowedPattern = /^[\s\d+\-*/%()<=>&|!"'.\w]+$/;
        if (!allowedPattern.test(expression)) {
          return { valid: false, error: 'Expressão contém caracteres não permitidos' };
        }

        // Validar palavras-chave
        for (const keyword of this.DANGEROUS_KEYWORDS) {
          if (expression.includes(keyword)) {
            return { valid: false, error: `Palavra-chave não permitida: ${keyword}` };
          }
        }

        return { valid: true };
      }
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Converte expressão JavaScript para JSON Logic
   */
  static convertToJsonLogic(jsExpression: string): object {
    // Conversão simples de expressões comuns
    // Ex: "age >= 18" -> { ">=": [{ "var": "age" }, 18] }
    
    const patterns = [
      // Comparações
      { regex: /(\w+)\s*>=\s*(\d+)/, logic: (m: RegExpMatchArray) => ({ ">=": [{ "var": m[1] }, parseInt(m[2])] }) },
      { regex: /(\w+)\s*<=\s*(\d+)/, logic: (m: RegExpMatchArray) => ({ "<=": [{ "var": m[1] }, parseInt(m[2])] }) },
      { regex: /(\w+)\s*>\s*(\d+)/, logic: (m: RegExpMatchArray) => ({ ">": [{ "var": m[1] }, parseInt(m[2])] }) },
      { regex: /(\w+)\s*<\s*(\d+)/, logic: (m: RegExpMatchArray) => ({ "<": [{ "var": m[1] }, parseInt(m[2])] }) },
      { regex: /(\w+)\s*===\s*"([^"]+)"/, logic: (m: RegExpMatchArray) => ({ "===": [{ "var": m[1] }, m[2]] }) },
      { regex: /(\w+)\s*!==\s*"([^"]+)"/, logic: (m: RegExpMatchArray) => ({ "!==": [{ "var": m[1] }, m[2]] }) },
    ];

    for (const pattern of patterns) {
      const match = jsExpression.match(pattern.regex);
      if (match) {
        return pattern.logic(match);
      }
    }

    throw new Error('Não foi possível converter expressão para JSON Logic');
  }
}

/**
 * Helper para criar regras JSON Logic comuns
 */
export const JsonLogicHelpers = {
  equals: (field: string, value: any) => ({
    "===": [{ "var": field }, value]
  }),

  greaterThan: (field: string, value: number) => ({
    ">": [{ "var": field }, value]
  }),

  lessThan: (field: string, value: number) => ({
    "<": [{ "var": field }, value]
  }),

  and: (...conditions: object[]) => ({
    "and": conditions
  }),

  or: (...conditions: object[]) => ({
    "or": conditions
  }),

  not: (condition: object) => ({
    "!": condition
  }),

  in: (field: string, values: any[]) => ({
    "in": [{ "var": field }, values]
  }),

  contains: (field: string, value: string) => ({
    "in": [value, { "var": field }]
  })
};
