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
  StopCircle,
  Eye,
  Repeat,
  Code2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkflowNode } from "@/components/workflow-editor/WorkflowNode";
import { ConfigPanel } from "@/components/workflow-editor/ConfigPanel";
import { TriggerManagementDialog } from "@/components/workflow-editor/TriggerManagementDialog";
import { WorkflowNodeData, FormTemplate, VisualWorkflow } from "@/types/workflow-editor";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const nodeTypes = {
  workflowNode: WorkflowNode,
  database: WorkflowNode,
  email: WorkflowNode,
  form: WorkflowNode,
  webhook: WorkflowNode,
  http: WorkflowNode,
  signature: WorkflowNode,
  approval: WorkflowNode,
  condition: WorkflowNode,
  start: WorkflowNode,
  end: WorkflowNode,
  loop: WorkflowNode,
  function: WorkflowNode,
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
      triggerConfig: {
        type: "manual",
      },
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
    type: "function",
    label: "Código/Função",
    color: "#f97316",
    icon: "Code2",
    description: "Execute código JavaScript customizado.",
    category: "Lógica",
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
    type: "loop",
    label: "Loop",
    color: "#fb923c",
    icon: "Repeat",
    description: "Executa ações repetidas em uma lista de itens.",
    category: "Controle",
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

  // Função para carregar o template de credenciamento completo
  const loadCredenciamentoTemplate = () => {
    const CREDENCIAMENTO_TEMPLATE = {
      nodes: [
        {
          id: 'start',
          type: 'workflowNode',
          position: { x: 400, y: 50 },
          data: {
            label: 'Formulário Enviado',
            type: 'start',
            color: '#10b981',
            icon: 'Play',
            description: 'Gatilho: quando candidato envia formulário de inscrição',
            category: 'Credenciamento',
            triggerConfig: {
              type: 'database',
              table: 'inscricoes_edital',
              event: 'INSERT',
              conditions: {
                status: 'pendente_workflow'
              }
            }
          }
        },
        {
          id: 'form',
          type: 'workflowNode',
          position: { x: 400, y: 180 },
          data: {
            label: 'Dados de Inscrição',
            type: 'form',
            color: '#3b82f6',
            icon: 'FileText',
            description: 'Coleta dados do candidato para credenciamento',
            category: 'Coleta de Dados',
            formConfig: { fields: [] }
          }
        },
        {
          id: 'approval',
          type: 'workflowNode',
          position: { x: 400, y: 340 },
          data: {
            label: 'Aprovação do Analista',
            type: 'approval',
            color: '#14b8a6',
            icon: 'CheckCircle',
            description: 'Analista revisa e aprova/rejeita inscrição',
            category: 'Decisão',
            approvalConfig: { assignmentType: 'all' }
          }
        },
        {
          id: 'email-aprovado',
          type: 'workflowNode',
          position: { x: 600, y: 480 },
          data: {
            label: 'Email: Solicitação Assinatura',
            type: 'email',
            color: '#f59e0b',
            icon: 'Mail',
            description: 'Envia email solicitando assinatura do contrato',
            category: 'Comunicação',
            emailConfig: {
              to: '{candidato.email}',
              subject: 'Solicitação de Assinatura - Credenciamento',
              body: 'Prezado(a) {candidato.nome},\n\nSua inscrição foi aprovada! Por favor, assine o contrato através do link abaixo.'
            }
          }
        },
        {
          id: 'email-rejeitado',
          type: 'workflowNode',
          position: { x: 200, y: 480 },
          data: {
            label: 'Email: Notificação Rejeição',
            type: 'email',
            color: '#ef4444',
            icon: 'Mail',
            description: 'Notifica candidato sobre rejeição',
            category: 'Comunicação',
            emailConfig: {
              to: '{candidato.email}',
              subject: 'Inscrição não aprovada',
              body: 'Prezado(a) {candidato.nome},\n\nInfelizmente sua inscrição não foi aprovada. Você pode corrigir e reenviar.'
            }
          }
        },
        {
          id: 'condition',
          type: 'workflowNode',
          position: { x: 200, y: 620 },
          data: {
            label: 'Candidato Reenviou?',
            type: 'condition',
            color: '#f59e0b',
            icon: 'GitBranch',
            description: 'Verifica se candidato corrigiu e reenviou',
            category: 'Decisão',
            conditionConfig: {
              question: 'Candidato corrigiu e reenviou a inscrição?',
              assignmentType: 'all'
            }
          }
        },
        {
          id: 'signature',
          type: 'workflowNode',
          position: { x: 600, y: 620 },
          data: {
            label: 'Assinatura Eletrônica',
            type: 'signature',
            color: '#8b5cf6',
            icon: 'PenTool',
            description: 'Processo de assinatura digital via Assinafy',
            category: 'Documento',
            signatureConfig: {
              provider: 'assinafy',
              signers: [
                { name: '{candidato.nome}', email: '{candidato.email}' }
              ]
            }
          }
        },
        {
          id: 'email-confirmacao',
          type: 'workflowNode',
          position: { x: 600, y: 760 },
          data: {
            label: 'Email: Confirmação',
            type: 'email',
            color: '#22c55e',
            icon: 'Mail',
            description: 'Envia email de confirmação com contrato',
            category: 'Comunicação',
            emailConfig: {
              to: '{candidato.email}',
              subject: 'Confirmação de Credenciamento',
              body: 'Parabéns {candidato.nome}!\n\nSeu credenciamento foi concluído com sucesso. Em anexo, o contrato assinado.'
            }
          }
        },
        {
          id: 'database',
          type: 'workflowNode',
          position: { x: 600, y: 900 },
          data: {
            label: 'Atualizar Status no BD',
            type: 'database',
            color: '#06b6d4',
            icon: 'Database',
            description: 'Atualiza status para "credenciado" no banco',
            category: 'Dados',
            databaseConfig: {
              table: 'inscricoes_edital',
              action: 'update',
              data: { status: 'aprovado' }
            }
          }
        },
        {
          id: 'end-sucesso',
          type: 'workflowNode',
          position: { x: 600, y: 1040 },
          data: {
            label: 'Credenciado',
            type: 'end',
            color: '#22c55e',
            icon: 'CheckCircle',
            description: 'Processo concluído - candidato credenciado',
            category: 'Credenciamento'
          }
        },
        {
          id: 'end-cancelado',
          type: 'workflowNode',
          position: { x: 200, y: 900 },
          data: {
            label: 'Processo Cancelado',
            type: 'end',
            color: '#ef4444',
            icon: 'StopCircle',
            description: 'Processo cancelado por não reenvio',
            category: 'Credenciamento'
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'form', animated: true },
        { id: 'e2', source: 'form', target: 'approval', animated: true },
        { id: 'e3', source: 'approval', sourceHandle: 'approved', target: 'email-aprovado', animated: true, label: 'Aprovado' },
        { id: 'e4', source: 'approval', sourceHandle: 'rejected', target: 'email-rejeitado', animated: true, label: 'Rejeitado' },
        { id: 'e5', source: 'email-rejeitado', target: 'condition', animated: true },
        { id: 'e6', source: 'condition', sourceHandle: 'yes', target: 'form', animated: true, label: 'Sim' },
        { id: 'e7', source: 'condition', sourceHandle: 'no', target: 'end-cancelado', animated: true, label: 'Não' },
        { id: 'e8', source: 'email-aprovado', target: 'signature', animated: true },
        { id: 'e9', source: 'signature', target: 'email-confirmacao', animated: true },
        { id: 'e10', source: 'email-confirmacao', target: 'database', animated: true },
        { id: 'e11', source: 'database', target: 'end-sucesso', animated: true }
      ]
    };

    setNodes(CREDENCIAMENTO_TEMPLATE.nodes as Node<WorkflowNodeData>[]);
    setEdges(CREDENCIAMENTO_TEMPLATE.edges as Edge[]);
    setWorkflowName('Fluxo de Credenciamento Completo');
    
    toast.success(
      <div className="space-y-1">
        <div className="font-semibold">🚀 Template carregado!</div>
        <div className="text-xs">Fluxo completo com 11 etapas configurado</div>
      </div>,
      { duration: 4000 }
    );
  };

  // Função auxiliar para verificar se há caminho entre dois nós
  const findPath = (startId: string, endId: string, edges: Edge[]): boolean => {
    const visited = new Set<string>();
    
    const dfs = (currentId: string): boolean => {
      if (currentId === endId) return true;
      if (visited.has(currentId)) return false;
      
      visited.add(currentId);
      const outgoingEdges = edges.filter(e => e.source === currentId);
      
      return outgoingEdges.some(edge => dfs(edge.target));
    };
    
    return dfs(startId);
  };

  // Função para verificar se há passos pendentes
  const checkPendingSteps = async (executionId: string): Promise<boolean> => {
    // Aguardar 1.5s para dar tempo da edge function processar
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const { data: steps } = await supabase
      .from('workflow_step_executions')
      .select('status, node_type')
      .eq('execution_id', executionId)
      .in('status', ['pending', 'running']);
    
    return (steps && steps.length > 0) || false;
  };

  const testWorkflow = async () => {
    // Obter workflowId primeiro
    const workflowId = searchParams.get("id");
    console.log("🧪 Testando workflow:", workflowId);
    
    // Validações completas
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Verificar se há nós
    if (nodes.length === 0) {
      errors.push("❌ Workflow vazio - adicione nós ao workflow");
    }

    // 2. Verificar se o workflow foi salvo
    if (!workflowId) {
      errors.push("❌ Workflow não salvo - salve antes de testar");
    }

    // 3. Verificar se há nó de início e se tem configuração de gatilho
    const startNode = nodes.find(n => n.data.type === 'start');
    if (!startNode) {
      errors.push("❌ Falta nó de início (Start)");
    } else if (!startNode.data.triggerConfig) {
      warnings.push("⚠️ Nó Start não tem configuração de gatilho - será executado manualmente");
    } else if (startNode.data.triggerConfig.type === 'database') {
      // Validar configuração de database trigger
      if (!startNode.data.triggerConfig.table) {
        errors.push("❌ Nó Start com gatilho 'database' precisa especificar uma tabela");
      }
      if (!startNode.data.triggerConfig.event) {
        errors.push("❌ Nó Start com gatilho 'database' precisa especificar um evento (INSERT/UPDATE/DELETE)");
      }
    } else if (startNode.data.triggerConfig.type === 'webhook') {
      if (!startNode.data.triggerConfig.webhookUrl) {
        errors.push("❌ Nó Start com gatilho 'webhook' precisa especificar uma URL");
      }
    } else if (startNode.data.triggerConfig.type === 'schedule') {
      if (!startNode.data.triggerConfig.schedule) {
        errors.push("❌ Nó Start com gatilho 'schedule' precisa especificar uma expressão cron");
      }
    }

    // 4. Verificar se há nó de fim
    const endNode = nodes.find(n => n.data.type === 'end');
    if (!endNode) {
      errors.push("❌ Falta nó de fim (End)");
    }

    // 5. Verificar nós órfãos (sem conexões)
    const connectedNodeIds = new Set([
      ...edges.map(e => e.source),
      ...edges.map(e => e.target)
    ]);
    
    const orphanNodes = nodes.filter(n => 
      n.id !== 'start' && !connectedNodeIds.has(n.id)
    );
    
    if (orphanNodes.length > 0) {
      errors.push(`❌ ${orphanNodes.length} nó(s) desconectado(s): ${orphanNodes.map(n => n.data.label).join(', ')}`);
    }

    // 6. Verificar se há caminho do início ao fim
    if (startNode && endNode) {
      const hasPath = findPath(startNode.id, endNode.id, edges);
      if (!hasPath) {
        errors.push("❌ Não há caminho do início ao fim");
      }
    }

    // 7. Validar configurações de cada nó
    nodes.forEach(node => {
      const nodeData = node.data as WorkflowNodeData;
      
      switch (nodeData.type) {
        case 'form':
          if (!nodeData.formTemplateId && (!nodeData.formFields || nodeData.formFields.length === 0)) {
            errors.push(`❌ Nó "${node.data.label}": falta configurar template ou campos do formulário`);
          }
          break;
          
        case 'approval':
          if (!nodeData.approvalConfig?.assignedAnalysts || nodeData.approvalConfig.assignedAnalysts.length === 0) {
            errors.push(`❌ Nó "${node.data.label}": falta atribuir analistas para aprovação`);
          }
          break;
          
        case 'email':
          if (!nodeData.emailConfig?.templateId) {
            errors.push(`❌ Nó "${node.data.label}": falta selecionar template de e-mail`);
          }
          break;
          
        case 'http':
          if (!nodeData.httpConfig?.url) {
            errors.push(`❌ Nó "${node.data.label}": falta configurar URL da requisição HTTP`);
          }
          if (!nodeData.httpConfig?.method) {
            errors.push(`❌ Nó "${node.data.label}": falta configurar método HTTP`);
          }
          break;
          
        case 'webhook':
          if (!nodeData.webhookConfig?.url) {
            errors.push(`❌ Nó "${node.data.label}": falta configurar URL do webhook`);
          }
          break;
          
        case 'database':
          if (!nodeData.databaseConfig?.operation) {
            errors.push(`❌ Nó "${node.data.label}": falta configurar operação do banco de dados`);
          }
          if (!nodeData.databaseConfig?.table) {
            errors.push(`❌ Nó "${node.data.label}": falta configurar tabela do banco de dados`);
          }
          break;
          
        case 'signature':
          if (!nodeData.signatureConfig?.signers || nodeData.signatureConfig.signers.length === 0) {
            errors.push(`❌ Nó "${node.data.label}": falta configurar signatários`);
          }
          break;
          
        case 'condition':
          const conditionConfig = nodeData.conditionConfig as any;
          if (!conditionConfig?.question) {
            errors.push(`❌ Nó "${node.data.label}": falta configurar a condição`);
          }
          break;
      }
    });

    // Se houver erros, exibir todos
    if (errors.length > 0) {
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold">⚠️ Workflow incompleto</div>
          <div className="space-y-1 text-sm">
            {errors.map((error, i) => (
              <div key={i}>{error}</div>
            ))}
          </div>
        </div>,
        { duration: 8000 }
      );
      return;
    }

    // Se houver warnings, exibir mas permitir continuar
    if (warnings.length > 0) {
      toast.warning(
        <div className="space-y-2">
          <div className="font-semibold">⚠️ Avisos de configuração</div>
          <div className="space-y-1 text-sm">
            {warnings.map((warning, i) => (
              <div key={i}>{warning}</div>
            ))}
          </div>
        </div>,
        { duration: 6000 }
      );
    }

    // Se passou nas validações, executar workflow
    const loadingToastId = toast.loading("🔄 Iniciando teste do workflow...");
    
    try {
      const { data, error } = await supabase.functions.invoke("execute-workflow", {
        body: {
          workflowId,
          inputData: {},
        },
      });

      if (error) throw error;

      // SEMPRE remover o loading
      toast.dismiss(loadingToastId);
      
      // Verificar se workflow parou em nó pendente
      const hasPendingSteps = await checkPendingSteps(data.executionId);
      
      if (hasPendingSteps) {
        toast.success(
          <div className="space-y-1">
            <div className="font-semibold">⏸️ Workflow iniciado</div>
            <div className="text-xs">Aguardando ação manual (formulário/aprovação)</div>
            <div className="text-xs text-muted-foreground">ID: {data.executionId}</div>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.success(
          <div className="space-y-1">
            <div className="font-semibold">✅ Workflow concluído!</div>
            <div className="text-xs text-muted-foreground">ID: {data.executionId}</div>
          </div>,
          { duration: 5000 }
        );
      }
      
    } catch (error: any) {
      toast.dismiss(loadingToastId);
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold">❌ Erro ao executar workflow</div>
          <div className="text-xs">{error.message}</div>
        </div>,
        { duration: 6000 }
      );
    } finally {
      // Timeout de segurança
      setTimeout(() => toast.dismiss(loadingToastId), 100);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header - Responsivo */}
      <div className="border-b px-3 md:px-6 py-3 md:py-4 bg-card/50 backdrop-blur">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Linha 1: Voltar e Nome do Workflow */}
          <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/workflows")}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Voltar</span>
            </Button>
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="flex-1 sm:max-w-xs text-sm"
              placeholder="Nome do workflow"
            />
          </div>
          
          {/* Linha 2: Botões de Ação - Scroll horizontal em mobile */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-thin">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={loadCredenciamentoTemplate}
              className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20 hover:border-purple-500/40 shrink-0 text-xs md:text-sm"
            >
              <span className="hidden sm:inline">🚀 Criar Fluxo de Credenciamento</span>
              <span className="sm:hidden">🚀 Template</span>
            </Button>
            <TriggerManagementDialog workflowId={searchParams.get("id") || undefined} />
            <Button variant="outline" size="sm" onClick={testWorkflow} className="shrink-0">
              <Play className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Testar</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(`/analises?workflow=${searchParams.get("id")}`)}
              className="shrink-0"
            >
              <Eye className="h-4 w-4 md:mr-2" />
              <span className="hidden lg:inline">Ver Execuções</span>
              <span className="lg:hidden hidden md:inline">Execuções</span>
            </Button>
            <Button size="sm" onClick={saveWorkflow} className="shrink-0">
              <Save className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Salvar</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Barra de Etapas */}
      <div className="border-b px-3 md:px-6 py-3 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-2 md:gap-4">
          <h3 className="text-xs md:text-sm font-bold text-foreground shrink-0">Adicionar Etapas:</h3>
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-thin pb-2">
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
                StopCircle,
                Repeat,
                Code2
              }[template.icon] || FileText;

              return (
                <Button
                  key={template.type}
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 md:gap-2 hover:scale-105 transition-all duration-200"
                  onClick={() => addNode(template)}
                  title={template.description}
                >
                  <div 
                    className="p-1 rounded-md shrink-0"
                    style={{ backgroundColor: `${template.color}15` }}
                  >
                    <IconComponent 
                      className="h-3 w-3 md:h-4 md:w-4" 
                      style={{ color: template.color }}
                    />
                  </div>
                  <span className="text-[10px] md:text-xs font-semibold whitespace-nowrap">
                    {template.label}
                  </span>
                </Button>
              );
            })}
          </div>
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
              className="hidden md:block bg-card border rounded-lg shadow-sm"
              maskColor="hsl(var(--background) / 0.8)"
            />
          </ReactFlow>
        </div>

        {/* Config Panel Dialog - Responsivo */}
        <Dialog open={selectedNode !== null} onOpenChange={(open) => !open && setSelectedNode(null)}>
          <DialogContent className="max-w-[95vw] md:max-w-[90vw] w-full h-[95vh] md:h-[90vh] max-h-[95vh] md:max-h-[90vh] p-0 gap-0">
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
