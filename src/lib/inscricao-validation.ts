import * as z from 'zod';
import { cleanMask, validateCPFMask, validateCNPJMask, validatePhoneMask, validateCEPMask } from '@/utils/maskHelpers';

// Validação de CPF
const validateCPF = (cpf: string) => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  return digit === parseInt(cleaned.charAt(10));
};

// Validação de CNPJ
const validateCNPJ = (cnpj: string) => {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cleaned.charAt(12))) return false;
  
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return digit === parseInt(cleaned.charAt(13));
};

// Schemas de validação para cada etapa

export const dadosPessoaisSchema = z.object({
  cpf: z.string()
    .min(1, 'CPF é obrigatório')
    .refine((val) => validateCPF(cleanMask(val)), 'CPF inválido')
    .transform(cleanMask),
  data_nascimento: z.date({ required_error: 'Data de nascimento é obrigatória' })
    .refine((date) => {
      const today = new Date();
      const birthDate = new Date(date);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Ajustar idade se ainda não fez aniversário este ano
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age >= 18;
    }, 'Você deve ter pelo menos 18 anos'),
  nome_completo: z.string().min(5, 'Nome completo é obrigatório'),
  rg: z.string().min(5, 'RG é obrigatório'),
  orgao_emissor: z.string().min(2, 'Órgão emissor é obrigatório'),
  sexo: z.enum(['M', 'F'], { required_error: 'Sexo é obrigatório' }),
  nit_pis_pasep: z.string().optional(),
  crm: z.string()
    .min(1, 'CRM é obrigatório')
    .transform(cleanMask),
  uf_crm: z.string().length(2, 'UF deve ter 2 caracteres'),
  instituicao_graduacao: z.string().optional(),
  ano_formatura: z.number().optional(),
});

