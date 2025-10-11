import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoricoVersoesDocumentoProps {
  documentoId: string;
}

export function HistoricoVersoesDocumento({ documentoId }: HistoricoVersoesDocumentoProps) {
  const { data: versoes, isLoading } = useQuery({
    queryKey: ['documento-versoes', documentoId],
    queryFn: async () => {
      // Buscar documento atual
      const { data: docAtual, error: docError } = await supabase
        .from('inscricao_documentos')
        .select('*')
        .eq('id', documentoId)
        .single();

      if (docError) throw docError;

      // Se não tem parent, buscar versões que tem este como parent
      if (!docAtual.parent_document_id) {
        const { data: versoesFilhas, error: filhasError } = await supabase
          .from('inscricao_documentos')
          .select('*')
          .eq('parent_document_id', documentoId)
          .order('versao', { ascending: false });

        if (filhasError) throw filhasError;
        return [docAtual, ...(versoesFilhas || [])];
      }

      // Buscar todas as versões da mesma família
      const { data: versoesAnteriores, error: versError } = await supabase
        .from('inscricao_documentos')
        .select('*')
        .or(`id.eq.${docAtual.parent_document_id},parent_document_id.eq.${docAtual.parent_document_id}`)
        .order('versao', { ascending: false });

      if (versError) throw versError;

      // Combinar e ordenar todas as versões
      const todasVersoes = [docAtual, ...(versoesAnteriores || [])];
      const versoesUnicas = Array.from(
        new Map(todasVersoes.map(v => [v.id, v])).values()
      );
      
      return versoesUnicas.sort((a, b) => b.versao - a.versao);
    },
    enabled: !!documentoId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="animate-spin h-5 w-5" />
      </div>
    );
  }

  if (!versoes || versoes.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma versão encontrada</p>;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Histórico de Versões</h4>
      <div className="space-y-2">
        {versoes.map((versao) => (
          <div key={versao.id} className="flex items-center gap-3 p-3 border rounded-lg">
            <Badge variant={versao.is_current ? 'default' : 'outline'}>
              Versão {versao.versao}
            </Badge>
            <div className="flex-1">
              <p className="text-sm font-medium">{versao.arquivo_nome}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(versao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <Badge 
              variant={
                versao.status === 'validado' ? 'default' :
                versao.status === 'rejeitado' ? 'destructive' : 
                'secondary'
              }
            >
              {versao.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
