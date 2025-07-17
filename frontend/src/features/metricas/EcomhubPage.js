// frontend/src/features/metricas/EcomhubPage.js
import React, { useState, useEffect } from 'react';
import {
    Box, Title, Text, Paper, Group, Button, Table, Badge, Stack, Grid,
    Alert, ActionIcon, Modal, Card, Select, Container, Progress,
    Notification, ScrollArea, Loader, Divider, TextInput
} from '@mantine/core';
import {
    IconCalendar, IconDownload, IconTrash, IconRefresh, IconCheck, IconX, 
    IconAlertTriangle, IconTrendingUp, IconBuilding, IconChartBar, IconPlus,
    IconEye, IconActivity, IconSearch, IconWorldWww
} from '@tabler/icons-react';

import axios from 'axios';

// Países disponíveis
const PAISES = [
    { value: '164', label: '🇪🇸 Espanha' },
    { value: '41', label: '🇭🇷 Croácia' }
];

function EcomhubPage() {
    // Estados principais
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [dadosResultado, setDadosResultado] = useState(null);
    
    // Estados do formulário
    const [dataInicio, setDataInicio] = useState(null);
    const [dataFim, setDataFim] = useState(null);
    const [paisSelecionado, setPaisSelecionado] = useState('164'); // Espanha default
    
    // Estados de modal e loading
    const [modalSalvar, setModalSalvar] = useState(false);
    const [nomeAnalise, setNomeAnalise] = useState('');
    const [loadingProcessar, setLoadingProcessar] = useState(false);
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [loadingAnalises, setLoadingAnalises] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState({});
    
    // Estados de notificação e progresso
    const [notification, setNotification] = useState(null);
    const [progressoAtual, setProgressoAtual] = useState(null);

    // ======================== FUNÇÕES DE API ========================

    const fetchAnalises = async () => {
        setLoadingAnalises(true);
        try {
            const response = await axios.get('/metricas/ecomhub/analises/');
            setAnalisesSalvas(response.data);
        } catch (error) {
            console.error('Erro ao buscar análises:', error);
            showNotification('error', 'Erro ao carregar análises salvas');
        } finally {
            setLoadingAnalises(false);
        }
    };

    const processarDados = async () => {
        if (!dataInicio || !dataFim || !paisSelecionado) {
            showNotification('error', 'Selecione as datas e o país');
            return;
        }

        if (dataInicio > dataFim) {
            showNotification('error', 'Data de início deve ser anterior à data fim');
            return;
        }

        setLoadingProcessar(true);
        setProgressoAtual({ etapa: 'Iniciando automação...', porcentagem: 0 });

        try {
            const response = await axios.post('/metricas/ecomhub/processar-selenium/', {
                data_inicio: dataInicio.toISOString().split('T')[0],
                data_fim: dataFim.toISOString().split('T')[0],
                pais_id: paisSelecionado
            });

            if (response.data.status === 'success') {
                setDadosResultado(response.data.dados_processados);
                showNotification('success', '✅ Dados processados com sucesso!');
                
                // Gerar nome automático para análise
                const paisNome = PAISES.find(p => p.value === paisSelecionado)?.label || 'País';
                const dataStr = `${dataInicio.toLocaleDateString()} - ${dataFim.toLocaleDateString()}`;
                setNomeAnalise(`${paisNome} ${dataStr}`);
            }
        } catch (error) {
            console.error('Erro no processamento:', error);
            showNotification('error', `❌ Erro: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingProcessar(false);
            setProgressoAtual(null);
        }
    };

    const salvarAnalise = async () => {
        if (!dadosResultado || !nomeAnalise) {
            showNotification('error', 'Dados ou nome da análise inválidos');
            return;
        }

        setLoadingSalvar(true);
        try {
            const response = await axios.post('/metricas/ecomhub/analises/', {
                nome: nomeAnalise,
                dados_efetividade: dadosResultado,
                tipo_metrica: 'produto',
                descricao: `Automação Selenium - ${PAISES.find(p => p.value === paisSelecionado)?.label}`
            });

            if (response.data.id) {
                showNotification('success', `✅ Análise '${nomeAnalise}' salva!`);
                setModalSalvar(false);
                setNomeAnalise('');
                fetchAnalises();
            }
        } catch (error) {
            showNotification('error', `❌ Erro ao salvar: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingSalvar(false);
        }
    };

    const carregarAnalise = (analise) => {
        setDadosResultado(analise.dados_efetividade);
        showNotification('success', '✅ Análise carregada!');
    };

    const deletarAnalise = async (id, nome) => {
        const nomeDisplay = nome.replace('[ECOMHUB] ', '');
        if (!window.confirm(`Deletar análise '${nomeDisplay}'?`)) return;

        setLoadingDelete(prev => ({ ...prev, [id]: true }));
        try {
            await axios.delete(`/metricas/ecomhub/analises/${id}/`);
            showNotification('success', `✅ Análise deletada!`);
            fetchAnalises();
            
            if (dadosResultado && dadosResultado?.id === id) {
                setDadosResultado(null);
            }
        } catch (error) {
            showNotification('error', `❌ Erro ao deletar: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingDelete(prev => ({ ...prev, [id]: false }));
        }
    };

    // ======================== FUNÇÕES AUXILIARES ========================

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const getEfetividadeCor = (valor) => {
        if (!valor || typeof valor !== 'string') return {};
        
        const numero = parseFloat(valor.replace('%', '').replace('(Média)', ''));
        
        if (numero >= 60) return { backgroundColor: '#2E7D2E', color: 'white', fontWeight: 'bold' };
        if (numero >= 50) return { backgroundColor: '#4CAF50', color: 'white', fontWeight: 'bold' };
        if (numero >= 40) return { backgroundColor: '#FFA726', color: 'black', fontWeight: 'bold' };
        return { backgroundColor: '#F44336', color: 'white', fontWeight: 'bold' };
    };

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    const renderFormulario = () => (
        <Paper shadow="sm" p="md" mb="md" style={{ position: 'relative' }}>
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
                    <Text mt="md" fw={500}>Processando dados via automação...</Text>
                    {progressoAtual && (
                        <>
                            <Progress value={progressoAtual.porcentagem} w="60%" mt="md" />
                            <Text size="sm" c="dimmed" mt="xs">{progressoAtual.etapa}</Text>
                        </>
                    )}
                </div>
            )}

            <Title order={4} mb="md">🤖 Processamento Automático - EcomHub</Title>
            
            <Grid>
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
                    <Select
                        label="País"
                        data={PAISES}
                        value={paisSelecionado}
                        onChange={setPaisSelecionado}
                        disabled={loadingProcessar}
                        leftSection={<IconWorldWww size={16} />}
                    />
                </Grid.Col>
            </Grid>

            <Group justify="space-between" mt="md">
                <Text size="sm" c="dimmed">
                    🔄 Automação via Selenium - Servidor externo
                </Text>
                
                <Button
                    leftSection={loadingProcessar ? <Loader size="xs" /> : <IconSearch size={16} />}
                    onClick={processarDados}
                    disabled={!dataInicio || !dataFim || !paisSelecionado || loadingProcessar}
                    loading={loadingProcessar}
                    size="md"
                >
                    {loadingProcessar ? 'Processando...' : 'Processar Dados'}
                </Button>
            </Group>
        </Paper>
    );

    const renderResultados = () => {
        if (!dadosResultado || !Array.isArray(dadosResultado)) return null;

        return (
            <Paper shadow="sm" p="md" mb="md">
                <Group justify="space-between" mb="md">
                    <Title order={4}>📊 Efetividade por Produto</Title>
                    <Button
                        leftSection={<IconDownload size={16} />}
                        onClick={() => setModalSalvar(true)}
                        variant="light"
                    >
                        Salvar Análise
                    </Button>
                </Group>

                <ScrollArea>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                {Object.keys(dadosResultado[0] || {}).map(col => (
                                    <Table.Th key={col}>{col}</Table.Th>
                                ))}
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {dadosResultado.map((row, idx) => (
                                <Table.Tr
                                    key={idx}
                                    style={{
                                        backgroundColor: row.Produto === 'Total' ? '#f8f9fa' : undefined,
                                        fontWeight: row.Produto === 'Total' ? 'bold' : undefined
                                    }}
                                >
                                    {Object.entries(row).map(([col, value]) => (
                                        <Table.Td
                                            key={col}
                                            style={col === 'Efetividade' ? getEfetividadeCor(value) : {}}
                                        >
                                            {typeof value === 'number' ? value.toLocaleString() : value}
                                        </Table.Td>
                                    ))}
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
                <Title order={4}>💾 Análises Salvas ({analisesSalvas.length})</Title>
                <Button
                    leftSection={<IconRefresh size={16} />}
                    variant="outline"
                    size="sm"
                    onClick={fetchAnalises}
                >
                    Atualizar
                </Button>
            </Group>

            {analisesSalvas.length === 0 ? (
                <Alert color="blue" icon={<IconChartBar size={16} />}>
                    <Text fw={500} mb="xs">Nenhuma análise salva</Text>
                    <Text size="sm" c="dimmed">
                        Processe dados e salve o resultado para vê-lo aqui.
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
                                        {analise.nome.replace('[ECOMHUB] ', '')}
                                    </Text>
                                    <Badge color="blue" variant="light">
                                        🛍️ Produto
                                    </Badge>
                                </Group>

                                <Text size="xs" c="dimmed" mb="md">
                                    📅 {new Date(analise.criado_em).toLocaleDateString('pt-BR')} por {analise.criado_por_nome}
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
    }, []);

    // ======================== RENDER PRINCIPAL ========================

    return (
        <Container fluid p="md">
            {/* Header */}
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2}>🤖 ECOMHUB - Automação Selenium</Title>
                    <Text c="dimmed">Processamento automático de dados via automação web</Text>
                </div>
                <Badge color="green" variant="light" size="lg">
                    Servidor Externo
                </Badge>
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

            {/* Formulário de Processamento */}
            {renderFormulario()}

            {/* Resultados */}
            {renderResultados()}

            {/* Análises Salvas */}
            {renderAnalisesSalvas()}

            {/* Modal para salvar análise */}
            <Modal
                opened={modalSalvar}
                onClose={() => setModalSalvar(false)}
                title="💾 Salvar Análise"
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

                    <Alert color="blue" mb="md" icon={<IconChartBar size={16} />}>
                        <Text fw={500} mb="xs">Salvando resultado do processamento</Text>
                        <Text size="sm">
                            País: {PAISES.find(p => p.value === paisSelecionado)?.label}
                        </Text>
                        <Text size="sm">
                            Período: {dataInicio?.toLocaleDateString()} - {dataFim?.toLocaleDateString()}
                        </Text>
                    </Alert>

                    <TextInput
                        label="Nome da Análise"
                        placeholder="Ex: Espanha Junho 2025"
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
                            {loadingSalvar ? 'Salvando...' : 'Salvar Análise'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}

export default EcomhubPage;