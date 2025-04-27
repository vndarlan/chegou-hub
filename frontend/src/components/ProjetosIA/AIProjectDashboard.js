// src/components/ProjetosIA/AIProjectDashboard.js
import React, { useMemo, useState } from 'react';
import { Grid, Paper, Text, Title, Center, Group, Select, Box, Space } from '@mantine/core';
import { BarChart, LineChart, DonutChart } from '@mantine/charts'; // Import chart types
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, getYear, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale'; // Import locale for month names

// Cores consistentes com a tabela
const statusColors = {
    'Ativo': 'green',
    'Em Manutenção': 'orange',
    'Arquivado': 'gray',
    'Backlog': 'blue',
    'Em Construção': 'yellow',
    'Período de Validação': 'pink',
};
const statusColorArray = Object.entries(statusColors).map(([name, color]) => ({ name, color }));

// Função auxiliar para obter nome do mês
const getMonthName = (monthIndex) => format(new Date(2000, monthIndex), 'MMM', { locale: ptBR });

function AIProjectDashboard({ projects = [] }) {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    // Anos disponíveis para filtro (baseado nos dados)
    const availableYears = useMemo(() => {
        const years = new Set(projects.map(p => getYear(parseISO(p.creation_date))));
        return Array.from(years).sort((a, b) => b - a).map(String); // Ordena decrescente
    }, [projects]);

    // 1. Cálculo das Métricas Totais e por Status (Filtrado por ano opcionalmente, mas aqui faremos geral)
    const totalProjects = projects.length;
    const statusCounts = useMemo(() => {
        const counts = {};
        statusColorArray.forEach(s => counts[s.name] = 0); // Inicializa todos os status com 0
        projects.forEach(project => {
            if (counts.hasOwnProperty(project.status)) {
                counts[project.status]++;
            } else {
                // Contar status inesperados (se houver)
                counts[project.status] = (counts[project.status] || 0) + 1;
            }
        });
        return counts;
    }, [projects]);

    // Dados para o Gráfico de Pizza (Donut)
    const donutChartData = useMemo(() => {
        return Object.entries(statusCounts)
            .filter(([name, count]) => count > 0) // Mostra apenas status com projetos
            .map(([name, count]) => ({
                name,
                value: count,
                color: statusColors[name] || 'dark', // Cor padrão se status não mapeado
            }));
    }, [statusCounts]);

    // 2. Cálculo de Projetos por Criador (usando creator_names)
    const creatorCounts = useMemo(() => {
        const counts = {};
        projects.forEach(project => {
            if (project.creator_names) {
                // Simples: conta a string inteira. Para múltiplos, precisaria split(',') e trim()
                counts[project.creator_names] = (counts[project.creator_names] || 0) + 1;
            } else {
                counts['Não especificado'] = (counts['Não especificado'] || 0) + 1;
            }
        });
        // Ordena por contagem decrescente e pega os top N (ex: 10)
        return Object.entries(counts)
                     .sort(([, countA], [, countB]) => countB - countA)
                     .slice(0, 10); // Limita para não ficar muito grande
    }, [projects]);

    // Dados para o Gráfico de Barras
    const barChartData = useMemo(() => {
        return creatorCounts.map(([name, count]) => ({
            creator: name, // Nome do criador (ou grupo)
            Projetos: count, // Quantidade
        }));
    }, [creatorCounts]);

     // 3. Cálculo da Evolução dos Projetos (filtrado por ano)
     const evolutionData = useMemo(() => {
        if (!selectedYear) return [];

        const yearInt = parseInt(selectedYear, 10);
        const filteredByYear = projects.filter(p => getYear(parseISO(p.creation_date)) === yearInt);

        if (filteredByYear.length === 0) return [];

        // Define o intervalo de meses para o ano selecionado
        const start = startOfMonth(new Date(yearInt, 0, 1)); // Jan do ano
        const end = endOfMonth(new Date(yearInt, 11, 1));   // Dez do ano
        const monthsInYear = eachMonthOfInterval({ start, end });

        const monthlyData = monthsInYear.map(monthDate => {
            const monthIndex = getMonth(monthDate);
            const monthName = getMonthName(monthIndex);
            const projectsInMonth = filteredByYear.filter(p => getMonth(parseISO(p.creation_date)) === monthIndex);

            const statusInMonth = {};
             statusColorArray.forEach(s => statusInMonth[s.name] = 0); // Inicializa status
             projectsInMonth.forEach(p => {
                 if (statusInMonth.hasOwnProperty(p.status)) {
                     statusInMonth[p.status]++;
                 }
             });

            return {
                month: monthName,
                ...statusInMonth // Adiciona contagens de cada status
            };
        });

        return monthlyData;
    }, [projects, selectedYear]);

    // Configuração das séries para o gráfico de linha
    const lineChartSeries = useMemo(() => {
        return statusColorArray.map(s => ({ name: s.name, color: `${s.color}.6` }));
    }, []);


    // Card Simples para Totais
    const StatCard = ({ title, value }) => (
        <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{title}</Text>
            <Text fw={700} size="xl">{value}</Text>
        </Paper>
    );

    return (
        <Box mb="xl">
            <Title order={3} mb="md">Dashboard de Projetos</Title>
            <Grid>
                 {/* Cards de Totais */}
                 <Grid.Col span={{ base: 12, xs: 6, sm: 4, md: 2 }}>
                     <StatCard title="Total" value={totalProjects} />
                 </Grid.Col>
                 {Object.entries(statusCounts).map(([status, count]) => (
                     count > 0 && ( // Só mostra cards para status com projetos
                         <Grid.Col key={status} span={{ base: 12, xs: 6, sm: 4, md: 2 }}>
                             <StatCard title={status} value={count} />
                         </Grid.Col>
                     )
                 ))}
            </Grid>

            <Space h="lg" />

            <Grid>
                 {/* Gráfico de Pizza - Distribuição por Status */}
                 <Grid.Col span={{ base: 12, md: 4 }}>
                     <Paper withBorder p="md" radius="md" h="100%">
                         <Title order={5} mb="md">Distribuição por Status</Title>
                         {donutChartData.length > 0 ? (
                             <DonutChart data={donutChartData} tooltipDataSource="segment" chartLabel="Projetos" withTooltip paddingAngle={5} />
                         ) : (
                             <Center h={200}><Text c="dimmed">Sem dados para exibir</Text></Center>
                         )}
                     </Paper>
                 </Grid.Col>

                 {/* Gráfico de Barras - Projetos por Criador */}
                 <Grid.Col span={{ base: 12, md: 8 }}>
                     <Paper withBorder p="md" radius="md" h="100%">
                         <Title order={5} mb="md">Projetos por Criador (Top 10)</Title>
                         {barChartData.length > 0 ? (
                             <BarChart
                                 h={300}
                                 data={barChartData}
                                 dataKey="creator"
                                 series={[{ name: 'Projetos', color: 'orange.6' }]}
                                 tickLine="none"
                                 gridAxis="none"
                                 withXAxis={false} // Remover nomes dos criadores do eixo X para economizar espaço se forem muitos
                                 tooltipProps={{ content: ({ label, payload }) => <Text size="sm">{label}: {payload?.[0]?.value}</Text> }}
                             />
                         ) : (
                              <Center h={200}><Text c="dimmed">Sem dados para exibir</Text></Center>
                         )}
                     </Paper>
                 </Grid.Col>
            </Grid>

            <Space h="lg" />

             {/* Gráfico de Linha - Evolução dos Projetos */}
            <Grid>
                 <Grid.Col span={12}>
                     <Paper withBorder p="md" radius="md">
                          <Group justify="space-between" mb="md">
                             <Title order={5}>Evolução dos Projetos Criados</Title>
                             <Select
                                 placeholder="Selecione o ano"
                                 data={availableYears}
                                 value={selectedYear}
                                 onChange={setSelectedYear}
                                 style={{ maxWidth: 150 }}
                                 disabled={availableYears.length === 0}
                             />
                         </Group>
                         {evolutionData.length > 0 && selectedYear ? (
                             <LineChart
                                 h={300}
                                 data={evolutionData}
                                 dataKey="month"
                                 series={lineChartSeries}
                                 curveType="linear"
                                 yAxisProps={{ width: 80 }}
                                 tooltipProps={{ content: ({ label, payload }) => (
                                      <Box p="xs" bg="gray.0" style={{ borderRadius: 'var(--mantine-radius-sm)'}}>
                                          <Text fw={500} mb={5}>{label} {selectedYear}</Text>
                                          {payload?.map((item) => (
                                              <Text key={item.name} c={item.color} size="sm">
                                                  {item.name}: {item.value}
                                              </Text>
                                          ))}
                                      </Box>
                                 )}}
                             />
                          ) : (
                              <Center h={200}><Text c="dimmed">Sem dados para exibir para o ano selecionado.</Text></Center>
                         )}
                     </Paper>
                 </Grid.Col>
            </Grid>
        </Box>
    );
}

export default AIProjectDashboard;