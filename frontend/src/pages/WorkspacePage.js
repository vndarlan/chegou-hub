// frontend/src/pages/WorkspacePage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { DoubleNavbar } from '../components/DoubleNavbar';
import { Box, LoadingOverlay, Title, Text } from '@mantine/core';

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
            {/* DoubleNavbar com estrutura corrigida */}
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
                    backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))',
                    borderLeft: '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))'
                }}
            >
                <Routes>
                    {/* Rota Index - Redireciona direto para Agenda (REMOVIDA PÁGINA DE BOAS-VINDAS) */}
                    <Route index element={<Navigate to="/workspace/agenda" replace />} />

                    {/* Páginas da área HOME */}
                    <Route path="agenda" element={<AgendaPage />} />
                    <Route path="mapa" element={<MapaPage />} />

                    {/* Páginas da área OPERACIONAL */}
                    <Route path="engajamento" element={<EngajamentoPage />} />

                    {/* Placeholder para futuras páginas das novas áreas */}
                    <Route path="ia-automacoes/*" element={
                        <Box p="xl" style={{ 
                            backgroundColor: 'light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))',
                            margin: '16px',
                            borderRadius: '8px',
                            border: '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))'
                        }}>
                            <Title order={2}>🤖 IA & Automações</Title>
                            <Text mt="md" c="dimmed">Esta seção estará disponível em breve com ferramentas de automação e inteligência artificial.</Text>
                        </Box>
                    }/>
                    
                    <Route path="suporte/*" element={
                        <Box p="xl" style={{ 
                            backgroundColor: 'light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))',
                            margin: '16px',
                            borderRadius: '8px',
                            border: '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))'
                        }}>
                            <Title order={2}>🎧 Suporte</Title>
                            <Text mt="md" c="dimmed">Esta seção estará disponível em breve com ferramentas de suporte ao cliente.</Text>
                        </Box>
                    }/>

                    {/* Rota Catch-all - Redireciona para Agenda (GARANTE QUE NÃO VOLTE PARA BOAS-VINDAS) */}
                    <Route path="*" element={<Navigate to="/workspace/agenda" replace />} />
                </Routes>
            </Box>
        </Box>
    );
}

export default WorkspacePage;