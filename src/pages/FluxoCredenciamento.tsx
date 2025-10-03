import { useState } from "react";
import { FluxoCredenciamento } from "@/components/credenciamento/FluxoCredenciamento";
import { toast } from "sonner";

type StatusType = 
  | "em_analise" 
  | "aprovado" 
  | "aguardando_assinatura" 
  | "assinado" 
  | "ativo"
  | "rejeitado";

export default function FluxoCredenciamentoPage() {
  // Simulação de status - em produção, isso viria do backend/Supabase
  const [status, setStatus] = useState<StatusType>("aguardando_assinatura");
  const [motivoRejeicao] = useState<string | undefined>(undefined);

  const handleAssinarContrato = async () => {
    // Simulação de assinatura - em produção, chamaria API/Supabase
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setStatus("ativo");
        toast.success("Contrato assinado com sucesso!", {
          description: "Seu credenciamento está agora ativo."
        });
        resolve();
      }, 2000);
    });
  };

  return (
    <div className="container mx-auto max-w-7xl">
      <FluxoCredenciamento 
        status={status}
        motivoRejeicao={motivoRejeicao}
        onAssinarContrato={handleAssinarContrato}
      />
    </div>
  );
}
