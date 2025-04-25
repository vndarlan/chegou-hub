// frontend/src/components/NavbarNested/NavbarNested.js
import React from 'react'; // Importar React
import { Group, ScrollArea, ActionIcon, Tooltip } from '@mantine/core';
// Importa todos os ícones necessários
import {
  IconAd,
  IconTools,
  IconChartInfographic,
  IconReceipt2,
  IconMap,
  IconCalendar, // Ícone da Agenda
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarRightCollapse,
} from '@tabler/icons-react';
// Importa componentes filhos
import { LinksGroup } from './LinksGroup';
import { UserButton } from './UserButton';
import { Logo } from './Logo';
// Importa CSS Module
import classes from './NavbarNested.module.css';

// --- DADOS LOCAIS DA NAVBAR ---
// Esta é uma cópia dos dados, usada como fallback se não vier via props.
// A ordem aqui define a ordem de exibição na barra lateral.
const areasDataLocal = [
  // Ordem ajustada: Agenda primeiro, depois Mapa
  { label: 'Agenda', icon: IconCalendar, link: '/workspace/agenda' },
  { label: 'Mapa', icon: IconMap, link: '/workspace/mapa' },
  {
    label: 'ADS', icon: IconAd, links: [
      { label: 'Visão Geral', link: '/workspace/ads/overview' },
      { label: 'Campanhas', link: '/workspace/ads/campaigns' },
      { label: 'Criar Anúncio', link: '/workspace/ads/create' },
      { label: 'Relatórios ADS', link: '/workspace/ads/reports' },
    ],
  },
  {
    label: 'Operacional', icon: IconTools, links: [
      { label: 'Ferramenta X', link: '/workspace/ops/tool-x' },
      { label: 'Entrada de Dados', link: '/workspace/ops/data-entry' },
      { label: 'Processos Y', link: '/workspace/ops/process-y' },
      { label: 'Automações', link: '/workspace/ops/automations' },
    ],
  },
   {
    label: 'Métricas do Negócio', icon: IconChartInfographic, links: [
      { label: 'KPIs Principais', link: '/workspace/business/kpis' },
      { label: 'Visão Financeira', link: '/workspace/business/financial' },
      { label: 'Desempenho Setores', link: '/workspace/business/sectors' },
    ],
  },
  {
    label: 'Métricas de Vendas', icon: IconReceipt2, links: [
      { label: 'Vendas por Período', link: '/workspace/sales/period' },
      { label: 'Performance Vendedores', link: '/workspace/sales/sellers' },
      { label: 'Funil de Vendas', link: '/workspace/sales/funnel' },
    ],
  },
];

// Componente NavbarNested
// Recebe props de WorkspacePage, incluindo 'areasData' (opcionalmente)
export function NavbarNested({
    activePage,          // Label da página ativa (para destaque visual)
    setActivePage,       // Função para definir label ativa (menos usada agora)
    userName,            // Nome do usuário logado
    userEmail,           // Email do usuário logado
    onLogout,            // Função de logout
    collapsed,           // Estado de colapso (true/false)
    setCollapsed,        // Função para alterar estado de colapso
    areasData: areasDataFromProps // Dados da navbar vindos via props (opcional)
}) {

    // Decide quais dados usar: os passados via props ou os locais
    const dataToUse = areasDataFromProps || areasDataLocal;

    // Mapeia os dados para componentes LinksGroup
    const links = dataToUse.map((item) => (
        <LinksGroup
            {...item} // Passa label, icon, links (array), etc.
            key={item.label}
            activePage={activePage}     // Passa label ativa para possível destaque interno
            setActivePage={setActivePage} // Passa função
            collapsed={collapsed}      // Passa estado de colapso
            link={item.link}           // Passa o link direto, se houver
        />
    ));

    // Renderiza a estrutura da Navbar
    return (
        <nav className={`${classes.navbar} ${collapsed ? classes.navbarCollapsed : ''}`}>
            {/* Cabeçalho: Logo e botão de colapsar */}
            <div className={classes.header}>
                <Group justify="space-between" align="center" wrap='nowrap'>
                    {/* Só mostra o logo se não estiver colapsado */}
                    {!collapsed && <Logo style={{ flexShrink: 0 }} />}
                    {/* Botão de Colapsar/Expandir */}
                    <Tooltip label={collapsed ? "Expandir" : "Recolher"} position="right" withArrow>
                        <ActionIcon
                            onClick={() => setCollapsed((c) => !c)} // Alterna o estado
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