import { DocumentExtractor } from '../types.ts';
import { RGExtractor } from './rg-extractor.ts';
import { CNHExtractor } from './cnh-extractor.ts';
import { CPFExtractor } from './cpf-extractor.ts';
import { CRMExtractor } from './crm-extractor.ts';
import { CNPJExtractor } from './cnpj-extractor.ts';
import { DiplomaExtractor } from './diploma-extractor.ts';
import { CertidaoExtractor } from './certidao-extractor.ts';
import { ComprovanteExtractor } from './comprovante-extractor.ts';

/**
 * Registry de extractors por tipo de documento
 */
const extractorRegistry = new Map<string, DocumentExtractor>();

// Registrar todos os extractors
extractorRegistry.set('rg', new RGExtractor());
extractorRegistry.set('cnh', new CNHExtractor());
extractorRegistry.set('cpf', new CPFExtractor());
extractorRegistry.set('crm', new CRMExtractor());
extractorRegistry.set('cnpj', new CNPJExtractor());
extractorRegistry.set('diploma', new DiplomaExtractor());
extractorRegistry.set('certidao', new CertidaoExtractor());
extractorRegistry.set('comprovante_endereco', new ComprovanteExtractor());

/**
 * Obtém extractor para tipo de documento
 */
export function getExtractor(documentType: string): DocumentExtractor | null {
  return extractorRegistry.get(documentType.toLowerCase()) || null;
}

/**
 * Lista todos os tipos de documentos suportados
 */
export function getSupportedDocumentTypes(): string[] {
  return Array.from(extractorRegistry.keys());
}

/**
 * Verifica se tipo de documento é suportado
 */
export function isDocumentTypeSupported(documentType: string): boolean {
  return extractorRegistry.has(documentType.toLowerCase());
}
