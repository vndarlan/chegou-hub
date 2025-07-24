// frontend/src/features/processamento/ProcessamentoPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box, Grid, Title, Text, Button, TextInput, PasswordInput,
    LoadingOverlay, Alert, Card, Group, Stack, Tabs, Table,
    Modal, Badge, Progress, Notification, Select, Collapse,
    Accordion, ThemeIcon, Divider, Code, List, ActionIcon
} from '@mantine/core';
import {
    IconShoppingCart, IconAlertCircle, IconCheck, IconX,
    IconRefresh, IconTrash, IconSettings, IconHistory,
    IconPlus, IconChevronDown, IconChevronRight, IconStore,
    IconCloudCheck, IconCloudX, IconBook, IconExternalLink
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
        setTimeout(() => setNotification(null), 5000);
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
            showNotification(`${response.data.count} duplicatas encontradas na ${response.data.loja_nome}`);
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

    const renderInstructions = () => (
        <Card withBorder p="md">
            <Title order={4} mb="md">📋 Como Configurar API do Shopify</Title>
            
            <Accordion variant="contained">
                <Accordion.Item value="create-app">
                    <Accordion.Control icon={<IconPlus size={16} />}>
                        1. Criar App Privado no Shopify
                    </Accordion.Control>
                    <Accordion.Panel>
                        <List type="ordered">
                            <List.Item>Acesse: <Code>https://sua-loja.myshopify.com/admin/settings/apps</Code></List.Item>
                            <List.Item>Clique em <strong>"Develop apps"</strong></List.Item>
                            <List.Item>Clique em <strong>"Create an app"</strong></List.Item>
                            <List.Item>Nomeie o app (ex: "Chegou Hub - Duplicate Canceller")</List.Item>
                        </List>
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="permissions">
                    <Accordion.Control icon={<IconSettings size={16} />}>
                        2. Configurar Permissões
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Text mb="xs">No app criado, vá em <strong>"Configuration"</strong> e adicione estas permissões:</Text>
                        <List>
                            <List.Item><Code>read_orders</Code> - Ler pedidos</List.Item>
                            <List.Item><Code>write_orders</Code> - Modificar/cancelar pedidos</List.Item>
                            <List.Item><Code>read_products</Code> - Ler informações de produtos</List.Item>
                            <List.Item><Code>read_customers</Code> - Ler dados de clientes</List.Item>
                        </List>
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="token">
                    <Accordion.Control icon={<IconCloudCheck size={16} />}>
                        3. Gerar Access Token
                    </Accordion.Control>
                    <Accordion.Panel>
                        <List type="ordered">
                            <List.Item>Clique em <strong>"Install app"</strong></List.Item>
                            <List.Item>Copie o <strong>Admin API access token</strong></List.Item>
                            <List.Item>Use este token no formulário abaixo</List.Item>
                        </List>
                        <Alert icon={<IconAlertCircle size={16} />} color="blue" mt="md">
                            O token é sensível e deve ser mantido seguro. Ele permite acesso total aos dados da sua loja.
                        </Alert>
                    </Accordion.Panel>
                </Accordion.Item>
            </Accordion>
        </Card>
    );

    const renderAddStore = () => (
        <Card withBorder p="md">
            <Group justify="space-between" mb="md">
                <Title order={4}>🏪 Adicionar Nova Loja</Title>
                <Button variant="outline" onClick={() => setShowAddStore(false)}>
                    Cancelar
                </Button>
            </Group>
            
            <Grid>
                <Grid.Col span={12}>
                    <TextInput
                        label="Nome da Loja"
                        placeholder="Ex: Loja Principal, Loja B2B, etc."
                        value={newStore.nome_loja}
                        onChange={(e) => setNewStore(prev => ({ ...prev, nome_loja: e.target.value }))}
                        description="Nome para identificar a loja no sistema"
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                        label="URL da Loja"
                        placeholder="minha-loja.myshopify.com"
                        value={newStore.shop_url}
                        onChange={(e) => setNewStore(prev => ({ ...prev, shop_url: e.target.value }))}
                        description="Apenas o domínio, sem https://"
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <PasswordInput
                        label="Access Token"
                        placeholder="Token de acesso da API"
                        value={newStore.access_token}
                        onChange={(e) => setNewStore(prev => ({ ...prev, access_token: e.target.value }))}
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
                    onClick={addStore}
                    disabled={!connectionResult?.success}
                >
                    Adicionar Loja
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
        </Card>
    );

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
                            <Text size="xs" c="dimmed">• {log.loja_nome}</Text>
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
                    <Title order={2} mb="xs">🛒 Cancelamento de Pedidos Duplicados</Title>
                    <Text c="dimmed">Detecte e cancele pedidos duplicados do Shopify</Text>
                </Box>
                <Group>
                    <Button 
                        variant="outline" 
                        leftSection={<IconBook size={16} />}
                        onClick={() => setShowInstructions(!showInstructions)}
                    >
                        Como Configurar
                    </Button>
                    <Button 
                        variant="outline" 
                        leftSection={<IconHistory size={16} />}
                        onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadLogs(); }}
                    >
                        Histórico
                    </Button>
                </Group>
            </Group>

            {/* Instruções (Collapse) */}
            <Collapse in={showInstructions} mb="md">
                {renderInstructions()}
            </Collapse>

            {/* Histórico (Collapse) */}
            <Collapse in={showHistory} mb="md">
                <Card withBorder>
                    <Group justify="space-between" mb="md">
                        <Title order={4}>📊 Histórico de Operações</Title>
                        <Button
                            variant="outline"
                            size="sm"
                            leftSection={<IconRefresh size={16} />}
                            onClick={loadLogs}
                        >
                            Atualizar
                        </Button>
                    </Group>
                    {logs.length === 0 ? (
                        <Text c="dimmed" ta="center" py="xl">Nenhum histórico encontrado</Text>
                    ) : (
                        renderLogs()
                    )}
                </Card>
            </Collapse>

            {/* Área Principal */}
            <Stack gap="md">
                {/* Seletor de Loja */}
                <Card withBorder>
                    <Group justify="space-between" mb="md">
                        <Title order={4}>🏪 Gerenciar Lojas</Title>
                        <Button
                            leftSection={<IconPlus size={16} />}
                            onClick={() => setShowAddStore(!showAddStore)}
                            variant={showAddStore ? "outline" : "filled"}
                        >
                            {showAddStore ? 'Cancelar' : 'Adicionar Loja'}
                        </Button>
                    </Group>

                    {showAddStore && renderAddStore()}

                    {lojas.length > 0 && (
                        <Box mt="md">
                            <Group gap="md">
                                <Select
                                    label="Selecionar Loja"
                                    placeholder="Escolha uma loja"
                                    data={lojasOptions}
                                    value={lojaSelecionada?.toString()}
                                    onChange={(value) => setLojaSelecionada(parseInt(value))}
                                    style={{ flex: 1 }}
                                />
                                {lojaSelecionada && (
                                    <ActionIcon
                                        color="red"
                                        variant="outline"
                                        onClick={() => removeStore(lojaSelecionada)}
                                        style={{ marginTop: '24px' }}
                                    >
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                )}
                            </Group>
                        </Box>
                    )}
                </Card>

                {/* Detecção de Duplicatas - FOCO PRINCIPAL */}
                <Card withBorder>
                    <Group justify="space-between" mb="md">
                        <Title order={3}>🔍 Pedidos Duplicados</Title>
                        <Group>
                            <Button
                                leftSection={<IconRefresh size={16} />}
                                onClick={searchDuplicates}
                                loading={searchingDuplicates}
                                disabled={!lojaSelecionada}
                                size="md"
                            >
                                Buscar Duplicatas
                            </Button>
                            {duplicates.length > 0 && (
                                <Button
                                    color="red"
                                    leftSection={<IconTrash size={16} />}
                                    onClick={() => setConfirmBatchModal(true)}
                                    loading={cancellingBatch}
                                    size="md"
                                >
                                    Cancelar Todos ({duplicates.length})
                                </Button>
                            )}
                        </Group>
                    </Group>

                    {!lojaSelecionada && (
                        <Alert icon={<IconAlertCircle size="1rem" />} color="blue" mb="md">
                            Selecione uma loja para buscar pedidos duplicados
                        </Alert>
                    )}

                    {searchingDuplicates && (
                        <Box mb="md">
                            <Text size="sm" mb="xs">Analisando pedidos...</Text>
                            <Progress animated />
                        </Box>
                    )}

                    {renderDuplicatesTable()}

                    {/* Critérios */}
                    <Card mt="md" withBorder bg="gray.0">
                        <Title order={5} mb="sm">📋 Critérios de Duplicação</Title>
                        <Text size="sm" mb="xs">Um pedido é considerado duplicado quando:</Text>
                        <Group gap="md">
                            <Text size="sm">✅ Mesmo cliente (telefone)</Text>
                            <Text size="sm">✅ Mesmo produto</Text>
                            <Text size="sm">✅ Intervalo ≤ 30 dias</Text>
                            <Text size="sm">✅ Pedido não processado</Text>
                        </Group>
                    </Card>
                </Card>
            </Stack>

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