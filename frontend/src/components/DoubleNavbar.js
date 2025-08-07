// frontend/src/components/DoubleNavbar.js - VERSÃO COM ADMIN (SHADCN/UI)
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
  IconLock // NOVO ÍCONE PARA ADMIN
} from '@tabler/icons-react';
import { Button } from './ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { UserButton } from './NavbarNested/UserButton';
import classes from './DoubleNavbar.module.css';

// Função para gerar dados principais da barra lateral
const getMainLinksMockdata = (isAdmin = false) => {
  const baseLinks = [
    { icon: IconHome, label: 'HOME', key: 'home' },
    { icon: IconInputAi, label: 'IA & Automações', key: 'ia' },
    { icon: IconChartBar, label: 'MÉTRICAS', key: 'metricas' },
    { icon: IconPlugConnected, label: 'OPERACIONAL', key: 'operacional' },
    { icon: IconPhoneRinging, label: 'SUPORTE', key: 'suporte' },
  ];

  // Adiciona o link de admin apenas se o usuário for admin
  if (isAdmin) {
    baseLinks.push({
      icon: IconLock,
      label: 'ADMIN',
      key: 'admin'
    });
  }

  return baseLinks;
};

// Mapeamento dos links por seção
const linksBySection = {
  home: [
    { label: 'Agenda da Empresa', link: '/workspace/agenda' },
    { label: 'Mapa de Atuação', link: '/workspace/mapa' },
  ],
  ia: [
    { label: 'Projetos', link: '/workspace/projetos' },
    { label: 'Relatórios & Análise', link: '/workspace/relatorios' },
    { label: 'Logs de Erros', link: '/workspace/logs' },
    { label: 'Nicochat', link: '/workspace/nicochat' },
    { label: 'N8N', link: '/workspace/n8n' },
  ],
  metricas: [
    { label: 'PRIMECOD', link: '/workspace/metricas/primecod' },
    { label: 'ECOMHUB', link: '/workspace/metricas/ecomhub' },
    { label: 'Dropi', link: '/workspace/metricas/dropi' },
  ],
  operacional: [
    { label: 'Engajamento', link: '/workspace/engajamento' },
    { label: 'Novelties', link: '/workspace/novelties' },
  ],
  suporte: [
    { label: 'Processamento', link: '/workspace/processamento' }, // NOVA LINHA ADICIONADA
    { label: 'Suporte', link: '/workspace/suporte' },
  ],
  admin: [
    { 
      label: 'Acessar', 
      link: 'https://chegou-hubb-production.up.railway.app/admin/',
      external: true
    },
  ],
};

export function DoubleNavbar({ userName, userEmail, onLogout, toggleColorScheme, colorScheme, isAdmin = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState('home');

  // Determinar qual seção está ativa baseada na URL atual
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.includes('/metricas/')) return 'metricas';
    if (path.includes('/projetos') || path.includes('/relatorios') || path.includes('/logs') || 
        path.includes('/nicochat') || path.includes('/n8n')) return 'ia';
    if (path.includes('/engajamento') || path.includes('/novelties')) return 'operacional';
    if (path.includes('/suporte')) return 'suporte';
    return 'home';
  };

  React.useEffect(() => {
    setActive(getCurrentSection());
  }, [location.pathname]);

  // Gerar links principais da barra lateral (incluindo admin se aplicável)
  const mainLinksMockdata = getMainLinksMockdata(isAdmin);
  
  const mainLinks = mainLinksMockdata.map((link) => (
    <TooltipProvider key={link.label}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActive(link.key)}
            className={classes.mainLink}
            data-active={link.key === active || undefined}
          >
            <link.icon size={22} stroke={1.5} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{link.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ));

  // Gerar links da área principal
  const links = linksBySection[active]?.map((link) => (
    <a
      className={classes.link}
      data-active={location.pathname === link.link || undefined}
      href={link.external ? link.link : "#"}
      target={link.external ? "_blank" : undefined}
      rel={link.external ? "noopener noreferrer" : undefined}
      onClick={(event) => {
        if (!link.external) {
          event.preventDefault();
          navigate(link.link);
        }
        // Para links externos, deixa o comportamento padrão do browser
      }}
      key={link.label}
    >
      {link.label}
      {link.external && (
        <span className="ml-auto text-xs text-muted-foreground">↗</span>
      )}
    </a>
  )) || [];

  return (
    <nav className={classes.navbar}>
      <div className={classes.wrapper}>
        <div className={classes.aside}>
          <div className={classes.logo}>
            <img 
              src="/logo192.png" 
              alt="Logo"
              className={classes.logoImage}
            />
          </div>
          {mainLinks}
          <div className={classes.userSection}>
            <UserButton 
              userName={userName}
              userEmail={userEmail}
              onLogout={onLogout}
              toggleColorScheme={toggleColorScheme}
              colorScheme={colorScheme}
              collapsed={true}
            />
          </div>
        </div>
        <div className={classes.main}>
          <div className={classes.title}>
            <h4 className="text-lg font-semibold">
              {mainLinksMockdata.find(link => link.key === active)?.label || 'HOME'}
            </h4>
          </div>
          <div className={classes.links}>
            {links}
          </div>
        </div>
      </div>
    </nav>
  );
}