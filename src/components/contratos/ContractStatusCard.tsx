import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContratos } from "@/hooks/useContratos";
import { FileText, Download, ExternalLink, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ContractStatusCardProps {
  inscricaoId: string;
}

export function ContractStatusCard({ inscricaoId }: ContractStatusCardProps) {
  const { contrato, status, isLoading } = useContratos(inscricaoId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!contrato) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum contrato gerado para esta inscrição.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    switch (status) {
      case "pendente_assinatura":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Aguardando Assinatura
          </Badge>
        );
      case "assinado":
        return (
          <Badge className="flex items-center gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Assinado
          </Badge>
        );
      case "rejeitado":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewAssinafy = () => {
    // Buscar URL do Assinafy no metadata ou criar link
    const assinafyUrl = (contrato.dados_contrato as any)?.assinafy_url;
    if (assinafyUrl) {
      window.open(assinafyUrl, "_blank");
    }
  };

  const handleDownloadPDF = () => {
    if (contrato.documento_url) {
      window.open(contrato.documento_url, "_blank");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contrato
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Número:</span>
            <span className="font-medium">{contrato.numero_contrato}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gerado em:</span>
            <span className="font-medium">
              {new Date(contrato.gerado_em || contrato.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
          {contrato.assinado_em && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Assinado em:</span>
              <span className="font-medium">
                {new Date(contrato.assinado_em).toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {status === "pendente_assinatura" && (contrato.dados_contrato as any)?.assinafy_url && (
            <Button 
              onClick={handleViewAssinafy}
              className="flex-1"
              variant="default"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Assinar via Assinafy
            </Button>
          )}
          
          {contrato.documento_url && (
            <Button 
              onClick={handleDownloadPDF}
              variant="outline"
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
          )}
        </div>

        {status === "assinado" && (
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
            ✅ Contrato assinado com sucesso! O processo de credenciamento foi concluído.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