export const pessoaJuridicaSchema = z.object({
  cnpj: z.string()
    .min(1, 'CNPJ é obrigatório')
    .refine((val) => validateCNPJ(cleanMask(val)), 'CNPJ inválido')
    .transform(cleanMask),
  denominacao_social: z.string().min(3, 'Denominação social é obrigatória'),
  logradouro: z.string().min(3, 'Logradouro é obrigatório'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro é obrigatório'),
  cidade: z.string().min(2, 'Cidade é obrigatória'),
  estado: z.string().length(2, 'UF deve ter 2 caracteres'),
  cep: z.string()
    .min(1, 'CEP é obrigatório')
    .refine(validateCEPMask, 'CEP inválido')
    .transform(cleanMask),
  telefone: z.string()
    .min(1, 'Telefone é obrigatório')
    .refine(validatePhoneMask, 'Telefone inválido')
    .transform(cleanMask),
  celular: z.string()
    .min(1, 'Celular é obrigatório')
    .refine((val) => cleanMask(val).length === 11, 'Celular deve ter 11 dígitos')
    .transform(cleanMask),
  banco_agencia: z.string().min(3, 'Agência Banrisul é obrigatória'),
  banco_conta: z.string().min(3, 'Conta Banrisul é obrigatória'),
  optante_simples: z.boolean(),
  email: z.string().email('Email inválido'),
  sede_atende: z.boolean().optional().default(false),
});

// Schema completo de endereço de correspondência (estruturado)
export const enderecoCorrespondenciaSchema = z.object({
  cep_correspondencia: z.string()
    .optional()
    .transform(val => val ? cleanMask(val) : ''),
  logradouro_correspondencia: z.string().optional(),
  numero_correspondencia: z.string().optional(),
  complemento_correspondencia: z.string().optional(),
  bairro_correspondencia: z.string().optional(),
  cidade_correspondencia: z.string().optional(),
  uf_correspondencia: z.string().optional(),
  telefone_correspondencia: z.string()
    .optional()
    .transform(val => val ? cleanMask(val) : ''),
  celular_correspondencia: z.string()
    .optional()
    .transform(val => val ? cleanMask(val) : ''),
  email_correspondencia: z.string()
    .optional()
    .refine(val => !val || z.string().email().safeParse(val).success, 'Email inválido'),
});

export const horarioAtendimento = z.object({
  dia_semana: z.enum(['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']),
  horario_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  horario_fim: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
});

export const consultorioHorariosSchema = z.object({
  especialidades_ids: z.array(z.string().uuid())
    .optional()
    .default([])
    .refine(arr => !arr || arr.length <= 10, 'Você pode selecionar no máximo 10 especialidades'),
  quantidade_consultas_minima: z.number().min(1, 'Mínimo 1 consulta'),
  atendimento_hora_marcada: z.boolean(),
  endereco_consultorio: z.string().min(5, 'Endereço do consultório é obrigatório'),
  telefone_consultorio: z.string()
    .optional()
    .transform(val => val ? cleanMask(val) : ''),
  ramal: z.string().optional(),
  horarios: z.array(horarioAtendimento).optional().default([]),
});

export const documentoUpload = z.object({
  tipo: z.string(),
  arquivo: z.instanceof(File).optional(),
  status: z.enum(['pendente', 'validado', 'rejeitado', 'faltante', 'enviado']).default('faltante'),
  url: z.string().optional(),
  observacoes: z.string().optional(),
  ocrResult: z.any().optional(),
});

export const documentosSchema = z.object({
  documentos: z.array(documentoUpload).optional().default([]),
});

// Schema unificado flexível (torna PF e PJ opcionais para compatibilidade)
export const inscricaoCompletaSchema = dadosPessoaisSchema.partial()
  .merge(pessoaJuridicaSchema.partial())
  .merge(enderecoCorrespondenciaSchema.partial()) // ✅ Opcional no schema base
  .merge(consultorioHorariosSchema.partial())     // ✅ Opcional no schema base
  .merge(documentosSchema);

export type DadosPessoaisForm = z.infer<typeof dadosPessoaisSchema>;
export type PessoaJuridicaForm = z.infer<typeof pessoaJuridicaSchema>;
export type EnderecoCorrespondenciaForm = z.infer<typeof enderecoCorrespondenciaSchema>;
export type ConsultorioHorariosForm = z.infer<typeof consultorioHorariosSchema>;
export type DocumentosForm = z.infer<typeof documentosSchema>;
// Schema para tipo de credenciamento
export const tipoCredenciamentoSchema = z.object({
  tipo_credenciamento: z.enum(['PF', 'PJ'], {
    required_error: 'Tipo de credenciamento é obrigatório'
  })
});

// Schema condicional PF (dados pessoais obrigatórios, PJ opcional)
export const inscricaoCompletaPFSchema = tipoCredenciamentoSchema
  .merge(dadosPessoaisSchema)                    // ✅ CPF, CRM, nome obrigatórios
  .merge(enderecoCorrespondenciaSchema.partial()) // ✅ Endereço de correspondência parcialmente opcional
  .merge(consultorioHorariosSchema.partial())     // ✅ Consultório parcialmente opcional
  .merge(documentosSchema)                       // ✅ Documentos opcionais
  .merge(z.object({                              // ✅ Permitir campos PJ opcionais sem validar
    cnpj: z.string().optional(),
    denominacao_social: z.string().optional(),
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
    cep: z.string().optional(),
    telefone: z.string().optional(),
    celular: z.string().optional(),
    banco_agencia: z.string().optional(),
    banco_conta: z.string().optional(),
    optante_simples: z.boolean().optional(),
    email: z.string().optional(),
    sede_atende: z.boolean().optional(),
  }));

// Schema condicional PJ (PJ obrigatório, dados pessoais opcionais)
export const inscricaoCompletaPJSchema = tipoCredenciamentoSchema
  .merge(dadosPessoaisSchema.partial()) // Dados pessoais opcionais para PJ
  .merge(pessoaJuridicaSchema)
  .merge(enderecoCorrespondenciaSchema.partial()) // Endereço pode ser do consultório
  .merge(documentosSchema);

// Tipo unificado permissivo (todos os campos opcionais, exceto enderecoCorrespondencia e documentos)
export type InscricaoCompletaForm = z.infer<typeof inscricaoCompletaSchema> & {
  tipo_credenciamento?: 'PF' | 'PJ';
};

// Helper para validar baseado no tipo
export function getSchemaByTipo(tipo: 'PF' | 'PJ') {
  return tipo === 'PF' ? inscricaoCompletaPFSchema : inscricaoCompletaPJSchema;
}

// Schema original (mantido para compatibilidade)
export type InscricaoCompletaFormLegacy = z.infer<typeof inscricaoCompletaSchema>;

// Documentos específicos de Pessoa Física
export const DOCUMENTOS_PF = [
  { tipo: 'identidade_medica', label: 'Carteira de identidade médica', obrigatorio: true, ocrConfig: { enabled: true, documentType: 'crm' as const } },
  { tipo: 'cpf', label: 'CPF', obrigatorio: true, ocrConfig: { enabled: true, documentType: 'cpf' as const } },
  { tipo: 'rg', label: 'RG', obrigatorio: false, ocrConfig: { enabled: true, documentType: 'rg' as const } },
  { tipo: 'cert_regularidade_crm', label: 'Certificado de Regularidade no CRM', obrigatorio: true, ocrConfig: { enabled: false, documentType: 'certidao' as const } },
  { tipo: 'diploma', label: 'Diploma de Graduação', obrigatorio: true, ocrConfig: { enabled: true, documentType: 'diploma' as const } },
  { tipo: 'comp_bancario', label: 'Comprovante Bancário', obrigatorio: true, ocrConfig: { enabled: false, documentType: 'comprovante' as const } },
];

// Documentos específicos de Pessoa Jurídica
export const DOCUMENTOS_PJ = [
  { tipo: 'cnpj', label: 'Cartão CNPJ', obrigatorio: true, ocrConfig: { enabled: true, documentType: 'cnpj' as const } },
  { tipo: 'contrato_social', label: 'Contrato Social', obrigatorio: true, ocrConfig: { enabled: false, documentType: 'certidao' as const } },
  { tipo: 'alvara_sanitario', label: 'Alvará Sanitário', obrigatorio: true, ocrConfig: { enabled: false, documentType: 'certidao' as const } },
  { tipo: 'certidoes_negativas', label: 'Certidões Negativas (Federal, Estadual, Municipal)', obrigatorio: true, ocrConfig: { enabled: false, documentType: 'certidao' as const } },
  { tipo: 'cert_fgts', label: 'Certificado de Regularidade FGTS', obrigatorio: true, ocrConfig: { enabled: false, documentType: 'certidao' as const } },
  { tipo: 'comp_bancario', label: 'Comprovante Bancário (Banrisul)', obrigatorio: true, ocrConfig: { enabled: false, documentType: 'comprovante' as const } },
  { tipo: 'simples_nacional', label: 'Comprovante Simples Nacional', obrigatorio: false, ocrConfig: { enabled: false, documentType: 'certidao' as const } },
];

// Documentos por consultório (apenas PJ)
export const DOCUMENTOS_POR_CONSULTORIO = [
  { tipo: 'cnes', label: 'Certificado CNES', obrigatorio: true, ocrConfig: { enabled: false, documentType: 'certidao' as const } },
  { tipo: 'alvara_local', label: 'Alvará do Consultório', obrigatorio: true, ocrConfig: { enabled: false, documentType: 'certidao' as const } },
  { tipo: 'crm_responsavel', label: 'CRM do Responsável Técnico', obrigatorio: true, ocrConfig: { enabled: true, documentType: 'crm' as const } },
];

// Helper para obter documentos baseado no tipo
export function getDocumentosByTipo(tipo: 'PF' | 'PJ') {
  return tipo === 'PF' ? DOCUMENTOS_PF : DOCUMENTOS_PJ;
}

// Lista de documentos obrigatórios (mantida para compatibilidade)
export const DOCUMENTOS_OBRIGATORIOS = [
  { 
    tipo: 'ficha_cadastral', 
    label: 'Ficha cadastral preenchida, datada e assinada', 
    obrigatorio: true,
    ocrConfig: {
      enabled: false,
      documentType: 'certidao' as const,
      expectedFields: [],
      minConfidence: 70,
      autoValidate: false
    }
  },
  { tipo: 'contrato_social', label: 'Contrato Social da Pessoa Jurídica (última alteração)', obrigatorio: false },
  { 
    tipo: 'identidade_medica', 
    label: 'Carteira de identidade médica (frente e verso)', 
    obrigatorio: true,
    ocrConfig: {
      enabled: true,
      documentType: 'crm' as const,
      expectedFields: [
        { ocrField: 'nome', contextField: 'nome_completo', required: true, compareWithFormField: 'nome_completo' },
        { ocrField: 'crm', contextField: 'crm', required: true, validateWithAPI: 'validate-crm' }
      ],
      minConfidence: 70,
      autoValidate: true
    }
  },
  { 
    tipo: 'rg_cpf', 
    label: 'RG e CPF (se não constarem na identidade médica)', 
    obrigatorio: false,
    ocrConfig: {
      enabled: true,
      documentType: 'rg' as const,
      expectedFields: [
        { ocrField: 'cpf', contextField: 'cpf', required: true, validateWithAPI: 'validate-cpf' },
        { ocrField: 'nome', contextField: 'nome_completo', required: true }
      ],
      minConfidence: 70,
      autoValidate: true
    }
  },
  { tipo: 'cert_regularidade_pj', label: 'Certificado de Regularidade PJ no CREMERS', obrigatorio: true },
  { tipo: 'registro_especialidade', label: 'Registro de Especialidade no CREMERS', obrigatorio: true },
  { tipo: 'alvara_sanitario', label: 'Alvará Sanitário e de Localização', obrigatorio: true },
  { 
    tipo: 'cnpj', 
    label: 'Prova de inscrição no CNPJ', 
    obrigatorio: true,
    ocrConfig: {
      enabled: true,
      documentType: 'cnpj' as const,
      expectedFields: [
        { ocrField: 'cnpj', contextField: 'cnpj', required: true, validateWithAPI: 'validate-cnpj' },
        { ocrField: 'razao_social', contextField: 'denominacao_social', required: true }
      ],
      minConfidence: 70,
      autoValidate: true
    }
  },
  { tipo: 'certidoes_negativas', label: 'Certidões Negativas (Federal, Estadual, Municipal)', obrigatorio: true },
  { tipo: 'cert_fgts', label: 'Certificado de Regularidade do FGTS', obrigatorio: true },
  { tipo: 'comp_bancario', label: 'Comprovante de conta bancária (Banrisul)', obrigatorio: true },
  { tipo: 'simples_nacional', label: 'Comprovante Simples Nacional (se optante)', obrigatorio: false },
  { tipo: 'doc_exames', label: 'Documentos opcionais para exames', obrigatorio: false },
];

/**
 * Mapeia tipo de documento da inscrição para tipo de OCR
 */
export function mapTipoToOCRType(tipo: string): string {
  const mapping: Record<string, string> = {
    'identidade_medica': 'crm',
    'rg_cpf': 'rg',
    'rg': 'rg',
    'cpf': 'cpf',
    'cnpj': 'cnpj',
    'cnh': 'cnh',
    'diploma': 'diploma',
    'certidao': 'certidao',
    'comprovante_endereco': 'comprovante'
  };
  return mapping[tipo] || tipo;
}

/**
 * Obtém campos padrão para cada tipo de documento
 * Re-exporta de ocr-processor para facilitar imports
 */
export { getDefaultFieldsForDocumentType } from '@/lib/ocr-processor';
