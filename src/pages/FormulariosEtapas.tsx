import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode2, GitBranch } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ProcessosList } from "@/components/processos/ProcessosList";

export const FORM_CATEGORIES = [
  "Todos",
  "Dados Pessoais",
  "Documentação",
  "Endereço",
  "Informações Profissionais",
  "Questões Técnicas",
  "Avaliação",
  "Outro",
];

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  fields: any[];
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  category: string;
  tags: string[];
  usage_count: number;
}

export default function FormulariosEtapas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [searchQuery, selectedCategory, templates]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("form_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const templatesData = (data || []).map(t => ({
        ...t,
        fields: t.fields as any[]
      }));
      setTemplates(templatesData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar templates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== "Todos") {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    setFilteredTemplates(filtered);
  };

  const handleCreateTemplate = () => {
    navigate("/formularios/templates/editor");
  };

  const handleEditTemplate = (id: string) => {
    navigate(`/formularios/templates/editor/${id}`);
  };

  const handleDuplicateTemplate = async (template: FormTemplate) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("form_templates").insert({
        name: `${template.name} (Cópia)`,
        description: template.description,
        fields: template.fields,
        category: template.category,
        tags: template.tags,
        is_active: false,
        created_by: user.user.id,
      });

      if (error) throw error;

      toast({
        title: "Template duplicado",
        description: "O template foi duplicado com sucesso.",
      });

      loadTemplates();
    } catch (error: any) {
      toast({
        title: "Erro ao duplicar template",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from("form_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Template excluído",
        description: "O template foi excluído com sucesso.",
      });

      loadTemplates();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir template",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActiveTemplate = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("form_templates")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Template ${!currentStatus ? "ativado" : "desativado"} com sucesso.`,
      });

      loadTemplates();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Formulários & Etapas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie templates de formulários e processos multi-etapa para inscrições
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4" />
              Templates de Formulários
            </TabsTrigger>
            <TabsTrigger value="processos" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Processos de Inscrição
            </TabsTrigger>
          </TabsList>

          {/* Aba de Templates */}
          <TabsContent value="templates" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Templates de Formulários</h2>
                <p className="text-sm text-muted-foreground">
                  Crie e gerencie templates reutilizáveis
                </p>
              </div>
              <Button onClick={handleCreateTemplate}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Template
              </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {FORM_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Templates Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[280px]" />
                ))}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchQuery || selectedCategory !== "Todos"
                    ? "Nenhum template encontrado com os filtros aplicados."
                    : "Nenhum template criado ainda."}
                </p>
                <Button onClick={handleCreateTemplate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Template
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={handleEditTemplate}
                    onDuplicate={handleDuplicateTemplate}
                    onDelete={handleDeleteTemplate}
                    onToggleActive={handleToggleActiveTemplate}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Aba de Processos */}
          <TabsContent value="processos" className="mt-6">
            <ProcessosList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}