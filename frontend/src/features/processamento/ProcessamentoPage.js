// frontend/src/features/processamento/ProcessamentoPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box, Grid, Title, Text, Button, TextInput, PasswordInput,
    LoadingOverlay, Alert, Card, Group, Stack, Table,
    Modal, Badge, Progress, Notification, Select, Collapse,
    ActionIcon, Tooltip, Avatar, Switch, Spotlight,
    Transition, Paper, Container, Flex, Space, Divider,
    NumberFormatter, SimpleGrid, ThemeIcon, ScrollArea,
    UnstyledButton, rem, Center
} from '@mantine/core';
import {
    IconShoppingCart, IconAlertCircle, IconCheck, IconX,
    IconRefresh, IconTrash, IconSettings, IconHistory,
    IconPlus, IconBuilding, IconCloudCheck, IconCloudX, 
    IconBook, IconExternalLink, IconSearch, IconBell,
    IconChevronDown, IconTarget, IconTrendingUp,
    IconUsers, IconClock, IconShield, IconBolt,
    IconArrowRight, IconDots, IconEdit, IconEye
} from '@tabler/icons-react';

function ProcessamentoPage() {
    // Estados principais
    const [lojas, setLojas] = useState([]);
    const [lojaSelecionada, setLojaSelecionada] = useState(null);
    const [duplicates, setDuplicates] = useState([]);
    const [searchingDuplicates, setSearchingDuplicates] = useState(false);
    const [cancellingOrder, setCancellingOrder] = useState(null);
    const [cancellingBatch, setCancellingBatch] = useState(false);
    
    // Estados modais/configuração
    const [showAddStore, setShowAddStore] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [newStore, setNewStore] = useState({ nome_loja: '', shop_url: '', access_token: '' });
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionResult, setConnectionResult] = useState(null);
    
    // Estados interface
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    const [confirmBatchModal, setConfirmBatchModal] = useState(false);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        loadLojas();
    }, []);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const loadLojas = async () => {
        try {
            const response = await axios.get('/processamento/lojas/');
            setLojas(response.data.lojas || []);
            if (response.data.lojas?.length > 0 && !lojaSelecionada) {
                setLojaSelecionada(response.data.lojas[0].id);
            }
        } catch (error) {
            console.error('Erro ao carregar lojas:', error);
        } finally {
            setLoading(false);
        }
    };

    const testConnection = async () => {
        if (!newStore.shop_url || !newStore.access_token) {
            showNotification('Preencha URL da loja e token', 'error');
            return;
        }

        setTestingConnection(true);
        setConnectionResult(null);

        try {
            const response = await axios.post('/processamento/test-connection/', {
                shop_url: newStore.shop_url,
                access_token: newStore.access_token
            });
            setConnectionResult(response.data);
        } catch (error) {
            setConnectionResult({
                success: false,
                message: error.response?.data?.error || 'Erro na conexão'
            });
        } finally {
            setTestingConnection(false);
        }
    };

    const addStore = async () => {
        if (!newStore.nome_loja || !newStore.shop_url || !newStore.access_token) {
            showNotification('Preencha todos os campos', 'error');
            return;
        }

        try {
            const response = await axios.post('/processamento/lojas/', newStore);
            showNotification(response.data.message);
            setNewStore({ nome_loja: '', shop_url: '', access_token: '' });
            setConnectionResult(null);
            setShowAddStore(false);
            loadLojas();
        } catch (error) {
            showNotification(error.response?.data?.error || 'Erro ao adicionar loja', 'error');
        }
    };

    const removeStore = async (lojaId) => {
        try {
            const response = await axios.delete('/processamento/lojas/', { data: { loja_id: lojaId } });
            showNotification(response.data.message);
            loadLojas();
            if (lojaSelecionada === lojaId) {
                setLojaSelecionada(null);
                setDuplicates([]);
            }
        } catch (error) {
            showNotification(error.response?.data?.error || 'Erro ao remover loja', 'error');
        }
    };

    const searchDuplicates = async () => {
        if (!lojaSelecionada) {
            showNotification('Selecione uma loja primeiro', 'error');
            return;
        }

        setSearchingDuplicates(true);
        setDuplicates([]);

        try {
            const response = await axios.post('/processamento/buscar-duplicatas/', {
                loja_id: lojaSelecionada
            });
            setDuplicates(response.data.duplicates || []);
            showNotification(`${response.data.count} duplicatas encontradas`);
        } catch (error) {
            showNotification(error.response?.data?.error || 'Erro na busca', 'error');
        } finally {
            setSearchingDuplicates(false);
        }
    };

    const cancelOrder = async (duplicate) => {
        setCancellingOrder(duplicate.duplicate_order.id);

        try {
            const response = await axios.post('/processamento/cancelar-pedido/', {
                loja_id: lojaSelecionada,
                order_id: duplicate.duplicate_order.id,
                order_number: duplicate.duplicate_order.number
            });

            if (response.data.success) {
                showNotification(`Pedido #${duplicate.duplicate_order.number} cancelado!`);
                setDuplicates(prev => prev.filter(d => d.duplicate_order.id !== duplicate.duplicate_order.id));
            } else {
                showNotification(response.data.message, 'error');
            }
        } catch (error) {
            showNotification(error.response?.data?.error || 'Erro ao cancelar', 'error');
        } finally {
            setCancellingOrder(null);
        }
    };

    const cancelBatch = async () => {
        if (duplicates.length === 0) return;

        setCancellingBatch(true);
        setConfirmBatchModal(false);

        try {
            const orderIds = duplicates.map(d => d.duplicate_order.id);
            const response = await axios.post('/processamento/cancelar-lote/', {
                loja_id: lojaSelecionada,
                order_ids: orderIds
            });

            showNotification(`${response.data.success_count}/${response.data.total_count} pedidos cancelados`);
            setDuplicates([]);
        } catch (error) {
            showNotification(error.response?.data?.error || 'Erro no cancelamento em lote', 'error');
        } finally {
            setCancellingBatch(false);
        }
    };

    const loadLogs = async () => {
        try {
            const url = lojaSelecionada 
                ? `/processamento/historico-logs/?loja_id=${lojaSelecionada}`
                : '/processamento/historico-logs/';
            const response = await axios.get(url);
            setLogs(response.data.logs || []);
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
        }
    };

    const lojasOptions = lojas.map(loja => ({
        value: loja.id.toString(),
        label: `${loja.nome_loja} (${loja.shop_url})`
    }));

    const renderStatsCard = (title, value, icon, color, subtitle) => (
        <Paper
            p="xl"
            radius="lg"
            withBorder
            shadow="sm"
            style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
            }}
            className="hover-card"
        >
            <Group justify="space-between" mb="md">
                <ThemeIcon size="lg" radius="md" variant="gradient" gradient={{ from: color, to: 'cyan' }}>
                    {icon}
                </ThemeIcon>
                <ActionIcon variant="subtle" color="gray">
                    <IconDots size="1rem" />
                </ActionIcon>
            </Group>
            <Text size="xl" fw={700}>{value}</Text>
            <Text size="sm" c="dimmed" mt={4}>{title}</Text>
            {subtitle && <Text size="xs" c="dimmed" mt={2}>{subtitle}</Text>}
        </Paper>
    );

    const renderModernDuplicateCard = (duplicate, index) => (
        <Paper
            key={index}
            p="lg"
            radius="md"
            withBorder
            shadow="sm"
            style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
            }}
            className="duplicate-card"
        >
            <Group justify="space-between" mb="md">
                <Group>
                    <Avatar color="blue" radius="sm">
                        {duplicate.customer_name?.charAt(0) || 'U'}
                    </Avatar>
                    <Box>
                        <Text fw={600} size="sm">{duplicate.customer_name}</Text>
                        <Text size="xs" c="dimmed">{duplicate.customer_phone}</Text>
                    </Box>
                </Group>
                <Badge 
                    variant="light" 
                    color={duplicate.days_between <= 7 ? 'red' : duplicate.days_between <= 15 ? 'orange' : 'yellow'}
                    radius="sm"
                >
                    {duplicate.days_between} dias
                </Badge>
            </Group>

            <Grid mb="md">
                <Grid.Col span={6}>
                    <Paper p="sm" radius="sm" bg="rgba(34, 197, 94, 0.1)" withBorder>
                        <Text size="xs" c="green.7" fw={500} mb={4}>PEDIDO ORIGINAL</Text>
                        <Text size="sm" fw={600}>#{duplicate.first_order.number}</Text>
                        <Text size="xs" c="dimmed">{duplicate.first_order.date}</Text>
                        <Text size="xs" c="green.7">{duplicate.first_order.total}</Text>
                    </Paper>
                </Grid.Col>
                <Grid.Col span={6}>
                    <Paper p="sm" radius="sm" bg="rgba(239, 68, 68, 0.1)" withBorder>
                        <Text size="xs" c="red.7" fw={500} mb={4}>DUPLICATA</Text>
                        <Text size="sm" fw={600}>#{duplicate.duplicate_order.number}</Text>
                        <Text size="xs" c="dimmed">{duplicate.duplicate_order.date}</Text>
                        <Text size="xs" c="red.7">{duplicate.duplicate_order.total}</Text>
                    </Paper>
                </Grid.Col>
            </Grid>

            <Text size="xs" c="dimmed" mb="md">
                <strong>Produtos:</strong> {duplicate.product_names?.join(', ') || 'N/A'}
            </Text>

            <Group justify="flex-end">
                <Button
                    size="sm"
                    variant="light"
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    loading={cancellingOrder === duplicate.duplicate_order.id}
                    onClick={() => cancelOrder(duplicate)}
                    radius="md"
                >
                    Cancelar
                </Button>
            </Group>
        </Paper>
    );

    if (loading) {
        return (
            <Center h="100vh">
                <LoadingOverlay visible overlayProps={{ radius: "sm", blur: 2 }} />
            </Center>
        );
    }

    return (
        <Box
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                position: 'relative'
            }}
        >
            {/* Notification */}
            <Transition mounted={!!notification} transition="slide-down">
                {(styles) => (
                    <Notification
                        style={{ ...styles, position: 'fixed', top: 20, right: 20, zIndex: 1000 }}
                        icon={notification?.type === 'success' ? <IconCheck size="1.1rem" /> : <IconX size="1.1rem" />}
                        color={notification?.type === 'success' ? 'teal' : 'red'}
                        title={notification?.type === 'success' ? 'Sucesso!' : 'Erro!'}
                        onClose={() => setNotification(null)}
                        radius="md"
                    >
                        {notification?.message}
                    </Notification>
                )}
            </Transition>

            {/* Header Moderno */}
            <Paper
                p="md"
                withBorder
                shadow="sm"
                style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100
                }}
            >
                <Container size="xl">
                    <Group justify="space-between">
                        <Group>
                            <ThemeIcon size="xl" radius="md" variant="gradient" gradient={{ from: 'violet', to: 'cyan' }}>
                                <IconShoppingCart size="1.5rem" />
                            </ThemeIcon>
                            <Box>
                                <Title order={2} fw={700}>Duplicate Manager</Title>
                                <Text size="sm" c="dimmed">Gerenciamento inteligente de pedidos</Text>
                            </Box>
                        </Group>
                        
                        <Group>
                            {/* Seletor de Loja Minimalista */}
                            <Select
                                placeholder="Selecionar loja"
                                data={lojasOptions}
                                value={lojaSelecionada?.toString()}
                                onChange={(value) => setLojaSelecionada(parseInt(value))}
                                leftSection={<IconBuilding size="1rem" />}
                                style={{ minWidth: 200 }}
                                radius="md"
                                variant="filled"
                            />
                            
                            <ActionIcon
                                variant="light"
                                color="violet"
                                size="lg"
                                radius="md"
                                onClick={() => setShowAddStore(true)}
                            >
                                <IconPlus size="1.1rem" />
                            </ActionIcon>
                            
                            <ActionIcon
                                variant="light"
                                color="blue"
                                size="lg"
                                radius="md"
                                onClick={() => setShowInstructions(!showInstructions)}
                            >
                                <IconBook size="1.1rem" />
                            </ActionIcon>
                            
                            <ActionIcon
                                variant="light"
                                color="gray"
                                size="lg"
                                radius="md"
                                onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadLogs(); }}
                            >
                                <IconHistory size="1.1rem" />
                            </ActionIcon>
                        </Group>
                    </Group>
                </Container>
            </Paper>

            <Container size="xl" py="xl">
                {/* Stats Cards */}
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg" mb="xl">
                    {renderStatsCard("Lojas Conectadas", lojas.length, <IconBuilding size="1.2rem" />, "violet", "Integrações ativas")}
                    {renderStatsCard("Duplicatas Encontradas", duplicates.length, <IconTarget size="1.2rem" />, "red", "Aguardando ação")}
                    {renderStatsCard("Loja Selecionada", lojaSelecionada ? lojas.find(l => l.id === lojaSelecionada)?.nome_loja || 'N/A' : 'Nenhuma', <IconBolt size="1.2rem" />, "cyan", "Análise ativa")}
                    {renderStatsCard("Status", lojaSelecionada ? "Conectado" : "Desconectado", <IconShield size="1.2rem" />, "green", "Sistema operacional")}
                </SimpleGrid>

                {/* Instruções (Collapse) */}
                <Collapse in={showInstructions}>
                    <Paper
                        p="xl"
                        radius="lg"
                        mb="xl"
                        withBorder
                        shadow="sm"
                        style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <Title order={3} mb="md">📋 Configuração Shopify</Title>
                        <Stack gap="md">
                            <Paper p="md" radius="md" bg="rgba(108, 92, 231, 0.1)" withBorder>
                                <Text fw={600} c="violet.7" mb="xs">1. Criar App Privado</Text>
                                <Text size="sm" c="dimmed">Acesse sua loja → Settings → Apps → Develop apps → Create an app</Text>
                            </Paper>
                            <Paper p="md" radius="md" bg="rgba(0, 206, 201, 0.1)" withBorder>
                                <Text fw={600} c="cyan.7" mb="xs">2. Configurar Permissões</Text>
                                <Text size="sm" c="dimmed">Adicione: read_orders, write_orders, read_products, read_customers</Text>
                            </Paper>
                            <Paper p="md" radius="md" bg="rgba(253, 121, 168, 0.1)" withBorder>
                                <Text fw={600} c="pink.7" mb="xs">3. Gerar Token</Text>
                                <Text size="sm" c="dimmed">Install app → Copie o Admin API access token</Text>
                            </Paper>
                        </Stack>
                    </Paper>
                </Collapse>

                {/* Área Principal de Duplicatas */}
                <Paper
                    p="xl"
                    radius="lg"
                    withBorder
                    shadow="sm"
                    style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <Group justify="space-between" mb="xl">
                        <Box>
                            <Title order={2} fw={700} mb="xs">🎯 Pedidos Duplicados</Title>
                            <Text c="dimmed">Detecte e gerencie pedidos duplicados automaticamente</Text>
                        </Box>
                        
                        <Group>
                            <Button
                                size="md"
                                leftSection={<IconSearch size="1.1rem" />}
                                onClick={searchDuplicates}
                                loading={searchingDuplicates}
                                disabled={!lojaSelecionada}
                                variant="gradient"
                                gradient={{ from: 'violet', to: 'cyan' }}
                                radius="md"
                            >
                                Buscar Duplicatas
                            </Button>
                            
                            {duplicates.length > 0 && (
                                <Button
                                    size="md"
                                    color="red"
                                    leftSection={<IconTrash size="1.1rem" />}
                                    onClick={() => setConfirmBatchModal(true)}
                                    loading={cancellingBatch}
                                    variant="light"
                                    radius="md"
                                >
                                    Cancelar Todos ({duplicates.length})
                                </Button>
                            )}
                        </Group>
                    </Group>

                    {!lojaSelecionada && (
                        <Alert
                            icon={<IconAlertCircle size="1rem" />}
                            color="blue"
                            variant="light"
                            radius="md"
                            mb="xl"
                        >
                            Selecione uma loja no header para buscar pedidos duplicados
                        </Alert>
                    )}

                    {searchingDuplicates && (
                        <Paper p="md" radius="md" bg="rgba(108, 92, 231, 0.1)" mb="xl" withBorder>
                            <Text size="sm" c="violet.7" mb="xs" fw={500}>Analisando pedidos...</Text>
                            <Progress
                                animated
                                value={100}
                                color="violet"
                                radius="md"
                                size="sm"
                            />
                        </Paper>
                    )}

                    {/* Lista de Duplicatas Moderna */}
                    {duplicates.length === 0 && !searchingDuplicates ? (
                        <Center py="xl">
                            <Stack align="center" gap="md">
                                <ThemeIcon size="xl" radius="md" variant="light" color="gray">
                                    <IconTarget size="2rem" />
                                </ThemeIcon>
                                <Text c="dimmed" ta="center">Nenhuma duplicata encontrada</Text>
                                <Text size="xs" c="dimmed" ta="center">Execute uma busca para detectar pedidos duplicados</Text>
                            </Stack>
                        </Center>
                    ) : (
                        <Stack gap="md">
                            {duplicates.map((duplicate, index) => renderModernDuplicateCard(duplicate, index))}
                        </Stack>
                    )}

                    {/* Critérios */}
                    <Paper
                        mt="xl"
                        p="md"
                        radius="md"
                        withBorder
                        style={{
                            background: 'rgba(34, 197, 94, 0.1)'
                        }}
                    >
                        <Group gap="md">
                            <ThemeIcon size="sm" color="green" variant="light">
                                <IconCheck size="0.8rem" />
                            </ThemeIcon>
                            <Text size="sm" c="green.7" fw={500}>Critérios: Mesmo cliente + produto + ≤30 dias + não processado</Text>
                        </Group>
                    </Paper>
                </Paper>

                {/* Histórico (Collapse) */}
                <Collapse in={showHistory}>
                    <Paper
                        mt="xl"
                        p="xl"
                        radius="lg"
                        withBorder
                        shadow="sm"
                        style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <Group justify="space-between" mb="md">
                            <Title order={4}>📊 Histórico de Operações</Title>
                            <Button
                                variant="light"
                                size="sm"
                                leftSection={<IconRefresh size={16} />}
                                onClick={loadLogs}
                                radius="md"
                            >
                                Atualizar
                            </Button>
                        </Group>
                        
                        {logs.length === 0 ? (
                            <Text c="dimmed" ta="center" py="xl">Nenhum histórico encontrado</Text>
                        ) : (
                            <ScrollArea.Autosize mah={400}>
                                <Stack gap="sm">
                                    {logs.map((log) => (
                                        <Paper key={log.id} p="sm" radius="md" withBorder bg="rgba(248, 250, 252, 0.8)">
                                            <Group justify="space-between" mb="xs">
                                                <Group gap="xs">
                                                    <ThemeIcon
                                                        size="sm"
                                                        color={log.status === 'Sucesso' ? 'green' : log.status === 'Erro' ? 'red' : 'orange'}
                                                        variant="light"
                                                    >
                                                        {log.status === 'Sucesso' ? <IconCheck size={14} /> : 
                                                         log.status === 'Erro' ? <IconX size={14} /> : <IconAlertCircle size={14} />}
                                                    </ThemeIcon>
                                                    <Text fw={500} size="sm">{log.tipo}</Text>
                                                    <Badge size="xs" variant="light" color={log.status === 'Sucesso' ? 'green' : log.status === 'Erro' ? 'red' : 'orange'}>
                                                        {log.status}
                                                    </Badge>
                                                    <Text size="xs" c="dimmed">• {log.loja_nome}</Text>
                                                </Group>
                                                <Text size="xs" c="dimmed">
                                                    {new Date(log.data_execucao).toLocaleString('pt-BR')}
                                                </Text>
                                            </Group>
                                            
                                            <Group gap="md">
                                                {log.pedidos_encontrados > 0 && (
                                                    <Text size="xs" c="dimmed">📊 Encontrados: {log.pedidos_encontrados}</Text>
                                                )}
                                                {log.pedidos_cancelados > 0 && (
                                                    <Text size="xs" c="dimmed">❌ Cancelados: {log.pedidos_cancelados}</Text>
                                                )}
                                            </Group>
                                        </Paper>
                                    ))}
                                </Stack>
                            </ScrollArea.Autosize>
                        )}
                    </Paper>
                </Collapse>
            </Container>

            {/* Modal Adicionar Loja */}
            <Modal
                opened={showAddStore}
                onClose={() => setShowAddStore(false)}
                title="🏪 Adicionar Nova Loja"
                centered
                radius="md"
                size="lg"
            >
                <Stack gap="md">
                    <TextInput
                        label="Nome da Loja"
                        placeholder="Ex: Loja Principal, Loja B2B"
                        value={newStore.nome_loja}
                        onChange={(e) => setNewStore(prev => ({ ...prev, nome_loja: e.target.value }))}
                        radius="md"
                    />
                    <TextInput
                        label="URL da Loja"
                        placeholder="minha-loja.myshopify.com"
                        value={newStore.shop_url}
                        onChange={(e) => setNewStore(prev => ({ ...prev, shop_url: e.target.value }))}
                        radius="md"
                    />
                    <PasswordInput
                        label="Access Token"
                        placeholder="Token de acesso da API"
                        value={newStore.access_token}
                        onChange={(e) => setNewStore(prev => ({ ...prev, access_token: e.target.value }))}
                        radius="md"
                    />

                    <Group mt="md">
                        <Button
                            leftSection={<IconCloudCheck size={16} />}
                            onClick={testConnection}
                            loading={testingConnection}
                            variant="light"
                            radius="md"
                        >
                            Testar Conexão
                        </Button>
                        <Button
                            leftSection={<IconCheck size={16} />}
                            onClick={addStore}
                            disabled={!connectionResult?.success}
                            variant="gradient"
                            gradient={{ from: 'violet', to: 'cyan' }}
                            radius="md"
                        >
                            Adicionar Loja
                        </Button>
                    </Group>

                    {connectionResult && (
                        <Alert
                            icon={connectionResult.success ? <IconCloudCheck size="1rem" /> : <IconCloudX size="1rem" />}
                            color={connectionResult.success ? 'green' : 'red'}
                            variant="light"
                            radius="md"
                        >
                            {connectionResult.message}
                        </Alert>
                    )}
                </Stack>
            </Modal>

            {/* Modal de confirmação para cancelamento em lote */}
            <Modal
                opened={confirmBatchModal}
                onClose={() => setConfirmBatchModal(false)}
                title="⚠️ Confirmar Cancelamento em Lote"
                centered
                radius="md"
            >
                <Stack gap="md">
                    <Alert icon={<IconAlertCircle size="1rem" />} color="orange" variant="light" radius="md">
                        Esta ação cancelará {duplicates.length} pedidos duplicados. Esta operação não pode ser desfeita.
                    </Alert>
                    
                    <Text size="sm" fw={500}>Pedidos que serão cancelados:</Text>
                    <ScrollArea.Autosize mah={200}>
                        {duplicates.map((dup, index) => (
                            <Text key={index} size="xs" c="dimmed">
                                • #{dup.duplicate_order.number} - {dup.customer_name} - {dup.duplicate_order.total}
                            </Text>
                        ))}
                    </ScrollArea.Autosize>

                    <Group justify="flex-end" mt="md">
                        <Button variant="light" onClick={() => setConfirmBatchModal(false)} radius="md">
                            Cancelar
                        </Button>
                        <Button color="red" onClick={cancelBatch} radius="md">
                            Confirmar Cancelamento
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <style jsx>{`
                .hover-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(108, 92, 231, 0.3);
                }
                
                .duplicate-card:hover {
                    transform: translateY(-1px);
                    border-color: rgba(108, 92, 231, 0.3);
                    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
                }
            `}</style>
        </Box>
    );
}

export default ProcessamentoPage;