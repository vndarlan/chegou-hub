// src/components/ProjetosIA/AIProjectDashboard.js
import React from 'react';
import { Grid, Paper, Text, Title, Stack, Group } from '@mantine/core';

// Cores consistentes com a tabela
const statusColors = {
    'Ativo': 'green',
    'Em Manutenção': 'orange',
    'Arquivado': 'gray',
    'Backlog': 'blue',
    'Em Construção': 'yellow',
    'Período de Validação': 'pink',
};

function AIProjectDashboard({ projects = [] }) {
    // Contagem simples de status
    const statusCounts = {};
    Object.keys(statusColors).forEach(status => statusCounts[status] = 0);
    
    projects.forEach(project => {
        if (statusCounts.hasOwnProperty(project.status)) {
            statusCounts[project.status]++;
        }
    });
    
    // Contagem de projetos por criador
    const creatorCounts = {};
    projects.forEach(project => {
        if (project.creator_names) {
            const creators = project.creator_names.split(',');
            creators.forEach(creator => {
                const name = creator.trim();
                creatorCounts[name] = (creatorCounts[name] || 0) + 1;
            });
        }
    });
    
    const topCreators = Object.entries(creatorCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 5);

    // Card simples 
    const StatCard = ({ title, value, color = "blue" }) => (
        <Paper withBorder p="md" radius="md" style={{ height: '100%' }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{title}</Text>
            <Text fw={700} size="xl" c={color}>{value}</Text>
        </Paper>
    );

    return (
        <div>
            <Title order={3} mb="md">Dashboard de Projetos</Title>
            
            {/* Cards de Métricas */}
            <Grid mb="xl">
                <Grid.Col span={{ base: 12, xs: 6, sm: 4, md: 2 }}>
                    <StatCard title="Total" value={projects.length} color="blue" />
                </Grid.Col>
                {Object.entries(statusCounts).map(([status, count]) => (
                    count > 0 && (
                        <Grid.Col key={status} span={{ base: 12, xs: 6, sm: 4, md: 2 }}>
                            <StatCard 
                                title={status} 
                                value={count} 
                                color={statusColors[status] || 'dark'} 
                            />
                        </Grid.Col>
                    )
                ))}
            </Grid>

            {/* Informações sem usar gráficos */}
            <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper withBorder p="md" radius="md">
                        <Title order={5} mb="md">Distribuição por Status</Title>
                        <Stack spacing="xs">
                            {Object.entries(statusCounts)
                                .filter(([_, count]) => count > 0)
                                .map(([status, count]) => (
                                    <Group key={status} position="apart">
                                        <Group>
                                            <div style={{ 
                                                width: 16, 
                                                height: 16, 
                                                backgroundColor: `var(--mantine-color-${statusColors[status] || 'gray'}-6)`,
                                                borderRadius: '50%' 
                                            }} />
                                            <Text>{status}</Text>
                                        </Group>
                                        <Text fw={500}>
                                            {count} ({Math.round(count / projects.length * 100)}%)
                                        </Text>
                                    </Group>
                                ))
                            }
                        </Stack>
                    </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper withBorder p="md" radius="md">
                        <Title order={5} mb="md">Top 5 Criadores</Title>
                        <Stack spacing="xs">
                            {topCreators.map(([creator, count]) => (
                                <Group key={creator} position="apart">
                                    <Text>{creator}</Text>
                                    <Text fw={500}>{count} projeto(s)</Text>
                                </Group>
                            ))}
                            {topCreators.length === 0 && (
                                <Text c="dimmed">Nenhum criador encontrado</Text>
                            )}
                        </Stack>
                    </Paper>
                </Grid.Col>
            </Grid>
        </div>
    );
}

export default AIProjectDashboard;