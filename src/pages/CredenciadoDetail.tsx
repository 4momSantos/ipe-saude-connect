import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, FileText, Clock, UserCheck, DollarSign, History, Edit, FileEdit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DadosCadastrais } from "@/components/credenciados/DadosCadastrais";
import { SolicitarAlteracaoDialog } from "@/components/credenciados/SolicitarAlteracaoDialog";
import { EspecialidadesHorarios } from "@/components/credenciados/EspecialidadesHorarios";
import { HistoricoCredenciado } from "@/components/credenciados/HistoricoCredenciado";
import { SolicitacoesAlteracao } from "@/components/credenciados/SolicitacoesAlteracao";
import { HistoricoOcorrencias } from "@/components/credenciados/HistoricoOcorrencias";
import { HistoricoAvaliacoes } from "@/components/credenciados/HistoricoAvaliacoes";
import { CredenciadoSuspensao } from "@/components/credenciados/CredenciadoSuspensao";
import { RegistrarOcorrencia } from "@/components/credenciados/RegistrarOcorrencia";
import { ProgramarDescredenciamento } from "@/components/credenciados/ProgramarDescredenciamento";
import { AlteracaoStatusDialog } from "@/components/credenciado/AlteracaoStatusDialog";
import { CertificadoCard } from "@/components/credenciados/CertificadoCard";
import { ProfissionaisCredenciado } from "@/components/credenciados/ProfissionaisCredenciado";
import { ServicosCredenciado } from "@/components/credenciados/ServicosCredenciado";
import { CategoriasCredenciadoSection } from "@/components/credenciados/CategoriasCredenciadoSection";
import { HistoricoCategorizacao } from "@/components/credenciados/HistoricoCategorizacao";
import { StatusBadge } from "@/components/StatusBadge";
import { useCredenciado } from "@/hooks/useCredenciados";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { EstatisticasAvaliacao } from "@/components/avaliacoes/EstatisticasAvaliacao";

