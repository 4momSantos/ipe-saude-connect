import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { HttpConfig } from "@/types/workflow-editor";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>URL da API</Label>
        <Input
          value={config.url || ""}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          placeholder="https://api.exemplo.com/endpoint"
        />
      </div>

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
                  placeholder="Valor"
                  value={value}
                  onChange={(e) => updateHeader(key, key, e.target.value)}
                  className="flex-1"
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
              placeholder='{\n  "chave": "valor"\n}'
              rows={8}
              className="font-mono text-sm"
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-3 pt-4 border-t">
        <Label>Autenticação</Label>
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
              placeholder="seu-token-aqui"
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
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
