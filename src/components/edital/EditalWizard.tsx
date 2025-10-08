import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Save, FileText } from "lucide-react";
import { InformacoesGeraisStep } from "./steps/InformacoesGeraisStep";
import { ParticipacaoHabilitacaoStep } from "./steps/ParticipacaoHabilitacaoStep";
import { WorkflowStep } from "./steps/WorkflowStep";
import { AnexosStep } from "./steps/AnexosStep";
import { PublicacaoStep } from "./steps/PublicacaoStep";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STEPS = [
  { id: 1, title: "Informações Gerais", description: "Dados básicos" },
  { id: 2, title: "Participação", description: "Habilitação" },
  { id: 3, title: "Workflow", description: "Automação" },
  { id: 4, title: "Anexos", description: "Documentos" },
  { id: 5, title: "Publicação", description: "Revisão final" },
];

// Feature flag para anexos do workflow
const USE_WORKFLOW_ATTACHMENTS = true;

const editalSchema = z.object({
  numero_edital: z.string().min(1, "Campo obrigatório"),
  objeto: z.string().min(1, "Campo obrigatório"),
  descricao: z.string().min(1, "Campo obrigatório"),
  data_publicacao: z.date({ required_error: "Campo obrigatório" }),
  data_licitacao: z.date({ required_error: "Campo obrigatório" }),
  prazo_inscricao_dias: z.number().min(1, "Campo obrigatório"),
  local_portal: z.string().min(1, "Campo obrigatório"),
  prazo_validade_proposta: z.number().min(1, "Campo obrigatório"),
  criterio_julgamento: z.string().min(1, "Campo obrigatório"),
  garantia_execucao: z.number().optional(),
  fonte_recursos: z.string().min(1, "Campo obrigatório"),
  possui_vagas: z.boolean().default(false),
  vagas: z.number().min(1, "Insira ao menos 1 vaga").optional(),
  especialidades_ids: z.array(z.string().uuid()).min(1, "Selecione ao menos uma especialidade"),
  participacao_permitida: z.array(z.string()).min(1, "Selecione ao menos uma opção"),
  regras_me_epp: z.string().optional(),
  documentos_habilitacao: z.array(z.string()).min(1, "Selecione ao menos um documento"),
  anexos: z.record(z.any()).optional(),
  status: z.enum(["rascunho", "publicado", "encerrado"]).default("rascunho"),
  // Campos de workflow (OBRIGATÓRIOS)
  workflow_id: z.string().uuid("Selecione um workflow válido"),
  workflow_version: z.number().min(1),
  formularios_vinculados: z.array(z.string().uuid()).min(1, "O workflow deve ter ao menos 1 formulário"),
  gestor_autorizador_id: z.string().uuid("Selecione um gestor autorizador"),
  observacoes_autorizacao: z.string().optional(),
  // Novos campos para separar anexos (Sprint 4)
  anexos_administrativos: z.record(z.any()).optional(),
  anexos_processo_esperados: z.array(z.any()).optional(),
});

type EditalFormValues = z.infer<typeof editalSchema>;

interface EditalWizardProps {
  editalId?: string;
  initialData?: Partial<EditalFormValues>;
}

