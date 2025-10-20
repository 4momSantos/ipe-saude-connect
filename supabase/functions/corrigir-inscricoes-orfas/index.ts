import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CorrecaoResult {
  inscricao_id: string;
  candidato_nome: string;
  edital_numero: string;
  tinha_analise: boolean;
  tinha_credenciado: boolean;
  tinha_contrato: boolean;
  analise_criada: boolean;
  credenciado_criado: boolean;
  contrato_gerado: boolean;
  erro?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Iniciando busca por inscrições órfãs...');

    // 1. Buscar inscrições aprovadas
    const { data: inscricoesAprovadas, error: inscricoesError } = await supabase
      .from('inscricoes_edital')
      .select(`
        id,
        candidato_id,
        edital_id,
        analisado_por,
        analisado_em,
        status,
        dados_inscricao,
        profiles:candidato_id(nome, email),
        editais(numero, nome)
      `)
      .eq('status', 'aprovado')
      .eq('is_rascunho', false);

    if (inscricoesError) {
      console.error('❌ Erro ao buscar inscrições:', inscricoesError);
      throw inscricoesError;
    }

    console.log(`✅ Encontradas ${inscricoesAprovadas?.length || 0} inscrições aprovadas`);

    const results: CorrecaoResult[] = [];

    // 2. Para cada inscrição, verificar se tem análise e credenciado
    for (const inscricao of inscricoesAprovadas || []) {
      console.log(`\n🔍 Verificando inscrição ${inscricao.id}...`);

      // Verificar se tem análise aprovada
      const { data: analise, error: analiseError } = await supabase
        .from('analises')
        .select('id, status')
        .eq('inscricao_id', inscricao.id)
        .eq('status', 'aprovado')
        .maybeSingle();

      // Verificar se tem credenciado
      const { data: credenciado, error: credenciadoError } = await supabase
        .from('credenciados')
        .select('id')
        .eq('inscricao_id', inscricao.id)
        .maybeSingle();

      // Verificar se tem contrato
      const { data: contrato, error: contratoError } = await supabase
        .from('contratos')
        .select('id')
        .eq('inscricao_id', inscricao.id)
        .maybeSingle();

      const temAnalise = !!analise && !analiseError;
      const temCredenciado = !!credenciado && !credenciadoError;
      const temContrato = !!contrato && !contratoError;

      console.log(`  Análise: ${temAnalise ? '✅' : '❌'} | Credenciado: ${temCredenciado ? '✅' : '❌'} | Contrato: ${temContrato ? '✅' : '❌'}`);

      // Se está tudo OK, pular
      if (temAnalise && temCredenciado && temContrato) {
        console.log(`  ✅ Inscrição OK, pulando...`);
        continue;
      }

      // Precisa correção
      const result: CorrecaoResult = {
        inscricao_id: inscricao.id,
        candidato_nome: (inscricao.profiles as any)?.nome || (inscricao.profiles as any)?.email || 'Desconhecido',
        edital_numero: (inscricao.editais as any)?.numero || 'N/A',
        tinha_analise: temAnalise,
        tinha_credenciado: temCredenciado,
        tinha_contrato: temContrato,
        analise_criada: false,
        credenciado_criado: false,
        contrato_gerado: false,
      };

      try {
        // Criar análise se não existir
        if (!temAnalise) {
          console.log(`  📝 Criando análise retroativa...`);
          const { error: createAnaliseError } = await supabase
            .from('analises')
            .insert({
              inscricao_id: inscricao.id,
              analista_id: inscricao.analisado_por,
              status: 'aprovado',
              parecer: 'Análise retroativa criada pelo sistema de correção automática',
              analisado_em: inscricao.analisado_em || new Date().toISOString(),
            });

          if (createAnaliseError) {
            throw new Error(`Erro ao criar análise: ${createAnaliseError.message}`);
          }

          result.analise_criada = true;
          console.log(`  ✅ Análise criada`);
        }

        // Criar credenciado se não existir
        if (!temCredenciado) {
          console.log(`  👤 Criando credenciado...`);
          
          const dadosInscricao = inscricao.dados_inscricao as any;
          const tipoCredenciamento = dadosInscricao?.tipo_credenciamento || 'pf';

          // Montar dados do credenciado
          const credenciadoData: any = {
            inscricao_id: inscricao.id,
            tipo_credenciamento: tipoCredenciamento,
            status: 'ativo',
          };

          // Adicionar campos específicos por tipo
          if (tipoCredenciamento === 'pf') {
            credenciadoData.nome = dadosInscricao?.dados_pessoais?.nome_completo || 
                                   dadosInscricao?.nome_completo || 
                                   (inscricao.profiles as any)?.nome;
            credenciadoData.cpf = dadosInscricao?.dados_pessoais?.cpf || dadosInscricao?.cpf;
            credenciadoData.rg = dadosInscricao?.dados_pessoais?.rg || dadosInscricao?.rg;
            credenciadoData.data_nascimento = dadosInscricao?.dados_pessoais?.data_nascimento;
            credenciadoData.conselho_classe = dadosInscricao?.dados_profissionais?.conselho_classe;
            credenciadoData.numero_conselho = dadosInscricao?.dados_profissionais?.numero_conselho;
            credenciadoData.uf_conselho = dadosInscricao?.dados_profissionais?.uf_conselho;
          } else {
            credenciadoData.razao_social = dadosInscricao?.dados_empresa?.razao_social;
            credenciadoData.nome_fantasia = dadosInscricao?.dados_empresa?.nome_fantasia;
            credenciadoData.cnpj = dadosInscricao?.dados_empresa?.cnpj;
          }

          // Endereço
          if (dadosInscricao?.endereco) {
            credenciadoData.endereco_logradouro = dadosInscricao.endereco.logradouro;
            credenciadoData.endereco_numero = dadosInscricao.endereco.numero;
            credenciadoData.endereco_complemento = dadosInscricao.endereco.complemento;
            credenciadoData.endereco_bairro = dadosInscricao.endereco.bairro;
            credenciadoData.endereco_cidade = dadosInscricao.endereco.cidade;
            credenciadoData.endereco_uf = dadosInscricao.endereco.uf;
            credenciadoData.endereco_cep = dadosInscricao.endereco.cep;
          }

          // Contato
          if (dadosInscricao?.contato) {
            credenciadoData.telefone = dadosInscricao.contato.telefone;
            credenciadoData.email = dadosInscricao.contato.email;
          }

          // Especialidades
          if (dadosInscricao?.dados_profissionais?.especialidades) {
            credenciadoData.especialidades = dadosInscricao.dados_profissionais.especialidades;
          }

          const { error: createCredenciadoError } = await supabase
            .from('credenciados')
            .insert(credenciadoData);

          if (createCredenciadoError) {
            throw new Error(`Erro ao criar credenciado: ${createCredenciadoError.message}`);
          }

          result.credenciado_criado = true;
          console.log(`  ✅ Credenciado criado`);
        }

        // Gerar contrato se não existir
        if (!temContrato) {
          console.log(`  📄 Gerando contrato...`);
          
          const { data: contratoData, error: contratoError } = await supabase.functions.invoke(
            'gerar-contrato-assinatura',
            { body: { inscricao_id: inscricao.id } }
          );

          if (contratoError) {
            throw new Error(`Erro ao gerar contrato: ${contratoError.message}`);
          }

          result.contrato_gerado = true;
          console.log(`  ✅ Contrato gerado`);
        }

        console.log(`✅ Correção completa para ${result.candidato_nome}`);
      } catch (error: any) {
        console.error(`❌ Erro ao corrigir inscrição ${inscricao.id}:`, error);
        result.erro = error.message;
      }

      results.push(result);
    }

    console.log(`\n📊 Resumo da correção:`);
    console.log(`  Total verificado: ${inscricoesAprovadas?.length || 0}`);
    console.log(`  Com problemas: ${results.length}`);
    console.log(`  Corrigidos: ${results.filter(r => !r.erro).length}`);
    console.log(`  Com erro: ${results.filter(r => r.erro).length}`);

    return new Response(
      JSON.stringify(results),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString() 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
