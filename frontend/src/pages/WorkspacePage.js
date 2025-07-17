// frontend/src/pages/WorkspacePage.js - VERSÃO ATUALIZADA COM ADMIN
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DoubleNavbar } from '../components/DoubleNavbar';
import { Box, LoadingOverlay, Title, Text } from '@mantine/core';
import ProcessamentoPage from '../features/processamento/ProcessamentoPage';

// --- Importar páginas das funcionalidades existentes ---
import MapaPage from '../features/mapa/MapaPage';
import AgendaPage from '../features/agenda/AgendaPage';
import EngajamentoPage from '../features/engajamento/EngajamentoPage';

// --- Importar páginas de IA ---
import LogsPage from '../features/ia/LogsPage';
import NicochatPage from '../features/ia/NicochatPage';
import N8NPage from '../features/ia/N8NPage';
import ProjetoDashboard from '../features/ia/ProjetoDashboard';
import RelatoriosProjetos from '../features/ia/RelatoriosProjetos';

// --- Importar páginas de MÉTRICAS ---
import PrimecodPage from '../features/metricas/PrimecodPage';
import EcomhubPage from '../features/metricas/EcomhubPage';

// --- Importar página de NOVELTIES ---
import NoveltiesPage from '../features/novelties/NoveltiesPage';

function WorkspacePage({ setIsLoggedIn, colorScheme, toggleColorScheme }) {
    const [loadingSession, setLoadingSession] = useState(true);
    const [errorSession, setErrorSession] = useState('');
    const [userName, setUserName] = useState('Usuário');
    const [userEmail, setUserEmail] = useState('');
    const [isAdmin, setIsAdmin] = useState(false); // NOVO ESTADO

    useEffect(() => {
        const fetchSessionData = async () => {
            setLoadingSession(true);
            setErrorSession('');
            try {
                const response = await axios.get('/current-state/');
                if (response.status === 200 && response.data?.logged_in) {
                    setUserName(response.data.name || response.data.email || 'Usuário');
                    setUserEmail(response.data.email || '');
                    setIsAdmin(response.data.is_admin || false); // NOVA LINHA
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
            {/* DoubleNavbar */}
            <DoubleNavbar
                userName={userName}
                userEmail={userEmail}
                onLogout={handleLogout}
                toggleColorScheme={toggleColorScheme}
                colorScheme={colorScheme}
                isAdmin={isAdmin} // NOVA PROP
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
                    {/* Rota Index - Redireciona direto para Agenda */}
                    <Route index element={<Navigate to="/workspace/agenda" replace />} />

                    {/* Páginas da área HOME */}
                    <Route path="agenda" element={<AgendaPage />} />
                    <Route path="mapa" element={<MapaPage />} />

                    {/* 🤖 Páginas da área IA & AUTOMAÇÕES */}
                    <Route path="logs" element={<LogsPage />} />
                    <Route path="nicochat" element={<NicochatPage />} />
                    <Route path="n8n" element={<N8NPage />} />
                    <Route path="projetos" element={<ProjetoDashboard />} />        
                    <Route path="relatorios" element={<RelatoriosProjetos />} />
                    <Route path="novelties" element={<NoveltiesPage />} />

                    {/* 📊 Páginas da área MÉTRICAS */}
                    <Route path="metricas/primecod" element={<PrimecodPage />} />
                    <Route path="metricas/ecomhub" element={<EcomhubPage />} />


                    {/* Páginas da área OPERACIONAL */}
                    <Route path="engajamento" element={<EngajamentoPage />} />
                    
                    {/* Placeholder para Suporte */}
                    <Route path="processamento" element={<ProcessamentoPage />} /> {/* NOVA LINHA ADICIONADA */}
                    <Route path="suporte" element={
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

                    {/* Rota Catch-all - Redireciona para Agenda */}
                    <Route path="*" element={<Navigate to="/workspace/agenda" replace />} />
                </Routes>
            </Box>
        </Box>
    );
}

export default WorkspacePage;