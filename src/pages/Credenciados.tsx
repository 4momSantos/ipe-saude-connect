import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Eye, Download, Filter } from "lucide-react";
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

interface Credenciado {
  id: number;
  nome: string;
  cpfCnpj: string;
  crm?: string;
  especialidade: string;
  cidade: string;
  dataCredenciamento: string;
  status: "habilitado" | "inabilitado";
  avaliacoes: number;
}

const credenciadosData: Credenciado[] = [
  {
    id: 1,
    nome: "Dr. João Silva",
    cpfCnpj: "123.456.789-00",
    crm: "12345-SC",
    especialidade: "Cardiologia",
    cidade: "São Paulo",
    dataCredenciamento: "2024-01-15",
    status: "habilitado",
    avaliacoes: 4.8,
  },
  {
    id: 2,
    nome: "Clínica MedCenter",
    cpfCnpj: "12.345.678/0001-00",
    especialidade: "Clínica Geral",
    cidade: "Rio de Janeiro",
    dataCredenciamento: "2024-02-20",
    status: "habilitado",
    avaliacoes: 4.6,
  },
  {
    id: 3,
    nome: "Dra. Maria Santos",
    cpfCnpj: "987.654.321-00",
    especialidade: "Pediatria",
    cidade: "Brasília",
    dataCredenciamento: "2024-03-10",
    status: "habilitado",
    avaliacoes: 4.9,
  },
  {
    id: 4,
    nome: "Hospital Santa Clara",
    cpfCnpj: "98.765.432/0001-00",
    especialidade: "Hospitalar",
    cidade: "Belo Horizonte",
    dataCredenciamento: "2023-11-05",
    status: "habilitado",
    avaliacoes: 4.7,
  },
  {
    id: 5,
    nome: "Dr. Pedro Oliveira",
    cpfCnpj: "456.789.123-00",
    especialidade: "Ortopedia",
    cidade: "Curitiba",
    dataCredenciamento: "2024-04-22",
    status: "inabilitado",
    avaliacoes: 3.2,
  },
  {
    id: 6,
    nome: "Laboratório DiagLab",
    cpfCnpj: "45.678.912/0001-00",
    especialidade: "Laboratório",
    cidade: "Porto Alegre",
    dataCredenciamento: "2024-01-30",
    status: "habilitado",
    avaliacoes: 4.5,
  },
];

export default function Credenciados() {
  const navigate = useNavigate();
  const [credenciados] = useState<Credenciado[]>(credenciadosData);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroEspecialidade, setFiltroEspecialidade] = useState<string>("todas");
  const [filtroMunicipio, setFiltroMunicipio] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  const especialidades = Array.from(new Set(credenciados.map((c) => c.especialidade)));
  const municipios = Array.from(new Set(credenciados.map((c) => c.cidade)));

  const credenciadosFiltrados = credenciados.filter((credenciado) => {
    const matchStatus =
      filtroStatus === "todos" || credenciado.status === filtroStatus;
    const matchEspecialidade =
      filtroEspecialidade === "todas" ||
      credenciado.especialidade === filtroEspecialidade;
    const matchMunicipio =
      filtroMunicipio === "todos" ||
      credenciado.cidade === filtroMunicipio;
    const matchBusca =
      busca === "" ||
      credenciado.nome.toLowerCase().includes(busca.toLowerCase()) ||
      credenciado.cpfCnpj.includes(busca) ||
      credenciado.crm?.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchEspecialidade && matchMunicipio && matchBusca;
  });

  const totalAtivos = credenciados.filter((c) => c.status === "habilitado").length;
  const totalInativos = credenciados.filter((c) => c.status === "inabilitado").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Prestadores Credenciados
        </h1>
        <p className="text-muted-foreground mt-2">
          Listagem completa de prestadores da rede IPE Saúde
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Credenciados</p>
                <p className="text-2xl font-bold text-foreground">{credenciados.length}</p>
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
            <CardTitle className="text-foreground">Lista de Credenciados</CardTitle>
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
                {credenciadosFiltrados.map((credenciado) => (
                  <TableRow key={credenciado.id} className="hover:bg-muted/50 cursor-pointer transition-colors">
                    <TableCell className="font-medium">{credenciado.nome}</TableCell>
                    <TableCell className="font-mono text-sm">{credenciado.cpfCnpj}</TableCell>
                    <TableCell className="font-mono text-sm">{credenciado.crm || "-"}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                        {credenciado.especialidade}
                      </span>
                    </TableCell>
                    <TableCell>{credenciado.cidade}</TableCell>
                    <TableCell>
                      <StatusBadge status={credenciado.status} />
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
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
