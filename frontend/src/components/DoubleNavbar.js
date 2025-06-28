// frontend/src/components/DoubleNavbar.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IconHome2,
  IconRobot,
  IconTools,
  IconHeadset,
  IconCalendar,
  IconMap,
  IconChartLine,
  IconLogout,
  IconSun,
  IconMoonStars,
} from '@tabler/icons-react';
import { Title, Tooltip, UnstyledButton, Group, Avatar, Text, Menu, rem } from '@mantine/core';
import classes from './DoubleNavbar.module.css';

// Definir as áreas principais
const mainAreasData = [
  { 
    icon: IconHome2, 
    label: 'Home',
    pages: [
      { label: 'Agenda', link: '/workspace/agenda', icon: IconCalendar },
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
  if (pathname.includes('/agenda') || pathname.includes('/mapa')) {
    return 'Home';
  }
  if (pathname.includes('/engajamento')) {
    return 'Operacional';
  }
  // Para futuras implementações
  if (pathname.includes('/nicochat') || pathname.includes('/automacoes')) {
    return 'IA & Automações';
  }
  if (pathname.includes('/suporte')) {
    return 'Suporte';
  }
  return 'Home'; // Default
};

// Função para determinar página ativa baseada na URL
const getActivePageFromPath = (pathname) => {
  if (pathname.includes('/agenda')) return 'Agenda';
  if (pathname.includes('/mapa')) return 'Mapa';
  if (pathname.includes('/engajamento')) return 'Engajamento';
  return null;
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
  
  const [activeArea, setActiveArea] = useState('Home');
  const [activePage, setActivePage] = useState(null);

  // Atualizar estados baseado na URL atual
  useEffect(() => {
    const area = getActiveAreaFromPath(location.pathname);
    const page = getActivePageFromPath(location.pathname);
    setActiveArea(area);
    setActivePage(page);
    
    console.log(`URL mudou: ${location.pathname}`);
    console.log(`Área detectada: ${area}, Página detectada: ${page}`);
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
          console.log(`Clicando na área: ${area.label}`);
          setActiveArea(area.label);
          // Se a área tem páginas, navegar para a primeira
          if (area.pages.length > 0) {
            const firstPage = area.pages[0];
            setActivePage(firstPage.label);
            navigate(firstPage.link);
            console.log(`Navegando para primeira página: ${firstPage.link}`);
          } else {
            setActivePage(null);
            // Para áreas vazias, manter na agenda
            navigate('/workspace/agenda');
            console.log('Área sem páginas - redirecionando para agenda');
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
        console.log(`Navegando para: ${page.link}, Página ativa: ${page.label}`);
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
            leftSection={
              colorScheme === 'dark' 
                ? <IconSun style={{ width: rem(14), height: rem(14) }} />
                : <IconMoonStars style={{ width: rem(14), height: rem(14) }} />
            }
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
            {currentPages.length > 0 ? (
              pageLinks
            ) : (
              <Text c="dimmed" size="sm" style={{ padding: '12px 16px', fontStyle: 'italic' }}>
                Funcionalidades de {activeArea} chegando em breve! 🚀
              </Text>
            )}
          </div>

          {/* Seção do usuário no rodapé */}
          <UserSection />
        </div>
      </div>
    </nav>
  );
}