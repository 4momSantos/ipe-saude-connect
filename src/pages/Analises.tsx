import { useState } from "react";
import { Search, Eye, CheckCircle, XCircle, Clock, Filter } from "lucide-react";
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
  id: number;
  protocolo: string;
  nome: string;
  especialidade: string;
  dataSubmissao: string;
  status: StatusType;
  analista?: string;
}

const processosData: Processo[] = [
  {
    id: 1,
    protocolo: "2025/001234",
    nome: "Dr. João Silva",
    especialidade: "Cardiologia",
    dataSubmissao: "2025-09-28",
    status: "em_analise",
    analista: "Maria Santos",
  },
  {
    id: 2,
    protocolo: "2025/001235",
    nome: "Clínica MedCenter",
    especialidade: "Clínica Geral",
    dataSubmissao: "2025-09-27",
    status: "pendente",
  },
  {
    id: 3,
    protocolo: "2025/001236",
    nome: "Dra. Maria Santos",
    especialidade: "Pediatria",
    dataSubmissao: "2025-09-26",
    status: "aprovado",
    analista: "Carlos Lima",
  },
  {
    id: 4,
    protocolo: "2025/001237",
    nome: "Dr. Pedro Oliveira",
    especialidade: "Ortopedia",
    dataSubmissao: "2025-09-25",
    status: "em_analise",
    analista: "Ana Costa",
  },
  {
    id: 5,
    protocolo: "2025/001238",
    nome: "Laboratório DiagLab",
    especialidade: "Laboratório",
    dataSubmissao: "2025-09-24",
    status: "inabilitado",
    analista: "Maria Santos",
  },
  {
    id: 6,
    protocolo: "2025/001239",
    nome: "Dr. Carlos Mendes",
    especialidade: "Cardiologia",
    dataSubmissao: "2025-09-23",
    status: "em_analise",
    analista: "Maria Santos",
  },
  {
    id: 7,
    protocolo: "2025/001240",
    nome: "Hospital Vida",
    especialidade: "Hospitalar",
    dataSubmissao: "2025-09-22",
    status: "pendente",
  },
];

export default function Analises() {
  const [processos, setProcessos] = useState<Processo[]>(processosData);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroEspecialidade, setFiltroEspecialidade] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [processoSelecionado, setProcessoSelecionado] = useState<Processo | null>(null);

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

  const handleStatusChange = (id: number, newStatus: StatusType) => {
    setProcessos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
  };

  const handleAprovar = (id: number) => {
    handleStatusChange(id, "aprovado");
    toast.success("Processo aprovado com sucesso!");
  };

  const handleRejeitar = (id: number) => {
    handleStatusChange(id, "inabilitado");
    toast.error("Processo inabilitado");
  };

  const statusCounts = {
    em_analise: processos.filter((p) => p.status === "em_analise").length,
    pendente: processos.filter((p) => p.status === "pendente").length,
    aprovado: processos.filter((p) => p.status === "aprovado").length,
  };

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
