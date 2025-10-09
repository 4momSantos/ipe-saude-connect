import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export interface TestEdital {
  id: string;
  titulo: string;
  numero_edital: string;
}

export interface TestInscricao {
  id: string;
  edital_id: string;
  candidato_id: string;
}

/**
 * Cria usuário de teste
 */
export async function createTestUser(
  email: string,
  password: string,
  role: 'candidato' | 'analista' | 'gestor' = 'candidato'
): Promise<TestUser> {
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(`Erro ao criar usuário: ${authError?.message}`);
  }

  // Criar perfil
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      nome: `Test User ${Date.now()}`,
    });

  if (profileError) {
    throw new Error(`Erro ao criar perfil: ${profileError.message}`);
  }

  // Atribuir role
  if (role !== 'candidato') {
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role,
      });

    if (roleError) {
      throw new Error(`Erro ao atribuir role: ${roleError.message}`);
    }
  }

  return {
    id: authData.user.id,
    email,
    password,
  };
}

/**
 * Cria edital de teste
 */
export async function createTestEdital(gestorId: string): Promise<TestEdital> {
  const numeroEdital = `TEST-${Date.now()}`;
  
  const { data, error } = await supabaseAdmin
    .from('editais')
    .insert({
      titulo: `Edital de Teste ${Date.now()}`,
      numero_edital: numeroEdital,
      descricao: 'Edital criado para testes E2E',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'aberto',
      created_by: gestorId,
      vagas: 10,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erro ao criar edital: ${error?.message}`);
  }

  return {
    id: data.id,
    titulo: data.titulo,
    numero_edital: data.numero_edital,
  };
}

/**
 * Cria inscrição de teste
 */
export async function createTestInscricao(
  editalId: string,
  candidatoId: string
): Promise<TestInscricao> {
  const dadosInscricao = {
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

  const { data, error } = await supabaseAdmin
    .from('inscricoes_edital')
    .insert({
      edital_id: editalId,
      candidato_id: candidatoId,
      dados_inscricao: dadosInscricao,
      is_rascunho: false,
      status: 'aguardando_analise',
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erro ao criar inscrição: ${error?.message}`);
  }

  return {
    id: data.id,
    edital_id: data.edital_id,
    candidato_id: data.candidato_id,
  };
}

/**
 * Envia inscrição
 */
export async function enviarInscricao(inscricaoId: string): Promise<void> {
  const { error } = await supabaseAdmin.functions.invoke('enviar-inscricao', {
    body: { inscricao_id: inscricaoId },
  });

  if (error) {
    throw new Error(`Erro ao enviar inscrição: ${error.message}`);
  }
}

/**
 * Analisa e aprova inscrição
 */
export async function aprovarInscricao(
  inscricaoId: string,
  analistaId: string
): Promise<void> {
  const { error } = await supabaseAdmin.functions.invoke('analisar-inscricao', {
    body: {
      inscricao_id: inscricaoId,
      analista_id: analistaId,
      decisao: 'aprovado',
      comentarios: 'Aprovado automaticamente em teste E2E',
    },
  });

  if (error) {
    throw new Error(`Erro ao aprovar inscrição: ${error.message}`);
  }
}

/**
 * Gera contrato
 */
export async function gerarContrato(inscricaoId: string): Promise<{ contrato_id: string }> {
  const { data, error } = await supabaseAdmin.functions.invoke('gerar-contrato-assinatura', {
    body: { inscricao_id: inscricaoId },
  });

  if (error) {
    throw new Error(`Erro ao gerar contrato: ${error.message}`);
  }

  return data as { contrato_id: string };
}

/**
 * Simula webhook Assinafy (documento assinado)
 */
export async function simularAssinafyWebhook(inscricaoId: string): Promise<void> {
  // Buscar signature_request
  const { data: signatureRequest } = await supabaseAdmin
    .from('signature_requests')
    .select('id, external_id')
    .eq('workflow_execution_id', inscricaoId)
    .single();

  if (!signatureRequest) {
    throw new Error('Signature request não encontrado');
  }

  const payload = {
    event: 'document.signed',
    document_id: signatureRequest.external_id || `test-doc-${Date.now()}`,
    signed_at: new Date().toISOString(),
    signers: [
      {
        name: 'Dr. João da Silva',
        email: 'joao.silva@example.com',
        signed_at: new Date().toISOString(),
      },
    ],
    metadata: {
      inscricaoId,
      signature_request_id: signatureRequest.id,
    },
  };

  const { error } = await supabaseAdmin.functions.invoke('assinafy-webhook-finalizacao', {
    body: payload,
  });

  if (error) {
    throw new Error(`Erro ao simular webhook Assinafy: ${error.message}`);
  }
}

/**
 * Geocodifica credenciado
 */
export async function geocodificarCredenciado(credenciadoId: string): Promise<void> {
  const { error } = await supabaseAdmin.functions.invoke('geocodificar-credenciado', {
    body: { credenciado_id: credenciadoId },
  });

  if (error) {
    throw new Error(`Erro ao geocodificar credenciado: ${error.message}`);
  }
}

/**
 * Aguarda condição
 */
export async function waitForCondition(
  checkFn: () => Promise<boolean>,
  timeout = 30000,
  interval = 1000
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await checkFn()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Timeout aguardando condição');
}

/**
 * Limpa dados de teste
 */
export async function cleanupTestData(userId?: string, editalId?: string): Promise<void> {
  if (userId) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  }
  
  if (editalId) {
    await supabaseAdmin.from('editais').delete().eq('id', editalId);
  }
}
