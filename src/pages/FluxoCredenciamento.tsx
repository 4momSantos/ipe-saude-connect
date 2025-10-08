import { useParams } from "react-router-dom";
import { FluxoCredenciamento } from "@/components/credenciamento/FluxoCredenciamento";
import { useContratos } from "@/hooks/useContratos";
import { useCertificadoPorInscricao } from "@/hooks/useCertificados";
import { useSignatureRequestByWorkflow } from "@/hooks/useSignatureRequest";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function FluxoCredenciamentoPage() {
  const { inscricaoId } = useParams();
  const { contrato, isLoading: loadingContrato } = useContratos(inscricaoId!);
  const { certificado } = useCertificadoPorInscricao(inscricaoId);
  const [workflowExecutionId, setWorkflowExecutionId] = useState<string | null>(null);
  const { data: signatureRequest } = useSignatureRequestByWorkflow(workflowExecutionId || "");
  const [assignafyUrl, setAssignafyUrl] = useState<string | null>(null);

  // Buscar workflow_execution_id da inscrição
  useEffect(() => {
    if (inscricaoId) {
      supabase
        .from("inscricoes_edital")
        .select("workflow_execution_id")
        .eq("id", inscricaoId)
        .single()
        .then(({ data }) => {
          if (data?.workflow_execution_id) {
            setWorkflowExecutionId(data.workflow_execution_id);
          }
        });
    }
  }, [inscricaoId]);

  // Extrair URL de assinatura
  useEffect(() => {
    if (signatureRequest?.metadata) {
      const metadata = signatureRequest.metadata as any;
      const url = metadata.signature_url || 
                  metadata.assinafy_data?.signature_url ||
                  metadata.assinafy_data?.signers?.[0]?.signature_url ||
                  (contrato?.dados_contrato as any)?.assinafy_url;
      setAssignafyUrl(url);
    } else if ((contrato?.dados_contrato as any)?.assinafy_url) {
      setAssignafyUrl((contrato.dados_contrato as any).assinafy_url);
    }
  }, [signatureRequest, contrato]);

  const mapStatus = (contratoStatus?: string) => {
    if (!contratoStatus) return "em_analise";
    switch (contratoStatus) {
      case "pendente_assinatura": return "aguardando_assinatura";
      case "assinado": return certificado ? "ativo" : "assinado";
      case "rejeitado": return "rejeitado";
      default: return "em_analise";
    }
  };

  const handleAssinarContrato = async () => {
    if (assignafyUrl) {
      window.open(assignafyUrl, "_blank");
    } else {
      toast.error("Link de assinatura não disponível no momento. Verifique seu email ou aguarde alguns instantes.");
    }
  };

  if (loadingContrato) {
    return <div className="container mx-auto max-w-7xl p-6"><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="container mx-auto max-w-7xl">
      <FluxoCredenciamento 
        status={mapStatus(contrato?.status)}
        motivoRejeicao={undefined}
        onAssinarContrato={handleAssinarContrato}
      />
    </div>
  );
}
