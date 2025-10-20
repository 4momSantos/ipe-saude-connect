import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, X } from "lucide-react";
import { useUpdateHorarios } from "@/hooks/useUpdateHorarios";

interface Horario {
  dia_semana: string;
  horario_inicio: string;
  horario_fim: string;
}

interface HorariosEditorProps {
  credenciadoCrmId: string;
  horariosAtuais: Horario[];
  onCancel: () => void;
}

const diasSemanaOptions = [
  { value: "Domingo", label: "Domingo" },
  { value: "Segunda", label: "Segunda-feira" },
  { value: "Terça", label: "Terça-feira" },
  { value: "Quarta", label: "Quarta-feira" },
  { value: "Quinta", label: "Quinta-feira" },
  { value: "Sexta", label: "Sexta-feira" },
  { value: "Sábado", label: "Sábado" },
];

export function HorariosEditor({ credenciadoCrmId, horariosAtuais, onCancel }: HorariosEditorProps) {
  const [horarios, setHorarios] = useState<Horario[]>(
    horariosAtuais.length > 0 
      ? horariosAtuais 
      : [{ dia_semana: "Segunda", horario_inicio: "08:00", horario_fim: "18:00" }]
  );
  const { mutate: updateHorarios, isPending } = useUpdateHorarios();

  const handleAddHorario = () => {
    setHorarios([...horarios, { dia_semana: "Segunda", horario_inicio: "08:00", horario_fim: "18:00" }]);
  };

  const handleRemoveHorario = (index: number) => {
    setHorarios(horarios.filter((_, i) => i !== index));
  };

  const handleUpdateHorario = (index: number, field: keyof Horario, value: string) => {
    const newHorarios = [...horarios];
    newHorarios[index] = { ...newHorarios[index], [field]: value };
    setHorarios(newHorarios);
  };

  const handleSave = () => {
    updateHorarios(
      { credenciadoCrmId, horarios },
      {
        onSuccess: () => {
          onCancel();
        }
      }
    );
  };

  return (
    <div className="space-y-4 p-4 border border-primary/50 rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Editando Horários</h4>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isPending || horarios.length === 0}
          >
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {horarios.map((horario, index) => (
          <div key={index} className="flex gap-2 items-center p-3 bg-card rounded-md">
            <Select
              value={horario.dia_semana}
              onValueChange={(value) => handleUpdateHorario(index, "dia_semana", value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {diasSemanaOptions.map((dia) => (
                  <SelectItem key={dia.value} value={dia.value}>
                    {dia.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="time"
              value={horario.horario_inicio}
              onChange={(e) => handleUpdateHorario(index, "horario_inicio", e.target.value)}
              className="w-32"
            />

            <span className="text-muted-foreground">até</span>

            <Input
              type="time"
              value={horario.horario_fim}
              onChange={(e) => handleUpdateHorario(index, "horario_fim", e.target.value)}
              className="w-32"
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveHorario(index)}
              disabled={horarios.length === 1}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleAddHorario}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-1" />
        Adicionar Horário
      </Button>
    </div>
  );
}
