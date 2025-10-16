import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DocumentoCredenciado {
  id: string;
  credenciado_id: string;
  tipo_documento: string;
  descricao?: string;
  numero_documento?: string;
  url_arquivo?: string;
  arquivo_nome?: string;
  data_emissao?: string;
  data_vencimento?: string;
  status: 'ativo' | 'vencendo' | 'vencido' | 'em_renovacao' | 'invalido';
  observacao?: string;
  criado_em: string;
  atualizado_em: string;
}

export function useDocumentosCredenciado(credenciadoId?: string) {
  const queryClient = useQueryClient();

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['documentos-credenciado', credenciadoId],
    queryFn: async () => {
      if (!credenciadoId) return [];

      const { data, error } = await supabase
        .from('documentos_credenciados')
        .select('*')
        .eq('credenciado_id', credenciadoId)
        .eq('is_current', true)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      return data as DocumentoCredenciado[];
    },
    enabled: !!credenciadoId
  });

  const uploadDocumento = useMutation({
    mutationFn: async ({ 
      file, 
      tipoDocumento, 
      dataEmissao, 
      dataVencimento,
      numeroDocumento 
    }: {
      file: File;
      tipoDocumento: string;
      dataEmissao?: Date;
      dataVencimento?: Date;
      numeroDocumento?: string;
    }) => {
      if (!credenciadoId) throw new Error('Credenciado não encontrado');

      const fileName = `${credenciadoId}/${tipoDocumento}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documentos-credenciados')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documentos-credenciados')
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('documentos_credenciados')
        .insert({
          credenciado_id: credenciadoId,
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento,
          arquivo_nome: file.name,
          arquivo_tamanho: file.size,
          storage_path: fileName,
          url_arquivo: publicUrl,
          data_emissao: dataEmissao?.toISOString().split('T')[0],
          data_vencimento: dataVencimento?.toISOString().split('T')[0],
          status: 'ativo'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Documento enviado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['documentos-credenciado', credenciadoId] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar documento', { description: error.message });
    }
  });

  return {
    documentos,
    isLoading,
    uploadDocumento
  };
}
