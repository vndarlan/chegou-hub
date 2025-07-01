// frontend/src/features/ia/IAPage.js - ARQUIVO COMPLETO
import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Box, Tabs, Container } from '@mantine/core';
import LogsPage from './LogsPage';
import NicochatPage from './NicochatPage';
import N8NPage from './N8NPage';

function IAPage() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Determinar a tab ativa baseada na URL atual
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/nicochat')) return 'nicochat';
        if (path.includes('/n8n')) return 'n8n';
        return 'logs'; // Default para Logs Gerais
    };
    
    // Manipular mudança de tab
    const handleTabChange = (value) => {
        const basePath = '/workspace/ia-automacoes';
        switch (value) {
            case 'logs':
                navigate(`${basePath}/logs`);
                break;
            case 'nicochat':
                navigate(`${basePath}/nicochat`);
                break;
            case 'n8n':
                navigate(`${basePath}/n8n`);
                break;
            default:
                navigate(`${basePath}/logs`);
        }
    };

    return (
        <Box>
            {/* Tabs de Navegação */}
            <Container size="xl" px="md">
                <Tabs value={getActiveTab()} onChange={handleTabChange} variant="outline">
                    <Tabs.List>
                        <Tabs.Tab value="logs">
                            📊 Logs Gerais
                        </Tabs.Tab>
                        <Tabs.Tab value="nicochat">
                            🤖 Nicochat
                        </Tabs.Tab>
                        <Tabs.Tab value="n8n">
                            ⚙️ N8N
                        </Tabs.Tab>
                    </Tabs.List>
                </Tabs>
            </Container>
            
            {/* Conteúdo das Páginas */}
            <Box mt="md">
                <Routes>
                    <Route path="logs" element={<LogsPage />} />
                    <Route path="nicochat" element={<NicochatPage />} />
                    <Route path="n8n" element={<N8NPage />} />
                    {/* Rota padrão - redireciona para logs */}
                    <Route path="*" element={<LogsPage />} />
                </Routes>
            </Box>
        </Box>
    );
}

export default IAPage;