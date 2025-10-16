import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Eye, Download, Filter, Loader2, FileQuestion } from "lucide-react";
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
import { useMinhasCredenciacoes } from "@/hooks/useMinhasCredenciacoes";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MinhasCredenciacoes() {
  const navigate = useNavigate();
  const { data: credenciados, isLoading, error } = useMinhasCredenciacoes();
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroEspecialidade, setFiltroEspecialidade] = useState<string>("todas");
  const [filtroMunicipio, setFiltroMunicipio] = useState<string>("todos");
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
      
      const cpfCnpj = credenciado.cnpj || credenciado.cpf || "";
      const primeirosCrms = credenciado.crms.map((c) => c.crm).join(" ");
      
      const matchBusca =
        busca === "" ||
        credenciado.nome.toLowerCase().includes(busca.toLowerCase()) ||
        cpfCnpj.includes(busca) ||
        primeirosCrms.toLowerCase().includes(busca.toLowerCase());
      
      return matchStatus && matchEspecialidade && matchMunicipio && matchBusca;
    });
  }, [credenciados, filtroStatus, filtroEspecialidade, filtroMunicipio, busca]);

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
            Erro ao carregar credenciamentos: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Mensagem quando não há credenciamentos
  if (!credenciados || credenciados.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Minhas Credenciações
          </h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe seus credenciamentos aprovados
          </p>
        </div>

        <Card className="border bg-card">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <FileQuestion className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Nenhum credenciamento encontrado</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Você ainda não possui credenciamentos aprovados. 
                  Aguarde a análise de sua inscrição ou entre em contato com o suporte.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Minhas Credenciações
        </h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe e gerencie seus credenciamentos aprovados
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Credenciamentos</p>
                <p className="text-2xl font-bold text-foreground">{credenciados?.length || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-400">{totalAtivos}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inativos</p>
                <p className="text-2xl font-bold text-red-400">{totalInativos}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-2xl">✕</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border bg-card card-glow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Meus Credenciamentos</CardTitle>
            <Button variant="outline" className="border-border hover:bg-card gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
          <div className="flex flex-col lg:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF/CNPJ ou CRM..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filtroEspecialidade} onValueChange={setFiltroEspecialidade}>
                <SelectTrigger className="w-[180px] bg-background">
                  <Filter className="h-4 w-4 mr-2" />
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
                <SelectTrigger className="w-[180px] bg-background">
                  <Filter className="h-4 w-4 mr-2" />
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
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
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
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum credenciamento encontrado com os filtros selecionados
                    </TableCell>
                  </TableRow>
                ) : (
                  credenciadosFiltrados.map((credenciado) => {
                    const cpfCnpj = credenciado.cnpj || credenciado.cpf || "-";
                    const primeirosCrms = credenciado.crms.map((c) => `${c.crm}-${c.uf_crm}`).join(", ");
                    const primeiraEspecialidade = credenciado.crms[0]?.especialidade || "-";

                    return (
                      <TableRow key={credenciado.id} className="hover:bg-muted/50 cursor-pointer transition-colors">
                        <TableCell className="font-medium">{credenciado.nome}</TableCell>
                        <TableCell className="font-mono text-sm">{cpfCnpj}</TableCell>
                        <TableCell className="font-mono text-sm">{primeirosCrms || "-"}</TableCell>
                        <TableCell>
                          {primeiraEspecialidade !== "-" ? (
                            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                              {primeiraEspecialidade}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{credenciado.cidade || "-"}</TableCell>
                        <TableCell>
                          <StatusBadge status={credenciado.status.toLowerCase() === "ativo" ? "habilitado" : "inabilitado"} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
                            onClick={() => navigate(`/credenciados/${credenciado.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                            Detalhes
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
