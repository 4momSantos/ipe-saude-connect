/**
 * Utilitário para normalizar dados de inscrição que podem estar em camelCase ou snake_case
 * Sempre retorna dados em snake_case para consistência
 */

export function normalizeDadosInscricao(dados: any) {
  if (!dados) return null;
  
  console.log('[NORMALIZE] Dados recebidos:', dados);
  
  // Detectar formato
  const isSnakeCase = !!dados.dados_pessoais;
  const isCamelCase = !!dados.dadosPessoais;
  
  // Se já está em snake_case, retornar como está
  if (isSnakeCase) {
    return dados;
  }
  
  // Converter de camelCase para snake_case
  if (isCamelCase) {
    return {
      dados_pessoais: {
        nome_completo: dados.dadosPessoais?.nome,
        cpf: dados.dadosPessoais?.cpf,
        rg: dados.dadosPessoais?.rg,
        data_nascimento: dados.dadosPessoais?.dataNascimento,
        data_expedicao_rg: dados.dadosPessoais?.dataExpedicaoRg,
        email: dados.dadosPessoais?.email,
        celular: dados.dadosPessoais?.celular,
        telefone: dados.dadosPessoais?.telefone,
        crm: dados.dadosPessoais?.crm,
        uf_crm: dados.dadosPessoais?.ufCrm,
      },
      pessoa_juridica: {
        denominacao_social: dados.pessoaJuridica?.razaoSocial || dados.pessoaJuridica?.nomeFantasia,
        nome_fantasia: dados.pessoaJuridica?.nomeFantasia,
        cnpj: dados.pessoaJuridica?.cnpj,
        inscricao_estadual: dados.pessoaJuridica?.inscricaoEstadual,
        optante_simples: dados.pessoaJuridica?.optanteSimples,
        porte: dados.pessoaJuridica?.porte,
      },
      consultorio: {
        especialidades_ids: dados.consultorio?.especialidadesIds || dados.consultorio?.especialidades_ids || [],
        crms: dados.consultorio?.crms,
        horarios: dados.consultorio?.horarios,
      },
      endereco: {
        logradouro: dados.endereco?.logradouro,
        numero: dados.endereco?.numero,
        complemento: dados.endereco?.complemento,
        bairro: dados.endereco?.bairro,
        cidade: dados.endereco?.cidade,
        estado: dados.endereco?.estado,
        cep: dados.endereco?.cep,
      },
      endereco_correspondencia: dados.enderecoCorrespondencia || dados.endereco_correspondencia || {},
      documentos: dados.documentos || [],
    };
  }
  
  // Formato desconhecido, retornar como está
  return dados;
}

export function extrairNomeCompleto(dados: any): string {
  const normalizado = normalizeDadosInscricao(dados);
  if (!normalizado) return "Sem nome";
  
  console.log('[NOME] Dados normalizados:', normalizado);
  
  // Prioridade: PJ > PF
  const nome = 
    normalizado.pessoa_juridica?.denominacao_social ||
    normalizado.dados_pessoais?.nome_completo ||
    "Sem nome";
  
  console.log('[NOME] Nome extraído:', nome);
  return nome;
}

export function extrairEspecialidadesIds(dados: any): string[] {
  const normalizado = normalizeDadosInscricao(dados);
  if (!normalizado) return [];
  
  const ids = normalizado.consultorio?.especialidades_ids || [];
  console.log('[ESPECIALIDADES] IDs extraídos:', ids);
  return Array.isArray(ids) ? ids : [];
}
