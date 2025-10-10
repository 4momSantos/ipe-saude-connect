import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function GerenciarAPIKeys() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gerenciar API Keys</h1>
        <p className="text-muted-foreground">
          Controlar acesso ao Web Service público de consulta
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
          Esta página permitirá gerar e gerenciar API Keys para acesso ao Web Service público.
        </p>
      </Card>
    </div>
  );
}
