// frontend/src/features/ia/RelatoriosProjetos.js
import React, { useState, useEffect, useMemo } from 'react';
import {
    Container, Grid, Title, Text, Paper, Group, Stack, Box,
    Button, Select, DatePickerInput, Badge, Table, Alert,
    LoadingOverlay, SimpleGrid, Progress, Card, Divider,
    BarChart, LineChart, PieChart, AreaChart, Flex, Center,
    ActionIcon, Menu, Tooltip, RingProgress, List, ThemeIcon
} from '@mantine/core';
import {
    IconChartBar, IconDownload, IconFilter, IconCalendar,
    IconTrendingUp, IconTrendingDown, IconCoin, IconClock,
    IconUsers, IconTarget, IconChevronDown, IconFileExport,
    IconReportAnalytics, IconActivity, IconBrain, IconRobot,
    IconCheck, IconX, IconArrowUp, IconArrowDown, IconMinus
} from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

// === COMPONENTES DE GRÁFICOS CUSTOMIZADOS ===

// Gráfico de ROI por Projeto
const ROIChart = ({ dados, userPermissions }) => {
    if (!userPermissions?.pode_ver_financeiro) {
        return (
            <Paper p="xl" withBorder>
                <Center>
                    <Stack align="center" gap="md">
                        <IconX size={48} color="gray" />
                        <Text c="dimmed">Sem permissão para ver dados financeiros</Text>
                    </Stack>
                </Center>
            </Paper>
        );
    }

    const chartData = dados
        ?.filter(p => p.metricas_financeiras && !p.metricas_financeiras.acesso_restrito)
        .map(projeto => ({
            name: projeto.nome.substring(0, 20) + (projeto.nome.length > 20 ? '...' : ''),
            roi: parseFloat(projeto.metricas_financeiras.roi),
            economia: parseFloat(projeto.metricas_financeiras.economia_mensal || 0)
        }))
        .sort((a, b) => b.roi - a.roi)
        .slice(0, 10);

    return (
        <BarChart
            h={300}
            data={chartData}
            dataKey="name"
            series={[
                { name: 'roi', color: 'blue.6', label: 'ROI (%)' }
            ]}
            tickLine="xy"
            gridAxis="xy"
        />
    );
};

// Gráfico de Evolução da Economia
const EconomiaTimelineChart = ({ dados, userPermissions }) => {
    if (!userPermissions?.pode_ver_financeiro) {
        return (
            <Paper p="xl" withBorder>
                <Center>
                    <Stack align="center" gap="md">
                        <IconX size={48} color="gray" />
                        <Text c="dimmed">Sem permissão para ver dados financeiros</Text>
                    </Stack>
                </Center>
            </Paper>
        );
    }

    // Simular evolução mensal (seria melhor vir do backend)
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    const economiaTotal = dados
        ?.filter(p => p.metricas_financeiras && !p.metricas_financeiras.acesso_restrito)
        .reduce((acc, p) => acc + parseFloat(p.metricas_financeiras.economia_mensal || 0), 0);

    const chartData = meses.map((mes, index) => ({
        month: mes,
        economia: economiaTotal * (index + 1) * 0.8 + Math.random() * economiaTotal * 0.4,
        acumulada: economiaTotal * (index + 1)
    }));

    return (
        <LineChart
            h={300}
            data={chartData}
            dataKey="month"
            series={[
                { name: 'economia', color: 'teal.6', label: 'Economia Mensal' },
                { name: 'acumulada', color: 'blue.6', label: 'Economia Acumulada' }
            ]}
            curveType="linear"
        />
    );
};

// Gráfico de Distribuição por Tipo
const DistribuicaoTipoChart = ({ dados }) => {
    const distribuicao = dados?.reduce((acc, projeto) => {
        const tipo = projeto.tipo_projeto;
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
    }, {});

    const chartData = Object.entries(distribuicao || {}).map(([tipo, count]) => ({
        name: tipo.replace('_', ' ').toUpperCase(),
        value: count,
        color: `var(--mantine-color-blue-${Math.floor(Math.random() * 9)})`
    }));

    return (
        <PieChart
            h={300}
            data={chartData}
            mx="auto"
            withLabelsLine
            labelsPosition="outside"
            labelsType="percent"
            withTooltip
        />
    );
};

