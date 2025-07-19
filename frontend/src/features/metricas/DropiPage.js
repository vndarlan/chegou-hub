// frontend/src/features/metricas/DropiPage.js
import React, { useState, useEffect } from 'react';
import {
    Box, Title, Text, Paper, Group, Button, Table, Badge, Stack, Grid,
    Alert, ActionIcon, Modal, Card, Container, Progress,
    ScrollArea, Loader, TextInput, ThemeIcon, NumberInput
} from '@mantine/core';
import {
    IconCalendar, IconDownload, IconTrash, IconRefresh, IconCheck, IconX, 
    IconAlertTriangle, IconTrendingUp, IconBuilding, IconChartBar, IconPlus,
    IconEye, IconSearch, IconPackage, IconTarget, IconPercentage, IconShoppingCart,
    IconCurrency, IconMap, IconClock, IconUser, IconPhone, IconMail
} from '@tabler/icons-react';

import axios from 'axios';

// Status traduzidos do Dropi
const STATUS_DROPI = {
    'GUIA_GENERADA': { label: 'Guia Gerada', color: 'blue' },
    'PREPARADO PARA TRANSPORTADORA': { label: 'Preparado', color: 'orange' },
    'ENTREGADO A TRANSPORTADORA': { label: 'Entregue', color: 'green' },
    'INTENTO DE ENTREGA': { label: 'Tentativa', color: 'yellow' },
    'CANCELADO': { label: 'Cancelado', color: 'red' },
    'PENDIENTE': { label: 'Pendente', color: 'gray' }
};

