import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TriggerConfig } from "@/types/workflow-editor";

interface TriggerConfigPanelProps {
  config: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
}

export function TriggerConfigPanel({ config, onChange }: TriggerConfigPanelProps) {
  const updateConfig = (updates: Partial<TriggerConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Tipo de Gatilho</Label>
        <Select
          value={config.type}
          onValueChange={(value: TriggerConfig["type"]) => 
            updateConfig({ type: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="database">📊 Evento de Banco de Dados</SelectItem>
            <SelectItem value="webhook">🔗 Webhook HTTP</SelectItem>
            <SelectItem value="manual">👆 Execução Manual</SelectItem>
            <SelectItem value="schedule">⏰ Agendamento (Cron)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Define como o workflow será iniciado
        </p>
      </div>

      {config.type === "database" && (
        <>
          <div>
            <Label>Tabela</Label>
            <Select
              value={config.table || ""}
              onValueChange={(value) => updateConfig({ table: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inscricoes_edital">inscricoes_edital</SelectItem>
                <SelectItem value="credenciados">credenciados</SelectItem>
                <SelectItem value="solicitacoes_alteracao">solicitacoes_alteracao</SelectItem>
                <SelectItem value="editais">editais</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Evento</Label>
            <Select
              value={config.event || ""}
              onValueChange={(value: TriggerConfig["event"]) => 
                updateConfig({ event: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INSERT">INSERT - Novo registro</SelectItem>
                <SelectItem value="UPDATE">UPDATE - Registro atualizado</SelectItem>
                <SelectItem value="DELETE">DELETE - Registro excluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Condições (JSON)</Label>
            <Textarea
              value={JSON.stringify(config.conditions || {}, null, 2)}
              onChange={(e) => {
                try {
                  const conditions = JSON.parse(e.target.value);
                  updateConfig({ conditions });
                } catch (error) {
                  // Invalid JSON - não atualizar
                }
              }}
              placeholder='{\n  "status": "pendente_workflow"\n}'
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Condições que devem ser satisfeitas para iniciar o workflow
            </p>
          </div>
        </>
      )}

      {config.type === "webhook" && (
        <div>
          <Label>URL do Webhook</Label>
          <Input
            value={config.webhookUrl || ""}
            onChange={(e) => updateConfig({ webhookUrl: e.target.value })}
            placeholder="https://api.exemplo.com/webhook"
          />
          <p className="text-xs text-muted-foreground mt-1">
            URL que receberá requisições POST para iniciar o workflow
          </p>
        </div>
      )}

      {config.type === "schedule" && (
        <div>
          <Label>Expressão Cron</Label>
          <Input
            value={config.schedule || ""}
            onChange={(e) => updateConfig({ schedule: e.target.value })}
            placeholder="0 9 * * *"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Expressão cron para execução agendada (ex: "0 9 * * *" = todo dia às 9h)
          </p>
        </div>
      )}

      {config.type === "manual" && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Este workflow será executado manualmente através da interface ou API.
            Não requer configuração adicional.
          </p>
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          💡 <strong>Dica:</strong> A configuração do gatilho define quando e como o workflow será iniciado automaticamente.
        </p>
      </div>
    </div>
  );
}
