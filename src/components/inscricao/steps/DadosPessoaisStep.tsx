import { UseFormReturn } from 'react-hook-form';
import { InscricaoCompletaForm } from '@/lib/inscricao-schema-unificado';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { CPFInput, RGInput, CRMInput } from '@/components/credenciado/MaskedInputs';
import { cleanMask } from '@/utils/maskHelpers';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { validateCRM, validateCPFData, validateNIT } from '@/lib/validators';
import { toast } from 'sonner';
import { useValidatedData } from '@/contexts/ValidatedDataContext';
import type { CPFValidationData, CRMValidationData } from '@/lib/validators';
import { useRef } from 'react';
import { isSameDateIgnoringTime, parseISODateSafe, parseBrazilianDate } from '@/utils/dateComparison';

interface DadosPessoaisStepProps {
  form: UseFormReturn<InscricaoCompletaForm>;
}

type CPFValidationState = 
  | { status: 'idle' }
  | { status: 'validating-cpf' }
  | { status: 'validating-nit' }
  | { status: 'success'; data: CPFValidationData & { nit?: string } }
  | { status: 'error'; code: 'format' | 'not-found' | 'api-error' | 'birthdate-mismatch' | 'age-restriction'; message: string };

type CRMValidationState = 
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'success'; data: CRMValidationData }
  | { status: 'error'; message: string };

