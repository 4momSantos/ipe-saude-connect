export interface ExtractionStrategy {
  priority: number;
  pattern: RegExp | ((text: string) => string | null);
  transform?: (match: string) => string;
  context?: string; // Descrição da estratégia para logging
}

export interface FieldExtractor {
  name: string;
  strategies: ExtractionStrategy[];
  validator?: (value: string) => boolean;
  transform?: (value: string) => string;
  required?: boolean;
}

export interface DocumentExtractor {
  type: string;
  fields: FieldExtractor[];
  extract(text: string, normalizedText: string, expectedFields?: string[]): Record<string, any>;
}

export interface OCRExtractionResult {
  [key: string]: string;
}
