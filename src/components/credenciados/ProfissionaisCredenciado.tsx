import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit2, Trash2, UserCheck, Stethoscope, AlertCircle, Mail, Phone } from "lucide-react";
import { useProfissionais, useRemoverProfissional, type Profissional } from "@/hooks/useProfissionais";
import { AdicionarProfissionalDialog } from "./AdicionarProfissionalDialog";
import { EditarProfissionalDialog } from "./EditarProfissionalDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProfissionaisCredenciadoProps {
  credenciadoId: string;
  isCNPJ: boolean;
}

export function ProfissionaisCredenciado({ credenciadoId, isCNPJ }: ProfissionaisCredenciadoProps) {
  const { data: profissionais, isLoading } = useProfissionais(credenciadoId);
  const { mutate: removerProfissional } = useRemoverProfissional();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [profissionalToEdit, setProfissionalToEdit] = useState<Profissional | null>(null);
  const [profissionalToDelete, setProfissionalToDelete] = useState<string | null>(null);

  if (!isCNPJ) {
    return null;
  }

  const handleDelete = () => {
    if (profissionalToDelete) {
      removerProfissional({ id: profissionalToDelete, credenciadoId });
      setProfissionalToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="card-glow">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="card-glow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Profissionais Vinculados
              </CardTitle>
              <CardDescription>
                Médicos que atuam neste credenciado
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Profissional
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!profissionais || profissionais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum profissional vinculado
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Este credenciado ainda não possui profissionais médicos vinculados ao seu cadastro.
              </p>
              <Button onClick={() => setDialogOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar primeiro profissional
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {profissionais.map((prof) => (
                <div
                  key={prof.id}
                  className="rounded-lg border border-border bg-card p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{prof.nome}</h3>
                        {prof.principal && (
                          <Badge variant="secondary" className="text-xs">
                            Principal
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        <p>
                          <span className="font-medium">CPF:</span> {prof.cpf}
                        </p>
                        {prof.rg && (
                          <p>
                            <span className="font-medium">RG:</span> {prof.rg}
                          </p>
                        )}
                        {prof.crm && (
                          <p className="flex items-center gap-1">
                            <Stethoscope className="h-3 w-3" />
                            CRM: {prof.crm}-{prof.uf_crm}
                          </p>
                        )}
                        {prof.especialidade && (
                          <p>
                            <span className="font-medium">Especialidade:</span> {prof.especialidade}
                          </p>
                        )}
                        {prof.email && (
                          <p className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {prof.email}
                          </p>
                        )}
                        {prof.telefone && (
                          <p className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {prof.telefone}
                          </p>
                        )}
                        {prof.celular && (
                          <p className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {prof.celular}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Editar"
                        onClick={() => {
                          setProfissionalToEdit(prof);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      {!prof.principal && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Remover"
                          onClick={() => setProfissionalToDelete(prof.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AdicionarProfissionalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        credenciadoId={credenciadoId}
      />

      <EditarProfissionalDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setProfissionalToEdit(null);
        }}
        profissional={profissionalToEdit}
      />

      <AlertDialog open={!!profissionalToDelete} onOpenChange={() => setProfissionalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este profissional? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
