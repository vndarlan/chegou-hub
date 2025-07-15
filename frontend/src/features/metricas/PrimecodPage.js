// frontend/src/features/metricas/PrimecodPage.js - VERSÃO AUTOCONTIDA
import React, { useState, useEffect } from 'react';
import {
    Box,
    Title,
    Text,
    Paper,
    Group,
    Button,
    Table,
    Badge,
    FileInput,
    TextInput,
    Stack,
    Grid,
    Alert,
    LoadingOverlay,
    ActionIcon,
    Modal,
    Card,
    List,
    ThemeIcon
} from '@mantine/core';
import {
    IconUpload,
    IconDownload,
    IconTrash,
    IconRefresh,
    IconFileText,
    IconCheck,
    IconX,
    IconAlertTriangle,
    IconTrendingUp,
    IconUsers,
    IconCopy,
    IconChartBar
} from '@tabler/icons-react';
import axios from 'axios';

function PrimecodPage() {
    // Estados principais
    const [isLoading, setIsLoading] = useState(false);
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [analiseSelecionada, setAnaliseSelecionada] = useState(null);
    
    // Estados para upload
    const [arquivoLeads, setArquivoLeads] = useState(null);
    const [arquivoOrders, setArquivoOrders] = useState(null);
    const [dadosLeads, setDadosLeads] = useState(null);
    const [dadosOrders, setDadosOrders] = useState(null);
    const [dadosEfetividade, setDadosEfetividade] = useState(null);
    
    // Estados para salvar
    const [modalSalvar, setModalSalvar] = useState(false);
    const [nomeAnalise, setNomeAnalise] = useState('');
    
    // Estados de notificação
    const [notification, setNotification] = useState(null);

    // ======================== FUNÇÕES DE API ========================

    // Buscar análises salvas
    const fetchAnalises = async () => {
        try {
            const response = await axios.get('/metricas/primecod/analises/');
            const primecodAnalises = response.data.filter(a => a.tipo === 'PRIMECOD');
            setAnalisesSalvas([...primecodAnalises]);
        } catch (error) {
            console.error('Erro ao buscar análises:', error);
            showNotification('error', 'Erro ao carregar análises salvas');
        }
    };

    // Upload de arquivo
    const uploadArquivo = async (arquivo, tipo) => {
        if (!arquivo) return;
        
        setIsLoading(true);
        const formData = new FormData();
        formData.append('arquivo', arquivo);
        formData.append('tipo_arquivo', tipo);
        
        try {
            const response = await axios.post('/metricas/primecod/analises/upload_csv/', formData);
            
            if (response.data.status === 'success') {
                const dados = response.data.dados_processados;
                const unmapped = response.data.status_nao_mapeados || [];
                
                if (tipo === 'leads') {
                    setDadosLeads(dados);
                    if (unmapped.length > 0) {
                        showNotification('warning', `Status não mapeados encontrados: ${unmapped.join(', ')}`);
                    }
                } else if (tipo === 'orders') {
                    setDadosOrders(dados);
                    if (unmapped.length > 0) {
                        showNotification('warning', `Status de shipping não mapeados: ${unmapped.join(', ')}`);
                    }
                }
                
                // Se ambos os arquivos foram processados, gerar efetividade
                if (dadosLeads && tipo === 'orders') {
                    gerarEfetividade(dadosLeads, dados);
                } else if (dadosOrders && tipo === 'leads') {
                    gerarEfetividade(dados, dadosOrders);
                }
                
                showNotification('success', `Arquivo de ${tipo} processado com sucesso!`);
            }
        } catch (error) {
            showNotification('error', `Erro ao processar arquivo: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Salvar análise
    const salvarAnalise = async () => {
        if (!nomeAnalise || !dadosLeads) {
            showNotification('error', 'Nome da análise e dados de leads são obrigatórios');
            return;
        }
        
        setIsLoading(true);
        try {
            const response = await axios.post('/metricas/primecod/analises/processar_analise/', {
                nome_analise: nomeAnalise,
                tipo: 'PRIMECOD',
                dados_leads: dadosLeads,
                dados_orders: dadosOrders || {}
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
            setIsLoading(false);
        }
    };

    // Carregar análise
    const carregarAnalise = (analise) => {
        setDadosLeads(analise.dados_leads);
        setDadosEfetividade(analise.dados_efetividade);
        setAnaliseSelecionada(analise);
        showNotification('success', `Análise '${analise.nome}' carregada!`);
    };

    // Deletar análise
    const deletarAnalise = async (id, nome) => {
        if (!window.confirm(`Deseja deletar a análise '${nome}'?`)) return;
        
        setIsLoading(true);
        try {
            await axios.delete(`/metricas/primecod/analises/${id}/`);
            showNotification('success', `Análise '${nome}' deletada!`);
            fetchAnalises();
            
            if (analiseSelecionada?.id === id) {
                setAnaliseSelecionada(null);
                setDadosLeads(null);
                setDadosEfetividade(null);
            }
        } catch (error) {
            showNotification('error', `Erro ao deletar análise: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // ======================== FUNÇÕES AUXILIARES ========================

    // Sistema de notificações
    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    // Gerar efetividade combinada
    const gerarEfetividade = (leadsData, ordersData) => {
        const efetividade = [];
        
        leadsData.forEach(leadRow => {
            if (leadRow.Product === 'Total') return;
            
            const product = leadRow.Product;
            const confirmed = leadRow.Confirmed || 0;
            const totalMinusDup = leadRow['Total - duplicados'] || 0;
            
            const orderInfo = ordersData[product] || {};
            const delivered = orderInfo.Delivered || 0;
            
            const efetividadePercent = totalMinusDup > 0 ? (delivered / totalMinusDup * 100) : 0;
            
            efetividade.push({
                Product: product,
                'Confirmed (Leads)': confirmed,
                Delivered: delivered,
                Returned: orderInfo.Returned || 0,
                Refused: orderInfo.Refused || 0,
                Incident: orderInfo.Incident || 0,
                'Order Placed': orderInfo['Order Placed'] || 0,
                'Out of Stock': orderInfo['Out of Stock'] || 0,
                Returning: orderInfo.Returning || 0,
                'Out for Delivery': orderInfo['Out for Delivery'] || 0,
                Shipped: orderInfo.Shipped || 0,
                Canceled: orderInfo.Canceled || 0,
                'Outros Orders': orderInfo.Outros || 0,
                Efetividade: `${efetividadePercent.toFixed(0)}%`
            });
        });
        
        // Adicionar totais
        if (efetividade.length > 0) {
            const totals = { Product: 'Total' };
            const numericCols = [
                'Confirmed (Leads)', 'Delivered', 'Returned', 'Refused', 'Incident',
                'Order Placed', 'Out of Stock', 'Returning', 'Out for Delivery', 
                'Shipped', 'Canceled', 'Outros Orders'
            ];
            
            numericCols.forEach(col => {
                totals[col] = efetividade.reduce((sum, row) => sum + (row[col] || 0), 0);
            });
            
            const totalDelivered = totals.Delivered;
            const totalLeads = leadsData.find(row => row.Product === 'Total')?.[('Total - duplicados')] || 1;
            const efetividadeMedia = (totalDelivered / totalLeads * 100);
            totals.Efetividade = `${efetividadeMedia.toFixed(0)}% (Média)`;
            
            efetividade.push(totals);
        }
        
        setDadosEfetividade(efetividade);
    };

    // Cores para efetividade
    const getEfetividadeCor = (valor) => {
        if (!valor || typeof valor !== 'string') return {};
        
        const numero = parseFloat(valor.replace('%', '').replace('(Média)', ''));
        
        if (numero >= 60) return { backgroundColor: '#2E7D2E', color: 'white', fontWeight: 'bold' };
        if (numero >= 50) return { backgroundColor: '#4CAF50', color: 'white', fontWeight: 'bold' };
        if (numero >= 40) return { backgroundColor: '#FFA726', color: 'black', fontWeight: 'bold' };
        return { backgroundColor: '#F44336', color: 'white', fontWeight: 'bold' };
    };

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    // Cards de estatísticas
    const renderEstatisticas = () => {
        if (!dadosLeads) return null;
        
        const totalRow = dadosLeads.find(row => row.Product === 'Total');
        if (!totalRow) return null;
        
        const total = totalRow['Total - duplicados'] || 0;
        const confirmados = totalRow.Confirmed || 0;
        const duplicados = totalRow.Duplicate || 0;
        const taxaConfirmacao = total > 0 ? (confirmados / total * 100) : 0;
        
        return (
            <Grid gutter="md" mb="xl">
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Total de Leads</Text>
                                <Text size="xl" fw={700}>{total.toLocaleString()}</Text>
                            </div>
                            <ThemeIcon color="blue" variant="light" size="xl">
                                <IconUsers size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Confirmados</Text>
                                <Text size="xl" fw={700} c="green">{confirmados.toLocaleString()}</Text>
                            </div>
                            <ThemeIcon color="green" variant="light" size="xl">
                                <IconCheck size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Duplicados</Text>
                                <Text size="xl" fw={700} c="orange">{duplicados.toLocaleString()}</Text>
                            </div>
                            <ThemeIcon color="orange" variant="light" size="xl">
                                <IconCopy size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text size="sm" c="dimmed">Taxa de Confirmação</Text>
                                <Text size="xl" fw={700} c="blue">{taxaConfirmacao.toFixed(1)}%</Text>
                            </div>
                            <ThemeIcon color="blue" variant="light" size="xl">
                                <IconChartBar size={24} />
                            </ThemeIcon>
                        </Group>
                    </Card>
                </Grid.Col>
            </Grid>
        );
    };

    // Renderizar tabela
    const renderTabela = (dados, titulo, aplicarCores = false) => {
        if (!dados || dados.length === 0) return null;
        
        const colunas = Object.keys(dados[0]);
        
        return (
            <Paper shadow="sm" p="md" mt="md">
                <Title order={4} mb="md">{titulo}</Title>
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
                            {dados.map((row, idx) => (
                                <Table.Tr key={idx} style={{ 
                                    backgroundColor: row.Product === 'Total' ? '#f8f9fa' : undefined,
                                    fontWeight: row.Product === 'Total' ? 'bold' : undefined
                                }}>
                                    {colunas.map(col => (
                                        <Table.Td 
                                            key={col} 
                                            style={aplicarCores && col === 'Efetividade' ? 
                                                getEfetividadeCor(row[col]) : {}}
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
    }, []);

    // ======================== RENDER PRINCIPAL ========================
    return (
        <Box p="md">
            <LoadingOverlay visible={isLoading} />
            
            {/* Header */}
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2}>📊 vndarlan/dashprimecod Prime COD</Title>
                    <Text c="dimmed">Análise de efetividade</Text>
                </div>
                <Group>
                    <Button 
                        leftSection={<IconRefresh size={16} />} 
                        variant="outline" 
                        onClick={fetchAnalises}
                    >
                        Atualizar
                    </Button>
                    {(dadosLeads || dadosEfetividade) && (
                        <Button 
                            leftSection={<IconDownload size={16} />} 
                            onClick={() => setModalSalvar(true)}
                        >
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

            {/* Análises Salvas */}
            {analisesSalvas.length > 0 && (
                <Paper shadow="sm" p="md" mb="xl">
                    <Title order={4} mb="md">💾 Análises Salvas</Title>
                    <Grid>
                        {analisesSalvas.map(analise => (
                            <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={analise.id}>
                                <Card withBorder>
                                    <Group justify="space-between" mb="xs">
                                        <Text fw={500} truncate>{analise.nome}</Text>
                                        <Badge color="blue" variant="light">PRIMECOD</Badge>
                                    </Group>
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

            {/* Upload de Arquivos */}
            <Grid gutter="md" mb="xl">
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper shadow="sm" p="md">
                        <Title order={4} mb="md">1️⃣ Arquivo de Leads</Title>
                        <Stack>
                            <FileInput
                                label="Leads Export CSV"
                                placeholder="Selecione o arquivo leadsexport.csv"
                                accept=".csv"
                                value={arquivoLeads}
                                onChange={setArquivoLeads}
                                leftSection={<IconFileText size={16} />}
                            />
                            <Button 
                                fullWidth 
                                leftSection={<IconUpload size={16} />}
                                onClick={() => uploadArquivo(arquivoLeads, 'leads')}
                                disabled={!arquivoLeads}
                            >
                                Processar Leads
                            </Button>
                            {dadosLeads && (
                                <Alert color="green" icon={<IconCheck size={16} />}>
                                    Arquivo de leads processado! {dadosLeads.length - 1} produtos encontrados.
                                </Alert>
                            )}
                        </Stack>
                    </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Paper shadow="sm" p="md">
                        <Title order={4} mb="md">2️⃣ Arquivo de Orders</Title>
                        <Stack>
                            <FileInput
                                label="Orders Export CSV"
                                placeholder="Selecione o arquivo ordersexport.csv"
                                accept=".csv"
                                value={arquivoOrders}
                                onChange={setArquivoOrders}
                                leftSection={<IconFileText size={16} />}
                            />
                            <Button 
                                fullWidth 
                                leftSection={<IconUpload size={16} />}
                                onClick={() => uploadArquivo(arquivoOrders, 'orders')}
                                disabled={!arquivoOrders}
                            >
                                Processar Orders
                            </Button>
                            {dadosOrders && (
                                <Alert color="green" icon={<IconCheck size={16} />}>
                                    Arquivo de orders processado!
                                </Alert>
                            )}
                        </Stack>
                    </Paper>
                </Grid.Col>
            </Grid>

            {/* Instruções */}
            <Paper shadow="sm" p="md" mb="xl">
                <Title order={4} mb="md">📋 Instruções</Title>
                <List size="sm">
                    <List.Item>Faça upload do arquivo <strong>leadsexport.csv</strong> exportado da seção de leads do Prime COD</List.Item>
                    <List.Item>Faça upload do arquivo <strong>ordersexport.csv</strong> exportado da seção de orders do Prime COD</List.Item>
                    <List.Item>A tabela de efetividade será gerada automaticamente combinando os dois arquivos</List.Item>
                    <List.Item>Salve sua análise para acessá-la posteriormente</List.Item>
                </List>
            </Paper>

            {/* Estatísticas */}
            {renderEstatisticas()}

            {/* Tabelas */}
            {renderTabela(dadosLeads, "📊 Tabela de Leads")}
            {renderTabela(dadosEfetividade, "📦 Tabela de Efetividade", true)}

            {/* Modal para salvar */}
            <Modal 
                opened={modalSalvar} 
                onClose={() => setModalSalvar(false)}
                title="💾 Salvar Análise"
            >
                <Stack>
                    <TextInput
                        label="Nome da Análise"
                        placeholder="Ex: Análise Maio 2025 - Espanha"
                        value={nomeAnalise}
                        onChange={(e) => setNomeAnalise(e.target.value)}
                        required
                    />
                    <Group justify="flex-end">
                        <Button variant="outline" onClick={() => setModalSalvar(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={salvarAnalise} 
                            disabled={!nomeAnalise}
                            loading={isLoading}
                        >
                            Salvar
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}

export default PrimecodPage;