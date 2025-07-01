import React, { useState, useEffect } from 'react';
import {
    Box, Title, Text, Card, Group, Stack, Table, Badge, 
    Button, Select, TextInput, Grid, ActionIcon,
    Modal, Textarea, Alert, Notification,
    LoadingOverlay, ScrollArea, Code, JsonInput,
    RingProgress, Center
} from '@mantine/core';
import {
    IconSearch, IconRefresh, IconCheck, IconX,
    IconAlertTriangle, IconInfo, IconExclamationMark,
    IconEye, IconClock, IconSettings, IconWorkflow
} from '@tabler/icons-react';
import axios from 'axios';

function N8NPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [statsN8N, setStatsN8N] = useState(null);
    
    // Estados de filtros específicos do N8N
    const [filtros, setFiltros] = useState({
        ferramenta: 'N8N', // Sempre N8N
        nivel: '',
        resolvido: '',
        periodo: '24h',
        busca: ''
    });
    
    // Estados do modal
    const [modalDetalhes, setModalDetalhes] = useState(false);
    const [modalResolucao, setModalResolucao] = useState(false);
    const [logSelecionado, setLogSelecionado] = useState(null);
    const [observacoesResolucao, setObservacoesResolucao] = useState('');

    useEffect(() => {
        carregarLogs();
        carregarStatsN8N();
    }, [filtros]);

    const carregarLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filtros).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            
            const response = await axios.get(`/ia/logs/?${params}`);
            setLogs(response.data.results || response.data);
        } catch (error) {
            console.error('Erro ao carregar logs do N8N:', error);
            setNotification({ type: 'error', message: 'Erro ao carregar logs do N8N' });
        } finally {
            setLoading(false);
        }
    };

    const carregarStatsN8N = async () => {
        try {
            const response = await axios.get('/ia/dashboard-stats/');
            const stats = response.data;
            
            // Filtrar apenas stats do N8N
            const n8nStats = {
                total_logs: stats.por_ferramenta?.find(f => f.ferramenta === 'N8N')?.total || 0,
                total_erros: stats.por_ferramenta?.find(f => f.ferramenta === 'N8N')?.erros || 0,
                nao_resolvidos: stats.por_ferramenta?.find(f => f.ferramenta === 'N8N')?.nao_resolvidos || 0,
            };
            
            setStatsN8N(n8nStats);
        } catch (error) {
            console.error('Erro ao carregar estatísticas do N8N:', error);
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
            carregarStatsN8N();
        } catch (error) {
            console.error('Erro ao marcar log:', error);
            setNotification({ type: 'error', message: 'Erro ao atualizar log' });
        }
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

    // Componente de estatísticas do N8N
    const StatsN8N = () => {
        if (!statsN8N) return null;
        
        const totalLogs = statsN8N.total_logs;
        const sucessos = totalLogs - statsN8N.total_erros;
        const taxaSucesso = totalLogs > 0 ? (sucessos / totalLogs) * 100 : 0;
        
        return (
            <Grid mb="xl">
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md">
                        <Group justify="space-between">
                            <Box>
                                <Text c="dimmed" size="sm">Total Execuções (24h)</Text>
                                <Text fw={700} size="xl">{statsN8N.total_logs}</Text>
                            </Box>
                            <IconWorkflow size={32} color="var(--mantine-color-purple-6)" />
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md">
                        <Group justify="space-between">
                            <Box>
                                <Text c="dimmed" size="sm">Falhas (24h)</Text>
                                <Text fw={700} size="xl" c="red">{statsN8N.total_erros}</Text>
                            </Box>
                            <IconAlertTriangle size={32} color="var(--mantine-color-red-6)" />
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md">
                        <Group justify="space-between">
                            <Box>
                                <Text c="dimmed" size="sm">Não Resolvidos</Text>
                                <Text fw={700} size="xl" c="orange">{statsN8N.nao_resolvidos}</Text>
                            </Box>
                            <IconClock size={32} color="var(--mantine-color-orange-6)" />
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md">
                        <Center>
                            <RingProgress
                                size={100}
                                thickness={8}
                                sections={[
                                    { value: taxaSucesso, color: 'purple', tooltip: `${taxaSucesso.toFixed(1)}% sucesso` }
                                ]}
                                label={
                                    <Center>
                                        <Text fw={700} size="lg">{taxaSucesso.toFixed(1)}%</Text>
                                    </Center>
                                }
                            />
                        </Center>
                        <Text size="sm" c="dimmed" ta="center" mt="xs">Taxa de Sucesso</Text>
                    </Card>
                </Grid.Col>
            </Grid>
        );
    };

    return (
        <Box p="md">
            <Group justify="space-between" mb="xl">
                <Box>
                    <Title order={2} mb="xs">⚙️ N8N - Workflows e Automações</Title>
                    <Text c="dimmed">Monitore execuções e falhas dos workflows do N8N</Text>
                </Box>
                <Button
                    leftSection={<IconRefresh size={16} />}
                    onClick={() => { carregarLogs(); carregarStatsN8N(); }}
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

            <StatsN8N />

            {/* Filtros específicos do N8N */}
            <Card shadow="sm" padding="lg" radius="md" mb="md">
                <Group mb="md">
                    <IconSettings size={16} />
                    <Title order={4}>Filtros</Title>
                </Group>
                <Grid>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Select
                            label="Nível"
                            placeholder="Todos os níveis"
                            data={[
                                { value: '', label: 'Todos os níveis' },
                                { value: 'info', label: 'Info' },
                                { value: 'warning', label: 'Warning' },
                                { value: 'error', label: 'Error' },
                                { value: 'critical', label: 'Critical' }
                            ]}
                            value={filtros.nivel}
                            onChange={(value) => setFiltros(prev => ({ ...prev, nivel: value || '' }))}
                        />
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
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
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
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
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <TextInput
                            label="Buscar"
                            placeholder="Workflow, erro..."
                            leftSection={<IconSearch size={16} />}
                            value={filtros.busca}
                            onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                        />
                    </Grid.Col>
                </Grid>
            </Card>

            {/* Tabela de Logs do N8N */}
            <Card shadow="sm" padding="lg" radius="md">
                <LoadingOverlay visible={loading} />
                
                <ScrollArea>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Data/Hora</Table.Th>
                                <Table.Th>Nível</Table.Th>
                                <Table.Th>Workflow/Erro</Table.Th>
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
                                        <Badge 
                                            variant="light" 
                                            color={getNivelColor(log.nivel)}
                                            leftSection={getNivelIcon(log.nivel)}
                                        >
                                            {log.nivel.toUpperCase()}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td style={{ maxWidth: '400px' }}>
                                        <Text size="sm" truncate>
                                            {log.mensagem}
                                        </Text>
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
                                                onClick={() => {
                                                    setLogSelecionado(log);
                                                    setModalDetalhes(true);
                                                }}
                                            >
                                                <IconEye size={16} />
                                            </ActionIcon>
                                            <ActionIcon
                                                variant="light"
                                                color={log.resolvido ? 'orange' : 'green'}
                                                onClick={() => {
                                                    setLogSelecionado(log);
                                                    setObservacoesResolucao('');
                                                    setModalResolucao(true);
                                                }}
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

                {logs.length === 0 && !loading && (
                    <Box ta="center" py="xl">
                        <Text c="dimmed">Nenhum log do N8N encontrado</Text>
                    </Box>
                )}
            </Card>

            {/* Modal de Detalhes */}
            <Modal
                opened={modalDetalhes}
                onClose={() => setModalDetalhes(false)}
                title="Detalhes do Log - N8N"
                size="lg"
            >
                {logSelecionado && (
                    <Stack gap="md">
                        <Group>
                            <Badge variant="light" color="purple">
                                N8N
                            </Badge>
                            <Badge 
                                variant="light" 
                                color={getNivelColor(logSelecionado.nivel)}
                            >
                                {logSelecionado.nivel.toUpperCase()}
                            </Badge>
                        </Group>
                        
                        <Box>
                            <Text fw={600} mb="xs">Mensagem:</Text>
                            <Text>{logSelecionado.mensagem}</Text>
                        </Box>
                        
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
                            <Alert color="green" icon={<IconCheck size={16} />}>
                                <Text fw={600}>Resolvido por: {logSelecionado.resolvido_por_nome}</Text>
                                <Text size="sm">Em: {new Date(logSelecionado.data_resolucao).toLocaleString()}</Text>
                            </Alert>
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

export default N8NPage;
