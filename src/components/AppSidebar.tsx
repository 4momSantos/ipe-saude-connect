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
    roles: ['candidato', 'analista', 'gestor', 'admin'] as const
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <span className="text-lg font-bold text-white">IPE</span>
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="text-base font-semibold text-sidebar-foreground">IPE Saúde</h2>
                <p className="text-xs text-muted-foreground">Credenciamento</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Admin-only menu item */}
              <RoleGuard requiredRoles={['admin']}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/usuarios"
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <Shield className="h-5 w-5 shrink-0" />
                      {!isCollapsed && <span>Usuários</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </RoleGuard>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
