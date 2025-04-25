// frontend/src/pages/WorkspacePage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { NavbarNested } from '../components/NavbarNested/NavbarNested';
import { Box, LoadingOverlay, Text, Title } from '@mantine/core';
import { IconAd, IconTools, IconChartInfographic, IconReceipt2, IconMap, IconCalendar } from '@tabler/icons-react';

// --- Importar as páginas reais ---
import MapaPage from './MapaPage';
import AgendaPage from './AgendaPage';
import GerarImagemPage from './GerarImagemPage'; // <<< Import da nova página

// Componente Placeholder
const PlaceholderPage = ({ pageTitle }) => (
    <Box p="md">
        <Title order={3}>{pageTitle || "Página"}</Title>
        <Text>Conteúdo placeholder para {pageTitle}.</Text>
    </Box>
);

// --- Dados da Navbar ---
const areasData = [
    { label: 'Agenda', icon: IconCalendar, link: '/workspace/agenda' },
    { label: 'Mapa', icon: IconMap, link: '/workspace/mapa' },
    {
        label: 'ADS', icon: IconAd, links: [
            { label: 'Visão Geral', link: '/workspace/ads/overview' },
            { label: 'Campanhas', link: '/workspace/ads/campaigns' },
            { label: 'Criar Anúncio', link: '/workspace/ads/create' },
            { label: 'Relatórios ADS', link: '/workspace/ads/reports' },
        ]
    },
    {
        label: 'Operacional', icon: IconTools, links: [
            { label: 'Ferramenta X', link: '/workspace/ops/tool-x' },
            { label: 'Entrada de Dados', link: '/workspace/ops/data-entry' },
            { label: 'Processos Y', link: '/workspace/ops/process-y' },
            { label: 'Automações', link: '/workspace/ops/automations' },
            // --- Link para a nova página ---
            { label: 'Gerar Imagem', link: '/workspace/operacional/gerar-imagem' },
            // --- Fim do link ---
        ]
    },
    {
        label: 'Métricas do Negócio', icon: IconChartInfographic, links: [
           { label: 'KPIs Principais', link: '/workspace/business/kpis' },
           { label: 'Visão Financeira', link: '/workspace/business/financial' },
           { label: 'Desempenho Setores', link: '/workspace/business/sectors' },
        ]
    },
    {
        label: 'Métricas de Vendas', icon: IconReceipt2, links: [
            { label: 'Vendas por Período', link: '/workspace/sales/period' },
            { label: 'Performance Vendedores', link: '/workspace/sales/sellers' },
            { label: 'Funil de Vendas', link: '/workspace/sales/funnel' },
        ]
    },
];

// Função para extrair a label ativa (pode precisar de ajustes finos)
const getActivePageLabelFromPathname = (pathname) => {
    const normalizedPathname = pathname.endsWith('/') && pathname.length > 11 ? pathname.slice(0, -1) : pathname;
    for (const area of areasData) {
        if (area.link && area.link === normalizedPathname) return area.label;
        if (area.links) {
            for (const subLink of area.links) {
                if (subLink.link && subLink.link === normalizedPathname) return subLink.label;
            }
        }
    }
    if (normalizedPathname === '/workspace') return null;
    const parts = normalizedPathname.split('/').filter(p => p);
    if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace('-', ' ');
    }
    return null;
};


