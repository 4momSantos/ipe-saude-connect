/**
 * Schema Unificado de Inscrição
 * 
 * Centraliza todos os schemas de validação em um único ponto de importação.
 * Facilita manutenção e garante consistência entre PF e PJ.
 */

// Re-exportar todos os schemas do arquivo principal
export {
  // Schemas base
  dadosPessoaisSchema,
  pessoaJuridicaSchema,
  enderecoCorrespondenciaSchema,
  consultorioHorariosSchema,
  documentosSchema,
  tipoCredenciamentoSchema,
  horarioAtendimento,
  documentoUpload,
  
  // Schemas compostos
  inscricaoCompletaSchema,
  inscricaoCompletaPFSchema,
  inscricaoCompletaPJSchema,
  
  // Types
  type InscricaoCompletaForm,
  type DadosPessoaisForm,
  type PessoaJuridicaForm,
  type EnderecoCorrespondenciaForm,
  type ConsultorioHorariosForm,
  type DocumentosForm,
  
  // Helpers
  getSchemaByTipo,
  getDocumentosByTipo,
  mapTipoToOCRType,
  getDefaultFieldsForDocumentType,
  
  // Constantes
  DOCUMENTOS_PF,
  DOCUMENTOS_PJ,
  DOCUMENTOS_OBRIGATORIOS,
  DOCUMENTOS_POR_CONSULTORIO,
} from './inscricao-validation';

import { 
  inscricaoCompletaPFSchema, 
  inscricaoCompletaPJSchema, 
  inscricaoCompletaSchema 
} from './inscricao-validation';

// Schema unificado por tipo - facilita acesso dinâmico
export const inscricaoUnificadaSchema = {
  PF: inscricaoCompletaPFSchema,
  PJ: inscricaoCompletaPJSchema,
  Generico: inscricaoCompletaSchema,
};

/**
 * Helper para obter schema dinâmico baseado no tipo de credenciamento
 * @param tipo - 'PF' ou 'PJ', se não informado retorna schema genérico
 * @returns Schema Zod apropriado
 */
export function getInscricaoSchema(tipo?: 'PF' | 'PJ') {
  if (!tipo) return inscricaoUnificadaSchema.Generico;
  return inscricaoUnificadaSchema[tipo];
}
