import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField as WorkflowFormField } from "@/types/workflow-editor";

interface DynamicFormProps {
  fields: WorkflowFormField[];
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function DynamicForm({ fields, onSubmit, isSubmitting, submitLabel = "Enviar" }: DynamicFormProps) {
  // Criar schema de validação dinâmico
  const createValidationSchema = () => {
    const shape: any = {};

    fields.forEach((field) => {
      let fieldSchema: any = z.any();

      switch (field.type) {
        case "text":
        case "textarea":
          fieldSchema = z.string();
          if (field.validation?.minLength) {
            fieldSchema = fieldSchema.min(field.validation.minLength, {
              message: `Mínimo de ${field.validation.minLength} caracteres`,
            });
          }
          if (field.validation?.maxLength) {
            fieldSchema = fieldSchema.max(field.validation.maxLength, {
              message: `Máximo de ${field.validation.maxLength} caracteres`,
            });
          }
          if (field.validation?.pattern) {
            fieldSchema = fieldSchema.regex(
              new RegExp(field.validation.pattern),
              field.validation.customMessage || "Formato inválido"
            );
          }
          break;

        case "email":
          fieldSchema = z.string().email("Email inválido");
          break;

        case "number":
          fieldSchema = z.coerce.number();
          if (field.validation?.min !== undefined) {
            fieldSchema = fieldSchema.min(field.validation.min);
          }
          if (field.validation?.max !== undefined) {
            fieldSchema = fieldSchema.max(field.validation.max);
          }
          break;

        case "cpf":
          fieldSchema = z
            .string()
            .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido");
          break;

        case "cnpj":
          fieldSchema = z
            .string()
            .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido");
          break;

        case "date":
          fieldSchema = z.string();
          break;

        case "checkbox":
          fieldSchema = z.boolean();
          break;

        case "select":
          fieldSchema = z.string();
          break;

        case "file":
          fieldSchema = z.any();
          break;
      }

      if (field.validation?.required) {
        if (field.type === "checkbox") {
          fieldSchema = z.boolean().refine((val) => val === true, {
            message: field.validation.customMessage || "Este campo é obrigatório",
          });
        } else {
          fieldSchema = fieldSchema.min(1, {
            message: field.validation.customMessage || "Este campo é obrigatório",
          });
        }
      } else {
        fieldSchema = fieldSchema.optional();
      }

      shape[field.id] = fieldSchema;
    });

    return z.object(shape);
  };

  const schema = createValidationSchema();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: fields.reduce((acc, field) => {
      acc[field.id] = field.type === "checkbox" ? false : "";
      return acc;
    }, {} as any),
  });

  const getSizeClass = (size: string) => {
    switch (size) {
      case "full":
        return "col-span-12";
      case "half":
        return "col-span-12 md:col-span-6";
      case "third":
        return "col-span-12 md:col-span-4";
      default:
        return "col-span-12";
    }
  };

  const renderField = (field: WorkflowFormField) => {
    switch (field.type) {
      case "textarea":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem className={getSizeClass(field.size)}>
                <FormLabel>
                  {field.label}
                  {field.validation?.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={field.placeholder}
                    {...formField}
                  />
                </FormControl>
                {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "checkbox":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem className={`${getSizeClass(field.size)} flex items-start space-x-3 space-y-0`}>
                <FormControl>
                  <Checkbox
                    checked={formField.value}
                    onCheckedChange={formField.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    {field.label}
                    {field.validation?.required && <span className="text-destructive ml-1">*</span>}
                  </FormLabel>
                  {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        );

      case "select":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem className={getSizeClass(field.size)}>
                <FormLabel>
                  {field.label}
                  {field.validation?.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <Select onValueChange={formField.onChange} value={formField.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || "Selecione..."} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem className={getSizeClass(field.size)}>
                <FormLabel>
                  {field.label}
                  {field.validation?.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type={field.type}
                    placeholder={field.placeholder}
                    {...formField}
                  />
                </FormControl>
                {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-12 gap-4">
          {fields.map((field) => renderField(field))}
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Enviando..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
