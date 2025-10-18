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
      
      // Se aprovado, buscar contrato gerado
      if (decisao.status === 'aprovado' && onAprovado) {
        console.log('🔍 Buscando contrato gerado para inscrição:', inscricaoId);
        
        // Aguardar 1 segundo para garantir que contrato foi criado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: contratoData, error: contratoError } = await supabase
          .from('contratos')
          .select(`
            id,
            numero_contrato,
            documento_url,
            inscricoes_edital (
              profiles (
                nome,
                email
              )
            )
          `)
          .eq('inscricao_id', inscricaoId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (!contratoError && contratoData) {
          const profile = contratoData.inscricoes_edital?.profiles;
          onAprovado({
            id: contratoData.id,
            numero_contrato: contratoData.numero_contrato,
            candidato_nome: profile?.nome || 'Candidato',
            candidato_email: profile?.email || '',
            documento_url: contratoData.documento_url
          });
        } else {
          console.warn('⚠️ Contrato não encontrado ou ainda não foi gerado');
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
