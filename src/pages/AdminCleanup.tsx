import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Trash2 } from "lucide-react";
import { useCleanupTestData } from "@/hooks/useCleanupTestData";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminCleanup() {
  const { cleanup, isLoading, result } = useCleanupTestData();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Limpeza de Dados de Teste</h1>
        <p className="text-muted-foreground">
          Remova inscrições e dados relacionados de emails de teste (@teste.com)
        </p>
      </div>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Atenção</AlertTitle>
        <AlertDescription>
          Esta ação é irreversível e irá deletar permanentemente:
          <ul className="list-disc ml-6 mt-2">
            <li>Todas as inscrições de emails terminados em @teste.com</li>
            <li>Credenciados relacionados a essas inscrições</li>
            <li>Documentos enviados nessas inscrições</li>
            <li>Contratos gerados</li>
            <li>Solicitações de assinatura</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Executar Limpeza</CardTitle>
          <CardDescription>
            Clique no botão abaixo para remover todos os dados de teste do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isLoading ? 'Limpando...' : 'Limpar Dados de Teste'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os dados de teste serão
                  permanentemente removidos do sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => cleanup()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirmar Limpeza
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {result && (
            <Card className="bg-muted">
              <CardHeader>
                <CardTitle className="text-base">Resultado da Última Limpeza</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Inscrições deletadas:</p>
                    <p className="text-2xl font-bold">{result.inscricoes_deletadas}</p>
                  </div>
                  <div>
                    <p className="font-medium">Credenciados deletados:</p>
                    <p className="text-2xl font-bold">{result.credenciados_deletados}</p>
                  </div>
                  <div>
                    <p className="font-medium">Documentos deletados:</p>
                    <p className="text-2xl font-bold">{result.documentos_deletados}</p>
                  </div>
                  <div>
                    <p className="font-medium">Contratos deletados:</p>
                    <p className="text-2xl font-bold">{result.contratos_deletados}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-medium">Assinaturas deletadas:</p>
                    <p className="text-2xl font-bold">{result.assinaturas_deletadas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
