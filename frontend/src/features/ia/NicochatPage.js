// frontend/src/features/ia/NicochatPage.js - ARQUIVO COMPLETO
import React, { useState, useEffect } from 'react';
import {
    Box, Title, Text, Card, Group, Stack, Table, Badge, 
    Button, Select, TextInput, Grid, ActionIcon,
    Modal, Textarea, Alert, Notification, Tabs,
    LoadingOverlay, ScrollArea, Code, JsonInput,
    Paper, Progress, RingProgress, Center, Divider
} from '@mantine/core';
import {
    IconSearch, IconRefresh, IconCheck, IconX,
    IconAlertTriangle, IconInfo, IconExclamationMark,
    IconEye, IconClock, IconMapPin, IconRobot,
    IconChartBar, IconMessage, IconUsers, IconTrendingUp
} from '@tabler/icons-react';
import axios from 'axios';

function NicochatPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [statsNicochat, setStatsNicochat] = useState(null);
    
    // Estados de filtros específicos do Nicochat
    const [filtros, setFiltros] = useState({
        ferramenta: 'Nicochat', // Sempre Nicochat
        nivel: '',
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
        carregarStatsNicochat();
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
            console.error('Erro ao carregar logs do Nicochat:', error);
            setNotification({ type: 'error', message: 'Erro ao carregar logs do Nicochat' });
        } finally {
            setLoading(false);
        }
    };

    const carregarStatsNicochat = async () => {
        try {
            const response = await axios.get('/ia/dashboard-stats/');
            const stats = response.data;
            
            // Filtrar apenas stats do Nicochat
            const nicochatStats = {
                total_logs: stats.por_ferramenta?.find(f => f.ferramenta === 'Nicochat')?.total || 0,
                total_erros: stats.por_ferramenta?.find(f => f.ferramenta === 'Nicochat')?.erros || 0,
                nao_resolvidos: stats.por_ferramenta?.find(f => f.ferramenta === 'Nicochat')?.nao_resolvidos || 0,
                por_pais: stats.por_pais_nicochat || []
            };
            
            setStatsNicochat(nicochatStats);
        } catch (error) {
            console.error('Erro ao carregar estatísticas do Nicochat:', error);
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
            carregarStatsNicochat();
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

    const getPaisDisplayName = (pais) => {
        const nomes = {
            'colombia': 'Colômbia',
            'chile': 'Chile',
            'mexico': 'México',
            'polonia': 'Polônia',
            'romenia': 'Romênia',
            'espanha': 'Espanha',
            'italia': 'Itália'
        };
        return nomes[pais] || pais;
    };

    const getPaisFlag = (pais) => {
        const flags = {
            'colombia': '🇨🇴',
            'chile': '🇨🇱',
            'mexico': '🇲🇽',
            'polonia': '🇵🇱',
            'romenia': '🇷🇴',
            'espanha': '🇪🇸',
            'italia': '🇮🇹'
        };
        return flags[pais] || '🌍';
    };

    // Componente de estatísticas do Nicochat
    const StatsNicochat = () => {
        if (!statsNicochat) return null;
        
        const totalLogs = statsNicochat.total_logs;
        const sucessos = totalLogs - statsNicochat.total_erros;
        const taxaSucesso = totalLogs > 0 ? (sucessos / totalLogs) * 100 : 0;
        
        return (
            <Grid mb="xl">
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between">
                            <Box>
                                <Text c="dimmed" size="sm" fw={600}>Conversas (24h)</Text>
                                <Text fw={700} size="xl">{statsNicochat.total_logs}</Text>
                                <Text size="xs" c="dimmed">Total de interações</Text>
                            </Box>
                            <ThemeIcon size="xl" radius="md" variant="light" color="blue">
                                <IconMessage size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between">
                            <Box>
                                <Text c="dimmed" size="sm" fw={600}>Erros (24h)</Text>
                                <Text fw={700} size="xl" c="red">{statsNicochat.total_erros}</Text>
                                <Text size="xs" c="dimmed">Falhas no sistema</Text>
                            </Box>
                            <ThemeIcon size="xl" radius="md" variant="light" color="red">
                                <IconAlertTriangle size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between">
                            <Box>
                                <Text c="dimmed" size="sm" fw={600}>Pendentes</Text>
                                <Text fw={700} size="xl" c="orange">{statsNicochat.nao_resolvidos}</Text>
                                <Text size="xs" c="dimmed">Aguardando resolução</Text>
                            </Box>
                            <ThemeIcon size="xl" radius="md" variant="light" color="orange">
                                <IconClock size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Center>
                            <RingProgress
                                size={100}
                                thickness={8}
                                sections={[
                                    { value: taxaSucesso, color: 'green', tooltip: `${taxaSucesso.toFixed(1)}% sucesso` }
                                ]}
                                label={
                                    <Center>
                                        <Stack gap={2} align="center">
                                            <Text fw={700} size="lg">{taxaSucesso.toFixed(1)}%</Text>
                                        </Stack>
                                    </Center>
                                }
                            />
                        </Center>
                        <Text size="sm" c="dimmed" ta="center" mt="xs" fw={600}>Taxa de Sucesso</Text>
                    </Card>
                </Grid.Col>
            </Grid>
        );
    };

    // Componente de estatísticas por país
    const StatsPorPais = () => {
        if (!statsNicochat?.por_pais?.length) return null;
        
        const maxTotal = Math.max(...statsNicochat.por_pais.map(stat => stat.total));
        
        return (
            <Card shadow="sm" padding="lg" radius="md" mb="md" withBorder>
                <Group mb="md">
                    <ThemeIcon size="sm" radius="md" variant="light" color="cyan">
                        <IconMapPin size={16} />
                    </ThemeIcon>
                    <Title order={4}>Atividade por País (24h)</Title>
                </Group>
                <Grid>
                    {statsNicochat.por_pais.map((stat) => (
                        <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 3 }} key={stat.pais}>
                            <Paper p="md" withBorder radius="md" 
                                   style={{ 
                                       backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))',
                                       borderColor: stat.erros > 0 ? 'var(--mantine-color-red-3)' : 'var(--mantine-color-gray-3)'
                                   }}>
                                <Group justify="space-between" mb="xs">
                                    <Group gap="xs">
                                        <Text size="lg">{getPaisFlag(stat.pais)}</Text>
                                        <Text fw={600} size="sm">{getPaisDisplayName(stat.pais)}</Text>
                                    </Group>
                                    <Badge variant="light" color="blue" size="sm">{stat.total}</Badge>
                                </Group>
                                
                                <Progress 
                                    value={(stat.total / maxTotal) * 100} 
                                    size="xs" 
                                    color={stat.erros > 0 ? 'red' : 'blue'}
                                    mb="xs"
                                />
                                
                                {stat.erros > 0 && (
                                    <Group gap="xs">
                                        <ThemeIcon size="xs" radius="xl" color="red" variant="light">
                                            <IconAlertTriangle size={10} />
                                        </ThemeIcon>
                                        <Text size="xs" c="red" fw={600}>
                                            {stat.erros} erro(s)
                                        </Text>
                                    </Group>
                                )}
                                
                                {stat.erros === 0 && (
                                    <Group gap="xs">
                                        <ThemeIcon size="xs" radius="xl" color="green" variant="light">
                                            <IconCheck size={10} />
                                        </ThemeIcon>
                                        <Text size="xs" c="green" fw={600}>
                                            Funcionando bem
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
                                   gradient={{ from: 'blue', to: 'cyan', deg: 45 }}>
                            <IconRobot size={24} />
                        </ThemeIcon>
                        <Title order={2}>Nicochat - Monitoramento</Title>
                    </Group>
                    <Text c="dimmed">Monitore conversas e erros do Nicochat por país</Text>
                </Box>
                <Button
                    leftSection={<IconRefresh size={16} />}
                    onClick={() => { carregarLogs(); carregarStatsNicochat(); }}
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

            <StatsNicochat />
            <StatsPorPais />

            {/* Filtros específicos do Nicochat */}
            <Card shadow="sm" padding="lg" radius="md" mb="md" withBorder>
                <Group mb="md">
                    <ThemeIcon size="sm" radius="md" variant="light" color="gray">
                        <IconSearch size={16} />
                    </ThemeIcon>
                    <Title order={4}>Filtros de Pesquisa</Title>
                </Group>
                <Grid>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Select
                            label="🌍 País"
                            placeholder="Todos os países"
                            data={[
                                { value: '', label: 'Todos os países' },
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
                    
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Select
                            label="⚠️ Nível"
                            placeholder="Todos os níveis"
                            data={[
                                { value: '', label: 'Todos os níveis' },
                                { value: 'info', label: '🔵 Info' },
                                { value: 'warning', label: '🟡 Warning' },
                                { value: 'error', label: '🟠 Error' },
                                { value: 'critical', label: '🔴 Critical' }
                            ]}
                            value={filtros.nivel}
                            onChange={(value) => setFiltros(prev => ({ ...prev, nivel: value || '' }))}
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
                        <TextInput
                            label="🔍 Buscar"
                            placeholder="Usuário, mensagem..."
                            leftSection={<IconSearch size={16} />}
                            value={filtros.busca}
                            onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                        />
                    </Grid.Col>
                </Grid>
            </Card>

            {/* Tabela de Logs do Nicochat */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
                <LoadingOverlay visible={loading} />
                
                <Group mb="md">
                    <ThemeIcon size="sm" radius="md" variant="light" color="blue">
                        <IconChartBar size={16} />
                    </ThemeIcon>
                    <Title order={4}>Logs do Nicochat</Title>
                    <Badge variant="light" color="blue">{logs.length} registros</Badge>
                </Group>
                
                <ScrollArea>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Data/Hora</Table.Th>
                                <Table.Th>País</Table.Th>
                                <Table.Th>Nível</Table.Th>
                                <Table.Th>Usuário</Table.Th>
                                <Table.Th>Mensagem</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Ações</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {logs.map((log) => (
                                <Table.Tr key={log.id}>
                                    <Table.Td>
                                        <Text size="sm" fw={600}>{log.tempo_relativo}</Text>
                                        <Text size="xs" c="dimmed">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge variant="light" color="cyan" 
                                               leftSection={<span>{getPaisFlag(log.pais)}</span>}>
                                            {getPaisDisplayName(log.pais)}
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
                                    <Table.Td>
                                        {log.usuario_conversa && (
                                            <Group gap="xs">
                                                <ThemeIcon size="xs" radius="xl" variant="light" color="blue">
                                                    <IconUsers size={10} />
                                                </ThemeIcon>
                                                <Code size="xs">{log.usuario_conversa}</Code>
                                            </Group>
                                        )}
                                    </Table.Td>
                                    <Table.Td style={{ maxWidth: '300px' }}>
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
                        <ThemeIcon size="xl" radius="md" variant="light" color="gray" mx="auto" mb="md">
                            <IconMessage size={32} />
                        </ThemeIcon>
                        <Text c="dimmed" fw={600}>Nenhum log do Nicochat encontrado</Text>
                        <Text size="sm" c="dimmed" mt="xs">
                            Tente ajustar os filtros ou aguarde novas conversas
                        </Text>
                    </Box>
                )}
            </Card>

            {/* Modal de Detalhes */}
            <Modal
                opened={modalDetalhes}
                onClose={() => setModalDetalhes(false)}
                title={
                    <Group>
                        <ThemeIcon size="sm" radius="md" variant="light" color="blue">
                            <IconRobot size={16} />
                        </ThemeIcon>
                        <Text fw={600}>Detalhes do Log - Nicochat</Text>
                    </Group>
                }
                size="lg"
            >
                {logSelecionado && (
                    <Stack gap="md">
                        <Group>
                            <Badge variant="light" color="blue">
                                🤖 Nicochat
                            </Badge>
                            <Badge 
                                variant="light" 
                                color={getNivelColor(logSelecionado.nivel)}
                                leftSection={getNivelIcon(logSelecionado.nivel)}
                            >
                                {logSelecionado.nivel.toUpperCase()}
                            </Badge>
                            <Badge variant="light" color="cyan" 
                                   leftSection={<span>{getPaisFlag(logSelecionado.pais)}</span>}>
                                {getPaisDisplayName(logSelecionado.pais)}
                            </Badge>
                        </Group>
                        
                        <Divider />
                        
                        <Box>
                            <Text fw={600} mb="xs">📝 Mensagem:</Text>
                            <Paper p="sm" withBorder>
                                <Text>{logSelecionado.mensagem}</Text>
                            </Paper>
                        </Box>
                        
                        {logSelecionado.usuario_conversa && (
                            <Box>
                                <Text fw={600} mb="xs">👤 Usuário da Conversa:</Text>
                                <Code block>{logSelecionado.usuario_conversa}</Code>
                            </Box>
                        )}
                        
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
                                <Text size="sm" c="dimmed" fw={600}>🕒 Data/Hora:</Text>
                                <Text size="sm">{new Date(logSelecionado.timestamp).toLocaleString()}</Text>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Text size="sm" c="dimmed" fw={600}>🌐 IP de Origem:</Text>
                                <Text size="sm">{logSelecionado.ip_origem || 'N/A'}</Text>
                            </Grid.Col>
                        </Grid>
                        
                        {logSelecionado.resolvido && (
                            <Alert color="green" icon={<IconCheck size={16} />}>
                                <Text fw={600}>✅ Resolvido por: {logSelecionado.resolvido_por_nome}</Text>
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
                title={`${logSelecionado?.resolvido ? '↩️ Marcar como Não Resolvido' : '✅ Marcar como Resolvido'}`}
            >
                {logSelecionado && (
                    <Stack gap="md">
                        <Text>
                            Deseja marcar este log como {logSelecionado.resolvido ? 'não resolvido' : 'resolvido'}?
                        </Text>
                        
                        <Textarea
                            label="📝 Observações (opcional)"
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
                                leftSection={logSelecionado.resolvido ? <IconX size={16} /> : <IconCheck size={16} />}
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

export default NicochatPage;