// frontend/src/features/metricas/EcomhubPage.js
import React, { useState, useEffect } from 'react';
import {
    Box,
    Title,
    Text,
    Paper,
    Group,
    Button,
    Table,
    Badge,
    TextInput,
    Stack,
    Grid,
    Alert,
    LoadingOverlay,
    ActionIcon,
    Modal,
    Card,
    ThemeIcon,
    Select
} from '@mantine/core';
import {
    IconChartBar,
    IconTrash,
    IconRefresh,
    IconSortAscending,
    IconSortDescending,
    IconTrendingUp,
    IconPackage,
    IconTarget,
    IconPercentage,
    IconDeviceAnalytics,
    IconCheck,
    IconX,
    IconAlertTriangle,
    IconDownload
} from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import axios from 'axios';

function EcomhubPage() {
    // Estados principais
    const [isLoading, setIsLoading] = useState(false);
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [analiseSelecionada, setAnaliseSelecionada] = useState(null);
    const [dadosEfetividade, setDadosEfetividade] = useState([]);
    
    // Estados para processamento
    const [dataInicio, setDataInicio] = useState(null);
    const [dataFim, setDataFim] = useState(null);
    const [paisId, setPaisId] = useState('');
    
    // Estados para salvar
    const [modalSalvar, setModalSalvar] = useState(false);
    const [nomeAnalise, setNomeAnalise] = useState('');
    
    // Estados para ordenação
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');
    
    // Estados de notificação
    const [notification, setNotification] = useState(null);

    // Opções de países
    const paisesOptions = [
        { value: 'ES', label: 'Espanha' },
        { value: 'IT', label: 'Itália' },
        { value: 'FR', label: 'França' },
        { value: 'DE', label: 'Alemanha' },
        { value: 'UK', label: 'Reino Unido' },
    ];

    // ======================== FUNÇÕES DE API ========================

    const fetchAnalises = async () => {
        try {
            const response = await axios.get('/metricas/ecomhub/analises/');
            setAnalisesSalvas(response.data);
        } catch (error) {
            console.error('Erro ao buscar análises:', error);
            showNotification('error', 'Erro ao carregar análises');
        }
    };

    const processarMetricas = async () => {
        if (!dataInicio || !dataFim || !paisId) {
            showNotification('error', 'Preencha todos os campos');
            return;
        }
        
        setIsLoading(true);
        try {
            const response = await axios.post('/metricas/ecomhub/analises/processar_selenium/', {
                data_inicio: dataInicio,
                data_fim: dataFim,
                pais_id: paisId
            });
            
            if (response.data.status === 'success') {
                setDadosEfetividade(response.data.dados_processados || []);
                setAnaliseSelecionada(null);
                showNotification('success', 'Métricas processadas com sucesso!');
            }
        } catch (error) {
            showNotification('error', `Erro: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const salvarAnalise = async () => {
        if (!nomeAnalise || !dadosEfetividade.length) {
            showNotification('error', 'Nome da análise e dados são obrigatórios');
            return;
        }
        
        setIsLoading(true);
        try {
            const response = await axios.post('/metricas/ecomhub/analises/', {
                nome: nomeAnalise,
                dados_efetividade: dadosEfetividade,
                tipo_metrica: 'produto'
            });
            
            showNotification('success', `Análise '${nomeAnalise}' salva com sucesso!`);
            setModalSalvar(false);
            setNomeAnalise('');
            fetchAnalises();
        } catch (error) {
            showNotification('error', `Erro ao salvar: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const carregarAnalise = (analise) => {
        setDadosEfetividade(analise.dados_efetividade || []);
        setAnaliseSelecionada(analise);
        showNotification('success', 'Análise carregada');
    };

    const deletarAnalise = async (id, nome) => {
        if (!window.confirm(`Deletar análise "${nome}"?`)) return;
        
        try {
            await axios.delete(`/metricas/ecomhub/analises/${id}/`);
            fetchAnalises();
            if (analiseSelecionada?.id === id) {
                setAnaliseSelecionada(null);
                setDadosEfetividade([]);
            }
            showNotification('success', 'Análise deletada');
        } catch (error) {
            showNotification('error', 'Erro ao deletar análise');
        }
    };

    // ======================== FUNÇÕES AUXILIARES ========================

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

    // Ordenação da tabela
    const sortData = (data, sortBy, sortOrder) => {
        if (!sortBy) return data;
        
        return [...data].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            // Converter percentuais para números
            if (typeof aVal === 'string' && aVal.includes('%')) {
                aVal = parseFloat(aVal.replace('%', ''));
            }
            if (typeof bVal === 'string' && bVal.includes('%')) {
                bVal = parseFloat(bVal.replace('%', ''));
            }
            
            // Converter números como strings
            if (typeof aVal === 'string' && !isNaN(aVal)) aVal = parseFloat(aVal);
            if (typeof bVal === 'string' && !isNaN(bVal)) bVal = parseFloat(bVal);
            
            if (sortOrder === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    const renderEstatisticas = () => {
        if (!dadosEfetividade.length) return null;
        
        const produtos = dadosEfetividade.filter(item => item.produto !== 'Total');
        const totalProdutos = produtos.length;
        const efetividadeMedia = produtos.reduce((sum, item) => {
            const ef = parseFloat(item.efetividade?.replace('%', '') || 0);
            return sum + ef;
        }, 0) / totalProdutos;
        
        const totalVendas = produtos.reduce((sum, item) => sum + (item.vendas || 0), 0);
        const totalLeads = produtos.reduce((sum, item) => sum + (item.leads || 0), 0);
        
        return (
            <Grid gutter="md" mb="xl">
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Produtos</Text>
                                <Text size="xl" fw={700}>{totalProdutos}</Text>
                            </div>
                            <ThemeIcon color="blue" variant="light" size="xl">
                                <IconPackage size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Total Vendas</Text>
                                <Text size="xl" fw={700} c="green">{totalVendas.toLocaleString()}</Text>
                            </div>
                            <ThemeIcon color="green" variant="light" size="xl">
                                <IconTrendingUp size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Total Leads</Text>
                                <Text size="xl" fw={700} c="blue">{totalLeads.toLocaleString()}</Text>
                            </div>
                            <ThemeIcon color="blue" variant="light" size="xl">
                                <IconTarget size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Efetividade Média</Text>
                                <Text size="xl" fw={700} c="orange">{efetividadeMedia.toFixed(1)}%</Text>
                            </div>
                            <ThemeIcon color="orange" variant="light" size="xl">
                                <IconPercentage size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
            </Grid>
        );
    };

    const renderTabela = () => {
        if (!dadosEfetividade.length) return null;
        
        const colunas = Object.keys(dadosEfetividade[0]);
        const dadosOrdenados = sortData(dadosEfetividade, sortBy, sortOrder);
        
        return (
            <Paper shadow="sm" p="md" mt="md">
                <Group justify="space-between" mb="md">
                    <Title order={4}>Métricas de Produtos</Title>
                    <Badge variant="light" color="blue">
                        {dadosEfetividade.length} registros
                    </Badge>
                </Group>
                
                <Box style={{ overflowX: 'auto' }}>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                {colunas.map(col => (
                                    <Table.Th key={col}>
                                        <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => handleSort(col)}>
                                            <Text size="sm" fw={500}>{col}</Text>
                                            {sortBy === col && (
                                                <ActionIcon size="xs" variant="transparent">
                                                    {sortOrder === 'asc' ? 
                                                        <IconSortAscending size={12} /> : 
                                                        <IconSortDescending size={12} />
                                                    }
                                                </ActionIcon>
                                            )}
                                        </Group>
                                    </Table.Th>
                                ))}
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {dadosOrdenados.map((row, idx) => (
                                <Table.Tr key={idx}>
                                    {colunas.map(col => (
                                        <Table.Td key={col}>
                                            {typeof row[col] === 'number' ? 
                                                row[col].toLocaleString() : 
                                                row[col]
                                            }
                                        </Table.Td>
                                    ))}
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Box>
            </Paper>
        );
    };

    // ======================== EFEITOS ========================
    useEffect(() => {
        fetchAnalises();
    }, []);

    // ======================== RENDER PRINCIPAL ========================
    return (
        <Box p="md">
            <LoadingOverlay visible={isLoading} />
            
            {/* Header */}
            <Group justify="space-between" mb="xl">
                <div>
                    <Group gap="sm">
                        <IconChartBar size={28} color="var(--mantine-color-blue-6)" />
                        <Title order={2}>Métricas ECOMHUB</Title>
                    </Group>
                    <Text c="dimmed">Análise de efetividade de produtos</Text>
                </div>
                <Group>
                    <Button 
                        leftSection={<IconRefresh size={16} />} 
                        variant="outline" 
                        onClick={fetchAnalises}
                    >
                        Atualizar
                    </Button>
                    {dadosEfetividade.length > 0 && (
                        <Button 
                            leftSection={<IconDownload size={16} />} 
                            onClick={() => setModalSalvar(true)}
                        >
                            Salvar Análise
                        </Button>
                    )}
                </Group>
            </Group>

            {/* Notificações */}
            {notification && (
                <Alert 
                    color={notification.type === 'success' ? 'green' : notification.type === 'warning' ? 'yellow' : 'red'}
                    mb="md"
                    withCloseButton
                    onClose={() => setNotification(null)}
                    icon={notification.type === 'success' ? <IconCheck size={16} /> : 
                          notification.type === 'warning' ? <IconAlertTriangle size={16} /> : <IconX size={16} />}
                >
                    {notification.message}
                </Alert>
            )}

            {/* Formulário de Processamento */}
            <Paper shadow="sm" p="md" mb="xl">
                <Group justify="space-between" mb="md">
                    <Group gap="sm">
                        <IconDeviceAnalytics size={20} />
                        <Title order={4}>Gerar Métricas</Title>
                    </Group>
                </Group>
                
                <Grid>
                    <Grid.Col span={{ base: 12, md: 3 }}>
                        <Select
                            label="País"
                            placeholder="Selecione"
                            data={paisesOptions}
                            value={paisId}
                            onChange={setPaisId}
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 3 }}>
                        <DateInput
                            label="Data Início"
                            value={dataInicio}
                            onChange={setDataInicio}
                            placeholder="dd/mm/aaaa"
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 3 }}>
                        <DateInput
                            label="Data Fim"
                            value={dataFim}
                            onChange={setDataFim}
                            placeholder="dd/mm/aaaa"
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 3 }}>
                        <Text size="sm" fw={500} mb="xs">Ação</Text>
                        <Button 
                            fullWidth
                            onClick={processarMetricas}
                            disabled={!paisId || !dataInicio || !dataFim}
                            loading={isLoading}
                        >
                            Processar
                        </Button>
                    </Grid.Col>
                </Grid>
            </Paper>

            {/* Análises Salvas */}
            {analisesSalvas.length > 0 && (
                <Paper shadow="sm" p="md" mb="xl">
                    <Group justify="space-between" mb="md">
                        <Group gap="sm">
                            <IconDeviceAnalytics size={20} />
                            <Title order={4}>Análises Salvas</Title>
                        </Group>
                        <Badge variant="light">{analisesSalvas.length}</Badge>
                    </Group>
                    
                    <Grid>
                        {analisesSalvas.map(analise => (
                            <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={analise.id}>
                                <Card withBorder>
                                    <Group justify="space-between" mb="xs">
                                        <Text fw={500} truncate>{analise.nome}</Text>
                                        <Badge color="blue" variant="light">ECOMHUB</Badge>
                                    </Group>
                                    <Text size="xs" c="dimmed" mb="md">
                                        {new Date(analise.criado_em).toLocaleDateString('pt-BR')}
                                    </Text>
                                    <Group justify="space-between">
                                        <Button size="xs" variant="light" onClick={() => carregarAnalise(analise)}>
                                            Carregar
                                        </Button>
                                        <ActionIcon 
                                            color="red" 
                                            variant="light" 
                                            onClick={() => deletarAnalise(analise.id, analise.nome)}
                                        >
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Group>
                                </Card>
                            </Grid.Col>
                        ))}
                    </Grid>
                </Paper>
            )}

            {/* Estatísticas */}
            {renderEstatisticas()}

            {/* Tabela */}
            {renderTabela()}

            {/* Modal para salvar */}
            <Modal 
                opened={modalSalvar} 
                onClose={() => setModalSalvar(false)}
                title="Salvar Análise"
            >
                <Stack>
                    <TextInput
                        label="Nome da Análise"
                        placeholder="Ex: Análise Julho 2025 - Espanha"
                        value={nomeAnalise}
                        onChange={(e) => setNomeAnalise(e.target.value)}
                        required
                    />
                    <Group justify="flex-end">
                        <Button variant="outline" onClick={() => setModalSalvar(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={salvarAnalise} 
                            disabled={!nomeAnalise}
                            loading={isLoading}
                        >
                            Salvar
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}

export default EcomhubPage;