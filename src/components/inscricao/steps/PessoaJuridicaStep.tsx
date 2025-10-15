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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { validateCNPJData } from '@/lib/validators';
import { toast } from 'sonner';
import { CNPJInput, CEPInput, TelefoneInput, CelularInput } from '@/components/credenciado/MaskedInputs';
import { formatCNPJ, formatCEP, formatPhone } from '@/utils/formatters';
import { cleanMask } from '@/utils/maskHelpers';

interface PessoaJuridicaStepProps {
  form: UseFormReturn<InscricaoCompletaForm>;
}

export function PessoaJuridicaStep({ form }: PessoaJuridicaStepProps) {
  const [isValidatingCNPJ, setIsValidatingCNPJ] = useState(false);
  const [cnpjValidated, setCnpjValidated] = useState(false);
  const [cnpjInactive, setCnpjInactive] = useState(false);

  const handleValidateCNPJ = async () => {
    const cnpj = form.getValues('cnpj');

    if (!cnpj || cleanMask(cnpj).length < 14) {
      toast.error('Por favor, insira o CNPJ');
      return;
    }

    setIsValidatingCNPJ(true);
    setCnpjInactive(false);

    try {
      const cleanedCnpj = cleanMask(cnpj);
      const result = await validateCNPJData(cleanedCnpj);

      if (result.valid && result.data) {
        // Auto-preencher dados
        form.setValue('denominacao_social', result.data.razao_social, { shouldValidate: true });
        form.setValue('cnpj', formatCNPJ(cleanedCnpj), { shouldValidate: true });
        
        // Preencher endereço
        if (result.data.endereco) {
          form.setValue('logradouro', result.data.endereco.logradouro || '', { shouldValidate: true });
          form.setValue('numero', result.data.endereco.numero || '', { shouldValidate: true });
          form.setValue('complemento', result.data.endereco.complemento || '');
          form.setValue('bairro', result.data.endereco.bairro || '', { shouldValidate: true });
          form.setValue('cidade', result.data.endereco.cidade || '', { shouldValidate: true });
          form.setValue('estado', result.data.endereco.estado || '', { shouldValidate: true });
          if (result.data.endereco.cep) {
            form.setValue('cep', formatCEP(result.data.endereco.cep), { shouldValidate: true });
          }
        }

        // Preencher telefones se disponíveis
        if (result.data.telefone_1) {
          form.setValue('telefone', formatPhone(result.data.telefone_1), { shouldValidate: true });
        }
        if (result.data.telefone_2 && !form.getValues('celular')) {
          form.setValue('celular', formatPhone(result.data.telefone_2), { shouldValidate: true });
        }
        
        // Preencher email se disponível
        if (result.data.email) {
          form.setValue('email', result.data.email, { shouldValidate: true });
        }

        // Verificar se está inativa
        if (!result.data.situacao_ativa) {
          setCnpjInactive(true);
          toast.warning(`CNPJ validado mas empresa está: ${result.data.situacao_cadastral}`);
        } else {
          toast.success(`CNPJ validado! Empresa: ${result.data.razao_social}`);
        }

        setCnpjValidated(true);
      } else {
        toast.error(result.message || 'CNPJ não encontrado na Receita Federal');
        setCnpjValidated(false);
      }
    } catch (error) {
      console.error('Erro ao validar CNPJ:', error);
      toast.error('Erro ao validar CNPJ');
      setCnpjValidated(false);
    } finally {
      setIsValidatingCNPJ(false);
    }
  };
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold mb-2">Dados da Pessoa Jurídica</h3>
        <p className="text-sm text-muted-foreground">
          Informações da empresa (CNPJ)
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Validação de CNPJ</h4>
        
        <FormField
          control={form.control}
          name="cnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ *</FormLabel>
              <div className="space-y-2">
                <FormControl>
                  <CNPJInput
                    {...field}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      setCnpjValidated(false);
                      setCnpjInactive(false);
                    }}
                  />
                </FormControl>
                {cnpjValidated && (
                  <Badge variant="outline" className="gap-1 border-[hsl(var(--green-approved))] text-[hsl(var(--green-approved))]">
                    <CheckCircle2 className="h-3 w-3" />
                    CNPJ Validado na Receita Federal
                  </Badge>
                )}
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Button
          type="button"
          variant="outline"
          onClick={handleValidateCNPJ}
          disabled={isValidatingCNPJ || cnpjValidated}
          className="w-full md:w-auto gap-2"
        >
          {isValidatingCNPJ ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando CNPJ...
            </>
          ) : cnpjValidated ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              CNPJ Validado
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Validar CNPJ na Receita Federal
            </>
          )}
        </Button>

        {cnpjInactive && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A empresa está com situação cadastral irregular na Receita Federal.
              Verifique a situação antes de prosseguir.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Separator />

      <FormField
        control={form.control}
        name="denominacao_social"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Denominação Social (Razão Social) *</FormLabel>
            <div className="space-y-2">
              <FormControl>
                <Input placeholder="Clínica Médica LTDA" {...field} />
              </FormControl>
              {cnpjValidated && field.value && (
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

      <div>
        <h4 className="font-medium mb-4">Endereço da Empresa</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="logradouro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logradouro *</FormLabel>
                    <div className="space-y-2">
                      <FormControl>
                        <Input placeholder="Rua das Flores" {...field} />
                      </FormControl>
                      {cnpjValidated && field.value && (
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
            </div>

            <FormField
              control={form.control}
              name="numero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número *</FormLabel>
                  <FormControl>
                    <Input placeholder="123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="complemento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento</FormLabel>
                  <FormControl>
                    <Input placeholder="Sala 101" {...field} />
                  </FormControl>
                  <FormDescription>Opcional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bairro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro *</FormLabel>
                  <div className="space-y-2">
                    <FormControl>
                      <Input placeholder="Centro" {...field} />
                    </FormControl>
                    {cnpjValidated && field.value && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Sparkles className="h-3 w-3" />
                        <span>Auto-preenchido</span>
                      </div>
                    )}
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="cidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade *</FormLabel>
                  <div className="space-y-2">
                    <FormControl>
                      <Input placeholder="Porto Alegre" {...field} />
                    </FormControl>
                    {cnpjValidated && field.value && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Sparkles className="h-3 w-3" />
                        <span>Auto-preenchido</span>
                      </div>
                    )}
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UF *</FormLabel>
                  <div className="space-y-2">
                    <FormControl>
                      <Input placeholder="RS" {...field} maxLength={2} />
                    </FormControl>
                    {cnpjValidated && field.value && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Sparkles className="h-3 w-3" />
                        <span>Auto-preenchido</span>
                      </div>
                    )}
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cep"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP *</FormLabel>
                  <div className="space-y-2">
                    <FormControl>
                      <CEPInput {...field} />
                    </FormControl>
                    {cnpjValidated && field.value && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Sparkles className="h-3 w-3" />
                        <span>Auto-preenchido</span>
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

      <Separator />

      <div>
        <h4 className="font-medium mb-4">Contatos</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="telefone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone *</FormLabel>
                <div className="space-y-2">
                  <FormControl>
                    <TelefoneInput {...field} />
                  </FormControl>
                  {cnpjValidated && field.value && (
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

          <FormField
            control={form.control}
            name="celular"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Celular *</FormLabel>
                <div className="space-y-2">
                  <FormControl>
                    <CelularInput {...field} />
                  </FormControl>
                  {cnpjValidated && field.value && (
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
        </div>

        <div className="mt-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail *</FormLabel>
                <div className="space-y-2">
                  <FormControl>
                    <Input type="email" placeholder="contato@clinica.com.br" {...field} />
                  </FormControl>
                  {cnpjValidated && field.value && (
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
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-medium mb-4">Dados Bancários (Banrisul)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="banco_agencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agência *</FormLabel>
                <FormControl>
                  <Input placeholder="0001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="banco_conta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conta *</FormLabel>
                <FormControl>
                  <Input placeholder="12345678-9" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <FormField
        control={form.control}
        name="optante_simples"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Optante pelo Simples Nacional</FormLabel>
              <FormDescription>
                Marque esta opção se a empresa é optante pelo Simples Nacional
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}
