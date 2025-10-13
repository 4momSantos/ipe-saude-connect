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
        .eq("status", "ativo")
        .order("emitido_em", { ascending: false })
        .limit(1)
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
      
      // Chamar edge function diretamente com fetch para obter dados binários
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-certificado`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ certificadoId: query.data.id })
        }
      );
      
      if (!response.ok) throw new Error('Erro ao baixar PDF');
      
      // Obter dados binários corretamente
      const blob = await response.blob();
      
      // Verificar se é realmente um PDF
      if (blob.type !== 'application/pdf') {
        throw new Error('Arquivo baixado não é um PDF válido');
      }
      
      // Verificar se tem conteúdo
      if (blob.size === 0) {
        throw new Error('PDF está vazio');
      }
      
      // Forçar download
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
