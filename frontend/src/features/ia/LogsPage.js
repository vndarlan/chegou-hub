// frontend/src/features/ia/LogsPage.js - APENAS ERROS
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
    IconEye, IconClock, IconMapPin, IconRobot,
    IconChartBar, IconActivity, IconGitBranch
} from '@tabler/icons-react';
import axios from 'axios';

function LogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [stats, setStats] = useState(null);
    
    // Filtros apenas para erros e críticos
    const [filtros, setFiltros] = useState({
        ferramenta: '',
        nivel: 'error,critical', // Apenas erros e críticos
        pais: '',
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
        carregarStats();
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
            console.error('Erro ao carregar logs:', error);
            setNotification({ type: 'error', message: 'Erro ao carregar logs' });
        } finally {
            setLoading(false);
        }
    };

    const carregarStats = async () => {
        try {
            const response = await axios.get('/ia/dashboard-stats/');
            const data = response.data;
            
            // Focar apenas em estatísticas de erro
            const errorStats = {
                total_erros: (data.por_ferramenta || []).reduce((sum, f) => sum + (f.erros || 0), 0),
                nao_resolvidos: data.resumo?.logs_nao_resolvidos || 0,
                criticos_7d: data.resumo?.logs_criticos_7d || 0,
                por_ferramenta: (data.por_ferramenta || []).filter(f => f.erros > 0),
                por_pais_nicochat: (data.por_pais_nicochat || []).filter(p => p.erros > 0)
            };
            
            setStats(errorStats);
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
                message: `Erro marcado como ${resolvido ? 'resolvido' : 'não resolvido'}` 
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

    const getNivelColor = (nivel) => {
        return nivel === 'critical' ? 'red' : 'orange';
    };

    const getNivelIcon = (nivel) => {
        return nivel === 'critical' ? IconX : IconExclamationCircle;
    };

    const getPaisDisplayName = (pais) => {
        const nomes = {
            'colombia': 'Colômbia', 'chile': 'Chile', 'mexico': 'México',
            'polonia': 'Polônia', 'romenia': 'Romênia', 'espanha': 'Espanha', 'italia': 'Itália'
        };
        return nomes[pais] || pais;
    };

    const getPaisFlag = (pais) => {
        const flags = {
            'colombia': '🇨🇴', 'chile': '🇨🇱', 'mexico': '🇲🇽',
            'polonia': '🇵🇱', 'romenia': '🇷🇴', 'espanha': '🇪🇸', 'italia': '🇮🇹'
        };
        return flags[pais] || '🌍';
    };

    // Componente de estatísticas de erros
    const StatsErros = () => {
        if (!stats) return null;
        
        return (
            <Grid mb="xl">
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between">
                            <Box>
                                <Text c="dimmed" size="sm" fw={600}>Total de Erros</Text>
                                <Text fw={700} size="xl" c="red">{stats.total_erros}</Text>
                                <Text size="xs" c="dimmed">Todas as ferramentas</Text>
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
                                <Text fw={700} size="xl" c="orange">{stats.nao_resolvidos}</Text>
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
                                <Text fw={700} size="xl" c="red">{stats.criticos_7d}</Text>
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

    // Componente de erros por ferramenta
    const ErrosPorFerramenta = () => {
        if (!stats?.por_ferramenta?.length) return null;
        
        return (
            <Card shadow="sm" padding="lg" radius="md" mb="md" withBorder>
                <Group mb="md">
                    <ThemeIcon size="sm" radius="md" variant="light" color="red">
                        <IconActivity size={16} />
                    </ThemeIcon>
                    <Title order={4}>Erros por Ferramenta (24h)</Title>
                </Group>
                <Grid>
                    {stats.por_ferramenta.map((stat) => (
                        <Grid.Col span={{ base: 12, sm: 6 }} key={stat.ferramenta}>
                            <Paper p="md" withBorder radius="md" 
                                   style={{ borderColor: 'var(--mantine-color-red-3)' }}>
                                <Group justify="space-between" mb="xs">
                                    <Group gap="xs">
                                        <Text size="lg">
                                            {stat.ferramenta === 'Nicochat' ? '🤖' : '⚙️'}
                                        </Text>
                                        <Text fw={600} size="sm">{stat.ferramenta}</Text>
                                    </Group>
                                    <Badge variant="light" color="red">{stat.erros}</Badge>
                                </Group>
                                
                                <Group gap="xs">
                                    <ThemeIcon size="xs" radius="xl" color="red" variant="light">
                                        <IconAlertTriangle size={10} />
                                    </ThemeIcon>
                                    <Text size="xs" c="red" fw={600}>
                                        {stat.erros} erro(s) registrados
                                    </Text>
                                </Group>
                                
                                {stat.nao_resolvidos > 0 && (
                                    <Group gap="xs" mt="xs">
                                        <ThemeIcon size="xs" radius="xl" color="orange" variant="light">
                                            <IconClock size={10} />
                                        </ThemeIcon>
                                        <Text size="xs" c="orange" fw={600}>
                                            {stat.nao_resolvidos} não resolvidos
                                        </Text>
                                    </Group>
                                )}
                            </Paper>
                        </Grid.Col>
                    ))}
                </Grid>
            </Card>
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
                        <Title order={2}>Monitoramento de Erros - IA</Title>
                    </Group>
                    <Text c="dimmed">Central de erros e falhas críticas do Nicochat e N8N</Text>
                </Box>
                <Button
                    leftSection={<IconRefresh size={16} />}
                    onClick={() => { carregarLogs(); carregarStats(); }}
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
            <ErrosPorFerramenta />

            {/* Filtros */}
            <Card shadow="sm" padding="lg" radius="md" mb="md" withBorder>
                <Group mb="md">
                    <ThemeIcon size="sm" radius="md" variant="light" color="red">
                        <IconSearch size={16} />
                    </ThemeIcon>
                    <Title order={4}>Filtros de Pesquisa</Title>
                </Group>
                <Grid>
                    <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                        <Select
                            label="🔧 Ferramenta"
                            placeholder="Todas"
                            data={[
                                { value: '', label: 'Todas' },
                                { value: 'Nicochat', label: '🤖 Nicochat' },
                                { value: 'N8N', label: '⚙️ N8N' }
                            ]}
                            value={filtros.ferramenta}
                            onChange={(value) => setFiltros(prev => ({ ...prev, ferramenta: value || '' }))}
                        />
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
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
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                        <Select
                            label="🌍 País (Nicochat)"
                            placeholder="Todos"
                            data={[
                                { value: '', label: 'Todos' },
                                { value: 'colombia', label: '🇨🇴 Colômbia' },
                                { value: 'chile', label: '🇨🇱 Chile' },
                                { value: 'mexico', label: '🇲🇽 México' },
                                { value: 'polonia', label: '🇵🇱 Polônia' },
                                { value: 'romenia', label: '🇷🇴 Romênia' },
                                { value: 'espanha', label: '🇪🇸 Espanha' },
                                { value: 'italia', label: '🇮🇹 Itália' }
                            ]}
                            value={filtros.pais}
                            onChange={(value) => setFiltros(prev => ({ ...prev, pais: value || '' }))}
                        />
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
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
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
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
                    
                    <Grid.Col span={{ base: 12, md: 2 }}>
                        <TextInput
                            label="🔍 Buscar Erro"
                            placeholder="Mensagem..."
                            leftSection={<IconSearch size={16} />}
                            value={filtros.busca}
                            onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                        />
                    </Grid.Col>
                </Grid>
            </Card>

            {/* Tabela de Erros */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
                <LoadingOverlay visible={loading} />
                
                <Group mb="md">
                    <ThemeIcon size="sm" radius="md" variant="light" color="red">
                        <IconChartBar size={16} />
                    </ThemeIcon>
                    <Title order={4}>Central de Erros</Title>
                    <Badge variant="light" color="red">{logs.length} erros</Badge>
                </Group>
                
                <ScrollArea>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Data/Hora</Table.Th>
                                <Table.Th>Ferramenta</Table.Th>
                                <Table.Th>Gravidade</Table.Th>
                                <Table.Th>Erro</Table.Th>
                                <Table.Th>País</Table.Th>
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
                                            <Badge variant="light" color={log.ferramenta === 'Nicochat' ? 'blue' : 'purple'}>
                                                {log.ferramenta === 'Nicochat' ? '🤖' : '⚙️'} {log.ferramenta}
                                            </Badge>
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
                                        <Table.Td style={{ maxWidth: '300px' }}>
                                            <Text size="sm" truncate c="red">
                                                {log.mensagem}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            {log.pais && (
                                                <Badge variant="light" color="cyan" 
                                                       leftSection={<span>{getPaisFlag(log.pais)}</span>}>
                                                    {getPaisDisplayName(log.pais)}
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
                        <Text c="green" fw={600}>Nenhum erro encontrado! 🎉</Text>
                        <Text size="sm" c="dimmed" mt="xs">
                            Todas as ferramentas estão funcionando sem problemas
                        </Text>
                    </Box>
                )}
            </Card>

            {/* Modais iguais aos anteriores */}
            <Modal
                opened={modalDetalhes}
                onClose={() => setModalDetalhes(false)}
                title={<Group><IconAlertTriangle size={16} color="red" /><Text fw={600}>Detalhes do Erro</Text></Group>}
                size="lg"
            >
                {logSelecionado && (
                    <Stack gap="md">
                        <Group>
                            <Badge variant="light" color={logSelecionado.ferramenta === 'Nicochat' ? 'blue' : 'purple'}>
                                {logSelecionado.ferramenta === 'Nicochat' ? '🤖' : '⚙️'} {logSelecionado.ferramenta}
                            </Badge>
                            <Badge 
                                variant="light" 
                                color={getNivelColor(logSelecionado.nivel)}
                                leftSection={getNivelIcon(logSelecionado.nivel)({ size: 16 })}
                            >
                                {logSelecionado.nivel.toUpperCase()}
                            </Badge>
                            {logSelecionado.pais && (
                                <Badge variant="light" color="cyan" 
                                       leftSection={<span>{getPaisFlag(logSelecionado.pais)}</span>}>
                                    {getPaisDisplayName(logSelecionado.pais)}
                                </Badge>
                            )}
                        </Group>
                        
                        <Divider />
                        
                        <Box>
                            <Text fw={600} mb="xs">🚨 Mensagem de Erro:</Text>
                            <Paper p="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-red-0)' }}>
                                <Text c="red">{logSelecionado.mensagem}</Text>
                            </Paper>
                        </Box>
                        
                        {logSelecionado.id_conversa && (
                            <Box>
                                <Text fw={600} mb="xs">💬 ID da Conversa:</Text>
                                <Code block>{logSelecionado.id_conversa}</Code>
                            </Box>
                        )}
                        
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
                        
                        <Divider />
                        
                        <Grid>
                            <Grid.Col span={6}>
                                <Text size="sm" c="dimmed" fw={600}>🕒 Ocorreu em:</Text>
                                <Text size="sm">{new Date(logSelecionado.timestamp).toLocaleString()}</Text>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Text size="sm" c="dimmed" fw={600}>🌐 IP de Origem:</Text>
                                <Text size="sm">{logSelecionado.ip_origem || 'N/A'}</Text>
                            </Grid.Col>
                        </Grid>
                        
                        {logSelecionado.resolvido && (
                            <Alert color="green" icon={<IconCheck size={16} />}>
                                <Text fw={600}>✅ Erro resolvido por: {logSelecionado.resolvido_por_nome}</Text>
                                <Text size="sm">🕒 Em: {new Date(logSelecionado.data_resolucao).toLocaleString()}</Text>
                            </Alert>
                        )}
                    </Stack>
                )}
            </Modal>

            <Modal
                opened={modalResolucao}
                onClose={() => setModalResolucao(false)}
                title={`${logSelecionado?.resolvido ? '↩️ Reabrir Erro' : '✅ Marcar como Resolvido'}`}
            >
                {logSelecionado && (
                    <Stack gap="md">
                        <Text>
                            Deseja marcar este erro como {logSelecionado.resolvido ? 'não resolvido' : 'resolvido'}?
                        </Text>
                        
                        <Textarea
                            label="📝 Observações sobre a resolução"
                            placeholder="Descreva como o erro foi resolvido..."
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
                                {logSelecionado.resolvido ? 'Reabrir Erro' : 'Marcar Resolvido'}
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>
        </Box>
    );
}

export default LogsPage;