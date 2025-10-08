import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Info, Shield, Clock, RefreshCw } from "lucide-react";
import { HttpConfig } from "@/types/workflow-editor";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HttpConfigProps {
  config: HttpConfig;
  onChange: (config: HttpConfig) => void;
}

export function HttpConfigPanel({ config, onChange }: HttpConfigProps) {
  const addHeader = () => {
    const headers = config.headers || {};
    headers[`header-${Date.now()}`] = "";
    onChange({ ...config, headers });
  };

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const headers = { ...config.headers };
    delete headers[oldKey];
    if (newKey) headers[newKey] = value;
    onChange({ ...config, headers });
  };

  const removeHeader = (key: string) => {
    const headers = { ...config.headers };
    delete headers[key];
    onChange({ ...config, headers });
  };

  const toggleStatusCode = (code: number) => {
    const statusCodes = config.retry?.statusCodes || [];
    const newCodes = statusCodes.includes(code)
      ? statusCodes.filter(c => c !== code)
      : [...statusCodes, code];
    
    onChange({
      ...config,
      retry: {
        ...config.retry,
        enabled: config.retry?.enabled || false,
        maxAttempts: config.retry?.maxAttempts || 3,
        backoffStrategy: config.retry?.backoffStrategy || 'exponential',
        statusCodes: newCodes
      }
    });
  };

  return (
    <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
      <div className="space-y-4">
      {/* Basic Configuration */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Configuração Básica</h3>
        </div>

        <div className="space-y-2">
          <Label>URL da API</Label>
          <Input
            value={config.url || ""}
            onChange={(e) => onChange({ ...config, url: e.target.value })}
            placeholder="https://api.exemplo.com/users/{{userId}}"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Use {"{{variavel}}"} para interpolar dados do contexto
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Método HTTP</Label>
            <Select
              value={config.method}
              onValueChange={(value: any) => onChange({ ...config, method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Resposta</Label>
            <Select
              value={config.responseType || 'json'}
              onValueChange={(value: any) => onChange({ ...config, responseType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="blob">Blob (Binary)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Headers & Body */}
      <Tabs defaultValue="headers">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
        </TabsList>

        <TabsContent value="headers" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <Label>Headers HTTP</Label>
            <Button size="sm" variant="outline" onClick={addHeader}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
          
          {config.headers && Object.entries(config.headers).map(([key, value]) => (
            <Card key={key} className="p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do header"
                  value={key.startsWith("header-") ? "" : key}
                  onChange={(e) => updateHeader(key, e.target.value, value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Valor (pode usar {{variavel}})"
                  value={value}
                  onChange={(e) => updateHeader(key, key, e.target.value)}
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeHeader(key)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="body" className="space-y-3 mt-4">
          <div className="space-y-2">
            <Label>Body da Requisição (JSON)</Label>
            <Textarea
              value={config.body || ""}
              onChange={(e) => onChange({ ...config, body: e.target.value })}
              placeholder={'{\n  "name": "{{user.name}}",\n  "email": "{{user.email}}"\n}'}
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Suporta interpolação de variáveis com {"{{variavel}}"}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Authentication */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Autenticação</h3>
        </div>

        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={config.authentication?.type || "none"}
            onValueChange={(value: any) => 
              onChange({ 
                ...config, 
                authentication: { 
                  ...config.authentication, 
                  type: value 
                } as any 
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              <SelectItem value="bearer">Bearer Token</SelectItem>
              <SelectItem value="basic">Basic Auth</SelectItem>
              <SelectItem value="apiKey">API Key</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {config.authentication?.type === "bearer" && (
          <div className="space-y-2">
            <Label>Token</Label>
            <Input
              type="password"
              value={config.authentication.token || ""}
              onChange={(e) => 
                onChange({
                  ...config,
                  authentication: { ...config.authentication, token: e.target.value, type: "bearer" }
                })
              }
              placeholder="seu-token-aqui ou {{context.token}}"
              className="font-mono text-sm"
            />
          </div>
        )}

        {config.authentication?.type === "basic" && (
          <>
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Input
                value={config.authentication.username || ""}
                onChange={(e) => 
                  onChange({
                    ...config,
                    authentication: { ...config.authentication, username: e.target.value, type: "basic" }
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                value={config.authentication.password || ""}
                onChange={(e) => 
                  onChange({
                    ...config,
                    authentication: { ...config.authentication, password: e.target.value, type: "basic" }
                  })
                }
              />
            </div>
          </>
        )}

        {config.authentication?.type === "apiKey" && (
          <>
            <div className="space-y-2">
              <Label>Nome do Header</Label>
              <Input
                value={config.authentication.apiKeyHeader || ""}
                onChange={(e) => 
                  onChange({
                    ...config,
                    authentication: { ...config.authentication, apiKeyHeader: e.target.value, type: "apiKey" }
                  })
                }
                placeholder="X-API-Key"
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={config.authentication.apiKey || ""}
                onChange={(e) => 
                  onChange({
                    ...config,
                    authentication: { ...config.authentication, apiKey: e.target.value, type: "apiKey" }
                  })
                }
                placeholder="sua-api-key ou {{context.apiKey}}"
                className="font-mono text-sm"
              />
            </div>
          </>
        )}
      </Card>

      {/* Retry Configuration */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Retry (Tentar Novamente)</h3>
          </div>
          <Switch
            checked={config.retry?.enabled || false}
            onCheckedChange={(enabled) => 
              onChange({
                ...config,
                retry: {
                  enabled,
                  maxAttempts: config.retry?.maxAttempts || 3,
                  statusCodes: config.retry?.statusCodes || [429, 503],
                  backoffStrategy: config.retry?.backoffStrategy || 'exponential'
                }
              })
            }
          />
        </div>

        {config.retry?.enabled && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Máximo de Tentativas</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={config.retry.maxAttempts || 3}
                  onChange={(e) => 
                    onChange({
                      ...config,
                      retry: {
                        ...config.retry!,
                        maxAttempts: parseInt(e.target.value)
                      }
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Estratégia de Backoff</Label>
                <Select
                  value={config.retry.backoffStrategy || 'exponential'}
                  onValueChange={(value: any) => 
                    onChange({
                      ...config,
                      retry: {
                        ...config.retry!,
                        backoffStrategy: value
                      }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixo (1s, 1s, 1s...)</SelectItem>
                    <SelectItem value="exponential">Exponencial (1s, 2s, 4s...)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fazer Retry em Status HTTP:</Label>
              <div className="flex flex-wrap gap-2">
                {[429, 500, 502, 503, 504].map(code => (
                  <Badge
                    key={code}
                    variant={config.retry?.statusCodes?.includes(code) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleStatusCode(code)}
                  >
                    {code}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Clique nos códigos para ativar/desativar retry
              </p>
            </div>
          </>
        )}
      </Card>

      {/* Timeout Configuration */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Timeout</h3>
        </div>

        <div className="space-y-2">
          <Label>Timeout (milissegundos)</Label>
          <Input
            type="number"
            min={1000}
            max={120000}
            step={1000}
            value={config.timeout || 30000}
            onChange={(e) => onChange({ ...config, timeout: parseInt(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            Tempo máximo de espera: {((config.timeout || 30000) / 1000).toFixed(0)}s
          </p>
        </div>
      </Card>

      {/* Documentation */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs space-y-2">
          <div><strong>Interpolação de Variáveis:</strong></div>
          <div className="font-mono bg-muted/50 p-2 rounded space-y-1">
            <div>• URL: https://api.com/users/{"{{context.userId}}"}</div>
            <div>• Header: Authorization: Bearer {"{{context.token}}"}</div>
            <div>• Body: {"{ \"name\": \"{{user.name}}\" }"}</div>
          </div>
          <div className="mt-2">
            <strong>Segurança:</strong> Proteção automática contra SSRF (acesso a IPs privados bloqueado)
          </div>
        </AlertDescription>
      </Alert>
      </div>
    </ScrollArea>
  );
}
