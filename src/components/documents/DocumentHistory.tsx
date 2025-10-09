import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DocumentVersion {
  id: string;
  versao: number;
  arquivo_nome: string;
  arquivo_url: string;
  created_at: string;
  is_current: boolean;
  replaced_at: string | null;
  replaced_by: string | null;
  parent_document_id: string | null;
}

export function DocumentHistory({ documentId }: { documentId: string }) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVersions();
  }, [documentId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      // Buscar documento atual
      const { data: currentDoc } = await supabase
        .from('inscricao_documentos')
        .select('*')
        .eq('id', documentId)
        .single();

      if (!currentDoc) return;

      // Buscar todas as versões (documento atual + versões antigas)
      const { data } = await supabase
        .from('inscricao_documentos')
        .select('*')
        .or(`id.eq.${documentId},parent_document_id.eq.${documentId}`)
        .order('versao', { ascending: false });

      if (data) setVersions(data as DocumentVersion[]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string, nome: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando histórico...</div>;
  }

  if (versions.length === 0) {
    return <div className="text-sm text-muted-foreground">Nenhum histórico disponível</div>;
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm">Histórico de Versões</h4>
      <div className="space-y-2">
        {versions.map((version) => (
          <div key={version.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={version.is_current ? "default" : "secondary"}>
                    Versão {version.versao}
                  </Badge>
                  {version.is_current && (
                    <Badge variant="outline" className="text-xs">Atual</Badge>
                  )}
                </div>
                <p className="text-sm font-medium">{version.arquivo_nome}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    Enviado {formatDistanceToNow(new Date(version.created_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                </div>
                {version.replaced_at && (
                  <p className="text-xs text-muted-foreground">
                    Substituído {formatDistanceToNow(new Date(version.replaced_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </p>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDownload(version.arquivo_url, version.arquivo_nome)}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
