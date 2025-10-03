import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, FileText, Percent, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InformacoesGeraisStepProps {
  form: UseFormReturn<any>;
}

export function InformacoesGeraisStep({ form }: InformacoesGeraisStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Informações Gerais</h3>
          <p className="text-sm text-muted-foreground">Dados básicos do edital</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="numero_edital"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número do Edital *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: 001/2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="data_publicacao"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data de Publicação *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
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
          name="objeto"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Título/Objeto *</FormLabel>
              <FormControl>
                <Input placeholder="Objeto da licitação" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Descrição Detalhada *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descrição completa do edital"
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="data_licitacao"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data e Horário da Licitação *</FormLabel>
              <FormControl>
                <Input 
                  type="datetime-local"
                  {...field}
                  value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="local_portal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Local/Portal de Disponibilização *</FormLabel>
              <FormControl>
                <Input placeholder="URL ou local físico" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="prazo_validade_proposta"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prazo de Validade (dias) *</FormLabel>
              <FormControl>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="number"
                    placeholder="60"
                    className="pl-10"
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="criterio_julgamento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Critério de Julgamento *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="menor_preco">Menor Preço</SelectItem>
                  <SelectItem value="melhor_tecnica">Melhor Técnica</SelectItem>
                  <SelectItem value="tecnica_preco">Técnica e Preço</SelectItem>
                  <SelectItem value="maior_desconto">Maior Desconto</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="garantia_execucao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Garantia de Execução (%)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 5.00"
                    className="pl-10"
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fonte_recursos"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fonte de Recursos *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Orçamento Municipal 2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
