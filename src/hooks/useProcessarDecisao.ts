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

      if (error) throw error;
      
      // ✅ Se aprovado, buscar contrato gerado
      if (decisao.status === 'aprovado' && onAprovado) {
        console.log('🔍 Buscando contrato gerado para inscrição:', inscricaoId);
        
        // ✅ Polling inteligente: buscar com retry (mais eficiente)
        let contratoData = null;
        let attempts = 0;
        const maxAttempts = 10;

        while (!contratoData && attempts < maxAttempts) {
          const { data, error } = await supabase
            .from('contratos')
            .select('id, numero_contrato, documento_url, dados_contrato')
            .eq('inscricao_id', inscricaoId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (!error && data) {
            contratoData = data;
            break;
          }
          
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 300)); // 300ms entre tentativas
        }

        if (contratoData) {
          // ✅ Extrair dados corretos do JSON dados_contrato
          const dadosContrato = contratoData.dados_contrato;
          
          onAprovado({
            id: contratoData.id,
            numero_contrato: contratoData.numero_contrato,
            candidato_nome: dadosContrato?.candidato_nome || 'Candidato',
            candidato_email: dadosContrato?.candidato_email || '',
            documento_url: contratoData.documento_url
          });
        } else {
          console.warn('⚠️ Contrato não encontrado após 10 tentativas (3s total)');
        }
      }
      
      return data;
    },
    onSuccess: (data, variables) => {
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
      console.error('[useProcessarDecisao] Erro:', error);
      toast.error('Erro ao processar decisão', {
        description: error.message
      });
    }
  });
}
