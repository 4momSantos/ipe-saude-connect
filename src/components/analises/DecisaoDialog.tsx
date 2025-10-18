import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormDecisao } from "./FormDecisao";
import { ContratoAprovadoModal } from "./ContratoAprovadoModal";
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
  
  const [contratoModalOpen, setContratoModalOpen] = useState(false);
  const [contratoData, setContratoData] = useState<{
    id: string;
    numero_contrato: string;
    candidato_nome: string;
    candidato_email: string;
    documento_url?: string;
  } | null>(null);

  const handleSubmit = (decisao: Decisao) => {
    processarDecisao(
      { 
        inscricaoId, 
        analiseId, 
        decisao,
        onAprovado: (contrato) => {
          console.log('✅ Candidato aprovado, contrato gerado:', contrato);
          setContratoData(contrato);
          onOpenChange(false);
          setTimeout(() => {
            setContratoModalOpen(true);
          }, 300);
        }
      },
      {
        onSuccess: () => {
          if (decisao.status !== 'aprovado') {
            onOpenChange(false);
          }
        }
      }
    );
  };

  return (
    <>
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

      <ContratoAprovadoModal
        open={contratoModalOpen}
        onOpenChange={setContratoModalOpen}
        contrato={contratoData}
        onContratoEnviado={() => {
          console.log('📤 Contrato enviado com sucesso via modal');
        }}
      />
    </>
  );
}
