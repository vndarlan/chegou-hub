import * as React from "react"
import {
  Bot,
  BarChart3,
  Settings,
  Phone,
  Lock,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  Moon,
  Sun,
  Calendar,
  Map,
  TrendingUp,
  BookOpen
} from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from './ui/sidebar'
import { useTheme } from './theme-provider'

export function AppSidebar({ 
  userName = "Usuário", 
  userEmail = "", 
  onLogout, 
  isAdmin = false,
  ...props 
}) {
  // Importações do react-router-dom devem ser passadas via props
  const navigate = props.navigate || (() => {})
  const location = props.location || { pathname: '/' }
  const { theme, setTheme } = useTheme()

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleNavigation = (item) => {
    if (item.external) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(item.url);
    }
  };

  // Home items
  const homeItems = [
    {
      title: "Agenda da Empresa",
      url: "/workspace/agenda",
      icon: Calendar,
      isActive: location.pathname === "/workspace/agenda",
    },
    {
      title: "Mapa de Atuação",
      url: "/workspace/mapa",
      icon: Map,
      isActive: location.pathname === "/workspace/mapa",
    },
    {
      title: "Tutoriais",
      url: "/tutoriais",
      icon: BookOpen,
      isActive: location.pathname === "/tutoriais",
      external: false,
    },
  ];

  if (isAdmin) {
    homeItems.push({
      title: "Adm",
      url: "https://chegou-hubb-production.up.railway.app/admin/",
      icon: Lock,
      external: true,
      isActive: false,
    });
  }

  // Times items (anteriormente Setores)
  const timesItems = [
    {
      title: "IA & Automações",
      icon: Bot,
      isActive: location.pathname.includes('/workspace/projetos') ||
                location.pathname.includes('/workspace/logs') ||
                location.pathname.includes('/workspace/nicochat') ||
                location.pathname.includes('/workspace/openai-analytics'),
      items: [
        {
          title: "Projetos",
          url: "/workspace/projetos",
          isActive: location.pathname === "/workspace/projetos",
        },
        {
          title: "Logs de Erros",
          url: "/workspace/logs",
          isActive: location.pathname === "/workspace/logs",
        },
        {
          title: "Nicochat",
          url: "/nicochat",
          isActive: location.pathname.includes("/nicochat"),
        },
        {
          title: "OpenAI Analytics",
          url: "/workspace/openai-analytics",
          isActive: location.pathname === "/workspace/openai-analytics",
        },
      ],
    },
    {
      title: "Operacional",
      icon: Settings,
      isActive: location.pathname.includes('/workspace/engajamento') ||
                location.pathname.includes('/workspace/novelties'),
      items: [
        {
          title: "Engajamento",
          url: "/workspace/engajamento",
          isActive: location.pathname === "/workspace/engajamento",
        },
        {
          title: "Novelties",
          url: "/workspace/novelties",
          isActive: location.pathname === "/workspace/novelties",
        },
      ],
    },
    {
      title: "Suporte",
      icon: Phone,
      isActive: location.pathname.includes('/workspace/processamento') ||
                location.pathname.includes('/workspace/detector-ip') ||
                location.pathname.includes('/workspace/estoque'),
      items: [
        {
          title: "Processamento",
          url: "/workspace/processamento",
          isActive: location.pathname === "/workspace/processamento",
        },
        {
          title: "Detector de IP",
          url: "/workspace/detector-ip",
          isActive: location.pathname === "/workspace/detector-ip",
        },
        {
          title: "Controle de Estoque",
          url: "/workspace/estoque",
          isActive: location.pathname === "/workspace/estoque",
        },
      ],
    }
  ];

  // Métricas items (nova categoria principal)
  const metricasItems = [
    {
      title: "Efetividade",
      icon: TrendingUp,
      isActive: location.pathname.includes('/workspace/metricas/') && !location.pathname.includes('/workspace/metricas/ecomhub'),
      items: [
        {
          title: "Dropi",
          url: "/workspace/metricas/dropi",
          isActive: location.pathname === "/workspace/metricas/dropi",
        },
        {
          title: "PRIMECOD",
          url: "/workspace/metricas/primecod",
          isActive: location.pathname === "/workspace/metricas/primecod",
        },
        {
          title: "N1 Itália",
          url: "/workspace/metricas/n1italia",
          isActive: location.pathname === "/workspace/metricas/n1italia",
        },
      ],
    },
    {
      title: "ECOMHUB",
      icon: BarChart3,
      isActive: location.pathname.includes('/workspace/metricas/ecomhub') ||
                location.pathname.includes('/workspace/status/ecomhub') ||
                location.pathname.includes('/workspace/ecomhub/configuracoes'),
      items: [
        {
          title: "Efetividade",
          url: "/workspace/metricas/ecomhub",
          isActive: location.pathname === "/workspace/metricas/ecomhub",
        },
        {
          title: "Status",
          url: "/workspace/status/ecomhub",
          isActive: location.pathname === "/workspace/status/ecomhub",
        },
        {
          title: "Configurações",
          url: "/workspace/ecomhub/configuracoes",
          isActive: location.pathname === "/workspace/ecomhub/configuracoes",
        },
      ],
    }
  ];

  return (
    <Sidebar className="h-screen" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  <img 
                    src="/logo192.png" 
                    alt="Chegou Hub Logo"
                    className="size-8 rounded-lg object-contain"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Chegou Hub</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">v1.7.1</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel>Home</SidebarGroupLabel>
          <SidebarMenu>
            {homeItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  isActive={item.isActive} 
                  tooltip={item.title}
                >
                  <a
                    href={item.external ? item.url : "#"}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    onClick={(e) => {
                      if (!item.external) {
                        e.preventDefault();
                        handleNavigation(item);
                      }
                    }}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                    {item.external && (
                      <span className="ml-auto text-xs opacity-60">↗</span>
                    )}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Times</SidebarGroupLabel>
          <SidebarMenu>
            {timesItems.map((item) => (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton 
                      tooltip={item.title} 
                      isActive={item.isActive}
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton 
                            asChild
                            isActive={subItem.isActive}
                          >
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handleNavigation(subItem);
                              }}
                            >
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Métricas</SidebarGroupLabel>
          <SidebarMenu>
            {metricasItems.map((item) => (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton 
                      tooltip={item.title} 
                      isActive={item.isActive}
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton 
                            asChild
                            isActive={subItem.isActive}
                          >
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handleNavigation(subItem);
                              }}
                            >
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>

      </SidebarContent>
      
      <SidebarFooter className="mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white text-sm font-semibold">
                    {getInitials(userName)}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">{userEmail}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}