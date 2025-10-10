import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function GerenciarModelosJustificativa() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Modelos de Justificativa</h1>
        <p className="text-muted-foreground">
          Gerenciar modelos de texto para indeferimento e notificações
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Aguardando aplicação da migration SQL para ativar este recurso.
          Execute a migration pendente no banco de dados.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Esta página permitirá criar e gerenciar modelos de justificativa com variáveis dinâmicas.
        </p>
      </Card>
    </div>
  );
}
