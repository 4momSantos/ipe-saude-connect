import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatusBadge, StatusType } from "./StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

interface DocumentoHistoricoProps {
  documentoId: string;
}

export function DocumentoHistorico({ documentoId }: DocumentoHistoricoProps) {
  const { data: historico, isLoading } = useQuery({
    queryKey: ['historico-documento', documentoId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_documento_historico', {
        p_documento_id: documentoId
      });

      if (error) throw error;
      return data as Array<{
        id: string;
        data_alteracao: string;
        status_anterior: string | null;
        status_novo: string;
        tipo_alteracao: string;
        comentario: string | null;
        alterado_por_nome: string | null;
      }>;
    }
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <History className="h-4 w-4 mr-2" />
          Histórico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico de Alterações</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-96 pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : historico && historico.length > 0 ? (
            <div className="space-y-4">
              {historico.map((item) => (
                <div key={item.id} className="flex gap-4 border-l-2 border-muted pl-4 pb-4">
                  <div className="text-muted-foreground text-sm min-w-[130px]">
                    {format(new Date(item.data_alteracao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {item.status_anterior && (
                        <StatusBadge status={item.status_anterior as StatusType} compact />
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <StatusBadge status={item.status_novo as StatusType} compact />
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {item.tipo_alteracao === 'automatica' && '🤖 Atualização automática'}
                      {item.tipo_alteracao === 'upload_novo' && '📤 Novo documento enviado'}
                      {item.tipo_alteracao === 'correcao_manual' && 
                        `✏️ Editado por ${item.alterado_por_nome || 'Sistema'}`}
                      {item.tipo_alteracao === 'renovacao' && '🔄 Documento renovado'}
                      {item.tipo_alteracao === 'expiracao' && '⏰ Documento expirou'}
                    </div>
                    
                    {item.comentario && (
                      <p className="text-sm bg-muted/50 p-2 rounded">
                        {item.comentario}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mb-2 opacity-20" />
              <p>Nenhum histórico disponível</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
