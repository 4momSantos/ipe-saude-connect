import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, QrCode, RefreshCw } from "lucide-react";
import { useCertificados } from "@/hooks/useCertificados";
import { useGerarCertificado } from "@/hooks/useGerarCertificado";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface CertificadoCardProps {
  credenciadoId: string;
}

export function CertificadoCard({ credenciadoId }: CertificadoCardProps) {
  const { certificado, download, isLoading, refetch } = useCertificados(credenciadoId);
  const { gerar, isLoading: isGenerating } = useGerarCertificado();

  const handleGerar = async (forceNew: boolean = false) => {
    try {
      await gerar({ credenciadoId, force_new: forceNew });
      await refetch();
    } catch (error) {
      console.error('Erro ao gerar certificado:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Certificado de Credenciamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (!certificado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Certificado de Credenciamento
          </CardTitle>
          <CardDescription>
            Gere o certificado digital de credenciamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              ⚠️ Certificado não gerado
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => handleGerar(false)} 
            disabled={isGenerating}
            className="mt-4"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Gerar Certificado
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const precisaRegenerar = !certificado.documento_url;
  const dataEmissao = certificado.emitido_em ? new Date(certificado.emitido_em) : null;
  const dataValidade = certificado.valido_ate ? new Date(certificado.valido_ate) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Certificado de Credenciamento
        </CardTitle>
        <CardDescription>
          Documento oficial de credenciamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Número do Certificado</p>
            <p className="font-mono font-semibold">{certificado.numero_certificado}</p>
          </div>
          
          {dataEmissao && (
            <div>
              <p className="text-sm text-muted-foreground">Emitido em</p>
              <p className="font-medium">
                {format(dataEmissao, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          )}
          
          {dataValidade && (
            <div>
              <p className="text-sm text-muted-foreground">Válido até</p>
              <p className="font-medium">
                {format(dataValidade, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          )}
          
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className={`font-semibold ${
              certificado.status === 'ativo' ? 'text-green-600' : 'text-gray-500'
            }`}>
              {certificado.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </p>
          </div>
        </div>

        {precisaRegenerar && (
          <Alert variant="destructive">
            <AlertDescription>
              ⚠️ PDF do certificado não disponível. Clique em "Gerar PDF" abaixo.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          {precisaRegenerar ? (
            <Button 
              onClick={() => handleGerar(false)} 
              disabled={isGenerating}
              variant="default"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar PDF
                </>
              )}
            </Button>
          ) : (
            <>
              <Button onClick={download} variant="default">
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF
              </Button>
              <Button 
                onClick={() => {
                  const url = `/verificar-certificado/${certificado.numero_certificado}`;
                  window.open(url, '_blank');
                }}
                variant="outline"
              >
                <QrCode className="mr-2 h-4 w-4" />
                Ver QR Code
              </Button>
              <Button 
                onClick={() => handleGerar(true)} 
                disabled={isGenerating}
                variant="outline"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Gerando nova cópia...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar Nova Cópia
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
