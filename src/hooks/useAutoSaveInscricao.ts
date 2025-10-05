import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UseAutoSaveInscricaoProps {
  editalId: string;
  formData: any;
  enabled: boolean;
  onSaveSuccess?: (inscricaoId: string) => void;
}

export function useAutoSaveInscricao({
  editalId,
  formData,
  enabled,
  onSaveSuccess
}: UseAutoSaveInscricaoProps) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [inscricaoId, setInscricaoId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const hasLoadedRef = useRef(false);

  // Salvar rascunho
  const saveRascunho = useCallback(async (silent = false) => {
    if (!enabled || !editalId) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const rascunhoData = {
        candidato_id: user.id,
        edital_id: editalId,
        status: 'rascunho' as const,
        is_rascunho: true,
        dados_inscricao: formData
      };

      if (inscricaoId) {
        // Atualizar rascunho existente
        const { error } = await supabase
          .from('inscricoes_edital')
          .update({
            dados_inscricao: formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', inscricaoId);

        if (error) throw error;
      } else {
        // Criar novo rascunho
        const { data, error } = await supabase
          .from('inscricoes_edital')
          .insert([rascunhoData])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setInscricaoId(data.id);
          onSaveSuccess?.(data.id);
        }
      }

      setLastSaved(new Date());
      if (!silent) {
        toast({
          title: "💾 Rascunho salvo",
          description: "Suas informações foram salvas automaticamente",
          duration: 2000,
        });
      }
    } catch (error: any) {
      console.error('Erro ao salvar rascunho:', error);
      if (!silent) {
        toast({
          title: "Erro ao salvar rascunho",
          description: error.message || "Tente novamente",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [enabled, editalId, formData, inscricaoId, onSaveSuccess]);

  // Carregar rascunho existente
  const loadRascunho = useCallback(async () => {
    if (!enabled || !editalId || hasLoadedRef.current) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('inscricoes_edital')
        .select('*')
        .eq('candidato_id', user.id)
        .eq('edital_id', editalId)
        .eq('is_rascunho', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setInscricaoId(data.id);
        setLastSaved(new Date(data.updated_at));
        hasLoadedRef.current = true;
        return data.dados_inscricao;
      }

      return null;
    } catch (error: any) {
      console.error('Erro ao carregar rascunho:', error);
      return null;
    }
  }, [enabled, editalId]);

  // Deletar rascunho
  const deleteRascunho = useCallback(async () => {
    if (!inscricaoId) return;

    try {
      const { error } = await supabase
        .from('inscricoes_edital')
        .delete()
        .eq('id', inscricaoId);

      if (error) throw error;

      setInscricaoId(null);
      setLastSaved(null);
      hasLoadedRef.current = false;
    } catch (error: any) {
      console.error('Erro ao deletar rascunho:', error);
      throw error;
    }
  }, [inscricaoId]);

  // Auto-save com debounce de 30s
  useEffect(() => {
    if (!enabled || !formData) return;

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Agendar novo save
    timeoutRef.current = setTimeout(() => {
      saveRascunho(true); // silent = true para não mostrar toast repetidamente
    }, 30000); // 30 segundos

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formData, enabled, saveRascunho]);

  // Salvar antes de sair da página
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      if (formData) {
        saveRascunho(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, formData, saveRascunho]);

  return {
    saveRascunho,
    loadRascunho,
    deleteRascunho,
    lastSaved,
    isSaving,
    inscricaoId
  };
}
