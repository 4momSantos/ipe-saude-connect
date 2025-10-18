import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Eye, Download, Filter, Loader2 } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Credenciados() {
  const navigate = useNavigate();
  const { data: credenciados, isLoading, error } = useCredenciados();
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroEspecialidade, setFiltroEspecialidade] = useState<string>("todas");
  const [filtroMunicipio, setFiltroMunicipio] = useState<string>("todos");
  const [filtroAreaAtuacao, setFiltroAreaAtuacao] = useState<string>("todas");
  const [filtroServico, setFiltroServico] = useState<string>("todos");
  const [busca, setBusca] = useState("");

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
      const matchStatus =
        filtroStatus === "todos" || 
        credenciado.status.toLowerCase() === filtroStatus.toLowerCase();
      
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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
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
      </div>

      <Card className="border bg-card card-glow">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base md:text-lg lg:text-xl text-foreground">Lista de Credenciados</CardTitle>
            <Button variant="outline" size="sm" className="border-border hover:bg-card gap-2 w-full sm:w-auto">
              <Download className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm">Exportar</span>
            </Button>
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
                  <TableHead>Nº Credenciado</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>CRM</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Município</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credenciadosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhum credenciado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  credenciadosFiltrados.map((credenciado) => {
                    const cpfCnpj = credenciado.cnpj || credenciado.cpf || "-";
                    const primeirosCrms = credenciado.crms.map((c) => `${c.crm}-${c.uf_crm}`).join(", ");
                    const primeiraEspecialidade = credenciado.crms[0]?.especialidade || "-";

                    return (
                      <TableRow key={credenciado.id} className="hover:bg-muted/50 cursor-pointer transition-colors">
                        <TableCell className="font-mono text-xs md:text-sm font-semibold text-primary">
                          {credenciado.numero_credenciado || "-"}
                        </TableCell>
                        <TableCell className="font-medium text-xs md:text-sm">{credenciado.nome}</TableCell>
                        <TableCell className="font-mono text-xs md:text-sm">{cpfCnpj}</TableCell>
                        <TableCell className="font-mono text-xs md:text-sm">{primeirosCrms || "-"}</TableCell>
                        <TableCell>
                          {primeiraEspecialidade !== "-" ? (
                            <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                              {primeiraEspecialidade}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm">{credenciado.cidade || "-"}</TableCell>
                        <TableCell>
                          <StatusBadge status={credenciado.status.toLowerCase() === "ativo" ? "habilitado" : "inabilitado"} />
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
