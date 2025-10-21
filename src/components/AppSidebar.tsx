import { 
  LayoutDashboard, 
  FileText, 
  ClipboardList, 
  ClipboardCheck, 
  Users, 
  BarChart3, 
  Settings2,
  Workflow,
  Shield,
  FileCode2,
  Sparkles,
  FileSignature,
  Activity,
  GitBranch,
  Award,
  FileSearch,
  Search,
  Package,
  Webhook,
  Key,
  UserCircle,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  FileCode,
  TestTube2,
  MapPin,
  CalendarClock,
  FolderOpen,
  Database
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RoleGuard } from "@/components/RoleGuard";
import { useUserRole, UserRole } from "@/hooks/useUserRole";
import { NotificationCenter } from "@/components/NotificationCenter";
import { cn } from "@/lib/utils";
import logoIpeSaude from "@/assets/logo-ipe-original.png";

type Role = 'candidato' | 'analista' | 'gestor' | 'admin';

type MenuItem = {
  title: string;
  url: string;
  icon: any;
  roles: readonly Role[];
  children?: MenuItem[];
};

type MenuSection = {
  label: string;
  items: MenuItem[];
  roles?: readonly Role[];
};

// Menu Principal
const mainMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ['candidato', 'analista', 'gestor', 'admin'] as const },
  { title: "Editais", url: "/editais", icon: FileText, roles: ['candidato', 'gestor', 'admin'] as const },
  { title: "Inscrições", url: "/inscricoes", icon: ClipboardList, roles: ['analista', 'gestor', 'admin'] as const },
  { title: "Análises", url: "/analises", icon: ClipboardCheck, roles: ['analista', 'gestor', 'admin'] as const },
  { title: "Credenciados", url: "/credenciados", icon: Users, roles: ['gestor', 'admin'] as const },
  { title: "Minhas Credenciações", url: "/minhas-credenciacoes", icon: Award, roles: ['candidato'] as const },
  { title: "Controle de Prazos", url: "/prazos", icon: CalendarClock, roles: ['analista', 'gestor', 'admin'] as const },
  { title: "Meus Documentos", url: "/meus-documentos", icon: FolderOpen, roles: ['candidato'] as const },
  { title: "Busca de Documentos", url: "/busca-documentos", icon: Search, roles: ['analista', 'gestor', 'admin'] as const },
  { 
    title: "Contratos", 
    url: "/contratos", 
    icon: FileSignature, 
    roles: ['gestor', 'admin'] as const,
    children: [
      { title: "Templates de Contratos", url: "/contratos/templates", icon: FileCode, roles: ['gestor', 'admin'] as const }
    ]
  },
  { 
    title: "Credenciamento", 
    url: "/monitor-fluxo", 
    icon: GitBranch, 
    roles: ['analista', 'gestor', 'admin'] as const,
    children: [
      { title: "Monitor do Fluxo", url: "/monitor-fluxo", icon: Activity, roles: ['gestor', 'admin'] as const }
    ]
  },
  { title: "Workflows", url: "/workflows", icon: Workflow, roles: ['gestor', 'admin'] as const },
  { title: "Formulários & Etapas", url: "/formularios", icon: FileCode2, roles: ['gestor', 'admin'] as const },
  { 
    title: "Análises & Relatórios", 
    url: "/relatorios", 
    icon: BarChart3, 
    roles: ['analista', 'gestor', 'admin'] as const,
    children: [
      { title: "Relatório de Avaliações", url: "/relatorios/avaliacoes", icon: Award, roles: ['gestor', 'admin'] as const }
    ]
  },
  {
    title: "Configurações",
    url: "#",
    icon: Settings2,
    roles: ['candidato', 'analista', 'gestor', 'admin'] as const,
    children: [
      { title: "Categorias de Prestadores", url: "/gestao/categorias", icon: Package, roles: ['gestor', 'admin'] as const },
      { title: "API Keys", url: "/integracao/api-keys", icon: Key, roles: ['admin'] as const },
      { title: "Webhooks", url: "/integracao/webhooks", icon: Webhook, roles: ['admin'] as const },
      { title: "Modelos de Justificativa", url: "/gestao/modelos-justificativa", icon: FileText, roles: ['gestor', 'admin'] as const },
      { title: "Regras de Suspensão", url: "/gestao/regras-suspensao", icon: AlertTriangle, roles: ['gestor', 'admin'] as const },
      { title: "Auditoria Completa", url: "/auditoria", icon: FileSearch, roles: ['admin'] as const },
      { title: "Meus Dados (LGPD)", url: "/meus-dados", icon: UserCircle, roles: ['candidato', 'analista', 'gestor', 'admin'] as const },
      { title: "Teste OCR", url: "/teste-ocr", icon: Sparkles, roles: ['gestor', 'admin'] as const },
      { title: "Teste Assinafy", url: "/admin/teste-assinafy", icon: TestTube2, roles: ['gestor', 'admin'] as const },
    ]
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { hasAnyRole, loading } = useUserRole();
  const location = useLocation();
  
  // Estado de expansão dos menus (persistido no localStorage)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    const saved = localStorage.getItem('sidebar-expanded-menus');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sidebar-expanded-menus', JSON.stringify(expandedMenus));
  }, [expandedMenus]);

  const toggleMenu = (menuTitle: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuTitle)
        ? prev.filter(t => t !== menuTitle)
        : [...prev, menuTitle]
    );
  };

  // Função para verificar se um item ou seus filhos estão ativos
  const isItemActive = (item: MenuItem): boolean => {
    if (location.pathname === item.url) return true;
    if (item.children) {
      return item.children.some(child => location.pathname === child.url);
    }
    return false;
  };

  // Filtrar itens do menu principal
  const visibleMainMenuItems = mainMenuItems
    .map(item => ({
      ...item,
      children: item.children?.filter(child => hasAnyRole(child.roles as UserRole[]))
    }))
    .filter(item => {
      const hasAccess = hasAnyRole(item.roles as UserRole[]);
      const hasVisibleChildren = !item.children || item.children.length > 0;
      return hasAccess && hasVisibleChildren;
    });

  if (loading) {
    return null;
  }

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-border/50 bg-card/50 backdrop-blur-sm"
    >
      <SidebarContent className="gap-0">
        {/* Header com Logo IPE Saúde */}
        <div className="p-4 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <img 
                src={logoIpeSaude} 
                alt="IPE Saúde" 
                className={cn(
                  "object-contain transition-all w-full",
                  isCollapsed ? "h-14" : "h-32 max-w-full"
                )}
                style={{ mixBlendMode: 'lighten' }}
              />
              {!isCollapsed && (
                <div className="ml-auto">
                  <NotificationCenter />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu Principal */}
        <SidebarGroup className="px-4">
          <SidebarGroupLabel className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {visibleMainMenuItems.map((item) => {
                const isActive = isItemActive(item);
                const isExpanded = expandedMenus.includes(item.title);

                if (item.children && item.children.length > 0) {
                  return (
                    <Collapsible
                      key={item.title}
                      open={isExpanded}
                      onOpenChange={() => toggleMenu(item.title)}
                    >
                      <SidebarMenuItem>
                        <div className="flex items-center gap-1">
                          {/* Link clicável para a página principal */}
                          {item.url !== "#" ? (
                            <SidebarMenuButton asChild className="flex-1">
                              <NavLink
                                to={item.url}
                                end={item.url === "/"}
                                className={({ isActive }) =>
                                  cn(
                                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors flex-1",
                                    isActive
                                      ? "bg-primary text-primary-foreground shadow-sm"
                                      : "text-white hover:text-white hover:bg-muted"
                                  )
                                }
                              >
                                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                                {!isCollapsed && (
                                  <span className="text-sm font-medium">{item.title}</span>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          ) : (
                            <SidebarMenuButton
                              className={cn(
                                "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors flex-1",
                                isActive
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-white hover:text-white hover:bg-muted"
                              )}
                            >
                              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                              {!isCollapsed && (
                                <span className="text-sm font-medium">{item.title}</span>
                              )}
                            </SidebarMenuButton>
                          )}
                          
                          {/* Botão de expansão separado */}
                          {!isCollapsed && (
                            <CollapsibleTrigger asChild>
                              <button
                                className={cn(
                                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                                  "hover:bg-muted/50"
                                )}
                              >
                                <ChevronRight
                                  className={cn(
                                    "h-4 w-4 transition-transform duration-200 text-muted-foreground",
                                    isExpanded && "rotate-90"
                                  )}
                                />
                              </button>
                            </CollapsibleTrigger>
                          )}
                        </div>
                        
                        {!isCollapsed && (
                          <CollapsibleContent className="transition-all data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                            <SidebarMenuSub className="ml-4 border-l border-border/50 pl-4 mt-1">
                              {item.children.map((child) => (
                                <SidebarMenuSubItem key={child.title}>
                                  <SidebarMenuSubButton asChild>
                                    <NavLink
                                      to={child.url}
                                       className={({ isActive }) =>
                                         cn(
                                           "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors",
                                           isActive
                                             ? "bg-primary text-primary-foreground shadow-sm"
                                             : "text-white hover:text-white hover:bg-muted"
                                         )
                                       }
                                    >
                                      <child.icon className="h-4 w-4" strokeWidth={2} />
                                      <span>{child.title}</span>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        )}
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={({ isActive }) =>
                          cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-white hover:text-white hover:bg-muted"
                          )
                        }
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">{item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Seção Admin */}
        <RoleGuard requiredRoles={['admin']}>
          {!isCollapsed && <SidebarSeparator className="my-4" />}
          <div className="px-4">
            <SidebarGroup>
              <SidebarGroupLabel className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Shield className="h-3 w-3" />
                {!isCollapsed && "Admin"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/usuarios"
                        className={({ isActive }) =>
                          cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-white hover:text-white hover:bg-muted"
                          )
                        }
                      >
                        <Shield className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">Usuários</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/admin/grupos"
                        className={({ isActive }) =>
                          cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-white hover:text-white hover:bg-muted"
                          )
                        }
                      >
                        <Users className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">Grupos</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/admin/importar-geometrias"
                        className={({ isActive }) =>
                          cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-white hover:text-white hover:bg-muted"
                          )
                        }
                      >
                        <MapPin className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">Importar Geometrias</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/admin/seed-rs"
                        className={({ isActive }) =>
                          cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-white hover:text-white hover:bg-muted"
                          )
                        }
                      >
                        <Database className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">Seed Database RS</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        </RoleGuard>
      </SidebarContent>
    </Sidebar>
  );
}
