import { useState, useCallback } from "react";
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
  ArrowLeft 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkflowNode } from "@/components/workflow-editor/WorkflowNode";
import { ConfigPanel } from "@/components/workflow-editor/ConfigPanel";
import { WorkflowNodeData, FormTemplate, VisualWorkflow } from "@/types/workflow-editor";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const initialNodes: Node<WorkflowNodeData>[] = [
  {
    id: "start",
    type: "workflowNode",
    position: { x: 250, y: 50 },
    data: {
      label: "Início",
      type: "start",
      color: "#10b981",
      icon: "Play",
    },
  },
];

const nodeTemplates = [
  {
    type: "form",
    label: "Formulário",
    color: "#3b82f6",
    icon: "FileText",
  },
  {
    type: "approval",
    label: "Aprovação",
    color: "#f59e0b",
    icon: "CheckCircle",
  },
  {
    type: "notification",
    label: "Notificação",
    color: "#8b5cf6",
    icon: "Mail",
  },
  {
    type: "condition",
    label: "Condicional",
    color: "#ec4899",
    icon: "GitBranch",
  },
  {
    type: "end",
    label: "Fim",
    color: "#ef4444",
    icon: "StopCircle",
  },
];

export default function WorkflowEditor() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null);
  const [workflowName, setWorkflowName] = useState("Novo Workflow");
  const [templates, setTemplates] = useState<FormTemplate[]>([]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<WorkflowNodeData>) => {
    setSelectedNode(node);
  }, []);

  const addNode = (template: typeof nodeTemplates[0]) => {
    const newNode: Node<WorkflowNodeData> = {
      id: `node-${Date.now()}`,
      type: "workflowNode",
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 200,
      },
      data: {
        label: template.label,
        type: template.type as any,
        color: template.color,
        icon: template.icon,
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

  const saveWorkflow = () => {
    const workflow: VisualWorkflow = {
      id: `workflow-${Date.now()}`,
      name: workflowName,
      description: "",
      nodes,
      edges,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      version: 1,
    };

    // Save to localStorage for demo
    const saved = localStorage.getItem("visualWorkflows");
    const workflows = saved ? JSON.parse(saved) : [];
    workflows.push(workflow);
    localStorage.setItem("visualWorkflows", JSON.stringify(workflows));

    toast.success("Workflow salvo com sucesso!");
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
          <Button variant="outline" size="sm">
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
            fitView
            className="bg-background"
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const data = node.data as WorkflowNodeData;
                return data.color;
              }}
            />
            
            {/* Node Palette */}
            <Panel position="top-left" className="space-y-2">
              <Card className="p-2 space-y-1">
                <p className="text-xs font-semibold px-2 py-1 text-muted-foreground">
                  Adicionar Etapa
                </p>
                {nodeTemplates.map((template) => (
                  <Button
                    key={template.type}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => addNode(template)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {template.label}
                  </Button>
                ))}
              </Card>
            </Panel>
          </ReactFlow>
        </div>

        {/* Config Panel */}
        {selectedNode && (
          <div className="w-96 flex-shrink-0">
            <ConfigPanel
              nodeData={selectedNode.data}
              onUpdate={updateSelectedNode}
              onClose={() => setSelectedNode(null)}
              templates={templates}
              onSaveTemplate={saveTemplate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
