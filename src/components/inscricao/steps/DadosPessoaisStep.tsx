import { UseFormReturn } from 'react-hook-form';
import { InscricaoCompletaForm } from '@/lib/inscricao-validation';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { validateCRM, validateCPFData, validateNIT, formatCPF } from '@/lib/validators';
import { toast } from 'sonner';
import { useValidatedData } from '@/contexts/ValidatedDataContext';

interface DadosPessoaisStepProps {
  form: UseFormReturn<InscricaoCompletaForm>;
}

export function DadosPessoaisStep({ form }: DadosPessoaisStepProps) {
  const [isValidatingCPF, setIsValidatingCPF] = useState(false);
  const [cpfValidated, setCpfValidated] = useState(false);
  const [isValidatingCRM, setIsValidatingCRM] = useState(false);
  const [crmValidated, setCrmValidated] = useState(false);
  const [birthDateMismatch, setBirthDateMismatch] = useState(false);
  
  const { setCpfData, setCrmData } = useValidatedData();

  const handleValidateCPF = async () => {
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

    setIsValidatingCPF(true);
    setBirthDateMismatch(false);

    try {
      const result = await validateCPFData(
        cpf,
        format(dataNascimento, 'yyyy-MM-dd')
      );

      if (result.valid && result.data) {
        // Auto-preencher nome completo
        form.setValue('nome_completo', result.data.nome, { shouldValidate: true });
        
        // Verificar se a data de nascimento bate
        const apiDate = new Date(result.data.data_nascimento);
        const formDate = new Date(dataNascimento);
        
        if (apiDate.getTime() !== formDate.getTime()) {
          setBirthDateMismatch(true);
          toast.warning('A data de nascimento não corresponde ao CPF informado');
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
        try {
          const nitResult = await validateNIT(
            cpf,
            result.data.nome,
            format(dataNascimento, 'yyyy-MM-dd')
          );

          if (nitResult.valid && nitResult.data) {
            form.setValue('nit_pis_pasep', nitResult.data.nit, { shouldValidate: true });
            toast.success(`CPF e NIT validados! Titular: ${result.data.nome}`);
          } else {
            toast.success(`CPF validado! Titular: ${result.data.nome}`);
            toast.info('NIT/PIS/PASEP não encontrado automaticamente');
          }
        } catch (error) {
          console.log('Erro ao buscar NIT, continuando sem ele');
          toast.success(`CPF validado! Titular: ${result.data.nome}`);
        }

        setCpfValidated(true);
      } else {
        toast.error(result.message || 'CPF não encontrado na Receita Federal');
        setCpfValidated(false);
      }
    } catch (error) {
      console.error('Erro ao validar CPF:', error);
      toast.error('Erro ao validar CPF');
      setCpfValidated(false);
    } finally {
      setIsValidatingCPF(false);
    }
  };

  const handleValidateCRM = async () => {
    const crm = form.getValues('crm');
    const uf = form.getValues('uf_crm');

    if (!crm || !uf) {
      toast.error('Por favor, insira o CRM e a UF');
      return;
    }

    setIsValidatingCRM(true);

    try {
      const result = await validateCRM(crm, uf);

      if (result.valid && result.data) {
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

        setCrmValidated(true);
        toast.success(`CRM validado! Profissional: ${result.data.nome}`);
      } else {
        toast.error(result.message || 'CRM não encontrado');
        setCrmValidated(false);
      }
    } catch (error) {
      console.error('Erro ao validar CRM:', error);
      toast.error('Erro ao validar CRM');
      setCrmValidated(false);
    } finally {
      setIsValidatingCRM(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Validação de Dados</h3>
            <p className="text-sm text-muted-foreground mt-1">Preencha os campos abaixo para validar seus dados automaticamente</p>
          </div>
          {cpfValidated && (
            <Badge className="gap-1.5 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Validado
            </Badge>
          )}
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    onChange={(e) => {
                      field.onChange(formatCPF(e.target.value));
                      setCpfValidated(false);
                      setBirthDateMismatch(false);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_nascimento"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Nascimento *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                        ) : (
                          <span>Selecione a data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setCpfValidated(false);
                        setBirthDateMismatch(false);
                      }}
                      disabled={(date) =>
                        date > new Date() || date < new Date('1900-01-01')
                      }
                      initialFocus
                      captionLayout="dropdown-buttons"
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            type="button"
            onClick={handleValidateCPF}
            disabled={isValidatingCPF || cpfValidated}
            className={cn(
              "w-full md:w-auto gap-2",
              cpfValidated && "bg-green-600 hover:bg-green-700"
            )}
          >
            {isValidatingCPF ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validando...
              </>
            ) : cpfValidated ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Validado com Sucesso
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Validar na Receita Federal
              </>
            )}
          </Button>

          {cpfValidated && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted">
                <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                CPF validado na Receita Federal
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted">
                <Sparkles className="h-3 w-3" />
                Nome auto-preenchido
              </span>
            </div>
          )}
        </div>

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
                {cpfValidated && (
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
                  <Input {...field} placeholder="00.000.000-0" />
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
                {cpfValidated && field.value && (
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
                    <Input
                      {...field}
                      placeholder="12345"
                      onChange={(e) => {
                        field.onChange(e);
                        setCrmValidated(false);
                      }}
                    />
                  </FormControl>
                  {crmValidated && (
                    <Badge variant="outline" className="gap-1 border-[hsl(var(--green-approved))] text-[hsl(var(--green-approved))]">
                      <CheckCircle2 className="h-3 w-3" />
                      CRM Validado no CFM
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
                    setCrmValidated(false);
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
          disabled={isValidatingCRM || crmValidated}
          className="w-full md:w-auto gap-2"
        >
          {isValidatingCRM ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando CRM...
            </>
          ) : crmValidated ? (
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
                  {crmValidated && field.value && (
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
                  {crmValidated && field.value && (
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
