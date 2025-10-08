import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, User, HelpCircle } from "lucide-react";

export interface ConditionConfig {
  assignmentType: "all" | "specific";
  assignedAnalysts?: string[];
  question?: string;
  description?: string;
}

interface ConditionConfigPanelProps {
  config: ConditionConfig;
  onChange: (config: ConditionConfig) => void;
}

interface Analyst {
  id: string;
  nome: string;
  email: string;
}

export function ConditionConfigPanel({ config, onChange }: ConditionConfigPanelProps) {
  const { toast } = useToast();
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnalysts();
  }, []);

  const loadAnalysts = async () => {
    try {
      setLoading(true);
      
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

  const handleAssignmentTypeChange = (value: "all" | "specific") => {
    onChange({
      ...config,
      assignmentType: value,
      assignedAnalysts: value === "all" ? [] : config.assignedAnalysts,
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

  return (
    <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
      <div className="space-y-4">
      {/* Pergunta/Critério da Decisão */}
      <div className="space-y-2">
        <Label htmlFor="condition-question" className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Pergunta ou Critério de Decisão
        </Label>
        <Textarea
          id="condition-question"
          placeholder="Ex: O documento está conforme? Os dados foram validados?"
          value={config.question || ""}
          onChange={(e) => onChange({ ...config, question: e.target.value })}
          className="min-h-[80px]"
        />
        <p className="text-xs text-muted-foreground">
          Esta pergunta será apresentada ao analista para tomada de decisão
        </p>
      </div>

      {/* Atribuição de Responsabilidade */}
      <div className="space-y-3">
        <Label>Atribuição de Responsabilidade</Label>
        <RadioGroup
          value={config.assignmentType || "all"}
          onValueChange={handleAssignmentTypeChange}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all-analysts-condition" />
            <Label htmlFor="all-analysts-condition" className="font-normal cursor-pointer flex items-center gap-2">
              <Users className="h-4 w-4" />
              Todos os Analistas
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="specific" id="specific-analysts-condition" />
            <Label htmlFor="specific-analysts-condition" className="font-normal cursor-pointer flex items-center gap-2">
              <User className="h-4 w-4" />
              Analistas Específicos
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Seleção de Analistas Específicos */}
      {config.assignmentType === "specific" && (
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
                        id={`condition-${analyst.id}`}
                        checked={config.assignedAnalysts?.includes(analyst.id) || false}
                        onCheckedChange={(checked) =>
                          handleAnalystToggle(analyst.id, checked as boolean)
                        }
                        className="mt-1 pointer-events-none"
                      />
                      <label
                        htmlFor={`condition-${analyst.id}`}
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

      {/* Informação sobre Fluxos */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <div className="text-sm font-medium">Fluxos de Decisão:</div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-semibold">✓ SIM</span>
            <span>→ Conecte ao próximo passo para aprovação</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-semibold">✗ NÃO</span>
            <span>→ Conecte ao passo alternativo</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {config.assignmentType === "all" ? (
            <>
              <strong>Todos os analistas</strong> receberão notificação para tomar a decisão.
            </>
          ) : (
            <>
              Apenas os <strong>analistas selecionados</strong> receberão notificação para tomar a decisão.
            </>
          )}
        </p>
      </div>
      </div>
    </ScrollArea>
  );
}
