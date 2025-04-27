// src/pages/ProjetosIAPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Title, LoadingOverlay, Alert, Tabs, Text, Paper } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import AIProjectTable from '../components/ProjetosIA/AIProjectTable';
import AIProjectForm from '../components/ProjetosIA/AIProjectForm';
import AIProjectDashboard from '../components/ProjetosIA/AIProjectDashboard';

// Versão extremamente simplificada para garantir build
function ProjetosIAPage() {
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const getProjects = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get('/aiprojects/');
                
                if (response && response.data) {
                    setProjects(response.data);
                } else {
                    setProjects([]);
                }
            } catch (err) {
                console.error("Erro ao buscar projetos:", err);
                setError("Não foi possível carregar os projetos. Tente novamente.");
            } finally {
                setIsLoading(false);
            }
        };

        getProjects();
    }, []);

    const handleProjectAdded = () => {
        // Recarregar a lista depois de adicionar um projeto
        axios.get('/aiprojects/')
            .then(response => {
                if (response && response.data) {
                    setProjects(response.data);
                }
            })
            .catch(err => {
                console.error("Erro ao atualizar projetos:", err);
            });
    };

    return (
        <Container fluid p="md">
            <Title order={2} mb="lg">Projetos de IA</Title>

            {isLoading && <LoadingOverlay visible={true} />}
            
            {error && (
                <Alert icon={<IconAlertCircle size="1rem" />} color="red" mb="lg">
                    {error}
                </Alert>
            )}

            <Tabs defaultValue="dashboard">
                <Tabs.List>
                    <Tabs.Tab value="dashboard">Dashboard</Tabs.Tab>
                    <Tabs.Tab value="table">Tabela</Tabs.Tab>
                    <Tabs.Tab value="add">Adicionar Projeto</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="dashboard" pt="md">
                    {!isLoading && !error && projects.length > 0 ? (
                        <AIProjectDashboard projects={projects} />
                    ) : !isLoading && (
                        <Paper withBorder p="lg" radius="md" mt="md">
                            <Text align="center">
                                Nenhum projeto encontrado. Adicione seu primeiro projeto na aba "Adicionar Projeto".
                            </Text>
                        </Paper>
                    )}
                </Tabs.Panel>

                <Tabs.Panel value="table" pt="md">
                    {!isLoading && (
                        <AIProjectTable projects={projects} />
                    )}
                </Tabs.Panel>

                <Tabs.Panel value="add" pt="md">
                    <AIProjectForm onProjectAdded={handleProjectAdded} />
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
}

export default ProjetosIAPage;