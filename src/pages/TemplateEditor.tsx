import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FormBuilder } from "@/components/workflow-editor/FormBuilder";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { FormField } from "@/types/workflow-editor";
import { FORM_CATEGORIES } from "./TemplatesFormularios";

export default function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);

  useEffect(() => {
    if (id) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("form_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setName(data.name);
      setDescription(data.description || "");
      setCategory(data.category || "");
      setTags(data.tags?.join(", ") || "");
      setIsActive(data.is_active);
      setFields((data.fields as any[]) || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar template",
        description: error.message,
        variant: "destructive",
      });
      navigate("/templates-formularios");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para o template.",
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
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      const templateData: any = {
        name: name.trim(),
        description: description.trim() || null,
        fields: fields as any,
        category: category || null,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        is_active: isActive,
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
          .insert({ ...templateData, created_by: user.user.id });

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
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/templates-formularios")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {id ? "Editar Template" : "Novo Template"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {id ? "Modifique o template de formulário" : "Crie um novo template de formulário"}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Template
          </Button>
        </div>

        {/* Content */}
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="fields">Campos</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Template</CardTitle>
                <CardDescription>
                  Configure os metadados e informações do template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome do Template <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Formulário de Dados Pessoais"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o propósito deste template..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {FORM_CATEGORIES.filter((c) => c !== "Todos").map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Ex: CPF, RG, Endereço"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Template ativo (visível para uso)
                  </Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Campos do Formulário</CardTitle>
                <CardDescription>
                  Adicione e configure os campos que farão parte deste template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormBuilder fields={fields} onChange={setFields} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preview do Template</CardTitle>
                <CardDescription>
                  Visualize como o formulário será exibido
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TemplatePreview
                  name={name || "Nome do Template"}
                  description={description}
                  fields={fields}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
