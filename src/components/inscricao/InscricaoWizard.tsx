import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  InscricaoCompletaForm,
  getInscricaoSchema,
  getSchemaByTipo,
  DOCUMENTOS_OBRIGATORIOS,
} from '@/lib/inscricao-schema-unificado';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, Send, Check, FileText, Save, Clock } from 'lucide-react';
import { DadosPessoaisStep } from './steps/DadosPessoaisStep';
import { PessoaJuridicaStep } from './steps/PessoaJuridicaStep';
import { EnderecoCorrespondenciaStep } from './steps/EnderecoCorrespondenciaStep';
import { ConsultorioHorariosStep } from './steps/ConsultorioHorariosStep';
import { DocumentosStep } from './steps/DocumentosStep';
import { RevisaoStep } from './steps/RevisaoStep';
import { toast } from 'sonner';
import { ValidatedDataProvider } from '@/contexts/ValidatedDataContext';
import { useAutoSaveInscricao } from '@/hooks/useAutoSaveInscricao';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SuccessDialog } from './SuccessDialog';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useInscricaoFluxo, TipoCredenciamento } from '@/hooks/useInscricaoFluxo';
import { SelecionarTipoCredenciamento } from './SelecionarTipoCredenciamento';
import { GerenciarConsultoriosStep } from './steps/GerenciarConsultoriosStep';

interface InscricaoWizardProps {
  editalId?: string; // FASE 4: Obrigatório para buscar config de uploads
  editalTitulo?: string;
  onSubmit: (data: InscricaoCompletaForm) => Promise<void>;
  rascunhoInscricaoId?: string | null;
}

