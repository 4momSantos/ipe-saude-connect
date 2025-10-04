import { 
  LayoutDashboard, 
  FileText, 
  ClipboardList, 
  ClipboardCheck, 
  Users, 
  MapPin, 
  BarChart3, 
  Settings,
  Workflow,
  Shield,
  FileCode2
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { RoleGuard } from "@/components/RoleGuard";
import { useUserRole } from "@/hooks/useUserRole";
import { NotificationBell } from "@/components/NotificationBell";

// Menu items com controle de acesso por role
const menuItems = [
  { 
    title: "Dashboard", 
    url: "/", 
    icon: LayoutDashboard,
    roles: ['candidato', 'analista', 'gestor', 'admin'] as const
  },
  { 
    title: "Editais", 
    url: "/editais", 
    icon: FileText,
    roles: ['candidato', 'analista', 'gestor', 'admin'] as const
  },
  { 
    title: "Inscrições", 
    url: "/inscricoes", 
    icon: ClipboardList,
    roles: ['candidato', 'gestor', 'admin'] as const
  },
  { 
    title: "Análises", 
    url: "/analises", 
    icon: ClipboardCheck,
    roles: ['analista', 'gestor', 'admin'] as const
  },
  { 
    title: "Credenciados", 
    url: "/credenciados", 
    icon: Users,
    roles: ['analista', 'gestor', 'admin'] as const
  },
  { 
    title: "Workflows", 
    url: "/workflows", 
    icon: Workflow,
    roles: ['analista', 'gestor', 'admin'] as const
  },
  { 
    title: "Formulários & Etapas", 
    url: "/formularios", 
    icon: FileCode2,
    roles: ['gestor', 'admin'] as const
  },
  { 
    title: "Análises & Relatórios", 
    url: "/relatorios", 
    icon: BarChart3,
    roles: ['analista', 'gestor', 'admin'] as const
  },
  { 
    title: "Configurações", 
    url: "/configuracoes", 
    icon: Settings,
    roles: ['analista', 'gestor', 'admin'] as const
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { hasAnyRole, loading } = useUserRole();

  // Filtrar menu items baseado nas roles do usuário
  const visibleMenuItems = menuItems.filter(item => 
    hasAnyRole([...item.roles])
  );

  if (loading) {
    return null;
  }

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r-0 bg-gradient-to-b from-background via-background to-muted/20 backdrop-blur-xl"
    >
      <SidebarContent className="gap-0">
        {/* Header Premium */}
        <div className="px-5 py-8 border-b border-border/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary/90 to-accent shadow-lg shadow-primary/25 ring-1 ring-primary/20">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
                <span className="relative text-xl font-bold text-white tracking-tight">IPE</span>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold text-foreground tracking-tight">IPE Saúde</h2>
                  <p className="text-xs font-medium text-muted-foreground/80 tracking-wide">Credenciamento</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="relative">
                <NotificationBell />
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <SidebarGroup className="px-3 py-4">
          <SidebarGroupLabel className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary shadow-sm shadow-primary/10 ring-1 ring-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:shadow-sm"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-r-full shadow-lg shadow-primary/50" />
                          )}
                          <item.icon 
                            className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
                              isActive ? "scale-110" : "group-hover:scale-105"
                            }`}
                            strokeWidth={isActive ? 2.5 : 2}
                          />
                          {!isCollapsed && (
                            <span className={`text-sm font-medium tracking-wide ${
                              isActive ? "font-semibold" : ""
                            }`}>
                              {item.title}
                            </span>
                          )}
                          {isActive && !isCollapsed && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Admin Section */}
              <RoleGuard requiredRoles={['admin']}>
                <div className="pt-4 mt-4 border-t border-border/40">
                  <SidebarGroupLabel className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
                    Administração
                  </SidebarGroupLabel>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/usuarios"
                        className={({ isActive }) =>
                          `group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 transition-all duration-200 ${
                            isActive
                              ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary shadow-sm shadow-primary/10 ring-1 ring-primary/20"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:shadow-sm"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-r-full shadow-lg shadow-primary/50" />
                            )}
                            <Shield 
                              className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
                                isActive ? "scale-110" : "group-hover:scale-105"
                              }`}
                              strokeWidth={isActive ? 2.5 : 2}
                            />
                            {!isCollapsed && (
                              <span className={`text-sm font-medium tracking-wide ${
                                isActive ? "font-semibold" : ""
                              }`}>
                                Usuários
                              </span>
                            )}
                            {isActive && !isCollapsed && (
                              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            )}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </div>
              </RoleGuard>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
