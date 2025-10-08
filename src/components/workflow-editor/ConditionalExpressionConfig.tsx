/**
 * Configuração de Expressões Condicionais
 * UI visual para criar condições lógicas (JSON Logic)
 */

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
import { Plus, Trash2, Code, Wand2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { ExpressionEvaluator, JsonLogicHelpers } from "@/lib/expression-evaluator";

export interface ConditionalExpressionConfig {
  mode: 'visual' | 'expert';
  visualRules?: VisualRule[];
  expertExpression?: string;
  jsonLogic?: object;
}

export interface VisualRule {
  id: string;
  field: string;
  operator: ComparisonOperator;
  value: string;
  connector?: 'and' | 'or';
}

type ComparisonOperator = '===' | '!==' | '>' | '<' | '>=' | '<=' | 'contains' | 'in';

interface ConditionalExpressionConfigPanelProps {
  config: ConditionalExpressionConfig;
  onChange: (config: ConditionalExpressionConfig) => void;
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
          return JsonLogicHelpers.equals(rule.field, value);
        case '!==':
          return JsonLogicHelpers.not(JsonLogicHelpers.equals(rule.field, value));
        case '>':
          return JsonLogicHelpers.greaterThan(rule.field, value as number);
        case '<':
          return JsonLogicHelpers.lessThan(rule.field, value as number);
        case '>=':
          return { ">=": [{ "var": rule.field }, value] };
        case '<=':
          return { "<=": [{ "var": rule.field }, value] };
        case 'contains':
          return JsonLogicHelpers.contains(rule.field, value as string);
        case 'in':
          return JsonLogicHelpers.in(rule.field, JSON.parse(rule.value));
        default:
          return JsonLogicHelpers.equals(rule.field, value);
      }
    });

    // Combinar com AND ou OR
    const firstConnector = config.visualRules[0]?.connector || 'and';
    
    if (conditions.length === 1) {
      return conditions[0];
    }

    return firstConnector === 'and' 
      ? JsonLogicHelpers.and(...conditions)
      : JsonLogicHelpers.or(...conditions);
  };

  // Test expression
  const handleTest = () => {
    try {
      const context = JSON.parse(testContext);
      const logic = config.mode === 'visual' 
        ? convertToJsonLogic()
        : JSON.parse(config.expertExpression || '{}');

      if (!logic) {
        throw new Error('Nenhuma regra definida');
      }

      const result = ExpressionEvaluator.evaluate(logic, context, 'json-logic');
      
      setTestResult({ success: true, result });
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
    }
  };

  // Validate expression
  const validateExpression = () => {
    if (config.mode === 'visual') {
      const logic = convertToJsonLogic();
      if (!logic) return { valid: false, error: 'Adicione pelo menos uma regra' };
      return ExpressionEvaluator.validate(logic, 'json-logic');
    } else {
      return ExpressionEvaluator.validate(config.expertExpression || '', 'json-logic');
    }
  };

  const validation = validateExpression();

  return (
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
                      placeholder="Campo (ex: context.age)"
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
                  <pre className="bg-muted/50 p-2 rounded overflow-auto">
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
              <div className="space-y-1 font-mono bg-muted/50 p-2 rounded">
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
            className="font-mono text-xs"
          />
        </div>

        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"}>
            <AlertDescription className="font-mono text-sm">
              {testResult.success ? (
                <>
                  <CheckCircle className="h-4 w-4 inline mr-2" />
                  Resultado: {JSON.stringify(testResult.result)}
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
          <strong>Variáveis disponíveis no contexto:</strong>
          <div className="mt-1 space-y-1">
            <div>• <code>context.*</code> - Dados do contexto de execução</div>
            <div>• <code>node.*</code> - Dados de nós anteriores</div>
            <div>• <code>inscricao.*</code> - Dados da inscrição</div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
