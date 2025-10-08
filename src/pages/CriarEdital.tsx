import { useState, useEffect } from "react";
import { EditalWizard } from "@/components/edital/EditalWizard";
import { RoleGuard } from "@/components/RoleGuard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CriarEdital() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [existingDraft, setExistingDraft] = useState<any>(null);
  const [draftToLoad, setDraftToLoad] = useState<any>(null);

  useEffect(() => {
    checkForExistingDraft();
  }, []);

  const checkForExistingDraft = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

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
        setExistingDraft(data);
        setShowRecoveryDialog(true);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Erro ao verificar rascunho:", error);
      setIsLoading(false);
    }
  };

  const handleContinueDraft = () => {
    setDraftToLoad(existingDraft);
    setShowRecoveryDialog(false);
  };

  const handleStartNew = async () => {
    try {
      if (existingDraft?.id) {
        const { error } = await supabase
          .from("editais")
          .delete()
          .eq("id", existingDraft.id);

        if (error) throw error;
      }
      setExistingDraft(null);
      setShowRecoveryDialog(false);
    } catch (error) {
      console.error("Erro ao deletar rascunho:", error);
    }
  };

  const handleCancel = () => {
    navigate("/editais");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando rascunhos...</p>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard requiredRoles={["gestor", "admin"]}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <EditalWizard initialData={draftToLoad} editalId={draftToLoad?.id} />
      </div>

      <AlertDialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rascunho encontrado</AlertDialogTitle>
            <AlertDialogDescription>
              Encontramos um rascunho de edital não finalizado.
              {existingDraft?.updated_at && (
                <div className="mt-2 text-sm">
                  <strong>Última modificação:</strong>{" "}
                  {formatDistanceToNow(new Date(existingDraft.updated_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </div>
              )}
              {existingDraft?.numero_edital && (
                <div className="mt-1 text-sm">
                  <strong>Número:</strong> {existingDraft.numero_edital}
                </div>
              )}
              {existingDraft?.objeto && (
                <div className="mt-1 text-sm">
                  <strong>Objeto:</strong> {existingDraft.objeto}
                </div>
              )}
              <div className="mt-4">
                Deseja continuar de onde parou ou começar um novo edital?
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleCancel}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogCancel
              onClick={handleStartNew}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              🗑️ Começar novo
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleContinueDraft}>
              ✅ Continuar de onde parei
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleGuard>
  );
}
