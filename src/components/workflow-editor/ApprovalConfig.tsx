import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, User, UsersRound } from "lucide-react";
import { ApprovalConfig } from "@/types/workflow-editor";

interface ApprovalConfigPanelProps {
  config: ApprovalConfig;
  onChange: (config: ApprovalConfig) => void;
}

interface Analyst {
  id: string;
  nome: string;
  email: string;
}

interface Grupo {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  total_membros_ativos: number;
  cor_identificacao: string;
}

export function ApprovalConfigPanel({ config, onChange }: ApprovalConfigPanelProps) {
  const { toast } = useToast();
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnalysts();
    loadGrupos();
  }, []);

  const loadAnalysts = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os usuários com papel de analista
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "analista");

      if (rolesError) throw rolesError;

      const analystIds = userRoles?.map(r => r.user_id) || [];
      
      if (analystIds.length === 0) {
        setAnalysts([]);
        return;
      }

      // Buscar perfis dos analistas
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .in("id", analystIds);

      if (profilesError) throw profilesError;

      setAnalysts(profiles || []);
    } catch (error: any) {
      console.error("Erro ao carregar analistas:", error);
      toast({
        title: "Erro ao carregar analistas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from("v_grupos_com_membros")
        .select("*")
        .eq("ativo", true)
        .order("grupo_nome");

      if (error) throw error;
      
      setGrupos(data?.map(g => ({
        id: g.grupo_id,
        nome: g.grupo_nome,
        descricao: g.descricao || '',
        tipo: g.tipo,
        total_membros_ativos: g.total_membros_ativos || 0,
        cor_identificacao: '#3b82f6' // Cor padrão já que a coluna não existe na view
      })) || []);
    } catch (error: any) {
      console.error("Erro ao carregar grupos:", error);
      toast({
        title: "Erro ao carregar grupos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAssignmentTypeChange = (value: "all" | "specific" | "groups" | "mixed") => {
    onChange({
      ...config,
      assignmentType: value,
      assignedAnalysts: value === "all" || value === "groups" ? [] : config.assignedAnalysts,
      assignedGroups: value === "all" || value === "specific" ? [] : config.assignedGroups,
    });
  };

  const handleAnalystToggle = (analystId: string, checked: boolean) => {
    const currentAnalysts = config.assignedAnalysts || [];
    const updatedAnalysts = checked
      ? [...currentAnalysts, analystId]
      : currentAnalysts.filter(id => id !== analystId);

    onChange({
      ...config,
      assignedAnalysts: updatedAnalysts,
    });
  };

  const handleGrupoToggle = (grupoId: string, checked: boolean) => {
    const currentGrupos = config.assignedGroups || [];
    const updatedGrupos = checked
      ? [...currentGrupos, grupoId]
      : currentGrupos.filter(id => id !== grupoId);

    onChange({
      ...config,
      assignedGroups: updatedGrupos,
    });
  };

  return (
    <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
      <div className="space-y-4">
      <div className="space-y-3">
        <Label>Atribuição de Responsabilidade</Label>
        <RadioGroup
          value={config.assignmentType || "all"}
          onValueChange={handleAssignmentTypeChange}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all-analysts" />
            <Label htmlFor="all-analysts" className="font-normal cursor-pointer flex items-center gap-2">
              <Users className="h-4 w-4" />
              Todos os Analistas
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="specific" id="specific-analysts" />
            <Label htmlFor="specific-analysts" className="font-normal cursor-pointer flex items-center gap-2">
              <User className="h-4 w-4" />
              Analistas Específicos
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="groups" id="groups" />
            <Label htmlFor="groups" className="font-normal cursor-pointer flex items-center gap-2">
              <UsersRound className="h-4 w-4" />
              Grupos de Usuários
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mixed" id="mixed" />
            <Label htmlFor="mixed" className="font-normal cursor-pointer flex items-center gap-2">
              <Users className="h-4 w-4" />
              Analistas + Grupos
            </Label>
          </div>
        </RadioGroup>
      </div>

      {(config.assignmentType === "groups" || config.assignmentType === "mixed") && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <Label>Selecionar Grupos</Label>
            <Badge variant="secondary">
              {config.assignedGroups?.length || 0} selecionado(s)
            </Badge>
          </div>
          
          {loading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Carregando grupos...
            </div>
          ) : grupos.length === 0 ? (
            <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">
              <p>Nenhum grupo encontrado.</p>
              <p className="mt-1 text-xs">
                Crie grupos de usuários primeiro.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg bg-background/50 transition-all duration-300">
              <ScrollArea className="max-h-[300px] min-h-[150px]">
                <div className="p-3 space-y-2">
                  {grupos.map((grupo) => (
                    <div
                      key={grupo.id}
                      className="flex items-start space-x-3 p-3 rounded-md hover:bg-accent/50 transition-all duration-200 cursor-pointer group"
                      onClick={() => {
                        const isChecked = config.assignedGroups?.includes(grupo.id) || false;
                        handleGrupoToggle(grupo.id, !isChecked);
                      }}
                    >
                      <Checkbox
                        id={grupo.id}
                        checked={config.assignedGroups?.includes(grupo.id) || false}
                        onCheckedChange={(checked) =>
                          handleGrupoToggle(grupo.id, checked as boolean)
                        }
                        className="mt-1 pointer-events-none"
                      />
                      <label
                        htmlFor={grupo.id}
                        className="flex-1 cursor-pointer space-y-0.5 pointer-events-none"
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: grupo.cor_identificacao }}
                          />
                          <span className="font-medium text-sm group-hover:text-primary transition-colors">
                            {grupo.nome}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {grupo.descricao || grupo.tipo} • {grupo.total_membros_ativos} {grupo.total_membros_ativos === 1 ? 'membro' : 'membros'}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {(config.assignmentType === "specific" || config.assignmentType === "mixed") && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <Label>Selecionar Analistas</Label>
            <Badge variant="secondary">
              {config.assignedAnalysts?.length || 0} selecionado(s)
            </Badge>
          </div>
          
          {loading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Carregando analistas...
            </div>
          ) : analysts.length === 0 ? (
            <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">
              <p>Nenhum analista encontrado.</p>
              <p className="mt-1 text-xs">
                Crie usuários com papel de "analista" primeiro.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg bg-background/50 transition-all duration-300">
              <ScrollArea className="max-h-[300px] min-h-[150px]">
                <div className="p-3 space-y-2">
                  {analysts.map((analyst) => (
                    <div
                      key={analyst.id}
                      className="flex items-start space-x-3 p-3 rounded-md hover:bg-accent/50 transition-all duration-200 cursor-pointer group"
                      onClick={() => {
                        const isChecked = config.assignedAnalysts?.includes(analyst.id) || false;
                        handleAnalystToggle(analyst.id, !isChecked);
                      }}
                    >
                      <Checkbox
                        id={analyst.id}
                        checked={config.assignedAnalysts?.includes(analyst.id) || false}
                        onCheckedChange={(checked) =>
                          handleAnalystToggle(analyst.id, checked as boolean)
                        }
                        className="mt-1 pointer-events-none"
                      />
                      <label
                        htmlFor={analyst.id}
                        className="flex-1 cursor-pointer space-y-0.5 pointer-events-none"
                      >
                        <div className="font-medium text-sm group-hover:text-primary transition-colors">
                          {analyst.nome}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {analyst.email}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-3 text-sm">
        <p className="text-muted-foreground">
          {config.assignmentType === "all" && (
            <>
              <strong>Todos os analistas</strong> receberão notificação e poderão
              aprovar esta etapa.
            </>
          )}
          {config.assignmentType === "specific" && (
            <>
              Apenas os <strong>analistas selecionados</strong> receberão
              notificação e poderão aprovar esta etapa.
            </>
          )}
          {config.assignmentType === "groups" && (
            <>
              Todos os membros dos <strong>grupos selecionados</strong> receberão
              notificação e poderão aprovar esta etapa.
            </>
          )}
          {config.assignmentType === "mixed" && (
            <>
              Os <strong>analistas e membros dos grupos selecionados</strong> receberão
              notificação e poderão aprovar esta etapa.
            </>
          )}
        </p>
      </div>
      </div>
    </ScrollArea>
  );
}