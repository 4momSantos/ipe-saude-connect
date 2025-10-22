import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useCorrecaoInscricao } from "@/hooks/useCorrecaoInscricao";
import type { Decisao } from "@/types/decisao";
import { DocumentoRejeitadoCard } from "@/components/inscricao/DocumentoRejeitadoCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface CorrecaoInscricaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inscricaoId: string;
  decisao: Decisao;
}

export function CorrecaoInscricaoDialog({ open, onOpenChange, inscricaoId, decisao }: CorrecaoInscricaoDialogProps) {
  const { iniciarCorrecao, enviarCorrecao, useCorrecaoAtual } = useCorrecaoInscricao();
  const { data: correcaoAtual, isLoading: loadingCorrecao } = useCorrecaoAtual(inscricaoId);
  
  const [justificativa, setJustificativa] = useState('');
  const [camposCorrigidos, setCamposCorrigidos] = useState<Record<string, any>>({});
  const [documentosReenviados, setDocumentosReenviados] = useState<string[]>([]);
  const [correcaoId, setCorrecaoId] = useState<string | null>(null);

  // Iniciar correção ao abrir dialog (se não houver uma em andamento)
  useEffect(() => {
    if (open && !correcaoAtual && !loadingCorrecao) {
      iniciarCorrecao.mutate({ inscricaoId }, {
        onSuccess: (id) => {
          setCorrecaoId(id);
        }
      });
    } else if (correcaoAtual) {
      setCorrecaoId(correcaoAtual.id);
      // Restaurar dados salvos
      if (correcaoAtual.campos_corrigidos) {
        setCamposCorrigidos(correcaoAtual.campos_corrigidos as Record<string, any>);
      }
      if (correcaoAtual.documentos_reenviados) {
        setDocumentosReenviados(correcaoAtual.documentos_reenviados as string[]);
      }
      if (correcaoAtual.candidato_justificativa) {
        setJustificativa(correcaoAtual.candidato_justificativa);
      }
    }
  }, [open, correcaoAtual, loadingCorrecao]);

  const handleDocumentoReenviado = (novoDocumentoId: string) => {
    setDocumentosReenviados(prev => [...prev, novoDocumentoId]);
  };

  const handleEnviarCorrecao = () => {
    if (!correcaoId) {
      return;
    }

    // Validar que todos os itens foram corrigidos
    const camposReprovados = decisao.campos_reprovados || [];
    const documentosReprovados = decisao.documentos_reprovados || [];

    if (camposReprovados.length > 0 && Object.keys(camposCorrigidos).length === 0) {
      alert('Por favor, corrija todos os campos reprovados');
      return;
    }

    if (documentosReprovados.length > 0 && documentosReenviados.length === 0) {
      alert('Por favor, reenvie todos os documentos reprovados');
      return;
    }

    if (!justificativa.trim()) {
      alert('Por favor, explique as correções realizadas');
      return;
    }

    enviarCorrecao.mutate({
      correcaoId,
      camposCorrigidos,
      documentosReenviados,
      justificativa: justificativa.trim()
    }, {
      onSuccess: () => {
        onOpenChange(false);
        // Limpar estado
        setJustificativa('');
        setCamposCorrigidos({});
        setDocumentosReenviados([]);
        setCorrecaoId(null);
      }
    });
  };

  const temCamposReprovados = decisao.campos_reprovados && decisao.campos_reprovados.length > 0;
  const temDocumentosReprovados = decisao.documentos_reprovados && decisao.documentos_reprovados.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Corrigir Inscrição</DialogTitle>
          <DialogDescription>
            Corrija os campos e reenvie os documentos que foram reprovados
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Campos Reprovados */}
            {temCamposReprovados && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Campos para Corrigir
                </h3>
                <Alert>
                  <AlertDescription>
                    <p className="text-sm mb-2">
                      Os seguintes campos foram reprovados. Você precisará editar sua inscrição e corrigir estes dados:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {decisao.campos_reprovados?.map((campo, idx) => (
                        <li key={idx}>
                          <span className="font-semibold">{campo.campo}</span> ({campo.secao})
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
                <p className="text-xs text-muted-foreground">
                  💡 Após corrigir os campos acima, volte aqui para enviar a correção
                </p>
              </div>
            )}

            {temCamposReprovados && temDocumentosReprovados && (
              <Separator />
            )}

            {/* Documentos Reprovados */}
            {temDocumentosReprovados && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Documentos para Reenviar</h3>
                <div className="grid gap-3">
                  {decisao.documentos_reprovados?.map((doc) => (
                    <DocumentoRejeitadoCard
                      key={doc.documento_id}
                      documento={{
                        id: doc.documento_id,
                        tipo_documento: doc.tipo_documento,
                        versao: 1,
                        observacoes: doc.motivo
                      }}
                      inscricaoId={inscricaoId}
                      onReenviar={() => handleDocumentoReenviado(doc.documento_id)}
                    />
                  ))}
                </div>

                {documentosReenviados.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      ✅ {documentosReenviados.length} documento(s) reenviado(s) com sucesso
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {(temCamposReprovados || temDocumentosReprovados) && (
              <Separator />
            )}

            {/* Justificativa */}
            <div className="space-y-2">
              <Label htmlFor="justificativa">
                Explique as correções realizadas *
              </Label>
              <Textarea
                id="justificativa"
                placeholder="Descreva as alterações que você fez para corrigir os problemas apontados..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Seja claro e objetivo. Esta justificativa ajudará o analista na reavaliação.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={enviarCorrecao.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleEnviarCorrecao}
            disabled={enviarCorrecao.isPending || !justificativa.trim()}
          >
            {enviarCorrecao.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Correção
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
