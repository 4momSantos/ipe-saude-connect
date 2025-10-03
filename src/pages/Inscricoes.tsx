import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

type Inscricao = {
  id: string;
  edital_id: string;
  status: string;
  created_at: string;
  dados_inscricao: any;
  editais: {
    titulo: string;
    especialidade: string | null;
  };
};

export default function Inscricoes() {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadInscricoes();
  }, []);

  const loadInscricoes = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('inscricoes_edital')
        .select(`
          *,
          editais (
            titulo,
            especialidade
          )
        `)
        .eq('candidato_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInscricoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'em_analise':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Em Análise
          </Badge>
        );
      case 'aprovado':
      case 'aguardando_assinatura':
      case 'assinado':
      case 'ativo':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'rejeitado':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Carregando inscrições...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Minhas Inscrições</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe o status das suas inscrições em editais de credenciamento
          </p>
        </div>
      </div>

      {inscricoes.length === 0 ? (
        <Card className="border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Nenhuma inscrição realizada</p>
              <p className="text-muted-foreground">
                Acesse a página de Editais para se inscrever em processos de credenciamento
              </p>
            </div>
            <Button onClick={() => navigate('/editais')} className="mt-4">
              Ver Editais Disponíveis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {inscricoes.map((inscricao) => (
            <Card key={inscricao.id} className="border bg-card hover-lift transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {inscricao.editais?.titulo || 'Edital'}
                    </CardTitle>
                    <CardDescription>
                      Inscrição realizada em {new Date(inscricao.created_at).toLocaleDateString('pt-BR')}
                    </CardDescription>
                    {inscricao.editais?.especialidade && (
                      <Badge variant="secondary" className="mt-2">
                        {inscricao.editais.especialidade}
                      </Badge>
                    )}
                  </div>
                  {getStatusBadge(inscricao.status)}
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/editais')}
                  variant="outline"
                >
                  Acompanhar Processo
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