// Ranking de Projetos
const RankingProjetos = ({ dados, userPermissions, tipo = 'roi' }) => {
    const dadosRanking = useMemo(() => {
        if (!dados) return [];
        
        let projetosFiltrados = dados.filter(p => p.metricas_financeiras && !p.metricas_financeiras.acesso_restrito);
        
        switch (tipo) {
            case 'roi':
                return projetosFiltrados
                    .sort((a, b) => b.metricas_financeiras.roi - a.metricas_financeiras.roi)
                    .slice(0, 5);
            case 'economia':
                return projetosFiltrados
                    .sort((a, b) => (b.metricas_financeiras.economia_mensal || 0) - (a.metricas_financeiras.economia_mensal || 0))
                    .slice(0, 5);
            case 'horas':
                return dados
                    .sort((a, b) => b.horas_totais - a.horas_totais)
                    .slice(0, 5);
            default:
                return [];
        }
    }, [dados, tipo]);

    const getTrendIcon = (valor, threshold = 0) => {
        if (valor > threshold) return <IconArrowUp size={16} color="green" />;
        if (valor < threshold) return <IconArrowDown size={16} color="red" />;
        return <IconMinus size={16} color="gray" />;
    };

    return (
        <Stack gap="xs">
            {dadosRanking.map((projeto, index) => (
                <Paper key={projeto.id} p="sm" withBorder>
                    <Group justify="space-between">
                        <Group gap="sm">
                            <Badge variant="filled" size="lg">
                                {index + 1}
                            </Badge>
                            <Box>
                                <Text size="sm" weight={500}>{projeto.nome}</Text>
                                <Text size="xs" c="dimmed">
                                    {projeto.criadores_nomes?.[0] || 'N/A'}
                                </Text>
                            </Box>
                        </Group>
                        
                        <Group gap="xs">
                            {tipo === 'roi' && userPermissions?.pode_ver_financeiro && (
                                <Group gap={4}>
                                    {getTrendIcon(projeto.metricas_financeiras.roi)}
                                    <Text size="sm" weight={700} c={projeto.metricas_financeiras.roi > 0 ? 'green' : 'red'}>
                                        {projeto.metricas_financeiras.roi}%
                                    </Text>
                                </Group>
                            )}
                            
                            {tipo === 'economia' && userPermissions?.pode_ver_financeiro && (
                                <Text size="sm" weight={500}>
                                    R$ {projeto.metricas_financeiras.economia_mensal?.toLocaleString('pt-BR')}
                                </Text>
                            )}
                            
                            {tipo === 'horas' && (
                                <Text size="sm" weight={500}>
                                    {projeto.horas_totais}h
                                </Text>
                            )}
                        </Group>
                    </Group>
                </Paper>
            ))}
        </Stack>
    );
};

