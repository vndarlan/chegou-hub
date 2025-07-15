// frontend/src/features/metricas/EcomhubPage.js - VERSÃO COMPLETA COM LOADING LOCALIZADO
import React, { useState, useEffect } from 'react';
import {
    Box, Title, Text, Paper, Group, Button, Table, Badge, FileInput, TextInput, Stack, Grid,
    Alert, LoadingOverlay, ActionIcon, Modal, Card, List, RingProgress, ThemeIcon, Select,
    Tabs, Textarea, Switch, NumberInput, Divider, Code, Container, Accordion, SegmentedControl,
    Loader
} from '@mantine/core';
import {
    IconUpload, IconDownload, IconTrash, IconRefresh, IconFileText, IconCheck, IconX, IconAlertTriangle,
    IconTrendingUp, IconTrendingDown, IconBuilding, IconChartBar, IconPlus, IconEdit, IconTestPipe,
    IconCloudOff, IconCloudCheck, IconSettings, IconShoppingBag, IconDatabase, IconBuildingStore
} from '@tabler/icons-react';
import axios from 'axios';

function EcomhubPage() {
    // Estados principais
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [analiseSelecionada, setAnaliseSelecionada] = useState(null);
    
    // Estados Shopify
    const [lojasShopify, setLojasShopify] = useState([]);
    const [lojaSelecionada, setLojaSelecionada] = useState(null);
    const [modalLoja, setModalLoja] = useState(false);
    const [editandoLoja, setEditandoLoja] = useState(null);
    
    // Estados para upload
    const [arquivoEcomhub, setArquivoEcomhub] = useState(null);
    const [dadosEcomhub, setDadosEcomhub] = useState(null);
    const [modoProcessamento, setModoProcessamento] = useState('produto');
    
    // Estados para salvar
    const [modalSalvar, setModalSalvar] = useState(false);
    const [nomeAnalise, setNomeAnalise] = useState('');
    
    // Estados de notificação
    const [notification, setNotification] = useState(null);
    
    // Estados do formulário de loja
    const [formLoja, setFormLoja] = useState({
        nome: '',
        shopify_domain: '',
        access_token: '',
        api_version: '2024-01',
        descricao: '',
        pais: '',
        moeda: ''
    });

    // =============== ESTADOS DE LOADING ESPECÍFICOS ===============
    const [loadingUpload, setLoadingUpload] = useState(false);
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [loadingLoja, setLoadingLoja] = useState(false);
    const [loadingTeste, setLoadingTeste] = useState({});
    const [loadingAnalises, setLoadingAnalises] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState({});

    // ======================== FUNÇÕES DE API - ANÁLISES ========================

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

    const uploadArquivo = async () => {
        if (!arquivoEcomhub) return;
        
        if (modoProcessamento === 'produto' && !lojaSelecionada) {
            showNotification('error', 'Para processamento por produto, selecione uma loja Shopify');
            return;
        }
        
        setLoadingUpload(true);
        const formData = new FormData();
        formData.append('arquivo', arquivoEcomhub);
        formData.append('modo_processamento', modoProcessamento);
        if (lojaSelecionada) {
            formData.append('loja_shopify_id', lojaSelecionada);
        }
        
        try {
            const response = await axios.post('/metricas/ecomhub/analises/upload_csv/', formData);
            
            if (response.data.status === 'success') {
                setDadosEcomhub(response.data.dados_processados);
                showNotification('success', `Arquivo ECOMHUB processado com sucesso! Modo: ${modoProcessamento}`);
                
                if (response.data.produtos_nao_encontrados?.length > 0) {
                    showNotification('warning', 
                        `Alguns produtos não foram encontrados na Shopify (${response.data.produtos_nao_encontrados.length} pedidos)`
                    );
                }
            }
        } catch (error) {
            showNotification('error', `Erro ao processar arquivo: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingUpload(false);
        }
    };

    const salvarAnalise = async () => {
        if (!nomeAnalise || !dadosEcomhub) {
            showNotification('error', 'Nome da análise e dados são obrigatórios');
            return;
        }
        
        setLoadingSalvar(true);
        try {
            const response = await axios.post('/metricas/ecomhub/analises/processar_analise/', {
                nome_analise: nomeAnalise,
                dados_ecomhub: dadosEcomhub,
                tipo_metrica: modoProcessamento,
                loja_shopify_id: lojaSelecionada
            });
            
            if (response.data.status === 'success') {
                showNotification('success', `Análise '${nomeAnalise}' salva com sucesso!`);
                setModalSalvar(false);
                setNomeAnalise('');
                fetchAnalises();
            }
        } catch (error) {
            showNotification('error', `Erro ao salvar análise: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingSalvar(false);
        }
    };

    const carregarAnalise = (analise) => {
        setDadosEcomhub(analise.dados_efetividade);
        setAnaliseSelecionada(analise);
        setModoProcessamento(analise.tipo_metrica || 'produto');
        if (analise.loja_shopify) {
            setLojaSelecionada(analise.loja_shopify);
        }
        showNotification('success', `Análise '${analise.nome.replace('[ECOMHUB] ', '')}' carregada!`);
    };

    const deletarAnalise = async (id, nome) => {
        const nomeDisplay = nome.replace('[ECOMHUB] ', '');
        if (!window.confirm(`Deseja deletar a análise '${nomeDisplay}'?`)) return;
        
        setLoadingDelete(prev => ({ ...prev, [id]: true }));
        try {
            await axios.delete(`/metricas/ecomhub/analises/${id}/`);
            showNotification('success', `Análise '${nomeDisplay}' deletada!`);
            fetchAnalises();
            
            if (analiseSelecionada?.id === id) {
                setAnaliseSelecionada(null);
                setDadosEcomhub(null);
            }
        } catch (error) {
            showNotification('error', `Erro ao deletar análise: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingDelete(prev => ({ ...prev, [id]: false }));
        }
    };

    // ======================== FUNÇÕES DE API - SHOPIFY ========================

    const fetchLojasShopify = async () => {
        try {
            const response = await axios.get('/metricas/ecomhub/lojas-shopify/lojas_ativas/');
            setLojasShopify(response.data);
        } catch (error) {
            console.error('Erro ao buscar lojas Shopify:', error);
            showNotification('error', 'Erro ao carregar lojas Shopify');
        }
    };

    const salvarLoja = async () => {
        if (!formLoja.nome || !formLoja.shopify_domain || !formLoja.access_token) {
            showNotification('error', 'Nome, domínio e access token são obrigatórios');
            return;
        }
        
        setLoadingLoja(true);
        try {
            if (editandoLoja) {
                await axios.put(`/metricas/ecomhub/lojas-shopify/${editandoLoja}/`, formLoja);
                showNotification('success', 'Loja Shopify atualizada com sucesso!');
            } else {
                await axios.post('/metricas/ecomhub/lojas-shopify/', formLoja);
                showNotification('success', 'Loja Shopify cadastrada com sucesso!');
            }
            
            setModalLoja(false);
            resetFormLoja();
            fetchLojasShopify();
        } catch (error) {
            showNotification('error', `Erro ao salvar loja: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingLoja(false);
        }
    };

    const testarConexaoLoja = async (lojaId) => {
        setLoadingTeste(prev => ({ ...prev, [lojaId]: true }));
        try {
            const response = await axios.post(`/metricas/ecomhub/lojas-shopify/${lojaId}/testar_conexao/`);
            
            if (response.data.status === 'success') {
                showNotification('success', `Conexão testada com sucesso! Loja: ${response.data.shop_info.name}`);
                fetchLojasShopify(); // Atualizar status
            }
        } catch (error) {
            showNotification('error', `Erro na conexão: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingTeste(prev => ({ ...prev, [lojaId]: false }));
        }
    };

    const deletarLoja = async (id, nome) => {
        if (!window.confirm(`Deseja deletar a loja '${nome}'?`)) return;
        
        setLoadingDelete(prev => ({ ...prev, [`loja_${id}`]: true }));
        try {
            await axios.delete(`/metricas/ecomhub/lojas-shopify/${id}/`);
            showNotification('success', `Loja '${nome}' deletada!`);
            fetchLojasShopify();
            
            if (lojaSelecionada === id) {
                setLojaSelecionada(null);
            }
        } catch (error) {
            showNotification('error', `Erro ao deletar loja: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingDelete(prev => ({ ...prev, [`loja_${id}`]: false }));
        }
    };

    // ======================== FUNÇÕES AUXILIARES ========================

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const resetFormLoja = () => {
        setFormLoja({
            nome: '',
            shopify_domain: '',
            access_token: '',
            api_version: '2024-01',
            descricao: '',
            pais: '',
            moeda: ''
        });
        setEditandoLoja(null);
    };

    const editarLoja = (loja) => {
        setFormLoja({
            nome: loja.nome,
            shopify_domain: loja.shopify_domain,
            access_token: '', // Não preencher por segurança
            api_version: loja.api_version,
            descricao: loja.descricao || '',
            pais: loja.pais || '',
            moeda: loja.moeda || ''
        });
        setEditandoLoja(loja.id);
        setModalLoja(true);
    };

    const getEfetividadeCor = (valor) => {
        if (!valor || typeof valor !== 'string') return {};
        
        const numero = parseFloat(valor.replace('%', '').replace('(Média)', ''));
        
        if (numero >= 60) return { backgroundColor: '#2E7D2E', color: 'white', fontWeight: 'bold' };
        if (numero >= 50) return { backgroundColor: '#4CAF50', color: 'white', fontWeight: 'bold' };
        if (numero >= 40) return { backgroundColor: '#FFA726', color: 'black', fontWeight: 'bold' };
        return { backgroundColor: '#F44336', color: 'white', fontWeight: 'bold' };
    };

    const getTopItens = () => {
        if (!dadosEcomhub) return [];
        
        const coluna = modoProcessamento === 'produto' ? 'Produto' : 'Loja';
        
        return dadosEcomhub
            .filter(row => row[coluna] !== 'Total')
            .sort((a, b) => {
                const efetA = parseFloat(a.Efetividade?.replace('%', '') || '0');
                const efetB = parseFloat(b.Efetividade?.replace('%', '') || '0');
                return efetB - efetA;
            })
            .slice(0, 5);
    };

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    const renderGerenciamentoLojas = () => (
        <Paper shadow="sm" p="md" mb="xl">
            <Group justify="space-between" mb="md">
                <Title order={4}>🏪 Lojas Shopify Configuradas</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={() => setModalLoja(true)}>
                    Nova Loja
                </Button>
            </Group>
            
            {lojasShopify.length === 0 ? (
                <Alert color="blue" icon={<IconBuildingStore size={16} />}>
                    Nenhuma loja Shopify configurada. Adicione uma loja para processar por produto.
                </Alert>
            ) : (
                <Grid>
                    {lojasShopify.map(loja => (
                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={loja.id}>
                            <Card withBorder style={{ position: 'relative' }}>
                                <LoadingOverlay visible={loadingTeste[loja.id] || loadingDelete[`loja_${loja.id}`]} />
                                
                                <Group justify="space-between" mb="xs">
                                    <Text fw={500} truncate>{loja.nome}</Text>
                                    <Badge 
                                        color={loja.status_conexao === 'conectado' ? 'green' : 
                                              loja.status_conexao === 'erro' ? 'red' : 'gray'} 
                                        variant="light"
                                    >
                                        {loja.status_conexao === 'conectado' ? 'Conectado' :
                                         loja.status_conexao === 'erro' ? 'Erro' : 'Não testado'}
                                    </Badge>
                                </Group>
                                <Text size="xs" c="dimmed" mb="xs">{loja.shopify_domain}</Text>
                                {loja.pais && <Text size="xs" c="dimmed" mb="md">País: {loja.pais}</Text>}
                                
                                <Group justify="space-between">
                                    <Group>
                                        <ActionIcon 
                                            variant="light" 
                                            onClick={() => testarConexaoLoja(loja.id)}
                                            loading={loadingTeste[loja.id]}
                                        >
                                            <IconTestPipe size={16} />
                                        </ActionIcon>
                                        <ActionIcon variant="light" onClick={() => editarLoja(loja)}>
                                            <IconEdit size={16} />
                                        </ActionIcon>
                                    </Group>
                                    <ActionIcon 
                                        color="red" 
                                        variant="light" 
                                        onClick={() => deletarLoja(loja.id, loja.nome)}
                                        loading={loadingDelete[`loja_${loja.id}`]}
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

    const renderEstatisticas = () => {
        if (!dadosEcomhub || dadosEcomhub.length === 0) return null;
        
        const totalRow = dadosEcomhub.find(row => 
            row[modoProcessamento === 'produto' ? 'Produto' : 'Loja'] === 'Total'
        );
        if (!totalRow) return null;
        
        const total = totalRow.Total || 0;
        const delivered = totalRow.delivered || 0;
        const returned = (totalRow.returned || 0) + (totalRow.returning || 0);
        const efetividadeText = totalRow.Efetividade || '0%';
        const efetividadeNum = parseFloat(efetividadeText.replace('%', '').replace('(Média)', ''));
        
        return (
            <Grid gutter="md" mb="xl">
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Total de Registros</Text>
                                <Text size="xl" fw={700}>{total.toLocaleString()}</Text>
                            </div>
                            <ThemeIcon color="blue" variant="light" size="xl">
                                <IconBuilding size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Entregues</Text>
                                <Text size="xl" fw={700} c="green">{delivered.toLocaleString()}</Text>
                            </div>
                            <ThemeIcon color="green" variant="light" size="xl">
                                <IconTrendingUp size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Devoluções</Text>
                                <Text size="xl" fw={700} c="orange">{returned.toLocaleString()}</Text>
                            </div>
                            <ThemeIcon color="orange" variant="light" size="xl">
                                <IconTrendingDown size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Efetividade Média</Text>
                                <Text size="xl" fw={700} c="blue">{efetividadeText}</Text>
                            </div>
                            <RingProgress
                                size={60}
                                thickness={6}
                                sections={[
                                    { 
                                        value: efetividadeNum, 
                                        color: efetividadeNum >= 50 ? 'green' : efetividadeNum >= 30 ? 'orange' : 'red' 
                                    }
                                ]}
                                label={
                                    <Text size="xs" ta="center" c="dimmed">
                                        {efetividadeNum.toFixed(0)}%
                                    </Text>
                                }
                            />
                        </Group>
                    </Card>
                </Grid.Col>
            </Grid>
        );
    };

    const renderTopItens = () => {
        if (!dadosEcomhub) return null;
        
        const topItens = getTopItens();
        if (topItens.length === 0) return null;
        
        const coluna = modoProcessamento === 'produto' ? 'Produto' : 'Loja';
        const titulo = modoProcessamento === 'produto' ? '🏆 Top 5 Produtos por Efetividade' : '🏆 Top 5 Lojas por Efetividade';
        
        return (
            <Paper shadow="sm" p="md" mb="xl">
                <Title order={4} mb="md">{titulo}</Title>
                <Grid>
                    {topItens.map((item, idx) => (
                        <Grid.Col span={{ base: 12, sm: 6, md: 4, lg: 2.4 }} key={idx}>
                            <Card withBorder>
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Badge 
                                            color={idx === 0 ? 'gold' : idx === 1 ? 'gray' : idx === 2 ? 'orange' : 'blue'} 
                                            variant="light"
                                        >
                                            #{idx + 1}
                                        </Badge>
                                        <Text size="lg" fw={700} c="blue">
                                            {item.Efetividade}
                                        </Text>
                                    </Group>
                                    <Text size="sm" fw={500} truncate>
                                        {item[coluna]}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {item.delivered || 0} de {item.Total || 0} entregues
                                    </Text>
                                </Stack>
                            </Card>
                        </Grid.Col>
                    ))}
                </Grid>
            </Paper>
        );
    };

    const renderTabela = () => {
        if (!dadosEcomhub || dadosEcomhub.length === 0) return null;
        
        const colunas = Object.keys(dadosEcomhub[0]);
        const coluna = modoProcessamento === 'produto' ? 'Produto' : 'Loja';
        const titulo = modoProcessamento === 'produto' ? '🛍️ Efetividade por Produto' : '🏪 Efetividade por Loja';
        
        return (
            <Paper shadow="sm" p="md" mt="md">
                <Title order={4} mb="md">{titulo}</Title>
                <Text size="sm" c="dimmed" mb="md">
                    📊 <strong>Cálculo de Efetividade:</strong> (Status 'delivered' ÷ Total registros) × 100
                </Text>
                <Box style={{ overflowX: 'auto' }}>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                {colunas.map(col => (
                                    <Table.Th key={col}>{col}</Table.Th>
                                ))}
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {dadosEcomhub.map((row, idx) => (
                                <Table.Tr key={idx} style={{ 
                                    backgroundColor: row[coluna] === 'Total' ? '#f8f9fa' : undefined,
                                    fontWeight: row[coluna] === 'Total' ? 'bold' : undefined
                                }}>
                                    {colunas.map(col => (
                                        <Table.Td 
                                            key={col} 
                                            style={col === 'Efetividade' ? getEfetividadeCor(row[col]) : {}}
                                        >
                                            {typeof row[col] === 'number' ? row[col].toLocaleString() : row[col]}
                                        </Table.Td>
                                    ))}
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Box>
            </Paper>
        );
    };

    // ======================== EFEITOS ========================
    useEffect(() => {
        fetchAnalises();
        fetchLojasShopify();
    }, []);

    // ======================== RENDER PRINCIPAL ========================
    return (
        <Container fluid p="md">
            {/* Header */}
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2}>🛍️ Dashboard ECOMHUB com Shopify</Title>
                    <Text c="dimmed">Análise de efetividade por produto/loja com integração Shopify</Text>
                </div>
                <Group>
                    <Button leftSection={<IconRefresh size={16} />} variant="outline" onClick={() => {
                        fetchAnalises();
                        fetchLojasShopify();
                    }}>
                        Atualizar
                    </Button>
                    {dadosEcomhub && (
                        <Button leftSection={<IconDownload size={16} />} onClick={() => setModalSalvar(true)}>
                            Salvar Análise
                        </Button>
                    )}
                </Group>
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

            <Tabs defaultValue="upload" mb="xl">
                <Tabs.List>
                    <Tabs.Tab value="upload" leftSection={<IconUpload size={16} />}>
                        Importar Dados
                    </Tabs.Tab>
                    <Tabs.Tab value="lojas" leftSection={<IconBuildingStore size={16} />}>
                        Gerenciar Lojas Shopify
                    </Tabs.Tab>
                    <Tabs.Tab value="analises" leftSection={<IconDatabase size={16} />}>
                        Análises Salvas {loadingAnalises && <Loader size="xs" ml="xs" />}
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="upload">
                    {/* Seleção de Modo */}
                    <Paper shadow="sm" p="md" mb="md">
                        <Title order={4} mb="md">⚙️ Configuração de Processamento</Title>
                        <Stack>
                            <SegmentedControl
                                value={modoProcessamento}
                                onChange={setModoProcessamento}
                                data={[
                                    { label: '🛍️ Por Produto (Shopify)', value: 'produto' },
                                    { label: '🏪 Por Loja (Tradicional)', value: 'loja' }
                                ]}
                                disabled={loadingUpload}
                            />
                            
                            {modoProcessamento === 'produto' && (
                                <Select
                                    label="Loja Shopify"
                                    placeholder="Selecione a loja Shopify para buscar produtos"
                                    data={lojasShopify.map(loja => ({ value: loja.id.toString(), label: loja.nome }))}
                                    value={lojaSelecionada?.toString()}
                                    onChange={(value) => setLojaSelecionada(value ? parseInt(value) : null)}
                                    required
                                    leftSection={<IconBuildingStore size={16} />}
                                    disabled={loadingUpload}
                                />
                            )}
                        </Stack>
                    </Paper>

                    {/* Upload de Arquivo */}
                    <Grid gutter="md" mb="xl">
                        <Grid.Col span={{ base: 12, md: 8 }}>
                            <Paper shadow="sm" p="md" style={{ position: 'relative' }}>
                                <LoadingOverlay visible={loadingUpload} />
                                
                                <Title order={4} mb="md">📁 Importação de Arquivo ECOMHUB</Title>
                                <Stack>
                                    <FileInput
                                        label="Arquivo CSV ECOMHUB"
                                        placeholder="Selecione o arquivo CSV exportado da ECOMHUB"
                                        accept=".csv"
                                        value={arquivoEcomhub}
                                        onChange={setArquivoEcomhub}
                                        leftSection={<IconFileText size={16} />}
                                        disabled={loadingUpload}
                                    />
                                    <Button 
                                        fullWidth 
                                        leftSection={loadingUpload ? <Loader size="xs" /> : <IconUpload size={16} />}
                                        onClick={uploadArquivo}
                                        disabled={!arquivoEcomhub || (modoProcessamento === 'produto' && !lojaSelecionada)}
                                        loading={loadingUpload}
                                    >
                                        {loadingUpload ? 'Processando arquivo...' : 'Processar Arquivo ECOMHUB'}
                                    </Button>
                                    {dadosEcomhub && !loadingUpload && (
                                        <Alert color="green" icon={<IconCheck size={16} />}>
                                            Arquivo ECOMHUB processado! {dadosEcomhub.length - 1} {modoProcessamento === 'produto' ? 'produtos' : 'lojas'} encontrados.
                                        </Alert>
                                    )}
                                </Stack>
                            </Paper>
                        </Grid.Col>
                        
                        <Grid.Col span={{ base: 12, md: 4 }}>
                            <Paper shadow="sm" p="md">
                                <Title order={4} mb="md">📋 Instruções</Title>
                                <List size="sm">
                                    <List.Item>Escolha o modo de processamento (produto ou loja)</List.Item>
                                    <List.Item>Para modo produto, configure uma loja Shopify</List.Item>
                                    <List.Item>Importe o arquivo CSV da ECOMHUB</List.Item>
                                    <List.Item>A efetividade será calculada automaticamente</List.Item>
                                    <List.Item>Salve sua análise para acessá-la depois</List.Item>
                                </List>
                            </Paper>
                        </Grid.Col>
                    </Grid>

                    {/* Resultados */}
                    {renderTopItens()}
                    {renderEstatisticas()}
                    {renderTabela()}
                </Tabs.Panel>

                <Tabs.Panel value="lojas">
                    {renderGerenciamentoLojas()}
                </Tabs.Panel>

                <Tabs.Panel value="analises">
                    {/* Análises Salvas */}
                    {analisesSalvas.length > 0 && (
                        <Paper shadow="sm" p="md" style={{ position: 'relative' }}>
                            <LoadingOverlay visible={loadingAnalises} />
                            
                            <Title order={4} mb="md">💾 Análises ECOMHUB Salvas</Title>
                            <Grid>
                                {analisesSalvas.map(analise => (
                                    <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={analise.id}>
                                        <Card withBorder style={{ position: 'relative' }}>
                                            <LoadingOverlay visible={loadingDelete[analise.id]} />
                                            
                                            <Group justify="space-between" mb="xs">
                                                <Text fw={500} truncate>
                                                    {analise.nome.replace('[ECOMHUB] ', '')}
                                                </Text>
                                                <Badge 
                                                    color={analise.tipo_metrica === 'produto' ? 'blue' : 'orange'} 
                                                    variant="light"
                                                >
                                                    {analise.tipo_metrica === 'produto' ? 'Produto' : 'Loja'}
                                                </Badge>
                                            </Group>
                                            {analise.loja_shopify_nome && (
                                                <Text size="xs" c="blue" mb="xs">
                                                    🏪 {analise.loja_shopify_nome}
                                                </Text>
                                            )}
                                            <Text size="xs" c="dimmed" mb="md">
                                                {new Date(analise.criado_em).toLocaleDateString('pt-BR')} por {analise.criado_por_nome}
                                            </Text>
                                            <Group justify="space-between">
                                                <Button size="xs" variant="light" onClick={() => carregarAnalise(analise)}>
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
                        </Paper>
                    )}
                </Tabs.Panel>
            </Tabs>

            {/* Modal para cadastrar/editar loja */}
            <Modal 
                opened={modalLoja} 
                onClose={() => {
                    setModalLoja(false);
                    resetFormLoja();
                }}
                title={editandoLoja ? "✏️ Editar Loja Shopify" : "➕ Nova Loja Shopify"}
                size="lg"
            >
                <Stack style={{ position: 'relative' }}>
                    <LoadingOverlay visible={loadingLoja} />
                    
                    <Grid>
                        <Grid.Col span={6}>
                            <TextInput
                                label="Nome da Loja"
                                placeholder="Ex: Chile, Brasil, Argentina"
                                value={formLoja.nome}
                                onChange={(e) => setFormLoja({...formLoja, nome: e.target.value})}
                                required
                                disabled={loadingLoja}
                            />
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <TextInput
                                label="Domínio Shopify"
                                placeholder="minhaloja.myshopify.com"
                                value={formLoja.shopify_domain}
                                onChange={(e) => setFormLoja({...formLoja, shopify_domain: e.target.value})}
                                required
                                disabled={loadingLoja}
                            />
                        </Grid.Col>
                    </Grid>
                    
                    <TextInput
                        label="Access Token"
                        placeholder="Access Token privado da API Shopify"
                        value={formLoja.access_token}
                        onChange={(e) => setFormLoja({...formLoja, access_token: e.target.value})}
                        required={!editandoLoja}
                        description={editandoLoja ? "Deixe em branco para manter o token atual" : "Obtenha no painel admin da Shopify"}
                        disabled={loadingLoja}
                    />
                    
                    <Grid>
                        <Grid.Col span={4}>
                            <TextInput
                                label="Versão da API"
                                value={formLoja.api_version}
                                onChange={(e) => setFormLoja({...formLoja, api_version: e.target.value})}
                                disabled={loadingLoja}
                            />
                        </Grid.Col>
                        <Grid.Col span={4}>
                            <TextInput
                                label="País"
                                placeholder="Ex: Brasil"
                                value={formLoja.pais}
                                onChange={(e) => setFormLoja({...formLoja, pais: e.target.value})}
                                disabled={loadingLoja}
                            />
                        </Grid.Col>
                        <Grid.Col span={4}>
                            <TextInput
                                label="Moeda"
                                placeholder="Ex: BRL"
                                value={formLoja.moeda}
                                onChange={(e) => setFormLoja({...formLoja, moeda: e.target.value})}
                                disabled={loadingLoja}
                            />
                        </Grid.Col>
                    </Grid>
                    
                    <Textarea
                        label="Descrição"
                        placeholder="Descrição opcional da loja"
                        value={formLoja.descricao}
                        onChange={(e) => setFormLoja({...formLoja, descricao: e.target.value})}
                        rows={3}
                        disabled={loadingLoja}
                    />
                    
                    <Group justify="flex-end">
                        <Button variant="outline" onClick={() => {
                            setModalLoja(false);
                            resetFormLoja();
                        }} disabled={loadingLoja}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={salvarLoja} 
                            loading={loadingLoja}
                            leftSection={loadingLoja ? <Loader size="xs" /> : null}
                        >
                            {loadingLoja ? 'Salvando...' : editandoLoja ? 'Atualizar' : 'Cadastrar'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal para salvar análise */}
            <Modal 
                opened={modalSalvar} 
                onClose={() => setModalSalvar(false)}
                title="💾 Salvar Análise ECOMHUB"
            >
                <Stack style={{ position: 'relative' }}>
                    <LoadingOverlay visible={loadingSalvar} />
                    
                    <Alert color="blue" mb="md">
                        Salvando análise em modo: <strong>{modoProcessamento === 'produto' ? 'Por Produto' : 'Por Loja'}</strong>
                        {lojaSelecionada && (
                            <>
                            <br />
                            <span>Loja Shopify: <strong>{lojasShopify.find(l => l.id === parseInt(lojaSelecionada))?.nome}</strong></span>
                        </>
                        )}
                    </Alert>
                    <TextInput
                        label="Nome da Análise"
                        placeholder="Ex: Maio 2025 - Produtos Chile"
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
                            leftSection={loadingSalvar ? <Loader size="xs" /> : null}
                        >
                            {loadingSalvar ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}

export default EcomhubPage;