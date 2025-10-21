import { Button } from "@/components/ui/button";
import { useSendSingleContractToSign } from "@/hooks/useSendSingleContractToSign";
import { RefreshCw, Mail } from "lucide-react";

interface ReprocessOrphanButtonProps {
  contratoId: string;
  contratoNumero: string;
  isDisabled?: boolean;
}

export const ReprocessOrphanButton = ({ 
  contratoId, 
  contratoNumero,
  isDisabled = false 
}: ReprocessOrphanButtonProps) => {
  const { mutate, isPending } = useSendSingleContractToSign();

  const handleReprocess = () => {
    if (confirm(
      `🔄 Reprocessar contrato órfão?\n\n` +
      `Número: ${contratoNumero}\n\n` +
      `Isso irá:\n` +
      `✅ Verificar status do documento no Assinafy\n` +
      `✅ Criar assignment de assinatura\n` +
      `✅ Enviar e-mail ao candidato\n\n` +
      `Deseja continuar?`
    )) {
      mutate(contratoId);
    }
  };

  return (
    <Button
      size="sm"
      variant="default"
      onClick={handleReprocess}
      disabled={isPending || isDisabled}
      className="bg-orange-600 hover:bg-orange-700"
      title="Reprocessar contrato órfão e enviar para assinatura"
    >
      {isPending ? (
        <>
          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
          Reprocessando...
        </>
      ) : (
        <>
          <Mail className="h-4 w-4 mr-1" />
          🔄 Reprocessar
        </>
      )}
    </Button>
  );
};
