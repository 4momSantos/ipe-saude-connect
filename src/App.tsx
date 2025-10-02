import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Inscricoes from "./pages/Inscricoes";
import Editais from "./pages/Editais";
import PlaceholderPage from "./pages/PlaceholderPage";
import { ClipboardCheck, Users, MapPin, BarChart3, Settings } from "lucide-react";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-6">
                <SidebarTrigger className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </SidebarTrigger>
                <div className="flex-1" />
              </header>
              <main className="flex-1 p-6 lg:p-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/editais" element={<Editais />} />
                  <Route path="/inscricoes" element={<Inscricoes />} />
                  <Route
                    path="/analises"
                    element={
                      <PlaceholderPage
                        title="Análises"
                        description="Gestão de análises de credenciamento"
                        icon={ClipboardCheck}
                      />
                    }
                  />
                  <Route
                    path="/credenciados"
                    element={
                      <PlaceholderPage
                        title="Credenciados"
                        description="Lista de prestadores credenciados"
                        icon={Users}
                      />
                    }
                  />
                  <Route
                    path="/mapa"
                    element={
                      <PlaceholderPage
                        title="Mapa da Rede"
                        description="Visualização geográfica da rede credenciada"
                        icon={MapPin}
                      />
                    }
                  />
                  <Route
                    path="/relatorios"
                    element={
                      <PlaceholderPage
                        title="Relatórios"
                        description="Relatórios e análises do sistema"
                        icon={BarChart3}
                      />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