export function InscricaoWizard({ editalId, editalTitulo, onSubmit, rascunhoInscricaoId }: InscricaoWizardProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedRascunho, setHasLoadedRascunho] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [inscricaoEnviada, setInscricaoEnviada] = useState<{
    protocolo: string;
    dataEnvio: Date;
    emailCandidato: string;
  } | null>(null);
  const wizardContainerRef = useRef<HTMLDivElement>(null);

  // Hook de fluxo condicional PF/PJ
  const {
    tipoCredenciamento,
    setTipoCredenciamento,
    etapaAtual,
    etapas,
    progresso,
    proximaEtapa,
    etapaAnterior,
    isEtapaInicial,
    isEtapaFinal,
  } = useInscricaoFluxo();

  const form = useForm<InscricaoCompletaForm>({
    resolver: zodResolver(getInscricaoSchema(tipoCredenciamento)),
    defaultValues: {
      sexo: 'M',
      optante_simples: false,
      atendimento_hora_marcada: true,
      quantidade_consultas_minima: 20,
      horarios: [],
      especialidades_ids: [], // ✅ Array vazio por padrão
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

  // Salvar tipo no rascunho e sincronizar com formulário
  useEffect(() => {
    if (tipoCredenciamento && inscricaoId) {
      console.log('[WIZARD] 🔄 Sincronizando tipo:', tipoCredenciamento, 'para inscrição:', inscricaoId);
      form.setValue('tipo_credenciamento', tipoCredenciamento);
      
      supabase
        .from('inscricoes_edital')
        .update({ tipo_credenciamento: tipoCredenciamento })
        .eq('id', inscricaoId)
        .then(({ error }) => {
          if (error) {
            console.error('[WIZARD] ❌ Erro ao salvar tipo:', error);
          } else {
            console.log('[WIZARD] ✅ Tipo salvo e sincronizado com sucesso');
          }
        });
    }
  }, [tipoCredenciamento, inscricaoId]);

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

        // Restaurar tipo se existir
        if (inscricaoId) {
          const { data: inscricao } = await supabase
            .from('inscricoes_edital')
            .select('tipo_credenciamento')
            .eq('id', inscricaoId)
            .single();
          
          if (inscricao?.tipo_credenciamento) {
            const tipo = inscricao.tipo_credenciamento as TipoCredenciamento;
            setTipoCredenciamento(tipo);
            form.setValue('tipo_credenciamento', tipo);
            console.log('[WIZARD] Tipo carregado e sincronizado:', tipo);
          }
        }
        
        setHasLoadedRascunho(true);
        toast.success('📝 Continuando de onde você parou');
      } else {
        setHasLoadedRascunho(true);
      }
    };

    loadExistingRascunho();
  }, [loadRascunho, form, hasLoadedRascunho, editalId, inscricaoId]);

  // Scroll automático sempre que a etapa mudar
  useEffect(() => {
    // Scroll usando a ref (preferencial)
    wizardContainerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    // Fallback: scroll do window
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }, 50);

    // Anunciar mudança para leitores de tela
    const currentStepInfo = etapas[etapaAtual];
    if (currentStepInfo) {
      const announcement = `Etapa ${etapaAtual + 1} de ${etapas.length}: ${currentStepInfo.title}`;
      const ariaLive = document.getElementById('wizard-aria-live');
      if (ariaLive) {
        ariaLive.textContent = announcement;
      }
    }
  }, [etapaAtual, etapas]);

  const handleNext = async () => {
    const currentStepKey = etapas[etapaAtual]?.key;

    // Etapa 0: Seleção de tipo (não precisa validação)
    if (currentStepKey === 'tipo') {
      if (!tipoCredenciamento) {
        toast.error('Selecione o tipo de credenciamento');
        return;
      }
      proximaEtapa();
      return;
    }

    let fieldsToValidate: (keyof InscricaoCompletaForm)[] = [];

    // Validar baseado na etapa atual
    switch (currentStepKey) {
      case 'dados_pessoais':
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
      case 'pessoa_juridica':
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
      case 'endereco_correspondencia':
        // ✅ Validar apenas se for PJ (PF não tem essa etapa separada)
        if (tipoCredenciamento === 'PJ') {
          fieldsToValidate = [
            'cep_correspondencia',
            'logradouro_correspondencia',
            'numero_correspondencia',
            'bairro_correspondencia',
            'cidade_correspondencia',
            'uf_correspondencia',
            'telefone_correspondencia',
            'celular_correspondencia',
            'email_correspondencia',
          ];
        } else {
          fieldsToValidate = []; // PF pula validação dessa etapa
        }
        break;
      case 'consultorio':
        fieldsToValidate = [
          'endereco_consultorio',
          'quantidade_consultas_minima',
          // ✅ Removidos: telefone_consultorio, horarios, especialidades_ids (agora opcionais)
        ];
        break;
      case 'consultorios':
        // PJ: Verificar se tem pelo menos 1 consultório
        if (inscricaoId) {
          const { count } = await supabase
            .from('inscricao_consultorios')
            .select('*', { count: 'exact', head: true })
            .eq('inscricao_id', inscricaoId)
            .eq('ativo', true);
          
          if (!count || count === 0) {
            toast.error('Cadastre pelo menos 1 consultório para continuar');
            return;
          }
        }
        break;
      case 'documentos':
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
    if (fieldsToValidate.length > 0) {
      const isValid = await form.trigger(fieldsToValidate as any);
      console.log(`[WIZARD] Validação da etapa ${currentStepKey}:`, { isValid, fieldsToValidate });

      if (!isValid) {
        toast.error('Por favor, corrija os erros antes de continuar');
        return;
      }
    }

    // Salvar rascunho ao avançar etapa
    await saveRascunho();

    proximaEtapa();
  };

  const handlePrevious = () => {
    etapaAnterior();
  };

  const handleAcompanharInscricao = () => {
    setShowSuccessDialog(false);
    navigate('/minhas-inscricoes');
  };

  const handleNovaInscricao = () => {
    setShowSuccessDialog(false);
    navigate('/editais');
  };

  const handleSubmit = async (data: InscricaoCompletaForm) => {
    console.log('📝 [InscricaoWizard] handleSubmit chamado');
    
    if (isSubmitting) return;
    
    // ✅ AGUARDAR AUTO-SAVE SE ESTIVER SALVANDO
    if (isSaving) {
      toast.info('⏱️ Aguarde...', {
        description: 'Finalizando salvamento automático',
        duration: 2000,
      });
      
      // Aguardar até 5 segundos para isSaving voltar a false
      let waitCount = 0;
      while (isSaving && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      
      if (isSaving) {
        toast.error('❌ Erro', {
          description: 'Não foi possível finalizar o salvamento. Tente novamente.',
        });
        return;
      }
    }
    
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
        
        // 2️⃣ SÓ DEPOIS enviar via Edge Function
        let emailRetornado: string | null = null;
        
        if (inscricaoId && editalId) {
          console.log('[INSCRICAO] Enviando inscrição via edge function:', inscricaoId);
          const { supabase } = await import('@/integrations/supabase/client');
          
          // ✅ Chamar edge function que valida, atualiza status e notifica
          const { data: envioData, error: envioError } = await supabase.functions.invoke(
            'enviar-inscricao',
            {
              body: { inscricao_id: inscricaoId }
            }
          );
          
          if (envioError) {
            console.error('❌ Erro ao enviar inscrição:', envioError);
            throw new Error(envioError.message || 'Erro ao enviar inscrição');
          }
          
          console.log('✅ Inscrição enviada via edge function:', envioData);
          
          // Capturar email retornado pela edge function
          if (envioData?.email_candidato) {
            emailRetornado = envioData.email_candidato;
          }
        }
        
        return emailRetornado;
      })();

      const emailCandidato = (await Promise.race([submitPromise, timeoutPromise])) as string | null;
      
      // Buscar protocolo
      let protocolo = `IPE-${new Date().getFullYear()}-XXXXX`;
      if (inscricaoId) {
        const { data: inscricaoData } = await supabase
          .from('inscricoes_edital')
          .select('protocolo')
          .eq('id', inscricaoId)
          .single();
        
        if (inscricaoData?.protocolo) {
          protocolo = inscricaoData.protocolo;
        }
      }

      setInscricaoEnviada({
        protocolo,
        dataEnvio: new Date(),
        emailCandidato: emailCandidato || 'Não disponível',
      });

      setShowSuccessDialog(true);
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
    const currentStepKey = etapas[etapaAtual]?.key;
    
    switch (currentStepKey) {
      case 'tipo':
        return (
          <SelecionarTipoCredenciamento 
            onSelect={(tipo) => {
              setTipoCredenciamento(tipo);
              form.setValue('tipo_credenciamento', tipo);
              console.log('[WIZARD] Tipo selecionado e sincronizado:', tipo);
              proximaEtapa();
            }}
            selectedTipo={tipoCredenciamento}
          />
        );
      
      case 'dados_pessoais':
        return <DadosPessoaisStep form={form} />;
      
      case 'pessoa_juridica':
        return <PessoaJuridicaStep form={form} />;
      
      case 'endereco_correspondencia':
        return <EnderecoCorrespondenciaStep form={form} />;
      
      case 'consultorio':
        // PF: Consultório único
        return <ConsultorioHorariosStep form={form} editalId={editalId} />;
      
      case 'consultorios':
        // PJ: Múltiplos consultórios
        return <GerenciarConsultoriosStep inscricaoId={inscricaoId} />;
      
      case 'documentos':
        return (
          <DocumentosStep 
            form={form} 
            inscricaoId={inscricaoId} 
            editalId={editalId}
          />
        );
      
      case 'revisao':
        return <RevisaoStep form={form} />;
      
      default:
        return null;
    }
  };

  return (
    <ValidatedDataProvider>
      {/* Anúncio para leitores de tela */}
      <div
        id="wizard-aria-live"
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
      
      <div ref={wizardContainerRef} className="max-w-5xl mx-auto space-y-6 pb-32">
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
              <span className="font-medium">Etapa {etapaAtual + 1} de {etapas.length}</span>
              <span className="text-muted-foreground">{Math.round(progresso)}% completo</span>
            </div>
            <Progress value={progresso} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Steps Indicator */}
      <div className={`grid gap-2 ${etapas.length === 6 ? 'grid-cols-6' : 'grid-cols-5'}`}>
        {etapas.map((step) => (
          <div
            key={step.id}
            data-step={step.id === etapaAtual ? 'current' : step.id < etapaAtual ? 'completed' : 'pending'}
            className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-300 ${
              step.id === etapaAtual
                ? 'border-primary bg-primary/10 animate-pulse'
                : step.id < etapaAtual
                ? 'border-[hsl(var(--green-approved))] bg-[hsl(var(--green-approved)_/_0.1)]'
                : 'border-border'
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold transition-all ${
                step.id === etapaAtual
                  ? 'bg-primary text-primary-foreground'
                  : step.id < etapaAtual
                  ? 'bg-[hsl(var(--green-approved))] text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.id < etapaAtual ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{step.id + 1}</span>
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
          <CardTitle>{etapas[etapaAtual]?.title}</CardTitle>
          <CardDescription>{etapas[etapaAtual]?.description}</CardDescription>
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
      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border pt-4 pb-4 mt-8 -mx-6 px-6 z-50 shadow-lg flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={isEtapaInicial || isSubmitting}
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

        {!isEtapaFinal ? (
          <Button type="button" onClick={handleNext} disabled={isSubmitting} className="gap-2 ml-auto">
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting || isSaving}
            className="gap-2 ml-auto bg-[hsl(var(--green-approved))] hover:bg-[hsl(var(--green-approved)_/_0.9)]"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Enviando...
              </>
            ) : isSaving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Salvando...
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
      
      {/* Success Dialog */}
      {inscricaoEnviada && (
        <SuccessDialog
          open={showSuccessDialog}
          onOpenChange={setShowSuccessDialog}
          protocolo={inscricaoEnviada.protocolo}
          dataEnvio={inscricaoEnviada.dataEnvio}
          emailCandidato={inscricaoEnviada.emailCandidato}
          onAcompanhar={handleAcompanharInscricao}
          onNovaInscricao={handleNovaInscricao}
        />
      )}
    </div>
    </ValidatedDataProvider>
  );
}
