import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useProfissionaisCredenciado } from '@/hooks/useProfissionaisCredenciado';
import { UserPlus, User, Stethoscope, Phone, Mail } from 'lucide-react';

interface ProfissionaisCredenciadoTabProps {
  credenciadoId: string;
}

export function ProfissionaisCredenciadoTab({ credenciadoId }: ProfissionaisCredenciadoTabProps) {
  const { data: profissionais, isLoading } = useProfissionaisCredenciado(credenciadoId);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando profissionais...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Profissionais Credenciados</h2>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Solicitar Inclusão
        </Button>
      </div>

      {!profissionais || profissionais.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum profissional cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profissionais.map((prof) => (
            <Card key={prof.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {prof.nome?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{prof.nome}</h3>
                      {prof.principal && (
                        <Badge variant="default" className="text-xs">Principal</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Stethoscope className="h-4 w-4" />
                        <span>CRM: {prof.crm}/{prof.uf_crm}</span>
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-medium">{prof.especialidade}</span>
                      </div>
                      {prof.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{prof.email}</span>
                        </div>
                      )}
                      {prof.telefone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{prof.telefone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
