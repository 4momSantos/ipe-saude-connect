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
  FileCode2,
  Sparkles,
  FileSignature,
  Activity,
  GitBranch
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
    title: "Contratos", 
    url: "/contratos", 
    icon: FileSignature,
    roles: ['analista', 'gestor', 'admin'] as const
  },
  { 
    title: "Fluxo de Credenciamento", 
    url: "/fluxo-credenciamento", 
    icon: GitBranch,
    roles: ['gestor', 'admin'] as const
  },
  { 
    title: "Monitor do Fluxo", 
    url: "/monitor-fluxo", 
    icon: Activity,
    roles: ['gestor', 'admin'] as const
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
    title: "Templates de Contratos", 
    url: "/contratos/templates", 
    icon: FileSignature,
    roles: ['gestor', 'admin'] as const
  },
  { 
    title: "Análises & Relatórios", 
    url: "/relatorios", 
    icon: BarChart3,
    roles: ['analista', 'gestor', 'admin'] as const
  },
  { 
    title: "Teste OCR", 
    url: "/teste-ocr", 
    icon: Sparkles,
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
      className="border-r border-border/50 bg-card/50 backdrop-blur-sm"
    >
      <SidebarContent className="gap-0">
        {/* Header Minimalista */}
        <div className="p-6 pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-sm">
                <span className="text-lg font-extrabold text-primary-foreground">IPE</span>
              </div>
              {!isCollapsed && (
                <div>
                  <h2 className="text-base font-bold text-foreground">IPE Saúde</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Credenciamento</p>
                </div>
              )}
            </div>
            {!isCollapsed && <NotificationBell />}
          </div>
        </div>

        {/* Navigation Clean */}
        <SidebarGroup className="px-4">
          <SidebarGroupLabel className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-foreground/70 hover:text-foreground hover:bg-muted"
                        }`
                      }
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                      {!isCollapsed && (
                        <span className="text-sm font-medium">
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Admin Section */}
              <RoleGuard requiredRoles={['admin']}>
                <div className="mt-6 pt-6 border-t border-border/50">
                  <SidebarGroupLabel className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Admin
                  </SidebarGroupLabel>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/usuarios"
                        className={({ isActive }) =>
                          `group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-foreground/70 hover:text-foreground hover:bg-muted"
                          }`
                        }
                      >
                        <Shield className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">
                            Usuários
                          </span>
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
