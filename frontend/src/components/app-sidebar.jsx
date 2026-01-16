import * as React from "react"
import {
  Bot,
  Lock,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  Moon,
  Sun,
  Calendar,
  CalendarCheck,
  BookOpen,
  Globe2,
  MapPin,
  Users,
  Facebook,
  Package,
  Zap,
  Globe,
  MessageSquare,
  Settings,
  UserCircle,
  BarChart3
} from 'lucide-react'
import OrganizationSwitcher from './organizations/OrganizationSwitcher'
import { useOrgContext } from '../contexts/OrganizationContext'

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
import { getAdminUrl } from '../utils/getAdminUrl'

export function AppSidebar({
  userName = "Usuário",
  userEmail = "",
  onLogout,
  isAdmin = false,
  isOrgAdmin = false,
  ...props
}) {
  // Importações do react-router-dom devem ser passadas via props
  const navigate = props.navigate || (() => {})
  const location = props.location || { pathname: '/' }
  const { theme, setTheme } = useTheme()
  const { hasModuleAccess, loadingModules } = useOrgContext()

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

  /**
   * Filtra itens da sidebar baseado em permissões de módulos
   * Remove recursivamente itens sem acesso e grupos vazios
   */
  const filterByPermission = (items) => {
    if (loadingModules) return items; // Durante loading, mostra tudo

    return items.map(item => ({...item})).filter(item => {
      // Se o item tem moduleKey, verificar permissão
      if (item.moduleKey && !hasModuleAccess(item.moduleKey)) {
        return false;
      }

      // Se o item tem subitens, filtrar recursivamente
      if (item.items) {
        item.items = filterByPermission(item.items);
        // Se todos os subitens foram removidos, remover o grupo também
        return item.items.length > 0;
      }

      return true;
    });
  };

  // GESTÃO EMPRESARIAL items
  const gestaoBaseItems = [
    {
      title: "Agenda da Empresa",
      url: "/gestao/agenda",
      icon: Calendar,
      isActive: location.pathname === "/gestao/agenda",
      moduleKey: "agenda",
    },
    {
      title: "Métricas Jira",
      url: "/gestao/jira",
      icon: BarChart3,
      isActive: location.pathname === "/gestao/jira",
      moduleKey: "jira",
    },
    {
      title: "Planejamento Semanal",
      icon: CalendarCheck,
      isActive: location.pathname.includes('/gestao/planejamento-semanal'),
      items: [
        {
          title: "Configurar Semana",
          url: "/gestao/planejamento-semanal/configurar",
          isActive: location.pathname === "/gestao/planejamento-semanal/configurar",
          moduleKey: "planejamento_configurar",
        },
        {
          title: "Dashboard",
          url: "/gestao/planejamento-semanal/dashboard",
          isActive: location.pathname === "/gestao/planejamento-semanal/dashboard",
          moduleKey: "planejamento_dashboard",
        },
        {
          title: "Apresentação",
          url: "/gestao/planejamento-semanal/apresentacao",
          isActive: location.pathname === "/gestao/planejamento-semanal/apresentacao",
          moduleKey: "planejamento_apresentacao",
        },
      ],
    },
  ];

  // Submenu IA dentro de Gestão Empresarial
  const iaSubmenuItems = [
    {
      title: "IA",
      icon: Bot,
      isActive: location.pathname.includes('/interno/projetos') ||
                location.pathname.includes('/interno/logs') ||
                location.pathname.includes('/interno/openai-analytics'),
      items: [
        {
          title: "Projetos",
          url: "/interno/projetos",
          isActive: location.pathname === "/interno/projetos",
          moduleKey: "ia_projetos",
        },
        {
          title: "Logs de Erros",
          url: "/interno/logs",
          isActive: location.pathname === "/interno/logs",
          moduleKey: "ia_logs",
        },
        {
          title: "OpenAI Analytics",
          url: "/interno/openai-analytics",
          isActive: location.pathname === "/interno/openai-analytics",
          moduleKey: "ia_openai",
        },
      ],
    },
  ];

  // Items de gestão sem Admin (Admin movido para fora dos grupos)
  const gestaoItems = [...gestaoBaseItems, ...iaSubmenuItems];

  // FORNECEDORES items
  const fornecedoresItems = [
    {
      title: "EUROPA",
      icon: Globe2,
      isActive: location.pathname.includes('/fornecedores/europa'),
      items: [
        {
          title: "ECOMHUB",
          icon: Users,
          isActive: location.pathname.includes('/fornecedores/europa/ecomhub'),
          items: [
            {
              title: "Análise de Efetividade",
              url: "/fornecedores/europa/ecomhub/efetividade",
              isActive: location.pathname.includes('/fornecedores/europa/ecomhub/efetividade'),
              moduleKey: "ecomhub_efetividade",
            },
            {
              title: "Análise Avançada V2",
              url: "/fornecedores/europa/ecomhub/efetividade-v2",
              isActive: location.pathname.includes('/fornecedores/europa/ecomhub/efetividade-v2'),
              moduleKey: "ecomhub_efetividade_v2",
            },
            {
              title: "Pedidos",
              url: "/fornecedores/europa/ecomhub/pedidos",
              isActive: location.pathname.includes('/fornecedores/europa/ecomhub/pedidos'),
              moduleKey: "ecomhub_pedidos",
            },
            {
              title: "Status Tracking",
              url: "/fornecedores/europa/ecomhub/status",
              isActive: location.pathname.includes('/fornecedores/europa/ecomhub/status'),
              moduleKey: "ecomhub_status",
            },
            {
              title: "Configurações",
              url: "/fornecedores/europa/ecomhub/configuracoes",
              isActive: location.pathname.includes('/fornecedores/europa/ecomhub/configuracoes'),
              moduleKey: "ecomhub_config",
            },
          ],
        },
        {
          title: "N1",
          icon: Users,
          isActive: location.pathname.includes('/fornecedores/europa/n1'),
          items: [
            {
              title: "Efetividade",
              url: "/fornecedores/europa/n1/efetividade",
              isActive: location.pathname.includes('/fornecedores/europa/n1/efetividade'),
              moduleKey: "n1_efetividade",
            },
          ],
        },
        {
          title: "PRIMECOD",
          icon: Users,
          isActive: location.pathname.includes('/fornecedores/europa/primecod'),
          items: [
            {
              title: "Efetividade",
              url: "/fornecedores/europa/primecod/efetividade",
              isActive: location.pathname.includes('/fornecedores/europa/primecod/efetividade'),
              moduleKey: "primecod_efetividade",
            },
            {
              title: "Pedidos",
              url: "/fornecedores/europa/primecod/pedidos",
              isActive: location.pathname.includes('/fornecedores/europa/primecod/pedidos'),
              moduleKey: "primecod_pedidos",
            },
            {
              title: "Catálogo",
              url: "/fornecedores/europa/primecod/catalogo",
              isActive: location.pathname.includes('/fornecedores/europa/primecod/catalogo'),
              moduleKey: "primecod_catalogo",
            },
            {
              title: "Configurações",
              url: "/fornecedores/europa/primecod/configuracoes",
              isActive: location.pathname.includes('/fornecedores/europa/primecod/configuracoes'),
              moduleKey: "primecod_config",
            },
          ],
        },
      ],
    },
    {
      title: "LATAM",
      icon: MapPin,
      isActive: location.pathname.includes('/fornecedores/latam'),
      items: [
        {
          title: "DROPI",
          icon: Users,
          isActive: location.pathname.includes('/fornecedores/latam/dropi'),
          items: [
            {
              title: "Efetividade",
              url: "/fornecedores/latam/dropi/efetividade",
              isActive: location.pathname.includes('/fornecedores/latam/dropi/efetividade'),
              moduleKey: "dropi_efetividade",
            },
            {
              title: "Novelties",
              url: "/fornecedores/latam/dropi/novelties",
              isActive: location.pathname.includes('/fornecedores/latam/dropi/novelties'),
              moduleKey: "dropi_novelties",
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
      url: "/shopify/estoque",
      icon: Package,
      isActive: location.pathname.includes('/shopify/estoque'),
      moduleKey: "shopify_estoque",
    },
    {
      title: "Pedidos Duplicados",
      url: "/shopify/processamento",
      icon: Zap,
      isActive: location.pathname.includes('/shopify/processamento'),
      moduleKey: "shopify_processamento",
    },
    {
      title: "Detector de IP",
      url: "/shopify/detector-ip",
      icon: Globe,
      isActive: location.pathname.includes('/shopify/detector-ip'),
      moduleKey: "shopify_detector_ip",
    },
  ];

  // PLATAFORMAS DE ANÚNCIO items
  const plataformasAnuncioItems = [
    {
      title: "Facebook",
      icon: Facebook,
      isActive: location.pathname.includes('/anuncios/facebook'),
      items: [
        {
          title: "Engajamento",
          url: "/anuncios/facebook/engajamento",
          isActive: location.pathname === "/anuncios/facebook/engajamento",
          moduleKey: "facebook_engajamento",
        },
      ],
    },
  ];

  // IA & CHATBOTS items
  const iaChatbotsItems = [
    {
      title: "Nicochat",
      url: "/ia/nicochat",
      icon: MessageSquare,
      isActive: location.pathname.includes('/ia/nicochat'),
      moduleKey: "nicochat",
    },
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
                  <span className="truncate text-xs text-sidebar-foreground/70">v1.11.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Seletor de Organização */}
          <SidebarMenuItem>
            <OrganizationSwitcher variant="outline" className="w-full" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        {/* TUTORIAIS e ADMINISTRAÇÃO - Itens independentes, fora de qualquer grupo */}
        {isAdmin && (
          <SidebarMenu className="px-3 py-2">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === "/tutoriais"}
                tooltip="Tutoriais - Como usar cada página do site"
                size="lg"
              >
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/tutoriais");
                  }}
                  className="font-semibold"
                >
                  <BookOpen className="size-4" />
                  <span>Tutoriais</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Painel de Administração"
                size="lg"
              >
                <a
                  href={getAdminUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold"
                >
                  <Lock className="size-4" />
                  <span>Administração</span>
                  <span className="ml-auto text-xs opacity-60">↗</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

        {/* Separador visual após items independentes */}
        {isAdmin && <div className="mx-3 mb-2 border-b border-sidebar-border" />}

        {/* GESTÃO EMPRESARIAL - sempre no topo */}
        {filterByPermission(gestaoItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>GESTÃO EMPRESARIAL</SidebarGroupLabel>
            <SidebarMenu>
              {filterByPermission(gestaoItems).map((item) => (
              item.items ? (
                // Submenu IA
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
              ) : (
                // Items simples (Agenda, Mapa, Tutoriais, Admin)
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
              )
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* FORNECEDORES - com subcategorias Europa/LATAM */}
        {filterByPermission(fornecedoresItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>FORNECEDORES</SidebarGroupLabel>
            <SidebarMenu>
              {filterByPermission(fornecedoresItems).map((region) => (
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
        )}

        {/* SHOPIFY */}
        {filterByPermission(shopifyItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>SHOPIFY</SidebarGroupLabel>
            <SidebarMenu>
              {filterByPermission(shopifyItems).map((item) => (
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

        {/* PLATAFORMAS DE ANÚNCIO */}
        {filterByPermission(plataformasAnuncioItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>PLATAFORMAS DE ANÚNCIO</SidebarGroupLabel>
            <SidebarMenu>
              {filterByPermission(plataformasAnuncioItems).map((platform) => (
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
        )}

        {/* IA & CHATBOTS */}
        {filterByPermission(iaChatbotsItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>IA & CHATBOTS</SidebarGroupLabel>
            <SidebarMenu>
              {filterByPermission(iaChatbotsItems).map((item) => (
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
                className="min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/perfil')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                {(isOrgAdmin) && (
                  <DropdownMenuItem onClick={() => navigate('/configuracoes/organizacao')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações da Organização
                  </DropdownMenuItem>
                )}
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