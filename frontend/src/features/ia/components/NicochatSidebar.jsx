import * as React from "react"
import {
  LayoutDashboard,
  Settings,
  GitBranch,
  FileText,
  ArrowLeft,
  MessageSquare
} from 'lucide-react'

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
} from '../../../components/ui/sidebar'

export function NicochatSidebar({ navigate, location, ...props }) {
  const handleNavigation = (url) => {
    navigate(url);
  };

  const menuItems = [
    {
      title: "Dashboard",
      url: "/workspace/nicochat/dashboard",
      icon: LayoutDashboard,
      isActive: location.pathname === "/workspace/nicochat/dashboard",
    },
    {
      title: "Configurações",
      url: "/workspace/nicochat/configuracoes",
      icon: Settings,
      isActive: location.pathname === "/workspace/nicochat/configuracoes",
    },
    {
      title: "Fluxos",
      url: "/workspace/nicochat/fluxos",
      icon: GitBranch,
      isActive: location.pathname === "/workspace/nicochat/fluxos",
    },
    {
      title: "Templates",
      url: "/workspace/nicochat/templates",
      icon: FileText,
      isActive: location.pathname === "/workspace/nicochat/templates",
    },
  ];

  return (
    <Sidebar className="h-screen" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600">
                  <MessageSquare className="size-5 text-white" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Nicochat Hub</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">WhatsApp Business</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel>Nicochat</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.map((item) => (
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
                      handleNavigation(item.url);
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
      </SidebarContent>

      <SidebarFooter className="mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Voltar ao Hub"
            >
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigation('/workspace/agenda');
                }}
              >
                <ArrowLeft className="size-4" />
                <span>Voltar ao Hub</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
