import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Afastamento {
  id: string;
  credenciado_id: string;
  tipo: 'licenca' | 'ferias' | 'afastamento';
  data_inicio: string;
  data_fim?: string;
  motivo?: string;
  justificativa: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  analisado_por?: string;
  analisado_em?: string;
  observacoes_analise?: string;
  documentos_anexos?: any[];
  created_at: string;
}

export function useAfastamentos(credenciadoId?: string) {
  const queryClient = useQueryClient();

  const { data: afastamentos, isLoading } = useQuery({
    queryKey: ['afastamentos', credenciadoId],
    queryFn: async () => {
      if (!credenciadoId) return [];

      const { data, error } = await supabase
        .from('afastamentos_credenciados')
        .select('*')
        .eq('credenciado_id', credenciadoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Afastamento[];
    },
    enabled: !!credenciadoId
  });

  const registrarAfastamento = useMutation({
    mutationFn: async (afastamento: {
      tipo: 'licenca' | 'ferias' | 'afastamento';
      data_inicio: string;
      data_fim?: string;
      motivo?: string;
      justificativa: string;
      documentos_anexos?: any[];
    }) => {
      if (!credenciadoId) throw new Error('Credenciado não encontrado');

      const { data, error } = await supabase
        .from('afastamentos_credenciados')
        .insert({
          credenciado_id: credenciadoId,
          ...afastamento,
          status: 'pendente'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Afastamento registrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['afastamentos', credenciadoId] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao registrar afastamento', { description: error.message });
    }
  });

  return {
    afastamentos,
    isLoading,
    registrarAfastamento
  };
}
