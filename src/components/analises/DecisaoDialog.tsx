import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormDecisao } from "./FormDecisao";
import { useProcessarDecisao } from "@/hooks/useProcessarDecisao";
import type { Decisao } from "@/types/decisao";
import type { InscricaoDocumento } from "@/hooks/useInscricaoDocumentos";

interface DecisaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inscricaoId: string;
  analiseId: string;
  dadosInscricao: Record<string, any>;
  documentos: InscricaoDocumento[];
}

export function DecisaoDialog({
  open,
  onOpenChange,
  inscricaoId,
  analiseId,
  dadosInscricao,
  documentos
}: DecisaoDialogProps) {
  const { mutate: processarDecisao, isPending } = useProcessarDecisao();

  const handleSubmit = (decisao: Decisao) => {
    processarDecisao(
      { inscricaoId, analiseId, decisao },
      {
        onSuccess: () => {
          onOpenChange(false);
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Decisão de Análise</DialogTitle>
        </DialogHeader>
        <FormDecisao
          inscricaoId={inscricaoId}
          analiseId={analiseId}
          dadosInscricao={dadosInscricao}
          documentos={documentos}
          onSubmit={handleSubmit}
          isSubmitting={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
