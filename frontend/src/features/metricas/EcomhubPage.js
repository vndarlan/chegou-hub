// frontend/src/features/metricas/EcomhubPage.js - VERSÃO AUTOCONTIDA
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
    RingProgress,
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
    IconTrendingDown,
    IconBuilding,
    IconChartBar
} from '@tabler/icons-react';
import axios from 'axios';

function EcomhubPage() {
    // Estados principais
    const [isLoading, setIsLoading] = useState(false);
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [analiseSelecionada, setAnaliseSelecionada] = useState(null);
    
    // Estados para upload
    const [arquivoEcomhub, setArquivoEcomhub] = useState(null);
    const [dadosEcomhub, setDadosEcomhub] = useState(null);
    
    // Estados para salvar
    const [modalSalvar, setModalSalvar] = useState(false);
    const [nomeAnalise, setNomeAnalise] = useState('');
    
    // Estados de notificação
    const [notification, setNotification] = useState(null);

    // ======================== FUNÇÕES DE API ========================

    // Buscar análises salvas
    const fetchAnalises = async () => {
        try {
            const response = await axios.get('/api/metricas/analises/');
            const ecomhubAnalises = response.data.filter(a => a.tipo === 'ECOMHUB');
            setAnalisesSalvas(ecomhubAnalises);
        } catch (error) {
            console.error('Erro ao buscar análises:', error);
            showNotification('error', 'Erro ao carregar análises salvas');
        }
    };

    // Upload de arquivo
    const uploadArquivo = async () => {
        if (!arquivoEcomhub) return;
        
        setIsLoading(true);
        const formData = new FormData();
        formData.append('arquivo', arquivoEcomhub);
        formData.append('tipo_arquivo', 'ecomhub');
        
        try {
            const response = await axios.post('/api/metricas/analises/upload_csv/', formData);
            
            if (response.data.status === 'success') {
                setDadosEcomhub(response.data.dados_processados);
                showNotification('success', 'Arquivo ECOMHUB processado com sucesso!');
            }
        } catch (error) {
            showNotification('error', `Erro ao processar arquivo: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Salvar análise
    const salvarAnalise = async () => {
        if (!nomeAnalise || !dadosEcomhub) {
            showNotification('error', 'Nome da análise e dados são obrigatórios');
            return;
        }
        
        setIsLoading(true);
        try {
            const response = await axios.post('/api/metricas/analises/processar_analise/', {
                nome_analise: nomeAnalise,
                tipo: 'ECOMHUB',
                dados_ecomhub: dadosEcomhub
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
        setDadosEcomhub(analise.dados_efetividade);
        setAnaliseSelecionada(analise);
        showNotification('success', `Análise '${analise.nome.replace('[ECOMHUB] ', '')}' carregada!`);
    };

    // Deletar análise
    const deletarAnalise = async (id, nome) => {
        const nomeDisplay = nome.replace('[ECOMHUB] ', '');
        if (!window.confirm(`Deseja deletar a análise '${nomeDisplay}'?`)) return;
        
        setIsLoading(true);
        try {
            await axios.delete(`/api/metricas/analises/${id}/`);
            showNotification('success', `Análise '${nomeDisplay}' deletada!`);
            fetchAnalises();
            
            if (analiseSelecionada?.id === id) {
                setAnaliseSelecionada(null);
                setDadosEcomhub(null);
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

    // Cores para efetividade
    const getEfetividadeCor = (valor) => {
        if (!valor || typeof valor !== 'string') return {};
        
        const numero = parseFloat(valor.replace('%', '').replace('(Média)', ''));
        
        if (numero >= 60) return { backgroundColor: '#2E7D2E', color: 'white', fontWeight: 'bold' };
        if (numero >= 50) return { backgroundColor: '#4CAF50', color: 'white', fontWeight: 'bold' };
        if (numero >= 40) return { backgroundColor: '#FFA726', color: 'black', fontWeight: 'bold' };
        return { backgroundColor: '#F44336', color: 'white', fontWeight: 'bold' };
    };

    // Obter top lojas
    const getTopLojas = () => {
        if (!dadosEcomhub) return [];
        
        return dadosEcomhub
            .filter(row => row.Loja !== 'Total')
            .sort((a, b) => {
                const efetA = parseFloat(a.Efetividade?.replace('%', '') || '0');
                const efetB = parseFloat(b.Efetividade?.replace('%', '') || '0');
                return efetB - efetA;
            })
            .slice(0, 5);
    };

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    // Cards de estatísticas
    const renderEstatisticas = () => {
        if (!dadosEcomhub || dadosEcomhub.length === 0) return null;
        
        const totalRow = dadosEcomhub.find(row => row.Loja === 'Total');
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

    // Top Lojas
    const renderTopLojas = () => {
        if (!dadosEcomhub) return null;
        
        const topLojas = getTopLojas();
        if (topLojas.length === 0) return null;
        
        return (
            <Paper shadow="sm" p="md" mb="xl">
                <Title order={4} mb="md">🏆 Top 5 Lojas por Efetividade</Title>
                <Grid>
                    {topLojas.map((loja, idx) => (
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
                                            {loja.Efetividade}
                                        </Text>
                                    </Group>
                                    <Text size="sm" fw={500} truncate>
                                        {loja.Loja}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {loja.delivered || 0} de {loja.Total || 0} entregues
                                    </Text>
                                </Stack>
                            </Card>
                        </Grid.Col>
                    ))}
                </Grid>
            </Paper>
        );
    };

    // Tabela ECOMHUB
    const renderTabelaEcomhub = () => {
        if (!dadosEcomhub || dadosEcomhub.length === 0) return null;
        
        const colunas = Object.keys(dadosEcomhub[0]);
        
        return (
            <Paper shadow="sm" p="md" mt="md">
                <Title order={4} mb="md">🏪 Efetividade por Loja</Title>
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
                                    backgroundColor: row.Loja === 'Total' ? '#f8f9fa' : undefined,
                                    fontWeight: row.Loja === 'Total' ? 'bold' : undefined
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
    }, []);

    // ======================== RENDER PRINCIPAL ========================
    return (
        <Box p="md">
            <LoadingOverlay visible={isLoading} />
            
            {/* Header */}
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2}>🏪 Dashboard ECOMHUB</Title>
                    <Text c="dimmed">Análise de efetividade por loja baseada em dados de importação</Text>
                </div>
                <Group>
                    <Button 
                        leftSection={<IconRefresh size={16} />} 
                        variant="outline" 
                        onClick={fetchAnalises}
                    >
                        Atualizar
                    </Button>
                    {dadosEcomhub && (
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
                    <Title order={4} mb="md">💾 Análises ECOMHUB Salvas</Title>
                    <Grid>
                        {analisesSalvas.map(analise => (
                            <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={analise.id}>
                                <Card withBorder>
                                    <Group justify="space-between" mb="xs">
                                        <Text fw={500} truncate>
                                            {analise.nome.replace('[ECOMHUB] ', '')}
                                        </Text>
                                        <Badge color="orange" variant="light">ECOMHUB</Badge>
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

            {/* Upload de Arquivo */}
            <Grid gutter="md" mb="xl">
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Paper shadow="sm" p="md">
                        <Title order={4} mb="md">📁 Importação de Arquivo ECOMHUB</Title>
                        <Stack>
                            <FileInput
                                label="Arquivo CSV ECOMHUB"
                                placeholder="Selecione o arquivo CSV exportado da ECOMHUB"
                                accept=".csv"
                                value={arquivoEcomhub}
                                onChange={setArquivoEcomhub}
                                leftSection={<IconFileText size={16} />}
                            />
                            <Button 
                                fullWidth 
                                leftSection={<IconUpload size={16} />}
                                onClick={uploadArquivo}
                                disabled={!arquivoEcomhub}
                            >
                                Processar Arquivo ECOMHUB
                            </Button>
                            {dadosEcomhub && (
                                <Alert color="green" icon={<IconCheck size={16} />}>
                                    Arquivo ECOMHUB processado! {dadosEcomhub.length - 1} lojas encontradas.
                                </Alert>
                            )}
                        </Stack>
                    </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper shadow="sm" p="md">
                        <Title order={4} mb="md">📋 Instruções</Title>
                        <List size="sm">
                            <List.Item>Importe o arquivo CSV exportado da ECOMHUB</List.Item>
                            <List.Item>O arquivo deve conter dados de pedidos por loja</List.Item>
                            <List.Item>A efetividade será calculada automaticamente</List.Item>
                            <List.Item>Salve sua análise para acessá-la depois</List.Item>
                        </List>
                    </Paper>
                </Grid.Col>
            </Grid>

            {/* Top Lojas */}
            {renderTopLojas()}

            {/* Estatísticas */}
            {renderEstatisticas()}

            {/* Tabela */}
            {renderTabelaEcomhub()}

            {/* Modal para salvar */}
            <Modal 
                opened={modalSalvar} 
                onClose={() => setModalSalvar(false)}
                title="💾 Salvar Análise ECOMHUB"
            >
                <Stack>
                    <Alert color="blue" mb="md">
                        As análises da ECOMHUB são salvas separadamente das análises Prime COD
                    </Alert>
                    <TextInput
                        label="Nome da Análise"
                        placeholder="Ex: Maio 2025 - Lojas Brasil"
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

export default EcomhubPage;