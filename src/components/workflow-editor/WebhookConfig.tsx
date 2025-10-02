import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { WebhookConfig } from "@/types/workflow-editor";
import { Card } from "@/components/ui/card";

interface WebhookConfigProps {
  config: WebhookConfig;
  onChange: (config: WebhookConfig) => void;
}

export function WebhookConfigPanel({ config, onChange }: WebhookConfigProps) {
  const addHeader = () => {
    const headers = config.headers || {};
    headers[`header-${Date.now()}`] = "";
    onChange({ ...config, headers });
  };

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const headers = { ...config.headers };
    delete headers[oldKey];
    if (newKey) headers[newKey] = value;
    onChange({ ...config, headers });
  };

  const removeHeader = (key: string) => {
    const headers = { ...config.headers };
    delete headers[key];
    onChange({ ...config, headers });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>URL do Webhook</Label>
        <Input
          value={config.url || ""}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          placeholder="https://api.exemplo.com/webhook"
        />
        <p className="text-xs text-muted-foreground">
          Esta URL será chamada quando o workflow chegar nesta etapa
        </p>
      </div>

      <div className="space-y-2">
        <Label>Método HTTP</Label>
        <Select
          value={config.method}
          onValueChange={(value: "GET" | "POST") => onChange({ ...config, method: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Headers Personalizados</Label>
          <Button size="sm" variant="outline" onClick={addHeader}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
        
        {config.headers && Object.entries(config.headers).map(([key, value]) => (
          <Card key={key} className="p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Nome do header"
                value={key.startsWith("header-") ? "" : key}
                onChange={(e) => updateHeader(key, e.target.value, value)}
                className="flex-1"
              />
              <Input
                placeholder="Valor"
                value={value}
                onChange={(e) => updateHeader(key, key, e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeHeader(key)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