function DropiPage() {
    // Estados principais
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [dadosResultado, setDadosResultado] = useState(null);
    
    // Estados do formulário
    const [dataInicio, setDataInicio] = useState(null);
    const [dataFim, setDataFim] = useState(null);
    const [userId, setUserId] = useState('9789'); // Seu user_id padrão
    
    // Estados de modal e loading
    const [modalSalvar, setModalSalvar] = useState(false);
    const [nomeAnalise, setNomeAnalise] = useState('');
    const [loadingProcessar, setLoadingProcessar] = useState(false);
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [loadingAnalises, setLoadingAnalises] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState({});
    
    // Estados de notificação
    const [notification, setNotification] = useState(null);

    // Estados para filtros da tabela
    const [filtroStatus, setFiltroStatus] = useState('');
    const [filtroFornecedor, setFiltroFornecedor] = useState('');
    const [filtroNome, setFiltroNome] = useState('');

    // ======================== FUNÇÕES DE API ========================

    const fetchAnalises = async () => {
        setLoadingAnalises(true);
        try {
            const response = await axios.get('/metricas/dropi/analises/');
            setAnalisesSalvas(response.data);
        } catch (error) {
            console.error('Erro ao buscar análises:', error);
            showNotification('error', 'Erro ao carregar análises salvas');
        } finally {
            setLoadingAnalises(false);
        }
    };

    const processarDados = async () => {
        if (!dataInicio || !dataFim || !userId) {
            showNotification('error', 'Preencha todos os campos');
            return;
        }

        if (dataInicio > dataFim) {
            showNotification('error', 'Data de início deve ser anterior à data fim');
            return;
        }

        setLoadingProcessar(true);

        try {
            const response = await axios.post('/metricas/dropi/analises/processar_dados/', {
                data_inicio: dataInicio.toISOString().split('T')[0],
                data_fim: dataFim.toISOString().split('T')[0],
                user_id: userId
            });

            if (response.data.status === 'success') {
                setDadosResultado(response.data.dados_processados);
                showNotification('success', `${response.data.total_pedidos} pedidos extraídos com sucesso!`);
                
                // Gerar nome automático
                const dataStr = `${dataInicio.toLocaleDateString()} - ${dataFim.toLocaleDateString()}`;
                setNomeAnalise(`Dropi MX ${dataStr}`);
            }
        } catch (error) {
            console.error('Erro no processamento:', error);
            showNotification('error', `Erro: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingProcessar(false);
        }
    };

    const salvarAnalise = async () => {
        if (!dadosResultado || !nomeAnalise) {
            showNotification('error', 'Dados ou nome da análise inválidos');
            return;
        }

        setLoadingSalvar(true);
        try {
            const response = await axios.post('/metricas/dropi/analises/', {
                nome: nomeAnalise,
                dados_pedidos: dadosResultado,
                data_inicio: dataInicio.toISOString().split('T')[0],
                data_fim: dataFim.toISOString().split('T')[0],
                user_id_dropi: userId,
                total_pedidos: dadosResultado?.length || 0,
                tipo_metrica: 'pedidos',
                descricao: `Extração Dropi MX - ${dadosResultado?.length || 0} pedidos`
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
        setDadosResultado(analise.dados_pedidos);
        setDataInicio(new Date(analise.data_inicio));
        setDataFim(new Date(analise.data_fim));
        setUserId(analise.user_id_dropi);
        showNotification('success', 'Análise carregada!');
    };

    const deletarAnalise = async (id, nome) => {
        const nomeDisplay = nome.replace('[DROPI] ', '');
        if (!window.confirm(`Deletar análise '${nomeDisplay}'?`)) return;

        setLoadingDelete(prev => ({ ...prev, [id]: true }));
        try {
            await axios.delete(`/metricas/dropi/analises/${id}/`);
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

    // Filtrar dados da tabela
    const dadosFiltrados = dadosResultado?.filter(pedido => {
        const matchStatus = !filtroStatus || pedido.status?.includes(filtroStatus.toUpperCase());
        const matchFornecedor = !filtroFornecedor || pedido.supplier_name?.toLowerCase().includes(filtroFornecedor.toLowerCase());
        const matchNome = !filtroNome || pedido.name?.toLowerCase().includes(filtroNome.toLowerCase());
        return matchStatus && matchFornecedor && matchNome;
    }) || [];

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    const renderEstatisticas = () => {
        if (!dadosResultado || !Array.isArray(dadosResultado)) return null;
        
        const totalPedidos = dadosResultado.length;
        const totalValor = dadosResultado.reduce((sum, item) => sum + (parseFloat(item.total_order) || 0), 0);
        
        // Contar por status
        const statusCount = dadosResultado.reduce((acc, item) => {
            const status = item.status || 'UNKNOWN';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
        
        const entregues = statusCount['ENTREGADO A TRANSPORTADORA'] || 0;
        const efetividade = totalPedidos > 0 ? ((entregues / totalPedidos) * 100).toFixed(1) : 0;
        
        return (
            <Grid gutter="md" mb="xl">
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Total Pedidos</Text>
                                <Text size="xl" fw={700}>{totalPedidos}</Text>
                            </div>
                            <ThemeIcon color="blue" variant="light" size="xl">
                                <IconShoppingCart size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Valor Total</Text>
                                <Text size="xl" fw={700} c="green">R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                            </div>
                            <ThemeIcon color="green" variant="light" size="xl">
                                <IconCurrency size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Entregues</Text>
                                <Text size="xl" fw={700} c="blue">{entregues}</Text>
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
                                <Text size="sm" c="dimmed">Taxa Entrega</Text>
                                <Text size="xl" fw={700} c="orange">{efetividade}%</Text>
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
                    <Text mt="md" fw={500}>Extraindo dados do Dropi...</Text>
                    <Text size="sm" c="dimmed" mt="xs">Isso pode levar alguns segundos</Text>
                </div>
            )}

            <Group gap="sm" mb="sm">
                <IconSearch size={20} />
                <Title order={4}>Extrair Pedidos</Title>
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
                    <NumberInput
                        label="User ID Dropi"
                        value={userId}
                        onChange={(value) => setUserId(value)}
                        disabled={loadingProcessar}
                        leftSection={<IconUser size={16} />}
                    />
                </Grid.Col>
            </Grid>

            <Group justify="flex-end" mt="sm">
                <Button
                    leftSection={loadingProcessar ? <Loader size="xs" /> : <IconSearch size={16} />}
                    onClick={processarDados}
                    disabled={!dataInicio || !dataFim || !userId || loadingProcessar}
                    loading={loadingProcessar}
                    size="md"
                >
                    {loadingProcessar ? 'Extraindo...' : 'Extrair Pedidos'}
                </Button>
            </Group>
        </Paper>
    );

    const renderFiltros = () => (
        <Paper shadow="sm" p="sm" mb="md">
            <Group gap="sm" mb="sm">
                <IconTarget size={20} />
                <Title order={5}>Filtros</Title>
            </Group>
            
            <Grid gutter="sm">
                <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput
                        placeholder="Filtrar por status..."
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        leftSection={<IconClock size={16} />}
                    />
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput
                        placeholder="Filtrar por fornecedor..."
                        value={filtroFornecedor}
                        onChange={(e) => setFiltroFornecedor(e.target.value)}
                        leftSection={<IconBuilding size={16} />}
                    />
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput
                        placeholder="Filtrar por nome cliente..."
                        value={filtroNome}
                        onChange={(e) => setFiltroNome(e.target.value)}
                        leftSection={<IconUser size={16} />}
                    />
                </Grid.Col>
            </Grid>
        </Paper>
    );

    const renderResultados = () => {
        if (!dadosResultado || !Array.isArray(dadosResultado)) return null;

        return (
            <Paper shadow="sm" p="md" mb="md">
                <Group justify="space-between" mb="md">
                    <Title order={4}>Pedidos Dropi MX</Title>
                    <Group>
                        <Badge variant="light" color="blue">
                            {dadosFiltrados.length} de {dadosResultado.length} pedidos
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

                {renderFiltros()}

                <ScrollArea>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>ID</Table.Th>
                                <Table.Th>Cliente</Table.Th>
                                <Table.Th>Fornecedor</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Valor</Table.Th>
                                <Table.Th>Telefone</Table.Th>
                                <Table.Th>Cidade</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {dadosFiltrados.map((pedido) => (
                                <Table.Tr key={pedido.id}>
                                    <Table.Td>
                                        <Text size="sm" fw={500}>{pedido.id}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <div>
                                            <Text size="sm" fw={500}>{pedido.name} {pedido.surname}</Text>
                                            {pedido.client_email && (
                                                <Text size="xs" c="dimmed">{pedido.client_email}</Text>
                                            )}
                                        </div>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">{pedido.supplier_name}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge 
                                            color={STATUS_DROPI[pedido.status]?.color || 'gray'}
                                            variant="light"
                                        >
                                            {STATUS_DROPI[pedido.status]?.label || pedido.status}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm" fw={500} c="green">
                                            R$ {parseFloat(pedido.total_order || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">{pedido.phone}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm" truncate style={{ maxWidth: '150px' }}>
                                            {pedido.dir}
                                        </Text>
                                    </Table.Td>
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
                        Extraia dados e salve o resultado para vê-lo aqui.
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
                                        {analise.nome.replace('[DROPI] ', '')}
                                    </Text>
                                    <Badge color="orange" variant="light">
                                        DROPI
                                    </Badge>
                                </Group>

                                <Text size="xs" c="dimmed" mb="sm">
                                    {new Date(analise.data_inicio).toLocaleDateString('pt-BR')} - {new Date(analise.data_fim).toLocaleDateString('pt-BR')}
                                </Text>

                                <Text size="xs" c="dimmed" mb="md">
                                    {analise.total_pedidos} pedidos • {new Date(analise.criado_em).toLocaleDateString('pt-BR')}
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
        
        // Definir datas padrão (última semana)
        const hoje = new Date();
        const setemantepassada = new Date();
        setemantepassada.setDate(hoje.getDate() - 7);
        
        setDataFim(hoje);
        setDataInicio(setemantepassada);
    }, []);

    // ======================== RENDER PRINCIPAL ========================

    return (
        <Container fluid p="md">
            {/* Header */}
            <Group justify="space-between" mb="xl">
                <div>
                    <Group gap="sm">
                        <IconShoppingCart size={28} color="var(--mantine-color-orange-6)" />
                        <Title order={2}>Dropi MX</Title>
                    </Group>
                    <Text c="dimmed">Gestão de pedidos e métricas</Text>
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

            {/* Formulário de Extração */}
            {renderFormulario()}

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
                        placeholder="Ex: Dropi MX Janeiro 2025"
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

export default DropiPage;