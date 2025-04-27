// src/components/ProjetosIA/AIProjectDashboard.js
import React, { useMemo } from 'react';
import { Grid, Paper, Text, Title, Center, Group, Select, Box, Space } from '@mantine/core';
import { BarChart, PieChart } from '@mantine/charts';
import { format, parseISO, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    // Dados totais e por status
    const { totalProjects, statusCounts } = useMemo(() => {
        const counts = {};
        Object.keys(statusColors).forEach(s => counts[s] = 0);
        
        projects.forEach(project => {
            if (counts.hasOwnProperty(project.status)) {
                counts[project.status]++;
            } else {
                counts[project.status] = 1;
            }
        });
        
        return { 
            totalProjects: projects.length,
            statusCounts: counts
        };
    }, [projects]);

    // Dados para o Gráfico de Pizza
    const pieChartData = useMemo(() => {
        return Object.entries(statusCounts)
            .filter(([name, count]) => count > 0)
            .map(([name, count]) => ({
                name,
                value: count,
                color: statusColors[name] || 'gray',
            }));
    }, [statusCounts]);

    // Dados para gráfico de criadores
    const creatorData = useMemo(() => {
        const counts = {};
        
        projects.forEach(project => {
            if (project.creator_names) {
                const creatorNames = project.creator_names.split(',');
                creatorNames.forEach(name => {
                    const trimmedName = name.trim();
                    counts[trimmedName] = (counts[trimmedName] || 0) + 1;
                });
            } else {
                counts['Não especificado'] = (counts['Não especificado'] || 0) + 1;
            }
        });
        
        return Object.entries(counts)
            .sort(([, countA], [, countB]) => countB - countA)
            .slice(0, 10)
            .map(([name, count]) => ({
                creator: name,
                Projetos: count,
            }));
    }, [projects]);

    // Componente para mostrar cards de métricas
    const StatCard = ({ title, value, color = "blue" }) => (
        <Paper withBorder p="md" radius="md" style={{ height: '100%' }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{title}</Text>
            <Text fw={700} size="xl" c={color}>{value}</Text>
        </Paper>
    );

    return (
        <Box mb="xl">
            <Title order={3} mb="md">Dashboard de Projetos</Title>
            
            {/* Cards de Métricas */}
            <Grid mb="md">
                <Grid.Col span={{ base: 12, xs: 6, sm: 4, md: 2 }}>
                    <StatCard title="Total" value={totalProjects} color="blue" />
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

            <Space h="lg" />

            <Grid>
                {/* Gráfico de Pizza - Distribuição por Status */}
                <Grid.Col span={{ base: 12, md: 5 }}>
                    <Paper withBorder p="md" radius="md" h={300}>
                        <Title order={5} mb="md">Distribuição por Status</Title>
                        {pieChartData.length > 0 ? (
                            <PieChart
                                data={pieChartData}
                                withTooltip
                                h={200}
                                withLabels
                                withLabelsLine
                                paddingAngle={3}
                                style={{ width: '100%', height: '100%' }}
                            />
                        ) : (
                            <Center h={200}><Text c="dimmed">Sem dados para exibir</Text></Center>
                        )}
                    </Paper>
                </Grid.Col>

                {/* Gráfico de Barras - Projetos por Criador */}
                <Grid.Col span={{ base: 12, md: 7 }}>
                    <Paper withBorder p="md" radius="md" h={300}>
                        <Title order={5} mb="md">Projetos por Criador (Top 10)</Title>
                        {creatorData.length > 0 ? (
                            <BarChart
                                h={200}
                                data={creatorData}
                                dataKey="creator"
                                series={[{ name: 'Projetos', color: 'orange' }]}
                                tickLine="none"
                                gridAxis="none"
                                withLegend={false}
                                style={{ width: '100%', height: '100%' }}
                            />
                        ) : (
                            <Center h={200}><Text c="dimmed">Sem dados para exibir</Text></Center>
                        )}
                    </Paper>
                </Grid.Col>
            </Grid>
        </Box>
    );
}

export default AIProjectDashboard;