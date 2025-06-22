// frontend/src/pages/WorkspacePage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { NavbarNested } from '../components/NavbarNested/NavbarNested';
import { Box, LoadingOverlay, Text, Title } from '@mantine/core';
import {
  IconHome,
  IconMap,
  IconCalendar,
} from '@tabler/icons-react';

// --- Importar páginas das funcionalidades (CAMINHO CORRIGIDO) ---
import MapaPage from '../features/mapa/MapaPage';
import AgendaPage from '../features/agenda/AgendaPage';

// --- Dados da Navbar simplificados ---
const areasData = [
  { label: 'Home', icon: IconHome, link: '/workspace' },
  { label: 'Agenda', icon: IconCalendar, link: '/workspace/agenda' },
  { label: 'Mapa', icon: IconMap, link: '/workspace/mapa' },
];

// Função para extrair a label ativa
const getActivePageLabelFromPathname = (pathname) => {
    const normalizedPathname = pathname.endsWith('/') && pathname.length > 11 ? pathname.slice(0, -1) : pathname;
    for (const area of areasData) {
        if (area.link && area.link === normalizedPathname) return area.label;
    }
    if (normalizedPathname === '/workspace') return 'Home';
    const parts = normalizedPathname.split('/').filter(p => p);
    if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace('-', ' ');
    }
    return null;
};

function WorkspacePage({ setIsLoggedIn, colorScheme, toggleColorScheme }) {
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
            await axios.post('/logout/', {});
            console.log("API de logout chamada com sucesso.");
        } catch (err) {
            console.error("Erro ao chamar API de logout:", err.response || err.message);
        } finally {
            setIsLoggedIn(false);
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
                toggleColorScheme={toggleColorScheme}
                colorScheme={colorScheme}
            />

            {/* Área de Conteúdo Principal */}
            <Box 
                component="main" 
                style={{ 
                    flexGrow: 1, 
                    overflowY: 'auto', 
                    height: '100vh',
                    backgroundColor: 'var(--mantine-color-body)'
                }}
            >
                <Routes>
                    {/* Rota Index */}
                    <Route index element={
                        <Box p="md">
                            <Title order={3}>Bem-vindo ao Workspace!</Title>
                            <Text>Selecione uma opção no menu lateral.</Text>
                        </Box>
                    }/>

                    {/* Páginas das Funcionalidades */}
                    <Route path="agenda" element={<AgendaPage />} />
                    <Route path="mapa" element={<MapaPage />} />

                    {/* Rota Catch-all */}
                    <Route path="*" element={<Navigate to="/workspace" replace />} />
                </Routes>
            </Box>
        </Box>
    );
}

export default WorkspacePage;