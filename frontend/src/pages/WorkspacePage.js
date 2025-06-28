// frontend/src/pages/WorkspacePage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { DoubleNavbar } from '../components/DoubleNavbar';
import { Box, LoadingOverlay, Text, Title } from '@mantine/core';

// --- Importar páginas das funcionalidades ---
import MapaPage from '../features/mapa/MapaPage';
import AgendaPage from '../features/agenda/AgendaPage';
import EngajamentoPage from '../features/engajamento/EngajamentoPage';

function WorkspacePage({ setIsLoggedIn, colorScheme, toggleColorScheme }) {
    const location = useLocation();
    const [loadingSession, setLoadingSession] = useState(true);
    const [errorSession, setErrorSession] = useState('');
    const [userName, setUserName] = useState('Usuário');
    const [userEmail, setUserEmail] = useState('');

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
            {/* Nova DoubleNavbar */}
            <DoubleNavbar
                userName={userName}
                userEmail={userEmail}
                onLogout={handleLogout}
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
                    {/* Rota Index - Página inicial quando entra em /workspace */}
                    <Route index element={
                        <Box p="md">
                            <Title order={2} mb="md">🏠 Bem-vindo ao Chegou Hub!</Title>
                            <Text size="lg" mb="xl">
                                Selecione uma área no menu lateral para começar.
                            </Text>
                            
                            <Box>
                                <Title order={3} mb="md">📋 Áreas Disponíveis:</Title>
                                <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                                    
                                    <Box p="md" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '8px' }}>
                                        <Title order={4}>🏠 Home</Title>
                                        <Text size="sm" c="dimmed">Agenda e Mapa</Text>
                                    </Box>
                                    
                                    <Box p="md" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '8px' }}>
                                        <Title order={4}>🤖 IA & Automações</Title>
                                        <Text size="sm" c="dimmed">Em breve</Text>
                                    </Box>
                                    
                                    <Box p="md" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '8px' }}>
                                        <Title order={4}>🔧 Operacional</Title>
                                        <Text size="sm" c="dimmed">Engajamento</Text>
                                    </Box>
                                    
                                    <Box p="md" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '8px' }}>
                                        <Title order={4}>🎧 Suporte</Title>
                                        <Text size="sm" c="dimmed">Em breve</Text>
                                    </Box>
                                    
                                </div>
                            </Box>
                        </Box>
                    }/>

                    {/* Páginas das Funcionalidades */}
                    <Route path="agenda" element={<AgendaPage />} />
                    <Route path="mapa" element={<MapaPage />} />
                    <Route path="engajamento" element={<EngajamentoPage />} />

                    {/* Placeholder para futuras páginas das novas áreas */}
                    <Route path="ia-automacoes/*" element={
                        <Box p="md">
                            <Title order={2}>🤖 IA & Automações</Title>
                            <Text>Esta seção estará disponível em breve com ferramentas de automação e inteligência artificial.</Text>
                        </Box>
                    }/>
                    
                    <Route path="suporte/*" element={
                        <Box p="md">
                            <Title order={2}>🎧 Suporte</Title>
                            <Text>Esta seção estará disponível em breve com ferramentas de suporte ao cliente.</Text>
                        </Box>
                    }/>

                    {/* Rota Catch-all */}
                    <Route path="*" element={<Navigate to="/workspace" replace />} />
                </Routes>
            </Box>
        </Box>
    );
}

export default WorkspacePage;