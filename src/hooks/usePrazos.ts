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

export interface DocumentoPrazo {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  data_emissao: string;
  data_vencimento: string;
  arquivo_nome: string;
  url_arquivo: string;
  status: string;
  dias_para_vencer: number | null;
  criado_em: string;
  atualizado_em: string;
}

// Interface legada para compatibilidade
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
  criado_em: string;
  atualizado_em: string;
}

export interface CredenciadoPrazos {
  // Nova estrutura
  credenciado: {
    id: string;
    nome: string;
    cpf: string | null;
    cnpj: string | null;
    email: string | null;
    numero_credenciado: string | null;
  };
  estatisticas: {
    total: number;
    ativos: number;
    vencidos: number;
    vencendo: number;
    proximoVencimento: string | null;
  };
  documentos: DocumentoPrazo[];
  
  // Propriedades legadas para compatibilidade
  credenciado_id: string;
  credenciado_nome: string;
  credenciado_cpf: string;
  credenciado_numero: string;
  total_documentos: number;
  documentos_validos: number;
  documentos_vencendo: number;
  documentos_vencidos: number;
  documentos_criticos: number;
  prazos: Prazo[];
}

interface UsePrazosOptions {
  mostrarTodos?: boolean;
}

export function usePrazos(options: UsePrazosOptions = {}) {
  const queryClient = useQueryClient();
  const { mostrarTodos = false } = options;

  const { data: dashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ['dashboard-vencimentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_dashboard_vencimentos')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data as Dashboard | null;
    }
  });

  const { data: prazosAgrupados, isLoading: loadingPrazos } = useQuery({
    queryKey: ['prazos-agrupados', mostrarTodos],
    queryFn: async () => {
      console.log(`🔍 [PRAZOS] Modo: ${mostrarTodos ? 'TODOS' : 'ALERTAS'}`);

      if (mostrarTodos) {
        // ✅ MODO TODOS: Usar função SQL com LEFT JOIN
        const { data, error } = await supabase.rpc('buscar_credenciados_com_documentos', {
          p_termo_busca: null,
          p_tipo_documento: null,
          p_status: 'Ativo',
          p_apenas_com_documentos: false,
          p_apenas_vencidos: false,
          p_limite: 1000,
          p_offset: 0
        });

        if (error) {
          console.error('❌ [PRAZOS] Erro RPC:', error);
          throw error;
        }

        console.log(`✅ [PRAZOS] ${data?.length || 0} credenciados encontrados via RPC`);

        return (data || []).map((item: any) => {
          const documentos: DocumentoPrazo[] = item.documentos || [];
          const documentosCriticos = documentos.filter(d => d.dias_para_vencer !== null && d.dias_para_vencer >= 0 && d.dias_para_vencer <= 7).length;
          
          // Converter documentos para formato Prazo legado
          const prazos: Prazo[] = documentos.map(doc => {
            const diasParaVencer = doc.dias_para_vencer || 0;
            let nivelAlerta = 'valido';
            let corStatus = '#10b981';
            let statusAtual = 'valido';
            
            if (diasParaVencer < 0) {
              nivelAlerta = 'vencido';
              corStatus = '#ef4444';
              statusAtual = 'vencido';
            } else if (diasParaVencer <= 7) {
              nivelAlerta = 'critico';
              corStatus = '#f97316';
              statusAtual = 'vencendo';
            } else if (diasParaVencer <= 30) {
              nivelAlerta = 'atencao';
              corStatus = '#f59e0b';
              statusAtual = 'vencendo';
            }
            
            return {
              id: doc.id,
              entidade_tipo: 'documento_credenciado',
              entidade_id: doc.id,
              entidade_nome: doc.tipo_documento,
              credenciado_id: item.credenciado_id,
              credenciado_nome: item.credenciado_nome,
              credenciado_cpf: item.credenciado_cpf || '',
              data_emissao: doc.data_emissao || '',
              data_vencimento: doc.data_vencimento,
              data_renovacao: '',
              status_atual: statusAtual,
              dias_para_vencer: diasParaVencer,
              nivel_alerta: nivelAlerta,
              cor_status: corStatus,
              criado_em: doc.criado_em,
              atualizado_em: doc.atualizado_em,
            };
          });
          
          return {
            credenciado: {
              id: item.credenciado_id,
              nome: item.credenciado_nome,
              cpf: item.credenciado_cpf,
              cnpj: item.credenciado_cnpj,
              email: item.credenciado_email,
              numero_credenciado: item.credenciado_numero,
            },
            estatisticas: {
              total: item.total_documentos || 0,
              ativos: item.documentos_ativos || 0,
              vencidos: item.documentos_vencidos || 0,
              vencendo: item.documentos_vencendo || 0,
              proximoVencimento: item.proximo_vencimento,
            },
            documentos,
            // Propriedades legadas
            credenciado_id: item.credenciado_id,
            credenciado_nome: item.credenciado_nome,
            credenciado_cpf: item.credenciado_cpf || '',
            credenciado_numero: item.credenciado_numero || 'N/A',
            total_documentos: item.total_documentos || 0,
            documentos_validos: item.documentos_ativos || 0,
            documentos_vencendo: item.documentos_vencendo || 0,
            documentos_vencidos: item.documentos_vencidos || 0,
            documentos_criticos: documentosCriticos,
            prazos,
          };
        }) as CredenciadoPrazos[];
      } else {
        // ✅ MODO ALERTAS: Query direta (rápida para dashboard)
        const { data: documentos, error } = await supabase
          .from('documentos_credenciados')
          .select(`
            id,
            credenciado_id,
            tipo_documento,
            numero_documento,
            data_emissao,
            data_vencimento,
            status,
            arquivo_nome,
            url_arquivo,
            criado_em,
            atualizado_em,
            credenciados!inner (
              id,
              nome,
              cpf,
              email,
              numero_credenciado
            )
          `)
          .in('status', ['ativo', 'validado'])
          .not('data_vencimento', 'is', null)
          .order('data_vencimento', { ascending: true });

        if (error) {
          console.error('❌ [PRAZOS] Erro query direta:', error);
          throw error;
        }

        console.log(`✅ [PRAZOS] ${documentos?.length || 0} documentos com vencimento`);

        // Agrupar por credenciado
        const agrupamento = new Map<string, any>();

        documentos?.forEach((doc: any) => {
          const credId = doc.credenciado_id;
          
          if (!agrupamento.has(credId)) {
            agrupamento.set(credId, {
              credenciado: {
                id: doc.credenciados.id,
                nome: doc.credenciados.nome,
                cpf: doc.credenciados.cpf,
                cnpj: null,
                email: doc.credenciados.email,
                numero_credenciado: doc.credenciados.numero_credenciado,
              },
              estatisticas: {
                total: 0,
                ativos: 0,
                vencidos: 0,
                vencendo: 0,
                criticos: 0,
                proximoVencimento: null,
              },
              documentos: [],
              prazos: [],
            });
          }

          const item = agrupamento.get(credId)!;
          
          // Calcular dias para vencer
          const diasParaVencer = Math.ceil(
            (new Date(doc.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );

          let nivelAlerta = 'valido';
          let corStatus = '#10b981';
          let statusAtual = 'valido';
          
          if (diasParaVencer < 0) {
            nivelAlerta = 'vencido';
            corStatus = '#ef4444';
            statusAtual = 'vencido';
          } else if (diasParaVencer <= 7) {
            nivelAlerta = 'critico';
            corStatus = '#f97316';
            statusAtual = 'vencendo';
          } else if (diasParaVencer <= 30) {
            nivelAlerta = 'atencao';
            corStatus = '#f59e0b';
            statusAtual = 'vencendo';
          }

          // Adicionar documento
          item.documentos.push({
            id: doc.id,
            tipo_documento: doc.tipo_documento,
            numero_documento: doc.numero_documento,
            data_emissao: doc.data_emissao,
            data_vencimento: doc.data_vencimento,
            arquivo_nome: doc.arquivo_nome,
            url_arquivo: doc.url_arquivo,
            status: doc.status,
            dias_para_vencer: diasParaVencer,
            criado_em: doc.criado_em,
            atualizado_em: doc.atualizado_em,
          });

          // Adicionar prazo (formato legado)
          item.prazos.push({
            id: doc.id,
            entidade_tipo: 'documento_credenciado',
            entidade_id: doc.id,
            entidade_nome: doc.tipo_documento,
            credenciado_id: doc.credenciado_id,
            credenciado_nome: doc.credenciados.nome,
            credenciado_cpf: doc.credenciados.cpf || '',
            data_emissao: doc.data_emissao || '',
            data_vencimento: doc.data_vencimento,
            data_renovacao: '',
            status_atual: statusAtual,
            dias_para_vencer: diasParaVencer,
            nivel_alerta: nivelAlerta,
            cor_status: corStatus,
            criado_em: doc.criado_em,
            atualizado_em: doc.atualizado_em,
          });

          // Atualizar estatísticas
          item.estatisticas.total++;
          if (doc.status === 'ativo' || doc.status === 'validado') {
            item.estatisticas.ativos++;
          }
          if (diasParaVencer < 0) {
            item.estatisticas.vencidos++;
          }
          if (diasParaVencer >= 0 && diasParaVencer <= 30) {
            item.estatisticas.vencendo++;
          }
          if (diasParaVencer >= 0 && diasParaVencer <= 7) {
            item.estatisticas.criticos++;
          }
          
          if (!item.estatisticas.proximoVencimento || doc.data_vencimento < item.estatisticas.proximoVencimento) {
            item.estatisticas.proximoVencimento = doc.data_vencimento;
          }
        });

        // Converter para formato final com propriedades legadas
        return Array.from(agrupamento.values()).map(item => ({
          ...item,
          credenciado_id: item.credenciado.id,
          credenciado_nome: item.credenciado.nome,
          credenciado_cpf: item.credenciado.cpf || '',
          credenciado_numero: item.credenciado.numero_credenciado || 'N/A',
          total_documentos: item.estatisticas.total,
          documentos_validos: item.estatisticas.ativos,
          documentos_vencendo: item.estatisticas.vencendo,
          documentos_vencidos: item.estatisticas.vencidos,
          documentos_criticos: item.estatisticas.criticos,
        })) as CredenciadoPrazos[];
      }
    },
    staleTime: 60000,
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
      queryClient.invalidateQueries({ queryKey: ['prazos-agrupados'] });
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
      queryClient.invalidateQueries({ queryKey: ['prazos-agrupados'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-vencimentos'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao renovar prazo: ' + error.message);
    }
  });

  return {
    dashboard,
    prazosAgrupados: prazosAgrupados || [],
    isLoading: loadingDashboard || loadingPrazos,
    atualizarAgora,
    renovarPrazo
  };
}
