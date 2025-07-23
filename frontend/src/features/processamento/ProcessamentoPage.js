// frontend/src/features/processamento/ProcessamentoPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box, Grid, Title, Text, Button, TextInput, PasswordInput,
    LoadingOverlay, Alert, Card, Group, Stack, Tabs, Table,
    Modal, Badge, ActionIcon, Tooltip, Progress, Notification,
    JsonInput, Accordion, Timeline, ThemeIcon, Divider
} from '@mantine/core';
import {
    IconShoppingCart, IconAlertCircle, IconCheck, IconX,
    IconRefresh, IconTrash, IconSettings, IconHistory,
    IconExternalLink, IconCloudCheck, IconCloudX
} from '@tabler/icons-react';

function ProcessamentoPage() {
    // Estados para configuração
    const [config, setConfig] = useState(null);
    const [shopUrl, setShopUrl] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionResult, setConnectionResult] = useState(null);

    // Estados para duplicatas
    const [duplicates, setDuplicates] = useState([]);
    const [searchingDuplicates, setSearchingDuplicates] = useState(false);
    const [cancellingOrder, setCancellingOrder] = useState(null);
    const [cancellingBatch, setCancellingBatch] = useState(false);

    // Estados para logs
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Estados de interface
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    const [confirmBatchModal, setConfirmBatchModal] = useState(false);
    const [activeTab, setActiveTab] = useState('config');

    // Carrega configuração inicial
    useEffect(() => {
        loadConfig();
        loadLogs();
    }, []);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const loadConfig = async () => {
        try {
            console.log('🔧 Carregando config...');
            const response = await axios.get('/processamento/config/');
            console.log('✅ Config carregada:', response.data);
            if (response.data.shop_url) {
                setConfig(response.data);
                setShopUrl(response.data.shop_url);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar configuração:', error.response?.status, error.response?.config?.url);
            console.error('Detalhes do erro:', error.response?.data);
        } finally {
            setLoading(false);
        }
    };

    const loadLogs = async () => {
        try {
            setLoadingLogs(true);
            console.log('📊 Carregando logs...');
            const response = await axios.get('/processamento/historico-logs/');
            console.log('✅ Logs carregados:', response.data);
            setLogs(response.data.logs || []);
        } catch (error) {
            console.error('❌ Erro ao carregar logs:', error.response?.status, error.response?.config?.url);
            console.error('Detalhes do erro:', error.response?.data);
        } finally {
            setLoadingLogs(false);
        }
    };

    const testConnection = async () => {
        if (!shopUrl || !accessToken) {
            showNotification('Preencha URL da loja e token', 'error');
            return;
        }

        setTestingConnection(true);
        setConnectionResult(null);

        try {
            console.log('🔗 Testando conexão...');
            const response = await axios.post('/processamento/test-connection/', {
                shop_url: shopUrl,
                access_token: accessToken
            });
            console.log('✅ Teste de conexão:', response.data);
            setConnectionResult(response.data);
        } catch (error) {
            console.error('❌ Erro no teste de conexão:', error);
            setConnectionResult({
                success: false,
                message: error.response?.data?.error || 'Erro na conexão'
            });
        } finally {
            setTestingConnection(false);
        }
    };

    const saveConfig = async () => {
        if (!shopUrl || !accessToken) {
            showNotification('Preencha URL da loja e token', 'error');
            return;
        }

        try {
            console.log('💾 Salvando configuração...');
            const response = await axios.post('/processamento/config/', {
                shop_url: shopUrl,
                access_token: accessToken
            });
            
            console.log('✅ Configuração salva:', response.data);
            setConfig({ shop_url: shopUrl, has_token: true });
            showNotification(response.data.message);
            setAccessToken(''); // Limpa o token da interface
        } catch (error) {
            console.error('❌ Erro ao salvar configuração:', error);
            showNotification(error.response?.data?.error || 'Erro ao salvar configuração', 'error');
        }
    };

    const searchDuplicates = async () => {
        if (!config) {
            showNotification('Configure o Shopify primeiro', 'error');
            return;
        }

        setSearchingDuplicates(true);
        setDuplicates([]);

        try {
            console.log('🔍 Buscando duplicatas...');
            const response = await axios.get('/processamento/buscar-duplicatas/');
            console.log('✅ Duplicatas encontradas:', response.data);
            setDuplicates(response.data.duplicates || []);
            showNotification(`${response.data.count} duplicatas encontradas`);
            loadLogs(); // Atualiza logs
        } catch (error) {
            console.error('❌ Erro na busca:', error);
            showNotification(error.response?.data?.error || 'Erro na busca', 'error');
        } finally {
            setSearchingDuplicates(false);
        }
    };

    const cancelOrder = async (duplicate) => {
        setCancellingOrder(duplicate.duplicate_order.id);

        try {
            console.log('❌ Cancelando pedido:', duplicate.duplicate_order.id);
            const response = await axios.post('/processamento/cancelar-pedido/', {
                order_id: duplicate.duplicate_order.id,
                order_number: duplicate.duplicate_order.number
            });

            if (response.data.success) {
                showNotification(`Pedido #${duplicate.duplicate_order.number} cancelado!`);
                // Remove da lista local
                setDuplicates(prev => prev.filter(d => d.duplicate_order.id !== duplicate.duplicate_order.id));
                loadLogs();
            } else {
                showNotification(response.data.message, 'error');
            }
        } catch (error) {
            console.error('❌ Erro ao cancelar:', error);
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
            console.log('🗑️ Cancelando em lote:', duplicates.length, 'pedidos');
            const orderIds = duplicates.map(d => d.duplicate_order.id);
            const response = await axios.post('/processamento/cancelar-lote/', {
                order_ids: orderIds
            });

            console.log('✅ Cancelamento em lote:', response.data);
            showNotification(`${response.data.success_count}/${response.data.total_count} pedidos cancelados`);
            setDuplicates([]); // Limpa a lista
            loadLogs();
        } catch (error) {
            console.error('❌ Erro no cancelamento em lote:', error);
            showNotification(error.response?.data?.error || 'Erro no cancelamento em lote', 'error');
        } finally {
            setCancellingBatch(false);
        }
    };

    const renderDuplicatesTable = () => {
        if (duplicates.length === 0) {
            return <Text c="dimmed" ta="center" py="xl">Nenhuma duplicata encontrada</Text>;
        }

        return (
            <Table striped highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Cliente</Table.Th>
                        <Table.Th>Pedido Original</Table.Th>
                        <Table.Th>Pedido Duplicado</Table.Th>
                        <Table.Th>Produtos</Table.Th>
                        <Table.Th>Intervalo</Table.Th>
                        <Table.Th>Ações</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {duplicates.map((dup, index) => (
                        <Table.Tr key={index}>
                            <Table.Td>
                                <Text fw={500}>{dup.customer_name}</Text>
                                <Text size="xs" c="dimmed">{dup.customer_phone}</Text>
                            </Table.Td>
                            <Table.Td>
                                <Text size="sm">#{dup.first_order.number}</Text>
                                <Text size="xs" c="dimmed">{dup.first_order.date}</Text>
                                <Text size="xs">{dup.first_order.total}</Text>
                            </Table.Td>
                            <Table.Td>
                                <Text size="sm" fw={500}>#{dup.duplicate_order.number}</Text>
                                <Text size="xs" c="dimmed">{dup.duplicate_order.date}</Text>
                                <Text size="xs">{dup.duplicate_order.total}</Text>
                            </Table.Td>
                            <Table.Td>
                                <Text size="sm">{dup.product_names?.join(', ') || 'N/A'}</Text>
                            </Table.Td>
                            <Table.Td>
                                <Badge color="orange" size="sm">{dup.days_between} dias</Badge>
                            </Table.Td>
                            <Table.Td>
                                <Button
                                    size="xs"
                                    color="red"
                                    variant="light"
                                    leftSection={<IconTrash size={14} />}
                                    loading={cancellingOrder === dup.duplicate_order.id}
                                    onClick={() => cancelOrder(dup)}
                                >
                                    Cancelar
                                </Button>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        );
    };

    const renderLogs = () => (
        <Stack gap="sm">
            {logs.map((log) => (
                <Card key={log.id} withBorder p="sm">
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
                            <Badge size="xs" color={log.status === 'Sucesso' ? 'green' : log.status === 'Erro' ? 'red' : 'orange'}>
                                {log.status}
                            </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                            {new Date(log.data_execucao).toLocaleString('pt-BR')}
                        </Text>
                    </Group>
                    
                    <Group gap="md">
                        {log.pedidos_encontrados > 0 && (
                            <Text size="xs">📊 Encontrados: {log.pedidos_encontrados}</Text>
                        )}
                        {log.pedidos_cancelados > 0 && (
                            <Text size="xs">❌ Cancelados: {log.pedidos_cancelados}</Text>
                        )}
                    </Group>
                    
                    {log.erro_mensagem && (
                        <Text size="xs" c="red" mt="xs">{log.erro_mensagem}</Text>
                    )}
                </Card>
            ))}
        </Stack>
    );

    // Teste de conectividade ao carregar a página
    useEffect(() => {
        const testBackendConnection = async () => {
            try {
                console.log('🔗 Testando conectividade do backend...');
                const response = await axios.get('/api/debug/cors/');
                console.log('✅ Backend acessível:', response.data);
            } catch (error) {
                console.error('❌ Backend não acessível:', error);
            }
        };
        
        testBackendConnection();
    }, []);

    if (loading) {
        return <LoadingOverlay visible overlayProps={{ radius: "sm", blur: 2 }} />;
    }

    return (
        <Box p="md">
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

            <Group justify="space-between" mb="md">
                <Box>
                    <Title order={2} mb="xs">🛒 Processamento de Pedidos Duplicados</Title>
                    <Text c="dimmed">
                        Sistema para detectar e cancelar pedidos duplicados no Shopify
                    </Text>
                </Box>
            </Group>

            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                    <Tabs.Tab value="config" leftSection={<IconSettings size="0.8rem" />}>
                        Configuração
                    </Tabs.Tab>
                    <Tabs.Tab value="duplicates" leftSection={<IconShoppingCart size="0.8rem" />}>
                        Detectar Duplicatas
                    </Tabs.Tab>
                    <Tabs.Tab value="logs" leftSection={<IconHistory size="0.8rem" />}>
                        Histórico
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="config" pt="md">
                    <Card withBorder>
                        <Title order={4} mb="md">⚙️ Configuração Shopify</Title>
                        
                        {config && (
                            <Alert icon={<IconCheck size="1rem" />} color="green" mb="md">
                                Loja configurada: {config.shop_url}
                            </Alert>
                        )}

                        <Grid>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <TextInput
                                    label="URL da Loja"
                                    placeholder="minha-loja.myshopify.com"
                                    value={shopUrl}
                                    onChange={(e) => setShopUrl(e.target.value)}
                                    description="Apenas o domínio, sem https://"
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <PasswordInput
                                    label="Access Token"
                                    placeholder="Token de acesso da API"
                                    value={accessToken}
                                    onChange={(e) => setAccessToken(e.target.value)}
                                    description="Token gerado no admin do Shopify"
                                />
                            </Grid.Col>
                        </Grid>

                        <Group mt="md">
                            <Button
                                leftSection={<IconCloudCheck size={16} />}
                                onClick={testConnection}
                                loading={testingConnection}
                                variant="outline"
                            >
                                Testar Conexão
                            </Button>
                            <Button
                                leftSection={<IconCheck size={16} />}
                                onClick={saveConfig}
                                disabled={!connectionResult?.success}
                            >
                                Salvar Configuração
                            </Button>
                        </Group>

                        {connectionResult && (
                            <Alert
                                icon={connectionResult.success ? <IconCloudCheck size="1rem" /> : <IconCloudX size="1rem" />}
                                color={connectionResult.success ? 'green' : 'red'}
                                mt="md"
                            >
                                {connectionResult.message}
                            </Alert>
                        )}

                        <Card mt="xl" withBorder bg="gray.0">
                            <Title order={5} mb="sm">📋 Critérios de Duplicação</Title>
                            <Text size="sm" mb="xs">Um pedido é considerado duplicado quando:</Text>
                            <Stack gap="xs">
                                <Text size="sm">✅ Mesmo cliente (telefone)</Text>
                                <Text size="sm">✅ Mesmo produto</Text>
                                <Text size="sm">✅ Intervalo ≤ 30 dias</Text>
                                <Text size="sm">✅ Pedido não processado (sem tags do Dropi)</Text>
                            </Stack>
                        </Card>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="duplicates" pt="md">
                    <Stack gap="md">
                        <Card withBorder>
                            <Group justify="space-between" mb="md">
                                <Title order={4}>🔍 Detecção de Duplicatas</Title>
                                <Group>
                                    <Button
                                        leftSection={<IconRefresh size={16} />}
                                        onClick={searchDuplicates}
                                        loading={searchingDuplicates}
                                        disabled={!config}
                                    >
                                        Buscar Duplicatas
                                    </Button>
                                    {duplicates.length > 0 && (
                                        <Button
                                            color="red"
                                            leftSection={<IconTrash size={16} />}
                                            onClick={() => setConfirmBatchModal(true)}
                                            loading={cancellingBatch}
                                        >
                                            Cancelar Todos ({duplicates.length})
                                        </Button>
                                    )}
                                </Group>
                            </Group>

                            {searchingDuplicates && (
                                <Box mb="md">
                                    <Text size="sm" mb="xs">Analisando pedidos...</Text>
                                    <Progress animated />
                                </Box>
                            )}

                            {renderDuplicatesTable()}
                        </Card>
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="logs" pt="md">
                    <Card withBorder>
                        <Group justify="space-between" mb="md">
                            <Title order={4}>📊 Histórico de Operações</Title>
                            <Button
                                variant="outline"
                                leftSection={<IconRefresh size={16} />}
                                onClick={loadLogs}
                                loading={loadingLogs}
                                size="sm"
                            >
                                Atualizar
                            </Button>
                        </Group>

                        {loadingLogs ? (
                            <LoadingOverlay visible />
                        ) : logs.length === 0 ? (
                            <Text c="dimmed" ta="center" py="xl">Nenhum histórico encontrado</Text>
                        ) : (
                            renderLogs()
                        )}
                    </Card>
                </Tabs.Panel>
            </Tabs>

            {/* Modal de confirmação para cancelamento em lote */}
            <Modal
                opened={confirmBatchModal}
                onClose={() => setConfirmBatchModal(false)}
                title="Confirmar Cancelamento em Lote"
                centered
            >
                <Stack gap="md">
                    <Alert icon={<IconAlertCircle size="1rem" />} color="orange">
                        Esta ação cancelará {duplicates.length} pedidos duplicados. Esta operação não pode ser desfeita.
                    </Alert>
                    
                    <Text size="sm">Pedidos que serão cancelados:</Text>
                    <Box mah={200} style={{ overflowY: 'auto' }}>
                        {duplicates.map((dup, index) => (
                            <Text key={index} size="xs">
                                • #{dup.duplicate_order.number} - {dup.customer_name} - {dup.duplicate_order.total}
                            </Text>
                        ))}
                    </Box>

                    <Group justify="flex-end">
                        <Button variant="outline" onClick={() => setConfirmBatchModal(false)}>
                            Cancelar
                        </Button>
                        <Button color="red" onClick={cancelBatch}>
                            Confirmar Cancelamento
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}

export default ProcessamentoPage;