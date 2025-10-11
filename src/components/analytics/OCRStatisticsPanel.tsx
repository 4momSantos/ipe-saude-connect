import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, AlertCircle, Loader2, TrendingUp } from 'lucide-react';

export function OCRStatisticsPanel() {
  // Desabilitado temporariamente até criar RPC
  // const { data: stats, isLoading } = useQuery({
  //   queryKey: ['ocr-statistics'],
  //   queryFn: async () => {
  //     const { data, error } = await supabase.rpc('get_ocr_statistics');
  //     if (error) throw error;
  //     return data;
  //   },
  //   refetchInterval: 30000
  // });

  // Query manual para estatísticas
  const { data: manualStats, isLoading } = useQuery({
    queryKey: ['ocr-manual-statistics'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: documentos } = await supabase
        .from('inscricao_documentos')
        .select('ocr_processado, ocr_confidence, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (!documentos) return null;

      const total = documentos.length;
      const processados = documentos.filter(d => d.ocr_processado).length;
      const naoProcessados = total - processados;
      const altaConfianca = documentos.filter(d => d.ocr_processado && d.ocr_confidence >= 0.7).length;
      const baixaConfianca = documentos.filter(d => d.ocr_processado && d.ocr_confidence < 0.7 && d.ocr_confidence > 0).length;
      
      const confidences = documentos
        .filter(d => d.ocr_processado && d.ocr_confidence)
        .map(d => d.ocr_confidence);
      
      const confiancaMedia = confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

      return {
        total,
        processados,
        nao_processados: naoProcessados,
        alta_confianca: altaConfianca,
        baixa_confianca: baixaConfianca,
        confianca_media: confiancaMedia,
        taxa_sucesso: total > 0 ? (processados / total) * 100 : 0
      };
    }
  });

  const statsData = manualStats;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!statsData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Estatísticas de OCR
        </CardTitle>
        <CardDescription>
          Análise dos últimos 30 dias
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Taxa de Sucesso */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Taxa de Sucesso</span>
            <Badge variant={statsData.taxa_sucesso >= 80 ? 'default' : 'destructive'}>
              {statsData.taxa_sucesso.toFixed(1)}%
            </Badge>
          </div>
          <Progress value={statsData.taxa_sucesso} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {statsData.processados} de {statsData.total} documentos processados
          </p>
        </div>

        {/* Confiança Média */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Confiança Média</span>
            <Badge variant={statsData.confianca_media >= 0.7 ? 'default' : 'secondary'}>
              {(statsData.confianca_media * 100).toFixed(1)}%
            </Badge>
          </div>
          <Progress value={statsData.confianca_media * 100} className="h-2" />
        </div>

        {/* Distribuição */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {statsData.alta_confianca}
              </p>
              <p className="text-xs text-muted-foreground">Alta Confiança</p>
            </CardContent>
          </Card>

          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {statsData.baixa_confianca}
              </p>
              <p className="text-xs text-muted-foreground">Baixa Confiança</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4 text-center">
              <Loader2 className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {statsData.nao_processados}
              </p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
