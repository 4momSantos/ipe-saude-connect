import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { EmailConfig } from "@/types/workflow-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailConfigProps {
  config: EmailConfig;
  onChange: (config: EmailConfig) => void;
}

const AVAILABLE_VARIABLES = [
  { key: "{candidato.nome}", description: "Nome do candidato" },
  { key: "{candidato.email}", description: "Email do candidato" },
  { key: "{candidato.cpf}", description: "CPF do candidato" },
  { key: "{analista.nome}", description: "Nome do analista" },
  { key: "{analista.email}", description: "Email do analista" },
  { key: "{gestor.nome}", description: "Nome do gestor" },
  { key: "{gestor.email}", description: "Email do gestor" },
  { key: "{edital.titulo}", description: "Título do edital" },
  { key: "{edital.numero}", description: "Número do edital" },
];

const RECIPIENT_OPTIONS = [
  { value: "specific", label: "Email específico" },
  { value: "{candidato.email}", label: "Email do Candidato" },
  { value: "{analista.email}", label: "Email do Analista" },
  { value: "{gestor.email}", label: "Email do Gestor" },
];

export function EmailConfigPanel({ config, onChange }: EmailConfigProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [recipientType, setRecipientType] = useState(
    config.to?.includes("{") ? config.to : "specific"
  );
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setTemplates(data);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o template",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("email_templates").insert({
      name: templateName,
      subject: config.subject || "",
      body: config.body || "",
      variables: AVAILABLE_VARIABLES.map(v => v.key),
    });

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Template salvo",
        description: "O template foi salvo com sucesso",
      });
      setTemplateName("");
      setShowSaveTemplate(false);
      loadTemplates();
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onChange({
        ...config,
        subject: template.subject,
        body: template.body,
        useTemplate: true,
        templateId: template.id,
      });
    }
  };

  const handleRecipientTypeChange = (value: string) => {
    setRecipientType(value);
    if (value !== "specific") {
      onChange({ ...config, to: value });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Destinatário</Label>
        <Select value={recipientType} onValueChange={handleRecipientTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECIPIENT_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {recipientType === "specific" && (
          <Input
            value={config.to || ""}
            onChange={(e) => onChange({ ...config, to: e.target.value })}
            placeholder="email@exemplo.com"
            className="mt-2"
          />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Template de Email</Label>
          <Switch
            checked={config.useTemplate || false}
            onCheckedChange={(checked) => onChange({ ...config, useTemplate: checked })}
          />
        </div>
        {config.useTemplate && templates.length > 0 && (
          <Select 
            value={config.templateId || ""} 
            onValueChange={handleLoadTemplate}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Assunto</Label>
        <Input
          id="subject"
          value={config.subject || ""}
          onChange={(e) => onChange({ ...config, subject: e.target.value })}
          placeholder="Assunto do email - suporta variáveis"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Mensagem</Label>
        <Textarea
          id="body"
          value={config.body || ""}
          onChange={(e) => onChange({ ...config, body: e.target.value })}
          placeholder="Digite o corpo do email. Use variáveis como {candidato.nome}"
          rows={8}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          As variáveis serão substituídas automaticamente pelos dados reais
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
        <Label className="text-sm font-medium">Variáveis Disponíveis</Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VARIABLES.map((variable) => (
            <Badge 
              key={variable.key} 
              variant="secondary" 
              className="text-xs cursor-help"
              title={variable.description}
            >
              {variable.key}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cc">CC (opcional)</Label>
        <Input
          id="cc"
          value={config.cc || ""}
          onChange={(e) => onChange({ ...config, cc: e.target.value })}
          placeholder="copia@exemplo.com ou {analista.email}"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bcc">CCO (opcional)</Label>
        <Input
          id="bcc"
          value={config.bcc || ""}
          onChange={(e) => onChange({ ...config, bcc: e.target.value })}
          placeholder="copia-oculta@exemplo.com"
        />
      </div>

      {!config.useTemplate && (
        <div className="pt-4 border-t">
          {!showSaveTemplate ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSaveTemplate(true)}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar como Template
            </Button>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Nome do template"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleSaveTemplate}
                  className="flex-1"
                >
                  Salvar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setShowSaveTemplate(false);
                    setTemplateName("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
