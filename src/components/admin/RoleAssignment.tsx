import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/hooks/useUserRole';
import { useRoleManagement } from '@/hooks/useRoleManagement';
import { Shield, User, Users, Crown } from 'lucide-react';

interface RoleAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentRoles: string[];
}

const roleIcons = {
  candidato: User,
  analista: Users,
  gestor: Shield,
  admin: Crown,
};

const roleLabels = {
  candidato: 'Candidato',
  analista: 'Analista',
  gestor: 'Gestor',
  admin: 'Administrador',
};

const roleDescriptions = {
  candidato: 'Pode se candidatar a editais e visualizar suas inscrições',
  analista: 'Pode analisar inscrições e gerenciar processos',
  gestor: 'Pode gerenciar credenciados e configurações',
  admin: 'Acesso total ao sistema incluindo gerenciamento de usuários',
};

export function RoleAssignment({
  open,
  onOpenChange,
  userId,
  userName,
  currentRoles,
}: RoleAssignmentProps) {
  const [selectedRoles, setSelectedRoles] = useState<Set<UserRole>>(
    new Set(currentRoles as UserRole[])
  );
  const { assignRole, removeRole, isAssigning, isRemoving } = useRoleManagement();

  const allRoles: UserRole[] = ['candidato', 'analista', 'gestor', 'admin'];

  const handleToggleRole = (role: UserRole) => {
    const newRoles = new Set(selectedRoles);
    if (newRoles.has(role)) {
      newRoles.delete(role);
    } else {
      newRoles.add(role);
    }
    setSelectedRoles(newRoles);
  };

  const handleSave = () => {
    const currentRoleSet = new Set(currentRoles);

    // Add new roles
    selectedRoles.forEach((role) => {
      if (!currentRoleSet.has(role)) {
        assignRole({ userId, role });
      }
    });

    // Remove old roles
    currentRoleSet.forEach((role) => {
      if (!selectedRoles.has(role as UserRole)) {
        removeRole({ userId, role: role as UserRole });
      }
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Roles</DialogTitle>
          <DialogDescription>
            Configure as permissões de acesso para {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {allRoles.map((role) => {
            const Icon = roleIcons[role];
            const isSelected = selectedRoles.has(role);

            return (
              <div
                key={role}
                className="flex items-start space-x-3 rounded-lg border border-border p-4 transition-colors hover:bg-accent/50"
              >
                <Checkbox
                  id={role}
                  checked={isSelected}
                  onCheckedChange={() => handleToggleRole(role)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={role}
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                  >
                    <Icon className="h-4 w-4" />
                    {roleLabels[role]}
                    {currentRoles.includes(role) && (
                      <Badge variant="secondary" className="text-xs">
                        Atual
                      </Badge>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {roleDescriptions[role]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAssigning || isRemoving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isAssigning || isRemoving}
          >
            {isAssigning || isRemoving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
