import { useState } from "react";
import { AlertCircle, Users, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ValidationBadge } from "@/components/ValidationBadge";
import { validateCPF, validateCNPJ } from "@/lib/validators";

interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingRecords?: {
    id: string;
    name: string;
    cpfCnpj: string;
    registrationDate: string;
    status: string;
  }[];
  message?: string;
}

interface DuplicateCheckerProps {
  cpfCnpj: string;
  onCheckComplete?: (result: DuplicateCheckResult) => void;
}

export function DuplicateChecker({ cpfCnpj, onCheckComplete }: DuplicateCheckerProps) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<DuplicateCheckResult | null>(null);

  const checkDuplicate = async () => {
    setChecking(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock duplicate check - in real app, this would query the database
    const hasDuplicate = Math.random() > 0.7; // 30% chance of duplicate
    
    const checkResult: DuplicateCheckResult = hasDuplicate
      ? {
          isDuplicate: true,
          existingRecords: [
            {
              id: "REG-001",
              name: "João Silva Santos",
              cpfCnpj: cpfCnpj,
              registrationDate: "15/01/2024",
              status: "Ativo",
            },
          ],
          message: "Cadastro duplicado encontrado no sistema",
        }
      : {
          isDuplicate: false,
          message: "Nenhuma duplicidade encontrada",
        };

    setResult(checkResult);
    setChecking(false);
    onCheckComplete?.(checkResult);
  };

  // Auto-check when CPF/CNPJ is valid
  useState(() => {
    if (cpfCnpj && (validateCPF(cpfCnpj) || validateCNPJ(cpfCnpj))) {
      checkDuplicate();
    }
  });

  if (!result && !checking) return null;

  return (
    <Card className="border bg-card animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Verificação de Duplicidade
            </CardTitle>
            <CardDescription>
              Prevenção automática de cadastros duplicados
            </CardDescription>
          </div>
          {checking ? (
            <ValidationBadge status="processing" label="Verificando..." />
          ) : result?.isDuplicate ? (
            <ValidationBadge status="invalid" label="Duplicado" />
          ) : (
            <ValidationBadge status="valid" label="OK" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {checking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span>Verificando base de dados...</span>
          </div>
        ) : result?.isDuplicate ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-[hsl(var(--red-rejected)_/_0.1)] border border-[hsl(var(--red-rejected)_/_0.3)] rounded-lg">
              <AlertCircle className="h-5 w-5 text-[hsl(var(--red-rejected))] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">
                  {result.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  Encontramos {result.existingRecords?.length} registro(s) com o mesmo CPF/CNPJ
                </p>
              </div>
            </div>

            {result.existingRecords && result.existingRecords.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Cadastros Existentes
                </p>
                {result.existingRecords.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 bg-muted/50 rounded-lg border border-border space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{record.name}</p>
                      <ValidationBadge status="valid" label={record.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">CPF/CNPJ:</span> {record.cpfCnpj}
                      </div>
                      <div>
                        <span className="font-medium">Cadastro:</span> {record.registrationDate}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-[hsl(var(--green-approved)_/_0.1)] border border-[hsl(var(--green-approved)_/_0.3)] rounded-lg">
            <Shield className="h-5 w-5 text-[hsl(var(--green-approved))] flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {result?.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Este CPF/CNPJ não consta em nossa base de dados
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
