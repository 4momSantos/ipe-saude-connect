import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, AlertCircle } from "lucide-react";
import { LoopConfig } from "@/types/workflow-editor";
import { Node } from "@xyflow/react";
import { WorkflowNodeData } from "@/types/workflow-editor";

interface LoopConfigPanelProps {
  config: LoopConfig;
  onChange: (config: LoopConfig) => void;
  allNodes: Node<WorkflowNodeData>[];
}

export function LoopConfigPanel({ config, onChange, allNodes }: LoopConfigPanelProps) {
  const updateConfig = (updates: Partial<LoopConfig>) => {
    onChange({ ...config, ...updates });
  };

  // Filtrar apenas nós válidos para o loop body (excluir start, end, loop)
  const validBodyNodes = allNodes.filter(
    (node) => !['start', 'end', 'loop'].includes(node.data.type)
  );

  return (
    <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
      <div className="space-y-6">
      {/* SEÇÃO 1: Input de Dados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração de Entrada</CardTitle>
          <CardDescription>
            Configure o array de items a ser processado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="items" className="flex items-center gap-2">
              Array de Items
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="items"
              value={config.items || ''}
              onChange={(e) => updateConfig({ items: e.target.value })}
              placeholder="{{http_response.data.users}}"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Use expressões {'{{'} variavel {'}}'}  para referenciar dados do contexto
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemVariable">Nome da Variável do Item</Label>
              <Input
                id="itemVariable"
                value={config.itemVariable || 'currentItem'}
                onChange={(e) => updateConfig({ itemVariable: e.target.value })}
                placeholder="currentItem"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="indexVariable">Nome da Variável do Índice</Label>
              <Input
                id="indexVariable"
                value={config.indexVariable || 'index'}
                onChange={(e) => updateConfig({ indexVariable: e.target.value })}
                placeholder="index"
              />
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Dentro do loop, você pode acessar: {'{{'}{config.itemVariable || 'currentItem'}{'}}'}  e {'{{'}{config.indexVariable || 'index'}{'}}'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* SEÇÃO 2: Modo de Execução */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modo de Execução</CardTitle>
          <CardDescription>Como processar os items do array</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Modo</Label>
            <Select
              value={config.executionMode || 'sequential'}
              onValueChange={(value: 'sequential' | 'parallel') =>
                updateConfig({ executionMode: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sequential">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Sequential</span>
                    <span className="text-xs text-muted-foreground">
                      Um por vez, na ordem
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="parallel">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Parallel</span>
                    <span className="text-xs text-muted-foreground">
                      Múltiplos ao mesmo tempo
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.executionMode === 'parallel' && (
            <div className="space-y-2">
              <Label htmlFor="maxConcurrency">
                Máximo de Execuções Simultâneas
              </Label>
              <Input
                id="maxConcurrency"
                type="number"
                min={1}
                max={20}
                value={config.maxConcurrency || 5}
                onChange={(e) =>
                  updateConfig({ maxConcurrency: parseInt(e.target.value) || 5 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Recomendado: 5-10 para evitar sobrecarga
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO 3: Corpo do Loop */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Corpo do Loop</CardTitle>
          <CardDescription>
            Selecione os nós que serão executados para cada item
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startNodeId">Primeiro Nó</Label>
              <Select
                value={config.loopBody?.startNodeId || ''}
                onValueChange={(value) =>
                  updateConfig({
                    loopBody: {
                      ...config.loopBody,
                      startNodeId: value,
                      endNodeId: config.loopBody?.endNodeId || value,
                    },
                  })
                }
              >
                <SelectTrigger id="startNodeId">
                  <SelectValue placeholder="Selecione o primeiro nó" />
                </SelectTrigger>
                <SelectContent>
                  {validBodyNodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.data.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endNodeId">Último Nó</Label>
              <Select
                value={config.loopBody?.endNodeId || ''}
                onValueChange={(value) =>
                  updateConfig({
                    loopBody: {
                      ...config.loopBody,
                      startNodeId: config.loopBody?.startNodeId || value,
                      endNodeId: value,
                    },
                  })
                }
              >
                <SelectTrigger id="endNodeId">
                  <SelectValue placeholder="Selecione o último nó" />
                </SelectTrigger>
                <SelectContent>
                  {validBodyNodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.data.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              O loop executará todos os nós entre o primeiro e último selecionado para cada item do array
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* SEÇÃO 4: Tratamento de Erros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tratamento de Erros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Continuar em caso de erro</Label>
              <p className="text-xs text-muted-foreground">
                Se uma iteração falhar, continuar processando as outras
              </p>
            </div>
            <Switch
              checked={config.continueOnError ?? true}
              onCheckedChange={(checked) =>
                updateConfig({ continueOnError: checked })
              }
            />
          </div>

          {!config.continueOnError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O loop será abortado na primeira falha (modo fail-fast)
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="iterationTimeout">Timeout por Iteração (ms)</Label>
            <Input
              id="iterationTimeout"
              type="number"
              min={1000}
              value={config.iterationTimeout || 30000}
              onChange={(e) =>
                updateConfig({ iterationTimeout: parseInt(e.target.value) || 30000 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Default: 30000ms (30 segundos)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 5: Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance e Confiabilidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="checkpointEvery">Checkpoint a Cada N Iterações</Label>
            <Input
              id="checkpointEvery"
              type="number"
              min={1}
              value={config.checkpointEvery || 100}
              onChange={(e) =>
                updateConfig({ checkpointEvery: parseInt(e.target.value) || 100 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Salva progresso intermediário para permitir resume em caso de falha
            </p>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Recomendações:</p>
              <ul className="text-xs space-y-1">
                <li>• Arrays pequenos (&lt;100): checkpointEvery = 50</li>
                <li>• Arrays médios (100-1000): checkpointEvery = 100</li>
                <li>• Arrays grandes (&gt;1000): checkpointEvery = 200</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* SEÇÃO 6: Variáveis Disponíveis */}
      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription>
          <p className="font-medium text-primary mb-2">Variáveis disponíveis no loop:</p>
          <div className="space-y-1 text-xs font-mono">
            <div>{'{{'}{config.itemVariable || 'currentItem'}{'}}'}  - Item atual sendo processado</div>
            <div>{'{{'}{config.indexVariable || 'index'}{'}}'}  - Índice do item (0-based)</div>
          </div>
          <p className="text-xs mt-2">
            Exemplo: "Processando {'{{'}{config.itemVariable || 'currentItem'}{'}}'}.nome na iteração {'{{'}{config.indexVariable || 'index'}{'}}'}"
          </p>
        </AlertDescription>
      </Alert>
      </div>
    </ScrollArea>
  );
}
