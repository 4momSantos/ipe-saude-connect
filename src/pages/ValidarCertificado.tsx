import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useConsultarPublico } from "@/hooks/useCertificadoRegularidade";
import { CheckCircle, AlertTriangle, Clock, XCircle, Search } from "lucide-react";

export default function ValidarCertificado() {
  const { codigo: codigoUrl } = useParams();
  const [tipo, setTipo] = useState<'codigo' | 'numero'>('codigo');
  const [valor, setValor] = useState(codigoUrl || '');
  
  const { mutate: consultar, data, isPending, isSuccess } = useConsultarPublico();

  const handleConsultar = () => {
    if (!valor.trim()) return;
    consultar({ tipo, valor: valor.trim() });
  };

  const renderResultado = () => {
    if (!isSuccess || !data) return null;

    if (!data.encontrado) {
      return (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <XCircle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="text-xl font-bold">Certificado não encontrado</h3>
                <p className="text-muted-foreground">Verifique se digitou corretamente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    const situacaoMap: Record<string, { icon: any; color: string; bg: string }> = {
      'Válido': { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
      'Expirado': { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
      'Cancelado': { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
      'Substituído': { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
    };

    const config = situacaoMap[data.situacao] || situacaoMap['Válido'];
    const Icon = config.icon;

    return (
      <Card className={`${config.bg} border-2`}>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center gap-4">
            <Icon className={`h-16 w-16 ${config.color}`} />
            <div>
              <h3 className="text-2xl font-bold">{data.situacao}</h3>
              <p className="text-muted-foreground">Certificado autêntico</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nome</p>
              <p className="text-lg font-semibold">{data.credenciado?.nome}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tipo</p>
              <p className="text-lg font-semibold">
                {data.credenciado?.tipo === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Número do Certificado</p>
              <p className="text-lg font-semibold font-mono">{data.numero_certificado}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={data.status === 'regular' ? 'default' : 'secondary'}>
                {data.status?.toUpperCase().replace('_', ' ')}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Data de Emissão</p>
              <p className="text-lg font-semibold">
                {new Date(data.emitido_em).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Válido até</p>
              <p className="text-lg font-semibold">
                {new Date(data.valido_ate).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {data.situacao === 'Válido' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Este certificado é válido e pode ser considerado autêntico.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container max-w-3xl mx-auto py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Validar Certificado de Regularidade</h1>
        <p className="text-muted-foreground">
          Consulte a autenticidade de um certificado emitido
        </p>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Consultar Certificado</CardTitle>
          <CardDescription>
            Digite o código de verificação ou número do certificado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={tipo} onValueChange={(v) => setTipo(v as 'codigo' | 'numero')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="codigo">Código de Verificação</TabsTrigger>
              <TabsTrigger value="numero">Número do Certificado</TabsTrigger>
            </TabsList>

            <TabsContent value="codigo" className="space-y-4">
              <Input
                placeholder="Ex: A1B2C3D4"
                value={valor}
                onChange={(e) => setValor(e.target.value.toUpperCase())}
                maxLength={8}
                className="text-lg font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Código de 8 caracteres encontrado no certificado
              </p>
            </TabsContent>

            <TabsContent value="numero" className="space-y-4">
              <Input
                placeholder="Ex: CRC-2025-000123"
                value={valor}
                onChange={(e) => setValor(e.target.value.toUpperCase())}
                className="text-lg font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Número do certificado no formato CRC-YYYY-NNNNNN
              </p>
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleConsultar}
            disabled={!valor.trim() || isPending}
            className="w-full"
            size="lg"
          >
            <Search className="mr-2 h-4 w-4" />
            {isPending ? 'Consultando...' : 'Consultar'}
          </Button>
        </CardContent>
      </Card>

      {/* Resultado */}
      {renderResultado()}

      {/* Footer */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Este certificado pode ser validado a qualquer momento nesta página
          </p>
          <p className="text-xs text-muted-foreground">
            Em caso de dúvidas, entre em contato com a instituição emissora
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
