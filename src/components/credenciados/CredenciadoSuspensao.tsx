import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CredenciadoSuspensaoProps {
  credenciado: {
    id: string;
    status: string;
    suspensao_inicio: string | null;
    suspensao_fim: string | null;
    motivo_suspensao: string | null;
    suspensao_automatica: boolean | null;
  };
}

export function CredenciadoSuspensao({ credenciado }: CredenciadoSuspensaoProps) {
  const queryClient = useQueryClient();

  if (credenciado.status !== 'Suspenso') {
    return null;
  }

  const handleLevantarSuspensao = async () => {
    const { error } = await supabase
      .from('credenciados')
      .update({
        status: 'Ativo',
        suspensao_inicio: null,
        suspensao_fim: null,
        motivo_suspensao: null,
        suspensao_automatica: false
      })
      .eq('id', credenciado.id);

    if (error) {
      toast.error("Erro ao levantar suspensão");
      return;
    }

    toast.success("Suspensão levantada com sucesso");
    queryClient.invalidateQueries({ queryKey: ['credenciado', credenciado.id] });
  };

  const diasRestantes = credenciado.suspensao_fim 
    ? Math.ceil((new Date(credenciado.suspensao_fim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Credenciado Suspenso
        {credenciado.suspensao_automatica && (
          <Badge variant="outline">Suspensão Automática</Badge>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
          <div>
            <span className="font-semibold">Início:</span>{' '}
            {credenciado.suspensao_inicio 
              ? new Date(credenciado.suspensao_inicio).toLocaleDateString('pt-BR')
              : 'N/A'}
          </div>
          {credenciado.suspensao_fim && (
            <div>
              <span className="font-semibold">Fim:</span>{' '}
              {new Date(credenciado.suspensao_fim).toLocaleDateString('pt-BR')}
              {diasRestantes && diasRestantes > 0 && (
                <span className="ml-2 text-muted-foreground">
                  ({diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'} restantes)
                </span>
              )}
            </div>
          )}
        </div>
        {credenciado.motivo_suspensao && (
          <p className="text-sm mt-2">
            <span className="font-semibold">Motivo:</span> {credenciado.motivo_suspensao}
          </p>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3"
          onClick={handleLevantarSuspensao}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Levantar Suspensão
        </Button>
      </AlertDescription>
    </Alert>
  );
}
