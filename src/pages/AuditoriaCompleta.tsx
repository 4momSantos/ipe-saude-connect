import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileDown, Eye } from 'lucide-react';
import { useAuditTrail, useAuditStats } from '@/hooks/useAuditTrail';

export default function AuditoriaCompleta() {
  const [filters, setFilters] = useState({
    resource_type: '',
    action: '',
    start_date: '',
    end_date: '',
  });
  const [selectedLog, setSelectedLog] = useState<any>(null);
  
  const { data: logs, isLoading } = useAuditTrail(filters);
  const { data: stats } = useAuditStats();

  const exportToCSV = () => {
    if (!logs) return;
    
    const headers = ['Timestamp', 'Usuário', 'Ação', 'Recurso', 'ID'];
    const rows = logs.map((log) => [
      new Date(log.created_at).toLocaleString('pt-BR'),
      log.user_email || 'Sistema',
      log.action,
      log.resource_type,
      log.resource_id || '-',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Auditoria Completa</h1>
          <p className="text-muted-foreground">Trilhas de auditoria de todas as ações do sistema</p>
        </div>
        <Button onClick={exportToCSV} disabled={!logs || logs.length === 0}>
          <FileDown className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total de Eventos</CardTitle>
              <CardDescription>Últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Ações mais Comuns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(stats.byAction)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([action, count]) => (
                    <div key={action} className="flex justify-between text-sm">
                      <span>{action}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recursos mais Modificados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(stats.byResource)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([resource, count]) => (
                    <div key={resource} className="flex justify-between text-sm">
                      <span>{resource}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Tipo de Recurso</Label>
              <Select value={filters.resource_type} onValueChange={(v) => setFilters({ ...filters, resource_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="inscricao">Inscrição</SelectItem>
                  <SelectItem value="edital">Edital</SelectItem>
                  <SelectItem value="contrato">Contrato</SelectItem>
                  <SelectItem value="credenciado">Credenciado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ação</Label>
              <Select value={filters.action} onValueChange={(v) => setFilters({ ...filters, action: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="created">Criação</SelectItem>
                  <SelectItem value="updated">Atualização</SelectItem>
                  <SelectItem value="deleted">Exclusão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs de Auditoria</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>ID do Recurso</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.created_at).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.user_email || 'Sistema'}</p>
                        {log.user_role && <p className="text-xs text-muted-foreground">{log.user_role}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge>{log.action}</Badge>
                    </TableCell>
                    <TableCell>{log.resource_type}</TableCell>
                    <TableCell>
                      <code className="text-xs">{log.resource_id?.substring(0, 8) || '-'}</code>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setSelectedLog(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum log encontrado</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Log de Auditoria</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Timestamp</Label>
                  <p>{new Date(selectedLog.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <Label>Usuário</Label>
                  <p>{selectedLog.user_email || 'Sistema'}</p>
                </div>
                <div>
                  <Label>Ação</Label>
                  <Badge>{selectedLog.action}</Badge>
                </div>
                <div>
                  <Label>Recurso</Label>
                  <p>{selectedLog.resource_type}</p>
                </div>
              </div>

              {selectedLog.old_values && (
                <div>
                  <Label>Valores Anteriores</Label>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <Label>Novos Valores</Label>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <Label>Metadados</Label>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
