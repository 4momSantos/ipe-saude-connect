import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    if (!query.data?.documento_url) return;
    
    // Se tiver URL do Storage do Supabase
    if (query.data.documento_url.includes("supabase")) {
      window.open(query.data.documento_url, "_blank");
    } else {
      // Criar link temporário para download
      const link = document.createElement("a");
      link.href = query.data.documento_url;
      link.download = `certificado-${query.data.numero_certificado}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
