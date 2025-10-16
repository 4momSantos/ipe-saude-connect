import { Award, CheckCircle, FileText, FileCheck, Download, Calendar, Shield, Hash, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCredenciadoAtual } from "@/hooks/useCredenciadoAtual";
import { useGerarCertificado } from "@/hooks/useGerarCertificado";
import { useEmitirCertificado } from "@/hooks/useCertificadoRegularidade";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function MeuCredenciamento() {
  const { data: credenciado, isLoading: loadingCredenciado } = useCredenciadoAtual();
  const { gerar: gerarCertificado, isLoading: gerandoCertificado } = useGerarCertificado();
  const emitirRegularidade = useEmitirCertificado();

  if (loadingCredenciado) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (!credenciado) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Credenciamento não encontrado</CardTitle>
            <CardDescription>
              Você ainda não possui um credenciamento ativo no sistema.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleGerarCertificado = async () => {
    try {
      await gerarCertificado({ credenciadoId: credenciado.id });
    } catch (error) {
      console.error('Erro ao gerar certificado:', error);
    }
  };

  const handleGerarRegularidade = async () => {
    try {
      await emitirRegularidade.mutateAsync({ credenciadoId: credenciado.id });
    } catch (error) {
      console.error('Erro ao gerar certificado de regularidade:', error);
    }
  };

  const tipoDocumentoLabel: Record<string, string> = {
    certificado_credenciamento: 'Certificado de Credenciamento',
    certificado_regularidade: 'Certificado de Regularidade',
    extrato_completo: 'Extrato Completo',
    declaracao_vinculo: 'Declaração de Vínculo'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Meu Credenciamento</h1>
          <p className="text-muted-foreground">
            Visualize seu status e gere documentos oficiais
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Número do Credenciado - Único e permanente */}
          {credenciado.numero_credenciado && (
            <Card className="shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Hash className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Número do Credenciado</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold font-mono">{credenciado.numero_credenciado}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(credenciado.numero_credenciado!);
                        toast.success('Número copiado!');
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Badge 
            variant={credenciado.status === 'Ativo' ? 'default' : 'destructive'}
            className="text-base px-4 py-2"
          >
            <Shield className="h-4 w-4 mr-2" />
            {credenciado.status}
          </Badge>
        </div>
      </div>

      {/* Resumo do Credenciamento */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Credenciamento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{credenciado.nome}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
              <p className="font-medium">{credenciado.cpf || credenciado.cnpj}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data de Credenciamento</p>
              <p className="font-medium">
                {format(new Date(credenciado.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{credenciado.email || 'Não informado'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentos Disponíveis */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Documentos Disponíveis</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Certificado de Credenciamento */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Certificado de Credenciamento</CardTitle>
                  <CardDescription>Documento oficial que comprova seu credenciamento</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleGerarCertificado}
                disabled={gerandoCertificado}
                className="w-full"
              >
                {gerandoCertificado ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Gerar Certificado
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Certificado de Regularidade */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Certificado de Regularidade</CardTitle>
                  <CardDescription>Atesta sua situação cadastral atual</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleGerarRegularidade}
                disabled={emitirRegularidade.isPending}
                variant="secondary"
                className="w-full"
              >
                {emitirRegularidade.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Emitir Certificado
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
