import { useState, useEffect } from "react";
import { Search, Eye, Filter, Clock, CheckCircle, RefreshCw, FileSearch, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useFixLegacyInscricoes } from "@/hooks/useFixLegacyInscricoes";
import { normalizeDadosInscricao, extrairNomeCompleto, extrairEspecialidadesIds } from "@/utils/normalizeDadosInscricao";
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
import { WorkflowApprovalPanel } from "@/components/workflow/WorkflowApprovalPanel";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type StatusType = "em_analise" | "aguardando_analise" | "aprovado" | "pendente" | "inabilitado";

interface Processo {
  id: string;
  protocolo: string;
  numeroEdital: string;
  nome: string;
  especialidade: string;
  dataSubmissao: string;
  status: StatusType;
  analista?: string;
  edital_titulo?: string;
  workflow_execution_id?: string;
  workflow_status?: string;
  workflow_current_step?: string;
  workflow_name?: string;
}

export default function Analises() {
  const navigate = useNavigate();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const { roles, loading: rolesLoading } = useUserRole();
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroEspecialidade, setFiltroEspecialidade] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [processoSelecionado, setProcessoSelecionado] = useState<Processo | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const { fixInscricoes, isLoading: fixingInscricoes } = useFixLegacyInscricoes();

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

      // Construir query baseada no role - incluindo dados de workflow
      // ✅ Query simplificada sem profiles (buscar nome do JSONB)
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
          workflow_execution_id,
          protocolo,
          editais (
            titulo,
            numero_edital,
            especialidade,
            workflow_id
          ),
          workflow_executions (
            id,
            status,
            current_node_id,
            started_at,
            completed_at,
            workflows (
              name,
              version
            )
          )
        `)
        .eq('is_rascunho', false)
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

      console.log('[ANALISES] Total de inscrições carregadas:', data?.length);
      console.log('[ANALISES] Amostra de dados_inscricao:', data?.[0]?.dados_inscricao);

      // ✅ Transformar dados com normalização e resolução de especialidades
      const processosFormatados: Processo[] = await Promise.all(
        (data || []).map(async (inscricao: any) => {
          const nome = extrairNomeCompleto(inscricao.dados_inscricao);
          const especialidadesIds = extrairEspecialidadesIds(inscricao.dados_inscricao);
          
          // Resolver especialidades
          let especialidadesNomes: string[] = [];
          if (especialidadesIds.length > 0) {
            const { data: especialidades } = await supabase
              .from('especialidades_medicas')
              .select('nome')
              .in('id', especialidadesIds);
            
            especialidadesNomes = especialidades?.map(e => e.nome) || [];
          }
          
          return {
            id: inscricao.id,
            protocolo: inscricao.protocolo || `IPE-TEMP-${inscricao.id.substring(0, 8)}`,
            numeroEdital: inscricao.editais?.numero_edital || 'N/A',
            nome,
            especialidade: especialidadesNomes.join(', ') || inscricao.editais?.especialidade || "Não informada",
            dataSubmissao: inscricao.created_at,
            status: inscricao.status as StatusType,
            analista: inscricao.analisado_por ? "Analista atribuído" : undefined,
            edital_titulo: inscricao.editais?.titulo,
            workflow_execution_id: inscricao.workflow_execution_id,
            workflow_status: inscricao.workflow_executions?.status,
            workflow_current_step: inscricao.workflow_executions?.current_node_id,
            workflow_name: inscricao.workflow_executions?.workflows?.name,
          };
        })
      );

      console.log('[ANALISES] Processos formatados:', processosFormatados.length);
      console.log('[ANALISES] Nomes extraídos:', processosFormatados.map(p => p.nome));

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
      processo.protocolo.toLowerCase().includes(busca.toLowerCase()) ||
      processo.numeroEdital.toLowerCase().includes(busca.toLowerCase());
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
      
      toast.success("Status atualizado com sucesso!");
      loadInscricoes(); // Recarregar para pegar dados atualizados do workflow
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    // Debug: Verificar permissões antes de tentar excluir
    console.log('[DELETE_DEBUG] IDs selecionados:', selectedIds);
    console.log('[DELETE_DEBUG] User roles:', roles);
    
    // Verificar se o usuário tem permissão (admin ou gestor)
    const hasPermission = roles.includes('admin') || roles.includes('gestor');
    
    if (!hasPermission) {
      console.error('[DELETE_DEBUG] Usuário sem permissão para excluir. Roles:', roles);
      toast.error('Você não tem permissão para excluir inscrições. Apenas gestores e administradores podem fazer isso.');
      return;
    }
    
    if (!confirm(`Deseja excluir ${selectedIds.length} inscrição(ões) selecionada(s)?`)) return;
    
    try {
      setIsDeleting(true);
      
      console.log('[DELETE_DEBUG] Tentando excluir inscrições...');
      const { data, error } = await supabase
        .from('inscricoes_edital')
        .delete()
        .in('id', selectedIds)
        .select();
      
      if (error) {
        console.error('[DELETE_DEBUG] Erro do Supabase:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Mensagens de erro mais específicas
        if (error.code === '42501') {
          throw new Error('Permissão negada. Verifique suas roles no sistema.');
        } else if (error.message.includes('violates foreign key constraint')) {
          throw new Error('Não é possível excluir inscrições que possuem dados relacionados.');
        } else {
          throw error;
        }
      }
      
      console.log('[DELETE_DEBUG] Exclusão bem-sucedida:', data);
      toast.success(`${selectedIds.length} inscrição(ões) excluída(s) com sucesso!`);
      setSelectedIds([]);
      loadInscricoes();
    } catch (error: any) {
      console.error('[DELETE_DEBUG] Erro ao excluir inscrições:', error);
      toast.error(error.message || 'Erro ao excluir inscrições selecionadas');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === processosFiltrados.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(processosFiltrados.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Análises</h1>
            <p className="text-muted-foreground mt-2">
              Gestão e análise de processos de credenciamento
            </p>
          </div>
          {(roles.includes('gestor') || roles.includes('admin')) && (
            <Button
              onClick={async () => {
                await fixInscricoes();
                setTimeout(() => loadInscricoes(), 2000);
              }}
              disabled={fixingInscricoes}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${fixingInscricoes ? 'animate-spin' : ''}`} />
              Processar Inscrições Antigas
            </Button>
          )}
        </div>

        {/* Seção de Aprovações Pendentes */}
        {(roles.includes('analista') || roles.includes('gestor') || roles.includes('admin')) && (
          <WorkflowApprovalPanel />
        )}

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
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">Processos em Análise</CardTitle>
              {selectedIds.length > 0 && (roles.includes('gestor') || roles.includes('admin')) && (
                <Button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir {selectedIds.length} selecionado(s)
                </Button>
              )}
            </div>
            <div className="flex flex-col lg:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, protocolo ou edital..."
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
                <SelectItem value="aguardando_analise">Aguardando Análise</SelectItem>
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
                    {(roles.includes('gestor') || roles.includes('admin')) && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.length === processosFiltrados.length && processosFiltrados.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Edital</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>Data Submissão</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Mensagens</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
              {processosFiltrados.map((processo) => {
                const UnreadBadge = () => {
                  const { unreadCount, loading } = useUnreadMessages(processo.id);
                  
                  if (loading) {
                    return <Skeleton className="h-6 w-16" />;
                  }
                  
                  if (unreadCount === 0) {
                    return (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        Nenhuma
                      </span>
                    );
                  }
                  
                  return (
                    <Badge 
                      variant="destructive" 
                      className="animate-pulse flex items-center gap-1"
                    >
                      <MessageCircle className="h-3 w-3" />
                      {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                    </Badge>
                  );
                };
                
                return (
                    <TableRow
                      key={processo.id}
                      className="hover:bg-card/50 cursor-pointer"
                      onClick={() => setProcessoSelecionado(processo)}
                    >
                      {(roles.includes('gestor') || roles.includes('admin')) && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(processo.id)}
                            onCheckedChange={() => toggleSelect(processo.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm">{processo.protocolo}</TableCell>
                      <TableCell className="text-sm">{processo.numeroEdital}</TableCell>
                      <TableCell className="font-medium">{processo.nome}</TableCell>
                      <TableCell>{processo.especialidade}</TableCell>
                      <TableCell>
                        {new Date(processo.dataSubmissao).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        {processo.workflow_execution_id ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium">{processo.workflow_name || "Workflow"}</span>
                            <Badge 
                              variant="outline" 
                              className={
                                processo.workflow_status === 'running' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                processo.workflow_status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                processo.workflow_status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-orange-500/10 text-orange-400 border-orange-500/20'
                              }
                            >
                              {processo.workflow_status === 'running' ? 'Em Execução' :
                               processo.workflow_status === 'completed' ? 'Concluído' :
                               processo.workflow_status === 'failed' ? 'Falhou' :
                               'Pendente'}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem workflow</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <UnreadBadge />
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
                            <span className="ml-1 hidden lg:inline">Ver Detalhes</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/analista/inscricoes/${processo.id}`);
                            }}
                          >
                            <FileSearch className="h-4 w-4" />
                            <span className="ml-1 hidden lg:inline">Análise Completa</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
