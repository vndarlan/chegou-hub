// src/components/ProjetosIA/AIProjectDashboard.js
import React, { useMemo, useState, useEffect } from 'react';
import { 
  Grid, Paper, Text, Title, Center, Group, Select, Box, Space, 
  Flex, MultiSelect, Button
} from '@mantine/core';
// Correção da importação - DatePickerInput vem do @mantine/dates
import { DatePickerInput } from '@mantine/dates';
import { BarChart, LineChart, DonutChart } from '@mantine/charts';
import { 
  format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, 
  getYear, getMonth, isAfter, isBefore, startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { IconFilter, IconFilterOff } from '@tabler/icons-react';

// Cores consistentes com a tabela
const statusColors = {
    'Ativo': 'green',
    'Em Manutenção': 'orange',
    'Arquivado': 'gray',
    'Backlog': 'blue',
    'Em Construção': 'yellow',
    'Período de Validação': 'pink',
};

// Função auxiliar para obter nome do mês
const getMonthName = (monthIndex) => format(new Date(2000, monthIndex), 'MMM', { locale: ptBR });

function AIProjectDashboard({ projects = [] }) {
    // Estados para seleção/filtros
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [showFilters, setShowFilters] = useState(false);
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [selectedCreators, setSelectedCreators] = useState([]);
    const [startDate, setStartDate] = useState(null);
    
    // Todos os anos disponíveis (para o seletor)
    const availableYears = useMemo(() => {
        const years = new Set(projects.map(p => getYear(parseISO(p.creation_date))));
        return Array.from(years).sort((a, b) => b - a).map(String);
    }, [projects]);
    
    // Todos os status disponíveis (para o filtro)
    const availableStatuses = useMemo(() => {
        const statuses = new Set(projects.map(p => p.status));
        return Array.from(statuses).map(status => ({
            value: status,
            label: status,
            color: statusColors[status] || 'gray'
        }));
    }, [projects]);
    
    // Todos os criadores disponíveis (para o filtro)
    const availableCreators = useMemo(() => {
        const creatorSet = new Set();
        projects.forEach(project => {
            if (project.creator_names) {
                // Split por vírgula caso tenha múltiplos nomes
                project.creator_names.split(',').forEach(name => {
                    creatorSet.add(name.trim());
                });
            }
        });
        return Array.from(creatorSet).sort().map(name => ({
            value: name,
            label: name
        }));
    }, [projects]);

    // Aplicar filtros nos projetos
    const filteredProjects = useMemo(() => {
        return projects.filter(project => {
            // Filtro por status
            if (selectedStatuses.length > 0 && !selectedStatuses.includes(project.status)) {
                return false;
            }
            
            // Filtro por criador
            if (selectedCreators.length > 0) {
                if (!project.creator_names) return false;
                
                const projectCreators = project.creator_names.split(',').map(name => name.trim());
                const hasSelectedCreator = selectedCreators.some(selectedCreator => 
                    projectCreators.includes(selectedCreator)
                );
                
                if (!hasSelectedCreator) return false;
            }
            
            // Filtro por data inicial
            if (startDate && project.creation_date) {
                const projectDate = parseISO(project.creation_date);
                if (isBefore(projectDate, startOfDay(startDate))) {
                    return false;
                }
            }
            
            return true;
        });
    }, [projects, selectedStatuses, selectedCreators, startDate]);

    // Dados totais e por status
    const { totalProjects, statusCounts } = useMemo(() => {
        const counts = {};
        Object.keys(statusColors).forEach(s => counts[s] = 0);
        
        filteredProjects.forEach(project => {
            if (counts.hasOwnProperty(project.status)) {
                counts[project.status]++;
            } else {
                counts[project.status] = 1;
            }
        });
        
        return { 
            totalProjects: filteredProjects.length,
            statusCounts: counts
        };
    }, [filteredProjects]);

    // Dados para o Gráfico de Pizza (Donut)
    const donutChartData = useMemo(() => {
        return Object.entries(statusCounts)
            .filter(([name, count]) => count > 0)
            .map(([name, count]) => ({
                name,
                value: count,
                color: statusColors[name] || 'dark',
            }));
    }, [statusCounts]);

    // Dados para gráfico de criadores
    const creatorData = useMemo(() => {
        const counts = {};
        
        filteredProjects.forEach(project => {
            if (project.creator_names) {
                project.creator_names.split(',').forEach(name => {
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
    }, [filteredProjects]);

    // Dados para gráfico de evolução
    const evolutionData = useMemo(() => {
        if (!selectedYear) return [];

        const yearInt = parseInt(selectedYear, 10);
        const filteredByYear = filteredProjects.filter(p => 
            getYear(parseISO(p.creation_date)) === yearInt
        );

        if (filteredByYear.length === 0) return [];

        const start = startOfMonth(new Date(yearInt, 0, 1));
        const end = endOfMonth(new Date(yearInt, 11, 1));
        const monthsInYear = eachMonthOfInterval({ start, end });

        const monthlyData = monthsInYear.map(monthDate => {
            const monthIndex = getMonth(monthDate);
            const monthName = getMonthName(monthIndex);
            const projectsInMonth = filteredByYear.filter(p => 
                getMonth(parseISO(p.creation_date)) === monthIndex
            );

            const statusInMonth = {};
            Object.keys(statusColors).forEach(s => statusInMonth[s] = 0);
            
            projectsInMonth.forEach(p => {
                if (statusInMonth.hasOwnProperty(p.status)) {
                    statusInMonth[p.status]++;
                }
            });

            return {
                month: monthName,
                ...statusInMonth
            };
        });

        return monthlyData;
    }, [filteredProjects, selectedYear]);

    // Configuração das séries para o gráfico de linha
    const lineChartSeries = useMemo(() => {
        return Object.entries(statusColors).map(([name, color]) => ({ 
            name, 
            color: `${color}.6` 
        }));
    }, []);

    // Componente para mostrar cards de métricas
    const StatCard = ({ title, value, color = "blue" }) => (
        <Paper withBorder p="md" radius="md" style={{ height: '100%' }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{title}</Text>
            <Text fw={700} size="xl" c={color}>{value}</Text>
        </Paper>
    );

    // Limpar todos os filtros
    const clearFilters = () => {
        setSelectedStatuses([]);
        setSelectedCreators([]);
        setStartDate(null);
    };

    // Fix para garantir que os gráficos tenham dimensões definidas
    useEffect(() => {
        const resizeCharts = () => {
            window.dispatchEvent(new Event('resize'));
        };
        
        // Chamar após o render e sempre que os dados mudarem
        setTimeout(resizeCharts, 300);
        
        return () => {
            // Limpar qualquer timer se necessário
        };
    }, [filteredProjects, donutChartData, creatorData, evolutionData]);

    return (
        <Box mb="xl">
            <Group position="apart" mb="md">
                <Title order={3}>Dashboard de Projetos</Title>
                <Button
                    leftIcon={showFilters ? <IconFilterOff size={16} /> : <IconFilter size={16} />}
                    variant="light"
                    onClick={() => setShowFilters(!showFilters)}
                >
                    {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
                </Button>
            </Group>
            
            {/* Seção de Filtros */}
            {showFilters && (
                <Paper withBorder p="md" mb="md" radius="md">
                    <Group position="apart" mb="md">
                        <Title order={5}>Filtros</Title>
                        <Button variant="subtle" onClick={clearFilters} size="xs">Limpar Filtros</Button>
                    </Group>
                    <Grid>
                        <Grid.Col xs={12} md={4}>
                            <MultiSelect
                                label="Status"
                                placeholder="Filtrar por status"
                                data={availableStatuses}
                                value={selectedStatuses}
                                onChange={setSelectedStatuses}
                                clearable
                                searchable
                            />
                        </Grid.Col>
                        <Grid.Col xs={12} md={4}>
                            <MultiSelect
                                label="Responsáveis"
                                placeholder="Filtrar por responsável"
                                data={availableCreators}
                                value={selectedCreators}
                                onChange={setSelectedCreators}
                                clearable
                                searchable
                            />
                        </Grid.Col>
                        <Grid.Col xs={12} md={4}>
                            <DatePickerInput
                                label="Data Inicial"
                                placeholder="Projetos a partir de..."
                                value={startDate}
                                onChange={setStartDate}
                                locale="pt-br"
                                valueFormat="DD/MM/YYYY"
                                clearable
                            />
                        </Grid.Col>
                    </Grid>
                </Paper>
            )}

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
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper withBorder p="md" radius="md" style={{ height: 380 }}>
                        <Title order={5} mb="md">Distribuição por Status</Title>
                        {donutChartData.length > 0 ? (
                            <Box style={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <DonutChart 
                                    data={donutChartData} 
                                    tooltipDataSource="segment" 
                                    chartLabel="Projetos" 
                                    withTooltip 
                                    paddingAngle={5}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </Box>
                        ) : (
                            <Center h={300}><Text c="dimmed">Sem dados para exibir</Text></Center>
                        )}
                    </Paper>
                </Grid.Col>

                {/* Gráfico de Barras - Projetos por Criador */}
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Paper withBorder p="md" radius="md" style={{ height: 380 }}>
                        <Title order={5} mb="md">Projetos por Criador (Top 10)</Title>
                        {creatorData.length > 0 ? (
                            <Box style={{ height: 300 }}>
                                <BarChart
                                    h={300}
                                    data={creatorData}
                                    dataKey="creator"
                                    series={[{ name: 'Projetos', color: 'orange.6' }]}
                                    tickLine="none"
                                    gridAxis="none"
                                    withXAxis={false}
                                    tooltipProps={{ 
                                        content: ({ label, payload }) => 
                                            <Text size="sm">{label}: {payload?.[0]?.value}</Text> 
                                    }}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </Box>
                        ) : (
                            <Center h={300}><Text c="dimmed">Sem dados para exibir</Text></Center>
                        )}
                    </Paper>
                </Grid.Col>
            </Grid>

            <Space h="lg" />

            {/* Gráfico de Linha - Evolução dos Projetos */}
            <Paper withBorder p="md" radius="md">
                <Group position="apart" mb="md">
                    <Title order={5}>Evolução dos Projetos Criados</Title>
                    <Select
                        placeholder="Selecione o ano"
                        data={availableYears}
                        value={selectedYear}
                        onChange={setSelectedYear}
                        style={{ width: 130 }}
                        disabled={availableYears.length === 0}
                    />
                </Group>
                {evolutionData.length > 0 && selectedYear ? (
                    <Box style={{ height: 350 }}>
                        <LineChart
                            h={300}
                            data={evolutionData}
                            dataKey="month"
                            series={lineChartSeries}
                            curveType="linear"
                            yAxisProps={{ width: 40 }}
                            tooltipProps={{ 
                                content: ({ label, payload }) => (
                                    <Box p="xs" bg="gray.0" style={{ borderRadius: 'var(--mantine-radius-sm)'}}>
                                        <Text fw={500} mb={5}>{label} {selectedYear}</Text>
                                        {payload?.map((item) => (
                                            <Text key={item.name} c={item.color} size="sm">
                                                {item.name}: {item.value}
                                            </Text>
                                        ))}
                                    </Box>
                                )
                            }}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </Box>
                ) : (
                    <Center h={200}>
                        <Text c="dimmed">
                            {availableYears.length === 0 
                                ? "Sem dados disponíveis." 
                                : "Sem dados para exibir para o ano selecionado."}
                        </Text>
                    </Center>
                )}
            </Paper>
        </Box>
    );
}

export default AIProjectDashboard;