import { cleanMask } from './maskHelpers';

/**
 * Remove máscaras de campos específicos dos dados de inscrição
 * antes de salvar no banco de dados
 */
export function cleanInscricaoData(dadosInscricao: any): any {
  if (!dadosInscricao || typeof dadosInscricao !== 'object') {
    return dadosInscricao;
  }

  const cleaned = { ...dadosInscricao };

  // Limpar dados pessoais
  if (cleaned.dados_pessoais) {
    cleaned.dados_pessoais = {
      ...cleaned.dados_pessoais,
      cpf: cleaned.dados_pessoais.cpf ? cleanMask(cleaned.dados_pessoais.cpf) : cleaned.dados_pessoais.cpf,
      rg: cleaned.dados_pessoais.rg ? cleanMask(cleaned.dados_pessoais.rg) : cleaned.dados_pessoais.rg,
      crm: cleaned.dados_pessoais.crm ? cleanMask(cleaned.dados_pessoais.crm) : cleaned.dados_pessoais.crm,
    };
  }

  // Limpar pessoa jurídica
  if (cleaned.pessoa_juridica) {
    cleaned.pessoa_juridica = {
      ...cleaned.pessoa_juridica,
      cnpj: cleaned.pessoa_juridica.cnpj ? cleanMask(cleaned.pessoa_juridica.cnpj) : cleaned.pessoa_juridica.cnpj,
    };

    // Limpar endereço da pessoa jurídica
    if (cleaned.pessoa_juridica.endereco) {
      cleaned.pessoa_juridica.endereco = {
        ...cleaned.pessoa_juridica.endereco,
        cep: cleaned.pessoa_juridica.endereco.cep ? cleanMask(cleaned.pessoa_juridica.endereco.cep) : cleaned.pessoa_juridica.endereco.cep,
      };
    }

    // Limpar contatos
    if (cleaned.pessoa_juridica.contatos) {
      cleaned.pessoa_juridica.contatos = {
        ...cleaned.pessoa_juridica.contatos,
        telefone: cleaned.pessoa_juridica.contatos.telefone ? cleanMask(cleaned.pessoa_juridica.contatos.telefone) : cleaned.pessoa_juridica.contatos.telefone,
        celular: cleaned.pessoa_juridica.contatos.celular ? cleanMask(cleaned.pessoa_juridica.contatos.celular) : cleaned.pessoa_juridica.contatos.celular,
      };
    }
  }

  // Limpar endereço de correspondência
  if (cleaned.endereco_correspondencia) {
    cleaned.endereco_correspondencia = {
      ...cleaned.endereco_correspondencia,
      cep: cleaned.endereco_correspondencia.cep ? cleanMask(cleaned.endereco_correspondencia.cep) : cleaned.endereco_correspondencia.cep,
      telefone: cleaned.endereco_correspondencia.telefone ? cleanMask(cleaned.endereco_correspondencia.telefone) : cleaned.endereco_correspondencia.telefone,
      celular: cleaned.endereco_correspondencia.celular ? cleanMask(cleaned.endereco_correspondencia.celular) : cleaned.endereco_correspondencia.celular,
    };
  }

  // Limpar endereço
  if (cleaned.endereco) {
    cleaned.endereco = {
      ...cleaned.endereco,
      cep: cleaned.endereco.cep ? cleanMask(cleaned.endereco.cep) : cleaned.endereco.cep,
    };
  }

  // Limpar consultório
  if (cleaned.consultorio) {
    cleaned.consultorio = {
      ...cleaned.consultorio,
      telefone: cleaned.consultorio.telefone ? cleanMask(cleaned.consultorio.telefone) : cleaned.consultorio.telefone,
      celular: cleaned.consultorio.celular ? cleanMask(cleaned.consultorio.celular) : cleaned.consultorio.celular,
    };
  }

  return cleaned;
}
