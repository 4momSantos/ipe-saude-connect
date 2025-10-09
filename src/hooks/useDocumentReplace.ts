import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useDocumentReplace(inscricaoId: string) {
  const queryClient = useQueryClient();

  const replaceDocumentMutation = useMutation({
    mutationFn: async ({ 
      currentDocId, 
      newFile,
      tipo_documento 
    }: { 
      currentDocId: string; 
      newFile: File;
      tipo_documento: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      // 1. Buscar documento atual
      const { data: currentDoc } = await supabase
        .from('inscricao_documentos')
        .select('*')
        .eq('id', currentDocId)
        .single();

      if (!currentDoc) throw new Error('Documento não encontrado');

      // 2. Marcar documento atual como substituído
      await supabase
        .from('inscricao_documentos')
        .update({
          is_current: false,
          replaced_at: new Date().toISOString(),
          replaced_by: user.user?.id
        })
        .eq('id', currentDocId);

      // 3. Upload do novo arquivo
      const fileName = `${inscricaoId}/${Date.now()}_${newFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('inscricao-documentos')
        .upload(fileName, newFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('inscricao-documentos')
        .getPublicUrl(fileName);

      // 4. Criar novo documento
      await supabase
        .from('inscricao_documentos')
        .insert({
          inscricao_id: inscricaoId,
          tipo_documento,
          arquivo_nome: newFile.name,
          arquivo_url: publicUrl,
          arquivo_tamanho: newFile.size,
          versao: (currentDoc.versao || 1) + 1,
          parent_document_id: currentDocId,
          is_current: true,
          uploaded_by: user.user?.id,
          status: 'pendente'
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inscricao-documentos', inscricaoId] });
      toast.success("Nova versão do documento enviada");
    },
    onError: () => toast.error("Erro ao substituir documento")
  });

  return {
    replaceDocument: replaceDocumentMutation.mutate,
    isReplacing: replaceDocumentMutation.isPending
  };
}
