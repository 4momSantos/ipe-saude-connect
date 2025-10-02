import { useState } from "react";
import { FileText, Download, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateCredentialCertificate, generateDigitalContract, downloadDocument, ProviderData } from "@/lib/document-generator";
import { toast } from "sonner";

interface DocumentGeneratorProps {
  providerData: Partial<ProviderData>;
  isComplete?: boolean;
}

export function DocumentGenerator({ providerData, isComplete = false }: DocumentGeneratorProps) {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerateCertificate = async () => {
    if (!isComplete) {
      toast.error("Complete todos os campos antes de gerar o certificado");
      return;
    }

    setGenerating("certificate");
    
    // Simulate generation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const certificate = generateCredentialCertificate(providerData as ProviderData);
    downloadDocument(certificate, `certificado-credenciamento-${Date.now()}.txt`);
    
    setGenerating(null);
    toast.success("Certificado gerado com sucesso!");
  };

  const handleGenerateContract = async () => {
    if (!isComplete) {
      toast.error("Complete todos os campos antes de gerar o contrato");
      return;
    }

    setGenerating("contract");
    
    // Simulate generation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const contract = generateDigitalContract(providerData as ProviderData);
    downloadDocument(contract, `contrato-digital-${Date.now()}.txt`);
    
    setGenerating(null);
    toast.success("Contrato gerado com sucesso!");
  };

  return (
    <Card className="border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Geração de Documentos Oficiais
        </CardTitle>
        <CardDescription>
          Gere automaticamente certificados e contratos digitais
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50 hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Certificado de Credenciamento
                </h4>
                <p className="text-xs text-muted-foreground">
                  Documento oficial de habilitação
                </p>
              </div>
              {isComplete && (
                <CheckCircle className="h-4 w-4 text-[hsl(var(--green-approved))]" />
              )}
            </div>
            <Button
              onClick={handleGenerateCertificate}
              disabled={!isComplete || generating === "certificate"}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="sm"
            >
              {generating === "certificate" ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin mr-2" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Gerar Certificado
                </>
              )}
            </Button>
          </div>

          <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50 hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Contrato Digital
                </h4>
                <p className="text-xs text-muted-foreground">
                  Contrato de prestação de serviços
                </p>
              </div>
              {isComplete && (
                <CheckCircle className="h-4 w-4 text-[hsl(var(--green-approved))]" />
              )}
            </div>
            <Button
              onClick={handleGenerateContract}
              disabled={!isComplete || generating === "contract"}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="sm"
            >
              {generating === "contract" ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin mr-2" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Gerar Contrato
                </>
              )}
            </Button>
          </div>
        </div>

        {!isComplete && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Complete todos os campos e valide os documentos para gerar os documentos oficiais
          </p>
        )}
      </CardContent>
    </Card>
  );
}
