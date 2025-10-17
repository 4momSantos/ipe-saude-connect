/**
 * Validadores para geração de contratos
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Valida se todos os dados obrigatórios estão presentes
 */
export function validateContratoData(inscricao: any, edital: any): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validar dados pessoais
  const dadosPessoais = inscricao?.dados_inscricao?.dadosPessoais || 
                        inscricao?.dados_inscricao?.dados_pessoais;
  
  if (!dadosPessoais?.nome && !dadosPessoais?.nome_completo) {
    errors.push({ field: 'nome', message: 'Nome do candidato é obrigatório' });
  }
  
  if (!dadosPessoais?.cpf) {
    errors.push({ field: 'cpf', message: 'CPF do candidato é obrigatório' });
  }
  
  const enderecoCorresp = inscricao?.dados_inscricao?.enderecoCorrespondencia || 
                          inscricao?.dados_inscricao?.endereco_correspondencia;
  
  if (!dadosPessoais?.email && !enderecoCorresp?.email) {
    errors.push({ field: 'email', message: 'E-mail do candidato é obrigatório' });
  }
  
  // Validar dados do edital
  if (!edital?.titulo) {
    errors.push({ field: 'edital_titulo', message: 'Título do edital é obrigatório' });
  }
  
  if (!edital?.numero_edital) {
    errors.push({ field: 'edital_numero', message: 'Número do edital é obrigatório' });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida dados consolidados do contrato antes de gerar PDF
 */
export function validateContratoDataCompleto(contratoData: any): ValidationResult {
  const errors: ValidationError[] = [];
  
  const camposObrigatorios = [
    { field: 'candidato_nome', label: 'Nome do candidato' },
    { field: 'candidato_cpf', label: 'CPF do candidato' },
    { field: 'candidato_email', label: 'E-mail do candidato' },
    { field: 'edital_titulo', label: 'Título do edital' },
    { field: 'edital_numero', label: 'Número do edital' }
  ];
  
  for (const campo of camposObrigatorios) {
    if (!contratoData[campo.field] || contratoData[campo.field].trim() === '') {
      errors.push({ 
        field: campo.field, 
        message: `${campo.label} é obrigatório` 
      });
    }
  }
  
  // Validar formato de CPF (11 dígitos)
  if (contratoData.candidato_cpf) {
    const cpfLimpo = contratoData.candidato_cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      errors.push({ 
        field: 'candidato_cpf', 
        message: 'CPF deve ter 11 dígitos' 
      });
    }
  }
  
  // Validar formato de email
  if (contratoData.candidato_email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contratoData.candidato_email)) {
      errors.push({ 
        field: 'candidato_email', 
        message: 'E-mail inválido' 
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extrai e consolida dados de endereço de múltiplas fontes
 */
export function consolidarEndereco(dadosInscricao: any): string {
  // Tentar múltiplas fontes - Suportar snake_case e camelCase
  const enderecoCorrespondencia = dadosInscricao?.endereco_correspondencia || 
                                   dadosInscricao?.enderecoCorrespondencia;
  const pessoaJuridica = dadosInscricao?.pessoa_juridica || 
                         dadosInscricao?.pessoaJuridica;
  const endereco = dadosInscricao?.endereco;
  
  // Priorizar endereço de correspondência
  if (enderecoCorrespondencia?.endereco) {
    const parts = [
      enderecoCorrespondencia.endereco,
      enderecoCorrespondencia.numero,
      enderecoCorrespondencia.complemento,
      enderecoCorrespondencia.bairro,
      enderecoCorrespondencia.cidade,
      enderecoCorrespondencia.estado,
      enderecoCorrespondencia.cep
    ].filter(Boolean);
    
    return parts.join(', ');
  }
  
  // Tentar pessoa jurídica
  if (pessoaJuridica?.endereco) {
    const pjEnd = pessoaJuridica.endereco;
    const parts = [
      pjEnd.logradouro,
      pjEnd.numero || 'S/N',
      pjEnd.complemento,
      pjEnd.bairro,
      pjEnd.cidade,
      pjEnd.estado,
      pjEnd.cep
    ].filter(Boolean);
    
    return parts.join(', ');
  }
  
  // Fallback para endereço simples
  if (endereco) {
    const parts = [
      endereco.logradouro || endereco.endereco,
      endereco.numero,
      endereco.cidade,
      endereco.estado,
      endereco.cep
    ].filter(Boolean);
    
    return parts.join(', ');
  }
  
  return 'Não informado';
}

/**
 * Extrai telefone/celular de múltiplas fontes
 */
export function consolidarTelefone(dadosInscricao: any): { telefone: string; celular: string } {
  // Suportar snake_case e camelCase
  const enderecoCorrespondencia = dadosInscricao?.endereco_correspondencia || 
                                   dadosInscricao?.enderecoCorrespondencia;
  const pessoaJuridica = dadosInscricao?.pessoa_juridica || 
                         dadosInscricao?.pessoaJuridica;
  const dadosPessoais = dadosInscricao?.dados_pessoais || 
                        dadosInscricao?.dadosPessoais;
  
  return {
    telefone: enderecoCorrespondencia?.telefone || 
              pessoaJuridica?.contatos?.telefone || 
              dadosPessoais?.telefone || 
              'Não informado',
    celular: enderecoCorrespondencia?.celular || 
             pessoaJuridica?.contatos?.celular || 
             dadosPessoais?.celular || 
             'Não informado'
  };
}

/**
 * Formata CPF
 */
export function formatarCPF(cpf: string): string {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ
 */
export function formatarCNPJ(cnpj: string): string {
  if (!cnpj) return '';
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Determina tipo de credenciamento (PF ou PJ)
 */
export function determinarTipoCredenciamento(dadosInscricao: any): 'PF' | 'PJ' {
  const pessoaJuridica = dadosInscricao?.pessoa_juridica || dadosInscricao?.pessoaJuridica;
  
  if (pessoaJuridica?.cnpj && pessoaJuridica.cnpj.replace(/\D/g, '').length === 14) {
    return 'PJ';
  }
  
  return 'PF';
}

/**
 * Extrai dados do contratado baseado no tipo
 */
export function extrairDadosContratado(dadosInscricao: any, tipo: 'PF' | 'PJ') {
  if (tipo === 'PF') {
    const dadosPessoais = dadosInscricao?.dados_pessoais || dadosInscricao?.dadosPessoais;
    return {
      nome: dadosPessoais?.nome_completo || dadosPessoais?.nome,
      documento: dadosPessoais?.cpf,
      rg: dadosPessoais?.rg,
      data_nascimento: dadosPessoais?.data_nascimento
    };
  } else {
    const pessoaJuridica = dadosInscricao?.pessoa_juridica || dadosInscricao?.pessoaJuridica;
    return {
      nome: pessoaJuridica?.razao_social || pessoaJuridica?.denominacao_social,
      documento: pessoaJuridica?.cnpj,
      responsavel_legal: pessoaJuridica?.responsavel_legal
    };
  }
}

/**
 * Extrai especialidades formatadas
 */
export function extrairEspecialidades(dadosInscricao: any): string[] {
  const consultorio = dadosInscricao?.consultorio;
  
  if (!consultorio) return ['Não especificada'];
  
  // Tentar pegar de crms
  const crms = consultorio.crms || [];
  if (Array.isArray(crms) && crms.length > 0) {
    return crms
      .map((crm: any) => crm.especialidade || crm.especialidade_nome)
      .filter(Boolean);
  }
  
  // Tentar pegar de especialidades_ids
  const especialidadesIds = consultorio.especialidades_ids || consultorio.especialidades;
  if (Array.isArray(especialidadesIds) && especialidadesIds.length > 0) {
    // Retorna os IDs, pois a resolução será feita no edge function
    return especialidadesIds;
  }
  
  return ['Não especificada'];
}
