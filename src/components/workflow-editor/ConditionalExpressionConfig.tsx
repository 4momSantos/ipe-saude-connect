import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Code, Wand2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { ConditionalExpressionConfig as ConfigType, VisualRule, ComparisonOperator } from "@/types/workflow-editor";

interface ConditionalExpressionConfigPanelProps {
  config: ConfigType;
  onChange: (config: ConfigType) => void;
}

const OPERATORS: Array<{ value: ComparisonOperator; label: string }> = [
  { value: '===', label: 'Igual a' },
  { value: '!==', label: 'Diferente de' },
  { value: '>', label: 'Maior que' },
  { value: '<', label: 'Menor que' },
  { value: '>=', label: 'Maior ou igual a' },
  { value: '<=', label: 'Menor ou igual a' },
  { value: 'contains', label: 'Contém' },
  { value: 'in', label: 'Está em (array)' }
];

export function ConditionalExpressionConfigPanel({ config, onChange }: ConditionalExpressionConfigPanelProps) {
  const [testContext, setTestContext] = useState('{"age": 25, "role": "admin"}');
  const [testResult, setTestResult] = useState<{ success: boolean; result?: any; error?: string } | null>(null);

  // Visual Mode Functions
  const addRule = () => {
    const newRule: VisualRule = {
      id: `rule-${Date.now()}`,
      field: '',
      operator: '===',
      value: '',
      connector: 'and'
    };

    onChange({
      ...config,
      visualRules: [...(config.visualRules || []), newRule]
    });
  };

  const updateRule = (id: string, updates: Partial<VisualRule>) => {
    onChange({
      ...config,
      visualRules: config.visualRules?.map(rule => 
        rule.id === id ? { ...rule, ...updates } : rule
      )
    });
  };

  const removeRule = (id: string) => {
    onChange({
      ...config,
      visualRules: config.visualRules?.filter(rule => rule.id !== id)
    });
  };

  // Convert visual rules to JSON Logic
  const convertToJsonLogic = () => {
    if (!config.visualRules || config.visualRules.length === 0) {
      return null;
    }

    const conditions = config.visualRules.map(rule => {
      const value = isNaN(Number(rule.value)) ? rule.value : Number(rule.value);

      switch (rule.operator) {
        case '===':
          return { "===": [{ "var": rule.field }, value] };
        case '!==':
          return { "!": { "===": [{ "var": rule.field }, value] } };
        case '>':
          return { ">": [{ "var": rule.field }, value] };
        case '<':
          return { "<": [{ "var": rule.field }, value] };
        case '>=':
          return { ">=": [{ "var": rule.field }, value] };
        case '<=':
          return { "<=": [{ "var": rule.field }, value] };
        case 'contains':
          return { "in": [value, { "var": rule.field }] };
        case 'in':
          return { "in": [{ "var": rule.field }, JSON.parse(rule.value)] };
        default:
          return { "===": [{ "var": rule.field }, value] };
      }
    });

    const firstConnector = config.visualRules[0]?.connector || 'and';
    
    if (conditions.length === 1) {
      return conditions[0];
    }

    return firstConnector === 'and' 
      ? { "and": conditions }
      : { "or": conditions };
  };

  // Validação simplificada (inline)
  const validateExpression = () => {
    if (config.mode === 'visual') {
      const logic = convertToJsonLogic();
      if (!logic) return { valid: false, error: 'Adicione pelo menos uma regra' };
      return { valid: true };
    } else {
      try {
        JSON.parse(config.expertExpression || '{}');
        return { valid: true };
      } catch (error: any) {
        return { valid: false, error: error.message };
      }
    }
  };

  // Test expression (inline)
  const handleTest = () => {
    try {
      JSON.parse(testContext);
      const logic = config.mode === 'visual' 
        ? convertToJsonLogic()
        : JSON.parse(config.expertExpression || '{}');

      if (!logic) {
        throw new Error('Nenhuma regra definida');
      }

      // Preview apenas - avaliação real acontece no backend
      setTestResult({ success: true, result: "Será avaliado no backend" });
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
    }
  };

  const validation = validateExpression();

  return (
    <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
      <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Expressão Condicional</h3>
          <p className="text-sm text-muted-foreground">
            Configure as regras de decisão automática
          </p>
        </div>
        <Badge variant={validation.valid ? "default" : "destructive"}>
          {validation.valid ? (
            <><CheckCircle className="h-3 w-3 mr-1" /> Válido</>
          ) : (
            <><XCircle className="h-3 w-3 mr-1" /> Inválido</>
          )}
        </Badge>
      </div>

      {/* Mode Tabs */}
      <Tabs 
        value={config.mode} 
        onValueChange={(mode) => onChange({ ...config, mode: mode as 'visual' | 'expert' })}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visual">
            <Wand2 className="h-4 w-4 mr-2" />
            Visual
          </TabsTrigger>
          <TabsTrigger value="expert">
            <Code className="h-4 w-4 mr-2" />
            JSON Logic
          </TabsTrigger>
        </TabsList>

        {/* Visual Builder */}
        <TabsContent value="visual" className="space-y-4">
          <Card className="p-4 space-y-4">
            {config.visualRules?.map((rule, index) => (
              <div key={rule.id} className="space-y-3">
                {index > 0 && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={rule.connector}
                      onValueChange={(value) => updateRule(rule.id, { connector: value as 'and' | 'or' })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="and">E</SelectItem>
                        <SelectItem value="or">OU</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Campo (ex: age)"
                      value={rule.field}
                      onChange={(e) => updateRule(rule.id, { field: e.target.value })}
                    />
                    <Select
                      value={rule.operator}
                      onValueChange={(value) => updateRule(rule.id, { operator: value as ComparisonOperator })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Valor"
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addRule} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Regra
            </Button>
          </Card>

          {/* Preview JSON Logic */}
          {config.visualRules && config.visualRules.length > 0 && (
            <Alert>
              <Code className="h-4 w-4" />
              <AlertDescription>
                <div className="text-xs mt-2">
                  <pre className="bg-muted/50 p-2 rounded overflow-auto max-h-48">
                    {JSON.stringify(convertToJsonLogic(), null, 2)}
                  </pre>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Expert Mode */}
        <TabsContent value="expert" className="space-y-4">
          <div className="space-y-2">
            <Label>JSON Logic</Label>
            <Textarea
              placeholder='{">=": [{"var": "age"}, 18]}'
              value={config.expertExpression || ''}
              onChange={(e) => onChange({ ...config, expertExpression: e.target.value })}
              className="font-mono text-sm min-h-[200px]"
            />
            {!validation.valid && validation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validation.error}</AlertDescription>
              </Alert>
            )}
          </div>

          <Alert>
            <AlertDescription className="text-xs space-y-2">
              <div className="font-semibold">Exemplos:</div>
              <div className="space-y-1 font-mono bg-muted/50 p-2 rounded text-xs">
                <div>{"{ \"===\": [{\"var\": \"status\"}, \"active\"] }"}</div>
                <div>{"{ \">=\": [{\"var\": \"age\"}, 18] }"}</div>
                <div>{"{ \"and\": [{...}, {...}] }"}</div>
              </div>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* Test Panel */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label>Testar Expressão</Label>
          <Button variant="outline" size="sm" onClick={handleTest}>
            Executar Teste
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Contexto (JSON)</Label>
          <Textarea
            placeholder='{"age": 25, "role": "admin"}'
            value={testContext}
            onChange={(e) => setTestContext(e.target.value)}
            className="font-mono text-xs h-20"
          />
        </div>

        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"}>
            <AlertDescription className="font-mono text-sm">
              {testResult.success ? (
                <>
                  <CheckCircle className="h-4 w-4 inline mr-2" />
                  Configuração válida - será avaliado durante execução
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 inline mr-2" />
                  Erro: {testResult.error}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Documentation */}
      <Alert>
        <AlertDescription className="text-xs">
          <strong>Variáveis disponíveis:</strong>
          <div className="mt-1 space-y-1">
            <div>• Contexto de execução do workflow</div>
            <div>• Dados de nós anteriores</div>
            <div>• Dados da inscrição/processo</div>
          </div>
        </AlertDescription>
      </Alert>
      </div>
    </ScrollArea>
  );
}
