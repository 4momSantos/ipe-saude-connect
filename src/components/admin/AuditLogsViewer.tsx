import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Shield,
  UserPlus,
  UserMinus,
  Edit,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface AuditLogsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

const actionIcons: Record<string, any> = {
  role_assigned: UserPlus,
  role_removed: UserMinus,
  role_updated: Edit,
  solicitacao_created: FileText,
  solicitacao_status_changed: Shield,
};

const actionLabels: Record<string, string> = {
  role_assigned: 'Role Atribuída',
  role_removed: 'Role Removida',
  role_updated: 'Role Atualizada',
  solicitacao_created: 'Solicitação Criada',
  solicitacao_status_changed: 'Status Alterado',
  solicitacao_updated: 'Solicitação Atualizada',
};

const actionColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  role_assigned: 'default',
  role_removed: 'destructive',
  role_updated: 'secondary',
  solicitacao_created: 'default',
  solicitacao_status_changed: 'secondary',
};

export function AuditLogsViewer({
  open,
  onOpenChange,
  userId,
  userName,
}: AuditLogsViewerProps) {
  const { data: logs, isLoading } = useAuditLogs(userId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>Histórico de Auditoria</SheetTitle>
          <SheetDescription>
            Registro de atividades de {userName}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse">Carregando logs...</div>
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log, index) => {
                const Icon = actionIcons[log.action] || AlertCircle;
                const timeAgo = formatDistanceToNow(new Date(log.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                });

                return (
                  <div key={log.id}>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        {index < logs.length - 1 && (
                          <div className="mt-2 h-full w-0.5 bg-border" />
                        )}
                      </div>

                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">
                              {actionLabels[log.action] || log.action}
                            </p>
                            <p className="text-sm text-muted-foreground">{timeAgo}</p>
                          </div>
                          <Badge variant={actionColors[log.action] || 'default'}>
                            {log.resource_type}
                          </Badge>
                        </div>

                        {log.new_values && (
                          <div className="mt-2 rounded-lg bg-muted p-3 text-xs">
                            <p className="font-medium mb-1">Alterações:</p>
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(log.new_values, null, 2)}
                            </pre>
                          </div>
                        )}

                        {log.old_values && (
                          <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs">
                            <p className="font-medium mb-1">Valores anteriores:</p>
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(log.old_values, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                    {index < logs.length - 1 && <Separator className="my-2" />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum registro de auditoria encontrado
              </p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
