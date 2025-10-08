import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Code2, Play, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FunctionConfig {
  code?: string;
  timeout?: number;
}

interface FunctionConfigPanelProps {
  config: FunctionConfig;
  onChange: (config: FunctionConfig) => void;
}

export function FunctionConfigPanel({ config, onChange }: FunctionConfigPanelProps) {
  const [testResult, setTestResult] = useState<any>(null);

  const handleCodeChange = (code: string) => {
    onChange({ ...config, code });
  };

  const handleTimeoutChange = (timeout: string) => {
    const value = parseInt(timeout);
    onChange({ ...config, timeout: isNaN(value) ? 5000 : value });
  };

  const validateCode = () => {
    const code = config.code || '';
    const blockedPatterns = [
      { pattern: /require\s*\(/gi, name: 'require()' },
      { pattern: /import\s+.*\s+from/gi, name: 'import' },
      { pattern: /eval\s*\(/gi, name: 'eval()' },
      { pattern: /Function\s*\(/gi, name: 'new Function()' },
      { pattern: /process\./gi, name: 'process' },
      { pattern: /global\./gi, name: 'global' },
      { pattern: /Deno\./gi, name: 'Deno' }
    ];

    const violations = blockedPatterns
      .filter(({ pattern }) => pattern.test(code))
      .map(({ name }) => name);

    if (violations.length > 0) {
      setTestResult({
        success: false,
        errors: violations,
        message: `Padrões bloqueados detectados: ${violations.join(', ')}`
      });
      return false;
    }

    setTestResult({
      success: true,
      message: 'Código validado com sucesso! Nenhum padrão perigoso detectado.'
    });
    return true;
  };

  const exampleCode = `// Exemplo: Transformar dados do contexto
const items = context.items || [];

// Filtrar apenas aprovados
const approved = items.filter(item => item.status === 'approved');

// Calcular total
const total = approved.reduce((sum, item) => sum + (item.value || 0), 0);

// Retornar resultado
return {
  totalApproved: approved.length,
  totalValue: total,
  averageValue: total / approved.length
};`;

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Function Node:</strong> Execute código JavaScript customizado para transformar dados, 
          fazer cálculos ou aplicar lógica complexa. O código roda em um ambiente seguro com acesso 
          limitado às APIs do sistema.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="code" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="code">
            <Code2 className="h-4 w-4 mr-2" />
            Código
          </TabsTrigger>
          <TabsTrigger value="help">Ajuda & Exemplos</TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Código JavaScript</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={validateCode}
              >
                <Play className="h-3 w-3 mr-1" />
                Validar
              </Button>
            </div>
            <Textarea
              value={config.code || ''}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder={exampleCode}
              rows={15}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="px-1 py-0.5 bg-muted rounded">context</code> para acessar dados do workflow.
              Use <code className="px-1 py-0.5 bg-muted rounded">return</code> para retornar o resultado.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Timeout (ms)</Label>
            <Input
              type="number"
              value={config.timeout || 5000}
              onChange={(e) => handleTimeoutChange(e.target.value)}
              min={1000}
              max={30000}
              step={1000}
            />
            <p className="text-xs text-muted-foreground">
              Tempo máximo de execução (1-30 segundos). Previne loops infinitos.
            </p>
          </div>

          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription className="text-xs">
                {testResult.message}
                {testResult.errors && (
                  <ul className="mt-2 list-disc list-inside">
                    {testResult.errors.map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="help" className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm mb-2">✅ APIs Permitidas</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Math</Badge>
                <Badge variant="outline">Date</Badge>
                <Badge variant="outline">JSON</Badge>
                <Badge variant="outline">String</Badge>
                <Badge variant="outline">Array</Badge>
                <Badge variant="outline">Object</Badge>
                <Badge variant="outline">console.log()</Badge>
                <Badge variant="outline">utils.*</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                ❌ APIs Bloqueadas (Segurança)
              </h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="destructive">require()</Badge>
                <Badge variant="destructive">import</Badge>
                <Badge variant="destructive">eval()</Badge>
                <Badge variant="destructive">process</Badge>
                <Badge variant="destructive">fs</Badge>
                <Badge variant="destructive">child_process</Badge>
                <Badge variant="destructive">net</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">📦 Utilities Disponíveis</h4>
              <div className="text-xs space-y-1 bg-muted p-3 rounded-md font-mono">
                <div>utils.map(array, fn)</div>
                <div>utils.filter(array, fn)</div>
                <div>utils.find(array, fn)</div>
                <div>utils.reduce(array, fn, initial)</div>
                <div>utils.groupBy(array, key)</div>
                <div>utils.sortBy(array, key)</div>
                <div>utils.uniq(array)</div>
                <div>utils.pick(object, keys)</div>
                <div>utils.omit(object, keys)</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">💡 Exemplo Completo</h4>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                <code>{`// Acessar dados do workflow
const userData = context.form_dados_pessoais;
const documents = context.ocr_results || [];

// Validar CPF
const cpfValid = documents.some(doc => 
  doc.type === 'cpf' && 
  doc.confidence > 0.8
);

// Calcular idade
const birthDate = new Date(userData.data_nascimento);
const age = Math.floor(
  (Date.now() - birthDate.getTime()) / 
  (365.25 * 24 * 60 * 60 * 1000)
);

// Determinar elegibilidade
const eligible = cpfValid && age >= 18;

console.log('Validação:', { cpfValid, age, eligible });

// Retornar resultado
return {
  eligible,
  age,
  validationDetails: {
    cpf: cpfValid,
    minimumAge: age >= 18
  }
};`}</code>
              </pre>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Segurança:</strong> Dados sensíveis (passwords, tokens, apiKeys) são 
                automaticamente removidos do contexto antes da execução.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
