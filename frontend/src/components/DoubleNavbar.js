// frontend/src/components/DoubleNavbar.js
// VERSÃO FINAL - USANDO ESTRUTURA MANTINE COM GRUPOS EXPANSÍVEIS

import React from 'react';
import {
  IconCalendar,
  IconWorld,
  IconActivity,
  IconRobot,
  IconGitBranch,
  IconHeart,
  IconHeadphones,
  IconHome
} from '@tabler/icons-react';
import { Code, Group, ScrollArea, Box, Image, Text } from '@mantine/core';
import { LinksGroup } from './NavbarNested/LinksGroup';
import { UserButton } from './NavbarNested/UserButton';
import classes from './NavbarNested/NavbarNested.module.css';

// Dados de navegação com grupos expansíveis
const navigationData = [
  {
    label: 'HOME',
    icon: IconHome,
    initiallyOpened: true,
    links: [
      { label: 'Agenda da Empresa', link: '/workspace/agenda', icon: IconCalendar },
      { label: 'Mapa de Países', link: '/workspace/mapa', icon: IconWorld },
    ],
  },
  {
      label: 'IA & Automações', 
      icon: IconActivity,
      initiallyOpened: false,
      links: [
        { label: 'Dashboard de Projetos', link: '/workspace/projetos', icon: IconRobot },  // NOVA
        { label: 'Relatórios & Análise', link: '/workspace/relatorios', icon: IconActivity }, // NOVA
        { label: 'Logs Gerais', link: '/workspace/logs', icon: IconActivity },
        { label: 'Nicochat', link: '/workspace/nicochat', icon: IconRobot },
        { label: 'N8N', link: '/workspace/n8n', icon: IconGitBranch },
      ],
  },
  {
    label: 'OPERACIONAL',
    icon: IconHeart,
    initiallyOpened: false,
    links: [
      { label: 'Engajamento', link: '/workspace/engajamento', icon: IconHeart },
      { label: 'Suporte', link: '/workspace/suporte', icon: IconHeadphones },
    ],
  },
];

// Componente de Logo personalizada
function Logo({ style }) {
  return (
    <Group gap="sm" style={style}>
      <Image
        src="/logo192.png"
        alt="ChegouHub Logo"
        width={32}
        height={32}
        fit="contain"
        fallbackSrc="data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3e%3crect width='32' height='32' rx='6' fill='%23fd7e14'/%3e%3ctext x='16' y='20' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold' font-size='12'%3eCH%3c/text%3e%3c/svg%3e"
      />
      <Box>
        <Text
          size="lg"
          fw={700}
          variant="gradient"
          gradient={{ from: 'orange', to: 'red', deg: 45 }}
        >
          ChegouHub
        </Text>
      </Box>
    </Group>
  );
}

export function DoubleNavbar({ userName, userEmail, onLogout, toggleColorScheme, colorScheme }) {
  // Criar os grupos com as props necessárias
  const links = navigationData.map((item) => (
    <LinksGroup
      {...item}
      key={item.label}
      activePage={null} // Pode ser implementado se necessário
      setActivePage={() => {}} // Pode ser implementado se necessário
      collapsed={false}
      activeMenu={null}
      setActiveMenu={() => {}}
    />
  ));

  return (
    <Box className={classes.navbar}>
      {/* Header com Logo e Versão */}
      <Box className={classes.header}>
        <Group justify="space-between">
          <Logo style={{ width: 180 }} />
          <Code fw={700} c="orange.6" size="xs">
            Centro de Comando
          </Code>
        </Group>
      </Box>

      {/* Área de Links com Scroll */}
      <ScrollArea className={classes.links}>
        <Box className={classes.linksInner}>{links}</Box>
      </ScrollArea>

      {/* Rodapé com Usuário */}
      <Box className={classes.footer}>
        <UserButton 
          userName={userName}
          userEmail={userEmail}
          onLogout={onLogout}
          toggleColorScheme={toggleColorScheme}
          colorScheme={colorScheme}
          collapsed={false}
        />
      </Box>
    </Box>
  );
}