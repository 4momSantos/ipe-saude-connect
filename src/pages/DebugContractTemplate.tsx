import { useParams } from "react-router-dom";
import { useContractTemplate } from "@/hooks/useContractTemplates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function DebugContractTemplate() {
  const { id } = useParams();
  const { data: template, isLoading } = useContractTemplate(id);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Template não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const htmlSize = new Blob([template.conteudo_html]).size;
  const jsonSize = new Blob([JSON.stringify(template.campos_mapeados)]).size;

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug: {template.nome}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3 text-lg">Informações Básicas</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">ID:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{template.id}</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Ativo:</span>
                <Badge variant={template.is_active ? "default" : "secondary"}>
                  {template.is_active ? "Sim" : "Não"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Criado em:</span>
                <span>{new Date(template.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Atualizado em:</span>
                <span>{new Date(template.updated_at).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-lg">Tamanhos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-muted p-3 rounded">
                <div className="text-muted-foreground text-xs mb-1">HTML</div>
                <div className="font-mono font-semibold">{(htmlSize / 1024).toFixed(2)} KB</div>
                {htmlSize > 5 * 1024 * 1024 && (
                  <Badge variant="destructive" className="mt-1">Grande</Badge>
                )}
              </div>
              <div className="bg-muted p-3 rounded">
                <div className="text-muted-foreground text-xs mb-1">JSONB campos</div>
                <div className="font-mono font-semibold">{(jsonSize / 1024).toFixed(2)} KB</div>
                {jsonSize > 500 * 1024 && (
                  <Badge variant="destructive" className="mt-1">Grande</Badge>
                )}
              </div>
              <div className="bg-muted p-3 rounded">
                <div className="text-muted-foreground text-xs mb-1">Total</div>
                <div className="font-mono font-semibold">{((htmlSize + jsonSize) / 1024).toFixed(2)} KB</div>
              </div>
              <div className="bg-muted p-3 rounded">
                <div className="text-muted-foreground text-xs mb-1">Placeholders</div>
                <div className="font-mono font-semibold">{template.campos_mapeados.length}</div>
                {template.campos_mapeados.length > 50 && (
                  <Badge variant="outline" className="mt-1">Muitos</Badge>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-lg">Placeholders ({template.campos_mapeados.length})</h3>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-auto p-4 bg-muted rounded">
              {template.campos_mapeados.map((campo: any) => (
                <Badge key={campo.id} variant="outline" className="font-mono text-xs">
                  {'{{'}{campo.id}{'}}'}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-lg">Preview HTML (primeiros 1000 caracteres)</h3>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96 font-mono">
              {template.conteudo_html.substring(0, 1000)}
              {template.conteudo_html.length > 1000 && '...'}
            </pre>
          </div>

          {template.descricao && (
            <div>
              <h3 className="font-semibold mb-3 text-lg">Descrição</h3>
              <p className="text-sm text-muted-foreground">{template.descricao}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
