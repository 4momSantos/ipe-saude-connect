import { useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { 
  Save, 
  Play, 
  FileText, 
  CheckCircle, 
  Mail, 
  GitBranch,
  Plus,
  ArrowLeft,
  Globe,
  PenTool,
  Database,
  Webhook,
  StopCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkflowNode } from "@/components/workflow-editor/WorkflowNode";
import { ConfigPanel } from "@/components/workflow-editor/ConfigPanel";
import { WorkflowNodeData, FormTemplate, VisualWorkflow } from "@/types/workflow-editor";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const initialNodes: Node<WorkflowNodeData>[] = [
  {
    id: "start",
    type: "workflowNode",
    position: { x: 250, y: 50 },
    data: {
      label: "Quando solicitação criada",
      type: "start",
      color: "#10b981",
      icon: "Play",
      description: "Inicia o fluxo quando uma nova solicitação é criada.",
      category: "Credenciamento",
      status: "completed",
    },
  },
];

const nodeTemplates = [
  {
    type: "form",
    label: "Formulário",
    color: "#3b82f6",
    icon: "FileText",
    description: "Coleta informações através de campos personalizáveis.",
    category: "Coleta de Dados",
  },
  {
    type: "webhook",
    label: "Webhook",
    color: "#10b981",
    icon: "Webhook",
    description: "Recebe ou envia dados via webhook HTTP.",
    category: "Integração",
  },
  {
    type: "http",
    label: "Chamada HTTP",
    color: "#06b6d4",
    icon: "Globe",
    description: "Faz requisições HTTP para APIs externas.",
    category: "Integração",
  },
  {
    type: "signature",
    label: "Assinatura Digital",
    color: "#8b5cf6",
    icon: "PenTool",
    description: "Gerencia processo de assinatura de documentos.",
    category: "Documento",
  },
  {
    type: "email",
    label: "Enviar Email",
    color: "#f59e0b",
    icon: "Mail",
    description: "Envia emails personalizados.",
    category: "Comunicação",
  },
  {
    type: "database",
    label: "Banco de Dados",
    color: "#ec4899",
    icon: "Database",
    description: "Operações de banco de dados (CRUD).",
    category: "Dados",
  },
  {
    type: "approval",
    label: "Aprovação",
    color: "#14b8a6",
    icon: "CheckCircle",
    description: "Requer aprovação manual antes de continuar.",
    category: "Decisão",
  },
  {
    type: "condition",
    label: "Condição",
    color: "#a855f7",
    icon: "GitBranch",
    description: "Divide o fluxo baseado em condições.",
    category: "Decisão",
  },
  {
    type: "end",
    label: "Finalizar",
    color: "#ef4444",
    icon: "StopCircle",
    description: "Marca o fim do fluxo de trabalho.",
    category: "Sistema",
  },
];

export default function WorkflowEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null);
  const [workflowName, setWorkflowName] = useState("Novo Workflow");
  const [templates, setTemplates] = useState<FormTemplate[]>([]);

  // Carregar workflow se houver ID na URL
  useEffect(() => {
    const loadWorkflow = async () => {
      const workflowId = searchParams.get("id");
      if (!workflowId) return;

      try {
        const { data, error } = await supabase
          .from("workflows")
          .select("*")
          .eq("id", workflowId)
          .single();

        if (error) throw error;

        setWorkflowName(data.name);
        setNodes(data.nodes as unknown as Node<WorkflowNodeData>[]);
        setEdges(data.edges as unknown as Edge[]);
      } catch (error) {
        console.error("Erro ao carregar workflow:", error);
        toast.error("Erro ao carregar workflow");
      }
    };

    loadWorkflow();
  }, [searchParams, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      
      // Se for um nó de condição, adicionar label baseado no handle
      if (sourceNode?.data.type === "condition") {
        const label = params.sourceHandle === "yes" ? "✓ Sim" : "✗ Não";
        const labelColor = params.sourceHandle === "yes" ? "#10b981" : "#ef4444";
        
        setEdges((eds) =>
          addEdge(
            {
              ...params,
              label,
              labelStyle: { fill: labelColor, fontWeight: 600, fontSize: 12 },
              labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
              labelBgPadding: [8, 4] as [number, number],
              data: { decisionType: params.sourceHandle },
              animated: false,
              type: "smoothstep",
              style: { 
                stroke: labelColor, 
                strokeWidth: 2.5,
              },
              markerEnd: {
                type: "arrowclosed",
                color: labelColor,
                width: 20,
                height: 20,
              },
            },
            eds
          )
        );
      } else {
        setEdges((eds) =>
          addEdge(
            {
              ...params,
              animated: false,
              type: "smoothstep",
              style: { 
                stroke: "#3b82f6", 
                strokeWidth: 2.5,
              },
              markerEnd: {
                type: "arrowclosed",
                color: "#3b82f6",
                width: 20,
                height: 20,
              },
            },
            eds
          )
        );
      }
    },
    [nodes, setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<WorkflowNodeData>) => {
    setSelectedNode(node);
  }, []);

  const addNode = (template: typeof nodeTemplates[0]) => {
    const newNode: Node<WorkflowNodeData> = {
      id: `node-${Date.now()}`,
      type: "workflowNode",
      position: {
        x: Math.random() * 300 + 150,
        y: Math.random() * 300 + 200,
      },
      data: {
        label: template.label,
        type: template.type as any,
        color: template.color,
        icon: template.icon,
        description: template.description,
        category: template.category,
        status: "pending",
        formFields: template.type === "form" ? [] : undefined,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    toast.success(`${template.label} adicionado`);
  };

  const updateSelectedNode = useCallback(
    (data: Partial<WorkflowNodeData>) => {
      if (!selectedNode) return;

      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode.id
            ? { ...node, data: { ...node.data, ...data } }
            : node
        )
      );
      setSelectedNode((prev) =>
        prev ? { ...prev, data: { ...prev.data, ...data } } : null
      );
    },
    [selectedNode, setNodes]
  );

  const deleteNode = useCallback((nodeId: string) => {
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    
    // Impedir exclusão do nó inicial
    if (nodeToDelete?.data.type === 'start') {
      toast.error('Não é possível excluir o módulo inicial');
      return;
    }
    
    // Remover nó
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    
    // Remover edges conectadas
    setEdges((eds) => eds.filter((edge) => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
    
    // Limpar seleção se o nó deletado estava selecionado
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
    
    toast.success('Módulo removido com sucesso');
  }, [nodes, selectedNode, setNodes, setEdges]);

  const saveWorkflow = async () => {
    // Validação básica antes de salvar
    if (!workflowName || workflowName.trim().length === 0) {
      toast.error("Por favor, insira um nome para o workflow");
      return;
    }

    if (nodes.length === 0) {
      toast.error("Adicione pelo menos um módulo ao workflow");
      return;
    }

    // Sanitizar dados antes de enviar
    const sanitizedNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        // Remover qualquer referência circular ou dados problemáticos
        ref: undefined,
      }
    }));

    const sanitizedEdges = edges.map(edge => ({
      ...edge,
      // Remover dados desnecessários
      ref: undefined,
    }));

    try {
      console.log("Salvando workflow:", {
        id: searchParams.get("id"),
        name: workflowName,
        nodesCount: sanitizedNodes.length,
        edgesCount: sanitizedEdges.length,
      });

      const { data, error } = await supabase.functions.invoke("save-workflow", {
        body: {
          id: searchParams.get("id"),
          name: workflowName.trim(),
          description: "",
          nodes: sanitizedNodes,
          edges: sanitizedEdges,
        },
      });

      if (error) {
        console.error("Erro da função:", error);
        
        // Mensagens específicas baseadas no erro
        if (error.message?.includes("não encontrado")) {
          toast.error("Workflow não encontrado. Criando novo workflow...");
          // Tentar criar como novo
          const { data: newData, error: newError } = await supabase.functions.invoke("save-workflow", {
            body: {
              id: null,
              name: workflowName.trim(),
              description: "",
              nodes: sanitizedNodes,
              edges: sanitizedEdges,
            },
          });
          
          if (newError) throw newError;
          if (newData) {
            toast.success("Workflow criado com sucesso!");
            navigate(`/workflow-editor?id=${newData.id}`);
            return;
          }
        } else if (error.message?.includes("permissão")) {
          toast.error("Você não tem permissão para editar este workflow");
          return;
        } else if (error.message?.includes("autorizado")) {
          toast.error("Sessão expirada. Por favor, faça login novamente");
          return;
        }
        
        throw error;
      }

      toast.success("Workflow salvo com sucesso!");
      
      // Se for um novo workflow, redirecionar para o editor com o ID
      if (!searchParams.get("id") && data?.id) {
        navigate(`/workflow-editor?id=${data.id}`);
      } else {
        navigate("/workflows");
      }
    } catch (error: any) {
      console.error("Erro ao salvar workflow:", error);
      const errorMessage = error?.message || "Erro desconhecido ao salvar workflow";
      toast.error(errorMessage);
    }
  };

  const saveTemplate = (template: Omit<FormTemplate, "id" | "createdAt" | "updatedAt">) => {
    const newTemplate: FormTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTemplates([...templates, newTemplate]);

    // Save to localStorage
    const saved = localStorage.getItem("formTemplates");
    const allTemplates = saved ? JSON.parse(saved) : [];
    allTemplates.push(newTemplate);
    localStorage.setItem("formTemplates", JSON.stringify(allTemplates));
  };

  const testWorkflow = async () => {
    // 1. Validações básicas
    if (nodes.length === 0) {
      toast.error("❌ Adicione pelo menos um nó ao workflow");
      return;
    }

    // 2. Verificar se o workflow foi salvo
    let workflowId = searchParams.get("id");
    if (!workflowId) {
      toast.error("💾 Salve o workflow antes de testá-lo");
      return;
    }

    // 3. Validar estrutura do workflow
    const validationErrors: string[] = [];

    // Verificar nó inicial
    const startNode = nodes.find(n => n.data.type === "start");
    if (!startNode) {
      validationErrors.push("❌ Falta nó inicial (Start)");
    }

    // Verificar nó final
    const endNode = nodes.find(n => n.data.type === "end");
    if (!endNode) {
      validationErrors.push("❌ Falta nó final (End)");
    }

    // Verificar nodes órfãos (sem conexões de entrada exceto start)
    const nodeIds = new Set(nodes.map(n => n.id));
    const connectedSources = new Set(edges.map(e => e.source));
    const connectedTargets = new Set(edges.map(e => e.target));
    
    nodes.forEach(node => {
      if (node.data.type !== "start" && !connectedTargets.has(node.id)) {
        validationErrors.push(`⚠️ Nó "${node.data.label}" não tem conexão de entrada`);
      }
      if (node.data.type !== "end" && !connectedSources.has(node.id)) {
        validationErrors.push(`⚠️ Nó "${node.data.label}" não tem conexão de saída`);
      }
    });

    // Verificar configurações específicas de cada tipo de nó
    nodes.forEach(node => {
      const nodeData = node.data;
      
      switch (nodeData.type) {
        case "form":
          if (!nodeData.formTemplateId && (!nodeData.formFields || nodeData.formFields.length === 0)) {
            validationErrors.push(`📝 Formulário "${nodeData.label}" precisa de template ou campos configurados`);
          }
          break;
        
        case "approval":
          const approvalConfig = nodeData.approvalConfig;
          if (!approvalConfig || 
              (approvalConfig.assignmentType === "specific" && 
               (!approvalConfig.assignedAnalysts || approvalConfig.assignedAnalysts.length === 0))) {
            validationErrors.push(`✅ Aprovação "${nodeData.label}" precisa de analistas atribuídos`);
          }
          break;
        
        case "email":
          const emailConfig = nodeData.emailConfig;
          if (!emailConfig || !emailConfig.templateId) {
            validationErrors.push(`📧 Email "${nodeData.label}" precisa de template configurado`);
          }
          break;
        
        case "http":
          const httpConfig = nodeData.httpConfig;
          if (!httpConfig || !httpConfig.url || !httpConfig.method) {
            validationErrors.push(`🌐 Chamada HTTP "${nodeData.label}" precisa de URL e método configurados`);
          }
          break;
        
        case "webhook":
          const webhookConfig = nodeData.webhookConfig;
          if (!webhookConfig || !webhookConfig.url) {
            validationErrors.push(`🔗 Webhook "${nodeData.label}" precisa de URL configurada`);
          }
          break;
        
        case "database":
          const dbConfig = nodeData.databaseConfig;
          if (!dbConfig || !dbConfig.operation || !dbConfig.table) {
            validationErrors.push(`💾 Banco de Dados "${nodeData.label}" precisa de operação e tabela configuradas`);
          }
          break;
        
        case "signature":
          const signatureConfig = nodeData.signatureConfig;
          if (!signatureConfig || !signatureConfig.signers || signatureConfig.signers.length === 0) {
            validationErrors.push(`✍️ Assinatura "${nodeData.label}" precisa de signatários configurados`);
          }
          break;
        
        case "condition":
          const conditionConfig = nodeData.conditionConfig;
          if (!conditionConfig || !conditionConfig.question) {
            validationErrors.push(`🔀 Condição "${nodeData.label}" precisa de pergunta configurada`);
          }
          break;
      }
    });

    // Verificar se há caminho do start ao end
    if (startNode && endNode) {
      const visited = new Set<string>();
      const canReachEnd = (currentId: string): boolean => {
        if (currentId === endNode.id) return true;
        if (visited.has(currentId)) return false;
        
        visited.add(currentId);
        const outgoingEdges = edges.filter(e => e.source === currentId);
        
        return outgoingEdges.some(edge => canReachEnd(edge.target));
      };
      
      if (!canReachEnd(startNode.id)) {
        validationErrors.push("🚫 Não há caminho válido do início ao fim do workflow");
      }
    }

    // Se houver erros de validação, exibir todos
    if (validationErrors.length > 0) {
      console.error("Erros de validação:", validationErrors);
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold">Workflow inválido:</div>
          {validationErrors.map((err, idx) => (
            <div key={idx} className="text-xs">{err}</div>
          ))}
        </div>,
        { duration: 8000 }
      );
      return;
    }

    // 4. Executar workflow se passou em todas as validações
    try {
      toast.loading("🔄 Iniciando teste do workflow...");
      
      const { data, error } = await supabase.functions.invoke("execute-workflow", {
        body: {
          workflowId,
          inputData: {},
        },
      });

      if (error) throw error;

      toast.success(
        <div className="space-y-1">
          <div className="font-semibold">✅ Workflow testado com sucesso!</div>
          <div className="text-xs">ID da execução: {data.executionId}</div>
        </div>,
        { duration: 5000 }
      );
      console.log("✅ Execution started:", data);
    } catch (error: any) {
      console.error("❌ Erro ao executar workflow:", error);
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold">Erro ao executar workflow</div>
          <div className="text-xs">{error.message || "Erro desconhecido"}</div>
        </div>,
        { duration: 5000 }
      );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/workflows")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={testWorkflow}>
            <Play className="h-4 w-4 mr-2" />
            Testar
          </Button>
          <Button size="sm" onClick={saveWorkflow}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            deleteKeyCode={["Delete", "Backspace"]}
            fitView
            className="bg-background"
            defaultEdgeOptions={{
              type: "smoothstep",
              animated: false,
              style: { strokeWidth: 2.5 },
            }}
          >
            <Background 
              gap={16} 
              size={1} 
              color="hsl(var(--muted-foreground))"
              className="opacity-20"
            />
            <Controls 
              className="bg-card border rounded-lg shadow-sm"
              showInteractive={false}
            />
            <MiniMap
              nodeColor={(node) => {
                const data = node.data as WorkflowNodeData;
                return data.color;
              }}
              className="bg-card border rounded-lg shadow-sm"
              maskColor="hsl(var(--background) / 0.8)"
            />
            
            {/* Node Palette */}
            <Panel position="top-left" className="space-y-2">
              <Card className="p-4 max-w-md shadow-lg">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-foreground">Adicionar Etapas</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Arraste ou clique para adicionar ao fluxo
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {nodeTemplates.map((template) => {
                    const IconComponent = {
                      FileText,
                      Webhook,
                      Globe,
                      PenTool,
                      Mail,
                      Database,
                      CheckCircle,
                      GitBranch,
                      StopCircle
                    }[template.icon] || FileText;

                    return (
                      <Button
                        key={template.type}
                        variant="outline"
                        className="h-auto p-3 flex flex-col items-start gap-2 hover:scale-105 transition-all duration-200 hover:shadow-md group"
                        onClick={() => addNode(template)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div 
                            className="p-1.5 rounded-md transition-transform duration-200 group-hover:scale-110"
                            style={{ backgroundColor: `${template.color}15` }}
                          >
                            <IconComponent 
                              className="h-4 w-4" 
                              style={{ color: template.color }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-left flex-1">
                            {template.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-left leading-tight">
                          {template.description}
                        </p>
                      </Button>
                    );
                  })}
                </div>
              </Card>
            </Panel>
          </ReactFlow>
        </div>

        {/* Config Panel Dialog */}
        <Dialog open={selectedNode !== null} onOpenChange={(open) => !open && setSelectedNode(null)}>
          <DialogContent className="max-w-[90vw] w-full h-[90vh] max-h-[90vh] p-0 gap-0">
            {selectedNode && (
              <ConfigPanel
                nodeData={selectedNode.data}
                onUpdate={updateSelectedNode}
                onClose={() => setSelectedNode(null)}
                onDelete={() => deleteNode(selectedNode.id)}
                templates={templates}
                onSaveTemplate={saveTemplate}
                allWorkflowNodes={nodes}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
