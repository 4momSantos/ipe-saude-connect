/**
 * Sistema de Decisões - [REQ-13]
 * Tipos para registro de decisões de análise com justificativa
 */

export type StatusDecisao = 'aprovado' | 'reprovado' | 'pendente_correcao';

export interface CampoReprovado {
  campo: string;
  secao: string; // Ex: "Dados Pessoais", "Pessoa Jurídica", etc.
  motivo: string;
  valor_atual?: string;
  valor_esperado?: string;
}

export interface DocumentoReprovado {
  documento_id: string;
  tipo_documento: string;
  motivo: string;
  acao_requerida: 'reenviar' | 'complementar' | 'corrigir';
}

export interface Decisao {
  status: StatusDecisao;
  justificativa: string;
  campos_reprovados?: CampoReprovado[];
  documentos_reprovados?: DocumentoReprovado[];
  prazo_correcao?: Date;
  proxima_etapa?: string;
}

export interface DecisaoRegistrada {
  id: string;
  inscricao_id: string;
  analista_id: string;
  analista_nome: string;
  decisao: Decisao;
  created_at: string;
}
