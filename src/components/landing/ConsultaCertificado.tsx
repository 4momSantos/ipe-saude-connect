import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle, XCircle, Clock, AlertCircle, ShieldCheck, Download } from "lucide-react";
import { useConsultarPublico, useConsultarPorCredenciado } from "@/hooks/useCertificadoRegularidade";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ConsultaCertificado() {
  const [tipoConsulta, setTipoConsulta] = useState<'codigo' | 'numero' | 'credenciado'>('codigo');
  const [valor, setValor] = useState('');
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);
  
  const { mutate: consultar, data: resultadoPublico, isPending: isPendingPublico, reset: resetPublico } = useConsultarPublico();
  const { mutate: consultarCredenciado, data: resultadoCredenciado, isPending: isPendingCredenciado, reset: resetCredenciado } = useConsultarPorCredenciado();
  
  const resultado = tipoConsulta === 'credenciado' ? resultadoCredenciado : resultadoPublico;
  const isPending = tipoConsulta === 'credenciado' ? isPendingCredenciado : isPendingPublico;

  const handleConsultar = () => {
    if (!valor.trim()) return;
    
    if (tipoConsulta === 'credenciado') {
      consultarCredenciado(valor.trim());
    } else {
      consultar({ tipo: tipoConsulta as 'codigo' | 'numero', valor: valor.trim() });
    }
  };

  const handleLimpar = () => {
    setValor('');
    resetPublico();
    resetCredenciado();
  };

  const handleDownload = async (certificadoId: string, numeroCert: string) => {
    try {
      setDownloadingCertId(certificadoId);
      
      const { data, error } = await supabase.functions.invoke('download-certificado', {
        body: { certificadoId }
      });

      if (error) throw error;

      if (data instanceof Blob) {
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${numeroCert}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Certificado baixado com sucesso!');
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (error) {
      console.error('Erro ao baixar:', error);
      toast.error('Erro ao baixar o certificado');
    } finally {
      setDownloadingCertId(null);
    }
  };

  const renderResultado = () => {
    if (!resultado) return null;

    if (!resultado.encontrado) {
      return (
        <Alert variant="destructive">
          <XCircle className="h-5 w-5" />
          <AlertTitle>Certificado não encontrado</AlertTitle>
          <AlertDescription>
            Verifique se o código foi digitado corretamente.
          </AlertDescription>
        </Alert>
      );
    }

    const { situacao, status, numero_certificado, emitido_em, valido_ate, credenciado } = resultado;

    let Icon = CheckCircle;
    let variant: 'default' | 'destructive' | 'secondary' = 'default';
    let alertVariant: 'default' | 'destructive' = 'default';

    if (situacao === 'Expirado') {
      Icon = Clock;
      variant = 'secondary';
    } else if (situacao === 'Cancelado') {
      Icon = XCircle;
      variant = 'destructive';
      alertVariant = 'destructive';
    } else if (status === 'irregular') {
      Icon = AlertCircle;
      variant = 'destructive';
    }

    return (
      <Alert variant={alertVariant} className="space-y-4">
        <div className="flex items-start gap-3">
          <Icon className="h-6 w-6 mt-1" />
          <div className="flex-1 space-y-3">
            <div>
              <AlertTitle className="text-xl mb-2">
                Certificado {situacao}
                <Badge variant={variant} className="ml-3">
                  {situacao}
                </Badge>
              </AlertTitle>
              <AlertDescription className="text-base">
                {credenciado?.nome}
              </AlertDescription>
            </div>

            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Número:</span>
                <span className="font-mono font-semibold">{numero_certificado}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Emitido em:</span>
                <span>{format(new Date(emitido_em!), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Válido até:</span>
                <span>{format(new Date(valido_ate!), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={status === 'regular' ? 'default' : 'destructive'}>
                  {status === 'regular' ? 'Regular' : 'Irregular'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        {resultado.tem_pdf && resultado.certificado_id && (
          <div className="pt-4 mt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => handleDownload(resultado.certificado_id!, resultado.numero_certificado!)}
              disabled={downloadingCertId === resultado.certificado_id}
            >
              {downloadingCertId === resultado.certificado_id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Baixando PDF...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Certificado (PDF)
                </>
              )}
            </Button>
          </div>
        )}
      </Alert>
    );
  };

  return (
    <section id="validar-certificado" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">
                <ShieldCheck className="inline-block mr-2 h-8 w-8 text-primary" />
                Validar Certificado de Regularidade
              </CardTitle>
              <CardDescription className="text-base">
                Consulte a autenticidade de um certificado de forma rápida e segura
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={tipoConsulta} onValueChange={(v) => setTipoConsulta(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="codigo">Código</TabsTrigger>
                  <TabsTrigger value="numero">Número</TabsTrigger>
                  <TabsTrigger value="credenciado">Credenciado</TabsTrigger>
                </TabsList>
                
                <TabsContent value="codigo" className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Digite o código (ex: A1B2C3D4)"
                      value={valor}
                      onChange={(e) => setValor(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === 'Enter' && handleConsultar()}
                      maxLength={8}
                      className="text-center text-lg font-mono"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      8 caracteres alfanuméricos
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="numero" className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Digite o número (ex: CRC-2025-000123)"
                      value={valor}
                      onChange={(e) => setValor(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === 'Enter' && handleConsultar()}
                      className="text-center text-lg font-mono"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Formato: CRC-YYYY-NNNNNN
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="credenciado" className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Digite CPF, CNPJ ou ID"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleConsultar()}
                      className="text-center text-lg"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Insira CPF (11 dígitos), CNPJ (14 dígitos) ou UUID
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-3">
                <Button 
                  className="flex-1" 
                  size="lg"
                  onClick={handleConsultar}
                  disabled={!valor.trim() || isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Consultando...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-5 w-5" />
                      Consultar
                    </>
                  )}
                </Button>
                {resultado && (
                  <Button variant="outline" size="lg" onClick={handleLimpar}>
                    Limpar
                  </Button>
                )}
              </div>

              {renderResultado()}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
