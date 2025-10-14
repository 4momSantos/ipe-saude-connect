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
import { 
  validateContratoData, 
  consolidarEndereco, 
  consolidarTelefone,
  extrairEspecialidades 
} from "./validators.ts";
import { CONTRACT_STYLES } from "./contract-styles.ts";

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
  candidato_cpf_formatado: string;
  candidato_rg: string;
  candidato_email: string;
  candidato_telefone: string;
  candidato_celular: string;
  candidato_endereco_completo: string;
  candidato_data_nascimento: string;
  candidato_data_nascimento_formatada: string;
  edital_titulo: string;
  edital_numero: string;
  edital_objeto: string;
  edital_data_publicacao: string;
  edital_data_publicacao_formatada: string;
  especialidades: string[];
  especialidades_texto: string;
  sistema_data_atual: string;
  sistema_data_extenso: string;
}

// Função para formatar CPF
function formatarCPF(cpf: string): string {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Função para formatar data por extenso
function formatarDataExtenso(data: Date): string {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  
  const dia = data.getDate();
  const mes = meses[data.getMonth()];
  const ano = data.getFullYear();
  
  return `${dia} de ${mes} de ${ano}`;
}

// Função para resolver caminho em objeto com suporte a arrays
function resolverCaminho(obj: any, caminho: string): string {
  const partes = caminho.split('.');
  let valor = obj;
  
  for (const parte of partes) {
    // Suportar notação de array: campo[0]
    const arrayMatch = parte.match(/^(\w+)\[(\d+)\]$/);
    
    if (arrayMatch) {
      const [, campo, index] = arrayMatch;
      if (valor && typeof valor === 'object' && campo in valor) {
        valor = valor[campo];
        if (Array.isArray(valor)) {
          valor = valor[parseInt(index)];
        }
      } else {
        return '';
      }
    } else if (valor && typeof valor === 'object' && parte in valor) {
      valor = valor[parte];
    } else {
      return '';
    }
  }
  
  // Se for array, retornar primeiro elemento ou join
  if (Array.isArray(valor)) {
    return valor.filter(Boolean).join(', ');
  }
  
  return String(valor || '');
}

// Função para envolver HTML do contrato em documento completo
function wrapInHTMLDocument(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrato de Credenciamento</title>
  <style>
${CONTRACT_STYLES}
  </style>
</head>
<body>
  <div class="document-container">
${content}
  </div>
</body>
</html>`;
}

// Função para gerar HTML do contrato a partir de template
function gerarContratoFromTemplate(
  templateHTML: string,
  contratoData: ContratoData
): string {
  let html = templateHTML;
  
  // Regex para encontrar placeholders {{campo}}
  const regex = /\{\{([^}]+)\}\}/g;
  
  // Log de placeholders encontrados
  const placeholders = html.match(regex) || [];
  logEvent('info', 'placeholders_found', { 
    count: placeholders.length,
    placeholders: placeholders.slice(0, 10) // Primeiros 10
  });
  
  // Log do template original (primeiros 500 caracteres)
  logEvent('info', 'template_html_preview', {
    preview: templateHTML.substring(0, 500),
    has_inline_styles: templateHTML.includes('style='),
    has_strong: templateHTML.includes('<strong>'),
    has_em: templateHTML.includes('<em>'),
    has_lists: templateHTML.includes('<ol') || templateHTML.includes('<ul')
  });
  
  html = html.replace(regex, (match, campo) => {
    // Remover espaços
    const campoLimpo = campo.trim();
    
    // Mapear campo para contratoData
    const campoKey = campoLimpo.replace(/\./g, '_');
    
    if (campoKey in contratoData) {
      const value = String((contratoData as any)[campoKey] || '');
      logEvent('info', 'placeholder_resolved', { 
        placeholder: match,
        campo: campoLimpo,
        value: value.substring(0, 50) // Primeiros 50 chars do valor
      });
      return value;
    }
    
    // Log de placeholder não resolvido
    logEvent('warn', 'placeholder_not_resolved', { 
      placeholder: match,
      campo: campoLimpo 
    });
    
    return '___________'; // Substitui por linha em branco ao invés de manter placeholder
  });
  
  // Verificar placeholders restantes
  const remainingPlaceholders = html.match(regex) || [];
  if (remainingPlaceholders.length > 0) {
    logEvent('warn', 'unresolved_placeholders', {
      count: remainingPlaceholders.length,
      placeholders: remainingPlaceholders
    });
  }
  
  // Log do HTML gerado (primeiros 1000 caracteres)
  logEvent('info', 'generated_html_preview', {
    preview: html.substring(0, 1000),
    total_length: html.length
  });
  
  // Envolver em documento HTML completo com CSS
  return wrapInHTMLDocument(html);
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

    // Buscar dados COMPLETOS da inscrição e edital
    const { data: inscricao, error: inscricaoError } = await supabase
      .from('inscricoes_edital')
      .select(`
        id,
        dados_inscricao,
        candidato_id,
        editais (
          id,
          titulo,
          numero_edital,
          objeto,
          data_publicacao,
          descricao
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

    // VALIDAR dados antes de continuar
    const validation = validateContratoData(inscricao, inscricao.editais);
    if (!validation.valid) {
      logEvent('error', 'validation_failed', { 
        errors: validation.errors 
      });
      throw new Error(`Dados incompletos para gerar contrato: ${validation.errors.map(e => e.message).join('; ')}`);
    }

    // Extrair dados COMPLETOS para o contrato
    const dadosInscricao = inscricao.dados_inscricao as any || {};
    const dadosPessoais = dadosInscricao.dadosPessoais || dadosInscricao.dados_pessoais || {};
    const enderecoInfo = consolidarEndereco(dadosInscricao);
    const telefoneInfo = consolidarTelefone(dadosInscricao);
    const especialidadesArray = extrairEspecialidades(dadosInscricao);
    
    // Buscar nomes das especialidades se necessário
    let especialidadesTexto = especialidadesArray.join(', ');
    if (especialidadesArray[0] && especialidadesArray[0].length === 36) {
      // São UUIDs, buscar nomes
      const { data: especialidades } = await supabase
        .from('especialidades_medicas')
        .select('nome')
        .in('id', especialidadesArray);
      
      if (especialidades && especialidades.length > 0) {
        especialidadesTexto = especialidades.map(e => e.nome).join(', ');
      }
    }

    // Formatar datas
    const dataAtual = new Date();
    const dataNascimento = dadosPessoais.data_nascimento ? new Date(dadosPessoais.data_nascimento) : null;
    const dataPublicacao = (inscricao.editais as any)?.data_publicacao ? new Date((inscricao.editais as any).data_publicacao) : null;

    const contratoData: ContratoData = {
      inscricao_id,
      candidato_nome: dadosPessoais.nome || dadosPessoais.nome_completo || profile.nome || 'Não informado',
      candidato_cpf: dadosPessoais.cpf || 'Não informado',
      candidato_cpf_formatado: formatarCPF(dadosPessoais.cpf),
      candidato_rg: dadosPessoais.rg || 'Não informado',
      candidato_email: dadosPessoais.email || profile.email || 'Não informado',
      candidato_telefone: telefoneInfo.telefone,
      candidato_celular: telefoneInfo.celular,
      candidato_endereco_completo: enderecoInfo,
      candidato_data_nascimento: dataNascimento ? dataNascimento.toLocaleDateString('pt-BR') : 'Não informado',
      candidato_data_nascimento_formatada: dataNascimento ? formatarDataExtenso(dataNascimento) : 'Não informado',
      edital_titulo: (inscricao.editais as any)?.titulo || 'Não especificado',
      edital_numero: (inscricao.editais as any)?.numero_edital || 'S/N',
      edital_objeto: (inscricao.editais as any)?.objeto || 'Credenciamento de profissionais de saúde',
      edital_data_publicacao: dataPublicacao ? dataPublicacao.toLocaleDateString('pt-BR') : 'Não informado',
      edital_data_publicacao_formatada: dataPublicacao ? formatarDataExtenso(dataPublicacao) : 'Não informado',
      especialidades: especialidadesArray,
      especialidades_texto: especialidadesTexto,
      sistema_data_atual: dataAtual.toLocaleDateString('pt-BR'),
      sistema_data_extenso: formatarDataExtenso(dataAtual)
    };

    logEvent('info', 'data_consolidated', { 
      inscricao_id, 
      candidato: contratoData.candidato_nome,
      cpf: contratoData.candidato_cpf_formatado,
      email: contratoData.candidato_email,
      endereco: contratoData.candidato_endereco_completo,
      telefone: contratoData.candidato_telefone,
      especialidades: contratoData.especialidades_texto,
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
      // Buscar template "Contrato de Credenciamento - Padrão" especificamente
      const { data: templatePadrao } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('is_active', true)
        .eq('nome', 'Contrato de Credenciamento - Padrão')
        .single();

      if (templatePadrao) {
        templateUsado = templatePadrao;
        logEvent('info', 'found_default_template', {
          template_id: templatePadrao.id,
          template_name: templatePadrao.nome
        });
      } else {
        // Fallback: buscar qualquer template ativo
        const { data: templates } = await supabase
          .from('contract_templates')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (templates && templates.length > 0) {
          templateUsado = templates[0];
          logEvent('warn', 'using_fallback_template', {
            template_id: templates[0].id,
            template_name: templates[0].nome
          });
        }
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
        contratoData
      );
    } else {
      logEvent('info', 'using_default_template', {});

      // Fallback: usar função de template padrão
      contratoHTML = gerarContratoHTML(contratoData);
    }

    // Fase 3: Criar contrato com retry em caso de duplicate key
    let contrato = null;
    let contratoError = null;

    logEvent('info', 'contract_upsert_attempt', {
      inscricao_id: inscricao_id,
      numero_contrato: numeroContrato
    });

    const insertResult = await supabase
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

    // Se erro de duplicate key (23505), buscar contrato existente e atualizar
    if (insertResult.error?.code === '23505') {
      logEvent('info', 'duplicate_contract_found', {
        inscricao_id: inscricao_id,
        message: 'Contrato já existe, atualizando com novo HTML'
      });

      const existingResult = await supabase
        .from('contratos')
        .select()
        .eq('inscricao_id', inscricao_id)
        .single();
      
      if (existingResult.data) {
        const updateResult = await supabase
          .from('contratos')
          .update({
            dados_contrato: {
              html: contratoHTML,
              data_geracao: new Date().toISOString(),
              candidato: contratoData.candidato_nome,
              edital: contratoData.edital_titulo,
              template_usado: templateUsado?.nome || 'Template Padrão'
            },
            status: 'pendente_assinatura',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingResult.data.id)
          .select()
          .single();

        contrato = updateResult.data;
        contratoError = updateResult.error;

        logEvent('info', 'contract_updated', {
          contrato_id: contrato?.id,
          numero_contrato: existingResult.data.numero_contrato
        });
      } else {
        contratoError = existingResult.error;
      }
    } else {
      contrato = insertResult.data;
      contratoError = insertResult.error;
    }

    if (contratoError || !contrato) {
      throw new Error(`Erro ao criar/atualizar contrato: ${contratoError?.message}`);
    }

    // ⏱️ Passo 2: Aguardar 2s para garantir persistência do contrato no banco
    logEvent('info', 'waiting_db_commit', {
      contrato_id: contrato.id,
      message: 'Aguardando 2s para garantir commit do contrato no banco'
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));

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
        contrato_id: contrato.id,
        inscricao_id: inscricao_id, // ✅ ADICIONADO: Vínculo direto à inscrição
        workflow_execution_id: null,
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
        step_execution_id: null
      })
      .select()
      .single();

    if (signatureError) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'signature_request_insert_failed',
        error: signatureError.message,
        details: signatureError
      }));
      throw new Error(`Erro ao criar signature request: ${signatureError.message}`);
    }

    if (!signatureRequest) {
      throw new Error('Signature request não foi criado (sem erro retornado)');
    }

    logEvent('info', 'signature_request_created', {
      signature_request_id: signatureRequest.id,
      inscricao_id
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
