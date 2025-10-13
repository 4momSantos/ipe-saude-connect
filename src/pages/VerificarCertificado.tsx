import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function VerificarCertificado() {
  const { numero } = useParams<{ numero: string }>();

  const { data: certificado, isLoading, error } = useQuery({
    queryKey: ["certificado", numero],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificados")
        .select(`
          *,
          credenciado:credenciados(
            id,
            nome,
            cpf,
            cnpj,
            crms:credenciado_crms(
              crm,
              uf_crm,
              especialidade
            )
          )
        `)
        .eq("numero_certificado", numero)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!numero
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="max-w-2xl w-full mx-4">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !certificado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 to-destructive/10">
        <Card className="max-w-2xl w-full mx-4 border-destructive">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive" />
              <CardTitle className="text-destructive">Certificado Não Encontrado</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              O certificado <strong>{numero}</strong> não foi encontrado em nossa base de dados.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Verifique se o número está correto ou entre em contato com o emissor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isValido = certificado.status === 'ativo' && new Date(certificado.valido_ate) > new Date();
  const credenciado = certificado.credenciado as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="border-2">
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center gap-3 mb-2">
              {isValido ? (
                <CheckCircle className="h-12 w-12 text-green-500" />
              ) : (
                <AlertCircle className="h-12 w-12 text-amber-500" />
              )}
            </div>
            <CardTitle className="text-3xl">Certificado de Credenciamento</CardTitle>
            <p className="text-muted-foreground">Verificação de Autenticidade</p>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Status */}
            <div className="text-center">
              <Badge 
                variant={isValido ? "default" : "secondary"} 
                className="text-lg px-6 py-2"
              >
                {isValido ? "✓ Válido" : "⚠ Inválido ou Expirado"}
              </Badge>
            </div>

            {/* Número do Certificado */}
            <div className="bg-muted/50 p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Número do Certificado</p>
              <p className="text-2xl font-mono font-bold">{certificado.numero_certificado}</p>
            </div>

            {/* Dados do Credenciado */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nome</p>
                <p className="text-lg font-semibold">{credenciado?.nome || 'Não informado'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {credenciado?.cpf ? 'CPF' : 'CNPJ'}
                </p>
                <p className="text-lg font-mono">{credenciado?.cpf || credenciado?.cnpj || 'Não informado'}</p>
              </div>
            </div>

            {/* Especialidades */}
            {credenciado?.crms && credenciado.crms.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Especialidades</p>
                <div className="flex flex-wrap gap-2">
                  {credenciado.crms.map((crm: any, index: number) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {crm.especialidade} - CRM {crm.crm}/{crm.uf_crm}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Validade */}
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Emitido em</p>
                <p className="text-base">{format(new Date(certificado.emitido_em), "dd/MM/yyyy")}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Válido até</p>
                <p className="text-base">{format(new Date(certificado.valido_ate), "dd/MM/yyyy")}</p>
              </div>
            </div>

            {/* Rodapé */}
            <div className="text-center text-sm text-muted-foreground pt-4 border-t">
              <p>Este certificado foi emitido digitalmente e pode ser verificado a qualquer momento através deste link.</p>
              <p className="mt-2 font-mono text-xs">{window.location.href}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}