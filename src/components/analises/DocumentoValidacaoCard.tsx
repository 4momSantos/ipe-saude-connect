import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentoValidacaoCardProps {
  documento: any;
  inscricaoId: string;
  validacoes: any[];
  onValidar: () => void;
}

export function DocumentoValidacaoCard({ 
  documento, 
  inscricaoId, 
  validacoes,
  onValidar 
}: DocumentoValidacaoCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  const validacao = validacoes.find(v => v.documento_id === documento.id);

  const handleReprocessOCR = async () => {
    setReprocessing(true);
    try {
      const { error } = await supabase.functions.invoke('reprocess-ocr-documento', {
        body: { documento_id: documento.id }
      });

      if (error) throw error;

      toast.success('OCR reprocessado! Atualizando resultados...');
      
      // Aguardar um pouco e recarregar
      setTimeout(() => {
        onValidar();
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao reprocessar OCR:', error);
      toast.error('Erro ao reprocessar OCR: ' + error.message);
    } finally {
      setReprocessing(false);
    }
  };

  const handleValidar = async (status: 'aprovado' | 'rejeitado') => {
    if (status === 'rejeitado' && !comentario.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('validar_documento', {
        p_documento_id: documento.id,
        p_status: status,
        p_comentario: comentario || null,
        p_discrepancias: null,
      });

      if (error) throw error;

      toast.success(`Documento ${status === 'aprovado' ? 'aprovado' : 'rejeitado'}`);
      onValidar();
      setComentario('');
    } catch (error: any) {
      console.error('Erro ao validar:', error);
      toast.error('Erro ao validar documento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'default';
      case 'rejeitado':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      aprovado: 'Aprovado',
      rejeitado: 'Rejeitado',
      pendente: 'Pendente',
      enviado: 'Aguardando Validação'
    };
    return map[status] || status;
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-base">{documento.tipo_documento}</CardTitle>
              <p className="text-sm text-muted-foreground">{documento.arquivo_nome}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(validacao?.status || documento.status)}>
              {getStatusLabel(validacao?.status || documento.status)}
            </Badge>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-4">
          {/* OCR Resultado */}
          {documento.ocr_resultado && (
            <div>
              <p className="text-sm font-medium mb-2">Dados Extraídos (OCR):</p>
              <div className="bg-muted p-3 rounded-lg">
                <pre className="text-xs overflow-auto max-h-64">
                  {JSON.stringify(documento.ocr_resultado, null, 2)}
                </pre>
              </div>
              {documento.ocr_confidence && (
                <p className="text-xs text-muted-foreground mt-1">
                  Confiança: {(documento.ocr_confidence * 100).toFixed(1)}%
                </p>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                window.open(documento.arquivo_url, '_blank');
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                const link = document.createElement('a');
                link.href = documento.arquivo_url;
                link.download = documento.arquivo_nome;
                link.click();
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar
            </Button>
            {documento.ocr_processado && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReprocessOCR();
                }}
                disabled={reprocessing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${reprocessing ? 'animate-spin' : ''}`} />
                Reprocessar OCR
              </Button>
            )}
          </div>

          {/* Validação (se pendente) */}
          {!validacao && (
            <div className="border-t pt-4 space-y-3">
              <Textarea
                placeholder="Comentário (obrigatório para rejeição)"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={2}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleValidar('rejeitado');
                  }}
                  disabled={loading}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleValidar('aprovado');
                  }}
                  disabled={loading}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
              </div>
            </div>
          )}

          {/* Validação existente */}
          {validacao && (
            <div className="bg-muted p-3 rounded-lg text-sm border-t pt-4">
              <p className="font-medium mb-1">
                Validado em {new Date(validacao.created_at).toLocaleString('pt-BR')}
              </p>
              {validacao.comentario_analista && (
                <p className="text-muted-foreground mt-2">{validacao.comentario_analista}</p>
              )}
              {validacao.discrepancias && (
                <div className="mt-2">
                  <p className="font-medium text-xs mb-1">Discrepâncias:</p>
                  <pre className="text-xs bg-background p-2 rounded overflow-auto">
                    {JSON.stringify(validacao.discrepancias, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
