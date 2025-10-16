import { useEffect, useState } from "react";
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Menu } from "lucide-react";
import { SidebarWidthObserver } from "@/components/SidebarWidthObserver";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Inscricoes from "./pages/Inscricoes";
import DocumentosRejeitados from "./pages/DocumentosRejeitados";
import DetalhesInscricao from "./pages/DetalhesInscricao";
import Editais from "./pages/Editais";
import CriarEdital from "./pages/CriarEdital";
import EditarEdital from "./pages/EditarEdital";
import EditalDetail from "./pages/EditalDetail";
import Analises from "./pages/Analises";
import AnalisesRelatorios from "./pages/AnalisesRelatorios";
import AnalistaInscricaoDetalhes from "./pages/AnalistaInscricaoDetalhes";
import Credenciados from "./pages/Credenciados";
import CredenciadoDetail from "./pages/CredenciadoDetail";
import Workflows from "./pages/Workflows";
import WorkflowEditor from "./pages/WorkflowEditor";
import FluxoCredenciamentoPage from "./pages/FluxoCredenciamento";
import TemplatesFormularios from "./pages/TemplatesFormularios";
import FormulariosEtapas from "./pages/FormulariosEtapas";
import TemplateEditor from "./pages/TemplateEditor";
import ProcessoEditor from "./pages/ProcessoEditor";
import TesteOCR from "./pages/TesteOCR";
import LoginPage from "./components/LoginPage";
import UserManagement from "./pages/UserManagement";
import { ProtectedRoute as RoleProtectedRoute } from "./components/ProtectedRoute";
import { UserProfileMenu } from "./components/UserProfileMenu";
import PlaceholderPage from "./pages/PlaceholderPage";
import ContractTemplates from "./pages/ContractTemplates";
import ContractTemplateEditor from "./pages/ContractTemplateEditor";
import WorkflowExecutions from "./pages/WorkflowExecutions";
import WorkflowMonitoring from "./pages/WorkflowMonitoring";
import RelatorioManifestacoes from "./pages/RelatorioManifestacoes";
import Contratos from "./pages/Contratos";
import VerificarCertificado from "./pages/VerificarCertificado";
import MonitorFluxo from "./pages/MonitorFluxo";
import RelatorioAvaliacoes from "./pages/RelatorioAvaliacoes";
import GestaoRegrasSuspensao from "./pages/GestaoRegrasSuspensao";
import AuditoriaCompleta from "./pages/AuditoriaCompleta";
import GerenciarCategorias from "./pages/GerenciarCategorias";
import GerenciarWebhooks from "./pages/GerenciarWebhooks";
import GerenciarAPIKeys from "./pages/GerenciarAPIKeys";
import GerenciarModelosJustificativa from "./pages/GerenciarModelosJustificativa";
import MeusDadosLGPD from "./pages/MeusDadosLGPD";
import TesteAssinafy from "./pages/TesteAssinafy";
import Prazos from "./pages/Prazos";
import RegularidadeCadastral from "./pages/RegularidadeCadastral";
import ValidarCertificado from "./pages/ValidarCertificado";
import TesteCertificados from "./pages/TesteCertificados";
import MeuCredenciamento from "./pages/MeuCredenciamento";
import DocumentosCredenciadoGrid from "./pages/DocumentosCredenciadoGrid";
const BuscaDocumentos = lazy(() => import("./pages/BuscaDocumentos"));
import DebugFluxoCredenciamento from "./pages/admin/DebugFluxoCredenciamento";
import ProcessarContratosOrfaos from "./pages/admin/ProcessarContratosOrfaos";
import AuditoriaLogs from "./pages/admin/AuditoriaLogs";
import SituacaoCadastral from "./pages/credenciados/SituacaoCadastral";
import { ImportarGeometrias } from "./pages/admin/ImportarGeometrias";
import { GestaoGrupos } from "./components/admin/GestaoGrupos";
import { GerenciarMembrosGrupo } from "./components/admin/GerenciarMembrosGrupo";
import { ClipboardCheck, Users, MapPin, BarChart3, Settings } from "lucide-react";
import NotFound from "./pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { ConsentModal } from "./components/lgpd/ConsentModal";
import { useUserConsent } from "./hooks/useUserConsent";
import { useGlobalMessageNotifications } from "./hooks/useGlobalMessageNotifications";

