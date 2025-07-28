import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IconCalendar,
  IconWorld,
  IconInputAi,
  IconRobot,
  IconGitBranch,
  IconPlugConnected,
  IconPhoneRinging,
  IconHome,
  IconChartBar,
  IconTrendingUp,
  IconBuilding,
  IconBrandChrome,
  IconLock,
  IconSun,
  IconMoon,
  IconLogout,
  IconUser,
  IconChevronDown,
  IconMenu,
  IconX
} from '@tabler/icons-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback } from './ui';
import { useTheme } from './theme-provider';

const sidebarItems = [
  {
    key: 'home',
    icon: IconHome,
    label: 'HOME',
    items: [
      { label: 'Agenda da Empresa', path: '/workspace/agenda' },
      { label: 'Mapa de Atuação', path: '/workspace/mapa' },
    ]
  },
  {
    key: 'ia',
    icon: IconInputAi,
    label: 'IA & Automações',
    items: [
      { label: 'Projetos', path: '/workspace/projetos' },
      { label: 'Relatórios & Análise', path: '/workspace/relatorios' },
      { label: 'Logs de Erros', path: '/workspace/logs' },
      { label: 'Nicochat', path: '/workspace/nicochat' },
      { label: 'N8N', path: '/workspace/n8n' },
    ]
  },
  {
    key: 'metricas',
    icon: IconChartBar,
    label: 'MÉTRICAS',
    items: [
      { label: 'PRIMECOD', path: '/workspace/metricas/primecod' },
      { label: 'ECOMHUB', path: '/workspace/metricas/ecomhub' },
      { label: 'DROPI MX', path: '/workspace/metricas/dropi' },
    ]
  },
  {
    key: 'operacional',
    icon: IconPlugConnected,
    label: 'OPERACIONAL',
    items: [
      { label: 'Engajamento', path: '/workspace/engajamento' },
      { label: 'Novelties', path: '/workspace/novelties' },
    ]
  },
  {
    key: 'suporte',
    icon: IconPhoneRinging,
    label: 'SUPORTE',
    items: [
      { label: 'Processamento', path: '/workspace/processamento' },
      { label: 'Suporte', path: '/workspace/suporte' },
    ]
  }
];

const getInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function SidebarNavigation({ 
  userName = "Usuário", 
  userEmail = "", 
  onLogout, 
  isAdmin = false 
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('home');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Adicionar admin se aplicável
  const allSidebarItems = React.useMemo(() => {
    const items = [...sidebarItems];
    if (isAdmin) {
      items.push({
        key: 'admin',
        icon: IconLock,
        label: 'ADMIN',
        items: [
          { 
            label: 'Acessar', 
            path: 'https://chegou-hubb-production.up.railway.app/admin/',
            external: true 
          },
        ]
      });
    }
    return items;
  }, [isAdmin]);

  // Determinar seção ativa baseada na URL
  React.useEffect(() => {
    const path = location.pathname;
    if (path.includes('/metricas/')) setActiveSection('metricas');
    else if (path.includes('/projetos') || path.includes('/relatorios') || 
             path.includes('/logs') || path.includes('/nicochat') || path.includes('/n8n')) setActiveSection('ia');
    else if (path.includes('/engajamento') || path.includes('/novelties')) setActiveSection('operacional');
    else if (path.includes('/suporte') || path.includes('/processamento')) setActiveSection('suporte');
    else if (path.includes('/admin')) setActiveSection('admin');
    else setActiveSection('home');
  }, [location.pathname]);

  const handleNavigation = (path, external = false) => {
    if (external) {
      window.open(path, '_blank');
    } else {
      navigate(path);
    }
  };

  const activeItems = allSidebarItems.find(item => item.key === activeSection)?.items || [];

  return (
    <div className="h-screen w-80 border-r border-border bg-card flex">
      {/* Sidebar com ícones */}
      <div className="w-16 bg-muted/30 border-r border-border flex flex-col items-center py-4">
        {/* Logo */}
        <div className="mb-6">
          <img 
            src="/logo192.png" 
            alt="Logo"
            className="w-8 h-8 rounded-md"
          />
        </div>

        {/* Ícones das seções */}
        <div className="flex flex-col space-y-2 flex-1">
          {allSidebarItems.map((item) => (
            <Button
              key={item.key}
              variant={activeSection === item.key ? "default" : "ghost"}
              size="icon"
              className="w-10 h-10"
              onClick={() => setActiveSection(item.key)}
            >
              <item.icon size={18} />
            </Button>
          ))}
        </div>

        {/* User menu trigger */}
        <Button
          variant={userMenuOpen ? "default" : "ghost"}
          size="icon"
          className="w-10 h-10 mt-4"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
        >
          <IconUser size={18} />
        </Button>
      </div>

      {/* Conteúdo principal da sidebar */}
      <div className="flex-1 flex flex-col">
        {/* Header da seção */}
        <div className="p-4 border-b border-border bg-muted/20">
          <h2 className="font-semibold text-sm text-foreground">
            {allSidebarItems.find(item => item.key === activeSection)?.label || 'HOME'}
          </h2>
        </div>

        {/* Links da seção */}
        <div className="flex-1 p-2">
          {activeItems.map((item, index) => (
            <Button
              key={`${item.path}-${index}`}
              variant={location.pathname === item.path ? "secondary" : "ghost"}
              className="w-full justify-start mb-1 text-sm"
              onClick={() => handleNavigation(item.path, item.external)}
            >
              {item.label}
              {item.external && <span className="ml-auto text-xs opacity-60">↗</span>}
            </Button>
          ))}
        </div>

        {/* User menu */}
        {userMenuOpen && (
          <Card className="m-2 mt-auto">
            <CardContent className="p-3">
              <div className="flex items-center space-x-3 mb-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userEmail}
                  </p>
                </div>
              </div>
              
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
                  <span className="ml-2">
                    {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                  </span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs text-destructive hover:text-destructive"
                  onClick={onLogout}
                >
                  <IconLogout size={14} />
                  <span className="ml-2">Sair</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}