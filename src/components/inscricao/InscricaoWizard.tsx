import { useState, useEffect } from 'react';
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
import { ChevronLeft, ChevronRight, Send, Check, FileText, Save, Clock } from 'lucide-react';
import { DadosPessoaisStep } from './steps/DadosPessoaisStep';
import { PessoaJuridicaStep } from './steps/PessoaJuridicaStep';
import { ConsultorioHorariosStep } from './steps/ConsultorioHorariosStep';
import { DocumentosStep } from './steps/DocumentosStep';
import { RevisaoStep } from './steps/RevisaoStep';
import { toast } from 'sonner';
import { ValidatedDataProvider } from '@/contexts/ValidatedDataContext';
import { useAutoSaveInscricao } from '@/hooks/useAutoSaveInscricao';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  editalId?: string; // FASE 4: Obrigatório para buscar config de uploads
  editalTitulo?: string;
  onSubmit: (data: InscricaoCompletaForm) => Promise<void>;
  rascunhoInscricaoId?: string | null;
}

export function InscricaoWizard({ editalId, editalTitulo, onSubmit, rascunhoInscricaoId }: InscricaoWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedRascunho, setHasLoadedRascunho] = useState(false);

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

  // Hook de auto-save
  const {
    saveRascunho,
    loadRascunho,
    lastSaved,
    isSaving,
    inscricaoId
  } = useAutoSaveInscricao({
    editalId: editalId || '',
    formData: form.watch(),
    enabled: !isSubmitting && hasLoadedRascunho && !!editalId,
    onSaveSuccess: (id) => {
      console.log('Rascunho salvo com ID:', id);
    }
  });

  // Carregar rascunho ao montar
  useEffect(() => {
    const loadExistingRascunho = async () => {
      if (hasLoadedRascunho || !editalId) return;
      
      const rascunhoData = await loadRascunho();
      if (rascunhoData) {
        console.log('Rascunho carregado:', rascunhoData);
        
        // Restaurar dados no formulário
        Object.keys(rascunhoData).forEach((key) => {
          form.setValue(key as any, rascunhoData[key]);
        });
        
        setHasLoadedRascunho(true);
        toast.success('📝 Continuando de onde você parou');
      } else {
        setHasLoadedRascunho(true);
      }
    };

    loadExistingRascunho();
  }, [loadRascunho, form, hasLoadedRascunho, editalId]);

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
        // FASE 4: Validar documentos dinamicamente baseado na config do edital
        if (editalId) {
          const { supabase: supabaseClient } = await import('@/integrations/supabase/client');
          const { data: uploadsConfig } = await supabaseClient
            .from('editais')
            .select('uploads_config, inscription_template_id, inscription_templates!inner(anexos_obrigatorios)')
            .eq('id', editalId)
            .single();
          
          // Calcular documentos obrigatórios dinamicamente
          let documentosObrigatoriosCount = 0;
          if (uploadsConfig?.uploads_config) {
            documentosObrigatoriosCount = Object.values(uploadsConfig.uploads_config as any)
              .filter((c: any) => c.obrigatorio && c.habilitado)
              .length;
          } else if (uploadsConfig?.inscription_templates) {
            const template = uploadsConfig.inscription_templates as any;
            if (template.anexos_obrigatorios && Array.isArray(template.anexos_obrigatorios)) {
              documentosObrigatoriosCount = template.anexos_obrigatorios.filter((a: any) => a.obrigatorio).length;
            }
          } else {
            documentosObrigatoriosCount = DOCUMENTOS_OBRIGATORIOS.filter(d => d.obrigatorio).length;
          }

          const documentosEnviados = form.getValues('documentos').filter(d => d.arquivo || d.url).length;
          
          if (documentosEnviados < documentosObrigatoriosCount) {
            toast.error(`Por favor, envie todos os ${documentosObrigatoriosCount} documentos obrigatórios antes de continuar`);
            return;
          }
        } else {
          // Fallback para quando não há editalId
          const documentosEnviados = form.getValues('documentos').filter(d => d.arquivo || d.url).length;
          const documentosObrigatorios = DOCUMENTOS_OBRIGATORIOS.filter(d => d.obrigatorio).length;
          if (documentosEnviados < documentosObrigatorios) {
            toast.error('Por favor, envie todos os documentos obrigatórios antes de continuar');
            return;
          }
        }
        break;
    }

    // Validar os campos da etapa atual
    const isValid = await form.trigger(fieldsToValidate as any);

    if (!isValid) {
      toast.error('Por favor, corrija os erros antes de continuar');
      return;
    }

    // Salvar rascunho ao avançar etapa
    await saveRascunho();

    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (data: InscricaoCompletaForm) => {
    console.log('📝 [InscricaoWizard] handleSubmit chamado');
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    // Timeout de 30 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: operação demorou mais de 30 segundos')), 30000)
    );

    try {
      const submitPromise = (async () => {
        // Validar campos obrigatórios
        if (typeof data.data_nascimento === 'string') {
          data.data_nascimento = new Date(data.data_nascimento);
        }
        
        if (!data.data_nascimento || !(data.data_nascimento instanceof Date) || isNaN(data.data_nascimento.getTime())) {
          throw new Error('Data de nascimento inválida');
        }
        
        // 1️⃣ Executar onSubmit PRIMEIRO
        await onSubmit(data);
        
        // 2️⃣ SÓ DEPOIS marcar como enviado e iniciar workflow
        if (inscricaoId && editalId) {
          console.log('[INSCRICAO] Atualizando rascunho existente:', inscricaoId);
          const { supabase } = await import('@/integrations/supabase/client');
          
          // Marcar como não-rascunho
          const { error: updateError } = await supabase
            .from('inscricoes_edital')
            .update({ 
              is_rascunho: false,
              status: 'em_analise'
            })
            .eq('id', inscricaoId);
          
          if (updateError) {
            console.error('❌ Erro ao atualizar rascunho:', updateError);
            throw updateError;
          }
          console.log('✅ Rascunho marcado como enviado:', inscricaoId);
          
          // Buscar workflow do edital
          const { data: edital } = await supabase
            .from('editais')
            .select('workflow_id')
            .eq('id', editalId)
            .single();
          
          // O workflow será iniciado automaticamente pelo trigger
          console.log('[WIZARD] Inscrição enviada, workflow será processado pela fila automaticamente');
          
          if (edital?.workflow_id) {
            console.log('✅ Workflow será processado: ', edital.workflow_id);
          }
        }
      })();

      await Promise.race([submitPromise, timeoutPromise]);
      toast.success('Inscrição enviada com sucesso!');
    } catch (error: any) {
      console.error('[INSCRICAO] Erro:', error);
      
      let errorMessage = 'Erro ao enviar inscrição. Tente novamente.';
      if (error.message?.includes('Timeout')) {
        errorMessage = 'A operação demorou muito. Tente novamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
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
        return <ConsultorioHorariosStep form={form} editalId={editalId} />;
      case 4:
        return <DocumentosStep form={form} inscricaoId={inscricaoId} editalId={editalId} />;
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Inscrevendo-se em:</p>
                    <p className="text-lg font-bold text-primary">{editalTitulo}</p>
                  </div>
                </div>
                
                {/* Indicador de auto-save */}
                {lastSaved && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {isSaving ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4" />
                        <span>
                          Salvo {formatDistanceToNow(lastSaved, { addSuffix: true, locale: ptBR })}
                        </span>
                      </>
                    )}
                  </div>
                )}
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
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1 || isSubmitting}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>

        {/* Botão manual de salvar rascunho */}
        <Button
          type="button"
          variant="outline"
          onClick={() => saveRascunho()}
          disabled={isSaving || isSubmitting}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar
            </>
          )}
        </Button>

        {currentStep < STEPS.length ? (
          <Button type="button" onClick={handleNext} disabled={isSubmitting} className="gap-2 ml-auto">
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting}
            className="gap-2 ml-auto bg-[hsl(var(--green-approved))] hover:bg-[hsl(var(--green-approved)_/_0.9)]"
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
