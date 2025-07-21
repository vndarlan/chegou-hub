// frontend/src/features/metricas/EcomhubPage.js - COM VISUALIZAÇÃO OTIMIZADA
import React, { useState, useEffect } from 'react';
import {
    Box, Title, Text, Paper, Group, Button, Table, Badge, Stack, Grid,
    Alert, ActionIcon, Modal, Card, Select, Container, Progress,
    Notification, ScrollArea, Loader, Divider, TextInput, ThemeIcon,
    SegmentedControl
} from '@mantine/core';
import {
    IconCalendar, IconDownload, IconTrash, IconRefresh, IconCheck, IconX, 
    IconAlertTriangle, IconTrendingUp, IconBuilding, IconChartBar, IconPlus,
    IconEye, IconActivity, IconSearch, IconWorldWww, IconSortAscending,
    IconSortDescending, IconPackage, IconTarget, IconPercentage, IconToggleLeft,
    IconToggleRight, IconListDetails, IconChartPie
} from '@tabler/icons-react';

import axios from 'axios';

// Países disponíveis
const PAISES = [
    { value: '164', label: 'Espanha' },
    { value: '41', label: 'Croácia' },
    { value: '66', label: 'Grécia' },
    { value: '82', label: 'Itália' },
    { value: '142', label: 'Romênia' }
];

