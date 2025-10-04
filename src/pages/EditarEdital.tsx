import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EditalWizard } from "@/components/edital/EditalWizard";
import { RoleGuard } from "@/components/RoleGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function EditarEdital() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [editalData, setEditalData] = useState<any>(null);

  useEffect(() => {
    if (!id) {
      toast.error("ID do edital não encontrado");
      navigate("/editais");
      return;
    }

    loadEdital();
  }, [id]);

  const loadEdital = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("editais")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error("Edital não encontrado");
        navigate("/editais");
        return;
      }

      // Transformar os dados do banco para o formato do formulário
      const formData = {
        numero_edital: data.numero_edital || "",
        objeto: data.objeto || "",
        descricao: data.descricao || "",
        data_publicacao: data.data_publicacao ? new Date(data.data_publicacao) : undefined,
        data_licitacao: data.data_licitacao ? new Date(data.data_licitacao) : undefined,
        local_portal: data.local_portal || "",
        prazo_validade_proposta: data.prazo_validade_proposta || 30,
        criterio_julgamento: data.criterio_julgamento || "",
        garantia_execucao: data.garantia_execucao || 0,
        fonte_recursos: data.fonte_recursos || "",
        possui_vagas: data.possui_vagas || false,
        vagas: data.vagas || undefined,
        participacao_permitida: Array.isArray(data.participacao_permitida) ? data.participacao_permitida : [],
        regras_me_epp: data.regras_me_epp || "",
        documentos_habilitacao: Array.isArray(data.documentos_habilitacao) ? data.documentos_habilitacao : [],
        anexos: data.anexos || {},
        status: data.status || "rascunho",
        workflow_id: data.workflow_id || null,
        workflow_version: data.workflow_version || undefined,
        gestor_autorizador_id: data.gestor_autorizador_id || undefined,
        observacoes_autorizacao: data.observacoes_autorizacao || undefined,
      };

      setEditalData(formData);
    } catch (error) {
      console.error("Erro ao carregar edital:", error);
      toast.error("Erro ao carregar edital");
      navigate("/editais");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <RoleGuard requiredRoles={["gestor", "admin"]}>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando edital...</div>
        </div>
      </RoleGuard>
    );
  }

  if (!editalData) {
    return null;
  }

  return (
    <RoleGuard requiredRoles={["gestor", "admin"]}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <EditalWizard editalId={id} initialData={editalData} />
      </div>
    </RoleGuard>
  );
}
