import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DadosCadastrais } from "@/components/credenciados/DadosCadastrais";
import { EspecialidadesHorarios } from "@/components/credenciados/EspecialidadesHorarios";
import { HistoricoCredenciado } from "@/components/credenciados/HistoricoCredenciado";
import { SolicitacoesAlteracao } from "@/components/credenciados/SolicitacoesAlteracao";
import { StatusBadge } from "@/components/StatusBadge";

// Mock data - substituir por dados reais do backend
const mockCredenciado = {
  id: "1",
  nome: "Dr. João Silva",
  cpfCnpj: "12.345.678/0001-90",
  crm: "12345-SC",
  especialidade: "Cardiologia",
  status: "habilitado" as const,
  email: "joao.silva@example.com",
  telefone: "(48) 99999-9999",
  endereco: "Rua Principal, 123",
  cidade: "Florianópolis",
  estado: "SC",
  cep: "88000-000",
  dataCredenciamento: "15/01/2024",
};

export default function CredenciadoDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("dados");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/credenciados")}
            className="hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {mockCredenciado.nome}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>CNPJ: {mockCredenciado.cpfCnpj}</span>
              <span>•</span>
              <span>CRM: {mockCredenciado.crm}</span>
              <span>•</span>
              <StatusBadge status={mockCredenciado.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
          <TabsTrigger value="especialidades">Especialidades e Horários</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-6">
          <DadosCadastrais credenciado={mockCredenciado} />
        </TabsContent>

        <TabsContent value="especialidades" className="space-y-6">
          <EspecialidadesHorarios credenciadoId={id || "1"} />
        </TabsContent>

        <TabsContent value="historico" className="space-y-6">
          <HistoricoCredenciado credenciadoId={id || "1"} />
        </TabsContent>

        <TabsContent value="solicitacoes" className="space-y-6">
          <SolicitacoesAlteracao credenciadoId={id || "1"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
