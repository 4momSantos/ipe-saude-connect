import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StatusRegularidade {
  status: 'regular' | 'regular_ressalvas' | 'irregular' | 'suspenso' | 'inativo';
  pendencias: any[];
  detalhes: any;
}

export interface Certificado {
  id: string;
  numero_certificado: string;
  codigo_verificacao: string;
  status: string;
  valido_de: string;
  valido_ate: string;
  emitido_em: string;
  ativo: boolean;
  cancelado: boolean;
  url_pdf?: string;
}

// Hook para calcular status de regularidade
export const useStatusRegularidade = (credenciadoId: string) => {
  return useQuery({
    queryKey: ["status-regularidade", credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('calcular_status_regularidade', { p_credenciado_id: credenciadoId })
        .single();

      if (error) throw error;
      return data as StatusRegularidade;
    },
    enabled: !!credenciadoId,
    refetchInterval: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para emitir certificado
export const useEmitirCertificado = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ credenciadoId, forcarEmissao = false }: { credenciadoId: string; forcarEmissao?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('emitir-certificado-regularidade', {
        body: { credenciadoId, forcarEmissao }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Certificado emitido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["historico-certificados"] });
      queryClient.invalidateQueries({ queryKey: ["status-regularidade"] });
    },
    onError: (error: any) => {
      console.error("[EMITIR_CERT] Erro:", error);
      
      if (error.message?.includes('pode_forcar')) {
        toast.error("Credenciado irregular. Use a opção 'Forçar Emissão'.");
      } else {
        toast.error(error.message || "Erro ao emitir certificado");
      }
    }
  });
};

// Hook para buscar histórico de certificados
export const useHistoricoCertificados = (credenciadoId: string) => {
  return useQuery({
    queryKey: ["historico-certificados", credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificados_regularidade')
        .select('*')
        .eq('credenciado_id', credenciadoId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Certificado[];
    },
    enabled: !!credenciadoId,
  });
};

export interface ConsultaPublicaResult {
  encontrado: boolean;
  status?: string;
  numero_certificado?: string;
  emitido_em?: string;
  valido_ate?: string;
  situacao?: string;
  credenciado?: {
    nome: string;
    tipo: string;
  };
  hash_verificacao?: string;
  certificado_id?: string;
  tem_pdf?: boolean;
}

// Hook para consulta pública
export const useConsultarPublico = () => {
  return useMutation({
    mutationFn: async ({ tipo, valor }: { tipo: 'codigo' | 'numero'; valor: string }): Promise<ConsultaPublicaResult> => {
      const { data, error } = await supabase.functions.invoke('consultar-certificado-publico', {
        body: { tipo, valor }
      });

      if (error) throw error;
      return data;
    },
    onError: (error: any) => {
      console.error("[CONSULTA_PUBLICA] Erro:", error);
      
      if (error.message?.includes('429')) {
        toast.error("Muitas consultas. Aguarde 1 minuto.");
      } else {
        toast.error("Erro ao consultar certificado");
      }
    }
  });
};

// Hook para consulta por credenciado (CPF, CNPJ ou UUID)
export const useConsultarPorCredenciado = () => {
  return useMutation({
    mutationFn: async (identificador: string): Promise<ConsultaPublicaResult> => {
      const { data: resultArray, error } = await supabase
        .rpc('consultar_certificado_por_credenciado', { 
          p_identificador: identificador 
        });

      if (error) throw error;
      
      const data = resultArray?.[0] || null;
      
      if (!data) {
        throw new Error('Certificado não encontrado');
      }
      
      // Garantir que credenciado é um objeto
      const credenciadoData = typeof data.credenciado === 'string' 
        ? JSON.parse(data.credenciado) 
        : data.credenciado;
      
      return {
        ...data,
        credenciado: credenciadoData
      } as ConsultaPublicaResult;
    },
    onError: (error: any) => {
      console.error("[CONSULTA_CREDENCIADO] Erro:", error);
      toast.error("Erro ao consultar certificado do credenciado");
    }
  });
};
