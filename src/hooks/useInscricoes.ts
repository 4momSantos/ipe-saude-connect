import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Inscricao {
  id: string;
  edital_id: string;
  status: string;
  motivo_rejeicao: string | null;
  is_rascunho: boolean;
  protocolo: string | null;
}

export interface InscricaoData {
  candidato_id: string;
  edital_id: string;
  dados_inscricao: any;
  is_rascunho: boolean;
  status: string;
}

export function useInscricoes() {
  const queryClient = useQueryClient();
  
  // Query: Buscar inscrições do usuário
  const inscricoesQuery = useQuery({
    queryKey: ['inscricoes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('inscricoes_edital')
        .select('id, edital_id, status, motivo_rejeicao, is_rascunho, protocolo')
        .eq('candidato_id', user.id);
      
      if (error) {
        console.error('[useInscricoes] Erro ao buscar inscrições:', error);
        throw error;
      }
      
      console.log('[useInscricoes] Inscrições carregadas:', data?.length || 0);
      return data || [];
    },
    staleTime: 30000, // Cache válido por 30s
    refetchOnWindowFocus: true, // Re-fetch ao focar na janela
  });
  
  // Mutation: Submeter inscrição
  const submitMutation = useMutation({
    mutationFn: async (inscricaoData: InscricaoData) => {
      console.log('[useInscricoes] Submetendo inscrição:', inscricaoData.edital_id);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar rascunho existente
      const { data: rascunhoExistente } = await supabase
        .from('inscricoes_edital')
        .select('id')
        .eq('candidato_id', user.id)
        .eq('edital_id', inscricaoData.edital_id)
        .eq('is_rascunho', true)
        .maybeSingle();

      let result;
      if (rascunhoExistente) {
        // Atualizar rascunho existente
        const { data, error } = await supabase
          .from('inscricoes_edital')
          .update({
            dados_inscricao: inscricaoData.dados_inscricao,
            is_rascunho: false,
            status: inscricaoData.status,
          })
          .eq('id', rascunhoExistente.id)
          .select('id, edital_id, status, motivo_rejeicao, is_rascunho, protocolo')
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Criar nova inscrição
        const { data, error } = await supabase
          .from('inscricoes_edital')
          .insert([inscricaoData])
          .select('id, edital_id, status, motivo_rejeicao, is_rascunho, protocolo')
          .single();
        
        if (error) throw error;
        result = data;
      }
      
      console.log('[useInscricoes] Inscrição submetida com sucesso:', result.id);
      return result;
    },
    onSuccess: (data) => {
      console.log('[useInscricoes] Invalidando cache de inscrições...');
      // ✅ Invalidar cache AUTOMATICAMENTE
      queryClient.invalidateQueries({ queryKey: ['inscricoes'] });
      toast.success('✅ Inscrição enviada com sucesso!');
    },
    onError: (error: any) => {
      console.error('[useInscricoes] Erro ao submeter inscrição:', error);
      toast.error(`Erro ao enviar inscrição: ${error.message}`);
    },
  });
  
  return {
    inscricoes: inscricoesQuery.data || [],
    isLoading: inscricoesQuery.isLoading,
    isError: inscricoesQuery.isError,
    error: inscricoesQuery.error,
    submitInscricao: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
  };
}