function EcomhubPage() {
    // Estados principais
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [dadosResultado, setDadosResultado] = useState(null);
    
    // NOVO: Tipo de visualização
    const [tipoVisualizacao, setTipoVisualizacao] = useState('otimizada'); // 'otimizada' ou 'total'
    
    // Estados do formulário
    const [dataInicio, setDataInicio] = useState(null);
    const [dataFim, setDataFim] = useState(null);
    const [paisSelecionado, setPaisSelecionado] = useState('164'); // Espanha default
    
    // Estados de modal e loading
    const [modalSalvar, setModalSalvar] = useState(false);
    const [nomeAnalise, setNomeAnalise] = useState('');
    const [loadingProcessar, setLoadingProcessar] = useState(false);
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [loadingAnalises, setLoadingAnalises] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState({});
    
    // Estados de notificação e progresso
    const [notification, setNotification] = useState(null);
    const [progressoAtual, setProgressoAtual] = useState(null);

    // Estados para ordenação
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');

    // ======================== FUNÇÕES DE API ========================

    const fetchAnalises = async () => {
        setLoadingAnalises(true);
        try {
            const response = await axios.get('/metricas/ecomhub/analises/');
            setAnalisesSalvas(response.data);
        } catch (error) {
            console.error('Erro ao buscar análises:', error);
            showNotification('error', 'Erro ao carregar análises salvas');
        } finally {
            setLoadingAnalises(false);
        }
    };

    const processarDados = async () => {
        if (!dataInicio || !dataFim || !paisSelecionado) {
            showNotification('error', 'Selecione as datas e o país');
            return;
        }

        if (dataInicio > dataFim) {
            showNotification('error', 'Data de início deve ser anterior à data fim');
            return;
        }

        setLoadingProcessar(true);
        setProgressoAtual({ etapa: 'Iniciando automação...', porcentagem: 0 });

        try {
            const response = await axios.post('/metricas/ecomhub/analises/processar_selenium/', {
                data_inicio: dataInicio.toISOString().split('T')[0],
                data_fim: dataFim.toISOString().split('T')[0],
                pais_id: paisSelecionado
            });

            if (response.data.status === 'success') {
                // AGORA OS DADOS VÊM COM AMBAS AS VISUALIZAÇÕES
                setDadosResultado(response.data.dados_processados);
                showNotification('success', 'Dados processados com sucesso!');
                
                // Gerar nome automático para análise
                const paisNome = PAISES.find(p => p.value === paisSelecionado)?.label || 'País';
                const dataStr = `${dataInicio.toLocaleDateString()} - ${dataFim.toLocaleDateString()}`;
                setNomeAnalise(`${paisNome} ${dataStr}`);
            }
        } catch (error) {
            console.error('Erro no processamento:', error);
            showNotification('error', `Erro: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingProcessar(false);
            setProgressoAtual(null);
        }
    };

    const salvarAnalise = async () => {
        if (!dadosResultado || !nomeAnalise) {
            showNotification('error', 'Dados ou nome da análise inválidos');
            return;
        }

        setLoadingSalvar(true);
        try {
            const response = await axios.post('/metricas/ecomhub/analises/', {
                nome: nomeAnalise,
                dados_efetividade: dadosResultado,
                tipo_metrica: 'produto',
                descricao: `Automação Selenium - ${PAISES.find(p => p.value === paisSelecionado)?.label}`
            });

            if (response.data.id) {
                showNotification('success', `Análise '${nomeAnalise}' salva!`);
                setModalSalvar(false);
                setNomeAnalise('');
                fetchAnalises();
            }
        } catch (error) {
            showNotification('error', `Erro ao salvar: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingSalvar(false);
        }
    };

    const carregarAnalise = (analise) => {
        setDadosResultado(analise.dados_efetividade);
        showNotification('success', 'Análise carregada!');
    };

    const deletarAnalise = async (id, nome) => {
        const nomeDisplay = nome.replace('[ECOMHUB] ', '');
        if (!window.confirm(`Deletar análise '${nomeDisplay}'?`)) return;

        setLoadingDelete(prev => ({ ...prev, [id]: true }));
        try {
            await axios.delete(`/metricas/ecomhub/analises/${id}/`);
            showNotification('success', `Análise deletada!`);
            fetchAnalises();
            
            if (dadosResultado && dadosResultado?.id === id) {
                setDadosResultado(null);
            }
        } catch (error) {
            showNotification('error', `Erro ao deletar: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingDelete(prev => ({ ...prev, [id]: false }));
        }
    };

    // ======================== FUNÇÕES AUXILIARES ========================

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const getEfetividadeCor = (valor) => {
        if (!valor || typeof valor !== 'string') return {};
        
        const numero = parseFloat(valor.replace('%', '').replace('(Média)', ''));
        
        if (numero >= 60) return { backgroundColor: '#2E7D2E', color: 'white', fontWeight: 'bold' };
        if (numero >= 50) return { backgroundColor: '#4CAF50', color: 'white', fontWeight: 'bold' };
        if (numero >= 40) return { backgroundColor: '#FFA726', color: 'black', fontWeight: 'bold' };
        return { backgroundColor: '#F44336', color: 'white', fontWeight: 'bold' };
    };

    // NOVA: Função para obter dados de acordo com o tipo de visualização
    const getDadosVisualizacao = () => {
        if (!dadosResultado) return null;
        
        if (tipoVisualizacao === 'otimizada') {
            return dadosResultado.visualizacao_otimizada || dadosResultado;
        } else {
            return dadosResultado.visualizacao_total || dadosResultado;
        }
    };

    // NOVA: Cores específicas para colunas da visualização otimizada
    const getCorColuna = (coluna, valor) => {
        if (tipoVisualizacao !== 'otimizada') {
            // Para visualização total, usar cor apenas na efetividade
            if (coluna === 'Efetividade') {
                return getEfetividadeCor(valor);
            }
            return {};
        }

        // Para visualização otimizada, diferentes cores por tipo de coluna
        switch (coluna) {
            case 'Efetividade_Total':
            case 'Efetividade_Parcial':
                return getEfetividadeCor(valor);
            
            case 'PCT_Transito':
                const pctTransito = parseFloat(valor.replace('%', '') || 0);
                if (pctTransito >= 30) return { backgroundColor: '#FFA726', color: 'black', fontWeight: 'bold' };
                if (pctTransito >= 15) return { backgroundColor: '#FFD54F', color: 'black', fontWeight: 'bold' };
                return { backgroundColor: '#E8F5E8', color: 'black' };
            
            case 'PCT_Devolvidos':
                const pctDev = parseFloat(valor.replace('%', '') || 0);
                if (pctDev >= 10) return { backgroundColor: '#F44336', color: 'white', fontWeight: 'bold' };
                if (pctDev >= 5) return { backgroundColor: '#FF9800', color: 'black', fontWeight: 'bold' };
                return { backgroundColor: '#E8F5E8', color: 'black' };
            
            default:
                return {};
        }
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
        const dados = getDadosVisualizacao();
        if (!dados || !Array.isArray(dados)) return null;
        
        const produtos = dados.filter(item => item.Produto !== 'Total');
        const totalProdutos = produtos.length;
        
        let efetividadeMedia = 0;
        let totalVendas = 0;
        let totalLeads = 0;

        if (tipoVisualizacao === 'otimizada') {
            efetividadeMedia = produtos.reduce((sum, item) => {
                const ef = parseFloat(item.Efetividade_Total?.replace('%', '') || 0);
                return sum + ef;
            }, 0) / totalProdutos;
            
            totalVendas = produtos.reduce((sum, item) => sum + (item.Entregues || 0), 0);
            totalLeads = produtos.reduce((sum, item) => sum + (item.Pedidos_Totais || 0), 0);
        } else {
            efetividadeMedia = produtos.reduce((sum, item) => {
                const ef = parseFloat(item.Efetividade?.replace('%', '') || 0);
                return sum + ef;
            }, 0) / totalProdutos;
            
            totalVendas = produtos.reduce((sum, item) => sum + (item.Delivered || 0), 0);
            totalLeads = produtos.reduce((sum, item) => sum + (item['Confirmed (Leads)'] || 0), 0);
        }
        
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
                                <Text size="sm" c="dimmed">
                                    {tipoVisualizacao === 'otimizada' ? 'Entregues' : 'Total Vendas'}
                                </Text>
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
                                <Text size="sm" c="dimmed">
                                    {tipoVisualizacao === 'otimizada' ? 'Pedidos Totais' : 'Total Leads'}
                                </Text>
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

    const renderFormulario = () => (
        <Paper shadow="sm" p="xs" mb="md" style={{ position: 'relative' }}>
            {loadingProcessar && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                }}>
                    <Loader size="lg" />
                    <Text mt="md" fw={500}>Processando dados...</Text>
                    {progressoAtual && (
                        <>
                            <Progress value={progressoAtual.porcentagem} w="60%" mt="md" />
                            <Text size="sm" c="dimmed" mt="xs">{progressoAtual.etapa}</Text>
                        </>
                    )}
                </div>
            )}

            <Group gap="sm" mb="sm">
                <IconSearch size={20} />
                <Title order={4}>Gerar Métricas</Title>
            </Group>
            
            <Grid gutter="sm">
                <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput
                        type="date"
                        label="Data de Início"
                        value={dataInicio ? dataInicio.toISOString().split('T')[0] : ''}
                        onChange={(e) => setDataInicio(e.target.value ? new Date(e.target.value) : null)}
                        disabled={loadingProcessar}
                    />
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput
                        type="date"
                        label="Data de Fim"
                        value={dataFim ? dataFim.toISOString().split('T')[0] : ''}
                        onChange={(e) => setDataFim(e.target.value ? new Date(e.target.value) : null)}
                        disabled={loadingProcessar}
                    />
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 4 }}>
                    <Select
                        label="País"
                        data={PAISES}
                        value={paisSelecionado}
                        onChange={setPaisSelecionado}
                        disabled={loadingProcessar}
                        leftSection={<IconWorldWww size={16} />}
                    />
                </Grid.Col>
            </Grid>

            <Group justify="flex-end" mt="sm">
                <Button
                    leftSection={loadingProcessar ? <Loader size="xs" /> : <IconSearch size={16} />}
                    onClick={processarDados}
                    disabled={!dataInicio || !dataFim || !paisSelecionado || loadingProcessar}
                    loading={loadingProcessar}
                    size="md"
                >
                    {loadingProcessar ? 'Processando...' : 'Processar'}
                </Button>
            </Group>
        </Paper>
    );

    // NOVO: Componente para seleção de tipo de visualização
    const renderSeletorVisualizacao = () => {
        if (!dadosResultado) return null;

        return (
            <Paper shadow="sm" p="sm" mb="md">
                <Group justify="space-between" align="center">
                    <Group gap="sm">
                        <IconChartPie size={20} />
                        <Title order={5}>Tipo de Visualização</Title>
                    </Group>
                    
                    <SegmentedControl
                        value={tipoVisualizacao}
                        onChange={setTipoVisualizacao}
                        data={[
                            {
                                label: 'Otimizada',
                                value: 'otimizada'
                            },
                            {
                                label: 'Total',
                                value: 'total'
                            }
                        ]}
                    />
                </Group>

                {tipoVisualizacao === 'otimizada' && (
                    <Alert color="blue" mt="sm" icon={<IconChartPie size={16} />}>
                        <Text size="sm">
                            <strong>Visualização Otimizada:</strong> Status agrupados em colunas mais analíticas 
                            (Pedidos Totais, Enviados, Em Trânsito, Problemas, etc.) com percentuais e efetividades calculadas.
                        </Text>
                    </Alert>
                )}

                {tipoVisualizacao === 'total' && (
                    <Alert color="orange" mt="sm" icon={<IconListDetails size={16} />}>
                        <Text size="sm">
                            <strong>Visualização Total:</strong> Todos os status individuais conforme retornados 
                            da ECOMHUB, sem agrupamentos ou cálculos adicionais.
                        </Text>
                    </Alert>
                )}
            </Paper>
        );
    };

    const renderResultados = () => {
        const dados = getDadosVisualizacao();
        if (!dados || !Array.isArray(dados)) return null;

        const colunas = Object.keys(dados[0] || {});
        const dadosOrdenados = sortData(dados, sortBy, sortOrder);

        return (
            <Paper shadow="sm" p="md" mb="md">
                <Group justify="space-between" mb="md">
                    <Title order={4}>
                        Métricas de Produtos - {tipoVisualizacao === 'otimizada' ? 'Otimizada' : 'Total'}
                    </Title>
                    <Group>
                        <Badge variant="light" color="blue">
                            {dados.length} registros
                        </Badge>
                        <Button
                            leftSection={<IconDownload size={16} />}
                            onClick={() => setModalSalvar(true)}
                            variant="light"
                        >
                            Salvar Análise
                        </Button>
                    </Group>
                </Group>

                <ScrollArea>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                {colunas.map(col => (
                                    <Table.Th key={col}>
                                        <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => handleSort(col)}>
                                            <Text size="sm" fw={500}>
                                                {col.replace('_', ' ').replace(/([A-Z])/g, ' $1').trim()}
                                            </Text>
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
                                <Table.Tr
                                    key={idx}
                                    style={{
                                        backgroundColor: row.Produto === 'Total' ? '#f8f9fa' : undefined,
                                        fontWeight: row.Produto === 'Total' ? 'bold' : undefined
                                    }}
                                >
                                    {Object.entries(row).map(([col, value]) => (
                                        <Table.Td
                                            key={col}
                                            style={getCorColuna(col, value)}
                                        >
                                            {col === 'Imagem' && value ? (
                                                <img 
                                                    src={value} 
                                                    alt="Produto" 
                                                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            ) : (
                                                typeof value === 'number' ? value.toLocaleString() : value
                                            )}
                                        </Table.Td>
                                    ))}
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Paper>
        );
    };

    const renderAnalisesSalvas = () => (
        <Paper shadow="sm" p="md" style={{ position: 'relative' }}>
            {loadingAnalises && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                }}>
                    <Loader size="lg" />
                </div>
            )}

            <Group justify="space-between" mb="md">
                <Group gap="sm">
                    <IconChartBar size={20} />
                    <Title order={4}>Análises Salvas</Title>
                </Group>
                <Group>
                    <Badge variant="light">{analisesSalvas.length}</Badge>
                    <Button
                        leftSection={<IconRefresh size={16} />}
                        variant="outline"
                        size="sm"
                        onClick={fetchAnalises}
                    >
                        Atualizar
                    </Button>
                </Group>
            </Group>

            {analisesSalvas.length === 0 ? (
                <Alert color="blue" icon={<IconChartBar size={16} />}>
                    <Text fw={500} mb="xs">Nenhuma análise salva</Text>
                    <Text size="sm" c="dimmed">
                        Processe dados e salve o resultado para vê-lo aqui.
                    </Text>
                </Alert>
            ) : (
                <Grid>
                    {analisesSalvas.map(analise => (
                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={analise.id}>
                            <Card withBorder style={{ position: 'relative' }}>
                                {loadingDelete[analise.id] && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        backgroundColor: 'rgba(255,255,255,0.8)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 10
                                    }}>
                                        <Loader size="sm" />
                                    </div>
                                )}

                                <Group justify="space-between" mb="xs">
                                    <Text fw={500} truncate style={{ maxWidth: '70%' }}>
                                        {analise.nome.replace('[ECOMHUB] ', '')}
                                    </Text>
                                    <Badge color="blue" variant="light">
                                        ECOMHUB
                                    </Badge>
                                </Group>

                                <Text size="xs" c="dimmed" mb="md">
                                    {new Date(analise.criado_em).toLocaleDateString('pt-BR')} por {analise.criado_por_nome}
                                </Text>

                                <Group justify="space-between">
                                    <Button
                                        size="xs"
                                        variant="light"
                                        onClick={() => carregarAnalise(analise)}
                                        leftSection={<IconEye size={14} />}
                                    >
                                        Carregar
                                    </Button>
                                    <ActionIcon
                                        color="red"
                                        variant="light"
                                        onClick={() => deletarAnalise(analise.id, analise.nome)}
                                        loading={loadingDelete[analise.id]}
                                    >
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Group>
                            </Card>
                        </Grid.Col>
                    ))}
                </Grid>
            )}
        </Paper>
    );

    // ======================== EFEITOS ========================

    useEffect(() => {
        fetchAnalises();
    }, []);

    // ======================== RENDER PRINCIPAL ========================

    return (
        <Container fluid p="md">
            {/* Header */}
            <Group justify="space-between" mb="xl">
                <div>
                    <Group gap="sm">
                        <IconChartBar size={28} color="var(--mantine-color-blue-6)" />
                        <Title order={2}>Métricas ECOMHUB</Title>
                    </Group>
                    <Text c="dimmed">Análise de efetividade de produtos</Text>
                </div>
            </Group>

            {/* Notificações */}
            {notification && (
                <Alert
                    color={notification.type === 'success' ? 'green' : notification.type === 'warning' ? 'yellow' : 'red'}
                    title={notification.type === 'success' ? 'Sucesso' : notification.type === 'warning' ? 'Atenção' : 'Erro'}
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
            {renderFormulario()}

            {/* NOVO: Seletor de Visualização */}
            {renderSeletorVisualizacao()}

            {/* Estatísticas */}
            {renderEstatisticas()}

            {/* Resultados */}
            {renderResultados()}

            {/* Análises Salvas */}
            {renderAnalisesSalvas()}

            {/* Modal para salvar análise */}
            <Modal
                opened={modalSalvar}
                onClose={() => setModalSalvar(false)}
                title="Salvar Análise"
            >
                <Stack style={{ position: 'relative' }}>
                    {loadingSalvar && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10
                        }}>
                            <Loader size="lg" />
                        </div>
                    )}

                    <TextInput
                        label="Nome da Análise"
                        placeholder="Ex: Espanha Junho 2025"
                        value={nomeAnalise}
                        onChange={(e) => setNomeAnalise(e.target.value)}
                        required
                        disabled={loadingSalvar}
                    />

                    <Group justify="flex-end">
                        <Button variant="outline" onClick={() => setModalSalvar(false)} disabled={loadingSalvar}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={salvarAnalise}
                            disabled={!nomeAnalise}
                            loading={loadingSalvar}
                            leftSection={loadingSalvar ? <Loader size="xs" /> : <IconDownload size={16} />}
                        >
                            {loadingSalvar ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}

export default EcomhubPage;