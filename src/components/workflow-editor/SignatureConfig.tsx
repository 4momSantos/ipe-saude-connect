import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info } from "lucide-react";
import { SignatureConfig } from "@/types/workflow-editor";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { DraggableVariable } from "./DraggableVariable";
import { useDroppableInput } from "@/hooks/useDroppableInput";
import { SignerInput } from "./SignerInput";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const documentTemplateInput = useDroppableInput(
    config.documentTemplateId || "",
    (value) => onChange({ ...config, documentTemplateId: value })
  );

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
    <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
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
        <div className="flex items-center gap-2">
          <Label>Template do Documento</Label>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          ref={documentTemplateInput.inputRef}
          value={config.documentTemplateId || ""}
          onChange={(e) => onChange({ ...config, documentTemplateId: e.target.value })}
          placeholder="Ex: contrato-credenciamento-2024"
          className={documentTemplateInput.isOver ? "ring-2 ring-primary" : ""}
          {...documentTemplateInput.dropHandlers}
        />
        <div className="rounded-md bg-muted/50 p-3 space-y-2 text-xs border">
          <p className="font-semibold text-foreground">📄 O que é este campo?</p>
          <p className="text-muted-foreground">Este é o identificador do documento que será enviado para assinatura digital.</p>
          
          <div className="space-y-1.5 pt-2">
            <p className="font-semibold text-foreground">💡 Como usar:</p>
            <div className="space-y-1.5 text-muted-foreground">
              <p><strong className="text-foreground">• Com Assinafy:</strong> Digite o ID do template criado no painel da Assinafy</p>
              <p className="pl-4 text-xs italic">Exemplo: "template-abc123"</p>
              
              <p className="pt-1"><strong className="text-foreground">• Manual (sistema):</strong> Digite o nome do arquivo PDF</p>
              <p className="pl-4 text-xs italic">Exemplo: "contrato-credenciamento.pdf"</p>
              
              <p className="pt-1"><strong className="text-foreground">• Variáveis dinâmicas:</strong> Você pode usar as variáveis abaixo no documento</p>
              <p className="pl-4 text-xs italic">Elas serão substituídas pelos dados reais: {"{candidato.nome}"}, {"{candidato.email}"}, etc.</p>
            </div>
          </div>
        </div>
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
              
              <SignerInput
                signer={signer}
                index={index}
                onUpdate={updateSigner}
              />

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
        <Label className="text-sm font-medium">Variáveis Disponíveis (arraste para os campos)</Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VARIABLES.slice(0, 9).map((variable) => (
            <DraggableVariable
              key={variable.key}
              variableKey={variable.key}
              description={variable.description}
            />
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
    </ScrollArea>
  );
}
