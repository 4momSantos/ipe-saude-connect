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
  // Candidato
  {
    id: 'candidato.nome',
    label: 'Nome do Candidato',
    categoria: 'candidato',
    preview: 'João Silva',
    campo: {
      id: 'candidato.nome',
      nome: 'candidato.nome',
      label: 'Nome do Candidato',
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
    id: 'candidato.email',
    label: 'Email',
    categoria: 'candidato',
    preview: 'joao@email.com',
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
    preview: 'Rua das Flores, 123 - São Paulo/SP',
    campo: {
      id: 'candidato.endereco',
      nome: 'candidato.endereco',
      label: 'Endereço Completo',
      tipo: 'text',
      origem: 'inscricao',
      caminho: 'dados_inscricao.endereco'
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
  }
];
