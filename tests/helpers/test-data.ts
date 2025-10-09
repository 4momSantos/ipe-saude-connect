/**
 * Dados de teste reutilizáveis
 */

export const TEST_USERS = {
  candidato: {
    email: `candidato.test.${Date.now()}@example.com`,
    password: 'Test@123456',
  },
  analista: {
    email: `analista.test.${Date.now()}@example.com`,
    password: 'Test@123456',
  },
  gestor: {
    email: `gestor.test.${Date.now()}@example.com`,
    password: 'Test@123456',
  },
};

export const MOCK_CREDENCIADO = {
  nome: 'Dr. João da Silva',
  cpf: '12345678901',
  email: 'joao.silva@example.com',
  telefone: '11987654321',
  endereco: 'Rua Teste, 123',
  cidade: 'São Paulo',
  estado: 'SP',
  cep: '01310-100',
  latitude: -23.5505,
  longitude: -46.6333,
};

export const MOCK_EDITAL = {
  titulo: 'Edital de Credenciamento - Teste E2E',
  descricao: 'Edital criado automaticamente para testes',
  vagas: 10,
  status: 'aberto',
};

export const MOCK_INSCRICAO = {
  dadosPessoais: {
    nome: 'Dr. João da Silva',
    cpf: '12345678901',
    rg: '1234567',
    dataNascimento: '1980-01-01',
    email: 'joao.silva@example.com',
    telefone: '11987654321',
    celular: '11987654321',
  },
  endereco: {
    logradouro: 'Rua Teste',
    numero: '123',
    complemento: 'Apto 45',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01310-100',
  },
  consultorio: {
    crms: [
      {
        crm: '123456',
        uf: 'SP',
        especialidade: 'Cardiologia',
        horarios: [
          {
            diaSemana: 'Segunda-feira',
            horarioInicio: '08:00',
            horarioFim: '12:00',
          },
        ],
      },
    ],
  },
};

export const MOCK_GEOCODING_RESPONSE = {
  success: true,
  latitude: -23.5505,
  longitude: -46.6333,
  provider: 'nominatim',
  cached: false,
};

export const MOCK_GEOCODING_ERROR = {
  success: false,
  error: 'Provider timeout',
  provider: 'nominatim',
  attempts: 1,
};
