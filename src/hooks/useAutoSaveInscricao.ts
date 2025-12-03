import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth(); // ✅ Usar contexto
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [inscricaoId, setInscricaoId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const hasLoadedRef = useRef(false);
  const saveLockRef = useRef(false); // ✅ Lock para prevenir saves simultâneos

  // Salvar rascunho
  const saveRascunho = useCallback(async (silent = false) => {
    if (!enabled || !editalId || saveLockRef.current || !user) return; // ✅ Verificar lock e user

    saveLockRef.current = true; // ✅ Adquirir lock
    setIsSaving(true);
    
    // ✅ TIMEOUT DE SEGURANÇA (10 segundos)
    const timeoutId = setTimeout(() => {
      console.error('❌ Auto-save timeout após 10 segundos');
      saveLockRef.current = false;
      setIsSaving(false);
      if (!silent) {
        toast({
          title: "⚠️ Timeout ao salvar",
          description: "Tente salvar manualmente",
          variant: "destructive",
        });
      }
    }, 10000);

    try {
      // ✅ Usar user do contexto em vez de getUser()

      const rascunhoData = {
        candidato_id: user.id,
        edital_id: editalId,
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
        // Criar ou atualizar rascunho usando UPSERT para evitar duplicação
        const { data, error } = await supabase
          .from('inscricoes_edital')
          .upsert([rascunhoData], { 
            onConflict: 'candidato_id,edital_id',
            ignoreDuplicates: false 
          })
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
      
      clearTimeout(timeoutId); // ✅ Limpar timeout se sucesso
    } catch (error: any) {
      console.error('Erro ao salvar rascunho:', error);
      clearTimeout(timeoutId); // ✅ Limpar timeout se erro
      
      // Tratamento especial para erro de duplicação
      if (error.code === '23505') {
        toast({
          title: "✅ Rascunho já existe",
          description: "Continuando de onde você parou",
          duration: 2000,
        });
        return; // Não lançar erro, apenas continuar
      }
      
      if (!silent) {
        toast({
          title: "Erro ao salvar rascunho",
          description: error.message || "Tente novamente",
          variant: "destructive",
        });
      }
    } finally {
      clearTimeout(timeoutId); // ✅ Garantir limpeza
      saveLockRef.current = false; // ✅ Liberar lock
      setIsSaving(false);
    }
  }, [enabled, editalId, formData, inscricaoId, onSaveSuccess, user]);

  // Carregar rascunho existente
  const loadRascunho = useCallback(async () => {
    if (!enabled || !editalId || hasLoadedRef.current || !user) return null;

    try {
      // ✅ Usar user do contexto

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
  }, [enabled, editalId, user]);

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

  // Carregar inscricaoId no mount
  useEffect(() => {
    if (enabled && editalId && !hasLoadedRef.current) {
      loadRascunho().then((rascunho) => {
        if (rascunho) {
          // inscricaoId já foi setado dentro de loadRascunho
          console.log('✅ Rascunho carregado no mount:', rascunho);
        }
      });
    }
  }, [enabled, editalId, loadRascunho]);

  // Auto-save com debounce de 45s
  useEffect(() => {
    if (!enabled || !formData) return;

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Agendar novo save
    timeoutRef.current = setTimeout(() => {
      saveRascunho(true); // silent = true para não mostrar toast repetidamente
    }, 45000); // ⏱️ 45 segundos (antes era 30s)

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