export default function CredenciadoDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("dados");
  const [ocorrenciaDialogOpen, setOcorrenciaDialogOpen] = useState(false);
  const [descredenciamentoDialogOpen, setDescredenciamentoDialogOpen] = useState(false);
  const [alteracaoStatusDialogOpen, setAlteracaoStatusDialogOpen] = useState(false);
  const [solicitacaoDialogOpen, setSolicitacaoDialogOpen] = useState(false);
  const [campoSelecionado, setCampoSelecionado] = useState<{campo: string, valor: string} | null>(null);
  
  const isMobile = useIsMobile();
  const { data: credenciado, isLoading, error } = useCredenciado(id || "");
  const { roles } = useUserRole();
  
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const hasRole = (role: string) => {
    return roles.includes(role as UserRole);
  };
  
  const isCandidato = roles.includes('candidato' as UserRole);
  const isProprietario = (credenciado as any)?.inscricoes_edital?.candidato_id === user?.id;
  const isGestorOrAnalista = hasRole('gestor') || hasRole('analista') || hasRole('admin');
  
  const handleSolicitarAlteracao = (campo: string, valorAtual: string) => {
    setCampoSelecionado({ campo, valor: valorAtual });
    setSolicitacaoDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !credenciado) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Alert variant="destructive">
          <AlertDescription>
            {error ? `Erro ao carregar credenciado: ${error.message}` : "Credenciado não encontrado"}
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/credenciados")}>
          Voltar para Credenciados
        </Button>
      </div>
    );
  }

  const cpfCnpj = credenciado.cnpj || credenciado.cpf || "N/A";
  const primeirosCrms = credenciado.crms?.map((c: any) => `${c.crm}-${c.uf_crm}`).join(", ") || "N/A";

  const tabOptions = [
    { value: "dados", label: "Dados Cadastrais" },
    ...(credenciado.cnpj ? [{ value: "profissionais", label: "Profissionais" }] : []),
    { value: "servicos", label: "Serviços" },
    { value: "especialidades", label: "Especialidades" },
    { value: "historico", label: "Histórico" },
    { value: "solicitacoes", label: isCandidato && isProprietario ? 'Minhas Solicitações' : 'Solicitações' },
    ...(isGestorOrAnalista ? [
      { value: "ocorrencias", label: "Ocorrências" },
      { value: "avaliacoes-publicas", label: "Avaliações Públicas" },
      { value: "sistema-avaliacoes", label: "Sistema de Avaliações" },
      { value: "historico-categorias", label: "Histórico Categorias" },
    ] : [])
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alerta de Suspensão */}
      {credenciado.status.toLowerCase() === "suspenso" && (
        <CredenciadoSuspensao credenciado={credenciado} />
      )}

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/credenciados")}
            className="hover:bg-muted shrink-0"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-foreground break-words">
              {credenciado.nome}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs md:text-sm text-muted-foreground">
              <span className="break-all">CPF/CNPJ: {cpfCnpj}</span>
              <span className="hidden sm:inline">•</span>
              <span className="truncate">CRM: {primeirosCrms}</span>
              <span className="hidden sm:inline">•</span>
              <div className="mt-1 sm:mt-0">
                <StatusBadge status={credenciado.status.toLowerCase() === "ativo" ? "habilitado" : "inabilitado"} />
              </div>
            </div>
          </div>
        </div>
        
        {isGestorOrAnalista && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => setAlteracaoStatusDialogOpen(true)} 
              variant="default"
              size="sm"
              className="w-full sm:w-auto text-xs md:text-sm"
            >
              <Edit className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
              <span className="ml-2 md:ml-0">Alterar Status</span>
            </Button>
            <Button 
              onClick={() => setOcorrenciaDialogOpen(true)} 
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-xs md:text-sm"
            >
              <FileText className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
              <span className="ml-2 md:ml-0">Registrar Ocorrência</span>
            </Button>
            <Button 
              onClick={() => setDescredenciamentoDialogOpen(true)} 
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-xs md:text-sm"
            >
              <Clock className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
              <span className="ml-2 md:ml-0">Programar Descredenciamento</span>
            </Button>
          </div>
        )}
        
        {isCandidato && isProprietario && (
          <Button 
            onClick={() => setSolicitacaoDialogOpen(true)}
            size="sm"
            className="w-full sm:w-auto text-xs md:text-sm"
          >
            <FileEdit className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="ml-2 md:ml-0">Solicitar Alteração</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {isMobile ? (
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione uma seção" />
            </SelectTrigger>
            <SelectContent>
              {tabOptions.map(tab => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <TabsList className="w-full flex flex-wrap justify-start gap-1">
            <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
            {credenciado.cnpj && (
              <TabsTrigger value="profissionais">
                <UserCheck className="h-4 w-4 mr-2" />
                Profissionais
              </TabsTrigger>
            )}
            <TabsTrigger value="servicos">
              <DollarSign className="h-4 w-4 mr-2" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="especialidades">Especialidades</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="solicitacoes">
              {isCandidato && isProprietario ? 'Minhas Solicitações' : 'Solicitações'}
            </TabsTrigger>
            {isGestorOrAnalista && (
              <>
                <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
                <TabsTrigger value="avaliacoes-publicas">Avaliações Públicas</TabsTrigger>
                <TabsTrigger value="sistema-avaliacoes">Sistema de Avaliações</TabsTrigger>
                <TabsTrigger value="historico-categorias">
                  <History className="h-4 w-4 mr-2" />
                  Histórico Categorias
                </TabsTrigger>
              </>
            )}
          </TabsList>
        )}

        <TabsContent value="dados" className="space-y-6">
          <DadosCadastrais 
            credenciado={{
              id: credenciado.id,
              nome: credenciado.nome,
              cpfCnpj: cpfCnpj,
              crm: primeirosCrms,
              especialidade: credenciado.crms?.[0]?.especialidade || "N/A",
              email: credenciado.email || "N/A",
              telefone: credenciado.telefone || "N/A",
              endereco: credenciado.endereco || "N/A",
              cidade: credenciado.cidade || "N/A",
              estado: credenciado.estado || "N/A",
              cep: credenciado.cep || "N/A",
              dataCredenciamento: (credenciado as any).data_habilitacao 
                ? new Date((credenciado as any).data_habilitacao).toLocaleDateString("pt-BR")
                : new Date(credenciado.created_at).toLocaleDateString("pt-BR"),
              data_solicitacao: (credenciado as any).data_solicitacao,
              data_habilitacao: (credenciado as any).data_habilitacao,
              data_inicio_atendimento: (credenciado as any).data_inicio_atendimento,
              observacoes: (credenciado as any).observacoes,
            }}
            hasRole={hasRole}
            isCandidato={isCandidato && isProprietario}
            onSolicitarAlteracao={handleSolicitarAlteracao}
          />
          {credenciado.cnpj && (
            <CategoriasCredenciadoSection credenciadoId={id || ""} />
          )}
          <CertificadoCard credenciadoId={id || ""} />
        </TabsContent>

        {credenciado.cnpj && (
          <TabsContent value="profissionais" className="space-y-6">
            <ProfissionaisCredenciado 
              credenciadoId={id || ""} 
              isCNPJ={!!credenciado.cnpj}
            />
          </TabsContent>
        )}

        <TabsContent value="servicos" className="space-y-6">
          <ServicosCredenciado 
            credenciadoId={id || ""} 
            canEdit={hasRole("gestor") || hasRole("admin")}
          />
        </TabsContent>

        <TabsContent value="especialidades" className="space-y-6">
          <EspecialidadesHorarios credenciadoId={id || ""} />
        </TabsContent>

        <TabsContent value="historico" className="space-y-6">
          <HistoricoCredenciado credenciadoId={id || ""} />
        </TabsContent>

        <TabsContent value="solicitacoes" className="space-y-6">
          <SolicitacoesAlteracao 
            credenciadoId={id || ""} 
            dadosAtuais={{
              endereco: credenciado.endereco || "",
              telefone: credenciado.telefone || "",
              email: credenciado.email || "",
              especialidades: credenciado.crms?.map((c: any) => c.especialidade).join(", ") || "",
            }}
          />
        </TabsContent>

        <TabsContent value="ocorrencias" className="space-y-6">
          <HistoricoOcorrencias credenciadoId={id || ""} />
        </TabsContent>

        {isGestorOrAnalista && (
          <>
            <TabsContent value="avaliacoes-publicas" className="space-y-6">
              <EstatisticasAvaliacao credenciadoId={id!} />
            </TabsContent>

            <TabsContent value="sistema-avaliacoes" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      Acesse o sistema completo de avaliações para ver estatísticas consolidadas,
                      avaliar desempenho e visualizar histórico.
                    </p>
                    <Button onClick={() => navigate(`/credenciados/${id}/avaliacoes`)}>
                      Abrir Sistema de Avaliações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="historico-categorias" className="space-y-6">
              <HistoricoCategorizacao credenciadoId={id || ""} />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Dialogs */}
      <AlteracaoStatusDialog
        credenciadoId={id || ""}
        credenciadoNome={credenciado.nome}
        statusAtual={credenciado.status}
        open={alteracaoStatusDialogOpen}
        onClose={() => setAlteracaoStatusDialogOpen(false)}
        onSuccess={() => {
          // Refetch credenciado data
        }}
      />
      <RegistrarOcorrencia
        credenciadoId={id || ""}
        open={ocorrenciaDialogOpen}
        onClose={() => setOcorrenciaDialogOpen(false)}
      />
      <ProgramarDescredenciamento
        credenciadoId={id || ""}
        open={descredenciamentoDialogOpen}
        onClose={() => setDescredenciamentoDialogOpen(false)}
      />
      
      {isCandidato && isProprietario && (
        <SolicitarAlteracaoDialog
          credenciadoId={id!}
          open={solicitacaoDialogOpen}
          onOpenChange={setSolicitacaoDialogOpen}
          campoInicial={campoSelecionado?.campo}
          valorAtual={campoSelecionado?.valor}
          dadosAtuais={{
            endereco: credenciado.endereco || "",
            telefone: credenciado.telefone || "",
            email: credenciado.email || "",
            especialidades: credenciado.crms?.map((c: any) => c.especialidade).join(", ") || "",
          }}
        />
      )}
    </div>
  );
}
