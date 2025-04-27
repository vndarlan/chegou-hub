// src/pages/ProjetosIAPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Title, LoadingOverlay, Alert, Tabs, rem, Text, Paper } from '@mantine/core';
import { IconAlertCircle, IconLayoutDashboard, IconSquarePlus, IconTable } from '@tabler/icons-react';
import AIProjectTable from '../components/ProjetosIA/AIProjectTable';
import AIProjectForm from '../components/ProjetosIA/AIProjectForm';
import AIProjectDashboard from '../components/ProjetosIA/AIProjectDashboard';

function ProjetosIAPage() {
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [refreshKey, setRefreshKey] = useState(0); // Para forçar re-renders

    const fetchProjects = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await axios.get('/aiprojects/');
            setProjects(response.data);
        } catch (err) {
            console.error("Erro ao buscar projetos de IA:", err);
            setError('Falha ao carregar os projetos. Verifique a conexão ou a URL da API.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [refreshKey]);

    const handleProjectAdded = (newProject) => {
        // Recarrega a lista e muda para a aba do dashboard para mostrar os novos dados
        setRefreshKey(prevKey => prevKey + 1);
        setActiveTab('dashboard');
    };

    const iconStyle = { width: rem(16), height: rem(16) };

    return (
        <Container fluid p="md">
            <Title order={2} mb="lg">Projetos de IA</Title>

            <LoadingOverlay visible={isLoading} overlayProps={{ radius: "sm", blur: 2 }} />

            {error && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Erro!" color="red" mb="md">
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                    <Tabs.Tab value="dashboard" leftSection={<IconLayoutDashboard style={iconStyle} />}>
                        Dashboard
                    </Tabs.Tab>
                    <Tabs.Tab value="table" leftSection={<IconTable style={iconStyle} />}>
                        Tabela
                    </Tabs.Tab>
                    <Tabs.Tab value="add" leftSection={<IconSquarePlus style={iconStyle} />}>
                        Adicionar Projeto
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="dashboard" pt="lg">
                    {/* Dashboard */}
                    {!isLoading && !error ? (
                        projects.length > 0 ? (
                            <AIProjectDashboard projects={projects} />
                        ) : (
                            <Paper withBorder p="xl" radius="md" style={{ textAlign: 'center' }}>
                                <Text size="lg" mb="md">Nenhum projeto encontrado</Text>
                                <Text c="dimmed">Adicione seu primeiro projeto clicando na aba "Adicionar Projeto"</Text>
                            </Paper>
                        )
                    ) : null}
                </Tabs.Panel>

                <Tabs.Panel value="table" pt="lg">
                    {/* Tabela de Projetos */}
                    <Title order={4} mb="md">Projetos Cadastrados</Title>
                    {!isLoading && !error && (
                        <AIProjectTable projects={projects} />
                    )}
                </Tabs.Panel>

                <Tabs.Panel value="add" pt="lg">
                     {/* Formulário de Cadastro */}
                     <AIProjectForm onProjectAdded={handleProjectAdded} />
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
}

export default ProjetosIAPage;