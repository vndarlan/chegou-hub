// frontend/src/shared/components/NavbarNested/NavbarNested.js
import React, { useState } from 'react';
import { Group, ScrollArea, ActionIcon, Tooltip } from '@mantine/core';
import {
  IconMap,
  IconCalendar,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarRightCollapse,
  IconHome,
} from '@tabler/icons-react';
import { LinksGroup } from './LinksGroup';
import { UserButton } from './UserButton';
import { Logo } from './Logo';
import classes from './NavbarNested.module.css';

// --- ESTRUTURA SIMPLIFICADA (APENAS MAPA E AGENDA) ---
const areasDataLocal = [
  { label: 'Home', icon: IconHome, link: '/workspace' },
  { label: 'Agenda', icon: IconCalendar, link: '/workspace/agenda' },
  { label: 'Mapa', icon: IconMap, link: '/workspace/mapa' },
];

export function NavbarNested({
  activePage,
  setActivePage,
  userName,
  userEmail,
  onLogout,
  collapsed,
  setCollapsed,
  areasData: areasDataFromProps,
  toggleColorScheme,
  colorScheme
}) {
    const dataToUse = areasDataFromProps || areasDataLocal;
    const [activeMenu, setActiveMenu] = useState(null);
    
    const links = dataToUse.map((item) => (
        <LinksGroup
            {...item}
            key={item.label}
            activePage={activePage}
            setActivePage={setActivePage}
            collapsed={collapsed}
            link={item.link}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
        />
    ));

    return (
        <nav className={`${classes.navbar} ${collapsed ? classes.navbarCollapsed : ''}`}>
            {/* Cabeçalho: Logo e botão de colapsar */}
            <div className={classes.header}>
                <Group justify="space-between" align="center" wrap='nowrap'>
                    {!collapsed && <Logo style={{ flexShrink: 0 }} />}
                    <Tooltip label={collapsed ? "Expandir" : "Recolher"} position="right" withArrow>
                        <ActionIcon
                            onClick={() => setCollapsed((c) => !c)}
                            variant="default"
                            size="lg"
                            className={classes.collapseToggle}
                            aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
                        >
                            {collapsed ? <IconLayoutSidebarRightCollapse size="1.1rem" stroke={1.5}/> : <IconLayoutSidebarLeftCollapse size="1.1rem" stroke={1.5}/>}
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </div>
            <div className={classes.headerDivider}></div>
    
            {/* Área de Links com Scroll */}
            <ScrollArea className={classes.links} component="nav" role="navigation" aria-label="Navegação principal">
                <div className={classes.linksInner}>{links}</div>
            </ScrollArea>
    
            {/* Rodapé: Informações do Usuário */}
            <div className={classes.footer}>
                <div className={classes.footerDivider}></div>
                <UserButton
                    userName={userName || "Carregando..."}
                    userEmail={userEmail || ""}
                    collapsed={collapsed}
                    onLogout={onLogout}
                    toggleColorScheme={toggleColorScheme}
                    colorScheme={colorScheme}
                />
            </div>
        </nav>
    );
}