function WorkspacePage({ setIsLoggedIn }) {
    const location = useLocation();
    const [activePageLabel, setActivePageLabel] = useState(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [errorSession, setErrorSession] = useState('');
    const [userName, setUserName] = useState('Usuário');
    const [userEmail, setUserEmail] = useState('');
    const [navbarCollapsed, setNavbarCollapsed] = useState(false);

    useEffect(() => {
        const label = getActivePageLabelFromPathname(location.pathname);
        setActivePageLabel(label);
    }, [location.pathname]);

    useEffect(() => {
        const fetchSessionData = async () => {
            setLoadingSession(true);
            setErrorSession('');
            try {
                // Axios já configurado globalmente com withCredentials
                const response = await axios.get('/current-state/');
                if (response.status === 200 && response.data?.logged_in) {
                    setUserName(response.data.name || response.data.email || 'Usuário');
                    setUserEmail(response.data.email || '');
                } else {
                    console.warn("API /current-state/ indica não logado ou resposta inválida. Forçando logout.");
                    setIsLoggedIn(false);
                    return;
                }
            } catch (err) {
                console.error("Erro ao buscar estado atual:", err.response || err.message);
                setErrorSession('Não foi possível carregar os dados da sessão. Tente fazer login novamente.');
                setIsLoggedIn(false);
            } finally {
                setLoadingSession(false);
            }
        };
        fetchSessionData();
    }, [setIsLoggedIn]);

    const handleLogout = async () => {
        console.log("Tentando logout...");
        setLoadingSession(true);
        try {
            // Axios já configurado globalmente com withCredentials
            await axios.post('/logout/', {});
            console.log("API de logout chamada com sucesso.");
        } catch (err) {
            console.error("Erro ao chamar API de logout:", err.response || err.message);
        } finally {
            setIsLoggedIn(false);
            // Não precisa setLoadingSession(false), componente será desmontado
        }
    };

    if (loadingSession) return <LoadingOverlay visible={true} overlayProps={{ radius: "sm", blur: 2 }} loaderProps={{ color: 'orange', type: 'bars' }} />;
    if (errorSession) return <Box p="xl" style={{ color: 'red', textAlign: 'center' }}>{errorSession}</Box>;

    return (
        <Box style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <NavbarNested
                activePage={activePageLabel}
                setActivePage={setActivePageLabel}
                userName={userName}
                userEmail={userEmail}
                onLogout={handleLogout}
                collapsed={navbarCollapsed}
                setCollapsed={setNavbarCollapsed}
                areasData={areasData}
            />

            {/* Área de Conteúdo Principal com ROTAS ANINHADAS */}
            <Box component="main" style={{ flexGrow: 1, overflowY: 'auto', backgroundColor: 'var(--mantine-color-gray-0)', height: '100vh' }}>
                 <Routes>
                    {/* Rota Index */}
                    <Route index element={
                        <Box p="md">
                            <Title order={3}>Bem-vindo ao Workspace!</Title>
                            <Text>Selecione uma opção no menu lateral.</Text>
                        </Box>
                    }/>

                    {/* Páginas Existentes */}
                    <Route path="agenda" element={<AgendaPage />} />
                    <Route path="mapa" element={<MapaPage />} />

                    {/* Rotas Placeholder (ADS, Operacional, etc.) */}
                    <Route path="ads/overview" element={<PlaceholderPage pageTitle="ADS - Visão Geral" />} />
                    <Route path="ads/campaigns" element={<PlaceholderPage pageTitle="ADS - Campanhas" />} />
                    <Route path="ads/create" element={<PlaceholderPage pageTitle="ADS - Criar Anúncio" />} />
                    <Route path="ads/reports" element={<PlaceholderPage pageTitle="ADS - Relatórios" />} />
                    <Route path="ops/tool-x" element={<PlaceholderPage pageTitle="Operacional - Ferramenta X" />} />
                    <Route path="ops/data-entry" element={<PlaceholderPage pageTitle="Operacional - Entrada de Dados" />} />
                    <Route path="ops/process-y" element={<PlaceholderPage pageTitle="Operacional - Processos Y" />} />
                    <Route path="ops/automations" element={<PlaceholderPage pageTitle="Operacional - Automações" />} />
                    <Route path="business/kpis" element={<PlaceholderPage pageTitle="Métricas Negócio - KPIs" />} />
                    <Route path="business/financial" element={<PlaceholderPage pageTitle="Métricas Negócio - Financeiro" />} />
                    <Route path="business/sectors" element={<PlaceholderPage pageTitle="Métricas Negócio - Setores" />} />
                    <Route path="sales/period" element={<PlaceholderPage pageTitle="Métricas Vendas - Período" />} />
                    <Route path="sales/sellers" element={<PlaceholderPage pageTitle="Métricas Vendas - Vendedores" />} />
                    <Route path="sales/funnel" element={<PlaceholderPage pageTitle="Métricas Vendas - Funil" />} />

                    {/* --- Rota para a nova página --- */}
                    <Route path="operacional/gerar-imagem" element={<GerarImagemPage />} />
                    {/* --- Fim da rota --- */}

                    {/* Rota Catch-all */}
                    <Route path="*" element={<Navigate to="/workspace" replace />} />
                 </Routes>
            </Box>
        </Box>
    );
}

export default WorkspacePage;