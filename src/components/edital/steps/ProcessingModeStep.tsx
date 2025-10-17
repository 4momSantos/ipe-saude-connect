import { UseFormReturn } from "react-hook-form";
import { useState, useEffect } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Workflow, Code, Ban, Info, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProcessingModeStepProps {
  form: UseFormReturn<any>;
}

interface WorkflowOption {
  id: string;
  name: string;
  description: string;
  version: number;
  is_active: boolean;
}

export function ProcessingModeStep({ form }: ProcessingModeStepProps) {
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);

  // Observar mudanças nos campos para determinar modo atual
  const workflowId = form.watch('workflow_id');
  const processingMode = form.watch('processing_mode');

  useEffect(() => {
    loadWorkflows();
  }, []);

  async function loadWorkflows() {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('id, name, description, version, is_active')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Erro ao carregar workflows:', error);
      toast.error('Erro ao carregar workflows disponíveis');
    } finally {
      setLoadingWorkflows(false);
    }
  }

  // Handler para mudança de modo
  const handleModeChange = (newMode: string) => {
    form.setValue('processing_mode', newMode);

    switch (newMode) {
      case 'workflow':
        // Manter workflow_id se já existir, caso contrário limpar
        // Não definir use_programmatic_flow (é computed)
        break;
      case 'programmatic':
        // Limpar workflow
        form.setValue('workflow_id', null);
        form.setValue('workflow_version', null);
        break;
      case 'none':
        // Limpar workflow
        form.setValue('workflow_id', null);
        form.setValue('workflow_version', null);
        break;
    }
  };

  if (loadingWorkflows) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Modo de Processamento</h3>
        <p className="text-sm text-muted-foreground">
          Escolha como as inscrições deste edital serão processadas e validadas.
        </p>
      </div>

      <RadioGroup value={processingMode || 'none'} onValueChange={handleModeChange}>
        <div className="space-y-4">
          
          {/* Opção 1: Workflow Engine */}
          <Card className={processingMode === 'workflow' ? 'border-primary border-2' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <RadioGroupItem value="workflow" id="mode-workflow" />
                <div className="flex-1">
                  <Label htmlFor="mode-workflow" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                    <Workflow className="h-5 w-5" />
                    Workflow Engine (Recomendado)
                  </Label>
                  <CardDescription className="mt-1">
                    Editor visual drag-and-drop com nós customizáveis e aprovações manuais
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Flexibilidade total</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Auditoria completa</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Integração com webhooks</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600">⚠️</span>
                  <span>Requer configuração inicial</span>
                </div>
              </div>

              {processingMode === 'workflow' && (
                <div className="space-y-3 pt-3 border-t">
                  <FormField
                    control={form.control}
                    name="workflow_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selecione o Workflow *</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            const workflow = workflows.find(w => w.id === value);
                            if (workflow) {
                              form.setValue('workflow_version', workflow.version);
                            }
                          }} 
                          value={field.value || ''}
                          disabled={workflows.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={workflows.length === 0 ? "Nenhum workflow disponível" : "Escolha um workflow"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {workflows.length === 0 ? (
                              <div className="p-4 text-sm text-muted-foreground text-center">
                                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="font-semibold">Nenhum workflow disponível</p>
                                <p className="text-xs mt-1">Crie um workflow primeiro</p>
                              </div>
                            ) : (
                              workflows.map((workflow) => (
                                <SelectItem key={workflow.id} value={workflow.id}>
                                  {workflow.name} (v{workflow.version})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          O workflow define as etapas de análise e aprovação das inscrições
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Opção 2: Fluxo Programático */}
          <Card className={processingMode === 'programmatic' ? 'border-primary border-2' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <RadioGroupItem value="programmatic" id="mode-programmatic" />
                <div className="flex-1">
                  <Label htmlFor="mode-programmatic" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Fluxo Programático (Legacy)
                  </Label>
                  <CardDescription className="mt-1">
                    Sequência fixa de triggers SQL + Edge Functions para processamento automático
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Performance alta</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Configuração simples</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600">⚠️</span>
                  <span>Inflexível</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-600">❌</span>
                  <span>Não recomendado para novos editais</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Opção 3: Sem Processamento */}
          <Card className={processingMode === 'none' ? 'border-primary border-2' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <RadioGroupItem value="none" id="mode-none" />
                <div className="flex-1">
                  <Label htmlFor="mode-none" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                    <Ban className="h-5 w-5" />
                    Sem Processamento Automático
                  </Label>
                  <CardDescription className="mt-1">
                    Inscrições ficam pendentes até aprovação manual
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Útil apenas para rascunhos ou editais em configuração. 
                Todas as inscrições precisarão ser processadas manualmente.
              </div>
            </CardContent>
          </Card>

        </div>
      </RadioGroup>

      {/* Alertas */}
      {processingMode === 'programmatic' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> O Fluxo Programático é mantido apenas para compatibilidade com editais antigos. 
            Para novos editais, recomendamos usar o Workflow Engine que oferece mais flexibilidade e auditoria completa.
          </AlertDescription>
        </Alert>
      )}

      {processingMode === 'none' && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> Sem processamento automático, você precisará analisar e aprovar 
            cada inscrição manualmente. Isso pode ser trabalhoso para editais com muitas inscrições.
          </AlertDescription>
        </Alert>
      )}

      {processingMode === 'workflow' && !workflowId && workflows.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Nenhum workflow disponível!</strong> Você precisa criar um workflow antes de usar o Workflow Engine.
            Acesse: <strong>Workflows → Criar Workflow</strong>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
