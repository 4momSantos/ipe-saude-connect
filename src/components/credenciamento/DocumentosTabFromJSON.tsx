import { FileText, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/formatters";

interface DocumentoJSON {
  tipo: string;
  status: string;
  url?: string;
  data_envio?: string;
  observacao?: string;
  nome_arquivo?: string;
}

interface DocumentosTabFromJSONProps {
  dadosInscricao: any;
}

export function DocumentosTabFromJSON({ dadosInscricao }: DocumentosTabFromJSONProps) {
  console.log('[DEBUG DocumentosTabFromJSON] dadosInscricao:', dadosInscricao);
  console.log('[DEBUG DocumentosTabFromJSON] documentos:', dadosInscricao?.documentos);

  // ✅ Buscar documentos do JSONB, não da tabela
  const documentos: DocumentoJSON[] = dadosInscricao?.documentos || [];

  if (!documentos || documentos.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <FileText className="mx-auto w-16 h-16 text-muted-foreground opacity-50" />
        <div>
          <h3 className="text-lg font-semibold mb-2">Nenhum Documento Enviado</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Os documentos enviados durante a inscrição aparecerão aqui quando disponíveis.
          </p>
        </div>
      </div>
    );
  }

  const formatDocumentType = (tipo: string) => {
    const tipos: Record<string, string> = {
      ficha_cadastral: "Ficha Cadastral",
      identidade_medica: "Identidade Profissional",
      cnpj: "Comprovante CNPJ",
      comprovante_endereco: "Comprovante de Endereço",
      certificado_capacitacao: "Certificado de Capacitação",
      seguro_responsabilidade: "Seguro de Responsabilidade Civil",
      diploma: "Diploma",
      titulo_especialista: "Título de Especialista",
      rg: "RG",
      cpf: "CPF",
      crm: "CRM",
    };
    return tipos[tipo] || tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getDocumentStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case "enviado":
        return "secondary";
      case "validado":
      case "aprovado":
        return "default";
      case "rejeitado":
        return "destructive";
      case "pendente_revisao":
      case "pendente":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getDocumentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      enviado: "Enviado",
      validado: "Validado",
      aprovado: "Aprovado",
      rejeitado: "Rejeitado",
      pendente_revisao: "Pendente Revisão",
      pendente: "Pendente",
    };
    return labels[status?.toLowerCase()] || status;
  };

  return (
    <div className="space-y-4">
      {documentos.map((doc, idx) => (
        <Card key={idx} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base font-semibold capitalize truncate">
                    {formatDocumentType(doc.tipo)}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {doc.data_envio && (
                      <span className="text-xs text-muted-foreground">
                        Enviado em {formatDate(doc.data_envio)}
                      </span>
                    )}
                  </div>
                  {doc.nome_arquivo && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {doc.nome_arquivo}
                    </p>
                  )}
                </div>
              </div>

              <Badge variant={getDocumentStatusVariant(doc.status)} className="flex-shrink-0">
                {getDocumentStatusLabel(doc.status)}
              </Badge>
            </div>
          </CardHeader>

          {(doc.url || doc.observacao) && (
            <CardContent className="pt-0">
              {doc.observacao && (
                <p className="text-xs text-muted-foreground mb-3 pl-10">
                  <span className="font-semibold">Obs:</span> {doc.observacao}
                </p>
              )}

              {doc.url && (
                <div className="flex gap-2 pl-10">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(doc.url, "_blank")}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Visualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = doc.url!;
                      link.download = doc.nome_arquivo || `documento_${idx + 1}`;
                      link.click();
                    }}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}

      <div className="text-xs text-muted-foreground text-center pt-4 border-t">
        Total de {documentos.length} documento{documentos.length !== 1 ? 's' : ''} enviado{documentos.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