export function DadosPessoaisStep({ form }: DadosPessoaisStepProps) {
  const [cpfState, setCpfState] = useState<CPFValidationState>({ status: 'idle' });
  const [crmState, setCrmState] = useState<CRMValidationState>({ status: 'idle' });
  const [birthDateMismatch, setBirthDateMismatch] = useState(false);
  const [isValidatingCPF, setIsValidatingCPF] = useState(false);
  const [isValidatingCRM, setIsValidatingCRM] = useState(false);
  
  const cpfAbortControllerRef = useRef<AbortController | null>(null);
  const crmAbortControllerRef = useRef<AbortController | null>(null);
  
  const { setCpfData, setCrmData } = useValidatedData();

  const handleValidateCPF = async () => {
    // Prevenir múltiplas chamadas simultâneas
    if (isValidatingCPF) {
      toast.info('Aguarde a validação atual terminar');
      return;
    }
    const cpf = form.getValues('cpf');
    const dataNascimento = form.getValues('data_nascimento');

    if (!cpf) {
      toast.error('Por favor, insira o CPF');
      return;
    }

    if (!dataNascimento) {
      toast.error('Por favor, insira a data de nascimento');
      return;
    }

    // Cancelar validação anterior
    if (cpfAbortControllerRef.current) {
      cpfAbortControllerRef.current.abort();
    }
    cpfAbortControllerRef.current = new AbortController();

    setIsValidatingCPF(true);
    setCpfState({ status: 'validating-cpf' });
    setBirthDateMismatch(false);

    try {
      const cleanedCpf = cleanMask(cpf);
      const result = await validateCPFData(
        cleanedCpf,
        format(dataNascimento, 'yyyy-MM-dd'),
        cpfAbortControllerRef.current.signal
      );

      if (!result.valid) {
        setCpfState({ 
          status: 'error', 
          code: result.code || 'not-found',
          message: result.message || 'Erro ao validar CPF' 
        });
        
        if (result.code === 'birthdate-mismatch') {
          setBirthDateMismatch(true);
          toast.error('Data de nascimento divergente', {
            description: 'A data informada não confere com os registros da Receita Federal. Isso pode acontecer se:\n• Você digitou a data errada\n• Há um erro no seu cadastro na Receita Federal\n\nVerifique sua certidão de nascimento e tente novamente.',
            duration: 10000
          });
        } else if (result.code === 'age-restriction') {
          toast.error('Restrição de Idade', {
            description: 'É necessário ter pelo menos 18 anos completos para se inscrever neste edital.',
            duration: 6000
          });
        } else {
          toast.error(result.message || 'CPF não encontrado na Receita Federal');
        }
        return;
      }

      if (!result.data) {
        setCpfState({ 
          status: 'error', 
          code: 'not-found',
          message: 'Dados do CPF não encontrados' 
        });
        toast.error('Dados do CPF não encontrados');
        return;
      }

      // Auto-preencher nome completo
      form.setValue('nome_completo', result.data.nome, { shouldValidate: true });
      
      // Verificar se a data de nascimento bate (comparar apenas dia, mês e ano)
      const apiDateString = result.data.data_nascimento; // Pode vir como "DD/MM/YYYY" (brasileiro) ou "YYYY-MM-DD" (ISO)
      const formDateString = format(dataNascimento, 'yyyy-MM-dd'); // "YYYY-MM-DD" formato ISO

      // Converter data brasileira para ISO se necessário
      const apiDateISO = apiDateString.includes('/') ? parseBrazilianDate(apiDateString) : apiDateString;

      if (!apiDateISO) {
        console.error('Formato de data inválido retornado pela API:', apiDateString);
        setCpfState({ 
          status: 'error', 
          code: 'api-error',
          message: 'Erro ao processar data de nascimento da API' 
        });
        toast.error('Erro de processamento', {
          description: 'Formato de data retornado pela Receita Federal é inválido. Tente novamente.',
        });
        return;
      }

      console.log('[CPF_VALIDATION] Comparando datas:', {
        api_formato_original: apiDateString,
        api_formato_iso: apiDateISO,
        formulario: formDateString
      });
      
      if (!isSameDateIgnoringTime(apiDateISO, formDateString)) {
        setBirthDateMismatch(true);
        setCpfState({ 
          status: 'error', 
          code: 'birthdate-mismatch',
          message: 'A data de nascimento não corresponde ao CPF informado' 
        });
        toast.error('Data de nascimento divergente', {
          description: `A data informada (${format(dataNascimento, 'dd/MM/yyyy')}) não confere com os registros da Receita Federal (${apiDateString.includes('/') ? apiDateString : format(parseISODateSafe(apiDateISO), 'dd/MM/yyyy')}). Verifique se digitou corretamente.`,
          duration: 10000
        });
        return;
      }

      // Salvar dados no context
      setCpfData({
        validated: true,
        nome: result.data.nome,
        data_nascimento: result.data.data_nascimento,
        situacao: result.data.situacao_cadastral || 'regular',
        cpf: cpf,
      });

      // Tentar buscar o NIT/PIS/PASEP automaticamente
      setCpfState({ status: 'validating-nit' });
      
      try {
        const nitResult = await validateNIT(
          cleanedCpf,
          result.data.nome,
          format(dataNascimento, 'yyyy-MM-dd'),
          cpfAbortControllerRef.current.signal
        );

        if (nitResult.valid && nitResult.data) {
          form.setValue('nit_pis_pasep', nitResult.data.nit, { shouldValidate: true });
          
          setCpfState({ 
            status: 'success', 
            data: { ...result.data, nit: nitResult.data.nit } 
          });
          
          toast.success(`CPF e NIT validados! Titular: ${result.data.nome}`);
        } else {
          setCpfState({ 
            status: 'success', 
            data: result.data 
          });
          
          toast.success(`CPF validado! Titular: ${result.data.nome}`);
          toast.info('NIT/PIS/PASEP não encontrado automaticamente');
        }
      } catch (nitError: any) {
        if (nitError.name !== 'AbortError') {
          console.log('Erro ao buscar NIT, continuando sem ele');
          
          setCpfState({ 
            status: 'success', 
            data: result.data 
          });
          
          toast.success(`CPF validado! Titular: ${result.data.nome}`);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Erro ao validar CPF:', error);
        setCpfState({ 
          status: 'error', 
          code: 'api-error',
          message: 'Erro ao validar CPF' 
        });
        toast.error('Erro ao validar CPF');
      }
    } finally {
      setIsValidatingCPF(false);
    }
  };

  const handleValidateCRM = async () => {
    // Prevenir múltiplas chamadas simultâneas
    if (isValidatingCRM) {
      toast.info('Aguarde a validação atual terminar');
      return;
    }

    const crm = cleanMask(form.getValues('crm'));
    const uf = form.getValues('uf_crm');

    if (!crm || !uf) {
      toast.error('Por favor, insira o CRM e a UF');
      return;
    }

    // Cancelar validação anterior
    if (crmAbortControllerRef.current) {
      crmAbortControllerRef.current.abort();
    }
    crmAbortControllerRef.current = new AbortController();

    setIsValidatingCRM(true);
    setCrmState({ status: 'validating' });

    try {
      const result = await validateCRM(crm, uf);

      if (!result.valid) {
        setCrmState({ 
          status: 'error',
          message: result.message || 'CRM não encontrado' 
        });
        toast.error(result.message || 'CRM não encontrado');
        return;
      }

      if (!result.data) {
        setCrmState({ 
          status: 'error',
          message: 'Dados do CRM não encontrados' 
        });
        toast.error('Dados do CRM não encontrados');
        return;
      }

      // Auto-preencher dados se nome ainda estiver vazio
      if (!form.getValues('nome_completo')) {
        form.setValue('nome_completo', result.data.nome, { shouldValidate: true });
      }

      // Salvar dados no context para usar nas próximas etapas
      setCrmData({
        validated: true,
        especialidades: result.data.especialidades || [],
        instituicao_graduacao: result.data.instituicao,
        ano_formatura: result.data.ano_formatura,
      });

      // Preencher instituição e ano de formatura se disponíveis
      if (result.data.instituicao) {
        form.setValue('instituicao_graduacao', result.data.instituicao);
      }
      if (result.data.ano_formatura) {
        form.setValue('ano_formatura', result.data.ano_formatura);
      }

      setCrmState({ status: 'success', data: result.data });
      toast.success(`CRM validado! Profissional: ${result.data.nome}`);
    } catch (error) {
      console.error('Erro ao validar CRM:', error);
      setCrmState({ 
        status: 'error',
        message: 'Erro ao validar CRM' 
      });
      toast.error('Erro ao validar CRM');
    } finally {
      setIsValidatingCRM(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Validação de Dados</h3>
        
        {/* CPF - Campo principal para validação */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF *</FormLabel>
                <div className="space-y-2">
                  <FormControl>
                    <CPFInput
                      {...field}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        setCpfState({ status: 'idle' });
                        setBirthDateMismatch(false);
                      }}
                    />
                  </FormControl>
                  {cpfState.status === 'validating-cpf' && (
                    <Badge variant="outline" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Consultando Receita Federal...
                    </Badge>
                  )}
                  
                  {cpfState.status === 'validating-nit' && (
                    <Badge variant="outline" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Consultando NIT/PIS/PASEP...
                    </Badge>
                  )}
                  
                  {cpfState.status === 'success' && (
                    <Badge variant="outline" className="gap-1 border-[hsl(var(--green-approved))] text-[hsl(var(--green-approved))]">
                      <CheckCircle2 className="h-3 w-3" />
                      CPF Validado na Receita Federal
                    </Badge>
                  )}
                  
                  {cpfState.status === 'error' && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {cpfState.message}
                    </Badge>
                  )}
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_nascimento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Nascimento *</FormLabel>
                <FormControl>
                  <DateInput
                    value={field.value}
                    onChange={(date) => {
                      field.onChange(date);
                      setCpfState({ status: 'idle' });
                      setBirthDateMismatch(false);
                    }}
                    disabled={(date) =>
                      date > new Date() || date < new Date('1900-01-01')
                    }
                    placeholder="DD/MM/AAAA"
                    minDate={new Date('1900-01-01')}
                    maxDate={new Date()}
                    error={!!form.formState.errors.data_nascimento}
                    showAge={true}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Digite no formato DD/MM/AAAA ou clique no calendário
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleValidateCPF}
          disabled={isValidatingCPF || cpfState.status === 'success'}
          className="w-full md:w-auto gap-2"
        >
          {cpfState.status === 'validating-cpf' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando CPF...
            </>
          ) : cpfState.status === 'validating-nit' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando NIT...
            </>
          ) : cpfState.status === 'success' ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              CPF Validado
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Validar CPF na Receita Federal
            </>
          )}
        </Button>

        {birthDateMismatch && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A data de nascimento informada não corresponde aos dados da Receita Federal.
              Por favor, verifique se a data está correta.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Dados Pessoais</h3>
        
        <FormField
          control={form.control}
          name="nome_completo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo *</FormLabel>
              <div className="space-y-2">
                <FormControl>
                  <Input {...field} placeholder="Nome completo conforme documento" />
                </FormControl>
                {cpfState.status === 'success' && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    <span>Auto-preenchido pela Receita Federal</span>
                  </div>
                )}
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="rg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RG *</FormLabel>
                <FormControl>
                  <RGInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="orgao_emissor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Órgão Emissor *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="SSP-RS" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sexo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sexo *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="nit_pis_pasep"
          render={({ field }) => (
            <FormItem>
              <FormLabel>NIT/PIS/PASEP</FormLabel>
              <div className="space-y-2">
                <FormControl>
                  <Input {...field} placeholder="000.00000.00-0" />
                </FormControl>
                {cpfState.status === 'success' && field.value && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    <span>Auto-preenchido pelo CNIS</span>
                  </div>
                )}
                <FormDescription>Campo opcional - preenchido automaticamente quando disponível</FormDescription>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Registro Profissional</h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="crm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CRM *</FormLabel>
                <div className="space-y-2">
                  <FormControl>
                    <CRMInput
                      {...field}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        setCrmState({ status: 'idle' });
                      }}
                    />
                  </FormControl>
                  {crmState.status === 'validating' && (
                    <Badge variant="outline" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Consultando CFM...
                    </Badge>
                  )}
                  
                  {crmState.status === 'success' && (
                    <Badge variant="outline" className="gap-1 border-[hsl(var(--green-approved))] text-[hsl(var(--green-approved))]">
                      <CheckCircle2 className="h-3 w-3" />
                      CRM Validado no CFM
                    </Badge>
                  )}
                  
                  {crmState.status === 'error' && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {crmState.message}
                    </Badge>
                  )}
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="uf_crm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UF do CRM *</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setCrmState({ status: 'idle' });
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a UF" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="RS">RS - Rio Grande do Sul</SelectItem>
                    <SelectItem value="SC">SC - Santa Catarina</SelectItem>
                    <SelectItem value="PR">PR - Paraná</SelectItem>
                    <SelectItem value="SP">SP - São Paulo</SelectItem>
                    <SelectItem value="RJ">RJ - Rio de Janeiro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleValidateCRM}
          disabled={crmState.status === 'validating' || crmState.status === 'success'}
          className="w-full md:w-auto gap-2"
        >
          {crmState.status === 'validating' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando CRM...
            </>
          ) : crmState.status === 'success' ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              CRM Validado
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Validar CRM no CFM
            </>
          )}
        </Button>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="instituicao_graduacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instituição de Graduação</FormLabel>
                <div className="space-y-2">
                  <FormControl>
                    <Input {...field} placeholder="Ex: UFRGS" />
                  </FormControl>
                  {crmState.status === 'success' && field.value && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      <span>Auto-preenchido pelo CFM</span>
                    </div>
                  )}
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ano_formatura"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ano de Formatura</FormLabel>
                <div className="space-y-2">
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Ex: 2010"
                      min={1950}
                      max={new Date().getFullYear()}
                    />
                  </FormControl>
                  {crmState.status === 'success' && field.value && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      <span>Auto-preenchido pelo CFM</span>
                    </div>
                  )}
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
