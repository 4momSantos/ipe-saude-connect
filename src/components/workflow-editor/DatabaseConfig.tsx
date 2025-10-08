import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { DatabaseConfig } from "@/types/workflow-editor";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DatabaseConfigProps {
  config: DatabaseConfig;
  onChange: (config: DatabaseConfig) => void;
}

export function DatabaseConfigPanel({ config, onChange }: DatabaseConfigProps) {
  const addCondition = () => {
    const conditions = config.conditions || [];
    conditions.push({
      field: "",
      operator: "equals",
      value: "",
    });
    onChange({ ...config, conditions });
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const conditions = [...(config.conditions || [])];
    conditions[index] = { ...conditions[index], [field]: value };
    onChange({ ...config, conditions });
  };

  const removeCondition = (index: number) => {
    const conditions = (config.conditions || []).filter((_, i) => i !== index);
    onChange({ ...config, conditions });
  };

  const addField = () => {
    const fields = config.fields || {};
    fields[`campo-${Date.now()}`] = "";
    onChange({ ...config, fields });
  };

  const updateField = (oldKey: string, newKey: string, value: string) => {
    const fields = { ...config.fields };
    delete fields[oldKey];
    if (newKey) fields[newKey] = value;
    onChange({ ...config, fields });
  };

  const removeField = (key: string) => {
    const fields = { ...config.fields };
    delete fields[key];
    onChange({ ...config, fields });
  };

  return (
    <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
      <div className="space-y-4">
      <div className="space-y-2">
        <Label>Operação</Label>
        <Select
          value={config.operation}
          onValueChange={(value: any) => onChange({ ...config, operation: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="insert">Inserir (INSERT)</SelectItem>
            <SelectItem value="update">Atualizar (UPDATE)</SelectItem>
            <SelectItem value="select">Consultar (SELECT)</SelectItem>
            <SelectItem value="delete">Deletar (DELETE)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tabela</Label>
        <Input
          value={config.table || ""}
          onChange={(e) => onChange({ ...config, table: e.target.value })}
          placeholder="nome_da_tabela"
        />
      </div>

      {(config.operation === "insert" || config.operation === "update") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Campos e Valores</Label>
            <Button size="sm" variant="outline" onClick={addField}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>

          {config.fields && Object.entries(config.fields).map(([key, value]) => (
            <Card key={key} className="p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do campo"
                  value={key.startsWith("campo-") ? "" : key}
                  onChange={(e) => updateField(key, e.target.value, value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Valor ou {variavel}"
                  value={value}
                  onChange={(e) => updateField(key, key, e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeField(key)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(config.operation === "update" || config.operation === "select" || config.operation === "delete") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Condições (WHERE)</Label>
            <Button size="sm" variant="outline" onClick={addCondition}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>

          {config.conditions?.map((condition, index) => (
            <Card key={index} className="p-3">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Campo"
                    value={condition.field}
                    onChange={(e) => updateCondition(index, "field", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeCondition(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                
                <Select
                  value={condition.operator}
                  onValueChange={(value) => updateCondition(index, "operator", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Igual (=)</SelectItem>
                    <SelectItem value="not_equals">Diferente (≠)</SelectItem>
                    <SelectItem value="greater_than">Maior que (&gt;)</SelectItem>
                    <SelectItem value="less_than">Menor que (&lt;)</SelectItem>
                    <SelectItem value="contains">Contém (LIKE)</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Valor"
                  value={condition.value}
                  onChange={(e) => updateCondition(index, "value", e.target.value)}
                />
              </div>
            </Card>
          ))}

          {(!config.conditions || config.conditions.length === 0) && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Nenhuma condição definida
            </div>
          )}
        </div>
      )}
      </div>
    </ScrollArea>
  );
}
