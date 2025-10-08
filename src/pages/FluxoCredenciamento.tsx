import { useParams } from "react-router-dom";
import { FluxoCredenciamento } from "@/components/credenciamento/FluxoCredenciamento";
import { useContratos } from "@/hooks/useContratos";
import { useCertificadoPorInscricao } from "@/hooks/useCertificados";
import { Skeleton } from "@/components/ui/skeleton";

export default function FluxoCredenciamentoPage() {
  const { inscricaoId } = useParams();
  const { contrato, isLoading: loadingContrato } = useContratos(inscricaoId!);
  const { certificado } = useCertificadoPorInscricao(inscricaoId);

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
    if ((contrato?.dados_contrato as any)?.assinafy_url) {
      window.open((contrato.dados_contrato as any).assinafy_url, "_blank");
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
