import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  nome_consultorio: z.string().min(3, 'Nome muito curto'),
  cnes: z.string().length(7, 'CNES deve ter 7 dígitos'),
  telefone: z.string().optional(),
  ramal: z.string().optional(),
  cep: z.string().min(8, 'CEP inválido'),
  logradouro: z.string().min(3, 'Logradouro obrigatório'),
  numero: z.string().min(1, 'Número obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro obrigatório'),
  cidade: z.string().min(2, 'Cidade obrigatória'),
  estado: z.string().length(2, 'UF deve ter 2 letras'),
  responsavel_tecnico_nome: z.string().min(3, 'Nome do responsável obrigatório'),
  responsavel_tecnico_crm: z.string().min(6, 'CRM inválido'),
  responsavel_tecnico_uf: z.string().length(2, 'UF do CRM obrigatória'),
  is_principal: z.boolean().default(false),
});

interface FormularioConsultorioProps {
  dadosIniciais?: any;
  onSalvar: (dados: any) => void;
  onCancelar: () => void;
  possuiPrincipal?: boolean;
}

export function FormularioConsultorio({ dadosIniciais, onSalvar, onCancelar, possuiPrincipal }: FormularioConsultorioProps) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: dadosIniciais || {
      nome_consultorio: '',
      cnes: '',
      telefone: '',
      ramal: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      responsavel_tecnico_nome: '',
      responsavel_tecnico_crm: '',
      responsavel_tecnico_uf: '',
      is_principal: !possuiPrincipal,
    }
  });

  const buscarEnderecoPorCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        form.setValue('logradouro', data.logradouro);
        form.setValue('bairro', data.bairro);
        form.setValue('cidade', data.localidade);
        form.setValue('estado', data.uf);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSalvar)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nome_consultorio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Consultório *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: Clínica Central" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cnes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNES *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="0000000" maxLength={7} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="(00) 0000-0000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="ramal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ramal</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />
        <h4 className="font-semibold">Endereço</h4>

        <FormField
          control={form.control}
          name="cep"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP *</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="00000-000"
                  onBlur={(e) => buscarEnderecoPorCep(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-3">
            <FormField
              control={form.control}
              name="logradouro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logradouro *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
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
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="complemento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Complemento</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
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
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="estado"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado (UF) *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="RS" maxLength={2} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />
        <h4 className="font-semibold">Responsável Técnico</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="responsavel_tecnico_nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="responsavel_tecnico_crm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CRM *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="000000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="responsavel_tecnico_uf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UF *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="RS" maxLength={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {!possuiPrincipal && (
          <FormField
            control={form.control}
            name="is_principal"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox 
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">
                  Este é o consultório principal da rede
                </FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="submit">
            Salvar Consultório
          </Button>
        </div>
      </form>
    </Form>
  );
}
