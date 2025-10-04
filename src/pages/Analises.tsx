import { useState, useEffect } from "react";
import { Search, Eye, CheckCircle, XCircle, Clock, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { ProcessDetailPanel } from "@/components/ProcessDetailPanel";
import { toast } from "sonner";

type StatusType = "em_analise" | "aprovado" | "pendente" | "inabilitado";

interface Processo {
  id: string;
  protocolo: string;
  nome: string;
  especialidade: string;
  dataSubmissao: string;
  status: StatusType;
  analista?: string;
  edital_titulo?: string;
}

export default function Analises() {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const { roles, loading: rolesLoading } = useUserRole();
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroEspecialidade, setFiltroEspecialidade] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [processoSelecionado, setProcessoSelecionado] = useState<Processo | null>(null);

  useEffect(() => {
    loadInscricoes();
  }, [roles]);

  const loadInscricoes = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Construir query baseada no role
      let query = supabase
        .from('inscricoes_edital')
        .select(`
          id,
          status,
          created_at,
          candidato_id,
          edital_id,
          dados_inscricao,
          analisado_por,
          editais (
            titulo,
            numero_edital,
            especialidade
          ),
          profiles!inscricoes_edital_candidato_id_fkey (
            nome,
            email
          )
        `)
        .order('created_at', { ascending: false });

      // Se for candidato, filtrar apenas suas inscrições
      const isCandidato = roles.includes('candidato') && 
                          !roles.includes('analista') && 
                          !roles.includes('gestor') && 
                          !roles.includes('admin');
      
      if (isCandidato) {
        query = query.eq('candidato_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transformar dados para o formato esperado
      const processosFormatados: Processo[] = (data || []).map((inscricao: any) => ({
        id: inscricao.id,
        protocolo: inscricao.editais?.numero_edital || `INS-${inscricao.id.substring(0, 8)}`,
        nome: inscricao.profiles?.nome || inscricao.profiles?.email || "Sem nome",
        especialidade: inscricao.editais?.especialidade || "Não informada",
        dataSubmissao: inscricao.created_at,
        status: inscricao.status as StatusType,
        analista: inscricao.analisado_por ? "Analista atribuído" : undefined,
        edital_titulo: inscricao.editais?.titulo,
      }));

      setProcessos(processosFormatados);
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error);
      toast.error("Erro ao carregar inscrições");
    } finally {
      setLoading(false);
    }
  };

  const especialidades = Array.from(new Set(processos.map((p) => p.especialidade)));

  const processosFiltrados = processos.filter((processo) => {
    const matchStatus = filtroStatus === "todos" || processo.status === filtroStatus;
    const matchEspecialidade =
      filtroEspecialidade === "todas" || processo.especialidade === filtroEspecialidade;
    const matchBusca =
      busca === "" ||
      processo.nome.toLowerCase().includes(busca.toLowerCase()) ||
      processo.protocolo.includes(busca);
    return matchStatus && matchEspecialidade && matchBusca;
  });

  const handleStatusChange = async (id: string, newStatus: StatusType) => {
    try {
      const { error } = await supabase
        .from('inscricoes_edital')
        .update({ 
          status: newStatus,
          analisado_em: new Date().toISOString(),
          analisado_por: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id);

      if (error) throw error;

      setProcessos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      );
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleAprovar = (id: string) => {
    handleStatusChange(id, "aprovado");
    toast.success("Processo aprovado com sucesso!");
  };

  const handleRejeitar = (id: string) => {
    handleStatusChange(id, "inabilitado");
    toast.error("Processo inabilitado");
  };

  const statusCounts = {
    em_analise: processos.filter((p) => p.status === "em_analise").length,
    pendente: processos.filter((p) => p.status === "pendente").length,
    aprovado: processos.filter((p) => p.status === "aprovado").length,
  };

  if (loading || rolesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Carregando inscrições...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Análises</h1>
          <p className="text-muted-foreground mt-2">
            Gestão e análise de processos de credenciamento
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Em Análise</p>
                  <p className="text-2xl font-bold text-foreground">{statusCounts.em_analise}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-foreground">{statusCounts.pendente}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Aprovados</p>
                  <p className="text-2xl font-bold text-foreground">{statusCounts.aprovado}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border bg-card card-glow">
          <CardHeader>
            <CardTitle className="text-foreground">Processos em Análise</CardTitle>
            <div className="flex flex-col lg:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou protocolo..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filtroEspecialidade} onValueChange={setFiltroEspecialidade}>
                  <SelectTrigger className="w-full lg:w-[200px] bg-background">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Especialidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {especialidades.map((esp) => (
                      <SelectItem key={esp} value={esp}>
                        {esp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-full lg:w-[180px] bg-background">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="inabilitado">Inabilitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>Data Submissão</TableHead>
                    <TableHead>Analista</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processosFiltrados.map((processo) => (
                    <TableRow
                      key={processo.id}
                      className="hover:bg-card/50 cursor-pointer"
                      onClick={() => setProcessoSelecionado(processo)}
                    >
                      <TableCell className="font-mono text-sm">{processo.protocolo}</TableCell>
                      <TableCell className="font-medium">{processo.nome}</TableCell>
                      <TableCell>{processo.especialidade}</TableCell>
                      <TableCell>
                        {new Date(processo.dataSubmissao).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {processo.analista || "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={processo.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border hover:bg-card"
                            onClick={() => setProcessoSelecionado(processo)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {processo.status === "em_analise" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-500/30 hover:bg-green-500/10 text-green-400"
                                onClick={() => handleAprovar(processo.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/30 hover:bg-red-500/10 text-red-400"
                                onClick={() => handleRejeitar(processo.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {processoSelecionado && (
        <ProcessDetailPanel
          processo={processoSelecionado}
          onClose={() => setProcessoSelecionado(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}
