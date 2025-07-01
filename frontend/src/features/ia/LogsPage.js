import React, { useState, useEffect } from 'react';
import {
    Box, Title, Text, Card, Group, Stack, Table, Badge, 
    Button, Select, TextInput, Pagination, ActionIcon,
    Modal, Textarea, Checkbox, Alert, Notification,
    Tabs, LoadingOverlay, Paper, Divider, Grid,
    ScrollArea, Code, JsonInput
} from '@mantine/core';
import {
    IconSearch, IconFilter, IconRefresh, IconCheck, IconX,
    IconAlertTriangle, IconInfo, IconExclamationMark,
    IconEye, IconClock, IconUser, IconMapPin, IconTools
} from '@tabler/icons-react';
import axios from 'axios';

function LogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [stats, setStats] = useState(null);
    
    // Estados de filtros
    const [filtros, setFiltros] = useState({
        ferramenta: '',
        nivel: '',
        pais: '',
        resolvido: '',
        periodo: '24h',
        busca: ''
    });
    
    // Estados de paginação
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    
    // Estados do modal de detalhes
    const [modalDetalhes, setModalDetalhes] = useState(false);
    const [logSelecionado, setLogSelecionado] = useState(null);
    
    // Estados do modal de resolução
    const [modalResolucao, setModalResolucao] = useState(false);
    const [observacoesResolucao, setObservacoesResolucao] = useState('');

    // Carregar dados iniciais
    useEffect(() => {
        carregarLogs();
        carregarStats();
    }, [filtros, page]);

    const carregarLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filtros).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            params.append('page', page);
            
            const response = await axios.get(`/ia/logs/?${params}`);
            setLogs(response.data.results || response.data);
            
            // Se a resposta tem paginação
            if (response.data.count) {
                setTotalItems(response.data.count);
                setTotalPages(Math.ceil(response.data.count / 20));
            }
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            setNotification({ type: 'error', message: 'Erro ao carregar logs' });
        } finally {
            setLoading(false);
        }
    };

    const carregarStats = async () => {
        try {
            const response = await axios.get('/ia/dashboard-stats/');
            setStats(response.data);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    };

    const marcarResolvido = async (logId, resolvido) => {
        try {
            const csrfResponse = await axios.get('/current-state/');
            const csrfToken = csrfResponse.data.csrf_token;
            
            await axios.post(`/ia/logs/${logId}/marcar_resolvido/`, {
                resolvido: resolvido,
                observacoes: observacoesResolucao
            }, {
                headers: { 'X-CSRFToken': csrfToken }
            });
            
            setNotification({ 
                type: 'success', 
                message: `Log marcado como ${resolvido ? 'resolvido' : 'não resolvido'}` 
            });
            setModalResolucao(false);
            setObservacoesResolucao('');
            carregarLogs();
            carregarStats();
        } catch (error) {
            console.error('Erro ao marcar log:', error);
            setNotification({ type: 'error', message: 'Erro ao atualizar log' });
        }
    };

    const abrirModalResolucao = (log) => {
        setLogSelecionado(log);
        setObservacoesResolucao('');
        setModalResolucao(true);
    };

    const abrirDetalhes = (log) => {
        setLogSelecionado(log);
        setModalDetalhes(true);
    };

    const getNivelColor = (nivel) => {
        const colors = {
            'info': 'blue',
            'warning': 'yellow',
            'error': 'orange',
            'critical': 'red'
        };
        return colors[nivel] || 'gray';
    };

    const getNivelIcon = (nivel) => {
        const icons = {
            'info': IconInfo,
            'warning': IconAlertTriangle,
            'error': IconExclamationMark,
            'critical': IconX
        };
        const Icon = icons[nivel] || IconInfo;
        return <Icon size={16} />;
    };

    // Componente de estatísticas
    const StatsCards = () => {
        if (!stats) return null;
        
        return (
            <Grid mb="xl">
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md">
                        <Group justify="space-between">
                            <Box>
                                <Text c="dimmed" size="sm">Total de Logs</Text>
                                <Text fw={700} size="xl">{stats.resumo.total_logs}</Text>
                            </Box>
                            <IconTools size={32} color="var(--mantine-color-blue-6)" />
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md">
                        <Group justify="space-between">
                            <Box>
                                <Text c="dimmed" size="sm">Últimas 24h</Text>
                                <Text fw={700} size="xl">{stats.resumo.logs_24h}</Text>
                            </Box>
                            <IconClock size={32} color="var(--mantine-color-green-6)" />
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md">
                        <Group justify="space-between">
                            <Box>
                                <Text c="dimmed" size="sm">Não Resolvidos</Text>
                                <Text fw={700} size="xl" c="orange">{stats.resumo.logs_nao_resolvidos}</Text>
                            </Box>
                            <IconAlertTriangle size={32} color="var(--mantine-color-orange-6)" />
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md">
                        <Group justify="space-between">
                            <Box>
                                <Text c="dimmed" size="sm">Críticos (7d)</Text>
                                <Text fw={700} size="xl" c="red">{stats.resumo.logs_criticos_7d}</Text>
                            </Box>
                            <IconX size={32} color="var(--mantine-color-red-6)" />
                        </Group>
                    </Card>
                </Grid.Col>
            </Grid>
        );
    };

    return (
        <Box p="md">
            <Group justify="space-between" mb="xl">
                <Box>
                    <Title order={2} mb="xs">📊 Logs de IA - Visão Geral</Title>
                    <Text c="dimmed">Monitore todos os logs das ferramentas de IA (Nicochat e N8N)</Text>
                </Box>
                <Button
                    leftSection={<IconRefresh size={16} />}
                    onClick={() => { carregarLogs(); carregarStats(); }}
                    loading={loading}
                >
                    Atualizar
                </Button>
            </Group>

            {notification && (
                <Notification
                    icon={notification.type === 'success' ? <IconCheck size="1.1rem" /> : <IconX size="1.1rem" />}
                    color={notification.type === 'success' ? 'teal' : 'red'}
                    title={notification.type === 'success' ? 'Sucesso!' : 'Erro!'}
                    onClose={() => setNotification(null)}
                    mb="md"
                >
                    {notification.message}
                </Notification>
            )}

            <StatsCards />

            {/* Filtros */}
            <Card shadow="sm" padding="lg" radius="md" mb="md">
                <Group mb="md">
                    <IconFilter size={16} />
                    <Title order={4}>Filtros</Title>
                </Group>
                <Grid>
                    <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                        <Select
                            label="Ferramenta"
                            placeholder="Todas"
                            data={[
                                { value: '', label: 'Todas' },
                                { value: 'Nicochat', label: 'Nicochat' },
                                { value: 'N8N', label: 'N8N' }
                            ]}
                            value={filtros.ferramenta}
                            onChange={(value) => setFiltros(prev => ({ ...prev, ferramenta: value || '' }))}
                        />
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                        <Select
                            label="Nível"
                            placeholder="Todos"
                            data={[
                                { value: '', label: 'Todos' },
                                { value: 'info', label: 'Info' },
                                { value: 'warning', label: 'Warning' },
                                { value: 'error', label: 'Error' },
                                { value: 'critical', label: 'Critical' }
                            ]}
                            value={filtros.nivel}
                            onChange={(value) => setFiltros(prev => ({ ...prev, nivel: value || '' }))}
                        />
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                        <Select
                            label="País (Nicochat)"
                            placeholder="Todos"
                            data={[
                                { value: '', label: 'Todos' },
                                { value: 'colombia', label: 'Colômbia' },
                                { value: 'chile', label: 'Chile' },
                                { value: 'mexico', label: 'México' },
                                { value: 'polonia', label: 'Polônia' },
                                { value: 'romenia', label: 'Romênia' },
                                { value: 'espanha', label: 'Espanha' },
                                { value: 'italia', label: 'Itália' }
                            ]}
                            value={filtros.pais}
                            onChange={(value) => setFiltros(prev => ({ ...prev, pais: value || '' }))}
                        />
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                        <Select
                            label="Status"
                            data={[
                                { value: '', label: 'Todos' },
                                { value: 'false', label: 'Pendentes' },
                                { value: 'true', label: 'Resolvidos' }
                            ]}
                            value={filtros.resolvido}
                            onChange={(value) => setFiltros(prev => ({ ...prev, resolvido: value || '' }))}
                        />
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                        <Select
                            label="Período"
                            data={[
                                { value: '1h', label: 'Última hora' },
                                { value: '6h', label: 'Últimas 6h' },
                                { value: '24h', label: 'Últimas 24h' },
                                { value: '7d', label: 'Últimos 7 dias' },
                                { value: '30d', label: 'Últimos 30 dias' }
                            ]}
                            value={filtros.periodo}
                            onChange={(value) => setFiltros(prev => ({ ...prev, periodo: value }))}
                        />
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, md: 2 }}>
                        <TextInput
                            label="Buscar"
                            placeholder="Mensagem, usuário..."
                            leftSection={<IconSearch size={16} />}
                            value={filtros.busca}
                            onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                        />
                    </Grid.Col>
                </Grid>
            </Card>

            {/* Tabela de Logs */}
            <Card shadow="sm" padding="lg" radius="md">
                <LoadingOverlay visible={loading} />
                
                <ScrollArea>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Data/Hora</Table.Th>
                                <Table.Th>Ferramenta</Table.Th>
                                <Table.Th>Nível</Table.Th>
                                <Table.Th>Mensagem</Table.Th>
                                <Table.Th>País</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Ações</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {logs.map((log) => (
                                <Table.Tr key={log.id}>
                                    <Table.Td>
                                        <Text size="sm">{log.tempo_relativo}</Text>
                                        <Text size="xs" c="dimmed">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge variant="light" color="blue">
                                            {log.ferramenta}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge 
                                            variant="light" 
                                            color={getNivelColor(log.nivel)}
                                            leftSection={getNivelIcon(log.nivel)}
                                        >
                                            {log.nivel.toUpperCase()}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td style={{ maxWidth: '300px' }}>
                                        <Text size="sm" truncate>
                                            {log.mensagem}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        {log.pais && (
                                            <Badge variant="light" color="cyan" leftSection={<IconMapPin size={12} />}>
                                                {log.pais}
                                            </Badge>
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge 
                                            variant="light" 
                                            color={log.resolvido ? 'green' : 'orange'}
                                            leftSection={log.resolvido ? <IconCheck size={12} /> : <IconClock size={12} />}
                                        >
                                            {log.resolvido ? 'Resolvido' : 'Pendente'}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <ActionIcon
                                                variant="light"
                                                color="blue"
                                                onClick={() => abrirDetalhes(log)}
                                            >
                                                <IconEye size={16} />
                                            </ActionIcon>
                                            <ActionIcon
                                                variant="light"
                                                color={log.resolvido ? 'orange' : 'green'}
                                                onClick={() => abrirModalResolucao(log)}
                                            >
                                                {log.resolvido ? <IconX size={16} /> : <IconCheck size={16} />}
                                            </ActionIcon>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>

                {totalPages > 1 && (
                    <Group justify="center" mt="lg">
                        <Pagination
                            value={page}
                            onChange={setPage}
                            total={totalPages}
                        />
                    </Group>
                )}

                {logs.length === 0 && !loading && (
                    <Box ta="center" py="xl">
                        <Text c="dimmed">Nenhum log encontrado</Text>
                    </Box>
                )}
            </Card>

            {/* Modal de Detalhes */}
            <Modal
                opened={modalDetalhes}
                onClose={() => setModalDetalhes(false)}
                title="Detalhes do Log"
                size="lg"
            >
                {logSelecionado && (
                    <Stack gap="md">
                        <Group>
                            <Badge variant="light" color="blue">
                                {logSelecionado.ferramenta}
                            </Badge>
                            <Badge 
                                variant="light" 
                                color={getNivelColor(logSelecionado.nivel)}
                            >
                                {logSelecionado.nivel.toUpperCase()}
                            </Badge>
                            {logSelecionado.pais && (
                                <Badge variant="light" color="cyan">
                                    {logSelecionado.pais}
                                </Badge>
                            )}
                        </Group>
                        
                        <Divider />
                        
                        <Box>
                            <Text fw={600} mb="xs">Mensagem:</Text>
                            <Text>{logSelecionado.mensagem}</Text>
                        </Box>
                        
                        {logSelecionado.usuario_conversa && (
                            <Box>
                                <Text fw={600} mb="xs">Usuário da Conversa:</Text>
                                <Code>{logSelecionado.usuario_conversa}</Code>
                            </Box>
                        )}
                        
                        {logSelecionado.id_conversa && (
                            <Box>
                                <Text fw={600} mb="xs">ID da Conversa:</Text>
                                <Code>{logSelecionado.id_conversa}</Code>
                            </Box>
                        )}
                        
                        {logSelecionado.detalhes && Object.keys(logSelecionado.detalhes).length > 0 && (
                            <Box>
                                <Text fw={600} mb="xs">Detalhes Técnicos:</Text>
                                <JsonInput
                                    value={JSON.stringify(logSelecionado.detalhes, null, 2)}
                                    readOnly
                                    minRows={4}
                                    maxRows={8}
                                />
                            </Box>
                        )}
                        
                        <Divider />
                        
                        <Grid>
                            <Grid.Col span={6}>
                                <Text size="sm" c="dimmed">Data/Hora:</Text>
                                <Text size="sm">{new Date(logSelecionado.timestamp).toLocaleString()}</Text>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Text size="sm" c="dimmed">IP de Origem:</Text>
                                <Text size="sm">{logSelecionado.ip_origem || 'N/A'}</Text>
                            </Grid.Col>
                        </Grid>
                        
                        {logSelecionado.resolvido && (
                            <Box>
                                <Alert color="green" icon={<IconCheck size={16} />}>
                                    <Text fw={600}>Resolvido por: {logSelecionado.resolvido_por_nome}</Text>
                                    <Text size="sm">Em: {new Date(logSelecionado.data_resolucao).toLocaleString()}</Text>
                                </Alert>
                            </Box>
                        )}
                    </Stack>
                )}
            </Modal>

            {/* Modal de Resolução */}
            <Modal
                opened={modalResolucao}
                onClose={() => setModalResolucao(false)}
                title={`${logSelecionado?.resolvido ? 'Marcar como Não Resolvido' : 'Marcar como Resolvido'}`}
            >
                {logSelecionado && (
                    <Stack gap="md">
                        <Text>
                            Deseja marcar este log como {logSelecionado.resolvido ? 'não resolvido' : 'resolvido'}?
                        </Text>
                        
                        <Textarea
                            label="Observações (opcional)"
                            placeholder="Adicione observações sobre a resolução..."
                            value={observacoesResolucao}
                            onChange={(e) => setObservacoesResolucao(e.target.value)}
                            minRows={3}
                        />
                        
                        <Group justify="flex-end">
                            <Button variant="outline" onClick={() => setModalResolucao(false)}>
                                Cancelar
                            </Button>
                            <Button 
                                color={logSelecionado.resolvido ? 'orange' : 'green'}
                                onClick={() => marcarResolvido(logSelecionado.id, !logSelecionado.resolvido)}
                            >
                                {logSelecionado.resolvido ? 'Marcar Não Resolvido' : 'Marcar Resolvido'}
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>
        </Box>
    );
}

export default LogsPage;