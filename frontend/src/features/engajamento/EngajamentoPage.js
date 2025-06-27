// frontend/src/features/engajamento/EngajamentoPage.js
import React, { useState, useEffect } from 'react';
import {
    Box, Tabs, Title, Text, Button, TextInput, Textarea, Select, NumberInput,
    Card, Group, Stack, Table, Badge, Alert, Notification, LoadingOverlay,
    Modal, ActionIcon, Checkbox, Paper, Divider, Progress, Code
} from '@mantine/core';
import {
    IconPlus, IconTrash, IconRefresh, IconSend, IconAlertCircle,
    IconCheck, IconX, IconExternalLink, IconCopy, IconDownload
} from '@tabler/icons-react';
import axios from 'axios';

function EngajamentoPage() {
    const [activeTab, setActiveTab] = useState('cadastrar');
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    
    // Estados para saldo
    const [saldo, setSaldo] = useState(null);
    const [loadingSaldo, setLoadingSaldo] = useState(false);
    
    // Estados para engajamentos
    const [engajamentos, setEngajamentos] = useState([]);
    const [modalEngajamento, setModalEngajamento] = useState(false);
    const [novoEngajamento, setNovoEngajamento] = useState({
        nome: '',
        engajamento_id: '',
        tipo: 'Like',
        funcionando: true
    });
    
    // Estados para URLs
    const [urlsInput, setUrlsInput] = useState('');
    
    // Estados para pedidos
    const [engajamentosSelecionados, setEngajamentosSelecionados] = useState({});
    const [pedidos, setPedidos] = useState([]);

    // Carregar dados iniciais
    useEffect(() => {
        carregarEngajamentos();
        carregarSaldo();
        carregarPedidos();
    }, []);

    // Funções de API
    const carregarSaldo = async () => {
        setLoadingSaldo(true);
        try {
            const response = await axios.get('/api/saldo/');
            setSaldo(response.data);
        } catch (error) {
            console.error('Erro ao carregar saldo:', error);
            setNotification({ type: 'error', message: 'Erro ao carregar saldo' });
        } finally {
            setLoadingSaldo(false);
        }
    };

    const carregarEngajamentos = async () => {
        try {
            const response = await axios.get('/api/engajamentos/');
            setEngajamentos(response.data);
        } catch (error) {
            console.error('Erro ao carregar engajamentos:', error);
        }
    };

    const carregarPedidos = async () => {
        try {
            const response = await axios.get('/api/pedidos/');
            setPedidos(response.data);
        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
        }
    };

    const salvarEngajamento = async () => {
        if (!novoEngajamento.nome || !novoEngajamento.engajamento_id) {
            setNotification({ type: 'error', message: 'Preencha todos os campos obrigatórios' });
            return;
        }

        setLoading(true);
        try {
            await axios.post('/api/engajamento/engajamentos/', novoEngajamento);
            setNotification({ type: 'success', message: 'Engajamento salvo com sucesso!' });
            setModalEngajamento(false);
            setNovoEngajamento({ nome: '', engajamento_id: '', tipo: 'Like', funcionando: true });
            carregarEngajamentos();
        } catch (error) {
            setNotification({ type: 'error', message: 'Erro ao salvar engajamento' });
        } finally {
            setLoading(false);
        }
    };

    const excluirEngajamento = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este engajamento?')) return;

        try {
            await axios.delete(`/api/engajamento/engajamentos/${id}/`);
            setNotification({ type: 'success', message: 'Engajamento excluído com sucesso!' });
            carregarEngajamentos();
        } catch (error) {
            setNotification({ type: 'error', message: 'Erro ao excluir engajamento' });
        }
    };

    const criarPedido = async () => {
        const engajamentosAtivos = Object.entries(engajamentosSelecionados)
            .filter(([_, data]) => data.ativo)
            .map(([id, data]) => ({ id, quantidade: data.quantidade }));

        if (engajamentosAtivos.length === 0) {
            setNotification({ type: 'error', message: 'Selecione pelo menos um engajamento' });
            return;
        }

        if (!urlsInput.trim()) {
            setNotification({ type: 'error', message: 'Insira pelo menos uma URL' });
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/api/engajamento/criar-pedido/', {
                urls: urlsInput,
                engajamentos: engajamentosAtivos
            });
            setNotification({ type: 'success', message: 'Pedido criado com sucesso!' });
            carregarPedidos();
            setEngajamentosSelecionados({});
            setUrlsInput('');
        } catch (error) {
            setNotification({ type: 'error', message: 'Erro ao criar pedido' });
        } finally {
            setLoading(false);
        }
    };

    const copiarUrls = () => {
        navigator.clipboard.writeText(urlsInput);
        setNotification({ type: 'success', message: 'URLs copiadas para a área de transferência' });
    };

    // Componentes internos
    const SaldoCard = () => (
        <Card shadow="sm" padding="lg" radius="md">
            <Group justify="space-between" align="center" mb="md">
                <Title order={4}>💰 Saldo Disponível</Title>
                <Button
                    variant="outline"
                    size="sm"
                    leftSection={<IconRefresh size={16} />}
                    onClick={carregarSaldo}
                    loading={loadingSaldo}
                >
                    Atualizar
                </Button>
            </Group>
            {saldo ? (
                <Text size="xl" fw={700} c="green">
                    {saldo.moeda === 'BRL' ? 'R$' : saldo.moeda} {parseFloat(saldo.saldo).toFixed(2).replace('.', ',')}
                </Text>
            ) : (
                <Text c="dimmed">Carregando saldo...</Text>
            )}
        </Card>
    );

    const EngajamentosTable = () => (
        <Card shadow="sm" padding="lg" radius="md">
            <Group justify="space-between" mb="md">
                <Title order={4}>Engajamentos Cadastrados</Title>
                <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setModalEngajamento(true)}
                >
                    Adicionar
                </Button>
            </Group>
            <Table striped highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Nome</Table.Th>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>Tipo</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Ações</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {engajamentos.map((eng) => (
                        <Table.Tr key={eng.id}>
                            <Table.Td>{eng.nome}</Table.Td>
                            <Table.Td><Code>{eng.engajamento_id}</Code></Table.Td>
                            <Table.Td>
                                <Badge color={eng.tipo === 'Like' ? 'blue' : eng.tipo === 'Amei' ? 'red' : 'orange'}>
                                    {eng.tipo}
                                </Badge>
                            </Table.Td>
                            <Table.Td>
                                <Badge color={eng.funcionando ? 'green' : 'gray'}>
                                    {eng.funcionando ? 'Ativo' : 'Inativo'}
                                </Badge>
                            </Table.Td>
                            <Table.Td>
                                <ActionIcon
                                    color="red"
                                    variant="light"
                                    onClick={() => excluirEngajamento(eng.id)}
                                >
                                    <IconTrash size={16} />
                                </ActionIcon>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Card>
    );

    return (
        <Box p="md">
            <Group justify="space-between" mb="xl">
                <Box>
                    <Title order={2} mb="xs">📈 Engajamento</Title>
                    <Text c="dimmed">Gerencie engajamentos e crie pedidos para URLs do Facebook</Text>
                </Box>
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

            <SaldoCard />

            <Tabs value={activeTab} onChange={setActiveTab} mt="xl">
                <Tabs.List>
                    <Tabs.Tab value="cadastrar">Cadastrar Engajamentos</Tabs.Tab>
                    <Tabs.Tab value="comprar">Comprar Engajamento</Tabs.Tab>
                    <Tabs.Tab value="historico">Histórico</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="cadastrar" pt="md">
                    <EngajamentosTable />
                </Tabs.Panel>

                <Tabs.Panel value="comprar" pt="md">
                    <Card shadow="sm" padding="lg" radius="md">
                        <Title order={4} mb="md">🛒 Comprar Engajamento</Title>
                        <Stack gap="md">
                            <Title order={5}>Selecionar Engajamentos</Title>
                            <Group>
                                {engajamentos.filter(eng => eng.funcionando).map((eng) => (
                                    <Paper key={eng.id} p="md" withBorder>
                                        <Stack gap="xs">
                                            <Checkbox
                                                label={`${eng.nome} (${eng.tipo})`}
                                                checked={engajamentosSelecionados[eng.id]?.ativo || false}
                                                onChange={(e) => setEngajamentosSelecionados(prev => ({
                                                    ...prev,
                                                    [eng.id]: {
                                                        ...prev[eng.id],
                                                        ativo: e.target.checked,
                                                        quantidade: prev[eng.id]?.quantidade || 100
                                                    }
                                                }))}
                                            />
                                            {engajamentosSelecionados[eng.id]?.ativo && (
                                                <NumberInput
                                                    size="xs"
                                                    placeholder="Quantidade"
                                                    value={engajamentosSelecionados[eng.id]?.quantidade || 100}
                                                    onChange={(value) => setEngajamentosSelecionados(prev => ({
                                                        ...prev,
                                                        [eng.id]: {
                                                            ...prev[eng.id],
                                                            quantidade: value
                                                        }
                                                    }))}
                                                    min={1}
                                                />
                                            )}
                                        </Stack>
                                    </Paper>
                                ))}
                            </Group>
                            
                            <Divider />
                            
                            <Title order={5}>URLs para Engajamento</Title>
                            <Textarea
                                placeholder="Cole as URLs do Facebook aqui, uma por linha..."
                                value={urlsInput}
                                onChange={(e) => setUrlsInput(e.target.value)}
                                minRows={4}
                                maxRows={8}
                            />
                            
                            <Button
                                leftSection={<IconSend size={16} />}
                                onClick={criarPedido}
                                loading={loading}
                                size="lg"
                            >
                                Enviar Pedidos
                            </Button>
                        </Stack>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="historico" pt="md">
                    <Card shadow="sm" padding="lg" radius="md">
                        <Title order={4} mb="md">📊 Histórico de Pedidos</Title>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Data</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Links</Table.Th>
                                    <Table.Th>Engajamentos</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {pedidos.map((pedido) => (
                                    <Table.Tr key={pedido.id}>
                                        <Table.Td>{new Date(pedido.data_criacao).toLocaleString()}</Table.Td>
                                        <Table.Td>
                                            <Badge color={
                                                pedido.status === 'concluido' ? 'green' :
                                                pedido.status === 'erro' ? 'red' : 'blue'
                                            }>
                                                {pedido.status}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>{pedido.total_links}</Table.Td>
                                        <Table.Td>{pedido.itens?.length || 0}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                </Tabs.Panel>
            </Tabs>

            {/* Modal para adicionar engajamento */}
            <Modal
                opened={modalEngajamento}
                onClose={() => setModalEngajamento(false)}
                title="Adicionar Engajamento"
                size="md"
            >
                <Stack gap="md">
                    <TextInput
                        label="Nome do Engajamento"
                        placeholder="Ex: Like Facebook"
                        value={novoEngajamento.nome}
                        onChange={(e) => setNovoEngajamento(prev => ({ ...prev, nome: e.target.value }))}
                        required
                    />
                    <TextInput
                        label="ID do Engajamento"
                        placeholder="Ex: 101"
                        value={novoEngajamento.engajamento_id}
                        onChange={(e) => setNovoEngajamento(prev => ({ ...prev, engajamento_id: e.target.value }))}
                        required
                    />
                    <Select
                        label="Tipo"
                        data={[
                            { value: 'Like', label: '👍 Like' },
                            { value: 'Amei', label: '😍 Amei' },
                            { value: 'Uau', label: '😮 Uau' }
                        ]}
                        value={novoEngajamento.tipo}
                        onChange={(value) => setNovoEngajamento(prev => ({ ...prev, tipo: value }))}
                    />
                    <Checkbox
                        label="Engajamento funcionando"
                        checked={novoEngajamento.funcionando}
                        onChange={(e) => setNovoEngajamento(prev => ({ ...prev, funcionando: e.target.checked }))}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="outline" onClick={() => setModalEngajamento(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={salvarEngajamento} loading={loading}>
                            Salvar
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
        </Box>
    );
}

export default EngajamentoPage;