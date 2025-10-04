import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, GripVertical, Trash2, Info, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FORM_CATEGORIES } from "@/pages/FormulariosEtapas";

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  fields: any[];
  is_system: boolean;
}

interface ProcessStep {
  id: string;
  template_id: string;
  step_name: string;
  template_name: string;
  is_required: boolean;
  fields_count: number;
}

const STEP_LABELS = ["Básico", "Seleção", "Configuração"];

export default function ProcessoEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Step 1: Informações básicas
  const [processName, setProcessName] = useState("");
  const [processDescription, setProcessDescription] = useState("");
  
  // Step 2: Seleção de templates
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [advancedMode, setAdvancedMode] = useState(false);
  
  // Step 3: Configuração de etapas
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);

  useEffect(() => {
    loadTemplates();
    if (id) {
      loadProcess();
    }
  }, [id]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("form_templates")
        .select("*")
        .eq("is_active", true)
        .order("is_system", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      setTemplates((data || []).map(t => ({
        ...t,
        fields: t.fields as any[]
      })));
    } catch (error: any) {
      toast({
        title: "Erro ao carregar templates",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadProcess = async () => {
    try {
      const { data: processo, error: processoError } = await supabase
        .from("inscription_processes")
        .select("*")
        .eq("id", id)
        .single();

      if (processoError) throw processoError;

      setProcessName(processo.name);
      setProcessDescription(processo.description || "");

      const { data: steps, error: stepsError } = await supabase
        .from("process_steps")
        .select(`
          *,
          template:form_templates(name, fields)
        `)
        .eq("process_id", id)
        .order("step_number", { ascending: true });

      if (stepsError) throw stepsError;

      const stepsData = (steps || []).map((step: any) => ({
        id: step.id,
        template_id: step.template_id,
        step_name: step.step_name,
        template_name: step.template?.name || "",
        is_required: step.is_required,
        fields_count: step.template?.fields?.length || 0,
      }));

      setProcessSteps(stepsData);
      setSelectedTemplates(stepsData.map(s => s.template_id));
    } catch (error: any) {
      toast({
        title: "Erro ao carregar processo",
        description: error.message,
        variant: "destructive",
      });
      navigate("/formularios");
    }
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!processName.trim()) {
        toast({
          title: "Nome obrigatório",
          description: "Por favor, informe o nome do processo.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (currentStep === 1) {
      if (selectedTemplates.length === 0) {
        toast({
          title: "Selecione templates",
          description: "Por favor, selecione pelo menos um template.",
          variant: "destructive",
        });
        return;
      }
      
      // Criar steps baseado na seleção
      const steps: ProcessStep[] = selectedTemplates.map((templateId, index) => {
        const template = templates.find(t => t.id === templateId)!;
        const existingStep = processSteps.find(s => s.template_id === templateId);
        
        return {
          id: existingStep?.id || crypto.randomUUID(),
          template_id: templateId,
          step_name: existingStep?.step_name || template.name,
          template_name: template.name,
          is_required: existingStep?.is_required ?? true,
          fields_count: template.fields.length,
        };
      });
      
      setProcessSteps(steps);
    }

    setCurrentStep(prev => Math.min(prev + 1, 2));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleToggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleUpdateStepName = (stepId: string, name: string) => {
    setProcessSteps(prev =>
      prev.map(s => s.id === stepId ? { ...s, step_name: name } : s)
    );
  };

  const handleUpdateRequired = (stepId: string, required: boolean) => {
    setProcessSteps(prev =>
      prev.map(s => s.id === stepId ? { ...s, is_required: required } : s)
    );
  };

  const handleRemoveStep = (stepId: string) => {
    setProcessSteps(prev => prev.filter(s => s.id !== stepId));
    const step = processSteps.find(s => s.id === stepId);
    if (step) {
      setSelectedTemplates(prev => prev.filter(id => id !== step.template_id));
    }
  };

  const handleMoveStepUp = (index: number) => {
    if (index === 0) return;
    setProcessSteps(prev => {
      const newSteps = [...prev];
      [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
      return newSteps;
    });
  };

  const handleMoveStepDown = (index: number) => {
    if (index === processSteps.length - 1) return;
    setProcessSteps(prev => {
      const newSteps = [...prev];
      [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
      return newSteps;
    });
  };

  const handleAddStep = () => {
    // Volta para step 2 para selecionar mais templates
    setCurrentStep(1);
  };

  const handleSave = async () => {
    if (!processName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do processo.",
        variant: "destructive",
      });
      return;
    }

    if (processSteps.length === 0) {
      toast({
        title: "Etapas obrigatórias",
        description: "Por favor, adicione pelo menos uma etapa.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      let processoId = id;

      if (id) {
        // Atualizar processo existente
        const { error: updateError } = await supabase
          .from("inscription_processes")
          .update({
            name: processName,
            description: processDescription,
          })
          .eq("id", id);

        if (updateError) throw updateError;

        // Deletar steps antigas
        const { error: deleteError } = await supabase
          .from("process_steps")
          .delete()
          .eq("process_id", id);

        if (deleteError) throw deleteError;
      } else {
        // Criar novo processo
        const { data: newProcesso, error: insertError } = await supabase
          .from("inscription_processes")
          .insert({
            name: processName,
            description: processDescription,
            created_by: user.user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        processoId = newProcesso.id;
      }

      // Inserir steps
      const stepsToInsert = processSteps.map((step, index) => ({
        process_id: processoId,
        step_number: index + 1,
        step_name: step.step_name,
        template_id: step.template_id,
        is_required: step.is_required,
      }));

      const { error: stepsError } = await supabase
        .from("process_steps")
        .insert(stepsToInsert);

      if (stepsError) throw stepsError;

      toast({
        title: "Processo salvo",
        description: "O processo foi salvo com sucesso.",
      });

      navigate("/formularios");
    } catch (error: any) {
      toast({
        title: "Erro ao salvar processo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/formularios")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {id ? "Editar Processo" : "Novo Processo"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Crie um processo multi-etapa combinando templates
              </p>
            </div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="flex items-center justify-center gap-2">
          {STEP_LABELS.map((label, index) => (
            <div key={index} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  index === currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : index < currentStep
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
              <span className="ml-2 text-sm font-medium">{label}</span>
              {index < STEP_LABELS.length - 1 && (
                <div className="w-12 h-0.5 bg-muted mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Informações Básicas */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>
                Defina o nome e descrição do processo de inscrição
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do Processo *</label>
                <Input
                  value={processName}
                  onChange={(e) => setProcessName(e.target.value)}
                  placeholder="Ex: Credenciamento Médico Completo"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={processDescription}
                  onChange={(e) => setProcessDescription(e.target.value)}
                  placeholder="Descreva o propósito deste processo..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Seleção de Templates */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>⚡ Modo Rápido (Recomendado)</CardTitle>
                <CardDescription>
                  Selecione múltiplos templates que serão aplicados em sequência
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-all ${
                      selectedTemplates.includes(template.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    }`}
                    onClick={() => handleToggleTemplate(template.id)}
                  >
                    <Checkbox
                      checked={selectedTemplates.includes(template.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {template.fields.length} campos
                      </p>
                    </div>
                    {template.is_system && (
                      <Badge variant="outline">🛡️ Padrão</Badge>
                    )}
                  </div>
                ))}

                {selectedTemplates.length > 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {selectedTemplates.length} template(s) selecionado(s). 
                      Você poderá reordenar e configurar na próxima etapa.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Configuração de Etapas */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Configurar Etapas</CardTitle>
                    <CardDescription>
                      Defina a ordem e configure cada etapa do processo
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={handleAddStep}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Etapa
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {processSteps.map((step, index) => (
                  <Card key={step.id} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleMoveStepUp(index)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleMoveStepDown(index)}
                            disabled={index === processSteps.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <Badge variant="default" className="mt-2 shrink-0">
                          Etapa {index + 1}
                        </Badge>
                        
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              Nome da Etapa
                            </label>
                            <Input
                              value={step.step_name}
                              onChange={(e) => handleUpdateStepName(step.id, e.target.value)}
                              placeholder="Nome da etapa"
                              className="mt-1"
                            />
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="font-normal">
                              {step.template_name}
                            </Badge>
                            <span className="text-muted-foreground">
                              • {step.fields_count} campos
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-3 shrink-0">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium">Obrigatória</label>
                            <Switch
                              checked={step.is_required}
                              onCheckedChange={(v) => handleUpdateRequired(step.id, v)}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveStep(step.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {processSteps.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-3">
                      Nenhuma etapa adicionada ainda
                    </p>
                    <Button variant="outline" onClick={handleAddStep}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Primeira Etapa
                    </Button>
                  </div>
                )}

                {processSteps.length > 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Total de <strong>{processSteps.length} etapa(s)</strong> configurada(s).
                      Use as setas para reordenar a sequência do processo.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Anterior
          </Button>

          <div className="flex gap-2">
            {currentStep < 2 ? (
              <Button onClick={handleNext}>Próximo</Button>
            ) : (
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar Processo"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}