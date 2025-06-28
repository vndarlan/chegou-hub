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

// Definir as áreas principais - removendo Home e tornando Agenda a primeira
const mainAreasData = [
  { 
    icon: IconCalendar, 
    label: 'Agenda',
    pages: [
      { label: 'Mapa', link: '/workspace/mapa', icon: IconMap }
    ]
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
      { label: 'Engajamento', link: '/workspace/engajamento', icon: IconChartLine }
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
    return 'Agenda'; // Mapa está dentro de Agenda agora
  }
  if (pathname.includes('/engajamento')) {
    return 'Operacional';
  }
  if (pathname.includes('/nicochat') || pathname.includes('/automacoes')) {
    return 'IA & Automações';
  }
  if (pathname.includes('/suporte')) {
    return 'Suporte';
  }
  return 'Agenda'; // Default para Agenda
};

// Função para determinar página ativa baseada na URL
const getActivePageFromPath = (pathname) => {
  if (pathname.includes('/mapa')) return 'Mapa';
  if (pathname.includes('/engajamento')) return 'Engajamento';
  if (pathname.includes('/agenda') || pathname === '/workspace' || pathname === '/workspace/') return 'Agenda';
  return 'Agenda'; // Default
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
  const [activePage, setActivePage] = useState('Agenda');

  // Atualizar estados baseado na URL atual
  useEffect(() => {
    const area = getActiveAreaFromPath(location.pathname);
    const page = getActivePageFromPath(location.pathname);
    setActiveArea(area);
    setActivePage(page);
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
          // Se é a área Agenda, navegar direto para agenda
          if (area.label === 'Agenda') {
            setActivePage('Agenda');
            navigate('/workspace/agenda');
          } else if (area.pages.length > 0) {
            // Se a área tem páginas, navegar para a primeira
            const firstPage = area.pages[0];
            setActivePage(firstPage.label);
            navigate(firstPage.link);
          } else {
            setActivePage(null);
            // Para áreas vazias, navegar para uma página placeholder
            navigate('/workspace');
          }
        }}
        className={classes.mainLink}
        data-active={area.label === activeArea || undefined}
      >
        <area.icon size={22} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  ));

  // Encontrar área ativa e suas páginas
  const currentArea = mainAreasData.find(area => area.label === activeArea);
  const currentPages = currentArea?.pages || [];

  // Renderizar links das páginas da área ativa
  const pageLinks = currentPages.map((page) => (
    <a
      className={classes.link}
      data-active={activePage === page.label || undefined}
      href="#"
      onClick={(event) => {
        event.preventDefault();
        setActivePage(page.label);
        navigate(page.link);
      }}
      key={page.label}
    >
      {page.icon && <page.icon size={16} stroke={1.5} style={{ marginRight: '8px' }} />}
      {page.label}
    </a>
  ));

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
            {/* Para Agenda, mostrar link da própria Agenda */}
            {activeArea === 'Agenda' && (
              <a
                className={classes.link}
                data-active={activePage === 'Agenda' || undefined}
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setActivePage('Agenda');
                  navigate('/workspace/agenda');
                }}
              >
                <IconCalendar size={16} stroke={1.5} style={{ marginRight: '8px' }} />
                Agenda
              </a>
            )}
            
            {/* Outros links da área */}
            {currentPages.length > 0 ? (
              pageLinks
            ) : activeArea !== 'Agenda' ? (
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