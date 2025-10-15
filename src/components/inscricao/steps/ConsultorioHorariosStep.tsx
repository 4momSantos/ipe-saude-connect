import { UseFormReturn, useFieldArray } from 'react-hook-form';
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
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TelefoneInput, CelularInput } from '@/components/credenciado/MaskedInputs';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Clock, Sparkles } from 'lucide-react';
import { useValidatedData } from '@/contexts/ValidatedDataContext';
import { useEffect } from 'react';
import { EspecialidadesSelector } from '@/components/edital/EspecialidadesSelector';
import { useEditalConfig } from '@/hooks/useEditalConfig';

interface ConsultorioHorariosStepProps {
  form: UseFormReturn<InscricaoCompletaForm>;
  editalId?: string;
}

const DIAS_SEMANA = [
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'terca', label: 'Terça-feira' },
  { value: 'quarta', label: 'Quarta-feira' },
  { value: 'quinta', label: 'Quinta-feira' },
  { value: 'sexta', label: 'Sexta-feira' },
  { value: 'sabado', label: 'Sábado' },
];

export function ConsultorioHorariosStep({ form, editalId }: ConsultorioHorariosStepProps) {
  // ✅ FASE 4: Buscar configuração do edital (incluindo max_especialidades)
  const { data: editalConfig } = useEditalConfig(editalId);
  const { crm } = useValidatedData();
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'horarios',
  });

  // Auto-preencher especialidade e telefone do consultório com dados do CRM
  useEffect(() => {
    if (crm?.validated) {
      // Dados do CRM já foram validados
      console.log('CRM validado:', crm);
    }
  }, [crm, form]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold mb-2">Dados do Consultório e Horários</h3>
        <p className="text-sm text-muted-foreground">
          Informações sobre especialidades e disponibilidade
        </p>
      </div>

      <div>
        <h4 className="font-medium mb-4">Endereço de Correspondência</h4>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="endereco_correspondencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço Completo *</FormLabel>
                <FormControl>
                  <Input placeholder="Rua, número, complemento, bairro, cidade, UF, CEP" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

      <Separator />

      <div>
        <h4 className="font-medium mb-4">Dados do Consultório</h4>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="endereco_consultorio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço do Consultório *</FormLabel>
                <FormControl>
                  <Input placeholder="Rua, número, sala" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="telefone_consultorio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone do Consultório *</FormLabel>
                  <FormControl>
                    <TelefoneInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ramal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ramal</FormLabel>
                  <FormControl>
                    <Input placeholder="123" {...field} />
                  </FormControl>
                  <FormDescription>Opcional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-medium mb-4">Especialidades e Atendimento</h4>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="especialidades_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Suas Especialidades *</FormLabel>
                <FormDescription>
                  Selecione as especialidades para as quais deseja se credenciar
                </FormDescription>
                <FormControl>
                  <EspecialidadesSelector
                    selectedIds={field.value || []}
                    onChange={field.onChange}
                    minSelection={1}
                    maxSelection={editalConfig?.max_especialidades}
                    allowCreate={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantidade_consultas_minima"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade Mínima de Consultas Ofertadas *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="20"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>
                  Número mínimo de consultas que pode ofertar por especialidade
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="atendimento_hora_marcada"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Atendimento com Hora Marcada</FormLabel>
                  <FormDescription>
                    Marque se oferece atendimento por agendamento
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium">Horários de Atendimento</h4>
            <p className="text-sm text-muted-foreground">
              Defina as faixas de horário para cada dia da semana
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                dia_semana: 'segunda',
                horario_inicio: '08:00',
                horario_fim: '17:00',
              })
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Horário
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name={`horarios.${index}.dia_semana`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dia da Semana</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DIAS_SEMANA.map((dia) => (
                              <SelectItem key={dia.value} value={dia.value}>
                                {dia.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`horarios.${index}.horario_inicio`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="time" {...field} className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`horarios.${index}.horario_fim`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fim</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="time" {...field} className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {fields.length === 0 && (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum horário adicionado. Clique em "Adicionar Horário" para começar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