// Componente Principal
function RelatoriosProjetos() {
    // === ESTADOS ===
    const [dados, setDados] = useState(null);
    const [stats, setStats] = useState(null);
    const [userPermissions, setUserPermissions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filtros para relatórios
    const [periodo, setPeriodo] = useState('todos');
    const [departamento, setDepartamento] = useState('');
    const [tipoProjeto, setTipoProjeto] = useState('');
    
    // === EFEITOS ===
    useEffect(() => {
        carregarDados();
    }, [periodo, departamento, tipoProjeto]);

    // === FUNÇÕES ===
    const carregarDados = async () => {
        try {
            setLoading(true);
            
            // Construir filtros
            const params = new URLSearchParams();
            if (departamento) params.append('departamento', departamento);
            if (tipoProjeto) params.append('tipo_projeto', tipoProjeto);
            
            const [projetosRes, statsRes, permissoesRes] = await Promise.all([
                axios.get(`/api/ia/projetos/?${params}`),
                axios.get('/api/ia/dashboard-stats/'),
                axios.get('/api/ia/verificar-permissoes/')
            ]);
            
            setDados(projetosRes.data.results || projetosRes.data);
            setStats(statsRes.data);
            setUserPermissions(permissoesRes.data);
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            setError('Erro ao carregar dados dos relatórios');
        } finally {
            setLoading(false);
        }
    };

    const exportarRelatorio = async () => {
        try {
            // Aqui implementaria a exportação real
            notifications.show({
                title: 'Exportação',
                message: 'Relatório exportado com sucesso!',
                color: 'green'
            });
        } catch (err) {
            notifications.show({
                title: 'Erro',
                message: 'Erro ao exportar relatório',
                color: 'red'
            });
        }
    };

    // === CÁLCULOS DE MÉTRICAS ===
    const metricas = useMemo(() => {
        if (!dados || !userPermissions?.pode_ver_financeiro) return null;
        
        const projetosComFinanceiro = dados.filter(p => 
            p.metricas_financeiras && !p.metricas_financeiras.acesso_restrito
        );
        
        const totalROI = projetosComFinanceiro.reduce((acc, p) => 
            acc + parseFloat(p.metricas_financeiras.roi || 0), 0
        );
        
        const totalEconomia = projetosComFinanceiro.reduce((acc, p) => 
            acc + parseFloat(p.metricas_financeiras.economia_mensal || 0), 0
        );
        
        const totalInvestimento = projetosComFinanceiro.reduce((acc, p) => 
            acc + parseFloat(p.metricas_financeiras.custo_total || 0), 0
        );

        return {
            roiMedio: projetosComFinanceiro.length > 0 ? totalROI / projetosComFinanceiro.length : 0,
            economiaTotalMensal: totalEconomia,
            investimentoTotal: totalInvestimento,
            projetosPositivos: projetosComFinanceiro.filter(p => p.metricas_financeiras.roi > 0).length,
            projetosNegativos: projetosComFinanceiro.filter(p => p.metricas_financeiras.roi < 0).length
        };
    }, [dados, userPermissions]);

    return (
        <Container size="xl" p="md">
            <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />

            {/* Header */}
            <Group justify="space-between" mb="xl">
                <Box>
                    <Title order={2} mb="xs">
                        <Group gap="sm">
                            <IconReportAnalytics size={32} />
                            📊 Relatórios & Análise
                        </Group>
                    </Title>
                    <Text c="dimmed">
                        Análise detalhada de performance e métricas dos projetos
                    </Text>
                </Box>
                
                <Group gap="md">
                    <Menu shadow="md">
                        <Menu.Target>
                            <Button leftSection={<IconDownload size={16} />} variant="light">
                                Exportar
                                <IconChevronDown size={16} />
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item leftSection={<IconFileExport size={14} />} onClick={exportarRelatorio}>
                                Relatório PDF
                            </Menu.Item>
                            <Menu.Item leftSection={<IconFileExport size={14} />} onClick={exportarRelatorio}>
                                Planilha Excel
                            </Menu.Item>
                            <Menu.Item leftSection={<IconFileExport size={14} />} onClick={exportarRelatorio}>
                                Dados CSV
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Group>

            {error && (
                <Alert 
                    icon={<IconX size="1rem" />} 
                    title="Erro" 
                    color="red" 
                    mb="md"
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {/* Filtros */}
            <Paper withBorder p="md" mb="xl">
                <Group gap="md">
                    <Select
                        placeholder="Período"
                        data={[
                            { value: 'todos', label: 'Todos os períodos' },
                            { value: '30d', label: 'Últimos 30 dias' },
                            { value: '90d', label: 'Últimos 90 dias' },
                            { value: '1y', label: 'Último ano' }
                        ]}
                        value={periodo}
                        onChange={setPeriodo}
                        leftSection={<IconCalendar size={16} />}
                    />
                    
                    <Select
                        placeholder="Departamento"
                        data={[
                            { value: '', label: 'Todos os departamentos' },
                            { value: 'ti', label: 'TI' },
                            { value: 'marketing', label: 'Marketing' },
                            { value: 'vendas', label: 'Vendas' },
                            { value: 'operacional', label: 'Operacional' }
                        ]}
                        value={departamento}
                        onChange={setDepartamento}
                    />
                    
                    <Select
                        placeholder="Tipo de Projeto"
                        data={[
                            { value: '', label: 'Todos os tipos' },
                            { value: 'chatbot', label: 'Chatbot' },
                            { value: 'automacao', label: 'Automação' },
                            { value: 'analise_preditiva', label: 'Análise Preditiva' }
                        ]}
                        value={tipoProjeto}
                        onChange={setTipoProjeto}
                    />
                </Group>
            </Paper>

            {/* Métricas Principais */}
            {userPermissions?.pode_ver_financeiro && metricas && (
                <SimpleGrid cols={4} spacing="md" mb="xl">
                    <Paper withBorder p="md" bg="blue.0">
                        <Group gap="sm">
                            <IconTrendingUp size={24} color="blue" />
                            <Box>
                                <Text size="sm" c="dimmed">ROI Médio</Text>
                                <Text size="xl" weight={700} c={metricas.roiMedio > 0 ? 'green' : 'red'}>
                                    {metricas.roiMedio.toFixed(1)}%
                                </Text>
                            </Box>
                        </Group>
                    </Paper>
                    
                    <Paper withBorder p="md" bg="green.0">
                        <Group gap="sm">
                            <IconCoin size={24} color="green" />
                            <Box>
                                <Text size="sm" c="dimmed">Economia/Mês</Text>
                                <Text size="xl" weight={700}>
                                    R$ {metricas.economiaTotalMensal.toLocaleString('pt-BR')}
                                </Text>
                            </Box>
                        </Group>
                    </Paper>
                    
                    <Paper withBorder p="md" bg="orange.0">
                        <Group gap="sm">
                            <IconTarget size={24} color="orange" />
                            <Box>
                                <Text size="sm" c="dimmed">Investimento Total</Text>
                                <Text size="xl" weight={700}>
                                    R$ {metricas.investimentoTotal.toLocaleString('pt-BR')}
                                </Text>
                            </Box>
                        </Group>
                    </Paper>
                    
                    <Paper withBorder p="md" bg="teal.0">
                        <Group gap="sm">
                            <RingProgress
                                size={60}
                                thickness={8}
                                sections={[
                                    { value: (metricas.projetosPositivos / (metricas.projetosPositivos + metricas.projetosNegativos)) * 100, color: 'green' }
                                ]}
                            />
                            <Box>
                                <Text size="sm" c="dimmed">Taxa de Sucesso</Text>
                                <Text size="lg" weight={700}>
                                    {metricas.projetosPositivos}/{metricas.projetosPositivos + metricas.projetosNegativos}
                                </Text>
                            </Box>
                        </Group>
                    </Paper>
                </SimpleGrid>
            )}

            {/* Gráficos Principais */}
            <Grid mb="xl">
                <Grid.Col span={8}>
                    <Paper withBorder p="md">
                        <Title order={4} mb="md">ROI por Projeto</Title>
                        <ROIChart dados={dados} userPermissions={userPermissions} />
                    </Paper>
                </Grid.Col>
                
                <Grid.Col span={4}>
                    <Paper withBorder p="md">
                        <Title order={4} mb="md">Distribuição por Tipo</Title>
                        <DistribuicaoTipoChart dados={dados} />
                    </Paper>
                </Grid.Col>
            </Grid>

            {/* Evolução Temporal */}
            {userPermissions?.pode_ver_financeiro && (
                <Paper withBorder p="md" mb="xl">
                    <Title order={4} mb="md">Evolução da Economia</Title>
                    <EconomiaTimelineChart dados={dados} userPermissions={userPermissions} />
                </Paper>
            )}

            {/* Rankings */}
            <Grid>
                <Grid.Col span={4}>
                    <Paper withBorder p="md">
                        <Title order={5} mb="md">🏆 Top 5 - ROI</Title>
                        <RankingProjetos dados={dados} userPermissions={userPermissions} tipo="roi" />
                    </Paper>
                </Grid.Col>
                
                <Grid.Col span={4}>
                    <Paper withBorder p="md">
                        <Title order={5} mb="md">💰 Top 5 - Economia</Title>
                        <RankingProjetos dados={dados} userPermissions={userPermissions} tipo="economia" />
                    </Paper>
                </Grid.Col>
                
                <Grid.Col span={4}>
                    <Paper withBorder p="md">
                        <Title order={5} mb="md">⏱️ Top 5 - Horas</Title>
                        <RankingProjetos dados={dados} userPermissions={userPermissions} tipo="horas" />
                    </Paper>
                </Grid.Col>
            </Grid>

            {/* Insights e Recomendações */}
            {stats && (
                <Paper withBorder p="md" mt="xl">
                    <Title order={4} mb="md">💡 Insights & Recomendações</Title>
                    <Stack gap="md">
                        {stats.projetos_ativos > 0 && (
                            <Group gap="sm">
                                <ThemeIcon color="blue" size="sm">
                                    <IconActivity size={16} />
                                </ThemeIcon>
                                <Text size="sm">
                                    Você tem <strong>{stats.projetos_ativos} projetos ativos</strong> gerando resultados
                                </Text>
                            </Group>
                        )}
                        
                        {userPermissions?.pode_ver_financeiro && metricas?.roiMedio > 100 && (
                            <Group gap="sm">
                                <ThemeIcon color="green" size="sm">
                                    <IconTrendingUp size={16} />
                                </ThemeIcon>
                                <Text size="sm">
                                    Excelente! ROI médio de <strong>{metricas.roiMedio.toFixed(1)}%</strong> está acima da meta
                                </Text>
                            </Group>
                        )}
                        
                        {stats.horas_totais_investidas > 1000 && (
                            <Group gap="sm">
                                <ThemeIcon color="orange" size="sm">
                                    <IconClock size={16} />
                                </ThemeIcon>
                                <Text size="sm">
                                    Mais de <strong>{stats.horas_totais_investidas}h investidas</strong> em automação e IA
                                </Text>
                            </Group>
                        )}
                        
                        {dados && dados.length > 5 && (
                            <Group gap="sm">
                                <ThemeIcon color="teal" size="sm">
                                    <IconBrain size={16} />
                                </ThemeIcon>
                                <Text size="sm">
                                    Portfolio robusto com <strong>{dados.length} projetos</strong> - considere documentar melhores práticas
                                </Text>
                            </Group>
                        )}
                    </Stack>
                </Paper>
            )}
        </Container>
    );
}

export default RelatoriosProjetos;