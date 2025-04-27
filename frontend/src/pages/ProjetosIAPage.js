// src/pages/ProjetosIAPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Title, LoadingOverlay, Alert, Tabs, Text, Paper, Box } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import AIProjectTable from '../components/ProjetosIA/AIProjectTable';
import AIProjectForm from '../components/ProjetosIA/AIProjectForm';
import AIProjectDashboard from '../components/ProjetosIA/AIProjectDashboard';

function ProjetosIAPage() {
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchProjects = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await axios.get('/aiprojects/');
            setProjects(response.data || []);
        } catch (err) {
            console.error("Erro ao buscar projetos de IA:", err);
            setError('Falha ao carregar os projetos. Verifique sua conexão.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleProjectAdded = (newProject) => {
        fetchProjects();
    };

    return (
        <Container fluid p="md">
            <Title order={2} mb="lg">Projetos de IA</Title>

            <Box pos="relative" mb="md">
                <LoadingOverlay visible={isLoading} />
                
                {error && (
                    <Alert icon={<IconAlertCircle size="1rem" />} title="Erro!" color="red" mb="md">
                        {error}
                    </Alert>
                )}
            </Box>

            <Tabs defaultValue="dashboard">
                <Tabs.List>
                    <Tabs.Tab value="dashboard">Dashboard</Tabs.Tab>
                    <Tabs.Tab value="table">Tabela</Tabs.Tab>
                    <Tabs.Tab value="add">Adicionar Projeto</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="dashboard" pt="lg">
                    {!isLoading && !error && (
                        projects.length > 0 ? (
                            <AIProjectDashboard projects={projects} />
                        ) : (
                            <Paper withBorder p="xl" radius="md" style={{ textAlign: 'center' }}>
                                <Text>Nenhum projeto encontrado. Adicione seu primeiro projeto na aba "Adicionar Projeto".</Text>
                            </Paper>
                        )
                    )}
                </Tabs.Panel>

                <Tabs.Panel value="table" pt="lg">
                    {!isLoading && !error && (
                        <>
                            <Title order={4} mb="md">Projetos Cadastrados</Title>
                            <AIProjectTable projects={projects} />
                        </>
                    )}
                </Tabs.Panel>

                <Tabs.Panel value="add" pt="lg">
                    <AIProjectForm onProjectAdded={handleProjectAdded} />
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
}

export default ProjetosIAPage;