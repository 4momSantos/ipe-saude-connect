import { useState } from "react";
import { useEspecialidades, useCreateEspecialidade } from "@/hooks/useEspecialidades";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface EspecialidadesSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  minSelection?: number;
  allowCreate?: boolean;
}

export function EspecialidadesSelector({
  selectedIds,
  onChange,
  minSelection = 1,
  allowCreate = true,
}: EspecialidadesSelectorProps) {
  const { data: especialidades, isLoading } = useEspecialidades();
  const createMutation = useCreateEspecialidade();
  const [searchTerm, setSearchTerm] = useState("");
  const [novaEspecialidade, setNovaEspecialidade] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredEspecialidades = especialidades?.filter((esp) =>
    esp.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      // Não permitir desmarcar se atingir o mínimo
      if (selectedIds.length <= minSelection) {
        toast.error(`Selecione ao menos ${minSelection} especialidade(s)`);
        return;
      }
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleCreate = async () => {
    if (!novaEspecialidade.trim()) {
      toast.error("Digite o nome da especialidade");
      return;
    }

    try {
      const nova = await createMutation.mutateAsync(novaEspecialidade.trim());
      onChange([...selectedIds, nova.id]);
      toast.success("Especialidade criada com sucesso!");
      setNovaEspecialidade("");
      setDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao criar especialidade");
      console.error(error);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando especialidades...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar especialidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {allowCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Especialidade</DialogTitle>
                <DialogDescription>
                  Adicione uma nova especialidade médica ao sistema
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Especialidade</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Cirurgia Plástica"
                    value={novaEspecialidade}
                    onChange={(e) => setNovaEspecialidade(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Criando..." : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const esp = especialidades?.find((e) => e.id === id);
            return esp ? (
              <Badge key={id} variant="secondary">
                {esp.nome}
              </Badge>
            ) : null;
          })}
        </div>
      )}

      <ScrollArea className="h-[300px] rounded-md border p-4">
        <div className="space-y-3">
          {filteredEspecialidades?.map((especialidade) => (
            <div key={especialidade.id} className="flex items-center space-x-2">
              <Checkbox
                id={especialidade.id}
                checked={selectedIds.includes(especialidade.id)}
                onCheckedChange={() => handleToggle(especialidade.id)}
              />
              <Label
                htmlFor={especialidade.id}
                className="flex-1 cursor-pointer text-sm font-normal"
              >
                {especialidade.nome}
                {especialidade.codigo && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({especialidade.codigo})
                  </span>
                )}
              </Label>
            </div>
          ))}
          {filteredEspecialidades?.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma especialidade encontrada
            </p>
          )}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        {selectedIds.length} especialidade(s) selecionada(s)
        {minSelection > 0 && ` • Mínimo: ${minSelection}`}
      </p>
    </div>
  );
}
