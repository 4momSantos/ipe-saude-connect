import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { SignatureConfig } from "@/types/workflow-editor";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface SignatureConfigProps {
  config: SignatureConfig;
  onChange: (config: SignatureConfig) => void;
}

export function SignatureConfigPanel({ config, onChange }: SignatureConfigProps) {
  const addSigner = () => {
    const signers = [...config.signers];
    signers.push({
      name: "",
      email: "",
      order: signers.length + 1,
    });
    onChange({ ...config, signers });
  };

  const updateSigner = (index: number, field: keyof SignatureConfig["signers"][0], value: any) => {
    const signers = [...config.signers];
    signers[index] = { ...signers[index], [field]: value };
    onChange({ ...config, signers });
  };

  const removeSigner = (index: number) => {
    const signers = config.signers.filter((_, i) => i !== index);
    // Reorder
    signers.forEach((s, i) => s.order = i + 1);
    onChange({ ...config, signers });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Provedor de Assinatura</Label>
        <Select
          value={config.provider}
          onValueChange={(value: any) => onChange({ ...config, provider: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual (Sistema)</SelectItem>
            <SelectItem value="clicksign">Clicksign</SelectItem>
            <SelectItem value="docusign">DocuSign</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Template do Documento</Label>
        <Input
          value={config.documentTemplateId || ""}
          onChange={(e) => onChange({ ...config, documentTemplateId: e.target.value })}
          placeholder="ID do template ou nome do arquivo"
        />
        <p className="text-xs text-muted-foreground">
          Documento que será usado para coleta de assinaturas
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Signatários</Label>
          <Button size="sm" variant="outline" onClick={addSigner}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>

        {config.signers.map((signer, index) => (
          <Card key={index} className="p-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Signatário {signer.order}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeSigner(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={signer.name}
                  onChange={(e) => updateSigner(index, "name", e.target.value)}
                  placeholder="Nome do signatário"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={signer.email}
                  onChange={(e) => updateSigner(index, "email", e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Ordem de Assinatura</Label>
                <Input
                  type="number"
                  value={signer.order}
                  onChange={(e) => updateSigner(index, "order", parseInt(e.target.value))}
                  min="1"
                />
              </div>
            </div>
          </Card>
        ))}

        {config.signers.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhum signatário adicionado
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Label>Notificar quando concluído</Label>
        <Switch
          checked={config.notifyOnComplete || false}
          onCheckedChange={(checked) => onChange({ ...config, notifyOnComplete: checked })}
        />
      </div>
    </div>
  );
}
