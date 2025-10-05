import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  InscricaoCompletaForm,
  inscricaoCompletaSchema,
  DOCUMENTOS_OBRIGATORIOS,
} from '@/lib/inscricao-validation';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, Send, Check, FileText } from 'lucide-react';
import { DadosPessoaisStep } from './steps/DadosPessoaisStep';
import { PessoaJuridicaStep } from './steps/PessoaJuridicaStep';
import { ConsultorioHorariosStep } from './steps/ConsultorioHorariosStep';
import { DocumentosStep } from './steps/DocumentosStep';
import { RevisaoStep } from './steps/RevisaoStep';
import { toast } from 'sonner';
import { ValidatedDataProvider } from '@/contexts/ValidatedDataContext';

const STEPS = [
  {
    id: 1,
    title: 'Dados Pessoais',
    description: 'Informações do médico',
  },
  {
    id: 2,
    title: 'Pessoa Jurídica',
    description: 'Dados da empresa',
  },
  {
    id: 3,
    title: 'Consultório e Horários',
    description: 'Especialidades e atendimento',
  },
  {
    id: 4,
    title: 'Documentos',
    description: 'Upload de arquivos',
  },
  {
    id: 5,
    title: 'Revisão e Envio',
    description: 'Conferir e finalizar',
  },
];

interface InscricaoWizardProps {
  editalId?: string;
  editalTitulo?: string;
  onSubmit: (data: InscricaoCompletaForm) => Promise<void>;
}

export function InscricaoWizard({ editalId, editalTitulo, onSubmit }: InscricaoWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InscricaoCompletaForm>({
    resolver: zodResolver(inscricaoCompletaSchema),
    defaultValues: {
      sexo: 'M',
      optante_simples: false,
      atendimento_hora_marcada: true,
      quantidade_consultas_minima: 20,
      horarios: [],
      documentos: DOCUMENTOS_OBRIGATORIOS.map((doc) => ({
        tipo: doc.tipo,
        status: 'faltante',
      })),
    },
    mode: 'onChange',
  });

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = async () => {
    let fieldsToValidate: (keyof InscricaoCompletaForm)[] = [];

    // Validar apenas os campos da etapa atual
    switch (currentStep) {
      case 1:
        fieldsToValidate = [
          'cpf',
          'data_nascimento',
          'nome_completo',
          'rg',
          'orgao_emissor',
          'sexo',
          'crm',
          'uf_crm',
        ];
        break;
      case 2:
        fieldsToValidate = [
          'cnpj',
          'denominacao_social',
          'logradouro',
          'numero',
          'bairro',
          'cidade',
          'estado',
          'cep',
          'telefone',
          'celular',
          'email',
          'banco_agencia',
          'banco_conta',
        ];
        break;
      case 3:
        fieldsToValidate = [
          'endereco_correspondencia',
          'telefone_correspondencia',
          'celular_correspondencia',
          'email_correspondencia',
          'endereco_consultorio',
          'telefone_consultorio',
          'especialidades_ids',
          'quantidade_consultas_minima',
          'horarios',
        ];
        break;
      case 4:
        // Validar documentos
        const documentosEnviados = form.getValues('documentos').filter(d => d.arquivo || d.url).length;
        const documentosObrigatorios = DOCUMENTOS_OBRIGATORIOS.filter(d => d.obrigatorio).length;
        if (documentosEnviados < documentosObrigatorios) {
          toast.error('Por favor, envie todos os documentos obrigatórios antes de continuar');
          return;
        }
        break;
    }

    // Validar os campos da etapa atual
    const isValid = await form.trigger(fieldsToValidate as any);

    if (!isValid) {
      toast.error('Por favor, corrija os erros antes de continuar');
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (data: InscricaoCompletaForm) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      toast.success('Inscrição enviada com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar inscrição. Tente novamente.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <DadosPessoaisStep form={form} />;
      case 2:
        return <PessoaJuridicaStep form={form} />;
      case 3:
        return <ConsultorioHorariosStep form={form} />;
      case 4:
        return <DocumentosStep form={form} />;
      case 5:
        return <RevisaoStep form={form} />;
      default:
        return null;
    }
  };

  return (
    <ValidatedDataProvider>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Edital Info */}
        {editalTitulo && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Inscrevendo-se em:</p>
                  <p className="text-lg font-bold text-primary">{editalTitulo}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Bar */}
        <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Etapa {currentStep} de {STEPS.length}</span>
              <span className="text-muted-foreground">{Math.round(progress)}% completo</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Steps Indicator */}
      <div className="grid grid-cols-5 gap-2">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-300 ${
              step.id === currentStep
                ? 'border-primary bg-primary/10'
                : step.id < currentStep
                ? 'border-[hsl(var(--green-approved))] bg-[hsl(var(--green-approved)_/_0.1)]'
                : 'border-border'
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold transition-all ${
                step.id === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : step.id < currentStep
                  ? 'bg-[hsl(var(--green-approved))] text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.id < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{step.id}</span>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs font-medium line-clamp-1">{step.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-1 hidden md:block">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              {renderStep()}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>

        {currentStep < STEPS.length ? (
          <Button type="button" onClick={handleNext} className="gap-2">
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting}
            className="gap-2 bg-[hsl(var(--green-approved))] hover:bg-[hsl(var(--green-approved)_/_0.9)]"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Inscrição
              </>
            )}
          </Button>
        )}
      </div>
    </div>
    </ValidatedDataProvider>
  );
}
