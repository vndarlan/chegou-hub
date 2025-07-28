// src/pages/WorkspacePage.js - MIGRADO PARA SHADCN/UI
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppSidebar } from '../components/app-sidebar';
import { SidebarProvider, SidebarInset } from '../components/ui/sidebar';
import { LoadingSpinner, Alert, AlertDescription } from '../components/ui';
import ProcessamentoPage from '../features/processamento/ProcessamentoPage';

// Páginas existentes (ainda usam Mantine)
import MapaPage from '../features/mapa/MapaPage';
import AgendaPage from '../features/agenda/AgendaPage';
import EngajamentoPage from '../features/engajamento/EngajamentoPage';

// Páginas de IA
import LogsPage from '../features/ia/LogsPage';
import NicochatPage from '../features/ia/NicochatPage';
import N8NPage from '../features/ia/N8NPage';
import ProjetoDashboard from '../features/ia/ProjetoDashboard';
import RelatoriosProjetos from '../features/ia/RelatoriosProjetos';

// Páginas de MÉTRICAS
import PrimecodPage from '../features/metricas/PrimecodPage';
import EcomhubPage from '../features/metricas/EcomhubPage';
import DropiPage from '../features/metricas/DropiPage';

// Página de NOVELTIES
import NoveltiesPage from '../features/novelties/NoveltiesPage';

function WorkspacePage({ setIsLoggedIn }) {
    const [loadingSession, setLoadingSession] = useState(true);
    const [errorSession, setErrorSession] = useState('');
    const [userName, setUserName] = useState('Usuário');
    const [userEmail, setUserEmail] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const fetchSessionData = async () => {
            setLoadingSession(true);
            setErrorSession('');
            try {
                const response = await axios.get('/current-state/');
                if (response.status === 200 && response.data?.logged_in) {
                    setUserName(response.data.name || response.data.email || 'Usuário');
                    setUserEmail(response.data.email || '');
                    setIsAdmin(response.data.is_admin || false);
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

    if (loadingSession) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-background">
                <div className="flex flex-col items-center space-y-4">
                    <LoadingSpinner className="h-8 w-8 text-primary" />
                    <p className="text-sm text-muted-foreground">Carregando sessão...</p>
                </div>
            </div>
        );
    }

    if (errorSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Alert className="max-w-md">
                    <AlertDescription className="text-destructive">
                        {errorSession}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <AppSidebar
                userName={userName}
                userEmail={userEmail}
                onLogout={handleLogout}
                isAdmin={isAdmin}
            />
            <SidebarInset>
                <main className="flex-1 overflow-y-auto bg-background">
                    <Routes>
                        <Route index element={<Navigate to="/workspace/agenda" replace />} />

                        {/* Páginas HOME */}
                        <Route path="agenda" element={<AgendaPage />} />
                        <Route path="mapa" element={<MapaPage />} />

                        {/* Páginas IA & AUTOMAÇÕES */}
                        <Route path="logs" element={<LogsPage />} />
                        <Route path="nicochat" element={<NicochatPage />} />
                        <Route path="n8n" element={<N8NPage />} />
                        <Route path="projetos" element={<ProjetoDashboard />} />        
                        <Route path="relatorios" element={<RelatoriosProjetos />} />
                        <Route path="novelties" element={<NoveltiesPage />} />

                        {/* Páginas MÉTRICAS */}
                        <Route path="metricas/primecod" element={<PrimecodPage />} />
                        <Route path="metricas/ecomhub" element={<EcomhubPage />} />
                        <Route path="metricas/dropi" element={<DropiPage />} />

                        {/* Páginas OPERACIONAL */}
                        <Route path="engajamento" element={<EngajamentoPage />} />
                        
                        {/* Páginas SUPORTE */}
                        <Route path="processamento" element={<ProcessamentoPage />} /> 
                        
                        {/* Catch-all */}
                        <Route path="*" element={<Navigate to="/workspace/agenda" replace />} />
                    </Routes>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}

export default WorkspacePage;