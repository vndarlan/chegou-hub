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
  BookOpen,
  Briefcase,
  Building2,
  Globe2,
  MapPin,
  ShoppingCart,
  ShoppingBag,
  Megaphone,
  ThumbsUp,
  Flag,
  Trophy,
  Droplet,
  Package,
  Zap,
  Globe,
  MessageSquare,
  Target,
  FileText,
  Brain,
  Settings2
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

  // GESTÃO EMPRESARIAL items
  const gestaoItems = [
    {
      title: "Agenda da Empresa",
      url: "/workspace/gestao/agenda",
      icon: Calendar,
      isActive: location.pathname === "/workspace/gestao/agenda",
    },
    {
      title: "Mapa de Atuação",
      url: "/workspace/gestao/mapa",
      icon: Map,
      isActive: location.pathname === "/workspace/gestao/mapa",
    },
  ];

  // FORNECEDORES items
  const fornecedoresItems = [
    {
      title: "EUROPA",
      icon: Globe2,
      isActive: location.pathname.includes('/workspace/fornecedores/europa'),
      items: [
        {
          title: "ECOMHUB",
          icon: ShoppingBag,
          isActive: location.pathname.includes('/workspace/fornecedores/europa/ecomhub'),
          items: [
            {
              title: "Análise de Efetividade",
              url: "/workspace/fornecedores/europa/ecomhub/efetividade",
              isActive: location.pathname === "/workspace/fornecedores/europa/ecomhub/efetividade",
            },
            {
              title: "Análise Avançada V2",
              url: "/workspace/fornecedores/europa/ecomhub/efetividade-v2",
              isActive: location.pathname === "/workspace/fornecedores/europa/ecomhub/efetividade-v2",
            },
            {
              title: "Status de Sincronização",
              url: "/workspace/fornecedores/europa/ecomhub/status",
              isActive: location.pathname === "/workspace/fornecedores/europa/ecomhub/status",
            },
            {
              title: "Configurações",
              url: "/workspace/fornecedores/europa/ecomhub/configuracoes",
              isActive: location.pathname === "/workspace/fornecedores/europa/ecomhub/configuracoes",
            },
          ],
        },
        {
          title: "N1 ITALIA",
          icon: Flag,
          isActive: location.pathname.includes('/workspace/fornecedores/europa/n1'),
          items: [
            {
              title: "Efetividade",
              url: "/workspace/fornecedores/europa/n1/efetividade",
              isActive: location.pathname === "/workspace/fornecedores/europa/n1/efetividade",
            },
          ],
        },
        {
          title: "PRIMECOD",
          icon: Trophy,
          isActive: location.pathname.includes('/workspace/fornecedores/europa/primecod'),
          items: [
            {
              title: "Efetividade",
              url: "/workspace/fornecedores/europa/primecod/efetividade",
              isActive: location.pathname === "/workspace/fornecedores/europa/primecod/efetividade",
            },
          ],
        },
      ],
    },
    {
      title: "LATAM",
      icon: MapPin,
      isActive: location.pathname.includes('/workspace/fornecedores/latam'),
      items: [
        {
          title: "DROPI",
          icon: Droplet,
          isActive: location.pathname.includes('/workspace/fornecedores/latam/dropi'),
          items: [
            {
              title: "Efetividade",
              url: "/workspace/fornecedores/latam/dropi/efetividade",
              isActive: location.pathname === "/workspace/fornecedores/latam/dropi/efetividade",
            },
            {
              title: "Novelties",
              url: "/workspace/fornecedores/latam/dropi/novelties",
              isActive: location.pathname === "/workspace/fornecedores/latam/dropi/novelties",
            },
          ],
        },
      ],
    },
  ];

  // SHOPIFY items
  const shopifyItems = [
    {
      title: "Controle de Estoque",
      url: "/workspace/shopify/estoque",
      icon: Package,
      isActive: location.pathname === "/workspace/shopify/estoque",
    },
    {
      title: "Processamento",
      url: "/workspace/shopify/processamento",
      icon: Zap,
      isActive: location.pathname === "/workspace/shopify/processamento",
    },
    {
      title: "Detector de IP",
      url: "/workspace/shopify/detector-ip",
      icon: Globe,
      isActive: location.pathname === "/workspace/shopify/detector-ip",
    },
  ];

  // PLATAFORMAS DE ANÚNCIO items
  const plataformasAnuncioItems = [
    {
      title: "Facebook",
      icon: ThumbsUp,
      isActive: location.pathname.includes('/workspace/anuncios/facebook'),
      items: [
        {
          title: "Engajamento",
          url: "/workspace/anuncios/facebook/engajamento",
          isActive: location.pathname === "/workspace/anuncios/facebook/engajamento",
        },
      ],
    },
  ];

  // IA & CHATBOTS items
  const iaChatbotsItems = [
    {
      title: "Nicochat",
      url: "/workspace/ia/nicochat",
      icon: MessageSquare,
      isActive: location.pathname === "/workspace/ia/nicochat",
    },
  ];

  // FERRAMENTAS INTERNAS items (apenas para time interno)
  const ferramentasInternasItems = isAdmin ? [
    {
      title: "Projetos",
      url: "/workspace/interno/projetos",
      icon: Target,
      isActive: location.pathname === "/workspace/interno/projetos",
    },
    {
      title: "Logs de Erros",
      url: "/workspace/interno/logs",
      icon: FileText,
      isActive: location.pathname === "/workspace/interno/logs",
    },
    {
      title: "OpenAI Analytics",
      url: "/workspace/interno/openai-analytics",
      icon: Brain,
      isActive: location.pathname === "/workspace/interno/openai-analytics",
    },
  ] : [];

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
        {/* GESTÃO EMPRESARIAL - sempre no topo */}
        <SidebarGroup>
          <SidebarGroupLabel>GESTÃO EMPRESARIAL</SidebarGroupLabel>
          <SidebarMenu>
            {gestaoItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={item.isActive}
                  tooltip={item.title}
                >
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigation(item);
                    }}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* FORNECEDORES - com subcategorias Europa/LATAM */}
        <SidebarGroup>
          <SidebarGroupLabel>FORNECEDORES</SidebarGroupLabel>
          <SidebarMenu>
            {fornecedoresItems.map((region) => (
              <Collapsible
                key={region.title}
                asChild
                defaultOpen={region.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={region.title}
                      isActive={region.isActive}
                    >
                      <region.icon className="size-4" />
                      <span>{region.title}</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {region.items?.map((supplier) => (
                        <Collapsible
                          key={supplier.title}
                          asChild
                          defaultOpen={supplier.isActive}
                          className="group/subcollapsible"
                        >
                          <SidebarMenuSubItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuSubButton isActive={supplier.isActive}>
                                {supplier.icon && <supplier.icon className="size-3 mr-1" />}
                                <span>{supplier.title}</span>
                                <ChevronRight className="ml-auto size-3 transition-transform duration-200 group-data-[state=open]/subcollapsible:rotate-90" />
                              </SidebarMenuSubButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub className="ml-3">
                                {supplier.items?.map((page) => (
                                  <SidebarMenuSubItem key={page.title}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={page.isActive}
                                    >
                                      <a
                                        href="#"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleNavigation(page);
                                        }}
                                      >
                                        <span>{page.title}</span>
                                      </a>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuSubItem>
                        </Collapsible>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* SHOPIFY */}
        <SidebarGroup>
          <SidebarGroupLabel>SHOPIFY</SidebarGroupLabel>
          <SidebarMenu>
            {shopifyItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={item.isActive}
                  tooltip={item.title}
                >
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigation(item);
                    }}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* PLATAFORMAS DE ANÚNCIO */}
        <SidebarGroup>
          <SidebarGroupLabel>PLATAFORMAS DE ANÚNCIO</SidebarGroupLabel>
          <SidebarMenu>
            {plataformasAnuncioItems.map((platform) => (
              <Collapsible
                key={platform.title}
                asChild
                defaultOpen={platform.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={platform.title}
                      isActive={platform.isActive}
                    >
                      <platform.icon className="size-4" />
                      <span>{platform.title}</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {platform.items?.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={item.isActive}
                          >
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handleNavigation(item);
                              }}
                            >
                              <span>{item.title}</span>
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

        {/* IA & CHATBOTS */}
        <SidebarGroup>
          <SidebarGroupLabel>IA & CHATBOTS</SidebarGroupLabel>
          <SidebarMenu>
            {iaChatbotsItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={item.isActive}
                  tooltip={item.title}
                >
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigation(item);
                    }}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* FERRAMENTAS INTERNAS - apenas para time interno */}
        {isAdmin && ferramentasInternasItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>FERRAMENTAS INTERNAS</SidebarGroupLabel>
            <SidebarMenu>
              {ferramentasInternasItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.isActive}
                    tooltip={item.title}
                  >
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigation(item);
                      }}
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

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