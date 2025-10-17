import { UseFormReturn } from 'react-hook-form';
import { InscricaoCompletaForm } from '@/lib/inscricao-schema-unificado';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CEPInput, TelefoneInput, CelularInput } from '@/components/credenciado/MaskedInputs';
import { CheckCircle2, Loader2, Search, AlertCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { validateCEP } from '@/lib/validators';
import { toast } from 'sonner';
import { formatCEP } from '@/utils/formatters';
import { cleanMask } from '@/utils/maskHelpers';

interface EnderecoCorrespondenciaStepProps {
  form: UseFormReturn<InscricaoCompletaForm>;
}

export function EnderecoCorrespondenciaStep({ form }: EnderecoCorrespondenciaStepProps) {
  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  const [cepValidated, setCepValidated] = useState(false);

  const handleSearchCEP = async () => {
    const cep = form.getValues('cep_correspondencia');

    if (!cep || cleanMask(cep).length < 8) {
      toast.error('Por favor, insira o CEP completo');
      return;
    }

    setIsSearchingCEP(true);
    setCepValidated(false);

    try {
      const cleanedCep = cleanMask(cep);
      const result = await validateCEP(cleanedCep);

      if (result.valid && result.data) {
        // Auto-preencher endereço
        form.setValue('logradouro_correspondencia', result.data.street || '', { shouldValidate: true });
        form.setValue('bairro_correspondencia', result.data.neighborhood || '', { shouldValidate: true });
        form.setValue('cidade_correspondencia', result.data.city || '', { shouldValidate: true });
        form.setValue('uf_correspondencia', result.data.state || '', { shouldValidate: true });
        form.setValue('cep_correspondencia', formatCEP(cleanedCep), { shouldValidate: true });

        toast.success('CEP encontrado! Endereço preenchido automaticamente.');
        setCepValidated(true);
      } else {
        toast.error('CEP não encontrado');
        setCepValidated(false);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP');
      setCepValidated(false);
    } finally {
      setIsSearchingCEP(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold mb-2">Endereço de Correspondência</h3>
        <p className="text-sm text-muted-foreground">
          Endereço para recebimento de correspondências e contato
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Buscar por CEP</h4>
        
        <FormField
          control={form.control}
          name="cep_correspondencia"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP *</FormLabel>
              <div className="space-y-2">
                <FormControl>
                  <CEPInput
                    {...field}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      setCepValidated(false);
                    }}
                  />
                </FormControl>
                {cepValidated && (
                  <Badge variant="outline" className="gap-1 border-[hsl(var(--green-approved))] text-[hsl(var(--green-approved))]">
                    <CheckCircle2 className="h-3 w-3" />
                    CEP Validado
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
          onClick={handleSearchCEP}
          disabled={isSearchingCEP || cepValidated}
          className="w-full md:w-auto gap-2"
        >
          {isSearchingCEP ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando CEP...
            </>
          ) : cepValidated ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              CEP Validado
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Buscar por CEP
            </>
          )}
        </Button>
      </div>

      <Separator />

      <div>
        <h4 className="font-medium mb-4">Dados do Endereço</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="logradouro_correspondencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logradouro *</FormLabel>
                    <div className="space-y-2">
                      <FormControl>
                        <Input placeholder="Rua das Flores" {...field} />
                      </FormControl>
                      {cepValidated && field.value && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Sparkles className="h-3 w-3" />
                          <span>Auto-preenchido pelo CEP</span>
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
              name="numero_correspondencia"
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
              name="complemento_correspondencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento</FormLabel>
                  <FormControl>
                    <Input placeholder="Apto 101" {...field} />
                  </FormControl>
                  <FormDescription>Opcional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bairro_correspondencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro *</FormLabel>
                  <div className="space-y-2">
                    <FormControl>
                      <Input placeholder="Centro" {...field} />
                    </FormControl>
                    {cepValidated && field.value && (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cidade_correspondencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade *</FormLabel>
                  <div className="space-y-2">
                    <FormControl>
                      <Input placeholder="Porto Alegre" {...field} />
                    </FormControl>
                    {cepValidated && field.value && (
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
              name="uf_correspondencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UF *</FormLabel>
                  <div className="space-y-2">
                    <FormControl>
                      <Input placeholder="RS" {...field} maxLength={2} />
                    </FormControl>
                    {cepValidated && field.value && (
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="telefone_correspondencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone *</FormLabel>
                <FormControl>
                  <TelefoneInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="celular_correspondencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Celular *</FormLabel>
                <FormControl>
                  <CelularInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email_correspondencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="contato@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
