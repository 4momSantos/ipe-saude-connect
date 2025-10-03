import { useState } from 'react';
import { useUsers, useUserStats } from '@/hooks/useUsers';
import { RoleAssignment } from '@/components/admin/RoleAssignment';
import { AuditLogsViewer } from '@/components/admin/AuditLogsViewer';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Shield,
  FileText,
  Crown,
  User,
  TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const roleIcons = {
  candidato: User,
  analista: Users,
  gestor: Shield,
  admin: Crown,
};

const roleColors = {
  candidato: 'default' as const,
  analista: 'secondary' as const,
  gestor: 'default' as const,
  admin: 'destructive' as const,
};

export default function UserManagement() {
  const { users, isLoading } = useUsers();
  const { data: stats } = useUserStats();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    roles: string[];
  } | null>(null);
  const [auditUser, setAuditUser] = useState<{ id: string; name: string } | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredUsers = users?.filter(
    (user) =>
      user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
        <p className="text-muted-foreground">
          Gerencie usuários, permissões e visualize logs de auditoria
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analistas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.roleCount.analista || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gestores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.roleCount.gestor || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos (30 dias)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.newUsers || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            Lista completa de usuários com suas respectivas permissões
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => {
                  const timeAgo = formatDistanceToNow(new Date(user.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  });

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{getInitials(user.nome)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.nome || 'Sem nome'}</p>
                            {user.telefone && (
                              <p className="text-xs text-muted-foreground">{user.telefone}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => {
                            const Icon = roleIcons[role as keyof typeof roleIcons];
                            return (
                              <Badge
                                key={role}
                                variant={roleColors[role as keyof typeof roleColors]}
                                className="gap-1"
                              >
                                {Icon && <Icon className="h-3 w-3" />}
                                {role}
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{timeAgo}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                setSelectedUser({
                                  id: user.id,
                                  name: user.nome || user.email,
                                  roles: user.roles,
                                })
                              }
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Gerenciar Roles
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setAuditUser({
                                  id: user.id,
                                  name: user.nome || user.email,
                                })
                              }
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Ver Audit Logs
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedUser && (
        <RoleAssignment
          open={!!selectedUser}
          onOpenChange={(open) => !open && setSelectedUser(null)}
          userId={selectedUser.id}
          userName={selectedUser.name}
          currentRoles={selectedUser.roles}
        />
      )}

      {auditUser && (
        <AuditLogsViewer
          open={!!auditUser}
          onOpenChange={(open) => !open && setAuditUser(null)}
          userId={auditUser.id}
          userName={auditUser.name}
        />
      )}

      <CreateUserDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
