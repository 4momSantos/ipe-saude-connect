import { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: any[];
}

interface TemplateSelectorProps {
  selectedTemplateId?: string;
  onSelect: (templateId: string, fields: any[]) => void;
}

export function TemplateSelector({ selectedTemplateId, onSelect }: TemplateSelectorProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sourceType, setSourceType] = useState<"template" | "step">("template");

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [searchQuery, templates]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("form_templates")
        .select("id, name, description, category, fields")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      const templatesData = (data || []).map(t => ({
        ...t,
        fields: t.fields as any[]
      }));
      setTemplates(templatesData);
      setFilteredTemplates(templatesData);
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
    if (!searchQuery) {
      setFilteredTemplates(templates);
      return;
    }

    const filtered = templates.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredTemplates(filtered);
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      onSelect(templateId, template.fields);
      setDialogOpen(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label>Fonte do Formulário</Label>
        <RadioGroup value={sourceType} onValueChange={(value: "template" | "step") => setSourceType(value)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="template" id="template" />
            <Label htmlFor="template" className="font-normal cursor-pointer">
              Usar Template de Formulário
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="step" id="step" />
            <Label htmlFor="step" className="font-normal cursor-pointer">
              Usar Etapa Já Selecionada
            </Label>
          </div>
        </RadioGroup>
      </div>

      {sourceType === "template" && (
        <div className="space-y-2">
          <Label>Template de Formulário</Label>
          <div className="flex gap-2">
          <Select value={selectedTemplateId} onValueChange={handleSelectTemplate}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione um template..." />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Selecionar Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Buscar templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {loading ? (
                      <p className="text-center text-muted-foreground py-8">
                        Carregando templates...
                      </p>
                    ) : filteredTemplates.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum template encontrado.
                      </p>
                    ) : (
                      filteredTemplates.map((template) => (
                        <Button
                          key={template.id}
                          variant="outline"
                          className="w-full justify-start h-auto p-4"
                          onClick={() => handleSelectTemplate(template.id)}
                        >
                          <div className="text-left space-y-1 w-full">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{template.name}</span>
                              {template.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {template.category}
                                </Badge>
                              )}
                            </div>
                            {template.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {template.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {template.fields?.length || 0} campos
                            </p>
                          </div>
                        </Button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="icon"
            onClick={() => window.open("/templates-formularios/editor", "_blank")}
            title="Criar novo template"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        </div>
      )}

      {sourceType === "template" && selectedTemplate && (
        <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{selectedTemplate.name}</h4>
            {selectedTemplate.category && (
              <Badge variant="outline">{selectedTemplate.category}</Badge>
            )}
          </div>
          {selectedTemplate.description && (
            <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {selectedTemplate.fields?.length || 0} campos configurados
          </p>
        </div>
      )}
    </div>
  );
}
