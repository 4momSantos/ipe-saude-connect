import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Download } from "lucide-react";

export default function VerificarCertificado() {
  const { numeroCertificado } = useParams<{ numeroCertificado: string }>();
  const [certificado, setCertificado] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCertificado() {
      try {
        const { data, error: fetchError } = await supabase
          .from("certificados")
          .select(`
            *,
            credenciado:credenciados(
              id,
              nome,
              cpf,
              cnpj,
              email
            )
          `)
          .eq("numero_certificado", numeroCertificado)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Certificado não encontrado");

        setCertificado(data);
      } catch (err: any) {
        console.error("Erro ao buscar certificado:", err);
        setError(err.message || "Erro ao buscar certificado");
      } finally {
        setLoading(false);
      }
    }

    if (numeroCertificado) {
      fetchCertificado();
    }
  }, [numeroCertificado]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Verificando certificado...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !certificado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/10 via-background to-destructive/5">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Certificado Não Encontrado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              O certificado <code className="px-2 py-1 bg-muted rounded text-sm">{numeroCertificado}</code> não foi encontrado em nossa base de dados.
            </p>
            <p className="text-sm text-muted-foreground">
              Verifique se o número foi digitado corretamente ou entre em contato conosco.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isValido = certificado.status === "ativo" && new Date(certificado.valido_ate) > new Date();
  const emitidoEm = new Date(certificado.emitido_em).toLocaleDateString("pt-BR");
  const validoAte = new Date(certificado.valido_ate).toLocaleDateString("pt-BR");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader className="text-center border-b">
          <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            {isValido ? (
              <CheckCircle2 className="h-12 w-12 text-primary" />
            ) : (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isValido ? "Certificado Válido" : "Certificado Inválido"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          {/* Status */}
          <div className="flex justify-center">
            <Badge variant={isValido ? "default" : "destructive"} className="px-4 py-2 text-lg">
              {certificado.status === "ativo" ? "ATIVO" : "INATIVO"}
            </Badge>
          </div>

          {/* Informações do Certificado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Número do Certificado</p>
              <p className="text-lg font-mono font-bold text-primary">{certificado.numero_certificado}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Tipo</p>
              <p className="text-lg capitalize">{certificado.tipo}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Credenciado</p>
              <p className="text-lg font-semibold">{certificado.credenciado.nome}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">CPF/CNPJ</p>
              <p className="text-lg font-mono">{certificado.credenciado.cpf || certificado.credenciado.cnpj}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Emitido em</p>
              <p className="text-lg">{emitidoEm}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Válido até</p>
              <p className="text-lg">{validoAte}</p>
            </div>
          </div>

          {/* Especialidades */}
          {certificado.dados_certificado?.especialidades && (
            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-semibold text-muted-foreground">Especialidade(s)</p>
              <p className="text-lg">{certificado.dados_certificado.especialidades}</p>
            </div>
          )}

          {/* Botão de Download */}
          {certificado.documento_url && (
            <div className="pt-6 flex justify-center">
              <Button
                size="lg"
                onClick={() => window.open(certificado.documento_url, "_blank")}
                className="gap-2"
              >
                <Download className="h-5 w-5" />
                Baixar Certificado PDF
              </Button>
            </div>
          )}

          {/* Aviso de Validade */}
          {!isValido && (
            <div className="mt-6 p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-center">
              <p className="text-sm text-destructive font-semibold">
                ⚠️ Este certificado está {certificado.status === "ativo" ? "expirado" : "inativo"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
