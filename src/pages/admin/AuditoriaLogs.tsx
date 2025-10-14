import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AuditoriaLogs() {
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', userFilter, actionFilter, resourceFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (userFilter) {
        query = query.ilike('user_email', `%${userFilter}%`);
      }
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      if (resourceFilter !== 'all') {
        query = query.eq('resource_type', resourceFilter);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      'create': 'bg-green-500',
      'update': 'bg-blue-500',
      'delete': 'bg-red-500',
      'login': 'bg-purple-500',
      'role_assigned': 'bg-orange-500'
    };
    return <Badge className={colors[action] || 'bg-gray-500'}>{action}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Auditoria de Sistema</h1>
        <p className="text-muted-foreground">Visualize todas as ações realizadas no sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Usuário</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Email do usuário..."
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Ação</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="create">Criar</SelectItem>
                  <SelectItem value="update">Atualizar</SelectItem>
                  <SelectItem value="delete">Deletar</SelectItem>
                  <SelectItem value="role_assigned">Atribuir Role</SelectItem>
                  <SelectItem value="credenciado_status_changed">Mudança de Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Recurso</label>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="credenciado">Credenciado</SelectItem>
                  <SelectItem value="user_role">Role</SelectItem>
                  <SelectItem value="inscricao">Inscrição</SelectItem>
                  <SelectItem value="contrato">Contrato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">De</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Até</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs de Auditoria ({logs?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando logs...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{log.user_email || 'Sistema'}</TableCell>
                    <TableCell><Badge variant="outline">{log.user_role || 'N/A'}</Badge></TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{log.resource_type}</code>
                    </TableCell>
                    <TableCell>
                      {log.metadata && (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-muted-foreground">Ver JSON</summary>
                          <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto max-w-md">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}