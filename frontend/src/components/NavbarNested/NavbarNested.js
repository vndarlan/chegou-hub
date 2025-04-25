// frontend/src/components/NavbarNested/NavbarNested.js
import React from 'react';
import { Group, ScrollArea, ActionIcon, Tooltip, Text, Divider, Box } from '@mantine/core';
// Importa todos os ícones necessários
import {
  IconAd,
  IconTools,
  IconChartInfographic,
  IconTruck,
  IconChartBar,
  IconMap,
  IconCalendar,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarRightCollapse,
  IconHome,
  IconBrandFacebook,
  IconBrandGoogle,
  IconRobot,
  IconStar,
  IconPhoto,
  IconMessageCircle,
  IconBug,
  IconRocket,
  IconMessages,
  IconEye,
  IconShoppingCart,
  IconPackage,
  IconShoppingBag,
  // Usando o BrandTikTok (com T maiúsculo) que é mais provável estar disponível
  IconBrandTiktok
} from '@tabler/icons-react';
// Importa componentes filhos
import { LinksGroup } from './LinksGroup';
import { UserButton } from './UserButton';
import { Logo } from './Logo';
// Importa CSS Module
import classes from './NavbarNested.module.css';

// --- NOVA ESTRUTURA DA NAVBAR ---
const areasDataLocal = [
  { label: 'Home', icon: IconHome, link: '/workspace' },
  { label: 'Agenda', icon: IconCalendar, link: '/workspace/agenda' },
  { label: 'Mapa', icon: IconMap, link: '/workspace/mapa' },
  {
    label: 'ADS', icon: IconAd, links: [
      { label: 'Gerenciador Facebook', icon: IconBrandFacebook, link: '/workspace/ads/gerenciador-facebook' },
      { label: 'Subir Campanhas Facebook', icon: IconBrandFacebook, link: '/workspace/ads/campanhas-facebook' },
      { label: 'Gerenciador Google', icon: IconBrandGoogle, link: '/workspace/ads/gerenciador-google' },
      { label: 'Subir Campanhas Google', icon: IconBrandGoogle, link: '/workspace/ads/campanhas-google' },
    ],
  },
  {
    label: 'Operacional', icon: IconTools, links: [
      { label: 'Moderação Automática', icon: IconRobot, link: '/workspace/operacional/moderacao-automatica' },
      { label: 'Novelties', icon: IconStar, link: '/workspace/operacional/novelties' },
      { label: 'Gerar Imagem', icon: IconPhoto, link: '/workspace/operacional/gerar-imagem' },
      { label: 'Engajamento', icon: IconMessageCircle, link: '/workspace/operacional/engajamento' },
    ],
  },
  {
    label: 'Métricas do Negócio', icon: IconChartInfographic, links: [
      { label: 'Jira', icon: IconBug, link: '/workspace/business/jira' },
      { label: 'Projetos IA', icon: IconRocket, link: '/workspace/business/projetos-ia' },
      { label: 'Nicochat', icon: IconMessages, link: '/workspace/business/nicochat' },
    ],
  },
  {
    label: 'Métricas de Fornecedores', icon: IconTruck, links: [
      { label: 'Visão Geral', icon: IconEye, link: '/workspace/fornecedores/visao-geral' },
      { label: 'Dropi', icon: IconShoppingCart, link: '/workspace/fornecedores/dropi' },
      { label: 'Prime COD', icon: IconPackage, link: '/workspace/fornecedores/prime-cod' },
      { label: 'Shopify', icon: IconShoppingBag, link: '/workspace/fornecedores/shopify' },
    ],
  },
  {
    label: 'Métricas de Anúncios', icon: IconChartBar, links: [
      { label: 'Visão Geral', icon: IconEye, link: '/workspace/anuncios/visao-geral' },
      { label: 'Facebook', icon: IconBrandFacebook, link: '/workspace/anuncios/facebook' },
      { label: 'Google', icon: IconBrandGoogle, link: '/workspace/anuncios/google' },
      { label: 'Tiktok', icon: IconBrandTiktok, link: '/workspace/anuncios/tiktok' }, // Corrigido para TikTok
    ],
  },
];

export function NavbarNested({
    activePage,
    setActivePage,
    userName,
    userEmail,
    onLogout,
    collapsed,
    setCollapsed,
    areasData: areasDataFromProps
}) {
    // Decide quais dados usar: os passados via props ou os locais
    const dataToUse = areasDataFromProps || areasDataLocal;

    // Mapeia os dados para componentes LinksGroup
    const links = dataToUse.map((item) => (
        <LinksGroup
            {...item}
            key={item.label}
            activePage={activePage}
            setActivePage={setActivePage}
            collapsed={collapsed}
            link={item.link}
        />
    ));

    // Renderiza a estrutura da Navbar
    return (
        <nav className={`${classes.navbar} ${collapsed ? classes.navbarCollapsed : ''}`}>
            {/* Cabeçalho: Logo, Título, Versão e botão de colapsar */}
            <div className={classes.header}>
                <Group justify="space-between" align="center" wrap='nowrap' mb="xs">
                    <Group>
                        {/* Logo sempre visível */}
                        <Logo style={{ flexShrink: 0, width: collapsed ? 30 : 40 }} />
                        
                        {/* Título e versão - apenas visível quando não estiver colapsado */}
                        {!collapsed && (
                            <div className={classes.titleContainer}>
                                <Text fw={700} size="lg">Chegou Hub</Text>
                                <Text size="xs" c="dimmed">v1.0.0</Text>
                            </div>
                        )}
                    </Group>
                    
                    {/* Botão de Colapsar/Expandir */}
                    <Tooltip label={collapsed ? "Expandir" : "Recolher"} position="right" withArrow>
                        <ActionIcon
                            onClick={() => setCollapsed((c) => !c)}
                            variant="default"
                            size="lg"
                            className={classes.collapseToggle}
                            aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
                        >
                            {/* Mostra ícone diferente dependendo do estado */}
                            {collapsed ? <IconLayoutSidebarRightCollapse size="1.1rem" stroke={1.5}/> : <IconLayoutSidebarLeftCollapse size="1.1rem" stroke={1.5}/>}
                        </ActionIcon>
                    </Tooltip>
                </Group>
                
                {/* Linha divisória após o cabeçalho */}
                <Divider mb="sm" />
            </div>

            {/* Área de Links com Scroll */}
            <ScrollArea className={classes.links} component="nav" role="navigation" aria-label="Navegação principal">
                {/* Renderiza os componentes LinksGroup gerados */}
                <div className={classes.linksInner}>{links}</div>
            </ScrollArea>

            {/* Rodapé: Informações do Usuário */}
            <div className={classes.footer}>
                <UserButton
                    userName={userName || "Carregando..."}
                    userEmail={userEmail || ""}
                    collapsed={collapsed}
                    onLogout={onLogout}
                />
            </div>
        </nav>
    );
}