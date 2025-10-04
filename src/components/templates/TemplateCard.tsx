import { useState } from "react";
import { Copy, Edit, Eye, MoreVertical, Power, Shield, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { TemplatePreview } from "./TemplatePreview";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    description: string;
    fields: any[];
    category: string;
    tags: string[];
    is_active: boolean;
    is_system?: boolean;
    usage_count: number;
    updated_at: string;
  };
  onEdit: (id: string) => void;
  onDuplicate: (template: any) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
}

export function TemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
}: TemplateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleDelete = () => {
    onDelete(template.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="line-clamp-1">{template.name}</CardTitle>
              <CardDescription className="line-clamp-2 mt-1">
                {template.description || "Sem descrição"}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background">
                <DropdownMenuItem onClick={() => onEdit(template.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPreview(true)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(template)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onToggleActive(template.id, template.is_active)}
                >
                  <Power className="mr-2 h-4 w-4" />
                  {template.is_active ? "Desativar" : "Ativar"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenuItem
                          onClick={() => !template.is_system && setShowDeleteDialog(true)}
                          className="text-destructive"
                          disabled={template.is_system}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </div>
                    </TooltipTrigger>
                    {template.is_system && (
                      <TooltipContent>
                        <p>Templates padrão não podem ser excluídos</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={template.is_active ? "default" : "secondary"}>
                {template.is_active ? "Ativo" : "Inativo"}
              </Badge>
              {template.is_system && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  <Shield className="w-3 h-3 mr-1" />
                  Template Padrão
                </Badge>
              )}
              {template.category && (
                <Badge variant="outline">{template.category}</Badge>
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{template.fields?.length || 0} campos</span>
              <span>{template.usage_count || 0} uso(s)</span>
            </div>

            {template.tags && template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {template.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{template.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground">
          Atualizado em {new Date(template.updated_at).toLocaleDateString("pt-BR")}
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{template.name}"? Esta ação não pode ser desfeita.
              {template.usage_count > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Atenção: Este template está sendo usado em {template.usage_count} workflow(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <TemplatePreview
            name={template.name}
            description={template.description}
            fields={template.fields}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
