import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Workflow, 
  ClipboardList, 
  Edit, 
  Eye, 
  ArrowLeft,
  Calendar,
  User,
  FileText
} from "lucide-react";
import { toast } from "sonner";

interface Edital {
  id: string;
  numero_edital: string;
  titulo: string;
  descricao: string;
  status: string;
  data_inicio: string;
  data_fim: string;
  workflow_id: string;
  workflow_version: number;
  formularios_vinculados: string[];
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  version: number;
  nodes: any[];
}

interface Formulario {
  id: string;
  name: string;
  category: string;
}

export default function EditalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [edital, setEdital] = useState<Edital | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadEditalDetails();
    }
  }, [id]);

  async function loadEditalDetails() {
    try {
      setLoading(true);

      // Buscar edital
      const { data: editalData, error: editalError } = await supabase
        .from("editais")
        .select("*")
        .eq("id", id)
        .single();

      if (editalError) throw editalError;
      
      // Converter Json para tipos corretos
      const editalTyped: Edital = {
        ...editalData,
        formularios_vinculados: Array.isArray(editalData.formularios_vinculados) 
          ? (editalData.formularios_vinculados as string[])
          : []
      };
      setEdital(editalTyped);

      if (!editalData.workflow_id) {
        toast.warning("Este edital não possui workflow vinculado");
        return;
      }

      // Buscar workflow
      const { data: workflowData, error: workflowError } = await supabase
        .from("workflows")
        .select("*")
        .eq("id", editalData.workflow_id)
        .single();

      if (workflowError) throw workflowError;
      
      // Converter Json para tipos corretos
      const workflowTyped: Workflow = {
        ...workflowData,
        nodes: Array.isArray(workflowData.nodes) ? workflowData.nodes : []
      };
      setWorkflow(workflowTyped);

      // Buscar formulários vinculados
      const formIds = Array.isArray(editalData.formularios_vinculados) 
        ? (editalData.formularios_vinculados as string[])
        : [];
        
      if (formIds.length > 0) {
        const { data: formulariosData, error: formulariosError } = await supabase
          .from("form_templates")
          .select("id, name, category")
          .in("id", formIds);

        if (formulariosError) throw formulariosError;
        setFormularios(formulariosData || []);
      }

    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
      toast.error("Erro ao carregar detalhes do edital");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!edital) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Edital não encontrado</p>
            <Button onClick={() => navigate("/editais")} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate("/editais")} className="mb-2 md:mb-4">
            <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-2" />
            <span className="text-xs md:text-sm">Voltar para Editais</span>
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold break-words">{edital.titulo}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Edital {edital.numero_edital}
          </p>
        </div>
        <div className="flex-shrink-0">
          <Badge variant={edital.status === 'publicado' ? 'default' : 'secondary'} className="text-xs md:text-sm">
            {edital.status}
          </Badge>
        </div>
      </div>

      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informações do Edital
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div>
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Descrição</p>
            <p className="mt-1 text-sm md:text-base break-words">{edital.descricao}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                Data de Início
              </p>
              <p className="mt-1 text-sm md:text-base">{new Date(edital.data_inicio).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                Data de Término
              </p>
              <p className="mt-1 text-sm md:text-base">{new Date(edital.data_fim).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Vinculado */}
      {workflow && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Fluxo de Processo Vinculado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between p-3 md:p-4 border rounded-lg bg-accent/5 gap-3">
              <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                <Workflow className="h-8 w-8 md:h-10 md:w-10 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base md:text-lg break-words">{workflow.name}</p>
                  <p className="text-xs md:text-sm text-muted-foreground break-words">{workflow.description}</p>
                  <Badge variant="outline" className="mt-1 text-[10px] md:text-xs">Versão {workflow.version}</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full md:w-auto text-xs md:text-sm" onClick={() => navigate(`/workflow-editor/${workflow.id}`)}>
                <Eye className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Ver Workflow
              </Button>
            </div>

            <Separator className="my-4" />

            <div>
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <ClipboardList className="h-4 w-4" />
                Formulários de Inscrição ({formularios.length})
              </h4>
              {formularios.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum formulário vinculado
                </p>
              ) : (
                <div className="space-y-2">
                  {formularios.map((form, idx) => (
                    <Card key={form.id} className="p-2 md:p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          <Badge variant="secondary" className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm flex-shrink-0">
                            {idx + 1}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs md:text-sm break-words">{form.name}</p>
                            <p className="text-[10px] md:text-xs text-muted-foreground">{form.category}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0"
                          onClick={() => navigate(`/templates-formularios?template=${form.id}`)}
                        >
                          <Eye className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão Editar */}
      <div className="flex justify-end">
        <Button onClick={() => navigate(`/editar-edital/${edital.id}`)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Edital
        </Button>
      </div>
    </div>
  );
}
