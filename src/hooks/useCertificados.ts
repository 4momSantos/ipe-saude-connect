import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useCertificados(credenciadoId?: string) {
  const query = useQuery({
    queryKey: ["certificados", credenciadoId],
    queryFn: async () => {
      if (!credenciadoId) return null;

      const { data, error } = await supabase
        .from("certificados")
        .select(`
          *,
          credenciado:credenciados(
            id,
            nome,
            cpf,
            inscricao_id
          )
        `)
        .eq("credenciado_id", credenciadoId)
        .order("emitido_em", { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!credenciadoId
  });

  const download = async () => {
    if (!query.data?.id || !query.data?.documento_url) {
      toast({
        title: "Erro",
        description: "Documento não disponível",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Baixando certificado...",
        description: "Aguarde, isso pode levar alguns segundos"
      });
      
      // Usar edge function de proxy para contornar bloqueios de browser
      const { data, error } = await supabase.functions.invoke('download-certificado', {
        body: { certificadoId: query.data.id }
      });
      
      if (error) throw error;
      
      // Criar blob e forçar download
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${query.data.numero_certificado}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download concluído",
        description: "Certificado baixado com sucesso"
      });
    } catch (error) {
      console.error('Erro no download:', error);
      toast({
        title: "Erro ao baixar",
        description: "Não foi possível baixar o certificado. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return {
    certificado: query.data,
    download,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  };
}

export function useCertificadoPorInscricao(inscricaoId?: string) {
  const query = useQuery({
    queryKey: ["certificados", "inscricao", inscricaoId],
    queryFn: async () => {
      if (!inscricaoId) return null;

      const { data, error } = await supabase
        .from("certificados")
        .select(`
          *,
          credenciado:credenciados!inner(
            id,
            nome,
            cpf,
            inscricao_id
          )
        `)
        .eq("credenciado.inscricao_id", inscricaoId)
        .order("emitido_em", { ascending: false })
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error; // Ignora "not found"
      return data;
    },
    enabled: !!inscricaoId
  });

  return {
    certificado: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error
  };
}
