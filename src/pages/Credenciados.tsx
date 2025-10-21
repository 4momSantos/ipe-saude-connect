import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Eye, Download, Filter, Loader2, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
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
import { useCredenciados } from "@/hooks/useCredenciados";
import { useReprocessarCredenciado } from "@/hooks/useReprocessarCredenciado";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSolicitacoesNotifications } from "@/hooks/useSolicitacoesNotifications";
import { useSolicitacoesPendentes } from "@/hooks/useSolicitacoesPendentes";
import { SolicitacoesIndicator } from "@/components/credenciados/SolicitacoesIndicator";

export default function Credenciados() {
  const navigate = useNavigate();
  const { data: credenciados, isLoading, error } = useCredenciados();
  const { data: solicitacoesPendentes } = useSolicitacoesPendentes();
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroEspecialidade, setFiltroEspecialidade] = useState<string>("todas");
  const [filtroMunicipio, setFiltroMunicipio] = useState<string>("todos");
  const [filtroAreaAtuacao, setFiltroAreaAtuacao] = useState<string>("todas");
  const [filtroServico, setFiltroServico] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [credenciadosSelecionados, setCredenciadosSelecionados] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { reprocessar, isLoading: isReprocessing } = useReprocessarCredenciado();
  
  // Ativar notificações de solicitações
  useSolicitacoesNotifications();

  const especialidades = useMemo(() => {
    if (!credenciados) return [];
    const especialidadesSet = new Set<string>();
    credenciados.forEach((c) => {
      c.crms.forEach((crm) => especialidadesSet.add(crm.especialidade));
    });
    return Array.from(especialidadesSet);
  }, [credenciados]);

  const municipios = useMemo(() => {
    if (!credenciados) return [];
    return Array.from(new Set(credenciados.map((c) => c.cidade).filter(Boolean)));
  }, [credenciados]);

  const areasAtuacao = useMemo(() => {
    if (!credenciados) return [];
    const categoriasSet = new Set<string>();
    credenciados.forEach((c) => {
      c.servicos?.forEach((s) => {
        if (s.categoria) categoriasSet.add(s.categoria);
      });
    });
    return Array.from(categoriasSet).sort();
  }, [credenciados]);

  const servicosDisponiveis = useMemo(() => {
    if (!credenciados) return [];
    const servicosSet = new Set<string>();
    credenciados.forEach((c) => {
      c.servicos?.forEach((s) => {
        if (s.procedimento_nome) servicosSet.add(s.procedimento_nome);
      });
    });
    return Array.from(servicosSet).sort();
  }, [credenciados]);

  const credenciadosFiltrados = useMemo(() => {
    if (!credenciados) return [];
    return credenciados.filter((credenciado) => {
      // Mapear status do banco para valores do filtro
      const statusNormalizado = credenciado.status.toLowerCase() === "ativo" ? "habilitado" : "inabilitado";
      
      const matchStatus =
        filtroStatus === "todos" || 
        statusNormalizado === filtroStatus.toLowerCase();
      
      const matchEspecialidade =
        filtroEspecialidade === "todas" ||
        credenciado.crms.some((crm) => crm.especialidade === filtroEspecialidade);
      
      const matchMunicipio =
        filtroMunicipio === "todos" ||
        credenciado.cidade === filtroMunicipio;
      
      const matchAreaAtuacao =
        filtroAreaAtuacao === "todas" ||
        credenciado.servicos?.some((s) => s.categoria === filtroAreaAtuacao);
      
      const matchServico =
        filtroServico === "todos" ||
        credenciado.servicos?.some((s) => s.procedimento_nome === filtroServico);
      
      const cpfCnpj = credenciado.cnpj || credenciado.cpf || "";
      const primeirosCrms = credenciado.crms.map((c) => c.crm).join(" ");
      
      const matchBusca =
        busca === "" ||
        credenciado.nome.toLowerCase().includes(busca.toLowerCase()) ||
        cpfCnpj.includes(busca) ||
        primeirosCrms.toLowerCase().includes(busca.toLowerCase());
      
      return matchStatus && matchEspecialidade && matchMunicipio && matchAreaAtuacao && matchServico && matchBusca;
    });
  }, [credenciados, filtroStatus, filtroEspecialidade, filtroMunicipio, filtroAreaAtuacao, filtroServico, busca]);

  const totalAtivos = useMemo(() => {
    if (!credenciados) return 0;
    return credenciados.filter((c) => c.status.toLowerCase() === "ativo").length;
  }, [credenciados]);

  const totalInativos = useMemo(() => {
    if (!credenciados) return 0;
    return credenciados.filter((c) => c.status.toLowerCase() === "inativo").length;
  }, [credenciados]);

  // Calcular credenciados com dados incompletos
  const credenciadosIncompletos = useMemo(() => {
    if (!credenciados) return 0;
    return credenciados.filter((c) => {
      const semNumero = !c.numero_credenciado;
      const semCpfCnpj = !c.cpf && !c.cnpj;
      const semCrm = !c.crms || c.crms.length === 0;
      const semCidade = !c.cidade;
      return semNumero || semCpfCnpj || semCrm || semCidade;
    }).length;
  }, [credenciados]);

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("credenciados")
        .delete()
        .in("id", ids);
      
      if (error) throw error;
      return ids;
    },
    onSuccess: (deletedIds) => {
      queryClient.invalidateQueries({ queryKey: ["credenciados"] });
      setCredenciadosSelecionados(new Set());
      toast.success(`${deletedIds.length} credenciado(s) deletado(s) com sucesso`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao deletar credenciados: ${error.message}`);
    },
  });

  const handleToggleSelection = (id: string) => {
    setCredenciadosSelecionados((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleToggleAll = () => {
    if (credenciadosSelecionados.size === credenciadosFiltrados.length) {
      setCredenciadosSelecionados(new Set());
    } else {
      setCredenciadosSelecionados(new Set(credenciadosFiltrados.map((c) => c.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (credenciadosSelecionados.size === 0) {
      toast.error("Selecione pelo menos um credenciado");
      return;
    }

    if (!confirm(`⚠️ Tem certeza que deseja deletar ${credenciadosSelecionados.size} credenciado(s)?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    deleteMutation.mutate(Array.from(credenciadosSelecionados));
  };

  const handleReprocessarSelecionados = async () => {
    if (credenciadosSelecionados.size === 0) {
      toast.error("Selecione pelo menos um credenciado");
      return;
    }

    const credenciadosParaReprocessar = credenciados?.filter(c => 
      credenciadosSelecionados.has(c.id) && c.inscricao_id
    ) || [];

    if (credenciadosParaReprocessar.length === 0) {
      toast.error("Nenhum credenciado selecionado possui ID de inscrição");
      return;
    }

    toast.promise(
      Promise.all(
        credenciadosParaReprocessar.map(c => 
          reprocessar({ inscricaoId: c.inscricao_id! })
        )
      ),
      {
        loading: `Reprocessando ${credenciadosParaReprocessar.length} credenciado(s)...`,
        success: `${credenciadosParaReprocessar.length} credenciado(s) reprocessado(s) com sucesso!`,
        error: "Erro ao reprocessar credenciados"
      }
    );

    setCredenciadosSelecionados(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar credenciados: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Prestadores Credenciados
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2">
            Listagem completa de prestadores da rede IPE Saúde
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border bg-card">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Credenciados</p>
                <p className="text-xl md:text-2xl font-bold text-foreground">{credenciados?.length || 0}</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xl md:text-2xl">👥</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-card">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Ativos</p>
                <p className="text-xl md:text-2xl font-bold text-green-400">{totalAtivos}</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-xl md:text-2xl">✓</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-card">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Inativos</p>
                <p className="text-xl md:text-2xl font-bold text-red-400">{totalInativos}</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-xl md:text-2xl">✕</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-card">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Dados Incompletos</p>
                <p className="text-xl md:text-2xl font-bold text-amber-400">{credenciadosIncompletos}</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-xl md:text-2xl">⚠️</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de dados incompletos */}
      {credenciadosIncompletos > 0 && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            <strong>{credenciadosIncompletos}</strong> credenciado(s) possuem dados incompletos (CPF/CNPJ, CRM, especialidade ou cidade). 
            Credenciados marcados como <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-400 mx-1">Incompleto</span> 
            precisam de atenção.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border bg-card card-glow">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base md:text-lg lg:text-xl text-foreground">Lista de Credenciados</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              {credenciadosSelecionados.size > 0 && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 w-full sm:w-auto border-primary text-primary hover:bg-primary/10"
                    onClick={handleReprocessarSelecionados}
                    disabled={isReprocessing}
                  >
                    {isReprocessing ? (
                      <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                    <span className="text-xs md:text-sm">Reprocessar ({credenciadosSelecionados.size})</span>
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="gap-2 w-full sm:w-auto"
                    onClick={handleDeleteSelected}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                    <span className="text-xs md:text-sm">Deletar ({credenciadosSelecionados.size})</span>
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" className="border-border hover:bg-card gap-2 w-full sm:w-auto">
                <Download className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Exportar</span>
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-4 mt-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF/CNPJ ou CRM..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 bg-background text-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <Select value={filtroEspecialidade} onValueChange={setFiltroEspecialidade}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background text-xs md:text-sm">
                  <Filter className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  <SelectValue placeholder="Especialidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas Especialidades</SelectItem>
                  {especialidades.map((esp) => (
                    <SelectItem key={esp} value={esp}>
                      {esp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroMunicipio} onValueChange={setFiltroMunicipio}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background text-xs md:text-sm">
                  <Filter className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  <SelectValue placeholder="Município" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Municípios</SelectItem>
                  {municipios.map((mun) => (
                    <SelectItem key={mun} value={mun}>
                      {mun}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroAreaAtuacao} onValueChange={setFiltroAreaAtuacao}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background text-xs md:text-sm">
                  <Filter className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  <SelectValue placeholder="Área de Atuação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas Áreas</SelectItem>
                  {areasAtuacao.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area.charAt(0).toUpperCase() + area.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroServico} onValueChange={setFiltroServico}>
                <SelectTrigger className="w-full sm:w-[200px] bg-background text-xs md:text-sm">
                  <Filter className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  <SelectValue placeholder="Serviço Ofertado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Serviços</SelectItem>
                  {servicosDisponiveis.map((servico) => (
                    <SelectItem key={servico} value={servico}>
                      {servico}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background text-xs md:text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="habilitado">Habilitado</SelectItem>
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
                  <TableHead className="w-12">
                    <Checkbox
                      checked={credenciadosSelecionados.size === credenciadosFiltrados.length && credenciadosFiltrados.length > 0}
                      onCheckedChange={handleToggleAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Nº Credenciado</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>CRM</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Município</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Solicitações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credenciadosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhum credenciado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  credenciadosFiltrados.map((credenciado) => {
                    // Processar dados com indicadores de campos vazios
                    const cpfCnpj = credenciado.cnpj || credenciado.cpf;
                    const temCpfCnpj = !!cpfCnpj;
                    
                    const temCrms = credenciado.crms && credenciado.crms.length > 0;
                    const primeirosCrms = temCrms 
                      ? credenciado.crms.map((c) => `${c.crm}/${c.uf_crm}`).join(", ")
                      : null;
                    
                    const primeiraEspecialidade = credenciado.crms[0]?.especialidade;
                    const temCidade = !!credenciado.cidade;
                    const temNumeroCredenciado = !!credenciado.numero_credenciado;

                    // Contar campos vazios importantes
                    const camposVazios = [
                      !temNumeroCredenciado && "Nº Credenciado",
                      !temCpfCnpj && "CPF/CNPJ",
                      !temCrms && "CRM",
                      !primeiraEspecialidade && "Especialidade",
                      !temCidade && "Cidade"
                    ].filter(Boolean);

                    const temDadosIncompletos = camposVazios.length > 0;

                    return (
                      <TableRow 
                        key={credenciado.id} 
                        className={`hover:bg-muted/50 transition-colors ${temDadosIncompletos ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}
                      >
                        <TableCell className="w-12">
                          <Checkbox
                            checked={credenciadosSelecionados.has(credenciado.id)}
                            onCheckedChange={() => handleToggleSelection(credenciado.id)}
                            aria-label={`Selecionar ${credenciado.nome}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs md:text-sm">
                          {temNumeroCredenciado ? (
                            <span className="font-semibold text-primary">{credenciado.numero_credenciado}</span>
                          ) : (
                            <span className="text-muted-foreground italic text-xs" title="Número não cadastrado">
                              Sem número
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs md:text-sm">{credenciado.nome}</span>
                            {temDadosIncompletos && (
                              <span 
                                className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-400"
                                title={`Campos vazios: ${camposVazios.join(", ")}`}
                              >
                                Incompleto
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs md:text-sm">
                          {temCpfCnpj ? (
                            cpfCnpj
                          ) : (
                            <span className="text-muted-foreground italic text-xs" title="CPF/CNPJ não cadastrado">
                              Não informado
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs md:text-sm">
                          {temCrms ? (
                            primeirosCrms
                          ) : (
                            <span className="text-muted-foreground italic text-xs" title="CRM não cadastrado">
                              Sem CRM
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {primeiraEspecialidade ? (
                            <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                              {primeiraEspecialidade}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic text-xs" title="Especialidade não cadastrada">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm">
                          {temCidade ? (
                            credenciado.cidade
                          ) : (
                            <span className="text-muted-foreground italic text-xs" title="Cidade não cadastrada">
                              Não informada
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={credenciado.status.toLowerCase() === "ativo" ? "habilitado" : "inabilitado"} />
                        </TableCell>
                        <TableCell>
                          <SolicitacoesIndicator 
                            pendingCount={solicitacoesPendentes?.[credenciado.id] || 0}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 md:gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all text-xs md:text-sm px-2 md:px-3"
                            onClick={() => navigate(`/credenciados/${credenciado.id}`)}
                          >
                            <Eye className="h-3 w-3 md:h-4 md:w-4" />
                            <span className="hidden sm:inline">Detalhes</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
