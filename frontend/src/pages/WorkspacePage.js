// frontend/src/pages/WorkspacePage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { NavbarNested } from '../components/NavbarNested/NavbarNested';
import { Box, LoadingOverlay, Text, Title } from '@mantine/core';
import {
  IconHome,
  IconAd,
  IconTools,
  IconChartInfographic,
  IconTruck,
  IconChartBar,
  IconMap,
  IconCalendar,
  IconBrandFacebook,
  IconBrandGoogle,
  IconRobot,
  IconStar,
  IconPhoto,
  IconMessageCircle,
  // Substituições para ícones incompatíveis
  IconBug, // Em vez de IconBrandJira
  IconRocket,
  IconMessages, // Em vez de IconMessageChatbot
  IconEye,
  IconShoppingCart,
  IconPackage,
  IconShoppingBag, // Em vez de IconBrandShopee
  IconBrandTiktok
} from '@tabler/icons-react';

// --- Importar as páginas reais ---
import MapaPage from './MapaPage';
import AgendaPage from './AgendaPage';
import GerarImagemPage from './GerarImagemPage'; // Import da página existente

// Componente Placeholder
const PlaceholderPage = ({ pageTitle }) => (
    <Box p="md">
        <Title order={3}>{pageTitle || "Página"}</Title>
        <Text>Conteúdo placeholder para {pageTitle}.</Text>
    </Box>
);

// --- Dados da Navbar atualizados com ícones compatíveis ---
const areasData = [
  { label: 'Home', icon: IconHome, link: '/workspace' },
  { label: 'Agenda', icon: IconCalendar, link: '/workspace/agenda' },
  { label: 'Mapa', icon: IconMap, link: '/workspace/mapa' },
  {
    label: 'ADS', icon: IconAd, links: [
      { label: 'Gerenciador Facebook', icon: IconBrandFacebook, link: '/workspace/ads/gerenciador-facebook' },
      { label: 'Subir Campanhas Facebook', icon: IconBrandFacebook, link: '/workspace/ads/campanhas-facebook' },
      { label: 'Gerenciador Google', icon: IconBrandGoogle, link: '/workspace/ads/gerenciador-google' },
      { label: 'Subir Campanhas Google', icon: IconBrandGoogle, link: '/workspace/ads/campanhas-google' },
    ]
  },
  {
    label: 'Operacional', icon: IconTools, links: [
      { label: 'Moderação Automática', icon: IconRobot, link: '/workspace/operacional/moderacao-automatica' },
      { label: 'Novelties', icon: IconStar, link: '/workspace/operacional/novelties' },
      { label: 'Gerar Imagem', icon: IconPhoto, link: '/workspace/operacional/gerar-imagem' },
      { label: 'Engajamento', icon: IconMessageCircle, link: '/workspace/operacional/engajamento' },
    ]
  },
  {
    label: 'Métricas do Negócio', icon: IconChartInfographic, links: [
      { label: 'Jira', icon: IconBug, link: '/workspace/business/jira' }, // Substituído IconBrandJira
      { label: 'Projetos IA', icon: IconRocket, link: '/workspace/business/projetos-ia' },
      { label: 'Nicochat', icon: IconMessages, link: '/workspace/business/nicochat' }, // Substituído IconMessageChatbot
    ]
  },
  {
    label: 'Métricas de Fornecedores', icon: IconTruck, links: [
      { label: 'Visão Geral', icon: IconEye, link: '/workspace/fornecedores/visao-geral' },
      { label: 'Dropi', icon: IconShoppingCart, link: '/workspace/fornecedores/dropi' },
      { label: 'Prime COD', icon: IconPackage, link: '/workspace/fornecedores/prime-cod' },
      { label: 'Shopify', icon: IconShoppingBag, link: '/workspace/fornecedores/shopify' }, // Substituído IconBrandShopee
    ]
  },
  {
    label: 'Métricas de Anúncios', icon: IconChartBar, links: [
      { label: 'Visão Geral', icon: IconEye, link: '/workspace/anuncios/visao-geral' },
      { label: 'Facebook', icon: IconBrandFacebook, link: '/workspace/anuncios/facebook' },
      { label: 'Google', icon: IconBrandGoogle, link: '/workspace/anuncios/google' },
      { label: 'Tiktok', icon: IconBrandTiktok, link: '/workspace/anuncios/tiktok' }, // Substituído IconBrandTiktok
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
    if (normalizedPathname === '/workspace') return 'Home';
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

                    {/* ADS */}
                    <Route path="ads/gerenciador-facebook" element={<PlaceholderPage pageTitle="ADS - Gerenciador Facebook" />} />
                    <Route path="ads/campanhas-facebook" element={<PlaceholderPage pageTitle="ADS - Subir Campanhas Facebook" />} />
                    <Route path="ads/gerenciador-google" element={<PlaceholderPage pageTitle="ADS - Gerenciador Google" />} />
                    <Route path="ads/campanhas-google" element={<PlaceholderPage pageTitle="ADS - Subir Campanhas Google" />} />

                    {/* Operacional */}
                    <Route path="operacional/moderacao-automatica" element={<PlaceholderPage pageTitle="Operacional - Moderação Automática" />} />
                    <Route path="operacional/novelties" element={<PlaceholderPage pageTitle="Operacional - Novelties" />} />
                    <Route path="operacional/gerar-imagem" element={<GerarImagemPage />} />
                    <Route path="operacional/engajamento" element={<PlaceholderPage pageTitle="Operacional - Engajamento" />} />

                    {/* Métricas do Negócio */}
                    <Route path="business/jira" element={<PlaceholderPage pageTitle="Métricas do Negócio - Jira" />} />
                    <Route path="business/projetos-ia" element={<PlaceholderPage pageTitle="Métricas do Negócio - Projetos IA" />} />
                    <Route path="business/nicochat" element={<PlaceholderPage pageTitle="Métricas do Negócio - Nicochat" />} />

                    {/* Métricas de Fornecedores */}
                    <Route path="fornecedores/visao-geral" element={<PlaceholderPage pageTitle="Métricas de Fornecedores - Visão Geral" />} />
                    <Route path="fornecedores/dropi" element={<PlaceholderPage pageTitle="Métricas de Fornecedores - Dropi" />} />
                    <Route path="fornecedores/prime-cod" element={<PlaceholderPage pageTitle="Métricas de Fornecedores - Prime COD" />} />
                    <Route path="fornecedores/shopify" element={<PlaceholderPage pageTitle="Métricas de Fornecedores - Shopify" />} />

                    {/* Métricas de Anúncios */}
                    <Route path="anuncios/visao-geral" element={<PlaceholderPage pageTitle="Métricas de Anúncios - Visão Geral" />} />
                    <Route path="anuncios/facebook" element={<PlaceholderPage pageTitle="Métricas de Anúncios - Facebook" />} />
                    <Route path="anuncios/google" element={<PlaceholderPage pageTitle="Métricas de Anúncios - Google" />} />
                    <Route path="anuncios/tiktok" element={<PlaceholderPage pageTitle="Métricas de Anúncios - TikTok" />} />

                    {/* Rota Catch-all */}
                    <Route path="*" element={<Navigate to="/workspace" replace />} />
                 </Routes>
            </Box>
        </Box>
    );
}

export default WorkspacePage;