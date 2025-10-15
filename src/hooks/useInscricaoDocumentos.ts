import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InscricaoDocumento {
  id: string;
  inscricao_id: string;
  tipo_documento: string;
  arquivo_url: string;
  arquivo_nome: string;
  arquivo_tamanho: number | null;
  ocr_processado: boolean;
  ocr_resultado: Record<string, any> | null;
  ocr_confidence: number | null;
  status: 'pendente' | 'validado' | 'rejeitado';
  observacoes: string | null;
  uploaded_by: string | null;
  analisado_por: string | null;
  analisado_em: string | null;
  versao: number;
  created_at: string;
  updated_at: string;
}

export function useInscricaoDocumentos(inscricaoId?: string) {
  const queryClient = useQueryClient();

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['inscricao-documentos', inscricaoId],
    queryFn: async () => {
      if (!inscricaoId) return [];

      const { data, error } = await supabase
        .from('inscricao_documentos')
        .select('*')
        .eq('inscricao_id', inscricaoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InscricaoDocumento[];
    },
    enabled: !!inscricaoId,
  });

  const salvarDocumento = useMutation({
    mutationFn: async ({
      inscricaoId,
      tipoDocumento,
      arquivo,
      ocrResultado,
    }: {
      inscricaoId: string;
      tipoDocumento: string;
      arquivo: File;
      ocrResultado: any;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Upload direto para bucket permanente
      const fileName = `${user.id}/${inscricaoId}/${Date.now()}-${arquivo.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('inscricao-documentos')
        .upload(fileName, arquivo, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Salvar registro na tabela com o CAMINHO do arquivo
      const { data, error } = await supabase
        .from('inscricao_documentos')
        .insert({
          inscricao_id: inscricaoId,
          tipo_documento: tipoDocumento,
          arquivo_url: fileName, // Caminho no storage
          arquivo_nome: arquivo.name,
          arquivo_tamanho: arquivo.size,
          ocr_processado: !!ocrResultado,
          ocr_resultado: ocrResultado?.extractedData || null,
          ocr_confidence: ocrResultado?.confidence || null,
          status: ocrResultado?.success ? 'validado' : 'pendente',
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inscricao-documentos'] });
      toast.success('Documento salvo com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao salvar documento:', error);
      toast.error('Erro ao salvar documento: ' + error.message);
    },
  });

  const atualizarStatus = useMutation({
    mutationFn: async ({
      documentoId,
      status,
      observacoes,
      dataValidade,
    }: {
      documentoId: string;
      status: 'validado' | 'rejeitado' | 'pendente';
      observacoes?: string;
      dataValidade?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Se dataValidade foi fornecida manualmente, atualizar OCR
      const updateData: any = {
        status,
        observacoes,
        analisado_por: user.id,
        analisado_em: new Date().toISOString(),
      };

      if (dataValidade) {
        // Buscar documento para mesclar com OCR existente
        const { data: doc } = await supabase
          .from('inscricao_documentos')
          .select('ocr_resultado')
          .eq('id', documentoId)
          .single();

        const ocrAtual = (doc?.ocr_resultado || {}) as Record<string, any>;
        updateData.ocr_resultado = {
          ...ocrAtual,
          dataValidade,
        };
      }

      const { data, error } = await supabase
        .from('inscricao_documentos')
        .update(updateData)
        .eq('id', documentoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inscricao-documentos'] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  return {
    documentos: documentos || [],
    isLoading,
    salvarDocumento,
    atualizarStatus,
  };
}
