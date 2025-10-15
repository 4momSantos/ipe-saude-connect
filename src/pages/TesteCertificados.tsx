import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function TesteCertificados() {
  const certificados = [
    {
      codigo: 'A1B2C3D4',
      numero: 'CRC-2025-000001',
      status: 'Válido',
      descricao: 'Certificado regular válido por 90 dias',
      variant: 'default' as const
    },
    {
      codigo: 'X9Y8Z7W6',
      numero: 'CRC-2024-999999',
      status: 'Expirado',
      descricao: 'Certificado expirado há 30 dias',
      variant: 'secondary' as const
    },
    {
      codigo: 'P1Q2R3S4',
      numero: 'CRC-2025-000002',
      status: 'Irregular',
      descricao: 'Certificado irregular com pendências',
      variant: 'destructive' as const
    }
  ];

  const copiar = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast.success('Copiado para área de transferência!');
  };

  return (
    <div className="container max-w-4xl mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">🧪 Certificados de Teste</h1>
        <p className="text-muted-foreground text-lg">
          Use estes códigos para testar a validação pública na landing page
        </p>
      </div>

      <div className="grid gap-4">
        {certificados.map((cert) => (
          <Card key={cert.codigo}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{cert.status}</CardTitle>
                <Badge variant={cert.variant}>{cert.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{cert.descricao}</p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-4 py-3 rounded-lg font-mono text-sm">
                    {cert.codigo}
                  </code>
                  <Button size="icon" variant="outline" onClick={() => copiar(cert.codigo)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-4 py-3 rounded-lg font-mono text-sm">
                    {cert.numero}
                  </code>
                  <Button size="icon" variant="outline" onClick={() => copiar(cert.numero)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button 
                className="w-full" 
                asChild
              >
                <a href={`/#validar-certificado`} target="_blank">
                  Testar na Landing Page
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary">
        <CardHeader>
          <CardTitle>Como Testar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">1. Volte para a landing page (rota "/")</p>
          <p className="text-sm">2. Role até a seção "Validar Certificado"</p>
          <p className="text-sm">3. Digite um dos códigos acima</p>
          <p className="text-sm">4. Clique em "Consultar"</p>
          <p className="text-sm">5. Veja o resultado diretamente na página</p>
        </CardContent>
      </Card>
    </div>
  );
}
