import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSimularAssinatura } from "@/hooks/useSimularAssinatura";
import { useGerarContrato } from "@/hooks/useGerarContrato";

interface FluxoInscricao {
  inscricao_id: string;
  protocolo: string;
  candidato_nome: string;
  candidato_email: string;
  inscricao_status: string;
  inscricao_created_at: string;
  analise_id?: string;
  analise_status?: string;
  analise_created_at?: string;
  contrato_id?: string;
  contrato_numero?: string;
  contrato_status?: string;
  contrato_created_at?: string;
  credenciado_id?: string;
  credenciado_nome?: string;
  credenciado_status?: string;
  credenciado_created_at?: string;
}

export default function DebugFluxoCredenciamento() {
  const { mutate: simularAssinatura, isPending: isSimulando } = useSimularAssinatura();
  const { gerar: gerarContrato, isLoading: isGerando } = useGerarContrato();

  const { data: fluxos, isLoading, refetch } = useQuery({
    queryKey: ['debug-fluxo-credenciamento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inscricoes_edital')
        .select(`
          id,
          protocolo,
          status,
          created_at,
          candidato_id,
          profiles!inner(nome, email),
          analises(id, status, created_at),
          contratos(id, numero_contrato, status, created_at),
          credenciados(id, nome, status, created_at)
        `)
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return data.map((item: any) => ({
        inscricao_id: item.id,
        protocolo: item.protocolo,
        candidato_nome: item.profiles.nome,
        candidato_email: item.profiles.email,
        inscricao_status: item.status,
        inscricao_created_at: item.created_at,
        analise_id: item.analises?.[0]?.id,
        analise_status: item.analises?.[0]?.status,
        analise_created_at: item.analises?.[0]?.created_at,
        contrato_id: item.contratos?.[0]?.id,
        contrato_numero: item.contratos?.[0]?.numero_contrato,
        contrato_status: item.contratos?.[0]?.status,
        contrato_created_at: item.contratos?.[0]?.created_at,
        credenciado_id: item.credenciados?.[0]?.id,
        credenciado_nome: item.credenciados?.[0]?.nome,
        credenciado_status: item.credenciados?.[0]?.status,
        credenciado_created_at: item.credenciados?.[0]?.created_at,
      })) as FluxoInscricao[];
    },
    refetchInterval: 5000, // Auto-refresh a cada 5s
  });

  const getEtapaStatus = (concluida: boolean, data?: string) => {
    if (concluida && data) {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-xs text-muted-foreground">
            {format(new Date(data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </span>
        </div>
      );
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const identificarTravamento = (fluxo: FluxoInscricao): string | null => {
    if (!fluxo.analise_id) return 'analise';
    if (!fluxo.contrato_id) return 'contrato';
    if (fluxo.contrato_status !== 'assinado') return 'assinatura';
    if (!fluxo.credenciado_id) return 'credenciado';
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debug: Fluxo de Credenciamento</h1>
          <p className="text-muted-foreground">
            Monitore e corrija problemas no fluxo de credenciamento
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Aprovados</div>
          <div className="text-2xl font-bold">{fluxos?.length || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Sem Contrato</div>
          <div className="text-2xl font-bold text-orange-600">
            {fluxos?.filter(f => !f.contrato_id).length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Pendente Assinatura</div>
          <div className="text-2xl font-bold text-yellow-600">
            {fluxos?.filter(f => f.contrato_status === 'pendente_assinatura').length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Credenciados</div>
          <div className="text-2xl font-bold text-green-600">
            {fluxos?.filter(f => f.credenciado_id).length || 0}
          </div>
        </Card>
      </div>

      {/* Lista de Fluxos */}
      <div className="space-y-4">
        {fluxos?.map((fluxo) => {
          const travamento = identificarTravamento(fluxo);
          
          return (
            <Card key={fluxo.inscricao_id} className={travamento ? "border-orange-500" : ""}>
              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{fluxo.candidato_nome}</h3>
                      {travamento && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Travado em: {travamento}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {fluxo.protocolo} • {fluxo.candidato_email}
                    </p>
                  </div>
                </div>

                {/* Etapas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Inscrição */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm">1. Inscrição</div>
                      <Badge variant="default" className="bg-green-600 text-white">Aprovada</Badge>
                    </div>
                    {getEtapaStatus(true, fluxo.inscricao_created_at)}
                  </div>

                  {/* Análise */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm">2. Análise</div>
                      {fluxo.analise_status && (
                        <Badge variant={fluxo.analise_status === 'aprovado' ? 'default' : 'secondary'} 
                               className={fluxo.analise_status === 'aprovado' ? 'bg-green-600 text-white' : ''}>
                          {fluxo.analise_status}
                        </Badge>
                      )}
                    </div>
                    {getEtapaStatus(!!fluxo.analise_id, fluxo.analise_created_at)}
                  </div>

                  {/* Contrato */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm">3. Contrato</div>
                      {fluxo.contrato_status && (
                        <Badge variant={
                          fluxo.contrato_status === 'assinado' ? 'default' : 
                          fluxo.contrato_status === 'pendente_assinatura' ? 'secondary' : 
                          'outline'
                        } className={
                          fluxo.contrato_status === 'assinado' ? 'bg-green-600 text-white' :
                          fluxo.contrato_status === 'pendente_assinatura' ? 'bg-yellow-600 text-white' : 
                          ''
                        }>
                          {fluxo.contrato_status}
                        </Badge>
                      )}
                    </div>
                    {getEtapaStatus(!!fluxo.contrato_id, fluxo.contrato_created_at)}
                    {fluxo.contrato_numero && (
                      <p className="text-xs text-muted-foreground">{fluxo.contrato_numero}</p>
                    )}
                  </div>

                  {/* Credenciado */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm">4. Credenciado</div>
                      {fluxo.credenciado_status && (
                        <Badge variant="default" className={fluxo.credenciado_status === 'Ativo' ? 'bg-green-600 text-white' : ''}>
                          {fluxo.credenciado_status}
                        </Badge>
                      )}
                    </div>
                    {getEtapaStatus(!!fluxo.credenciado_id, fluxo.credenciado_created_at)}
                  </div>
                </div>

                {/* Ações */}
                {travamento && (
                  <div className="flex gap-2 pt-4 border-t">
                    {travamento === 'contrato' && (
                      <Button
                        size="sm"
                        onClick={() => gerarContrato({ inscricaoId: fluxo.inscricao_id })}
                        disabled={isGerando}
                      >
                        {isGerando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Gerar Contrato
                      </Button>
                    )}
                    
                    {travamento === 'assinatura' && fluxo.contrato_id && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => simularAssinatura({ contratoId: fluxo.contrato_id! })}
                        disabled={isSimulando}
                      >
                        {isSimulando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Simular Assinatura (DEBUG)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {fluxos?.length === 0 && (
        <Card className="p-12 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma inscrição aprovada encontrada</p>
        </Card>
      )}
    </div>
  );
}
