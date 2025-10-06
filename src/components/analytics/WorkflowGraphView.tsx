import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  PlayCircle,
  PauseCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowGraphViewProps {
  executionId: string;
}

interface NodeState {
  nodeId: string;
  nodeType: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  progress?: number;
  retryCount?: number;
  blockedBy?: string[];
  transitions?: any[];
}

const statusColors = {
  pending: "bg-slate-300 border-slate-400 text-slate-800",
  ready: "bg-sky-300 border-sky-400 text-sky-900",
  running: "bg-primary border-primary-foreground text-primary-foreground",
  paused: "bg-amber-300 border-amber-400 text-amber-900",
  completed: "bg-emerald-500 border-emerald-600 text-white",
  failed: "bg-destructive border-destructive/80 text-destructive-foreground",
  skipped: "bg-secondary border-secondary/80 text-secondary-foreground",
  blocked: "bg-orange-400 border-orange-500 text-white",
};

const statusIcons = {
  pending: Clock,
  ready: PlayCircle,
  running: Loader2,
  paused: PauseCircle,
  completed: CheckCircle2,
  failed: XCircle,
  skipped: AlertCircle,
  blocked: AlertCircle,
};

const nodeTypeLabels: Record<string, string> = {
  start: "Início",
  form: "Formulário",
  approval: "Aprovação",
  email: "Email",
  webhook: "Webhook",
  database: "Banco",
  signature: "Assinatura",
  ocr: "OCR",
  condition: "Condicional",
  join: "Junção",
  end: "Fim",
};

export function WorkflowGraphView({ executionId }: WorkflowGraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadGraphState = useCallback(async () => {
    try {
      // Buscar definição do workflow
      const { data: execution } = await supabase
        .from("workflow_executions")
        .select("workflow:workflows(*)")
        .eq("id", executionId)
        .single();

      if (!execution?.workflow) return;

      const workflowDefinition = execution.workflow;
      const workflowNodes = (workflowDefinition.nodes as any[]) || [];
      const workflowEdges = (workflowDefinition.edges as any[]) || [];

      // Buscar estado via API
      const { data: stateData } = await supabase.functions.invoke(
        "workflow-state",
        {
          body: {
            executionId,
            includeTransitions: true,
            includeContext: false,
          },
        }
      );

      if (!stateData) return;

      const nodeStates = stateData.nodes || [];
      const stateMap = new Map<string, NodeState>(
        nodeStates.map((n: NodeState) => [n.nodeId, n])
      );

      // Mapear nós com estados
      const flowNodes: Node[] = workflowNodes.map((node: any, index: number) => {
        const state = stateMap.get(node.id);
        const status = state?.status || "pending";
        const Icon = statusIcons[status as keyof typeof statusIcons] || Clock;

        return {
          id: node.id,
          type: "default",
          position: node.position || { x: index * 200, y: 100 },
          data: {
            label: (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      status === "running" && "animate-spin"
                    )}
                  />
                  <span className="font-semibold text-sm">
                    {node.data?.label || nodeTypeLabels[node.type] || node.type}
                  </span>
                </div>
                {state?.progress !== undefined && state.progress < 100 && (
                  <div className="text-xs text-muted-foreground">
                    {state.progress}%
                  </div>
                )}
                {state?.retryCount && state.retryCount > 0 && (
                  <div className="text-xs text-amber-600">
                    Tentativa {state.retryCount}
                  </div>
                )}
              </div>
            ),
          },
          className: cn(
            "px-4 py-2 rounded-lg border-2 shadow-md transition-all",
            statusColors[status as keyof typeof statusColors] ||
              statusColors.pending
          ),
        };
      });

      // Mapear arestas
      const flowEdges: Edge[] = workflowEdges.map((edge: any) => {
        const sourceState = stateMap.get(edge.source);
        const isActive =
          sourceState?.status === "completed" ||
          sourceState?.status === "running";

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: isActive,
          style: {
            stroke: isActive ? "hsl(var(--primary))" : "hsl(var(--muted))",
            strokeWidth: isActive ? 2 : 1,
          },
          label: edge.condition ? "condicional" : undefined,
          labelStyle: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
        };
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
      setStats(stateData.stats);
    } catch (error) {
      console.error("Erro ao carregar grafo:", error);
    } finally {
      setLoading(false);
    }
  }, [executionId, setNodes, setEdges]);

  useEffect(() => {
    loadGraphState();

    if (!autoRefresh) return;

    // Polling a cada 5s se em execução
    const checkStatus = async () => {
      const { data } = await supabase
        .from("workflow_executions")
        .select("status")
        .eq("id", executionId)
        .single();

      if (data?.status === "running") {
        loadGraphState();
      } else {
        setAutoRefresh(false);
      }
    };

    const interval = setInterval(checkStatus, 5000);

    // Realtime subscription
    const channel = supabase
      .channel(`workflow-graph-${executionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workflow_step_executions",
          filter: `execution_id=eq.${executionId}`,
        },
        () => {
          loadGraphState();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [executionId, autoRefresh, loadGraphState]);

  if (loading) {
    return (
      <Card className="p-12 flex items-center justify-center h-[600px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <div style={{ height: "600px" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          connectionMode={ConnectionMode.Strict}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background />
          <Controls />
          <Panel position="top-right" className="bg-background/95 p-4 rounded-lg shadow-lg border m-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-semibold text-sm">Progresso</h3>
                <Badge variant="outline">{stats?.progress || 0}%</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Completos: {stats?.completed || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span>Executando: {stats?.running || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-slate-300" />
                  <span>Pendentes: {stats?.pending || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  <span>Falhas: {stats?.failed || 0}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2"
                onClick={() => loadGraphState()}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Atualizar
              </Button>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </Card>
  );
}
