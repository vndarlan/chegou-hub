// frontend/src/features/ia/N8NPage.js - APENAS ERROS
import React, { useState, useEffect } from 'react';
import {
    Box, Title, Text, Card, Group, Stack, Table, Badge, 
    Button, Select, TextInput, Grid, ActionIcon,
    Modal, Textarea, Alert, Notification,
    LoadingOverlay, ScrollArea, Code, JsonInput,
    Paper, Divider, ThemeIcon
} from '@mantine/core';
import {
    IconSearch, IconRefresh, IconCheck, IconX,
    IconAlertTriangle, IconExclamationCircle,
    IconEye, IconClock, IconSettings, IconGitBranch,
    IconChartBar
} from '@tabler/icons-react';
import axios from 'axios';

function N8NPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [statsErros, setStatsErros] = useState(null);
    
    // Filtros apenas para erros
    const [filtros, setFiltros] = useState({
        ferramenta: 'N8N',
        nivel: 'error,critical', // Apenas erros e críticos
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
        carregarStatsErros();
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

    const carregarStatsErros = async () => {
        try {
            const response = await axios.get('/ia/dashboard-stats/');
            const stats = response.data;
            
            // Apenas estatísticas de erros do N8N
            const errosStats = {
                total_erros: stats.por_ferramenta?.find(f => f.ferramenta === 'N8N')?.erros || 0,
                nao_resolvidos: stats.por_ferramenta?.find(f => f.ferramenta === 'N8N')?.nao_resolvidos || 0,
                criticos_7d: stats.resumo?.logs_criticos_7d || 0
            };
            
            setStatsErros(errosStats);
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
                message: `Erro marcado como ${resolvido ? 'resolvido' : 'não resolvido'}` 
            });
            setModalResolucao(false);
            setObservacoesResolucao('');
            carregarLogs();
            carregarStatsErros();
        } catch (error) {
            console.error('Erro ao marcar log:', error);
            setNotification({ type: 'error', message: 'Erro ao atualizar log' });
        }
    };

    const getNivelColor = (nivel) => {
        return nivel === 'critical' ? 'red' : 'orange';
    };

    const getNivelIcon = (nivel) => {
        return nivel === 'critical' ? IconX : IconExclamationCircle;
    };

    // Componente de estatísticas de erros do N8N
    const StatsErros = () => {
        if (!statsErros) return null;
        
        return (
            <Grid mb="xl">
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between">
                            <Box>
                                <Text c="dimmed" size="sm" fw={600}>Falhas (24h)</Text>
                                <Text fw={700} size="xl" c="red">{statsErros.total_erros}</Text>
                                <Text size="xs" c="dimmed">Workflows com erro</Text>
                            </Box>
                            <ThemeIcon size="xl" radius="md" variant="light" color="red">
                                <IconAlertTriangle size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between">
                            <Box>
                                <Text c="dimmed" size="sm" fw={600}>Não Resolvidos</Text>
                                <Text fw={700} size="xl" c="orange">{statsErros.nao_resolvidos}</Text>
                                <Text size="xs" c="dimmed">Precisam atenção</Text>
                            </Box>
                            <ThemeIcon size="xl" radius="md" variant="light" color="orange">
                                <IconClock size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between">
                            <Box>
                                <Text c="dimmed" size="sm" fw={600}>Críticos (7d)</Text>
                                <Text fw={700} size="xl" c="red">{statsErros.criticos_7d}</Text>
                                <Text size="xs" c="dimmed">Erros graves</Text>
                            </Box>
                            <ThemeIcon size="xl" radius="md" variant="light" color="red">
                                <IconX size={24} />
                            </ThemeIcon>
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
                    <Group gap="sm" mb="xs">
                        <ThemeIcon size="lg" radius="md" variant="gradient" 
                                   gradient={{ from: 'red', to: 'orange', deg: 45 }}>
                            <IconAlertTriangle size={24} />
                        </ThemeIcon>
                        <Title order={2}>N8N - Falhas nos Workflows</Title>
                    </Group>
                    <Text c="dimmed">Monitore e resolva falhas nos workflows do N8N</Text>
                </Box>
                <Button
                    leftSection={<IconRefresh size={16} />}
                    onClick={() => { carregarLogs(); carregarStatsErros(); }}
                    loading={loading}
                    variant="light"
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

            <StatsErros />

            {/* Filtros específicos do N8N */}
            <Card shadow="sm" padding="lg" radius="md" mb="md" withBorder>
                <Group mb="md">
                    <ThemeIcon size="sm" radius="md" variant="light" color="red">
                        <IconSettings size={16} />
                    </ThemeIcon>
                    <Title order={4}>Filtros de Pesquisa</Title>
                </Group>
                <Grid>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Select
                            label="⚠️ Gravidade"
                            data={[
                                { value: 'error,critical', label: 'Todos os erros' },
                                { value: 'error', label: '🟠 Apenas Error' },
                                { value: 'critical', label: '🔴 Apenas Critical' }
                            ]}
                            value={filtros.nivel}
                            onChange={(value) => setFiltros(prev => ({ ...prev, nivel: value }))}
                        />
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Select
                            label="✅ Status"
                            data={[
                                { value: '', label: 'Todos' },
                                { value: 'false', label: '⏳ Pendentes' },
                                { value: 'true', label: '✅ Resolvidos' }
                            ]}
                            value={filtros.resolvido}
                            onChange={(value) => setFiltros(prev => ({ ...prev, resolvido: value || '' }))}
                        />
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Select
                            label="📅 Período"
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
                            label="🔍 Buscar Erro"
                            placeholder="Workflow, erro..."
                            leftSection={<IconSearch size={16} />}
                            value={filtros.busca}
                            onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                        />
                    </Grid.Col>
                </Grid>
            </Card>

            {/* Tabela de Erros do N8N */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
                <LoadingOverlay visible={loading} />
                
                <Group mb="md">
                    <ThemeIcon size="sm" radius="md" variant="light" color="red">
                        <IconChartBar size={16} />
                    </ThemeIcon>
                    <Title order={4}>Falhas do N8N</Title>
                    <Badge variant="light" color="red">{logs.length} erros</Badge>
                </Group>
                
                <ScrollArea>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Data/Hora</Table.Th>
                                <Table.Th>Gravidade</Table.Th>
                                <Table.Th>Erro no Workflow</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Ações</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {logs.map((log) => {
                                const Icon = getNivelIcon(log.nivel);
                                return (
                                    <Table.Tr key={log.id}>
                                        <Table.Td>
                                            <Text size="sm" fw={600}>{log.tempo_relativo}</Text>
                                            <Text size="xs" c="dimmed">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge 
                                                variant="light" 
                                                color={getNivelColor(log.nivel)}
                                                leftSection={<Icon size={16} />}
                                            >
                                                {log.nivel.toUpperCase()}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td style={{ maxWidth: '400px' }}>
                                            <Text size="sm" truncate c="red">
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
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>

                {logs.length === 0 && !loading && (
                    <Box ta="center" py="xl">
                        <ThemeIcon size="xl" radius="md" variant="light" color="green" mx="auto" mb="md">
                            <IconCheck size={32} />
                        </ThemeIcon>
                        <Text c="green" fw={600}>Nenhuma falha encontrada! 🎉</Text>
                        <Text size="sm" c="dimmed" mt="xs">
                            Todos os workflows do N8N estão funcionando corretamente
                        </Text>
                    </Box>
                )}
            </Card>

            {/* Modal de Detalhes */}
            <Modal
                opened={modalDetalhes}
                onClose={() => setModalDetalhes(false)}
                title={<Group><IconGitBranch size={16} color="red" /><Text fw={600}>Detalhes da Falha - N8N</Text></Group>}
                size="lg"
            >
                {logSelecionado && (
                    <Stack gap="md">
                        <Box>
                            <Text fw={600} mb="xs">🚨 Falha no Workflow:</Text>
                            <Paper p="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-red-0)' }}>
                                <Text c="red">{logSelecionado.mensagem}</Text>
                            </Paper>
                        </Box>
                        
                        {logSelecionado.detalhes && Object.keys(logSelecionado.detalhes).length > 0 && (
                            <Box>
                                <Text fw={600} mb="xs">🔧 Detalhes Técnicos:</Text>
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
                                <Text size="sm" c="dimmed" fw={600}>🕒 Falha ocorreu em:</Text>
                                <Text size="sm">{new Date(logSelecionado.timestamp).toLocaleString()}</Text>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Text size="sm" c="dimmed" fw={600}>🌐 IP de Origem:</Text>
                                <Text size="sm">{logSelecionado.ip_origem || 'N/A'}</Text>
                            </Grid.Col>
                        </Grid>
                        
                        {logSelecionado.resolvido && (
                            <Alert color="green" icon={<IconCheck size={16} />}>
                                <Text fw={600}>✅ Falha resolvida por: {logSelecionado.resolvido_por_nome}</Text>
                                <Text size="sm">🕒 Em: {new Date(logSelecionado.data_resolucao).toLocaleString()}</Text>
                            </Alert>
                        )}
                    </Stack>
                )}
            </Modal>

            {/* Modal de Resolução */}
            <Modal
                opened={modalResolucao}
                onClose={() => setModalResolucao(false)}
                title={`${logSelecionado?.resolvido ? '↩️ Reabrir Falha' : '✅ Marcar como Resolvido'}`}
            >
                {logSelecionado && (
                    <Stack gap="md">
                        <Text>
                            Deseja marcar esta falha como {logSelecionado.resolvido ? 'não resolvida' : 'resolvida'}?
                        </Text>
                        
                        <Textarea
                            label="📝 Observações sobre a resolução"
                            placeholder="Descreva como a falha foi corrigida..."
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
                                leftSection={logSelecionado.resolvido ? <IconX size={16} /> : <IconCheck size={16} />}
                            >
                                {logSelecionado.resolvido ? 'Reabrir Falha' : 'Marcar Resolvido'}
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>
        </Box>
    );
}

export default N8NPage;