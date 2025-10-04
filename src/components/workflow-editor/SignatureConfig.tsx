import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info } from "lucide-react";
import { SignatureConfig } from "@/types/workflow-editor";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface SignatureConfigProps {
  config: SignatureConfig;
  onChange: (config: SignatureConfig) => void;
}

const AVAILABLE_VARIABLES = [
  { key: "{candidato.nome}", description: "Nome do candidato" },
  { key: "{candidato.email}", description: "Email do candidato" },
  { key: "{candidato.cpf}", description: "CPF do candidato" },
  { key: "{analista.nome}", description: "Nome do analista responsável" },
  { key: "{analista.email}", description: "Email do analista" },
  { key: "{gestor.nome}", description: "Nome do gestor" },
  { key: "{gestor.email}", description: "Email do gestor" },
  { key: "{edital.titulo}", description: "Título do edital" },
  { key: "{edital.numero}", description: "Número do edital" },
];

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
    signers.forEach((s, i) => s.order = i + 1);
    onChange({ ...config, signers });
  };

  return (
    <div className="space-y-6">
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
            <SelectItem value="assinafy">Assinafy (requer API Key)</SelectItem>
            <SelectItem value="clicksign">Clicksign (requer API Key)</SelectItem>
            <SelectItem value="docusign">DocuSign (requer API Key)</SelectItem>
          </SelectContent>
        </Select>
        {config.provider !== "manual" && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            Configure as credenciais do provedor nas configurações do projeto
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Template do Documento</Label>
        <Input
          value={config.documentTemplateId || ""}
          onChange={(e) => onChange({ ...config, documentTemplateId: e.target.value })}
          placeholder="ID do template ou caminho do arquivo"
        />
        <p className="text-xs text-muted-foreground">
          Documento que será usado para coleta de assinaturas. Suporta variáveis como {"{candidato.nome}"}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Signatários</Label>
            <Button size="sm" variant="outline" onClick={addSigner}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Use variáveis para definir signatários dinamicamente
          </p>
        </div>

        {config.signers.map((signer, index) => (
          <Card key={index} className="p-4">
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
                <Label>Nome (ou variável)</Label>
                <Input
                  value={signer.name}
                  onChange={(e) => updateSigner(index, "name", e.target.value)}
                  placeholder="{candidato.nome} ou nome fixo"
                />
              </div>

              <div className="space-y-2">
                <Label>Email (ou variável)</Label>
                <Input
                  value={signer.email}
                  onChange={(e) => updateSigner(index, "email", e.target.value)}
                  placeholder="{candidato.email} ou email@exemplo.com"
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
          <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-md">
            Nenhum signatário adicionado. Clique em "Adicionar" para começar.
          </div>
        )}
      </div>

      <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
        <Label className="text-sm font-medium">Variáveis Disponíveis</Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VARIABLES.slice(0, 9).map((variable) => (
            <Badge key={variable.key} variant="secondary" className="text-xs">
              {variable.key}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div>
            <Label>Notificar candidato por email</Label>
            <p className="text-xs text-muted-foreground">Email será enviado para {"{candidato.email}"}</p>
          </div>
          <Switch
            checked={config.notifyCandidate !== false}
            onCheckedChange={(checked) => onChange({ ...config, notifyCandidate: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Notificar analistas no app</Label>
            <p className="text-xs text-muted-foreground">Notificação in-app para analistas</p>
          </div>
          <Switch
            checked={config.notifyAnalysts !== false}
            onCheckedChange={(checked) => onChange({ ...config, notifyAnalysts: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Notificar quando concluído</Label>
            <p className="text-xs text-muted-foreground">Todos os envolvidos serão notificados</p>
          </div>
          <Switch
            checked={config.notifyOnComplete || false}
            onCheckedChange={(checked) => onChange({ ...config, notifyOnComplete: checked })}
          />
        </div>
      </div>
    </div>
  );
}
