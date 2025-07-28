import * as React from "react"
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  Bot,
  BarChart3,
  Settings,
  Phone,
  Lock
} from 'lucide-react'
import { NavMain } from './nav-main'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from './ui/sidebar'
import { useTheme } from './theme-provider'

export function AppSidebar({ 
  userName = "Usuário", 
  userEmail = "", 
  onLogout, 
  isAdmin = false,
  ...props 
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, setTheme } = useTheme()

  // Função para gerar iniciais do usuário
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Dados do projeto Chegou Hub
  const data = {
    user: {
      name: userName,
      email: userEmail,
      avatar: "/logo192.png",
      initials: getInitials(userName),
    },
    teams: [
      {
        name: "Chegou Hub",
        logo: () => (
          <img 
            src="/logo192.png" 
            alt="Chegou Hub"
            className="size-4"
          />
        ),
        plan: "Enterprise",
      },
    ],
    navMain: [
      {
        title: "HOME",
        url: "#",
        icon: Home,
        isActive: location.pathname.includes('/workspace/agenda') || location.pathname.includes('/workspace/mapa'),
        items: [
          {
            title: "Agenda da Empresa",
            url: "/workspace/agenda",
          },
          {
            title: "Mapa de Atuação", 
            url: "/workspace/mapa",
          },
        ],
      },
      {
        title: "IA & Automações",
        url: "#",
        icon: Bot,
        isActive: location.pathname.includes('/workspace/projetos') || 
                  location.pathname.includes('/workspace/relatorios') ||
                  location.pathname.includes('/workspace/logs') ||
                  location.pathname.includes('/workspace/nicochat') ||
                  location.pathname.includes('/workspace/n8n'),
        items: [
          {
            title: "Projetos",
            url: "/workspace/projetos",
          },
          {
            title: "Relatórios & Análise",
            url: "/workspace/relatorios",
          },
          {
            title: "Logs de Erros",
            url: "/workspace/logs",
          },
          {
            title: "Nicochat",
            url: "/workspace/nicochat",
          },
          {
            title: "N8N",
            url: "/workspace/n8n",
          },
        ],
      },
      {
        title: "MÉTRICAS",
        url: "#",
        icon: BarChart3,
        isActive: location.pathname.includes('/workspace/metricas/'),
        items: [
          {
            title: "PRIMECOD",
            url: "/workspace/metricas/primecod",
          },
          {
            title: "ECOMHUB",
            url: "/workspace/metricas/ecomhub",
          },
          {
            title: "DROPI MX",
            url: "/workspace/metricas/dropi",
          },
        ],
      },
      {
        title: "OPERACIONAL",
        url: "#",
        icon: Settings,
        isActive: location.pathname.includes('/workspace/engajamento') ||
                  location.pathname.includes('/workspace/novelties'),
        items: [
          {
            title: "Engajamento",
            url: "/workspace/engajamento",
          },
          {
            title: "Novelties",
            url: "/workspace/novelties",
          },
        ],
      },
      {
        title: "SUPORTE",
        url: "#",
        icon: Phone,
        isActive: location.pathname.includes('/workspace/processamento') ||
                  location.pathname.includes('/workspace/suporte'),
        items: [
          {
            title: "Processamento",
            url: "/workspace/processamento",
          },
          {
            title: "Suporte",
            url: "/workspace/suporte",
          },
        ],
      }
    ],
  }

  // Adicionar admin se aplicável
  if (isAdmin) {
    data.navMain.push({
      title: "ADMIN",
      url: "#",
      icon: Lock,
      isActive: false,
      items: [
        { 
          title: "Acessar", 
          url: "https://chegou-hubb-production.up.railway.app/admin/",
          external: true 
        },
      ]
    })
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain 
          items={data.navMain} 
          navigate={navigate}
          currentPath={location.pathname}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser 
          user={data.user} 
          onLogout={onLogout}
          theme={theme}
          setTheme={setTheme}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}