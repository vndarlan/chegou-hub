// src/pages/ProjetosIAPage.js
import React, { useState, useEffect} from 'react';
import axios from 'axios';
import {Title, LoadingOverlay, Alert, Container, Grid, Paper, Space } from '@mantine/core';
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
            const response = await axios.get('/api/aiprojects/');
            setProjects(response.data);
        } catch (err) {
            console.error("Erro ao buscar projetos de IA:", err);
            setError('Falha ao carregar os projetos. Tente recarregar a página.');
        } finally {
            setIsLoading(false);
        }
    };

    // Opcional: Buscar usuários para o Select do formulário
    // const fetchUsers = async () => {
    //     try {
    //         const response = await axios.get('/api/users/'); // Precisa criar este endpoint no backend
    //         setUsers(response.data.map(user => ({ value: user.id.toString(), label: user.email })));
    //     } catch (err) {
    //         console.error("Erro ao buscar usuários:", err);
    //         // Lidar com erro ou deixar o select desabilitado/com opções padrão
    //     }
    // };

    useEffect(() => {
        fetchProjects();
        // fetchUsers(); // Descomente se implementar a busca de usuários
    }, []);

    const handleProjectAdded = (newProject) => {
        // Adiciona o novo projeto à lista existente ou recarrega tudo
        // setProjects(prevProjects => [newProject, ...prevProjects]); // Adiciona no início
        fetchProjects(); // Mais simples: recarrega tudo para garantir consistência
    };

    return (
        <Container fluid p="md">
            <Title order={2} mb="lg">Projetos de IA</Title>

            <LoadingOverlay visible={isLoading} overlayProps={{ radius: "sm", blur: 2 }} />

            {error && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Erro!" color="red" mb="md">
                    {error}
                </Alert>
            )}

            {/* Dashboard */}
            {!isLoading && !error && projects.length > 0 && (
               <AIProjectDashboard projects={projects} />
            )}

             <Space h="xl" />

            <Grid>
                {/* Tabela de Projetos */}
                <Grid.Col span={{ base: 12, lg: 8 }}>
                    <Paper shadow="sm" p="md" withBorder>
                         <Title order={4} mb="md">Projetos Cadastrados</Title>
                        {!isLoading && !error && (
                            <AIProjectTable projects={projects} />
                        )}
                         {projects.length === 0 && !isLoading && <p>Nenhum projeto encontrado.</p>}
                    </Paper>
                </Grid.Col>

                {/* Formulário de Cadastro */}
                <Grid.Col span={{ base: 12, lg: 4 }}>
                     <Paper shadow="sm" p="md" withBorder>
                         <Title order={4} mb="md">Adicionar Novo Projeto</Title>
                        <AIProjectForm onProjectAdded={handleProjectAdded} /* users={users} */ />
                    </Paper>
                </Grid.Col>
            </Grid>

        </Container>
    );
}

export default ProjetosIAPage;