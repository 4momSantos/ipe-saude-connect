import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle, XCircle, Clock, AlertCircle, ShieldCheck } from "lucide-react";
import { useConsultarPublico } from "@/hooks/useCertificadoRegularidade";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ConsultaCertificado() {
  const [tipoConsulta, setTipoConsulta] = useState<'codigo' | 'numero'>('codigo');
  const [valor, setValor] = useState('');
  
  const { mutate: consultar, data: resultado, isPending, reset } = useConsultarPublico();

  const handleConsultar = () => {
    if (!valor.trim()) return;
    consultar({ tipo: tipoConsulta, valor: valor.trim() });
  };

  const handleLimpar = () => {
    setValor('');
    reset();
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
                <span>{format(new Date(emitido_em), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Válido até:</span>
                <span>{format(new Date(valido_ate), "dd/MM/yyyy", { locale: ptBR })}</span>
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
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="codigo">Código de Verificação</TabsTrigger>
                  <TabsTrigger value="numero">Número do Certificado</TabsTrigger>
                </TabsList>
                
                <TabsContent value="codigo" className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Digite o código (ex: A1B2C3D4)"
                      value={valor}
                      onChange={(e) => setValor(e.target.value.toUpperCase())}
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
                      className="text-center text-lg font-mono"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Formato: CRC-YYYY-NNNNNN
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
