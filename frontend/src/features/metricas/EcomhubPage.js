// frontend/src/features/metricas/EcomhubPage.js
import React, { useState, useEffect } from 'react';
import {
    Box, Title, Text, Paper, Group, Button, Table, Stack, Grid,
    Alert, ActionIcon, Modal, Card, Select, Container, Progress,
    ScrollArea, Loader, TextInput, Badge
} from '@mantine/core';
import {
    IconCalendar, IconDownload, IconTrash, IconRefresh, IconCheck, IconX, 
    IconAlertTriangle, IconBuilding, IconChartBar,
    IconEye, IconActivity, IconSearch, IconWorldWww, IconChevronUp, IconChevronDown
} from '@tabler/icons-react';

const PAISES = [
    { value: '164', label: 'Espanha' },
    { value: '41', label: 'Croácia' },
    { value: '66', label: 'Grécia' },
    { value: '82', label: 'Itália' },
    { value: '142', label: 'Romênia' }
];

function EcomhubPage() {
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [dadosResultado, setDadosResultado] = useState(null);
    const [dataInicio, setDataInicio] = useState(null);
    const [dataFim, setDataFim] = useState(null);
    const [paisSelecionado, setPaisSelecionado] = useState('164');
    const [modalSalvar, setModalSalvar] = useState(false);
    const [nomeAnalise, setNomeAnalise] = useState('');
    const [loadingProcessar, setLoadingProcessar] = useState(false);
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [loadingAnalises, setLoadingAnalises] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState({});
    const [notification, setNotification] = useState(null);
    const [progressoAtual, setProgressoAtual] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Mock API calls - replace with actual API calls
    const apiCall = async (method, url, data = null) => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (url.includes('analises/processar_selenium')) {
            return {
                data: {
                    status: 'success',
                    dados_processados: [
                        {
                            Imagem: 'https://api.ecomhub.app/public/products/featuredImage-1736857928656-374d84ce.jpeg',
                            Produto: 'Drone W8 PRO MAX',
                            Total: 7,
                            ready_to_ship: 7,
                            Efetividade: '0%'
                        },
                        {
                            Imagem: null,
                            Produto: 'Total',
                            Total: 7,
                            ready_to_ship: 7,
                            Efetividade: '0% (Média)'
                        }
                    ]
                }
            };
        }
        
        if (url.includes('analises/') && method === 'GET') {
            return { data: [] };
        }
        
        return { data: { id: 1 } };
    };

    const fetchAnalises = async () => {
        setLoadingAnalises(true);
        try {
            const response = await apiCall('GET', '/metricas/ecomhub/analises/');
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

        const diffTime = Math.abs(dataFim - dataInicio);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            showNotification('error', 'Selecione um período de pelo menos 2 dias');
            return;
        }

        setLoadingProcessar(true);
        setProgressoAtual({ etapa: 'Iniciando automação...', porcentagem: 0 });

        try {
            const response = await apiCall('POST', '/metricas/ecomhub/analises/processar_selenium/', {
                data_inicio: dataInicio.toISOString().split('T')[0],
                data_fim: dataFim.toISOString().split('T')[0],
                pais_id: paisSelecionado
            });

            if (response.data.status === 'success') {
                setDadosResultado(response.data.dados_processados);
                showNotification('success', 'Dados processados com sucesso!');
                
                const paisNome = PAISES.find(p => p.value === paisSelecionado)?.label || 'País';
                const dataStr = `${dataInicio.toLocaleDateString()} - ${dataFim.toLocaleDateString()}`;
                setNomeAnalise(`${paisNome} ${dataStr}`);
            }
        } catch (error) {
            console.error('Erro no processamento:', error);
            showNotification('error', `Erro: ${error.message}`);
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
            const response = await apiCall('POST', '/metricas/ecomhub/analises/', {
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
            showNotification('error', `Erro ao salvar: ${error.message}`);
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
            await apiCall('DELETE', `/metricas/ecomhub/analises/${id}/`);
            showNotification('success', 'Análise deletada!');
            fetchAnalises();
            
            if (dadosResultado && dadosResultado?.id === id) {
                setDadosResultado(null);
            }
        } catch (error) {
            showNotification('error', `Erro ao deletar: ${error.message}`);
        } finally {
            setLoadingDelete(prev => ({ ...prev, [id]: false }));
        }
    };

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

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = React.useMemo(() => {
        if (!dadosResultado || !sortConfig.key) return dadosResultado;
        
        return [...dadosResultado].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];
            
            if (sortConfig.key === 'Efetividade') {
                aValue = parseFloat(aValue?.replace('%', '').replace('(Média)', '') || 0);
                bValue = parseFloat(bValue?.replace('%', '').replace('(Média)', '') || 0);
            } else if (typeof aValue === 'string' && !isNaN(aValue)) {
                aValue = parseFloat(aValue) || 0;
                bValue = parseFloat(bValue) || 0;
            }
            
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [dadosResultado, sortConfig]);

    const renderFormulario = () => (
        <Paper shadow="sm" p="md" mb="md" style={{ position: 'relative' }}>
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
                    <Text mt="md" fw={500}>Processando dados via automação...</Text>
                    {progressoAtual && (
                        <>
                            <Progress value={progressoAtual.porcentagem} w="60%" mt="md" />
                            <Text size="sm" c="dimmed" mt="xs">{progressoAtual.etapa}</Text>
                        </>
                    )}
                </div>
            )}

            <Title order={4} mb="md">Processamento Automático</Title>
            
            <Grid>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput
                        type="date"
                        label="Data de Início"
                        value={dataInicio ? dataInicio.toISOString().split('T')[0] : ''}
                        onChange={(e) => setDataInicio(e.target.value ? new Date(e.target.value) : null)}
                        disabled={loadingProcessar}
                        leftSection={<IconCalendar size={16} />}
                    />
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput
                        type="date"
                        label="Data de Fim"
                        value={dataFim ? dataFim.toISOString().split('T')[0] : ''}
                        onChange={(e) => setDataFim(e.target.value ? new Date(e.target.value) : null)}
                        disabled={loadingProcessar}
                        leftSection={<IconCalendar size={16} />}
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

            <Group justify="flex-end" mt="md">
                <Button
                    leftSection={loadingProcessar ? <Loader size="xs" /> : <IconSearch size={16} />}
                    onClick={processarDados}
                    disabled={!dataInicio || !dataFim || !paisSelecionado || loadingProcessar}
                    loading={loadingProcessar}
                    size="md"
                >
                    {loadingProcessar ? 'Processando...' : 'Processar Dados'}
                </Button>
            </Group>
        </Paper>
    );

    const renderResultados = () => {
        if (!dadosResultado || !Array.isArray(dadosResultado)) return null;
        
        const dataToRender = sortedData || dadosResultado;
        const columns = Object.keys(dataToRender[0] || {});

        return (
            <Paper shadow="sm" p="md" mb="md">
                <Group justify="space-between" mb="md">
                    <Box>
                        <Title order={3}>Lista de produtos</Title>
                        <Text c="dimmed">Veja dados segmentados por produto</Text>
                    </Box>
                    <Button
                        leftSection={<IconDownload size={16} />}
                        onClick={() => setModalSalvar(true)}
                        variant="light"
                    >
                        Salvar Análise
                    </Button>
                </Group>

                <ScrollArea>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                {columns.map(col => (
                                    <Table.Th 
                                        key={col}
                                        style={{ 
                                            width: col === 'Imagem' ? '80px' : 'auto',
                                            cursor: col !== 'Imagem' ? 'pointer' : 'default'
                                        }}
                                        onClick={() => col !== 'Imagem' && handleSort(col)}
                                    >
                                        <Group gap="xs" wrap="nowrap">
                                            <Text size="sm" fw={500}>{col}</Text>
                                            {col !== 'Imagem' && sortConfig.key === col && (
                                                sortConfig.direction === 'asc' ? 
                                                <IconChevronUp size={14} /> : 
                                                <IconChevronDown size={14} />
                                            )}
                                        </Group>
                                    </Table.Th>
                                ))}
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {dataToRender.map((row, idx) => (
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
                                            style={col === 'Efetividade' ? getEfetividadeCor(value) : {}}
                                        >
                                            {col === 'Imagem' ? (
                                                <Box style={{ width: '60px', height: '60px', position: 'relative' }}>
                                                    {value ? (
                                                        <img 
                                                            src={value} 
                                                            alt="Produto" 
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover',
                                                                borderRadius: '8px',
                                                                border: '1px solid #e0e0e0'
                                                            }}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <Box style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            backgroundColor: '#f5f5f5',
                                                            borderRadius: '8px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: '1px solid #e0e0e0'
                                                        }}>
                                                            <IconBuilding size={24} color="#999" />
                                                        </Box>
                                                    )}
                                                </Box>
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
                <Title order={4}>Análises Salvas ({analisesSalvas.length})</Title>
                <Button
                    leftSection={<IconRefresh size={16} />}
                    variant="outline"
                    size="sm"
                    onClick={fetchAnalises}
                >
                    Atualizar
                </Button>
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
                                        Produto
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

    useEffect(() => {
        fetchAnalises();
    }, []);

    return (
        <Container fluid p="md">
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2}>ECOMHUB - Automação Selenium</Title>
                    <Text c="dimmed">Processamento automático de dados via automação web</Text>
                </div>
                <Badge color="green" variant="light" size="lg">
                    <IconActivity size={16} style={{ marginRight: 4 }} />
                    Servidor Externo
                </Badge>
            </Group>

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

            {renderFormulario()}
            {renderResultados()}
            {renderAnalisesSalvas()}

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

                    <Alert color="blue" mb="md" icon={<IconChartBar size={16} />}>
                        <Text fw={500} mb="xs">Salvando resultado do processamento</Text>
                        <Text size="sm">
                            País: {PAISES.find(p => p.value === paisSelecionado)?.label}
                        </Text>
                        <Text size="sm">
                            Período: {dataInicio?.toLocaleDateString()} - {dataFim?.toLocaleDateString()}
                        </Text>
                    </Alert>

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
                            {loadingSalvar ? 'Salvando...' : 'Salvar Análise'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}

export default EcomhubPage;