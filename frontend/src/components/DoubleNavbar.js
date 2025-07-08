// frontend/src/components/DoubleNavbar.js - NOVA ESTRUTURA
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IconCalendar,
  IconWorld,
  IconActivity,
  IconRobot,
  IconGitBranch,
  IconHeart,
  IconHeadphones,
  IconHome,
  IconChartBar,
  IconTrendingUp,
  IconBuilding,
  IconBrandChrome
} from '@tabler/icons-react';
import { Title, Tooltip, UnstyledButton, Text, Box } from '@mantine/core';
import { UserButton } from './NavbarNested/UserButton';
import classes from './DoubleNavbar.module.css';

// Dados principais da barra lateral
const mainLinksMockdata = [
  { icon: IconHome, label: 'HOME', key: 'home' },
  { icon: IconActivity, label: 'IA & Automações', key: 'ia' },
  { icon: IconChartBar, label: 'MÉTRICAS', key: 'metricas' },
  { icon: IconHeart, label: 'OPERACIONAL', key: 'operacional' },
];

// Mapeamento dos links por seção
const linksBySection = {
  home: [
    { label: 'Agenda da Empresa', link: '/workspace/agenda' },
    { label: 'Mapa de Países', link: '/workspace/mapa' },
  ],
  ia: [
    { label: 'Dashboard de Projetos', link: '/workspace/projetos' },
    { label: 'Relatórios & Análise', link: '/workspace/relatorios' },
    { label: 'Logs Gerais', link: '/workspace/logs' },
    { label: 'Nicochat', link: '/workspace/nicochat' },
    { label: 'N8N', link: '/workspace/n8n' },
    { label: 'Novelties Chile', link: '/workspace/novelties' },
  ],
  metricas: [
    { label: 'PRIMECOD', link: '/workspace/metricas/primecod' },
    { label: 'ECOMHUB', link: '/workspace/metricas/ecomhub' },
  ],
  operacional: [
    { label: 'Engajamento', link: '/workspace/engajamento' },
    { label: 'Suporte', link: '/workspace/suporte' },
  ],
};

export function DoubleNavbar({ userName, userEmail, onLogout, toggleColorScheme, colorScheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState('home');

  // Determinar qual seção está ativa baseada na URL atual
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.includes('/metricas/')) return 'metricas';
    if (path.includes('/projetos') || path.includes('/relatorios') || path.includes('/logs') || 
        path.includes('/nicochat') || path.includes('/n8n') || path.includes('/novelties')) return 'ia';
    if (path.includes('/engajamento') || path.includes('/suporte')) return 'operacional';
    return 'home';
  };

  React.useEffect(() => {
    setActive(getCurrentSection());
  }, [location.pathname]);

  // Gerar links principais da barra lateral
  const mainLinks = mainLinksMockdata.map((link) => (
    <Tooltip
      label={link.label}
      position="right"
      withArrow
      transitionProps={{ duration: 0 }}
      key={link.label}
    >
      <UnstyledButton
        onClick={() => setActive(link.key)}
        className={classes.mainLink}
        data-active={link.key === active || undefined}
      >
        <link.icon size={22} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  ));

  // Gerar links da área principal
  const links = linksBySection[active]?.map((link) => (
    <a
      className={classes.link}
      data-active={location.pathname === link.link || undefined}
      href="#"
      onClick={(event) => {
        event.preventDefault();
        navigate(link.link);
      }}
      key={link.label}
    >
      {link.label}
    </a>
  )) || [];

  return (
    <nav className={classes.navbar}>
      <div className={classes.wrapper}>
        <div className={classes.aside}>
          <div className={classes.logo}>
            <Box className={classes.logoIcon}>
              CH
            </Box>
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
          <Title order={4} className={classes.title}>
            {mainLinksMockdata.find(link => link.key === active)?.label || 'HOME'}
          </Title>
          <div className={classes.links}>
            {links}
          </div>
        </div>
      </div>
    </nav>
  );
}