import { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: any[];
}

interface ProcessStep {
  id: string;
  step_name: string;
  step_number: number;
  process_id: string;
  template_id: string | null;
  process?: {
    name: string;
  };
}

interface TemplateSelectorProps {
  selectedTemplateId?: string;
  onSelect: (templateId: string, fields: any[]) => void;
}

export function TemplateSelector({ selectedTemplateId, onSelect }: TemplateSelectorProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [filteredSteps, setFilteredSteps] = useState<ProcessStep[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [sourceType, setSourceType] = useState<"template" | "step">("template");
  const [selectedStepId, setSelectedStepId] = useState<string>();

  useEffect(() => {
    loadTemplates();
    loadSteps();
  }, []);

  useEffect(() => {
    filterTemplates();
    filterSteps();
  }, [searchQuery, templates, steps]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("form_templates")
        .select("id, name, description, category, fields")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      const templatesData = (data || []).map(t => ({
        ...t,
        fields: t.fields as any[]
      }));
      setTemplates(templatesData);
      setFilteredTemplates(templatesData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar templates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSteps = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("process_steps")
        .select(`
          id,
          step_name,
          step_number,
          process_id,
          template_id,
          process:inscription_processes(name)
        `)
        .order("step_number");

      if (error) throw error;
      const stepsData = (data || []) as ProcessStep[];
      console.log('Etapas carregadas:', stepsData.length, stepsData);
      setSteps(stepsData);
      setFilteredSteps(stepsData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar etapas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    if (!searchQuery) {
      setFilteredTemplates(templates);
      return;
    }

    const filtered = templates.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredTemplates(filtered);
  };

  const filterSteps = () => {
    if (!searchQuery) {
      setFilteredSteps(steps);
      return;
    }

    const filtered = steps.filter(
      (s) =>
        s.step_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.process?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredSteps(filtered);
  };

  const handleSourceTypeChange = (value: "template" | "step") => {
    setSourceType(value);
    setSelectedStepId(undefined);
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      onSelect(templateId, template.fields);
      setTemplateDialogOpen(false);
    }
  };

  const handleSelectStep = async (stepId: string) => {
    const step = steps.find((s) => s.id === stepId);
    if (step && step.template_id) {
      // Buscar os campos do template da etapa
      const { data: template } = await supabase
        .from("form_templates")
        .select("fields")
        .eq("id", step.template_id)
        .single();
      
      if (template) {
        setSelectedStepId(stepId);
        onSelect(step.template_id, template.fields as any[]);
        setStepDialogOpen(false);
      }
    } else {
      toast({
        title: "Etapa sem template",
        description: "Esta etapa não possui um template de formulário associado.",
        variant: "destructive",
      });
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const selectedStep = steps.find((s) => s.id === selectedStepId);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label>Fonte do Formulário</Label>
        <RadioGroup value={sourceType} onValueChange={handleSourceTypeChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="template" id="template" />
            <Label htmlFor="template" className="font-normal cursor-pointer">
              Usar Template de Formulário ({templates.length} disponíveis)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="step" id="step" />
            <Label htmlFor="step" className="font-normal cursor-pointer">
              Usar Etapa Já Selecionada ({steps.length} disponíveis)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {sourceType === "template" && (
        <div className="space-y-2">
          <Label>Template de Formulário</Label>
          <div className="flex gap-2">
          <Select value={selectedTemplateId} onValueChange={handleSelectTemplate}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione um template..." />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Selecionar Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Buscar templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {loading ? (
                      <p className="text-center text-muted-foreground py-8">
                        Carregando templates...
                      </p>
                    ) : filteredTemplates.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum template encontrado.
                      </p>
                    ) : (
                      filteredTemplates.map((template) => (
                        <Button
                          key={template.id}
                          variant="outline"
                          className="w-full justify-start h-auto p-4"
                          onClick={() => handleSelectTemplate(template.id)}
                        >
                          <div className="text-left space-y-1 w-full">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{template.name}</span>
                              {template.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {template.category}
                                </Badge>
                              )}
                            </div>
                            {template.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {template.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {template.fields?.length || 0} campos
                            </p>
                          </div>
                        </Button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="icon"
            onClick={() => window.open("/templates-formularios/editor", "_blank")}
            title="Criar novo template"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        </div>
      )}

      {sourceType === "step" && (
        <div className="space-y-2">
          <Label>Etapa do Processo</Label>
          <div className="flex gap-2">
            <Select value={selectedStepId} onValueChange={handleSelectStep}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione uma etapa..." />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {steps.map((step) => (
                  <SelectItem key={step.id} value={step.id}>
                    {step.process?.name} - {step.step_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Selecionar Etapa ({filteredSteps.length} disponíveis)</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Buscar etapas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {loading ? (
                        <p className="text-center text-muted-foreground py-8">
                          Carregando etapas...
                        </p>
                      ) : filteredSteps.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhuma etapa encontrada.
                        </p>
                      ) : (
                        filteredSteps.map((step) => (
                          <Button
                            key={step.id}
                            variant="outline"
                            className="w-full justify-start h-auto p-4"
                            onClick={() => handleSelectStep(step.id)}
                          >
                            <div className="text-left space-y-1 w-full">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{step.step_name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  Etapa {step.step_number}
                                </Badge>
                              </div>
                              {step.process?.name && (
                                <p className="text-xs text-muted-foreground">
                                  Processo: {step.process.name}
                                </p>
                              )}
                            </div>
                          </Button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {sourceType === "template" && selectedTemplate && (
        <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{selectedTemplate.name}</h4>
            {selectedTemplate.category && (
              <Badge variant="outline">{selectedTemplate.category}</Badge>
            )}
          </div>
          {selectedTemplate.description && (
            <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {selectedTemplate.fields?.length || 0} campos configurados
          </p>
        </div>
      )}

      {sourceType === "step" && selectedStep && (
        <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{selectedStep.step_name}</h4>
            <Badge variant="outline">Etapa {selectedStep.step_number}</Badge>
          </div>
          {selectedStep.process?.name && (
            <p className="text-sm text-muted-foreground">
              Processo: {selectedStep.process.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
