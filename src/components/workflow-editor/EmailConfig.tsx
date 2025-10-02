import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { EmailConfig } from "@/types/workflow-editor";

interface EmailConfigProps {
  config: EmailConfig;
  onChange: (config: EmailConfig) => void;
}

export function EmailConfigPanel({ config, onChange }: EmailConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Para (Email)</Label>
        <Input
          type="email"
          value={config.to || ""}
          onChange={(e) => onChange({ ...config, to: e.target.value })}
          placeholder="destinatario@exemplo.com"
        />
        <p className="text-xs text-muted-foreground">
          Você pode usar variáveis como {"{usuario.email}"}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Assunto</Label>
        <Input
          value={config.subject || ""}
          onChange={(e) => onChange({ ...config, subject: e.target.value })}
          placeholder="Assunto do email"
        />
      </div>

      <div className="space-y-2">
        <Label>Mensagem</Label>
        <Textarea
          value={config.body || ""}
          onChange={(e) => onChange({ ...config, body: e.target.value })}
          placeholder="Digite a mensagem do email..."
          rows={8}
        />
        <p className="text-xs text-muted-foreground">
          Você pode usar variáveis como {"{processo.nome}"} ou {"{usuario.nome}"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>CC (Cópia)</Label>
          <Input
            type="email"
            value={config.cc || ""}
            onChange={(e) => onChange({ ...config, cc: e.target.value })}
            placeholder="cc@exemplo.com"
          />
        </div>

        <div className="space-y-2">
          <Label>CCO (Cópia Oculta)</Label>
          <Input
            type="email"
            value={config.bcc || ""}
            onChange={(e) => onChange({ ...config, bcc: e.target.value })}
            placeholder="bcc@exemplo.com"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          <Label>Usar Template</Label>
          <p className="text-xs text-muted-foreground">
            Usar template pré-definido
          </p>
        </div>
        <Switch
          checked={config.useTemplate || false}
          onCheckedChange={(checked) => onChange({ ...config, useTemplate: checked })}
        />
      </div>

      {config.useTemplate && (
        <div className="space-y-2">
          <Label>ID do Template</Label>
          <Input
            value={config.templateId || ""}
            onChange={(e) => onChange({ ...config, templateId: e.target.value })}
            placeholder="template-123"
          />
        </div>
      )}
    </div>
  );
}
