import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormBuilder } from "@/components/workflow-editor/FormBuilder";
import { FormField } from "@/types/workflow-editor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formTitle, setFormTitle] = useState("Novo Formulário");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    if (id) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from("form_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setFields((data.fields as any[]) || []);
      setFormTitle(data.name || "Novo Formulário");
      setFormDescription(data.description || "");
    } catch (error: any) {
      toast({
        title: "Erro ao carregar template",
        description: error.message,
        variant: "destructive",
      });
      navigate("/templates-formularios");
    }
  };

  const handleSave = async () => {
    if (!formTitle || formTitle.trim() === "" || formTitle === "Formulário sem título") {
      toast({
        title: "Título obrigatório",
        description: "Por favor, defina um título para o formulário antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, adicione pelo menos um campo ao formulário.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      const templateData: any = {
        name: formTitle.trim(),
        description: formDescription.trim(),
        fields: fields as any,
      };

      if (id) {
        const { error } = await supabase
          .from("form_templates")
          .update(templateData)
          .eq("id", id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("form_templates")
          .insert({ 
            ...templateData,
            created_by: user.user.id 
          });

        if (error) throw error;
      }

      toast({
        title: "Template salvo",
        description: "O template foi salvo com sucesso.",
      });

      navigate("/templates-formularios");
    } catch (error: any) {
      toast({
        title: "Erro ao salvar template",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-border bg-card/50 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/templates-formularios')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {id ? 'Editar Template' : 'Novo Template'}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Template'}
        </Button>
      </div>

      {/* Form Builder - Full Screen */}
      <div className="flex-1 overflow-hidden">
        <FormBuilder
          fields={fields}
          onChange={setFields}
          initialTitle={formTitle}
          initialDescription={formDescription}
          onTitleChange={setFormTitle}
          onDescriptionChange={setFormDescription}
        />
      </div>
    </div>
  );
}
