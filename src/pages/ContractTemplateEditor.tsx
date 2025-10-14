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

export default function ContractTemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { criar, editar, isCriando, isEditando } = useContractTemplates();
  const { data: template, isLoading } = useContractTemplate(id);
  
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
