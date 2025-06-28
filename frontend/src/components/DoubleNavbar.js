// frontend/src/components/DoubleNavbar.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IconHome2,
  IconRobot,
  IconTools,
  IconHeadset,
  IconLogout,
  IconSun,
  IconMoonStars,
} from '@tabler/icons-react';
import { Title, Tooltip, UnstyledButton, Group, Avatar, Text, Menu, rem } from '@mantine/core';
import classes from './DoubleNavbar.module.css';

// --- NOSSAS ÁREAS ---
const areasData = [
  { icon: IconHome2, label: 'Home' },
  { icon: IconRobot, label: 'IA & Automações' },
  { icon: IconTools, label: 'Operacional' },
  { icon: IconHeadset, label: 'Suporte' },
];

// --- NOSSAS PÁGINAS DENTRO DAS ÁREAS ---
const pagesData = {
  'Home': [
    { label: 'Agenda', link: '/workspace/agenda' },
    { label: 'Mapa', link: '/workspace/mapa' }
  ],
  'IA & Automações': [
    // Em breve
  ],
  'Operacional': [
    { label: 'Engajamento', link: '/workspace/engajamento' }
  ],
  'Suporte': [
    // Em breve
  ],
};

// Função para determinar área ativa baseada na URL
const getActiveAreaFromPath = (pathname) => {
  if (pathname.includes('/agenda') || pathname.includes('/mapa')) {
    return 'Home';
  }
  if (pathname.includes('/engajamento')) {
    return 'Operacional';
  }
  return 'Home'; // Default
};

// Função para determinar página ativa baseada na URL
const getActivePageFromPath = (pathname) => {
  if (pathname.includes('/agenda')) return 'Agenda';
  if (pathname.includes('/mapa')) return 'Mapa';
  if (pathname.includes('/engajamento')) return 'Engajamento';
  return 'Agenda'; // Default
};

// O componente que será exportado e usado em WorkspacePage
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
  const [activePage, setActivePage] = useState('Agenda');

  // Atualizar estados baseado na URL atual
  useEffect(() => {
    const area = getActiveAreaFromPath(location.pathname);
    const page = getActivePageFromPath(location.pathname);
    setActiveArea(area);
    setActivePage(page);
  }, [location.pathname]);

  const mainLinks = areasData.map((link) => (
    <Tooltip
      label={link.label}
      position="right"
      withArrow
      transitionProps={{ duration: 0 }}
      key={link.label}
    >
      <UnstyledButton
        onClick={() => {
          setActiveArea(link.label);
          const firstPageOfNewArea = pagesData[link.label]?.[0];
          
          if (firstPageOfNewArea) {
            setActivePage(firstPageOfNewArea.label);
            navigate(firstPageOfNewArea.link);
          } else {
            // Para áreas vazias, manter na agenda
            setActivePage('Agenda');
            navigate('/workspace/agenda');
          }
        }}
        className={classes.mainLink}
        data-active={link.label === activeArea || undefined}
      >
        <link.icon size={22} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  ));

  const subLinks = (pagesData[activeArea] || []).map((pageItem) => (
    <a
      className={classes.link}
      data-active={activePage === pageItem.label || undefined}
      href="#"
      onClick={(event) => {
        event.preventDefault();
        setActivePage(pageItem.label);
        navigate(pageItem.link);
      }}
      key={pageItem.label}
    >
      {pageItem.label}
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
        <div className={classes.aside}>
          {/* Logo */}
          <div className={classes.logo}>
            <div className={classes.logoIcon}>CH</div>
          </div>
          {mainLinks}
          <Tooltip label="Logout" position="right" withArrow transitionProps={{ duration: 0 }}>
             <UnstyledButton onClick={onLogout} className={classes.mainLink} style={{ marginTop: 'auto', marginBottom: '10px' }}>
               <IconLogout size={22} stroke={1.5} />
             </UnstyledButton>
          </Tooltip>
        </div>
        <div className={classes.main}>
          <Title order={4} className={classes.title}>
            {activeArea || 'Selecione uma Área'}
          </Title>
          {subLinks.length > 0 ? subLinks : (
            <Text c="dimmed" size="sm" style={{ padding: '12px 16px', fontStyle: 'italic' }}>
              Funcionalidades de {activeArea} chegando em breve! 🚀
            </Text>
          )}
          
          {/* Seção do usuário no rodapé */}
          <UserSection />
        </div>
      </div>
    </nav>
  );
}