// frontend/src/features/novelties/NoveltiesPage.js
import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Title, Text, Card, Group, Badge, Stack, Table, 
    LoadingOverlay, Alert, Tabs, Select, Button, Paper, 
    ActionIcon, Tooltip, Center, RingProgress, SimpleGrid
} from '@mantine/core';
import {
    IconRefresh, IconCalendar, IconTrendingUp, IconTrendingDown,
    IconClock, IconCheck, IconX, IconAlertTriangle, IconActivity,
    IconChartBar, IconFilter, IconEye
} from '@tabler/icons-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';

const STATUS_COLORS = {
    success: '#4CAF50',
    partial: '#FF9800', 
    failed: '#F44336',
    error: '#9C27B0'
};

const STATUS_ICONS = {
    success: IconCheck,
    partial: IconAlertTriangle,
    failed: IconX,
    error: IconActivity
};

function NoveltiesPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [recentExecutions, setRecentExecutions] = useState([]);
    const [trendsData, setTrendsData] = useState([]);
    const [canView, setCanView] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [filterPeriod, setFilterPeriod] = useState('7');

    // Verificar permissões
    useEffect(() => {
        const checkPermissions = async () => {
            try {
                const response = await axios.get('/api/novelties/check-permissions/');
                setCanView(response.data.can_view);
                if (!response.data.can_view) {
                    setError('Você não tem permissão para visualizar esta página.');
                    setLoading(false);
                }
            } catch (err) {
                console.error("Erro ao verificar permissões:", err);
                setCanView(false);
                setError('Erro ao verificar permissões de acesso.');
                setLoading(false);
            }
        };
        checkPermissions();
    }, []);

    // Carregar dados do dashboard
    useEffect(() => {
        if (!canView) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Buscar estatísticas do dashboard
                const [statsResponse, recentResponse, trendsResponse] = await Promise.all([
                    axios.get('/api/novelties/executions/dashboard_stats/'),
                    axios.get('/api/novelties/recent/', { params: { limit: 10 } }),
                    axios.get('/api/novelties/trends/', { params: { days: filterPeriod } })
                ]);

                setDashboardStats(statsResponse.data);
                setRecentExecutions(recentResponse.data);
                setTrendsData(trendsResponse.data.daily_data);

            } catch (err) {
                console.error("Erro ao carregar dados:", err);
                setError(`Erro ao carregar dados: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [canView, filterPeriod]);

    const handleRefresh = () => {
        window.location.reload();
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('pt-BR');
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            success: { color: 'green', label: 'Sucesso' },
            partial: { color: 'yellow', label: 'Parcial' },
            failed: { color: 'red', label: 'Falha' },
            error: { color: 'grape', label: 'Erro' }
        };
        const config = statusMap[status] || { color: 'gray', label: status };
        return <Badge color={config.color} variant="light">{config.label}</Badge>;
    };

    // Cards de estatísticas
    const StatsCards = () => {
        if (!dashboardStats) return null;

        const cards = [
            {
                title: 'Execuções Total',
                value: dashboardStats.total_executions,
                icon: IconActivity,
                color: 'blue'
            },
            {
                title: 'Novelties Processadas',
                value: dashboardStats.total_processed,
                icon: IconChartBar,
                color: 'green'
            },
            {
                title: 'Taxa de Sucesso',
                value: `${dashboardStats.success_rate}%`,
                icon: dashboardStats.success_rate >= 90 ? IconTrendingUp : IconTrendingDown,
                color: dashboardStats.success_rate >= 90 ? 'green' : 'orange'
            },
            {
                title: 'Tempo Médio',
                value: `${dashboardStats.avg_execution_time}min`,
                icon: IconClock,
                color: 'grape'
            }
        ];

        return (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                {cards.map((card, index) => (
                    <Card key={index} padding="lg" radius="md" withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text c="dimmed" size="sm" fw={500} style={{ textTransform: 'uppercase' }}>
                                    {card.title}
                                </Text>
                                <Text fw={700} size="xl">
                                    {card.value}
                                </Text>
                            </div>
                            <card.icon size={32} color={`var(--mantine-color-${card.color}-6)`} />
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>
        );
    };

    // Gráfico de tendências
    const TrendsChart = () => {
        if (!trendsData.length) return null;

        return (
            <Card padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                    <Title order={4}>📈 Tendência de Execuções</Title>
                    <Select
                        value={filterPeriod}
                        onChange={setFilterPeriod}
                        data={[
                            { value: '7', label: '7 dias' },
                            { value: '15', label: '15 dias' },
                            { value: '30', label: '30 dias' }
                        ]}
                        size="xs"
                        w={100}
                    />
                </Group>
                <Box style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="processed" stroke="#4CAF50" name="Processadas" />
                            <Line type="monotone" dataKey="successful" stroke="#2196F3" name="Sucessos" />
                            <Line type="monotone" dataKey="failed" stroke="#F44336" name="Falhas" />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            </Card>
        );
    };

    // Distribuição por status
    const StatusDistribution = () => {
        if (!dashboardStats?.status_distribution) return null;

        const data = Object.entries(dashboardStats.status_distribution).map(([status, count]) => ({
            name: status,
            value: count,
            color: STATUS_COLORS[status.toLowerCase()] || '#999'
        }));

        return (
            <Card padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">📊 Distribuição por Status</Title>
                <Box style={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="value"
                                label={({name, value}) => `${name}: ${value}`}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </Box>
            </Card>
        );
    };

    // Tabela de execuções recentes
    const RecentExecutionsTable = () => {
        if (!recentExecutions.length) {
            return (
                <Center py="xl">
                    <Text c="dimmed">Nenhuma execução encontrada</Text>
                </Center>
            );
        }

        return (
            <Table striped highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Data/Hora</Table.Th>
                        <Table.Th>País</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Processadas</Table.Th>
                        <Table.Th>Sucessos</Table.Th>
                        <Table.Th>Falhas</Table.Th>
                        <Table.Th>Taxa</Table.Th>
                        <Table.Th>Tempo</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {recentExecutions.map((execution) => (
                        <Table.Tr key={execution.id}>
                            <Table.Td>
                                <Text size="sm">
                                    {formatDateTime(execution.execution_date)}
                                </Text>
                            </Table.Td>
                            <Table.Td>
                                <Badge variant="outline">
                                    {execution.country.toUpperCase()}
                                </Badge>
                            </Table.Td>
                            <Table.Td>
                                {getStatusBadge(execution.status)}
                            </Table.Td>
                            <Table.Td>
                                <Text fw={500}>{execution.total_processed}</Text>
                            </Table.Td>
                            <Table.Td>
                                <Text c="green">{execution.successful}</Text>
                            </Table.Td>
                            <Table.Td>
                                <Text c="red">{execution.failed}</Text>
                            </Table.Td>
                            <Table.Td>
                                <Text c={execution.success_rate >= 90 ? "green" : "orange"}>
                                    {execution.success_rate}%
                                </Text>
                            </Table.Td>
                            <Table.Td>
                                <Text size="sm">{execution.execution_time_minutes}min</Text>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        );
    };

    if (!canView && !loading) {
        return (
            <Box p="xl">
                <Alert 
                    icon={<IconX size="1rem" />} 
                    title="Acesso Negado" 
                    color="red"
                >
                    Você não tem permissão para visualizar esta página.
                </Alert>
            </Box>
        );
    }

    return (
        <Box p="md">
            <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
            
            {/* Header */}
            <Group justify="space-between" mb="md">
                <Box>
                    <Title order={2} mb="xs">🇨🇱 Novelties Chile</Title>
                    <Text c="dimmed">
                        Dashboard de monitoramento das automações de novelties do Dropi Chile
                    </Text>
                </Box>
                <Group>
                    <Tooltip label="Atualizar dados">
                        <ActionIcon 
                            variant="light" 
                            color="blue" 
                            onClick={handleRefresh}
                            loading={loading}
                        >
                            <IconRefresh size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>

            {error && (
                <Alert 
                    icon={<IconAlertTriangle size="1rem" />} 
                    title="Erro ao Carregar Dados" 
                    color="red" 
                    mb="md"
                >
                    {error}
                </Alert>
            )}

            {!loading && !error && dashboardStats && (
                <Tabs value={activeTab} onChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Tab value="dashboard" leftSection={<IconChartBar size={14} />}>
                            Dashboard
                        </Tabs.Tab>
                        <Tabs.Tab value="executions" leftSection={<IconEye size={14} />}>
                            Execuções
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="dashboard" pt="xl">
                        <Stack gap="xl">
                            {/* Cards de estatísticas */}
                            <StatsCards />

                            {/* Gráficos */}
                            <Grid>
                                <Grid.Col span={{ base: 12, md: 8 }}>
                                    <TrendsChart />
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, md: 4 }}>
                                    <StatusDistribution />
                                </Grid.Col>
                            </Grid>

                            {/* Informações da última execução */}
                            {dashboardStats.last_execution_date && (
                                <Card padding="lg" radius="md" withBorder>
                                    <Group justify="space-between">
                                        <Box>
                                            <Text fw={500}>Última Execução</Text>
                                            <Text c="dimmed" size="sm">
                                                {formatDateTime(dashboardStats.last_execution_date)}
                                            </Text>
                                        </Box>
                                        {getStatusBadge(dashboardStats.last_execution_status)}
                                    </Group>
                                </Card>
                            )}
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="executions" pt="xl">
                        <Card padding="lg" radius="md" withBorder>
                            <Group justify="space-between" mb="md">
                                <Title order={4}>📋 Execuções Recentes</Title>
                                <Badge variant="light">
                                    {recentExecutions.length} execuções
                                </Badge>
                            </Group>
                            <RecentExecutionsTable />
                        </Card>
                    </Tabs.Panel>
                </Tabs>
            )}
        </Box>
    );
}

export default NoveltiesPage;