import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGerarCertificado } from '@/hooks/useGerarCertificado';
import { useEmitirCertificadoRegularidade } from '@/hooks/useEmitirCertificadoRegularidade';
import { Award, FileCheck, Download } from 'lucide-react';

interface CertificadosTabProps {
  credenciado: any;
}

export function CertificadosTab({ credenciado }: CertificadosTabProps) {
  const { gerar, isLoading: isLoadingCert } = useGerarCertificado();
  const { mutateAsync: emitirRegularidade, isPending: isLoadingReg } = useEmitirCertificadoRegularidade();

  const handleGerarCertificado = async () => {
    if (!credenciado?.id) return;
    await gerar({ credenciadoId: credenciado.id });
  };

  const handleGerarRegularidade = async () => {
    if (!credenciado?.id) return;
    await emitirRegularidade({ credenciadoId: credenciado.id });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-foreground">Certificados Disponíveis</h2>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Certificado de Credenciamento</CardTitle>
                <CardDescription>Documento oficial do seu credenciamento</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleGerarCertificado}
              disabled={isLoadingCert}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {isLoadingCert ? 'Gerando...' : 'Baixar Certificado'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-success/10">
                <FileCheck className="h-6 w-6 text-success" />
              </div>
              <div>
                <CardTitle>Certificado de Regularidade</CardTitle>
                <CardDescription>Comprovante de situação regular</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleGerarRegularidade}
              disabled={isLoadingReg}
              variant="outline"
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {isLoadingReg ? 'Gerando...' : 'Emitir Certificado'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