export function EditalWizard({ editalId, initialData }: EditalWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const navigate = useNavigate();

  const form = useForm<EditalFormValues>({
    resolver: zodResolver(editalSchema),
    defaultValues: {
      numero_edital: "",
      objeto: "",
      descricao: "",
      local_portal: "",
      prazo_inscricao_dias: 30,
      prazo_validade_proposta: 30,
      criterio_julgamento: "",
      garantia_execucao: 0,
      fonte_recursos: "",
      regras_me_epp: "",
      status: "rascunho",
      possui_vagas: false,
      vagas: undefined,
      participacao_permitida: [],
      documentos_habilitacao: [],
      anexos: {},
      anexos_administrativos: {},
      anexos_processo_esperados: [],
      ...initialData,
    },
  });

  const progress = (currentStep / STEPS.length) * 100;

  // Detectar mudanças não salvas
  const hasUnsavedChanges = form.formState.isDirty && !isSubmitting;

  // Aviso ao fechar aba/janela
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Interceptar navegação com popstate (botão voltar do navegador)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        window.history.pushState(null, "", window.location.href);
        setShowUnsavedDialog(true);
        setPendingNavigation(() => () => window.history.back());
      }
    };

    if (hasUnsavedChanges) {
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePopState);
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasUnsavedChanges]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof EditalFormValues)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = [
          "numero_edital",
          "objeto",
          "descricao",
          "data_publicacao",
          "data_licitacao",
          "local_portal",
          "prazo_validade_proposta",
          "prazo_inscricao_dias",
          "criterio_julgamento",
          "fonte_recursos",
          "especialidades_ids",
        ];
        
        // Validar vagas apenas se possui_vagas for true
        if (form.getValues("possui_vagas")) {
          fieldsToValidate.push("vagas");
        }
        break;
      case 2:
        fieldsToValidate = ["participacao_permitida", "documentos_habilitacao"];
        break;
      case 3:
        // Workflow e formulários são obrigatórios
        const workflowId = form.getValues("workflow_id");
        const formularios = form.getValues("formularios_vinculados");
        
        if (!workflowId) {
          toast.error("⚠️ Selecione um modelo de workflow antes de continuar");
          return;
        }
        
        if (!formularios || formularios.length === 0) {
          toast.error("⚠️ O workflow selecionado não possui formulários válidos. Adicione formulários ao workflow no editor.");
          return;
        }
        
        fieldsToValidate = ["workflow_id", "gestor_autorizador_id", "formularios_vinculados"];
        break;
      case 4:
        // Anexos são opcionais
        break;
      case 5:
        fieldsToValidate = ["status"];
        break;
    }

    const isStepValid = await form.trigger(fieldsToValidate);

    if (isStepValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    } else {
      toast.error("Por favor, preencha todos os campos obrigatórios");
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSaveAsDraft = async () => {
    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const formData = form.getValues();
      
      // Validar campos mínimos para rascunho
      if (!formData.numero_edital || !formData.objeto) {
        toast.error("Preencha ao menos o número e objeto do edital");
        return;
      }

      // Calcular data_fim se tiver data_publicacao
      let dataFim = null;
      if (formData.data_publicacao) {
        const dataInicio = new Date(formData.data_publicacao);
        dataFim = new Date(dataInicio);
        dataFim.setDate(dataFim.getDate() + (formData.prazo_inscricao_dias || 30));
      }

      const rascunhoData = {
        numero_edital: formData.numero_edital,
        titulo: formData.objeto,
        objeto: formData.objeto,
        descricao: formData.descricao || null,
        data_publicacao: formData.data_publicacao ? formData.data_publicacao.toISOString().split('T')[0] : null,
        data_licitacao: formData.data_licitacao ? formData.data_licitacao.toISOString() : null,
        data_inicio: formData.data_publicacao ? formData.data_publicacao.toISOString().split('T')[0] : null,
        data_fim: dataFim ? dataFim.toISOString().split('T')[0] : null,
        local_portal: formData.local_portal || null,
        prazo_validade_proposta: formData.prazo_validade_proposta || null,
        criterio_julgamento: formData.criterio_julgamento || null,
        garantia_execucao: formData.garantia_execucao || null,
        fonte_recursos: formData.fonte_recursos || null,
        possui_vagas: formData.possui_vagas || false,
        vagas: formData.possui_vagas ? formData.vagas : null,
        participacao_permitida: formData.participacao_permitida || [],
        regras_me_epp: formData.regras_me_epp || null,
        documentos_habilitacao: formData.documentos_habilitacao || [],
        anexos: formData.anexos || {},
        anexos_administrativos: formData.anexos_administrativos || {},
        anexos_processo_esperados: formData.anexos_processo_esperados || [],
        status: "rascunho",
        created_by: user.id,
        workflow_id: formData.workflow_id || null,
        workflow_version: formData.workflow_version || null,
        formularios_vinculados: formData.formularios_vinculados || [],
        gestor_autorizador_id: formData.gestor_autorizador_id || null,
        observacoes_autorizacao: formData.observacoes_autorizacao || null,
        historico_alteracoes: [{
          usuario: user.email,
          data: new Date().toISOString(),
          acao: "Salvo como rascunho",
        }],
      };

      const { error } = await supabase
        .from("editais")
        .insert([rascunhoData]);

      if (error) throw error;

      toast.success("Rascunho salvo com sucesso!");
      form.reset();
      navigate("/editais");
    } catch (error) {
      console.error("Erro ao salvar rascunho:", error);
      toast.error("Erro ao salvar rascunho");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false);
    form.reset();
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    } else {
      navigate("/editais");
    }
  };

  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  const handleFinalSubmit = async () => {
    // Validar se o status foi selecionado
    const isValid = await form.trigger(["status"]);
    
    if (!isValid) {
      toast.error("Por favor, selecione o status do edital");
      return;
    }

    const status = form.getValues("status");
    
    // Mensagem de confirmação baseada no status
    let confirmMessage = "";
    if (status === "publicado") {
      confirmMessage = "Tem certeza que deseja PUBLICAR este edital? Ele ficará visível para todos os candidatos.";
    } else if (status === "rascunho") {
      confirmMessage = "Você está salvando como RASCUNHO. O edital não ficará visível para os candidatos. Confirma?";
    } else if (status === "encerrado") {
      confirmMessage = "Tem certeza que deseja ENCERRAR este edital? Ele não aceitará mais inscrições.";
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Submeter o formulário manualmente
    form.handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: EditalFormValues) => {
    try {
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Calcular data_fim com base no prazo de inscrição
      const dataInicio = new Date(data.data_publicacao);
      const dataFim = new Date(dataInicio);
      dataFim.setDate(dataFim.getDate() + data.prazo_inscricao_dias);

      const editalData = {
        numero_edital: data.numero_edital,
        titulo: data.objeto,
        objeto: data.objeto,
        descricao: data.descricao,
        data_publicacao: data.data_publicacao.toISOString().split('T')[0],
        data_licitacao: data.data_licitacao.toISOString(),
        data_inicio: dataInicio.toISOString().split('T')[0],
        data_fim: dataFim.toISOString().split('T')[0],
        local_portal: data.local_portal,
        prazo_validade_proposta: data.prazo_validade_proposta,
        criterio_julgamento: data.criterio_julgamento,
        garantia_execucao: data.garantia_execucao,
        fonte_recursos: data.fonte_recursos,
        possui_vagas: data.possui_vagas,
        vagas: data.possui_vagas ? data.vagas : null,
        participacao_permitida: data.participacao_permitida,
        regras_me_epp: data.regras_me_epp,
        documentos_habilitacao: data.documentos_habilitacao,
        anexos: data.anexos,
        // Novos campos separados (Sprint 4)
        anexos_administrativos: USE_WORKFLOW_ATTACHMENTS ? data.anexos_administrativos : data.anexos,
        anexos_processo_esperados: USE_WORKFLOW_ATTACHMENTS ? data.anexos_processo_esperados : [],
        status: data.status,
        created_by: user.id,
        // Campos de workflow (obrigatórios)
        workflow_id: data.workflow_id,
        workflow_version: data.workflow_version,
        formularios_vinculados: data.formularios_vinculados,
        gestor_autorizador_id: data.gestor_autorizador_id,
        observacoes_autorizacao: data.observacoes_autorizacao || null,
        data_autorizacao: new Date().toISOString(),
      };

      if (editalId) {
        // Buscar o histórico atual para adicionar a nova alteração
        const { data: currentEdital } = await supabase
          .from("editais")
          .select("historico_alteracoes")
          .eq("id", editalId)
          .maybeSingle();

        const historicoAtual = Array.isArray(currentEdital?.historico_alteracoes) 
          ? currentEdital.historico_alteracoes 
          : [];
        
        const { data: editalAtualizado, error } = await supabase
          .from("editais")
          .update({
            ...editalData,
            historico_alteracoes: [
              ...historicoAtual,
              {
                usuario: user.email,
                data: new Date().toISOString(),
                acao: "Atualização",
              },
            ],
          })
          .eq("id", editalId)
          .select()
          .single();

        if (error) throw error;

        // Deletar especialidades antigas e inserir novas
        await supabase
          .from("edital_especialidades")
          .delete()
          .eq("edital_id", editalId);

        if (data.especialidades_ids.length > 0) {
          const especialidadesRelacionamento = data.especialidades_ids.map(espId => ({
            edital_id: editalId,
            especialidade_id: espId,
          }));

          await supabase
            .from("edital_especialidades")
            .insert(especialidadesRelacionamento);
        }

        toast.success("Edital atualizado com sucesso!");
      } else {
        const { data: editalCriado, error } = await supabase
          .from("editais")
          .insert([{
            ...editalData,
            historico_alteracoes: [
              {
                usuario: user.email,
                data: new Date().toISOString(),
                acao: "Criação",
              },
            ],
          }])
          .select()
          .single();

        if (error) throw error;

        // Inserir especialidades
        if (data.especialidades_ids.length > 0) {
          const especialidadesRelacionamento = data.especialidades_ids.map(espId => ({
            edital_id: editalCriado.id,
            especialidade_id: espId,
          }));

          await supabase
            .from("edital_especialidades")
            .insert(especialidadesRelacionamento);
        }

        toast.success("Edital criado com sucesso!");
      }

      navigate("/editais");
    } catch (error) {
      console.error("Erro ao salvar edital:", error);
      toast.error("Erro ao salvar edital");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <InformacoesGeraisStep form={form} />;
      case 2:
        return <ParticipacaoHabilitacaoStep form={form} />;
      case 3:
        return <WorkflowStep form={form} />;
      case 4:
        return <AnexosStep form={form} />;
      case 5:
        return <PublicacaoStep form={form} />;
      default:
        return null;
    }
  };

  return (
    <>
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mudanças não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas no formulário. O que deseja fazer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelNavigation}>
              Continuar editando
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                if (hasUnsavedChanges) {
                  setShowUnsavedDialog(true);
                  setPendingNavigation(() => () => navigate("/editais"));
                } else {
                  handleDiscardChanges();
                }
              }}
            >
              Descartar mudanças
            </Button>
            <AlertDialogAction onClick={handleSaveAsDraft}>
              <FileText className="w-4 h-4 mr-2" />
              Salvar como rascunho
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {editalId ? "Editar Edital" : "Novo Edital"}
              </h2>
              <p className="text-muted-foreground">
                Passo {currentStep} de {STEPS.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-primary">{Math.round(progress)}%</p>
              <p className="text-xs text-muted-foreground">Completo</p>
            </div>
          </div>

          <Progress value={progress} className="h-2" />

          <div className="grid grid-cols-5 gap-2">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`text-center p-2 rounded-lg transition-all ${
                  step.id === currentStep
                    ? "bg-primary text-primary-foreground"
                    : step.id < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <p className="text-xs font-medium">{step.title}</p>
                <p className="text-[10px] opacity-75">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {renderStep()}

            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>

              {currentStep < STEPS.length ? (
                <Button type="button" onClick={handleNext}>
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="button" onClick={handleFinalSubmit} disabled={isSubmitting}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Salvando..." : editalId ? "Salvar Alterações" : "Salvar Edital"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </Card>
      </div>
    </>
  );
}
