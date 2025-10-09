import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Ocorrencia {
  id: string;
  credenciado_id: string;
  tipo: 'reclamacao' | 'advertencia' | 'elogio' | 'observacao';
  gravidade: 'baixa' | 'media' | 'alta' | 'critica';
  descricao: string;
  data_ocorrencia: string;
  relator_id: string | null;
  protocolo: string;
  status: 'aberta' | 'em_analise' | 'resolvida' | 'arquivada';
  providencias: string | null;
  anexos: any[];
  metadata: any;
  created_at: string;
  updated_at: string;
  relator?: { nome: string };
}

export function useOcorrencias(credenciadoId: string) {
  const queryClient = useQueryClient();

  const { data: ocorrencias, isLoading } = useQuery({
    queryKey: ['ocorrencias', credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ocorrencias_prestadores')
        .select('*')
        .eq('credenciado_id', credenciadoId)
        .order('data_ocorrencia', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const createOcorrenciaMutation = useMutation({
    mutationFn: async (ocorrencia: Partial<Ocorrencia>) => {
      const { data: user } = await supabase.auth.getUser();
      const protocolo = `OC-${new Date().getFullYear()}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;

      const { error } = await supabase
        .from('ocorrencias_prestadores')
        .insert({
          credenciado_id: credenciadoId,
          tipo: ocorrencia.tipo || 'observacao',
          gravidade: ocorrencia.gravidade || 'baixa',
          descricao: ocorrencia.descricao || '',
          data_ocorrencia: ocorrencia.data_ocorrencia || new Date().toISOString().split('T')[0],
          relator_id: user.user?.id || null,
          protocolo,
          providencias: ocorrencia.providencias || null,
          anexos: ocorrencia.anexos || null,
          status: ocorrencia.status || 'aberta'
        });

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('credenciado_historico').insert({
        credenciado_id: credenciadoId,
        tipo: 'ocorrencia',
        descricao: `Ocorrência registrada: ${ocorrencia.tipo} - ${ocorrencia.gravidade}`,
        usuario_responsavel: user.user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias', credenciadoId] });
      toast.success("Ocorrência registrada");
    },
    onError: () => toast.error("Erro ao registrar ocorrência")
  });

  const updateOcorrenciaMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Ocorrencia> }) => {
      const { error } = await supabase
        .from('ocorrencias_prestadores')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias', credenciadoId] });
      toast.success("Ocorrência atualizada");
    },
    onError: () => toast.error("Erro ao atualizar ocorrência")
  });

  return {
    ocorrencias: ocorrencias || [],
    isLoading,
    createOcorrencia: createOcorrenciaMutation.mutate,
    updateOcorrencia: updateOcorrenciaMutation.mutate
  };
}
