import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Inscricoes from "./pages/Inscricoes";
import Editais from "./pages/Editais";
import CriarEdital from "./pages/CriarEdital";
import EditarEdital from "./pages/EditarEdital";
import Analises from "./pages/Analises";
import AnalisesRelatorios from "./pages/AnalisesRelatorios";
import Credenciados from "./pages/Credenciados";
import CredenciadoDetail from "./pages/CredenciadoDetail";
import Workflows from "./pages/Workflows";
import WorkflowEditor from "./pages/WorkflowEditor";
import FluxoCredenciamentoPage from "./pages/FluxoCredenciamento";
import LoginPage from "./components/LoginPage";
import UserManagement from "./pages/UserManagement";
import { ProtectedRoute as RoleProtectedRoute } from "./components/ProtectedRoute";
import { UserProfileMenu } from "./components/UserProfileMenu";
import PlaceholderPage from "./pages/PlaceholderPage";
import { ClipboardCheck, Users, MapPin, BarChart3, Settings } from "lucide-react";
import NotFound from "./pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
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
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/editais" element={<Editais />} />
                          <Route path="/editais/criar" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><CriarEdital /></RoleProtectedRoute>} />
                          <Route path="/editais/editar/:id" element={<RoleProtectedRoute requiredRoles={['gestor', 'admin']}><EditarEdital /></RoleProtectedRoute>} />
                          <Route path="/inscricoes" element={<Inscricoes />} />
                          <Route path="/analises" element={<Analises />} />
                          <Route path="/credenciados" element={<Credenciados />} />
                          <Route path="/credenciados/:id" element={<CredenciadoDetail />} />
                          <Route path="/workflows" element={<Workflows />} />
                          <Route path="/workflow-editor" element={<WorkflowEditor />} />
                          <Route path="/fluxo-credenciamento" element={<FluxoCredenciamentoPage />} />
                          <Route path="/mapa" element={<AnalisesRelatorios />} />
                          <Route path="/relatorios" element={<AnalisesRelatorios />} />
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
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
  </QueryClientProvider>
);

export default App;