const queryClient = new QueryClient();

// Componente de proteção de rota
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return session ? <>{children}</> : <Navigate to="/login" replace />;
};

// Wrapper para verificar consentimento LGPD
const ConsentGuard = ({ children }: { children: React.ReactNode }) => {
  const { hasConsent, isLoading, giveConsent } = useUserConsent();
  
  // Ativar notificações globais de mensagens
  useGlobalMessageNotifications();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Verificando consentimento...</div>;
  }

  return (
    <>
      {children}
      <ConsentModal open={!hasConsent} onAccept={giveConsent} />
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verificar-certificado/:numero" element={<VerificarCertificado />} />
            <Route path="/validar-certificado" element={<ValidarCertificado />} />
            <Route path="/validar-certificado/:codigo" element={<ValidarCertificado />} />
            {import.meta.env.DEV && (
              <Route path="/teste-certificados" element={<RoleProtectedRoute requiredRoles={['admin', 'gestor']}><TesteCertificados /></RoleProtectedRoute>} />
            )}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <ConsentGuard>
                    <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <SidebarWidthObserver />
                    <div className="flex-1 flex flex-col">
                      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-6">
                        <SidebarTrigger className="lg:hidden">
                          <Menu className="h-5 w-5" />
                        </SidebarTrigger>
                        <div className="flex-1" />
                        <UserProfileMenu />
                      </header>
                      <main className="flex-1 p-6 lg:p-8">
                        <Routes>
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/editais" element={<Editais />} />
                          <Route path="/editais/:id" element={<EditalDetail />} />
                          <Route path="/editais/criar" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><CriarEdital /></RoleProtectedRoute>} />
                          <Route path="/editais/editar/:id" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><EditarEdital /></RoleProtectedRoute>} />
                          <Route path="/inscricoes" element={<Inscricoes />} />
                          <Route path="/minhas-inscricoes" element={<Inscricoes />} />
                          <Route path="/minhas-inscricoes/:id" element={<DetalhesInscricao />} />
                          <Route path="/minhas-inscricoes/:inscricaoId/documentos-rejeitados" element={<DocumentosRejeitados />} />
                          <Route 
                            path="/analises" 
                            element={
                              <RoleProtectedRoute requiredRoles={['analista', 'gestor', 'admin']}>
                                <Analises />
                              </RoleProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/analista/inscricoes/:id" 
                            element={
                              <RoleProtectedRoute requiredRoles={['analista', 'gestor', 'admin']}>
                                <AnalistaInscricaoDetalhes />
                              </RoleProtectedRoute>
                            } 
                          />
                          <Route path="/credenciados" element={<Credenciados />} />
                          <Route path="/credenciados/:id" element={<CredenciadoDetail />} />
                          <Route path="/credenciados/:id/situacao" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin', 'analista']}><SituacaoCadastral /></RoleProtectedRoute>} />
                          <Route path="/prazos" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin', 'analista']}><Prazos /></RoleProtectedRoute>} />
                          <Route path="/meu-certificado" element={<RegularidadeCadastral />} />
                          <Route path="/meu-credenciamento" element={<MeuCredenciamento />} />
                          <Route path="/meus-documentos" element={<DocumentosCredenciadoGrid />} />
                          <Route path="/credenciados/:id/regularidade" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin', 'analista']}><RegularidadeCadastral /></RoleProtectedRoute>} />
                          <Route path="/busca-documentos" element={<RoleProtectedRoute requiredRoles={['analista', 'gestor', 'admin']}><Suspense fallback={<div>Carregando...</div>}><BuscaDocumentos /></Suspense></RoleProtectedRoute>} />
                          <Route path="/contratos" element={<RoleProtectedRoute requiredRoles={['analista', 'gestor', 'admin']}><Contratos /></RoleProtectedRoute>} />
                          <Route path="/fluxo-credenciamento/:inscricaoId" element={<FluxoCredenciamentoPage />} />
                          <Route path="/monitor-fluxo" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><MonitorFluxo /></RoleProtectedRoute>} />
                          <Route path="/contratos/templates" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><ContractTemplates /></RoleProtectedRoute>} />
                          <Route path="/contratos/templates/editor" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><ContractTemplateEditor /></RoleProtectedRoute>} />
                          <Route path="/contratos/templates/editor/:id" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><ContractTemplateEditor /></RoleProtectedRoute>} />
                          <Route path="/workflows" element={<Workflows />} />
                          <Route path="/workflow-editor" element={<WorkflowEditor />} />
                          <Route path="/manifestacoes" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin', 'analista']}><RelatorioManifestacoes /></RoleProtectedRoute>} />
                          <Route path="/teste-ocr" element={<TesteOCR />} />
                          <Route path="/formularios" element={<FormulariosEtapas />} />
                          <Route path="/templates-formularios" element={<TemplatesFormularios />} />
                          <Route path="/formularios/templates/editor" element={<TemplateEditor />} />
                          <Route path="/formularios/templates/editor/:id" element={<TemplateEditor />} />
                          <Route path="/templates-formularios/editor" element={<TemplateEditor />} />
                          <Route path="/templates-formularios/editor/:id" element={<TemplateEditor />} />
                          <Route path="/formularios/processos/criar" element={<ProcessoEditor />} />
                          <Route path="/formularios/processos/editar/:id" element={<ProcessoEditor />} />
                          <Route path="/contratos/templates" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><ContractTemplates /></RoleProtectedRoute>} />
                          <Route path="/contratos/templates/editor" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><ContractTemplateEditor /></RoleProtectedRoute>} />
                          <Route path="/contratos/templates/editor/:id" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><ContractTemplateEditor /></RoleProtectedRoute>} />
                          <Route path="/mapa" element={<AnalisesRelatorios />} />
                          <Route path="/relatorios" element={<AnalisesRelatorios />} />
                          <Route path="/relatorios/avaliacoes" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><RelatorioAvaliacoes /></RoleProtectedRoute>} />
                          <Route path="/gestao/regras-suspensao" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><GestaoRegrasSuspensao /></RoleProtectedRoute>} />
                          <Route path="/auditoria" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><AuditoriaCompleta /></RoleProtectedRoute>} />
                          <Route path="/gestao/categorias" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><GerenciarCategorias /></RoleProtectedRoute>} />
                          <Route path="/integracao/webhooks" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><GerenciarWebhooks /></RoleProtectedRoute>} />
                          <Route path="/integracao/api-keys" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><GerenciarAPIKeys /></RoleProtectedRoute>} />
                          <Route path="/gestao/modelos-justificativa" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><GerenciarModelosJustificativa /></RoleProtectedRoute>} />
                          <Route path="/meus-dados" element={<MeusDadosLGPD />} />
                          <Route path="/admin/teste-assinafy" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><TesteAssinafy /></RoleProtectedRoute>} />
                          <Route path="/admin/debug-fluxo" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><DebugFluxoCredenciamento /></RoleProtectedRoute>} />
                          <Route path="/admin/processar-orfaos" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><ProcessarContratosOrfaos /></RoleProtectedRoute>} />
                          <Route path="/admin/auditoria" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><AuditoriaLogs /></RoleProtectedRoute>} />
                          <Route path="/admin/importar-geometrias" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><ImportarGeometrias /></RoleProtectedRoute>} />
                          <Route path="/admin/grupos" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><GestaoGrupos /></RoleProtectedRoute>} />
                          <Route path="/admin/grupos/:grupoId" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><GerenciarMembrosGrupo /></RoleProtectedRoute>} />
                          <Route path="/credenciados/:id/situacao" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin', 'analista']}><SituacaoCadastral /></RoleProtectedRoute>} />
                          <Route
                            path="/usuarios"
                            element={
                              <RoleProtectedRoute requiredRoles={['admin']}>
                                <UserManagement />
                              </RoleProtectedRoute>
                            }
                          />
                          <Route
                            path="/configuracoes"
                            element={
                              <PlaceholderPage
                                title="Configurações"
                                description="Configurações do sistema"
                                icon={Settings}
                              />
                            }
                          />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ConsentGuard>
            </ProtectedRoute>
            }
          />
          </Routes>
        </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;