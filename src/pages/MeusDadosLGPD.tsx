import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Trash2, Edit, Shield } from "lucide-react";

export default function MeusDadosLGPD() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Meus Dados (LGPD)</h1>
        <p className="text-muted-foreground">
          Gerencie seus dados pessoais conforme a Lei Geral de Proteção de Dados
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Você tem total controle sobre seus dados pessoais armazenados no sistema.
        </AlertDescription>
      </Alert>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Seus Direitos</h2>
        
        <div className="grid gap-4">
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Exportar Meus Dados</h3>
              <p className="text-sm text-muted-foreground">
                Baixe uma cópia de todos os seus dados (portabilidade)
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>

          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Solicitar Retificação</h3>
              <p className="text-sm text-muted-foreground">
                Solicite correção de dados incorretos ou desatualizados
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Solicitar
            </Button>
          </div>

          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Solicitar Exclusão</h3>
              <p className="text-sm text-muted-foreground">
                Solicite a exclusão permanente dos seus dados pessoais
              </p>
            </div>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Solicitar Exclusão
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Gerenciar Consentimentos</h2>
        <p className="text-sm text-muted-foreground">
          Em breve: gerencie seus consentimentos de uso de dados
        </p>
      </Card>
    </div>
  );
}
