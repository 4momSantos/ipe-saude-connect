import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { InformacoesGeraisStep } from "./steps/InformacoesGeraisStep";
import { ParticipacaoHabilitacaoStep } from "./steps/ParticipacaoHabilitacaoStep";
import { AnexosStep } from "./steps/AnexosStep";
import { PublicacaoStep } from "./steps/PublicacaoStep";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const STEPS = [
  { id: 1, title: "Informações Gerais", description: "Dados básicos" },
  { id: 2, title: "Participação", description: "Habilitação" },
  { id: 3, title: "Anexos", description: "Documentos" },
  { id: 4, title: "Publicação", description: "Revisão final" },
];

const editalSchema = z.object({
  numero_edital: z.string().min(1, "Campo obrigatório"),
  objeto: z.string().min(1, "Campo obrigatório"),
  descricao: z.string().min(1, "Campo obrigatório"),
  data_publicacao: z.date({ required_error: "Campo obrigatório" }),
  data_licitacao: z.date({ required_error: "Campo obrigatório" }),
  local_portal: z.string().min(1, "Campo obrigatório"),
  prazo_validade_proposta: z.number().min(1, "Campo obrigatório"),
  criterio_julgamento: z.string().min(1, "Campo obrigatório"),
  garantia_execucao: z.number().optional(),
  fonte_recursos: z.string().min(1, "Campo obrigatório"),
  participacao_permitida: z.array(z.string()).min(1, "Selecione ao menos uma opção"),
  regras_me_epp: z.string().optional(),
  documentos_habilitacao: z.array(z.string()).min(1, "Selecione ao menos um documento"),
  anexos: z.record(z.any()).optional(),
  status: z.enum(["rascunho", "publicado", "encerrado"]),
});

type EditalFormValues = z.infer<typeof editalSchema>;

interface EditalWizardProps {
  editalId?: string;
  initialData?: Partial<EditalFormValues>;
}

export function EditalWizard({ editalId, initialData }: EditalWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const form = useForm<EditalFormValues>({
    resolver: zodResolver(editalSchema),
    defaultValues: {
      status: "rascunho",
      participacao_permitida: [],
      documentos_habilitacao: [],
      anexos: {},
      ...initialData,
    },
  });

  const progress = (currentStep / STEPS.length) * 100;

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
          "criterio_julgamento",
          "fonte_recursos",
        ];
        break;
      case 2:
        fieldsToValidate = ["participacao_permitida", "documentos_habilitacao"];
        break;
      case 3:
        // Anexos são opcionais
        break;
      case 4:
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

  const onSubmit = async (data: EditalFormValues) => {
    try {
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const editalData = {
        numero_edital: data.numero_edital,
        titulo: data.objeto,
        objeto: data.objeto,
        descricao: data.descricao,
        data_publicacao: data.data_publicacao.toISOString().split('T')[0],
        data_licitacao: data.data_licitacao.toISOString(),
        data_inicio: data.data_publicacao.toISOString().split('T')[0],
        data_fim: data.data_licitacao.toISOString().split('T')[0],
        local_portal: data.local_portal,
        prazo_validade_proposta: data.prazo_validade_proposta,
        criterio_julgamento: data.criterio_julgamento,
        garantia_execucao: data.garantia_execucao,
        fonte_recursos: data.fonte_recursos,
        participacao_permitida: data.participacao_permitida,
        regras_me_epp: data.regras_me_epp,
        documentos_habilitacao: data.documentos_habilitacao,
        anexos: data.anexos,
        status: data.status,
        created_by: user.id,
        historico_alteracoes: [
          {
            usuario: user.email,
            data: new Date().toISOString(),
            acao: editalId ? "Atualização" : "Criação",
          },
        ],
      };

      if (editalId) {
        const { error } = await supabase
          .from("editais")
          .update(editalData)
          .eq("id", editalId);

        if (error) throw error;
        toast.success("Edital atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("editais")
          .insert([editalData]);

        if (error) throw error;
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
        return <AnexosStep form={form} />;
      case 4:
        return <PublicacaoStep form={form} />;
      default:
        return null;
    }
  };

  return (
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

          <div className="grid grid-cols-4 gap-2">
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
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Salvando..." : editalId ? "Atualizar" : "Criar Edital"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
