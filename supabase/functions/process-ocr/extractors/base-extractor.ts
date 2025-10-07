import { DocumentExtractor, FieldExtractor, OCRExtractionResult } from '../types.ts';

/**
 * Classe base para todos os extractors de documentos
 */
export abstract class BaseExtractor implements DocumentExtractor {
  abstract type: string;
  abstract fields: FieldExtractor[];

  /**
   * Executa extração de campos do documento
   */
  extract(text: string, normalizedText: string, expectedFields?: string[]): OCRExtractionResult {
    const result: OCRExtractionResult = {};
    
    // Filtra campos esperados se fornecido
    const fieldsToExtract = expectedFields
      ? this.fields.filter(f => expectedFields.includes(f.name))
      : this.fields;

    for (const field of fieldsToExtract) {
      const value = this.extractField(field, text, normalizedText);
      if (value) {
        result[field.name] = value;
      }
    }

    return result;
  }

  /**
   * Extrai um campo específico usando suas estratégias
   */
  protected extractField(field: FieldExtractor, text: string, normalizedText: string): string | null {
    // Ordena estratégias por prioridade
    const sortedStrategies = [...field.strategies].sort((a, b) => a.priority - b.priority);

    for (const strategy of sortedStrategies) {
      let value: string | null = null;

      // Executa estratégia (pode ser regex ou função)
      if (strategy.pattern instanceof RegExp) {
        const match = normalizedText.match(strategy.pattern) || text.match(strategy.pattern);
        if (match) {
          value = match[1] || match[0];
        }
      } else if (typeof strategy.pattern === 'function') {
        value = strategy.pattern(text) || strategy.pattern(normalizedText);
      }

      // Se encontrou valor, aplica transformação se houver
      if (value) {
        value = value.trim();
        
        if (strategy.transform) {
          value = strategy.transform(value);
        }

        // Valida se houver validador
        if (field.validator && !field.validator(value)) {
          continue;
        }

        return value;
      }
    }

    return null;
  }

  /**
   * Helper para criar estratégia de regex simples
   */
  protected createRegexStrategy(
    priority: number,
    pattern: RegExp,
    transform?: (match: string) => string,
    context?: string
  ) {
    return { priority, pattern, transform, context };
  }

  /**
   * Helper para criar estratégia de função
   */
  protected createFunctionStrategy(
    priority: number,
    fn: (text: string) => string | null,
    context?: string
  ) {
    return { priority, pattern: fn, context };
  }
}
