import { FileText, Download, CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Document {
  id: string;
  tipo_documento: string;
  arquivo_nome: string;
  arquivo_url: string;
  arquivo_tamanho: number | null;
  status: "em_habilitacao" | "habilitado" | "inabilitado" | "em_analise" | "pendente" | "aprovado" | "pendente_workflow" | "rejeitado";
  created_at: string;
  observacoes: string | null;
  ocr_processado: boolean;
  ocr_confidence: number | null;
}

export function DocumentsTab({ processoId }: { processoId: string }) {
  const queryClient = useQueryClient();

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['inscricao-documentos', processoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inscricao_documentos')
        .select('*')
        .eq('inscricao_id', processoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Document[];
    }
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ docId, status, observacoes }: { 
      docId: string; 
      status: 'aprovado' | 'rejeitado'; 
      observacoes?: string;
    }) => {
      const { error } = await supabase
        .from('inscricao_documentos')
        .update({ 
          status,
          observacoes,
          analisado_em: new Date().toISOString(),
          analisado_por: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', docId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inscricao-documentos', processoId] });
    }
  });

  const handleAprovar = (docId: string) => {
    updateDocumentMutation.mutate(
      { docId, status: "aprovado" },
      {
        onSuccess: () => toast.success("Documento aprovado"),
        onError: () => toast.error("Erro ao aprovar documento")
      }
    );
  };

  const handleRejeitar = (docId: string) => {
    updateDocumentMutation.mutate(
      { docId, status: "rejeitado" },
      {
        onSuccess: () => toast.error("Documento rejeitado"),
        onError: () => toast.error("Erro ao rejeitar documento")
      }
    );
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const { data } = await supabase.storage
        .from('inscricao-documentos')
        .download(url);
      
      if (data) {
        const blob = new Blob([data]);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        toast.success("Download iniciado");
      }
    } catch (error) {
      toast.error("Erro ao baixar documento");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!documentos || documentos.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Sem Documentos</h3>
        <p className="text-sm text-muted-foreground">
          Nenhum documento foi enviado nesta inscrição ainda.
        </p>
      </div>
    );
  }

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
                  <CardTitle className="text-base text-foreground">{doc.arquivo_nome}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{doc.tipo_documento}</span>
                    <span>•</span>
                    <span>{formatFileSize(doc.arquivo_tamanho)}</span>
                    <span>•</span>
                    <span>{new Date(doc.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  {doc.ocr_processado && doc.ocr_confidence && (
                    <div className="text-xs text-muted-foreground">
                      OCR: {(doc.ocr_confidence * 100).toFixed(0)}% confiança
                    </div>
                  )}
                  {doc.observacoes && (
                    <div className="text-xs text-orange-400 mt-1">
                      Obs: {doc.observacoes}
                    </div>
                  )}
                </div>
              </div>
              <StatusBadge status={doc.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="border-border hover:bg-card gap-2"
                onClick={() => window.open(doc.arquivo_url, '_blank')}
              >
                <Eye className="h-4 w-4" />
                Visualizar
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="border-border hover:bg-card gap-2"
                onClick={() => handleDownload(doc.arquivo_url, doc.arquivo_nome)}
              >
                <Download className="h-4 w-4" />
                Baixar
              </Button>
              {doc.status === "pendente" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleAprovar(doc.id)}
                    disabled={updateDocumentMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRejeitar(doc.id)}
                    disabled={updateDocumentMutation.isPending}
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
