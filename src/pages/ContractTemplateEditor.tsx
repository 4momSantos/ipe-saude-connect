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
    <div className="w-full max-w-[95%] mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/contratos/templates")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Templates
        </Button>
        <h1 className="text-3xl font-bold">
          {id ? "Editar Template" : "Criar Novo Template"}
        </h1>
      </div>

      <div className="space-y-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Nome do Template *
              </label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Contrato de Credenciamento Médico"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Descrição
              </label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o propósito deste template..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <ContractEditor
        initialContent={template?.conteudo_html}
        onSave={handleSave}
        isSaving={isCriando || isEditando}
      />
    </div>
  );
}
