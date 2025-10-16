import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Dashboard {
  total_prazos: number;
  total_validos: number;
  total_vencendo: number;
  total_vencidos: number;
  criticos: number;
  atencao: number;
  vencem_7_dias: number;
  vencem_15_dias: number;
  vencem_30_dias: number;
  vencidos_30_dias: number;
  vencidos_90_dias: number;
  ultima_atualizacao: string;
}

export interface Prazo {
  id: string;
  entidade_tipo: string;
  entidade_id: string;
  entidade_nome: string;
  credenciado_id: string;
  credenciado_nome: string;
  credenciado_cpf: string;
  data_emissao: string;
  data_vencimento: string;
  data_renovacao: string;
  status_atual: string;
  dias_para_vencer: number;
  nivel_alerta: string;
  cor_status: string;
  notificacoes_enviadas: number;
  ultima_notificacao_em: string;
  proxima_notificacao: string;
  ativo: boolean;
  renovado: boolean;
  renovavel: boolean;
  bloqueio_automatico: boolean;
  observacoes: string;
  criado_em: string;
  atualizado_em: string;
}

export function usePrazos() {
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ['dashboard-vencimentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_dashboard_vencimentos')
        .select('*')
        .single();

      if (error) throw error;
      return data as Dashboard;
    }
  });

  const { data: prazos, isLoading: loadingPrazos } = useQuery({
    queryKey: ['prazos-completos'],
    queryFn: async () => {
      // Buscar todos os documentos com prazos de validade
      const { data: documentos, error } = await supabase
        .from('documentos_credenciados')
        .select(`
          id,
          credenciado_id,
          tipo_documento,
          data_emissao,
          data_vencimento,
          status,
          criado_em,
          atualizado_em,
          credenciados!inner (
            id,
            nome,
            cpf,
            email
          )
        `)
        .in('status', ['ativo', 'validado'])
        .not('data_vencimento', 'is', null)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;

      // Transformar dados para o formato esperado
      const prazosFormatados = documentos?.map(doc => {
        const dataVenc = new Date(doc.data_vencimento);
        const hoje = new Date();
        const diffTime = dataVenc.getTime() - hoje.getTime();
        const diasParaVencer = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let nivelAlerta = 'valido';
        let corStatus = '#10b981'; // verde
        let statusAtual = 'valido';

        if (diasParaVencer < 0) {
          nivelAlerta = 'vencido';
          corStatus = '#ef4444'; // vermelho
          statusAtual = 'vencido';
        } else if (diasParaVencer <= 7) {
          nivelAlerta = 'critico';
          corStatus = '#f97316'; // laranja
          statusAtual = 'vencendo';
        } else if (diasParaVencer <= 30) {
          nivelAlerta = 'atencao';
          corStatus = '#f59e0b'; // amarelo
          statusAtual = 'vencendo';
        }

        return {
          id: doc.id,
          entidade_tipo: 'documento',
          entidade_id: doc.id,
          entidade_nome: doc.tipo_documento,
          credenciado_id: doc.credenciado_id,
          credenciado_nome: doc.credenciados.nome,
          credenciado_cpf: doc.credenciados.cpf,
          data_emissao: doc.data_emissao || '',
          data_vencimento: doc.data_vencimento,
          data_renovacao: '',
          status_atual: statusAtual,
          dias_para_vencer: diasParaVencer,
          nivel_alerta: nivelAlerta,
          cor_status: corStatus,
          notificacoes_enviadas: 0,
          ultima_notificacao_em: '',
          proxima_notificacao: '',
          ativo: true,
          renovado: false,
          renovavel: true,
          bloqueio_automatico: false,
          observacoes: '',
          criado_em: doc.criado_em,
          atualizado_em: doc.atualizado_em
        } as Prazo;
      }) || [];

      return prazosFormatados;
    }
  });

  const atualizarAgora = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('atualizar-prazos-diario');

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Prazos atualizados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['dashboard-vencimentos'] });
      queryClient.invalidateQueries({ queryKey: ['prazos-completos'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar prazos: ' + error.message);
    }
  });

  const renovarPrazo = useMutation({
    mutationFn: async ({ prazoId, novaData, observacao }: { 
      prazoId: string; 
      novaData: string; 
      observacao?: string;
    }) => {
      const { data, error } = await supabase.rpc('renovar_prazo', {
        p_prazo_id: prazoId,
        p_nova_data_vencimento: novaData,
        p_observacao: observacao
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Prazo renovado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['prazos-completos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-vencimentos'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao renovar prazo: ' + error.message);
    }
  });

  return {
    dashboard,
    prazos: prazos || [],
    isLoading: loadingDashboard || loadingPrazos,
    atualizarAgora,
    renovarPrazo
  };
}
