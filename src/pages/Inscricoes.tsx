import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { DocumentUpload, DocumentFile } from "@/components/documents/DocumentUpload";
import { DuplicateChecker } from "@/components/documents/DuplicateChecker";
import { DocumentGenerator } from "@/components/documents/DocumentGenerator";
import { validateCPF, validateCNPJ, validateCEP, formatCPF, formatCNPJ, formatCEP, formatPhone } from "@/lib/validators";
import { ValidationBadge } from "@/components/ValidationBadge";

const formSchema = z.object({
  tipo: z.enum(["pessoa_fisica", "pessoa_juridica"], {
    required_error: "Selecione o tipo de prestador",
  }),
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  cpfCnpj: z.string().min(11, "CPF/CNPJ inválido").max(18).refine(
    (val) => {
      const clean = val.replace(/\D/g, "");
      return clean.length === 11 ? validateCPF(val) : validateCNPJ(val);
    },
    { message: "CPF/CNPJ inválido" }
  ),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  logradouro: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  especialidade: z.string().min(1, "Selecione uma especialidade"),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
});

export default function Inscricoes() {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [cepValid, setCepValid] = useState(false);
  const [cpfCnpjValid, setCpfCnpjValid] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: "pessoa_fisica",
      nome: "",
      cpfCnpj: "",
      cep: "",
      logradouro: "",
      bairro: "",
      cidade: "",
      estado: "",
      especialidade: "",
      email: "",
      telefone: "",
    },
  });

  // Validate CPF/CNPJ in real-time
  useEffect(() => {
    const cpfCnpj = form.watch("cpfCnpj");
    if (cpfCnpj) {
      const clean = cpfCnpj.replace(/\D/g, "");
      const isValid = clean.length === 11 ? validateCPF(cpfCnpj) : validateCNPJ(cpfCnpj);
      setCpfCnpjValid(isValid);
    }
  }, [form.watch("cpfCnpj")]);

  // Validate CEP and auto-fill address
  const handleCepChange = async (cep: string) => {
    if (cep.replace(/\D/g, "").length === 8) {
      const result = await validateCEP(cep);
      setCepValid(result.valid);
      if (result.valid && result.data) {
        // Auto-fill address fields
        form.setValue("logradouro", result.data.street || "");
        form.setValue("bairro", result.data.neighborhood || "");
        form.setValue("cidade", result.data.city || "");
        form.setValue("estado", result.data.state || "");
        
        toast.success(`CEP validado: ${result.data.street}, ${result.data.city} - ${result.data.state}`);
      } else {
        toast.error("CEP inválido ou não encontrado");
      }
    }
  };

  const isFormComplete = () => {
    const values = form.getValues();
    return (
      values.nome &&
      values.cpfCnpj &&
      cpfCnpjValid &&
      values.cep &&
      cepValid &&
      values.especialidade &&
      values.email &&
      values.telefone &&
      documents.length > 0 &&
      documents.every(d => d.status === "valid" || d.status === "warning")
    );
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!isFormComplete()) {
      toast.error("Complete todos os campos e valide os documentos");
      return;
    }
    console.log({ ...values, documentos: documents });
    toast.success("Inscrição enviada com sucesso!");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Nova Inscrição</h1>
        <p className="text-muted-foreground mt-2">
          Preencha os dados para credenciamento de prestador
        </p>
      </div>

      <Card className="border bg-card card-glow">
        <CardHeader>
          <CardTitle>Dados do Prestador</CardTitle>
          <CardDescription>Informações básicas para análise de credenciamento</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Prestador</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                        <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo / Razão Social</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpfCnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        CPF / CNPJ
                        {field.value && cpfCnpjValid && (
                          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--green-approved))]" />
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="000.000.000-00"
                          {...field}
                          onChange={(e) => {
                            const tipo = form.getValues("tipo");
                            const formatted = tipo === "pessoa_fisica"
                              ? formatCPF(e.target.value)
                              : formatCNPJ(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="especialidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especialidade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a especialidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cardiologia">Cardiologia</SelectItem>
                          <SelectItem value="pediatria">Pediatria</SelectItem>
                          <SelectItem value="ortopedia">Ortopedia</SelectItem>
                          <SelectItem value="clinica_geral">Clínica Geral</SelectItem>
                          <SelectItem value="hospitalar">Hospitalar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        CEP
                        {field.value && cepValid && (
                          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--green-approved))]" />
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="00000-000"
                          {...field}
                          onChange={(e) => {
                            const formatted = formatCEP(e.target.value);
                            field.onChange(formatted);
                            handleCepChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logradouro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, Avenida..." {...field} />
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
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do bairro" {...field} />
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
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado (UF)</FormLabel>
                      <FormControl>
                        <Input placeholder="UF" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          {...field}
                          onChange={(e) => {
                            const formatted = formatPhone(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={!isFormComplete()}
                >
                  {isFormComplete() && <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Enviar Inscrição
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  className="border-border hover:bg-card"
                >
                  Limpar Formulário
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {form.watch("cpfCnpj") && cpfCnpjValid && (
        <DuplicateChecker cpfCnpj={form.watch("cpfCnpj")} />
      )}

      <DocumentUpload onFilesChange={setDocuments} />

      <DocumentGenerator 
        providerData={{
          name: form.watch("nome"),
          cpfCnpj: form.watch("cpfCnpj"),
          specialty: form.watch("especialidade"),
          email: form.watch("email"),
          phone: form.watch("telefone"),
          cep: form.watch("cep"),
        }}
        isComplete={isFormComplete()}
      />
    </div>
  );
}
