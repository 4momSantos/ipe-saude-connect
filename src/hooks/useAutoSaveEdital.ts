import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UseAutoSaveEditalProps {
  formData: any;
  enabled?: boolean;
  onEditalIdChange?: (id: string) => void;
}

export function useAutoSaveEdital({
  formData,
  enabled = true,
  onEditalIdChange,
}: UseAutoSaveEditalProps) {
  const [editalId, setEditalId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveRascunho = useCallback(
    async (silent = false) => {
      if (!enabled || isSaving) return;

      try {
        setIsSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        // Dados mínimos necessários para rascunho
        const rascunhoData = {
          numero_edital: formData.numero_edital || `RASCUNHO-${Date.now()}`,
          objeto: formData.objeto || "Rascunho em andamento",
          titulo: formData.titulo,
          descricao: formData.descricao,
          data_inicio: formData.data_inicio,
          data_fim: formData.data_fim,
          especialidade: formData.especialidade,
          possui_vagas: formData.possui_vagas,
          vagas: formData.vagas,
          documentos_habilitacao: formData.documentos_habilitacao,
          participacao_permitida: formData.participacao_permitida,
          criterio_julgamento: formData.criterio_julgamento,
          prazo_validade_proposta: formData.prazo_validade_proposta,
          garantia_execucao: formData.garantia_execucao,
          fonte_recursos: formData.fonte_recursos,
          regras_me_epp: formData.regras_me_epp,
          data_licitacao: formData.data_licitacao,
          local_portal: formData.local_portal,
          anexos_administrativos: formData.anexos_administrativos,
          anexos_processo_esperados: formData.anexos_processo_esperados,
          data_publicacao: formData.data_publicacao,
          inscription_template_id: formData.inscription_template_id,
          workflow_id: formData.workflow_id,
          workflow_version: formData.workflow_version,
          use_orchestrator_v2: formData.use_orchestrator_v2,
          status: 'rascunho',
          created_by: user.id,
        };

        let savedId = editalId;

        if (editalId) {
          // Atualizar rascunho existente
          const { error } = await supabase
            .from("editais")
            .update({
              ...rascunhoData,
              updated_at: new Date().toISOString(),
            })
            .eq("id", editalId)
            .eq("status", "rascunho");

          if (error) throw error;
        } else {
          // Criar novo rascunho
          const { data, error } = await supabase
            .from("editais")
            .insert(rascunhoData)
            .select()
            .single();

          if (error) throw error;
          savedId = data.id;
          setEditalId(data.id);
          onEditalIdChange?.(data.id);
        }

        setLastSaved(new Date());

        if (!silent) {
          toast({
            title: "Rascunho salvo",
            description: "Suas alterações foram salvas automaticamente",
          });
        }

        return savedId;
      } catch (error: any) {
        console.error("Erro ao salvar rascunho:", error);
        if (!silent) {
          toast({
            variant: "destructive",
            title: "Erro ao salvar rascunho",
            description: error.message,
          });
        }
      } finally {
        setIsSaving(false);
      }
    },
    [formData, editalId, enabled, isSaving, onEditalIdChange]
  );

  const loadRascunho = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("editais")
        .select("*")
        .eq("created_by", user.id)
        .eq("status", "rascunho")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setEditalId(data.id);
        setLastSaved(new Date(data.updated_at));
      }

      return data;
    } catch (error: any) {
      console.error("Erro ao carregar rascunho:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar rascunho",
        description: error.message,
      });
      return null;
    }
  }, []);

  const deleteRascunho = useCallback(async () => {
    if (!editalId) return;

    try {
      const { error } = await supabase
        .from("editais")
        .delete()
        .eq("id", editalId)
        .eq("status", "rascunho");

      if (error) throw error;

      setEditalId(null);
      setLastSaved(null);
    } catch (error: any) {
      console.error("Erro ao deletar rascunho:", error);
    }
  }, [editalId]);

  // Auto-save com debounce de 30 segundos
  useEffect(() => {
    if (!enabled || !formData.numero_edital) return;

    const timer = setTimeout(() => {
      saveRascunho(true); // Silent save
    }, 30000);

    return () => clearTimeout(timer);
  }, [formData, enabled, saveRascunho]);

  // Save antes de sair da página
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      if (formData.numero_edital) {
        saveRascunho(true);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formData, enabled, saveRascunho]);

  return {
    saveRascunho,
    loadRascunho,
    deleteRascunho,
    lastSaved,
    isSaving,
    editalId,
  };
}
