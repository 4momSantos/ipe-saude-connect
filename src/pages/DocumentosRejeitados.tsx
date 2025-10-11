import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { DocumentoRejeitadoCard } from '@/components/inscricao/DocumentoRejeitadoCard';
import { toast } from 'sonner';

export default function DocumentosRejeitados() {
  const { inscricaoId } = useParams<{ inscricaoId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['inscricao-documentos-rejeitados', inscricaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inscricao_documentos')
        .select('*')
        .eq('inscricao_id', inscricaoId)
        .eq('is_current', true)
        .eq('status', 'rejeitado')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!inscricaoId
  });

  const handleReenviar = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['inscricao-documentos-rejeitados', inscricaoId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['inscricao-documentos', inscricaoId] 
    });
    toast.success('Documento reenviado! Será analisado em breve.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!documentos || documentos.length === 0) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">
              Todos os documentos estão em dia!
            </h2>
            <p className="text-muted-foreground mb-4">
              Não há documentos rejeitados para esta inscrição.
            </p>
            <Button onClick={() => navigate('/minhas-inscricoes')}>
              Voltar para Minhas Inscrições
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/minhas-inscricoes')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Documentos Rejeitados</h1>
        <p className="text-muted-foreground">
          {documentos.length} documento(s) precisa(m) ser reenviado(s)
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Revise o motivo da rejeição e faça upload de novos documentos corrigidos.
          Os documentos serão analisados novamente em breve.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {documentos.map(doc => (
          <DocumentoRejeitadoCard
            key={doc.id}
            documento={doc}
            inscricaoId={inscricaoId!}
            onReenviar={handleReenviar}
          />
        ))}
      </div>
    </div>
  );
}
