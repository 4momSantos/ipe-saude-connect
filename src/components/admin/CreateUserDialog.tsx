import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TelefoneInput } from '@/components/credenciado/MaskedInputs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@/hooks/useUserRole';

const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  telefone: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  roles: z.array(z.string()).min(1, 'Selecione ao menos uma role'),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const availableRoles: { value: UserRole; label: string }[] = [
  { value: 'candidato', label: 'Candidato' },
  { value: 'analista', label: 'Analista' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'admin', label: 'Administrador' },
];

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      nome: '',
      telefone: '',
      password: '',
      roles: ['candidato'],
    },
  });

  const onSubmit = async (data: CreateUserForm) => {
    setIsCreating(true);
    try {
      // Create user via admin API
      const { data: newUser, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nome: data.nome,
            telefone: data.telefone,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;

      if (!newUser.user) {
        throw new Error('Erro ao criar usuário');
      }

      // Wait a bit for the profile trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Garantir que 'candidato' sempre está incluído (política de segurança)
      const rolesToAssign = Array.from(new Set([...data.roles, 'candidato']));

      // Assign roles (candidato já foi criado pela trigger, mas incluímos por segurança)
      const rolePromises = rolesToAssign.map(role =>
        supabase.from('user_roles').insert({
          user_id: newUser.user!.id,
          role: role as UserRole,
        })
      );

      await Promise.all(rolePromises);

      toast.success('Usuário criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>
            Adicione um novo usuário ao sistema e configure suas permissões
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="joao@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone (opcional)</FormLabel>
                  <FormControl>
                    <TelefoneInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roles"
              render={() => (
                <FormItem>
                  <FormLabel>Permissões</FormLabel>
                  <div className="space-y-2">
                    {availableRoles.map((role) => (
                      <FormField
                        key={role.value}
                        control={form.control}
                        name="roles"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(role.value)}
                                disabled={role.value === 'candidato'}
                                onCheckedChange={(checked) => {
                                  // Impedir desmarcação de candidato
                                  if (role.value === 'candidato') return;
                                  
                                  return checked
                                    ? field.onChange([...field.value, role.value])
                                    : field.onChange(
                                        field.value?.filter((val) => val !== role.value)
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {role.label}
                              {role.value === 'candidato' && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  (obrigatório)
                                </span>
                              )}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
