// frontend/src/components/DoubleNavbar.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IconCalendar,
  IconMap,
  IconChartLine,
  IconRobot,
  IconTools,
  IconHeadset,
  IconLogout,
} from '@tabler/icons-react';
import { Title, Tooltip, UnstyledButton, Group, Avatar, Text, Menu, rem } from '@mantine/core';
import classes from './DoubleNavbar.module.css';

// Definir as áreas principais - Agenda é agora a área principal (sem Home)
const mainAreasData = [
  { 
    icon: IconCalendar, 
    label: 'Agenda',
    link: '/workspace/agenda' // Link direto para agenda
  },
  { 
    icon: IconMap, 
    label: 'Mapa',
    link: '/workspace/mapa'
  },
  { 
    icon: IconChartLine, 
    label: 'Engajamento',
    link: '/workspace/engajamento'
  },
  { 
    icon: IconRobot, 
    label: 'IA & Automações',
    pages: [
      // Vazio por enquanto, mas preparado para futuras páginas
    ]
  },
  { 
    icon: IconTools, 
    label: 'Operacional',
    pages: [
      // Vazio por enquanto, mas preparado para futuras páginas
    ]
  },
  { 
    icon: IconHeadset, 
    label: 'Suporte',
    pages: [
      // Vazio por enquanto, mas preparado para futuras páginas
    ]
  },
];

// Função para determinar área ativa baseada na URL
const getActiveAreaFromPath = (pathname) => {
  if (pathname.includes('/agenda') || pathname === '/workspace' || pathname === '/workspace/') {
    return 'Agenda';
  }
  if (pathname.includes('/mapa')) {
    return 'Mapa';
  }
  if (pathname.includes('/engajamento')) {
    return 'Engajamento';
  }
  if (pathname.includes('/nicochat') || pathname.includes('/automacoes')) {
    return 'IA & Automações';
  }
  if (pathname.includes('/operacional')) {
    return 'Operacional';
  }
  if (pathname.includes('/suporte')) {
    return 'Suporte';
  }
  return 'Agenda'; // Default para Agenda
};

export function DoubleNavbar({ 
  userName, 
  userEmail, 
  onLogout, 
  toggleColorScheme, 
  colorScheme 
}) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeArea, setActiveArea] = useState('Agenda');

  // Atualizar estados baseado na URL atual
  useEffect(() => {
    const area = getActiveAreaFromPath(location.pathname);
    setActiveArea(area);
  }, [location.pathname]);

  // Renderizar ícones das áreas principais
  const mainLinks = mainAreasData.map((area) => (
    <Tooltip
      label={area.label}
      position="right"
      withArrow
      transitionProps={{ duration: 0 }}
      key={area.label}
    >
      <UnstyledButton
        onClick={() => {
          setActiveArea(area.label);
          
          // Se tem link direto, navegar para ele
          if (area.link) {
            navigate(area.link);
          } else if (area.pages && area.pages.length > 0) {
            // Se a área tem páginas, navegar para a primeira
            const firstPage = area.pages[0];
            navigate(firstPage.link);
          } else {
            // Para áreas vazias, redirecionar para agenda
            navigate('/workspace/agenda');
          }
        }}
        className={classes.mainLink}
        data-active={area.label === activeArea || undefined}
      >
        <area.icon size={22} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  ));

  // Encontrar área ativa
  const currentArea = mainAreasData.find(area => area.label === activeArea);

  // Renderizar sub-páginas se existirem
  const pageLinks = currentArea?.pages ? currentArea.pages.map((page) => (
    <a
      className={classes.link}
      href="#"
      onClick={(event) => {
        event.preventDefault();
        navigate(page.link);
      }}
      key={page.label}
    >
      {page.icon && <page.icon size={16} stroke={1.5} style={{ marginRight: '8px' }} />}
      {page.label}
    </a>
  )) : null;

  // Componente do usuário no rodapé
  const UserSection = () => (
    <div className={classes.userSection}>
      <Menu shadow="md" width={200} position="top-end" withArrow>
        <Menu.Target>
          <UnstyledButton className={classes.user}>
            <Group>
              <Avatar radius="xl" size="sm" color="orange">
                {userName?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <Text size="sm" fw={500} truncate="end">
                  {userName || 'Usuário'}
                </Text>
                <Text c="dimmed" size="xs" truncate="end">
                  {userEmail || ''}
                </Text>
              </div>
            </Group>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Configurações</Menu.Label>
          <Menu.Item
            leftSection={colorScheme === 'dark' ? '☀️' : '🌙'}
            onClick={toggleColorScheme}
          >
            {colorScheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            color="red"
            leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
            onClick={onLogout}
          >
            Logout
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );

  return (
    <nav className={classes.navbar}>
      <div className={classes.wrapper}>
        {/* Barra lateral com áreas principais */}
        <div className={classes.aside}>
          <div className={classes.logo}>
            <div className={classes.logoIcon}>CH</div>
          </div>
          
          {/* Divisor após a logo */}
          <div className={classes.logoDivider}></div>
          
          <div className={classes.mainLinks}>
            {mainLinks}
          </div>
          
          {/* Botão de logout na parte inferior da barra lateral */}
          <Tooltip label="Logout" position="right" withArrow>
            <UnstyledButton onClick={onLogout} className={classes.logoutButton}>
              <IconLogout size={22} stroke={1.5} />
            </UnstyledButton>
          </Tooltip>
        </div>

        {/* Área principal com páginas */}
        <div className={classes.main}>
          <Title order={4} className={classes.title}>
            {activeArea}
          </Title>
          
          <div className={classes.pageLinks}>
            {/* Mostrar sub-páginas se existirem */}
            {pageLinks && pageLinks.length > 0 ? (
              pageLinks
            ) : activeArea !== 'Agenda' && activeArea !== 'Mapa' && activeArea !== 'Engajamento' ? (
              <Text c="dimmed" size="sm" style={{ padding: '8px 16px' }}>
                Em breve: novas funcionalidades para {activeArea}
              </Text>
            ) : null}
          </div>

          {/* Seção do usuário no rodapé */}
          <UserSection />
        </div>
      </div>
    </nav>
  );
}