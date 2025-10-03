import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, CheckSquare } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ParticipacaoHabilitacaoStepProps {
  form: UseFormReturn<any>;
}

const tiposParticipacao = [
  { id: "pj", label: "Pessoa Jurídica", description: "Empresas constituídas" },
  { id: "consorcio", label: "Consórcio", description: "União de empresas" },
  { id: "me_epp", label: "ME/EPP", description: "Micro e Pequenas Empresas" },
];

const tiposDocumentos = [
  { id: "juridica", label: "Habilitação Jurídica", description: "Atos constitutivos, registros comerciais" },
  { id: "fiscal", label: "Regularidade Fiscal", description: "Certidões fiscais federais, estaduais e municipais" },
  { id: "trabalhista", label: "Regularidade Trabalhista", description: "CNDT e demais certidões trabalhistas" },
  { id: "tecnica", label: "Qualificação Técnica", description: "Atestados, registros e certificações" },
  { id: "economica", label: "Qualificação Econômico-Financeira", description: "Balanços, índices financeiros" },
];

export function ParticipacaoHabilitacaoStep({ form }: ParticipacaoHabilitacaoStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Participação e Habilitação</h3>
          <p className="text-sm text-muted-foreground">Defina quem pode participar e requisitos</p>
        </div>
      </div>

      <Card className="p-6 bg-card/50 border-border">
        <FormField
          control={form.control}
          name="participacao_permitida"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base font-semibold">Quem Pode Participar *</FormLabel>
                <FormDescription>
                  Selecione os tipos de participantes permitidos
                </FormDescription>
              </div>
              <div className="space-y-4">
                {tiposParticipacao.map((tipo) => (
                  <FormField
                    key={tipo.id}
                    control={form.control}
                    name="participacao_permitida"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={tipo.id}
                          className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(tipo.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), tipo.id])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value: string) => value !== tipo.id
                                      )
                                    )
                              }}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none flex-1">
                            <FormLabel className="font-medium cursor-pointer">
                              {tipo.label}
                            </FormLabel>
                            <FormDescription className="text-xs">
                              {tipo.description}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </Card>

      <FormField
        control={form.control}
        name="regras_me_epp"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Regras Específicas para ME/EPP</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Descreva as regras e benefícios para Micro e Pequenas Empresas conforme LC 123/2006"
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Inclua informações sobre margens de preferência, comprovação de regularidade e outros benefícios
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <Card className="p-6 bg-card/50 border-border">
        <FormField
          control={form.control}
          name="documentos_habilitacao"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base font-semibold flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  Documentos Exigidos para Habilitação *
                </FormLabel>
                <FormDescription>
                  Selecione os documentos necessários
                </FormDescription>
              </div>
              <div className="space-y-4">
                {tiposDocumentos.map((tipo) => (
                  <FormField
                    key={tipo.id}
                    control={form.control}
                    name="documentos_habilitacao"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={tipo.id}
                          className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(tipo.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), tipo.id])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value: string) => value !== tipo.id
                                      )
                                    )
                              }}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none flex-1">
                            <FormLabel className="font-medium cursor-pointer">
                              {tipo.label}
                            </FormLabel>
                            <FormDescription className="text-xs">
                              {tipo.description}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </Card>
    </div>
  );
}
