import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Decisao } from "@/types/decisao";

interface ProcessarDecisaoParams {
  inscricaoId: string;
  analiseId: string;
  decisao: Decisao;
  onAprovado?: (contratoData: {
    id: string;
    numero_contrato: string;
    candidato_nome: string;
    candidato_email: string;
    documento_url?: string;
  }) => void;
}

export function useProcessarDecisao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inscricaoId, analiseId, decisao, onAprovado }: ProcessarDecisaoParams) => {
      console.log('🚀 [PROCESSAR_DECISAO] Enviando requisição:', {
        inscricaoId,
        analiseId,
        status: decisao.status,
        temCallback: !!onAprovado
      });

      const { data, error } = await supabase.functions.invoke('processar-decisao', {
        body: {
          inscricao_id: inscricaoId,
          analise_id: analiseId,
          decisao: {
            ...decisao,
            prazo_correcao: decisao.prazo_correcao?.toISOString()
          }
        }
      });

      console.log('📡 [PROCESSAR_DECISAO] Resposta recebida:', {
        sucesso: !error,
        temDados: !!data
      });

      if (error) {
        console.error('❌ [PROCESSAR_DECISAO] Erro na edge function:', error);
        throw error;
      }
      
      // ✅ Se aprovado, buscar contrato gerado
      if (decisao.status === 'aprovado' && onAprovado) {
        console.log('🔍 [POLLING_CONTRATO] Iniciando polling (max 30 segundos):', {
          inscricaoId,
          maxAttempts: 10,
          intervalMs: 3000
        });
        
        // ✅ Toast de progresso
        toast.loading('Gerando contrato de credenciamento...', {
          id: 'polling-contrato',
          description: 'Aguarde enquanto o contrato é preparado (até 30s)'
        });
        
        // ✅ Polling inteligente: buscar com retry (mais eficiente)
        let contratoData = null;
        let attempts = 0;
        const maxAttempts = 10;

        while (!contratoData && attempts < maxAttempts) {
          attempts++;
          console.log(`🔄 [POLLING_CONTRATO] Tentativa ${attempts}/${maxAttempts} (${attempts * 3}s decorridos)`);
          
          const { data: contratoResult, error: contratoError } = await supabase
            .from('contratos')
            .select('id, numero_contrato, documento_url, dados_contrato')
            .eq('inscricao_id', inscricaoId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (contratoError) {
            console.error('❌ [POLLING_CONTRATO] Erro ao buscar:', contratoError);
          }
          
          if (!contratoError && contratoResult) {
            console.log('✅ [POLLING_CONTRATO] Contrato encontrado!', {
              id: contratoResult.id,
              numero: contratoResult.numero_contrato,
              temDocumento: !!contratoResult.documento_url,
              tentativaAtual: attempts,
              tempoDecorrido: `${attempts * 3}s`
            });
            contratoData = contratoResult;
            break;
          }
          
          if (attempts < maxAttempts) {
            console.log(`⏳ [POLLING_CONTRATO] Aguardando 3s antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 segundos entre tentativas
          }
        }

        if (contratoData) {
          // ✅ Feedback de sucesso
          toast.success('Contrato gerado com sucesso!', {
            id: 'polling-contrato',
            description: `Número: ${contratoData.numero_contrato}`
          });
          
          // ✅ Extrair dados corretos do JSON dados_contrato
          const dadosContrato = contratoData.dados_contrato;
          
          console.log('🎉 [POLLING_CONTRATO] Executando callback onAprovado:', {
            contratoId: contratoData.id,
            numero: contratoData.numero_contrato
          });
          
          onAprovado({
            id: contratoData.id,
            numero_contrato: contratoData.numero_contrato,
            candidato_nome: dadosContrato?.candidato_nome || 'Candidato',
            candidato_email: dadosContrato?.candidato_email || '',
            documento_url: contratoData.documento_url
          });
        } else {
          console.error('❌ [POLLING_CONTRATO] Timeout: Contrato não encontrado após 10 tentativas (30s total)');
          
          toast.error('Contrato não foi gerado a tempo', {
            id: 'polling-contrato',
            description: 'Aguarde mais alguns segundos e recarregue a página',
            duration: 6000
          });
        }
      } else if (decisao.status === 'aprovado' && !onAprovado) {
        console.warn('⚠️ [PROCESSAR_DECISAO] Status aprovado mas callback onAprovado não foi fornecido!');
      }
      
      return data;
    },
    onSuccess: (data, variables) => {
      console.log('✅ [PROCESSAR_DECISAO] onSuccess executado:', {
        status: variables.decisao.status,
        inscricaoId: variables.inscricaoId
      });
      
      const statusLabel = variables.decisao.status === 'aprovado' ? 'aprovada' :
                          variables.decisao.status === 'reprovado' ? 'reprovada' :
                          'correção solicitada';
      
      toast.success(`Decisão Registrada`, {
        description: `Inscrição ${statusLabel} com sucesso`
      });

      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['inscricao', variables.inscricaoId] });
      queryClient.invalidateQueries({ queryKey: ['analises'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-messages', variables.inscricaoId] });
      queryClient.invalidateQueries({ queryKey: ['historico-decisoes', variables.inscricaoId] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
    onError: (error: Error) => {
      console.error('❌ [useProcessarDecisao] Erro completo:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      toast.error('Erro ao processar decisão', {
        description: error.message || 'Erro desconhecido. Verifique o console.'
      });
    }
  });
}
