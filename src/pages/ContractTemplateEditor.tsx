import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ContractEditor } from "@/components/contratos/editor/ContractEditor";
import { useContractTemplates, useContractTemplate } from "@/hooks/useContractTemplates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractField } from "@/types/contract-editor";
import { useToast } from "@/hooks/use-toast";

export default function ContractTemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { criar, editar, isCriando, isEditando } = useContractTemplates();
  const { data: template, isLoading } = useContractTemplate(id);
  const { toast } = useToast();
  
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (template) {
      setNome(template.nome);
      setDescricao(template.descricao || "");
    }
  }, [template]);

  const handleSave = async (html: string, campos: ContractField[]) => {
    if (!nome.trim()) {
      toast({
        title: "Erro de validação",
        description: "O nome do template é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    // Validar tamanho do HTML (PostgreSQL limita text a ~1GB, mas ideal < 10MB)
    const htmlSize = new Blob([html]).size;
    const MAX_HTML_SIZE = 10 * 1024 * 1024; // 10MB
    
    if (htmlSize > MAX_HTML_SIZE) {
      toast({
        title: "Conteúdo muito grande",
        description: `O HTML do template (${(htmlSize / 1024 / 1024).toFixed(2)}MB) excede o limite de 10MB. Reduza imagens ou conteúdo.`,
        variant: "destructive"
      });
      return;
    }

    // Validar número de placeholders
    if (campos.length > 100) {
      toast({
        title: "Muitos placeholders",
        description: `O template tem ${campos.length} placeholders. O limite recomendado é 100.`,
        variant: "destructive"
      });
      return;
    }

    const templateData = {
      nome: nome.trim(),
      descricao: descricao.trim(),
      conteudo_html: html,
      campos_mapeados: campos,
      is_active: true
    };

    try {
      if (id) {
        await editar({ id, ...templateData });
      } else {
        await criar(templateData);
      }
      navigate("/contratos/templates");
    } catch (error) {
      console.error("Erro ao salvar template:", error);
      
      toast({
        title: "Erro ao salvar",
        description: `${(error as Error).message} (Erro ID: 6fe08b85732e9ea85f3584eb9895471c)`,
        variant: "destructive"
      });
    }
  };

  if (isLoading && id) {
    return (
      <div className="w-full max-w-[95%] mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ContractEditor
        initialContent={template?.conteudo_html}
        onSave={handleSave}
        isSaving={isCriando || isEditando}
        templateName={nome}
        onTemplateNameChange={setNome}
      />
    </div>
  );
}
