import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FileText, History, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { normalizeDadosInscricao } from '@/utils/normalizeDadosInscricao';
import { StatusBadge } from '@/components/StatusBadge';
import { ComparacaoDadosOCR } from '@/components/analises/ComparacaoDadosOCR';
import { DocumentoValidacaoCard } from '@/components/analises/DocumentoValidacaoCard';
import { useAnalisarInscricao } from '@/hooks/useAnalisarInscricao';

export default function AnalistaInscricaoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { aprovar, rejeitar, isLoading: isAprovacaoLoading } = useAnalisarInscricao();

  const { data: inscricao, isLoading } = useQuery({
    queryKey: ['analista-inscricao-detalhes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inscricoes_edital')
        .select(`
          id,
          status,
          validacao_status,
          created_at,
          candidato_id,
          dados_inscricao,
          editais (
            id,
            titulo,
            numero_edital
          ),
          inscricao_documentos (
            id,
            tipo_documento,
            arquivo_url,
            arquivo_nome,
            ocr_resultado,
            ocr_confidence,
            status,
            versao,
            created_at
          ),
          inscricao_validacoes (
            id,
            documento_id,
            status,
            comentario_analista,
            ocr_validado,
            discrepancias,
            created_at,
            analista_id
          ),
          inscricao_eventos (
            id,
            tipo_evento,
            descricao,
            dados,
            timestamp,
            usuario_id
          )
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!inscricao) {
    return <InscricaoNaoEncontrada />;
  }

  const dados = normalizeDadosInscricao(inscricao.dados_inscricao);

  const handleAprovar = async () => {
    try {
      await aprovar({ inscricaoId: inscricao.id });
      queryClient.invalidateQueries({ queryKey: ['analista-inscricao-detalhes', id] });
      navigate('/analises');
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleRejeitar = async () => {
    try {
      const motivo = prompt("Motivo da rejeição:");
      if (!motivo) return;
      
      await rejeitar({ inscricaoId: inscricao.id, motivo });
      queryClient.invalidateQueries({ queryKey: ['analista-inscricao-detalhes', id] });
      navigate('/analises');
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Fixo */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/analises')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  {dados?.dados_pessoais?.nome_completo || 
                   dados?.pessoa_juridica?.denominacao_social || 
                   'Sem nome'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {inscricao.editais?.numero_edital} • {inscricao.editais?.titulo}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={inscricao.status as any} />
              <Badge variant="outline">
                Validação: {inscricao.validacao_status}
              </Badge>
              
              {/* Botões de Aprovação/Rejeição */}
              {(inscricao.status === 'aguardando_analise' || inscricao.status === 'em_analise') && (
                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={handleAprovar}
                    disabled={isAprovacaoLoading}
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    size="sm"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprovar
                  </Button>
                  <Button
                    onClick={handleRejeitar}
                    disabled={isAprovacaoLoading}
                    className="bg-red-600 hover:bg-red-700 text-white gap-2"
                    size="sm"
                  >
                    <XCircle className="h-4 w-4" />
                    Rejeitar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-6 py-6">
        <Tabs defaultValue="dados" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dados">
              <FileText className="w-4 h-4 mr-2" />
              Dados do Candidato
            </TabsTrigger>
            <TabsTrigger value="documentos">
              <FileText className="w-4 h-4 mr-2" />
              Documentos ({inscricao.inscricao_documentos?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="historico">
              <History className="w-4 h-4 mr-2" />
              Histórico ({inscricao.inscricao_eventos?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-6">
            {/* Comparação OCR vs Dados Preenchidos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Validação OCR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ComparacaoDadosOCR 
                  dadosInscricao={dados}
                  documentos={inscricao.inscricao_documentos || []}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos">
            <div className="space-y-4">
              {inscricao.inscricao_documentos?.map((doc: any) => (
                <DocumentoValidacaoCard
                  key={doc.id}
                  documento={doc}
                  inscricaoId={inscricao.id}
                  validacoes={inscricao.inscricao_validacoes || []}
                  onValidar={() => queryClient.invalidateQueries({ queryKey: ['analista-inscricao-detalhes', id] })}
                />
              ))}
              {!inscricao.inscricao_documentos?.length && (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Nenhum documento enviado
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="historico">
            <div className="space-y-3">
              {inscricao.inscricao_eventos?.map((evento: any) => (
                <Card key={evento.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{evento.tipo_evento}</p>
                        <p className="text-sm text-muted-foreground">{evento.descricao}</p>
                        {evento.dados && (
                          <pre className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(evento.dados, null, 2)}
                          </pre>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {new Date(evento.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!inscricao.inscricao_eventos?.length && (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Nenhum evento registrado
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function InscricaoNaoEncontrada() {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Inscrição não encontrada</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            A inscrição solicitada não existe ou você não tem permissão para acessá-la.
          </p>
          <Button onClick={() => navigate('/analises')}>
            Voltar para Análises
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
