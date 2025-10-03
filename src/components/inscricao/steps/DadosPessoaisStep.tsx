import { UseFormReturn } from 'react-hook-form';
import { InscricaoCompletaForm } from '@/lib/inscricao-validation';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { validateCRM, validateCPFData } from '@/lib/validators';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { parse, format as formatDate } from 'date-fns';

interface DadosPessoaisStepProps {
  form: UseFormReturn<InscricaoCompletaForm>;
}

export function DadosPessoaisStep({ form }: DadosPessoaisStepProps) {
  const [isValidatingCRM, setIsValidatingCRM] = useState(false);
  const [crmValidated, setCrmValidated] = useState(false);
  const [isValidatingCPF, setIsValidatingCPF] = useState(false);
  const [cpfValidated, setCpfValidated] = useState(false);
  const { toast } = useToast();

  const handleValidateCRM = async () => {
    const crm = form.getValues('crm');
    const uf = form.getValues('uf_crm');

    if (!crm || !uf) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o CRM e a UF antes de validar",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingCRM(true);
    setCrmValidated(false);

    try {
      const result = await validateCRM(crm, uf);

      if (result.valid && result.data) {
        setCrmValidated(true);
        form.setValue('nome_completo', result.data.nome);
        toast({
          title: "CRM validado com sucesso!",
          description: `Médico: ${result.data.nome} - Situação: ${result.data.situacao}`,
        });
      } else {
        toast({
          title: "CRM não encontrado",
          description: result.message || "Verifique o número do CRM e a UF",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao validar CRM",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsValidatingCRM(false);
    }
  };

  const handleValidateCPF = async () => {
    const cpf = form.getValues('cpf');
    const dataNascimento = form.getValues('data_nascimento');

    if (!cpf || !dataNascimento) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o CPF e a data de nascimento antes de validar",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingCPF(true);
    setCpfValidated(false);

    try {
      // Format date to YYYY-MM-DD for API
      const birthdate = formatDate(dataNascimento, 'yyyy-MM-dd');
      const result = await validateCPFData(cpf, birthdate);

      if (result.valid && result.data) {
        setCpfValidated(true);
        
        // Auto-fill form fields
        form.setValue('nome_completo', result.data.nome);
        
        toast({
          title: "CPF validado com sucesso!",
          description: `${result.data.nome} - ${result.data.situacao_cadastral}`,
        });
      } else {
        toast({
          title: "CPF não encontrado",
          description: result.message || "Verifique o CPF e a data de nascimento",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao validar CPF",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsValidatingCPF(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold mb-2">Dados Pessoais do Médico</h3>
        <p className="text-sm text-muted-foreground">
          Preencha com seus dados pessoais e profissionais
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="crm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CRM *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="12345" 
                  {...field} 
                  onChange={(e) => {
                    field.onChange(e);
                    setCrmValidated(false);
                  }}
                />
              </FormControl>
              <FormMessage />
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
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="AC">AC - Acre</SelectItem>
                  <SelectItem value="AL">AL - Alagoas</SelectItem>
                  <SelectItem value="AP">AP - Amapá</SelectItem>
                  <SelectItem value="AM">AM - Amazonas</SelectItem>
                  <SelectItem value="BA">BA - Bahia</SelectItem>
                  <SelectItem value="CE">CE - Ceará</SelectItem>
                  <SelectItem value="DF">DF - Distrito Federal</SelectItem>
                  <SelectItem value="ES">ES - Espírito Santo</SelectItem>
                  <SelectItem value="GO">GO - Goiás</SelectItem>
                  <SelectItem value="MA">MA - Maranhão</SelectItem>
                  <SelectItem value="MT">MT - Mato Grosso</SelectItem>
                  <SelectItem value="MS">MS - Mato Grosso do Sul</SelectItem>
                  <SelectItem value="MG">MG - Minas Gerais</SelectItem>
                  <SelectItem value="PA">PA - Pará</SelectItem>
                  <SelectItem value="PB">PB - Paraíba</SelectItem>
                  <SelectItem value="PR">PR - Paraná</SelectItem>
                  <SelectItem value="PE">PE - Pernambuco</SelectItem>
                  <SelectItem value="PI">PI - Piauí</SelectItem>
                  <SelectItem value="RJ">RJ - Rio de Janeiro</SelectItem>
                  <SelectItem value="RN">RN - Rio Grande do Norte</SelectItem>
                  <SelectItem value="RS">RS - Rio Grande do Sul</SelectItem>
                  <SelectItem value="RO">RO - Rondônia</SelectItem>
                  <SelectItem value="RR">RR - Roraima</SelectItem>
                  <SelectItem value="SC">SC - Santa Catarina</SelectItem>
                  <SelectItem value="SP">SP - São Paulo</SelectItem>
                  <SelectItem value="SE">SE - Sergipe</SelectItem>
                  <SelectItem value="TO">TO - Tocantins</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleValidateCRM}
          disabled={isValidatingCRM || !form.getValues('crm') || !form.getValues('uf_crm')}
          variant={crmValidated ? "outline" : "default"}
          className="flex items-center gap-2"
        >
          {isValidatingCRM ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando...
            </>
          ) : crmValidated ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              CRM Validado
            </>
          ) : (
            'Validar CRM no CFM'
          )}
        </Button>
      </div>

      <FormField
        control={form.control}
        name="nome_completo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome Completo *</FormLabel>
            <FormControl>
              <Input placeholder="João da Silva Santos" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    }}
                    disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cpf"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF *</FormLabel>
              <FormControl>
                <Input
                  placeholder="000.000.000-00"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    const formatted = value
                      .replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                    field.onChange(formatted);
                    setCpfValidated(false);
                  }}
                  maxLength={14}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleValidateCPF}
          disabled={isValidatingCPF || !form.getValues('cpf') || !form.getValues('data_nascimento')}
          variant={cpfValidated ? "outline" : "default"}
          className="flex items-center gap-2"
        >
          {isValidatingCPF ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando CPF...
            </>
          ) : cpfValidated ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              CPF Validado
            </>
          ) : (
            'Validar CPF na Receita Federal'
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="rg"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RG *</FormLabel>
              <FormControl>
                <Input placeholder="1234567890" {...field} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="orgao_emissor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Órgão Emissor *</FormLabel>
              <FormControl>
                <Input placeholder="SSP/RS" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nit_pis_pasep"
          render={({ field }) => (
            <FormItem>
              <FormLabel>NIT / PIS / PASEP</FormLabel>
              <FormControl>
                <Input placeholder="000.00000.00-0" {...field} />
              </FormControl>
              <FormDescription>Campo opcional</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

    </div>
  );
}
