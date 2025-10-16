import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Stars } from './Stars';
import { useCriarAvaliacaoPublica } from '@/hooks/useAvaliacoesPublicas';
import { avaliacaoPublicaSchema, type AvaliacaoPublicaForm } from '@/schemas/avaliacaoPublicaSchema';
import { cn } from '@/lib/utils';

interface FormularioAvaliacaoPublicaProps {
  credenciadoId: string;
  credenciadoNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const tiposServico = [
  'Consulta Médica',
  'Exame',
  'Procedimento',
  'Cirurgia',
  'Retorno',
  'Emergência',
  'Outro',
];

export function FormularioAvaliacaoPublica({
  credenciadoId,
  credenciadoNome,
  open,
  onOpenChange,
  onSuccess,
}: FormularioAvaliacaoPublicaProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const criarAvaliacao = useCriarAvaliacaoPublica();

  const form = useForm<AvaliacaoPublicaForm>({
    resolver: zodResolver(avaliacaoPublicaSchema),
    defaultValues: {
      credenciado_id: credenciadoId,
      nota_estrelas: 5,
      comentario: '',
      avaliador_anonimo: false,
    },
  });

  const isAnonimo = form.watch('avaliador_anonimo');

  const onSubmit = async (data: AvaliacaoPublicaForm) => {
    await criarAvaliacao.mutateAsync(data);
    form.reset();
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliar {credenciadoNome}</DialogTitle>
          <DialogDescription>
            Compartilhe sua experiência com este profissional. Sua avaliação será analisada antes de ser publicada.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Nota em Estrelas */}
            <FormField
              control={form.control}
              name="nota_estrelas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avaliação Geral *</FormLabel>
                  <FormControl>
                    <Stars
                      value={field.value}
                      onChange={field.onChange}
                      readonly={false}
                      size="xl"
                      className="py-2"
                    />
                  </FormControl>
                  <FormDescription>
                    Clique nas estrelas para avaliar
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Comentário */}
            <FormField
              control={form.control}
              name="comentario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu Comentário *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Compartilhe sua experiência com este profissional..."
                      className="min-h-[120px] resize-none"
                      maxLength={500}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0}/500 caracteres (mínimo 10)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Data do Atendimento */}
              <FormField
                control={form.control}
                name="data_atendimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Atendimento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(new Date(field.value), 'PPP', { locale: ptBR })
                            ) : (
                              'Selecione a data'
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date)}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tipo de Serviço */}
              <FormField
                control={form.control}
                name="tipo_servico"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Serviço</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tiposServico.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Avaliação Anônima */}
            <FormField
              control={form.control}
              name="avaliador_anonimo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Avaliação Anônima</FormLabel>
                    <FormDescription>
                      Seu nome e email não serão exibidos publicamente
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Campos de Identificação (se não for anônimo) */}
            {!isAnonimo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="avaliador_nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seu Nome</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="Digite seu nome" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="avaliador_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seu Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          type="email"
                          placeholder="seu@email.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={criarAvaliacao.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={criarAvaliacao.isPending}>
                {criarAvaliacao.isPending ? 'Enviando...' : 'Enviar Avaliação'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
