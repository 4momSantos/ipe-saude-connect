import * as z from 'zod';

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
  cpf: z.string().refine(validateCPF, 'CPF inválido'),
  data_nascimento: z.date({ required_error: 'Data de nascimento é obrigatória' }),
  nome_completo: z.string().min(5, 'Nome completo é obrigatório'),
  rg: z.string().min(5, 'RG é obrigatório'),
  orgao_emissor: z.string().min(2, 'Órgão emissor é obrigatório'),
  sexo: z.enum(['M', 'F'], { required_error: 'Sexo é obrigatório' }),
  nit_pis_pasep: z.string().optional(),
  crm: z.string().min(4, 'CRM deve ter no mínimo 4 caracteres'),
  uf_crm: z.string().length(2, 'UF deve ter 2 caracteres'),
  instituicao_graduacao: z.string().optional(),
  ano_formatura: z.number().optional(),
});

export const pessoaJuridicaSchema = z.object({
  cnpj: z.string().refine(validateCNPJ, 'CNPJ inválido'),
  denominacao_social: z.string().min(3, 'Denominação social é obrigatória'),
  logradouro: z.string().min(3, 'Logradouro é obrigatório'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro é obrigatório'),
  cidade: z.string().min(2, 'Cidade é obrigatória'),
  estado: z.string().length(2, 'UF deve ter 2 caracteres'),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  telefone: z.string().min(10, 'Telefone é obrigatório'),
  celular: z.string().min(10, 'Celular é obrigatório'),
  banco_agencia: z.string().min(3, 'Agência Banrisul é obrigatória'),
  banco_conta: z.string().min(3, 'Conta Banrisul é obrigatória'),
  optante_simples: z.boolean(),
  email: z.string().email('Email inválido'),
});

export const enderecoCorrespondenciaSchema = z.object({
  endereco_correspondencia: z.string().min(5, 'Endereço é obrigatório'),
  telefone_correspondencia: z.string().min(10, 'Telefone é obrigatório'),
  celular_correspondencia: z.string().min(10, 'Celular é obrigatório'),
  email_correspondencia: z.string().email('Email inválido'),
});

export const horarioAtendimento = z.object({
  dia_semana: z.enum(['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']),
  horario_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  horario_fim: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
});

export const consultorioHorariosSchema = z.object({
  especialidade_principal: z.string().min(3, 'Especialidade principal é obrigatória'),
  especialidade_secundaria: z.string().optional(),
  quantidade_consultas_minima: z.number().min(1, 'Mínimo 1 consulta'),
  atendimento_hora_marcada: z.boolean(),
  endereco_consultorio: z.string().min(5, 'Endereço do consultório é obrigatório'),
  telefone_consultorio: z.string().min(10, 'Telefone é obrigatório'),
  ramal: z.string().optional(),
  horarios: z.array(horarioAtendimento).min(1, 'Pelo menos um horário de atendimento é obrigatório'),
});

export const documentoUpload = z.object({
  tipo: z.string(),
  arquivo: z.instanceof(File).optional(),
  status: z.enum(['pendente', 'validado', 'rejeitado', 'faltante']).default('faltante'),
  url: z.string().optional(),
  observacoes: z.string().optional(),
});

export const documentosSchema = z.object({
  documentos: z.array(documentoUpload).refine(
    (docs) => {
      const obrigatoriosCount = DOCUMENTOS_OBRIGATORIOS.filter(d => d.obrigatorio).length;
      return docs.filter(d => d.arquivo || d.url).length >= obrigatoriosCount;
    },
    `Todos os documentos obrigatórios devem ser enviados`
  ),
});

export const inscricaoCompletaSchema = dadosPessoaisSchema
  .merge(pessoaJuridicaSchema)
  .merge(enderecoCorrespondenciaSchema)
  .merge(consultorioHorariosSchema)
  .merge(documentosSchema);

export type DadosPessoaisForm = z.infer<typeof dadosPessoaisSchema>;
export type PessoaJuridicaForm = z.infer<typeof pessoaJuridicaSchema>;
export type EnderecoCorrespondenciaForm = z.infer<typeof enderecoCorrespondenciaSchema>;
export type ConsultorioHorariosForm = z.infer<typeof consultorioHorariosSchema>;
export type DocumentosForm = z.infer<typeof documentosSchema>;
export type InscricaoCompletaForm = z.infer<typeof inscricaoCompletaSchema>;

// Lista de documentos obrigatórios
export const DOCUMENTOS_OBRIGATORIOS = [
  { tipo: 'ficha_cadastral', label: 'Ficha cadastral preenchida, datada e assinada', obrigatorio: true },
  { tipo: 'contrato_social', label: 'Contrato Social da Pessoa Jurídica (última alteração)', obrigatorio: false },
  { tipo: 'identidade_medica', label: 'Carteira de identidade médica (frente e verso)', obrigatorio: true },
  { tipo: 'rg_cpf', label: 'RG e CPF (se não constarem na identidade médica)', obrigatorio: false },
  { tipo: 'cert_regularidade_pj', label: 'Certificado de Regularidade PJ no CREMERS', obrigatorio: true },
  { tipo: 'registro_especialidade', label: 'Registro de Especialidade no CREMERS', obrigatorio: true },
  { tipo: 'alvara_sanitario', label: 'Alvará Sanitário e de Localização', obrigatorio: true },
  { tipo: 'cnpj', label: 'Prova de inscrição no CNPJ', obrigatorio: true },
  { tipo: 'certidoes_negativas', label: 'Certidões Negativas (Federal, Estadual, Municipal)', obrigatorio: true },
  { tipo: 'cert_fgts', label: 'Certificado de Regularidade do FGTS', obrigatorio: true },
  { tipo: 'comp_bancario', label: 'Comprovante de conta bancária (Banrisul)', obrigatorio: true },
  { tipo: 'simples_nacional', label: 'Comprovante Simples Nacional (se optante)', obrigatorio: false },
  { tipo: 'doc_exames', label: 'Documentos opcionais para exames', obrigatorio: false },
];
