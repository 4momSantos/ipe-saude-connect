import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCredenciadoAtual } from "./useCredenciadoAtual";

export type TipoDocumento = 'certificado_credenciamento' | 'certificado_regularidade' | 'extrato_completo' | 'declaracao_vinculo';

interface DocumentoEmitido {
  id: string;
  tipo_documento: string;
  numero_documento?: string;
  url_documento: string;
  emitido_em: string;
  validade_ate?: string;
  metadata: any;
}

export function useDocumentosCredenciado() {
  const { data: credenciado } = useCredenciadoAtual();

  // Buscar histórico de emissões
  const { data: historico, refetch: refetchHistorico } = useQuery({
    queryKey: ['documentos-emitidos', credenciado?.id],
    queryFn: async () => {
      if (!credenciado?.id) return [];

      const { data, error } = await supabase
        .from('documentos_emitidos')
        .select('*')
        .eq('credenciado_id', credenciado.id)
        .order('emitido_em', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as DocumentoEmitido[];
    },
    enabled: !!credenciado?.id
  });

  // Gerar Extrato Completo
  const gerarExtrato = useMutation({
    mutationFn: async (secoes?: string[]) => {
      if (!credenciado?.id) throw new Error('Credenciado não encontrado');

      const { data, error } = await supabase.functions.invoke(
        'gerar-extrato-credenciado',
        { body: { credenciadoId: credenciado.id, secoes } }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Extrato gerado com sucesso!");
      refetchHistorico();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: Error) => {
      console.error("[EXTRATO] Erro:", error);
      toast.error("Erro ao gerar extrato", {
        description: error.message
      });
    }
  });

  // Gerar Declaração de Vínculo
  const gerarDeclaracao = useMutation({
    mutationFn: async () => {
      if (!credenciado?.id) throw new Error('Credenciado não encontrado');

      const { data, error } = await supabase.functions.invoke(
        'gerar-declaracao-vinculo',
        { body: { credenciadoId: credenciado.id } }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Declaração gerada com sucesso!", {
        description: `Código: ${data.codigo}`
      });
      refetchHistorico();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: Error) => {
      console.error("[DECLARACAO] Erro:", error);
      toast.error("Erro ao gerar declaração", {
        description: error.message
      });
    }
  });

  return {
    historico,
    gerarExtrato,
    gerarDeclaracao,
    refetchHistorico
  };
}
