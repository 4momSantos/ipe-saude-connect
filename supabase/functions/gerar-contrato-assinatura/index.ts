/**
 * Edge Function: gerar-contrato-assinatura
 * 
 * Gera um contrato de credenciamento e envia para assinatura via Assinafy.
 * 
 * Dependências:
 * - SUPABASE_URL (obrigatório)
 * - SUPABASE_SERVICE_ROLE_KEY (obrigatório)
 * - ASSINAFY_API_KEY (opcional - se não configurado, contrato é criado mas não enviado)
 * - ASSINAFY_ACCOUNT_ID (opcional - se não configurado, contrato é criado mas não enviado)
 * 
 * Invoca:
 * - send-signature-request (se credenciais Assinafy estiverem configuradas)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função de log estruturado
function logEvent(level: 'info' | 'error' | 'warn', action: string, data: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'gerar-contrato-assinatura',
    action,
    ...data
  }));
}

interface GerarContratoRequest {
  inscricao_id: string;
  template_id?: string; // Opcional: ID do template customizado
}

interface ContratoData {
  inscricao_id: string;
  candidato_nome: string;
  candidato_cpf: string;
  candidato_email: string;
  edital_titulo: string;
  edital_numero: string;
  especialidades: string[];
}

// Função para resolver caminho em objeto (ex: "dados_inscricao.dadosPessoais.nome")
function resolverCaminho(obj: any, caminho: string): string {
  const partes = caminho.split('.');
  let valor = obj;
  
  for (const parte of partes) {
    if (valor && typeof valor === 'object' && parte in valor) {
      valor = valor[parte];
    } else {
      return '';
    }
  }
  
  return String(valor || '');
}

// Função para gerar HTML do contrato a partir de template
function gerarContratoFromTemplate(
  templateHTML: string,
  inscricaoData: any,
  editalData: any,
  contratoData: any
): string {
  let html = templateHTML;
  
  // Regex para encontrar placeholders {{campo}}
  const regex = /\{\{([^}]+)\}\}/g;
  
  html = html.replace(regex, (match, campo) => {
    const [origem, ...caminho] = campo.split('.');
    const path = caminho.join('.');
    
    switch (origem) {
      case 'candidato':
        return resolverCaminho(inscricaoData.dados_inscricao?.dadosPessoais || {}, path);
      case 'edital':
        return resolverCaminho(editalData, path);
      case 'contrato':
        return resolverCaminho(contratoData, path);
      case 'sistema':
        if (campo === 'sistema.data_atual') {
          return new Date().toLocaleDateString('pt-BR');
        }
        return '';
      default:
        return match; // Mantém placeholder se não encontrar
    }
  });
  
  return html;
}

// Função para gerar HTML do contrato (fallback se não houver template)
function gerarContratoHTML(data: ContratoData): string {
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Contrato de Credenciamento</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { text-align: center; color: #333; }
    h2 { color: #555; margin-top: 30px; }
    .header { text-align: center; margin-bottom: 40px; }
    .clausula { margin: 20px 0; }
    .assinatura { margin-top: 60px; text-align: center; }
    .linha-assinatura { border-top: 1px solid #000; width: 300px; margin: 40px auto 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CONTRATO DE CREDENCIAMENTO</h1>
    <p><strong>Edital: ${data.edital_numero} - ${data.edital_titulo}</strong></p>
    <p>Data: ${dataAtual}</p>
  </div>

  <div class="clausula">
    <h2>PARTES CONTRATANTES</h2>
    <p><strong>CONTRATANTE:</strong> [Nome da Instituição]</p>
    <p><strong>CONTRATADO:</strong> ${data.candidato_nome}</p>
    <p><strong>CPF:</strong> ${data.candidato_cpf}</p>
    <p><strong>E-mail:</strong> ${data.candidato_email}</p>
  </div>

  <div class="clausula">
    <h2>CLÁUSULA PRIMEIRA - DO OBJETO</h2>
    <p>O presente contrato tem por objeto o credenciamento do CONTRATADO para prestação de serviços de saúde nas seguintes especialidades:</p>
    <ul>
      ${data.especialidades.map(esp => `<li>${esp}</li>`).join('')}
    </ul>
  </div>

  <div class="clausula">
    <h2>CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES DO CONTRATADO</h2>
    <p>O CONTRATADO obriga-se a:</p>
    <ul>
      <li>Prestar os serviços com qualidade e dentro dos padrões técnicos;</li>
      <li>Manter os documentos de habilitação válidos;</li>
      <li>Cumprir as normas e regulamentos da instituição;</li>
      <li>Informar qualquer alteração cadastral em até 30 dias.</li>
    </ul>
  </div>

  <div class="clausula">
    <h2>CLÁUSULA TERCEIRA - DA VIGÊNCIA</h2>
    <p>O presente contrato tem vigência de 24 (vinte e quatro) meses, contados a partir da data de assinatura, podendo ser renovado mediante acordo entre as partes.</p>
  </div>

  <div class="clausula">
    <h2>CLÁUSULA QUARTA - DO FORO</h2>
    <p>As partes elegem o foro da comarca de [Cidade/UF] para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato.</p>
  </div>

  <div class="assinatura">
    <p>E, por estarem assim justos e contratados, firmam o presente instrumento em duas vias de igual teor.</p>
    <p>${dataAtual}</p>
    
    <div class="linha-assinatura"></div>
    <p><strong>CONTRATANTE</strong></p>
    <p>[Nome da Instituição]</p>

    <div class="linha-assinatura"></div>
    <p><strong>CONTRATADO</strong></p>
    <p>${data.candidato_nome}</p>
    <p>CPF: ${data.candidato_cpf}</p>
  </div>
</body>
</html>
  `.trim();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'function_start',
    method: req.method
  }));

  try {
    // Validar request
    const { inscricao_id, template_id }: GerarContratoRequest = await req.json();

    if (!inscricao_id) {
      throw new Error('inscricao_id é obrigatório');
    }

    logEvent('info', 'start', { inscricao_id, template_id });

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validar credenciais da Assinafy (mesmo que não usemos diretamente aqui)
    const assifafyApiKey = Deno.env.get('ASSINAFY_API_KEY');
    const assifafyAccountId = Deno.env.get('ASSINAFY_ACCOUNT_ID');

    if (!assifafyApiKey) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'missing_assinafy_api_key',
        message: 'ASSINAFY_API_KEY não configurada - assinatura via Assinafy não estará disponível'
      }));
    }

    if (!assifafyAccountId) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'missing_assinafy_account_id',
        message: 'ASSINAFY_ACCOUNT_ID não configurado - assinatura via Assinafy não estará disponível'
      }));
    }

    // Buscar dados da inscrição e edital
    const { data: inscricao, error: inscricaoError } = await supabase
      .from('inscricoes_edital')
      .select(`
        id,
        dados_inscricao,
        candidato_id,
        editais (
          id,
          titulo,
          numero_edital
        )
      `)
      .eq('id', inscricao_id)
      .single();

    if (inscricaoError || !inscricao) {
      throw new Error(`Inscrição não encontrada: ${inscricaoError?.message}`);
    }

    // Buscar dados do candidato
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('nome, email')
      .eq('id', inscricao.candidato_id)
      .single();

    if (profileError || !profile) {
      throw new Error(`Perfil do candidato não encontrado: ${profileError?.message}`);
    }

    // Extrair dados para o contrato
    const dadosInscricao = inscricao.dados_inscricao as any || {};
    const dadosPessoais = dadosInscricao.dadosPessoais || {};
    const consultorio = dadosInscricao.consultorio || {};
    const crms = consultorio.crms || [];
    const especialidades = crms.map((crm: any) => crm.especialidade || 'Não especificada');

    const contratoData: ContratoData = {
      inscricao_id,
      candidato_nome: dadosPessoais.nome || profile.nome || 'Não informado',
      candidato_cpf: dadosPessoais.cpf || 'Não informado',
      candidato_email: dadosPessoais.email || profile.email || 'Não informado',
      edital_titulo: (inscricao.editais as any)?.titulo || 'Não especificado',
      edital_numero: (inscricao.editais as any)?.numero_edital || 'S/N',
      especialidades: especialidades.length > 0 ? especialidades : ['Não especificada']
    };

    logEvent('info', 'fetch_data', { 
      inscricao_id, 
      candidato: contratoData.candidato_nome,
      edital: contratoData.edital_titulo 
    });

    // Gerar número único do contrato
    const numeroContrato = `CONT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Buscar template se especificado, ou usar template ativo padrão
    let contratoHTML: string;
    let templateUsado: any = null;

    if (template_id) {
      // Buscar template específico
      const { data: template, error: templateError } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('id', template_id)
        .eq('is_active', true)
        .single();

      if (templateError) {
        console.warn(`Template ${template_id} não encontrado, usando template padrão`);
      } else {
        templateUsado = template;
      }
    } else {
      // Buscar template ativo padrão (o mais recente)
      const { data: templates } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (templates && templates.length > 0) {
        templateUsado = templates[0];
      }
    }

    // Gerar HTML
    if (templateUsado) {
      logEvent('info', 'using_template', {
        template_id: templateUsado.id,
        template_name: templateUsado.nome
      });

      contratoHTML = gerarContratoFromTemplate(
        templateUsado.conteudo_html,
        inscricao,
        inscricao.editais,
        {
          numero_contrato: numeroContrato,
          created_at: new Date().toISOString()
        }
      );
    } else {
      logEvent('info', 'using_default_template', {});

      // Fallback: usar função de template padrão
      contratoHTML = gerarContratoHTML(contratoData);
    }

    // Salvar contrato no banco
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .insert({
        inscricao_id,
        numero_contrato: numeroContrato,
        template_id: templateUsado?.id,
        status: 'pendente_assinatura',
        tipo: 'credenciamento',
        dados_contrato: {
          html: contratoHTML,
          data_geracao: new Date().toISOString(),
          candidato: contratoData.candidato_nome,
          edital: contratoData.edital_titulo,
          template_usado: templateUsado?.nome || 'Template Padrão'
        }
      })
      .select()
      .single();

    if (contratoError || !contrato) {
      throw new Error(`Erro ao criar contrato: ${contratoError?.message}`);
    }

    logEvent('info', 'html_generated', { 
      html_length: contratoHTML.length 
    });

    logEvent('info', 'contract_saved', {
      contrato_id: contrato.id,
      numero_contrato: numeroContrato
    });

    // Buscar análise para obter step_execution_id (se houver)
    const { data: analise } = await supabase
      .from('analises')
      .select('id')
      .eq('inscricao_id', inscricao_id)
      .single();

    // Criar registro de signature_request
    const { data: signatureRequest, error: signatureError } = await supabase
      .from('signature_requests')
      .insert({
        provider: 'assinafy',
        status: 'pending',
        contrato_id: contrato.id, // ✅ Vínculo direto ao contrato
        signers: [
          {
            name: contratoData.candidato_nome,
            email: contratoData.candidato_email,
            cpf: contratoData.candidato_cpf
          }
        ],
        metadata: {
          contrato_id: contrato.id,
          inscricao_id,
          numero_contrato: numeroContrato,
          document_html: contratoHTML
        },
        step_execution_id: null // Não temos workflow aqui
      })
      .select()
      .single();

    if (signatureError || !signatureRequest) {
      throw new Error(`Erro ao criar signature request: ${signatureError?.message}`);
    }

    logEvent('info', 'signature_request_created', {
      signature_request_id: signatureRequest.id
    });

    // Chamar send-signature-request apenas se as credenciais estiverem configuradas
    let assinafyResponse: any = null;
    
    if (assifafyApiKey && assifafyAccountId) {
      try {
        logEvent('info', 'calling_send_signature', {
          signature_request_id: signatureRequest.id
        });

        const { data, error: assinafyError } = await supabase.functions.invoke(
          'send-signature-request',
          {
            body: {
              signatureRequestId: signatureRequest.id // Corrigido o nome do campo
            }
          }
        );

        if (assinafyError) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'assinafy_error',
            error: assinafyError.message
          }));
          
          // Atualizar status mas não falhar a função
          await supabase
            .from('signature_requests')
            .update({ 
              status: 'failed',
              metadata: {
                ...signatureRequest.metadata,
                error: assinafyError.message
              }
            })
            .eq('id', signatureRequest.id);
        } else {
          assinafyResponse = data;
        }
      } catch (invokeError: any) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'invoke_error',
          error: invokeError.message
        }));
        
        // Atualizar status de erro
        await supabase
          .from('signature_requests')
          .update({ 
            status: 'failed',
            metadata: {
              ...signatureRequest.metadata,
              error: invokeError.message
            }
          })
          .eq('id', signatureRequest.id);
      }
    } else {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'assinafy_credentials_missing',
        message: 'Contrato criado mas assinatura não enviada - credenciais Assinafy não configuradas'
      }));
      
      // Atualizar signature_request como pendente de configuração
      await supabase
        .from('signature_requests')
        .update({ 
          status: 'pending',
          metadata: {
            ...signatureRequest.metadata,
            warning: 'Aguardando configuração das credenciais da Assinafy'
          }
        })
        .eq('id', signatureRequest.id);
    }

    const elapsedTime = Date.now() - startTime;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'function_complete',
      elapsed_ms: elapsedTime,
      contrato_id: contrato.id,
      assinatura_status: signatureRequest.status
    }));

    return new Response(
      JSON.stringify({
        contrato_id: contrato.id,
        numero_contrato: numeroContrato,
        assinatura_status: signatureRequest.status,
        signature_request_id: signatureRequest.id,
        assinafy_response: assinafyResponse
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'function_error',
      error: error.message,
      stack: error.stack
    }));

    return new Response(
      JSON.stringify({
        error: error.message,
        message: 'Erro ao gerar contrato e solicitar assinatura'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
