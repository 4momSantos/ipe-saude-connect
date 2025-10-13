export interface ContractTemplate {
  id: string;
  nome: string;
  descricao?: string;
  conteudo_html: string;
  campos_mapeados: ContractField[];
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractField {
  id: string;
  nome: string; // Ex: "candidato.nome"
  label: string; // Ex: "Nome do Candidato"
  tipo: 'text' | 'date' | 'number' | 'select';
  origem: 'inscricao' | 'edital' | 'custom';
  caminho: string; // Ex: "dados_inscricao.dadosPessoais.nome"
  formato?: string; // Ex: "DD/MM/YYYY" para datas
  opcoes?: string[]; // Para tipo select
}

export interface AvailableField {
  id: string;
  label: string;
  categoria: 'candidato' | 'edital' | 'contrato' | 'sistema';
  preview: string;
  campo: ContractField;
}

export const camposDisponiveis: AvailableField[] = [
  // Candidato - Dados Pessoais
  {
    id: 'candidato.nome',
    label: 'Nome Completo',
    categoria: 'candidato',
    preview: 'João Silva Santos',
    campo: {
      id: 'candidato.nome',
      nome: 'candidato.nome',
      label: 'Nome Completo',
      tipo: 'text',
      origem: 'inscricao',
      caminho: 'dados_inscricao.dadosPessoais.nome'
    }
  },
  {
    id: 'candidato.cpf',
    label: 'CPF',
    categoria: 'candidato',
    preview: '123.456.789-00',
    campo: {
      id: 'candidato.cpf',
      nome: 'candidato.cpf',
      label: 'CPF',
      tipo: 'text',
      origem: 'inscricao',
      caminho: 'dados_inscricao.dadosPessoais.cpf'
    }
  },
  {
    id: 'candidato.rg',
    label: 'RG',
    categoria: 'candidato',
    preview: '12.345.678-9',
    campo: {
      id: 'candidato.rg',
      nome: 'candidato.rg',
      label: 'RG',
      tipo: 'text',
      origem: 'inscricao',
      caminho: 'dados_inscricao.dadosPessoais.rg'
    }
  },
  {
    id: 'candidato.data_nascimento',
    label: 'Data de Nascimento',
    categoria: 'candidato',
    preview: '01/01/1990',
    campo: {
      id: 'candidato.data_nascimento',
      nome: 'candidato.data_nascimento',
      label: 'Data de Nascimento',
      tipo: 'date',
      origem: 'inscricao',
      caminho: 'dados_inscricao.dadosPessoais.dataNascimento',
      formato: 'DD/MM/YYYY'
    }
  },
  {
    id: 'candidato.email',
    label: 'Email',
    categoria: 'candidato',
    preview: 'joao.silva@email.com',
    campo: {
      id: 'candidato.email',
      nome: 'candidato.email',
      label: 'Email',
      tipo: 'text',
      origem: 'inscricao',
      caminho: 'dados_inscricao.dadosPessoais.email'
    }
  },
  {
    id: 'candidato.telefone',
    label: 'Telefone',
    categoria: 'candidato',
    preview: '(11) 98765-4321',
    campo: {
      id: 'candidato.telefone',
      nome: 'candidato.telefone',
      label: 'Telefone',
      tipo: 'text',
      origem: 'inscricao',
      caminho: 'dados_inscricao.dadosPessoais.celular'
    }
  },
  {
    id: 'candidato.endereco',
    label: 'Endereço Completo',
    categoria: 'candidato',
    preview: 'Rua das Flores, 123 - São Paulo/SP - CEP 01234-567',
    campo: {
      id: 'candidato.endereco',
      nome: 'candidato.endereco',
      label: 'Endereço Completo',
      tipo: 'text',
      origem: 'inscricao',
      caminho: 'dados_inscricao.endereco'
    }
  },
  {
    id: 'candidato.crm',
    label: 'CRM',
    categoria: 'candidato',
    preview: '123456',
    campo: {
      id: 'candidato.crm',
      nome: 'candidato.crm',
      label: 'CRM',
      tipo: 'text',
      origem: 'inscricao',
      caminho: 'dados_inscricao.dadosPessoais.crm'
    }
  },
  {
    id: 'candidato.uf_crm',
    label: 'UF do CRM',
    categoria: 'candidato',
    preview: 'SP',
    campo: {
      id: 'candidato.uf_crm',
      nome: 'candidato.uf_crm',
      label: 'UF do CRM',
      tipo: 'text',
      origem: 'inscricao',
      caminho: 'dados_inscricao.dadosPessoais.ufCrm'
    }
  },
  {
    id: 'candidato.especialidade',
    label: 'Especialidade Médica',
    categoria: 'candidato',
    preview: 'Cardiologia',
    campo: {
      id: 'candidato.especialidade',
      nome: 'candidato.especialidade',
      label: 'Especialidade Médica',
      tipo: 'text',
      origem: 'inscricao',
      caminho: 'dados_inscricao.consultorio.especialidades'
    }
  },
  // Candidato - Pessoa Jurídica
  {
    id: 'candidato.cnpj',
    label: 'CNPJ',
    categoria: 'candidato',
    preview: '12.345.678/0001-90',
    campo: {
      id: 'candidato.cnpj',
      nome: 'candidato.cnpj',
      label: 'CNPJ',
      tipo: 'text',
      origem: 'inscricao',
      caminho: 'dados_inscricao.pessoaJuridica.cnpj'
    }
  },
  {
    id: 'candidato.razao_social',
    label: 'Razão Social',
    categoria: 'candidato',
    preview: 'Clínica Médica Silva LTDA',
    campo: {
      id: 'candidato.razao_social',
      nome: 'candidato.razao_social',
      label: 'Razão Social',
      tipo: 'text',
      origem: 'inscricao',
      caminho: 'dados_inscricao.pessoaJuridica.denominacaoSocial'
    }
  },
  // Edital
  {
    id: 'edital.titulo',
    label: 'Título do Edital',
    categoria: 'edital',
    preview: 'Edital de Credenciamento 001/2024',
    campo: {
      id: 'edital.titulo',
      nome: 'edital.titulo',
      label: 'Título do Edital',
      tipo: 'text',
      origem: 'edital',
      caminho: 'titulo'
    }
  },
  {
    id: 'edital.numero',
    label: 'Número do Edital',
    categoria: 'edital',
    preview: '001/2024',
    campo: {
      id: 'edital.numero',
      nome: 'edital.numero',
      label: 'Número do Edital',
      tipo: 'text',
      origem: 'edital',
      caminho: 'numero_edital'
    }
  },
  {
    id: 'edital.objeto',
    label: 'Objeto do Edital',
    categoria: 'edital',
    preview: 'Credenciamento de médicos especialistas',
    campo: {
      id: 'edital.objeto',
      nome: 'edital.objeto',
      label: 'Objeto do Edital',
      tipo: 'text',
      origem: 'edital',
      caminho: 'objeto'
    }
  },
  {
    id: 'edital.data_publicacao',
    label: 'Data de Publicação',
    categoria: 'edital',
    preview: '15/01/2024',
    campo: {
      id: 'edital.data_publicacao',
      nome: 'edital.data_publicacao',
      label: 'Data de Publicação',
      tipo: 'date',
      origem: 'edital',
      caminho: 'data_publicacao',
      formato: 'DD/MM/YYYY'
    }
  },
  {
    id: 'edital.data_inicio',
    label: 'Data de Início',
    categoria: 'edital',
    preview: '01/02/2024',
    campo: {
      id: 'edital.data_inicio',
      nome: 'edital.data_inicio',
      label: 'Data de Início',
      tipo: 'date',
      origem: 'edital',
      caminho: 'data_inicio',
      formato: 'DD/MM/YYYY'
    }
  },
  {
    id: 'edital.data_fim',
    label: 'Data de Término',
    categoria: 'edital',
    preview: '31/12/2024',
    campo: {
      id: 'edital.data_fim',
      nome: 'edital.data_fim',
      label: 'Data de Término',
      tipo: 'date',
      origem: 'edital',
      caminho: 'data_fim',
      formato: 'DD/MM/YYYY'
    }
  },
  // Contrato
  {
    id: 'contrato.numero',
    label: 'Número do Contrato',
    categoria: 'contrato',
    preview: 'CONT-2024-000123',
    campo: {
      id: 'contrato.numero',
      nome: 'contrato.numero',
      label: 'Número do Contrato',
      tipo: 'text',
      origem: 'custom',
      caminho: 'numero_contrato'
    }
  },
  {
    id: 'contrato.data',
    label: 'Data do Contrato',
    categoria: 'contrato',
    preview: '20/10/2025',
    campo: {
      id: 'contrato.data',
      nome: 'contrato.data',
      label: 'Data do Contrato',
      tipo: 'date',
      origem: 'custom',
      caminho: 'created_at',
      formato: 'DD/MM/YYYY'
    }
  },
  {
    id: 'contrato.validade',
    label: 'Validade do Contrato',
    categoria: 'contrato',
    preview: '12 meses',
    campo: {
      id: 'contrato.validade',
      nome: 'contrato.validade',
      label: 'Validade do Contrato',
      tipo: 'text',
      origem: 'custom',
      caminho: 'validade'
    }
  },
  // Sistema
  {
    id: 'sistema.data_atual',
    label: 'Data Atual',
    categoria: 'sistema',
    preview: new Date().toLocaleDateString('pt-BR'),
    campo: {
      id: 'sistema.data_atual',
      nome: 'sistema.data_atual',
      label: 'Data Atual',
      tipo: 'date',
      origem: 'custom',
      caminho: 'now()',
      formato: 'DD/MM/YYYY'
    }
  },
  {
    id: 'sistema.ano_atual',
    label: 'Ano Atual',
    categoria: 'sistema',
    preview: new Date().getFullYear().toString(),
    campo: {
      id: 'sistema.ano_atual',
      nome: 'sistema.ano_atual',
      label: 'Ano Atual',
      tipo: 'text',
      origem: 'custom',
      caminho: 'year(now())'
    }
  }
];
