import { useState } from "react";
import { FileText, Download, CheckCircle, XCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Document {
  id: number;
  nome: string;
  tipo: string;
  tamanho: string;
  dataUpload: string;
  status: "pendente" | "aprovado" | "rejeitado";
}

const documentosMock: Document[] = [
  {
    id: 1,
    nome: "RG_Frente.pdf",
    tipo: "Documento de Identificação",
    tamanho: "1.2 MB",
    dataUpload: "2025-09-28",
    status: "aprovado",
  },
  {
    id: 2,
    nome: "CPF.pdf",
    tipo: "Documento de Identificação",
    tamanho: "856 KB",
    dataUpload: "2025-09-28",
    status: "aprovado",
  },
  {
    id: 3,
    nome: "Diploma_Medicina.pdf",
    tipo: "Formação Acadêmica",
    tamanho: "2.4 MB",
    dataUpload: "2025-09-28",
    status: "pendente",
  },
  {
    id: 4,
    nome: "CRM_Registro.pdf",
    tipo: "Registro Profissional",
    tamanho: "1.8 MB",
    dataUpload: "2025-09-28",
    status: "pendente",
  },
  {
    id: 5,
    nome: "Comprovante_Residencia.pdf",
    tipo: "Comprovante de Endereço",
    tamanho: "645 KB",
    dataUpload: "2025-09-28",
    status: "aprovado",
  },
];

export function DocumentsTab({ processoId }: { processoId: number }) {
  const [documentos, setDocumentos] = useState<Document[]>(documentosMock);

  const handleAprovar = (docId: number) => {
    setDocumentos((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, status: "aprovado" as const } : doc))
    );
    toast.success("Documento aprovado");
  };

  const handleRejeitar = (docId: number) => {
    setDocumentos((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, status: "rejeitado" as const } : doc))
    );
    toast.error("Documento rejeitado");
  };

  const getStatusBadge = (status: Document["status"]) => {
    const config = {
      pendente: { label: "Pendente", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
      aprovado: { label: "Aprovado", className: "bg-green-500/20 text-green-400 border-green-500/30" },
      rejeitado: { label: "Rejeitado", className: "bg-red-500/20 text-red-400 border-red-500/30" },
    };
    const { label, className } = config[status];
    return (
      <Badge variant="outline" className={className}>
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {documentos.map((doc) => (
        <Card key={doc.id} className="border bg-card hover-lift">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base text-foreground">{doc.nome}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{doc.tipo}</span>
                    <span>•</span>
                    <span>{doc.tamanho}</span>
                    <span>•</span>
                    <span>{new Date(doc.dataUpload).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </div>
              {getStatusBadge(doc.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-border hover:bg-card gap-2">
                <Eye className="h-4 w-4" />
                Visualizar
              </Button>
              <Button size="sm" variant="outline" className="border-border hover:bg-card gap-2">
                <Download className="h-4 w-4" />
                Baixar
              </Button>
              {doc.status === "pendente" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleAprovar(doc.id)}
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRejeitar(doc.id)}
                    className="bg-red-600 hover:bg-red-700 text-white gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Rejeitar
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
