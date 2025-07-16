// frontend/src/features/metricas/EcomhubAsyncPage.js - VERSÃO COMPLETA FINAL
import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Title, Text, Paper, Group, Button, Table, Badge, FileInput, TextInput, Stack, Grid,
    Alert, ActionIcon, Modal, Card, List, RingProgress, ThemeIcon, Select, Tabs, Textarea,
    Progress, Timeline, Container, Code, Accordion, Divider, Loader, Switch, NumberInput,
    Notification, ScrollArea, Spotlight, Tooltip, Center, Space, Skeleton
} from '@mantine/core';
import {
    IconUpload, IconDownload, IconTrash, IconRefresh, IconFileText, IconCheck, IconX, IconAlertTriangle,
    IconTrendingUp, IconTrendingDown, IconBuilding, IconChartBar, IconPlus, IconEdit, IconTestPipe,
    IconCloudOff, IconCloudCheck, IconSettings, IconShoppingBag, IconDatabase, IconBuildingStore,
    IconPlayerPlay, IconPlayerPause, IconPlayerStop, IconClock, IconActivity, IconCheckbox,
    IconEye, IconHistory, IconChartLine, IconReload, IconBrandShopee, IconClockHour4,
    IconProgressCheck, IconAlertCircle, IconInfoCircle, IconExternalLink, IconCopy
} from '@tabler/icons-react';
import axios from 'axios';

function EcomhubAsyncPage() {
    // Estados principais
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [jobsAtivos, setJobsAtivos] = useState([]);
    const [jobSelecionado, setJobSelecionado] = useState(null);
    const [dadosResultado, setDadosResultado] = useState(null);
    
    // Estados Shopify
    const [lojasShopify, setLojasShopify] = useState([]);
    const [lojaSelecionada, setLojaSelecionada] = useState(null);
    
    // Estados para upload
    const [arquivoEcomhub, setArquivoEcomhub] = useState(null);
    const [modoProcessamento, setModoProcessamento] = useState('produto');
    const [nomeJob, setNomeJob] = useState('');
    
    // Estados de modais
    const [modalSalvar, setModalSalvar] = useState(false);
    const [modalLoja, setModalLoja] = useState(false);
    const [modalDetalhes, setModalDetalhes] = useState(false);
    const [editandoLoja, setEditandoLoja] = useState(null);
    const [nomeAnalise, setNomeAnalise] = useState('');
    
    // Estados de loading específicos
    const [loadingUpload, setLoadingUpload] = useState(false);
    const [loadingLoja, setLoadingLoja] = useState(false);
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [loadingAnalises, setLoadingAnalises] = useState(false);
    const [loadingTeste, setLoadingTeste] = useState({});
    const [loadingDelete, setLoadingDelete] = useState({});
    
    // Estados de notificação
    const [notification, setNotification] = useState(null);
    
    // Estados para SSE (Server-Sent Events)
    const eventSourceRef = useRef(null);
    const [progressData, setProgressData] = useState({});
    
    // Auto-update para jobs ativos
    const intervalRef = useRef(null);
    
    // Estado do formulário de loja
    const [formLoja, setFormLoja] = useState({
        nome: '',
        shopify_domain: '',
        access_token: '',
        api_version: '2024-01',
        descricao: '',
        pais: '',
        moeda: ''
    });

    // ======================== FUNÇÕES SSE ========================
    
    const conectarSSE = (jobId) => {
        // Fechar conexão anterior se existir
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        
        try {
            const eventSource = new EventSource(`/api/metricas/ecomhub/jobs/${jobId}/progress/`);
            eventSourceRef.current = eventSource;
            
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.error) {
                        showNotification('error', `Erro no progresso: ${data.error}`);
                        return;
                    }
                    
                    // Atualizar dados de progresso
                    setProgressData(prev => ({
                        ...prev,
                        [jobId]: data
                    }));
                    
                    // Se finalizou, desconectar e atualizar listas
                    if (data.finalizado) {
                        eventSource.close();
                        eventSourceRef.current = null;
                        
                        // Atualizar dados se concluído com sucesso
                        if (data.status === 'completed' && data.dados_resultado) {
                            setDadosResultado(data.dados_resultado);
                            setJobSelecionado(data);
                        }
                        
                        // Atualizar listas
                        setTimeout(() => {
                            fetchJobsAtivos();
                        }, 1000);
                        
                        // Notificação final
                        if (data.status === 'completed') {
                            showNotification('success', '✅ Processamento concluído com sucesso!');
                        } else if (data.status === 'failed') {
                            showNotification('error', `❌ Processamento falhou: ${data.erro_detalhes}`);
                        } else if (data.status === 'cancelled') {
                            showNotification('warning', '⚠️ Processamento cancelado');
                        }
                    }
                    
                } catch (e) {
                    console.error('Erro ao processar evento SSE:', e);
                }
            };
            
            eventSource.onerror = (error) => {
                console.error('Erro no SSE:', error);
                eventSource.close();
                eventSourceRef.current = null;
            };
            
        } catch (e) {
            console.error('Erro ao conectar SSE:', e);
        }
    };

    // ======================== FUNÇÕES DE API - ANÁLISES ========================

    const fetchAnalises = async () => {
        setLoadingAnalises(true);
        try {
            const response = await axios.get('/api/metricas/ecomhub/analises/');
            setAnalisesSalvas(response.data);
        } catch (error) {
            console.error('Erro ao buscar análises:', error);
            showNotification('error', 'Erro ao carregar análises salvas');
        } finally {
            setLoadingAnalises(false);
        }
    };

    const fetchJobsAtivos = async () => {
        try {
            const response = await axios.get('/api/metricas/ecomhub/jobs/ativos/');
            setJobsAtivos(response.data);
        } catch (error) {
            console.error('Erro ao buscar jobs ativos:', error);
        }
    };

    const fetchLojasShopify = async () => {
        try {
            const response = await axios.get('/api/metricas/ecomhub/lojas-shopify/lojas_ativas/');
            setLojasShopify(response.data);
        } catch (error) {
            console.error('Erro ao buscar lojas Shopify:', error);
            showNotification('error', 'Erro ao carregar lojas Shopify');
        }
    };

    const iniciarProcessamentoAsync = async () => {
        if (!arquivoEcomhub) {
            showNotification('error', 'Selecione um arquivo CSV');
            return;
        }
        
        if (modoProcessamento === 'produto' && !lojaSelecionada) {
            showNotification('error', 'Para processamento por produto, selecione uma loja Shopify');
            return;
        }
        
        setLoadingUpload(true);
        const formData = new FormData();
        formData.append('arquivo', arquivoEcomhub);
        formData.append('modo_processamento', modoProcessamento);
        formData.append('nome_job', nomeJob || `Processamento ${new Date().toLocaleString()}`);
        
        if (lojaSelecionada) {
            formData.append('loja_shopify_id', lojaSelecionada);
        }
        
        try {
            const response = await axios.post('/api/metricas/ecomhub/analises/upload_csv_async/', formData);
            
            if (response.data.status === 'success') {
                const jobId = response.data.job_id;
                
                showNotification('success', `🚀 Processamento iniciado! Job ID: ${jobId}`);
                
                // Conectar SSE para acompanhar progresso
                conectarSSE(jobId);
                
                // Limpar formulário
                setArquivoEcomhub(null);
                setNomeJob('');
                
                // Atualizar jobs ativos
                fetchJobsAtivos();
            }
        } catch (error) {
            showNotification('error', `❌ Erro ao iniciar processamento: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoadingUpload(false);
        }
    };

    const cancelarJob = async (jobId) => {
        if (!window.confirm('Tem certeza que deseja cancelar este processamento?')) return;
        
        try {
            await axios.post(`/api/metricas/ecomhub/jobs/${jobId}/cancelar/`);
            showNotification('success', '✅ Job cancelado com sucesso');
            fetchJobsAtivos();
            
            // Fechar SSE se for o job atual
            if (eventSourceRef.current && progressData[jobId]) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        } catch (error) {
            showNotification('error', `❌ Erro ao cancelar job: ${error.response?.data?.error || error.message}`);
        }
    };

    const buscarResultadoJob = async (jobId) => {
        try {
            const response = await axios.get(`/api/metricas/ecomhub/jobs/${jobId}/`);
            
            if (response.data.dados_resultado) {
                setDadosResultado(response.data.dados_resultado);
                setJobSelecionado(response.data);
                showNotification('success', '✅ Dados carregados com sucesso!');
            } else {
                showNotification('warning', '⚠️ Job ainda não possui resultados');
            }
        } catch (error) {
            showNotification('error', `❌ Erro ao buscar resultado: ${error.response?.data?.error || error.message}`);
        }
    };

    const salvarAnaliseDeJob = async () => {
        if (!jobSelecionado || !nomeAnalise) {
            showNotification('error', 'Selecione um job e digite o nome da análise');
            return;
        }
        
        setLoadingSalvar(true);
        try {
            const response = await axios.post('/api/metricas/ecomhub/analises/salvar_de_job/', {
                job_id: jobSelecionado.job_id,
                nome_analise: nomeAnalise
            });
            
            if (response.data.status === 'success') {
                showNotification('success', `✅ Análise '${nomeAnalise}' salva com sucesso!`);
                setModalSalvar(false);
                setNomeAnalise('');
                fetchAnalises();
            }
        } catch (error) {
            showNotification('error', `❌ Erro ao salvar análise: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoadingSalvar(false);
        }
    };

    // ======================== FUNÇÕES SHOPIFY ========================

    const salvarLoja = async () => {
        if (!formLoja.nome || !formLoja.shopify_domain || !formLoja.access_token) {
            showNotification('error', 'Nome, domínio e access token são obrigatórios');
            return;
        }
        
        setLoadingLoja(true);
        try {
            if (editandoLoja) {
                await axios.put(`/api/metricas/ecomhub/lojas-shopify/${editandoLoja}/`, formLoja);
                showNotification('success', '✅ Loja Shopify atualizada com sucesso!');
            } else {
                await axios.post('/api/metricas/ecomhub/lojas-shopify/', formLoja);
                showNotification('success', '✅ Loja Shopify cadastrada com sucesso!');
            }
            
            setModalLoja(false);
            resetFormLoja();
            fetchLojasShopify();
        } catch (error) {
            showNotification('error', `❌ Erro ao salvar loja: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingLoja(false);
        }
    };

    const testarConexaoLoja = async (lojaId) => {
        setLoadingTeste(prev => ({ ...prev, [lojaId]: true }));
        try {
            const response = await axios.post(`/api/metricas/ecomhub/lojas-shopify/${lojaId}/testar_conexao/`);
            
            if (response.data.status === 'success') {
                showNotification('success', `✅ Conexão testada com sucesso! Loja: ${response.data.shop_info.name}`);
                fetchLojasShopify(); // Atualizar status
            }
        } catch (error) {
            showNotification('error', `❌ Erro na conexão: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingTeste(prev => ({ ...prev, [lojaId]: false }));
        }
    };

    const deletarLoja = async (id, nome) => {
        if (!window.confirm(`Deseja deletar a loja '${nome}'?`)) return;
        
        setLoadingDelete(prev => ({ ...prev, [`loja_${id}`]: true }));
        try {
            await axios.delete(`/api/metricas/ecomhub/lojas-shopify/${id}/`);
            showNotification('success', `✅ Loja '${nome}' deletada!`);
            fetchLojasShopify();
            
            if (lojaSelecionada === id) {
                setLojaSelecionada(null);
            }
        } catch (error) {
            showNotification('error', `❌ Erro ao deletar loja: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingDelete(prev => ({ ...prev, [`loja_${id}`]: false }));
        }
    };

    const deletarAnalise = async (id, nome) => {
        const nomeDisplay = nome.replace('[ECOMHUB] ', '');
        if (!window.confirm(`Deseja deletar a análise '${nomeDisplay}'?`)) return;
        
        setLoadingDelete(prev => ({ ...prev, [id]: true }));
        try {
            await axios.delete(`/api/metricas/ecomhub/analises/${id}/`);
            showNotification('success', `✅ Análise '${nomeDisplay}' deletada!`);
            fetchAnalises();
            
            if (jobSelecionado?.analise_id === id) {
                setJobSelecionado(null);
                setDadosResultado(null);
            }
        } catch (error) {
            showNotification('error', `❌ Erro ao deletar análise: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingDelete(prev => ({ ...prev, [id]: false }));
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'green';
            case 'processing': return 'blue';
            case 'pending': return 'yellow';
            case 'failed': return 'red';
            case 'cancelled': return 'gray';
            default: return 'gray';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <IconCheck size={16} />;
            case 'processing': return <IconActivity size={16} />;
            case 'pending': return <IconClock size={16} />;
            case 'failed': return <IconX size={16} />;
            case 'cancelled': return <IconPlayerStop size={16} />;
            default: return <IconClock size={16} />;
        }
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

    const renderProgressCard = (job) => {
        const progress = progressData[job.job_id] || job;
        const porcentagem = progress.progresso_porcentagem || 0;
        
        return (
            <Card key={job.job_id} withBorder mb="md" style={{ position: 'relative' }}>
                <Group justify="space-between" mb="xs">
                    <Text fw={500} truncate style={{ maxWidth: '60%' }}>{job.nome}</Text>
                    <Badge 
                        color={getStatusColor(progress.status)} 
                        leftSection={getStatusIcon(progress.status)}
                        variant="light"
                    >
                        {progress.status === 'pending' ? 'Pendente' :
                         progress.status === 'processing' ? 'Processando' :
                         progress.status === 'completed' ? 'Concluído' :
                         progress.status === 'failed' ? 'Falhou' :
                         progress.status === 'cancelled' ? 'Cancelado' : progress.status}
                    </Badge>
                </Group>
                
                {progress.status === 'processing' && (
                    <Progress 
                        value={porcentagem} 
                        mb="xs" 
                        size="lg"
                        color={getStatusColor(progress.status)}
                        animated
                    />
                )}
                
                <Text size="sm" c="dimmed" mb="xs" style={{ minHeight: '20px' }}>
                    {progress.mensagem_atual || 'Aguardando início...'}
                </Text>
                
                <Group justify="space-between" align="center" mb="xs">
                    <Text size="xs" c="dimmed">
                        {progress.progresso_atual || 0} / {progress.progresso_total || 0} ({porcentagem.toFixed(1)}%)
                    </Text>
                    <Badge variant="outline" size="sm">
                        {job.tipo_metrica === 'produto' ? '🛍️ Produto' : '🏪 Loja'}
                    </Badge>
                </Group>
                
                <Group justify="space-between" align="center">
                    <Group gap="xs">
                        {progress.status === 'completed' && (
                            <Button 
                                size="xs" 
                                variant="light" 
                                color="green"
                                onClick={() => buscarResultadoJob(job.job_id)}
                                leftSection={<IconEye size={14} />}
                            >
                                Ver Resultado
                            </Button>
                        )}
                        {progress.status === 'processing' && (
                            <Button 
                                size="xs" 
                                variant="light"
                                color="red"
                                onClick={() => cancelarJob(job.job_id)}
                                leftSection={<IconPlayerStop size={14} />}
                            >
                                Cancelar
                            </Button>
                        )}
                        {(progress.status === 'failed' || progress.status === 'cancelled') && (
                            <Button 
                                size="xs" 
                                variant="outline"
                                onClick={() => {
                                    setJobSelecionado(progress);
                                    setModalDetalhes(true);
                                }}
                                leftSection={<IconInfoCircle size={14} />}
                            >
                                Detalhes
                            </Button>
                        )}
                    </Group>
                    
                    {progress.duracao && (
                        <Text size="xs" c="dimmed">
                            ⏱️ {progress.duracao}
                        </Text>
                    )}
                </Group>
                
                {/* Estatísticas extras para jobs concluídos */}
                {progress.status === 'completed' && progress.cache_hits !== undefined && (
                    <Group justify="space-between" mt="xs" pt="xs" style={{ borderTop: '1px solid #eee' }}>
                        <Text size="xs" c="blue">Cache: {progress.cache_hits}</Text>
                        <Text size="xs" c="orange">API: {progress.api_calls}</Text>
                    </Group>
                )}
            </Card>
        );
    };

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
                                {(loadingTeste[loja.id] || loadingDelete[`loja_${loja.id}`]) && (
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
                                    <Text fw={500} truncate>{loja.nome}</Text>
                                    <Badge 
                                        color={loja.status_conexao === 'conectado' ? 'green' : 
                                              loja.status_conexao === 'erro' ? 'red' : 'gray'} 
                                        variant="light"
                                    >
                                        {loja.status_conexao === 'conectado' ? '✅ Conectado' :
                                         loja.status_conexao === 'erro' ? '❌ Erro' : '⚠️ Não testado'}
                                    </Badge>
                                </Group>
                                <Text size="xs" c="dimmed" mb="xs">{loja.shopify_domain}</Text>
                                {loja.pais && <Text size="xs" c="dimmed" mb="md">📍 {loja.pais}</Text>}
                                
                                <Group justify="space-between">
                                    <Group>
                                        <Tooltip label="Testar conexão">
                                            <ActionIcon 
                                                variant="light" 
                                                color="blue"
                                                onClick={() => testarConexaoLoja(loja.id)}
                                                loading={loadingTeste[loja.id]}
                                            >
                                                <IconTestPipe size={16} />
                                            </ActionIcon>
                                        </Tooltip>
                                        <Tooltip label="Editar loja">
                                            <ActionIcon variant="light" onClick={() => editarLoja(loja)}>
                                                <IconEdit size={16} />
                                            </ActionIcon>
                                        </Tooltip>
                                    </Group>
                                    <Tooltip label="Deletar loja">
                                        <ActionIcon 
                                            color="red" 
                                            variant="light" 
                                            onClick={() => deletarLoja(loja.id, loja.nome)}
                                            loading={loadingDelete[`loja_${loja.id}`]}
                                        >
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            </Card>
                        </Grid.Col>
                    ))}
                </Grid>
            )}
        </Paper>
    );

    const renderResultados = () => {
        if (!dadosResultado) return null;
        
        const coluna = jobSelecionado?.tipo_metrica === 'produto' ? 'Produto' : 'Loja';
        const titulo = jobSelecionado?.tipo_metrica === 'produto' ? '🛍️ Efetividade por Produto' : '🏪 Efetividade por Loja';
        
        return (
            <Paper shadow="sm" p="md" mt="md">
                <Group justify="space-between" mb="md">
                    <Title order={4}>{titulo}</Title>
                    {jobSelecionado?.status === 'completed' && (
                        <Button 
                            leftSection={<IconDownload size={16} />} 
                            onClick={() => setModalSalvar(true)}
                        >
                            Salvar Análise
                        </Button>
                    )}
                </Group>
                
                {/* Estatísticas do Job */}
                {jobSelecionado?.estatisticas && (
                    <Grid mb="md">
                        <Grid.Col span={3}>
                            <Card withBorder>
                                <Group>
                                    <ThemeIcon color="blue" variant="light" size="lg">
                                        <IconBuilding size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" c="dimmed">Total Registros</Text>
                                        <Text size="xl" fw={700}>{jobSelecionado.estatisticas.total_registros?.toLocaleString()}</Text>
                                    </div>
                                </Group>
                            </Card>
                        </Grid.Col>
                        <Grid.Col span={3}>
                            <Card withBorder>
                                <Group>
                                    <ThemeIcon color="green" variant="light" size="lg">
                                        <IconDatabase size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" c="dimmed">Cache Hits</Text>
                                        <Text size="xl" fw={700} c="green">{jobSelecionado.cache_hits || 0}</Text>
                                    </div>
                                </Group>
                            </Card>
                        </Grid.Col>
                        <Grid.Col span={3}>
                            <Card withBorder>
                                <Group>
                                    <ThemeIcon color="orange" variant="light" size="lg">
                                        <IconCloudCheck size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" c="dimmed">API Calls</Text>
                                        <Text size="xl" fw={700} c="orange">{jobSelecionado.api_calls || 0}</Text>
                                    </div>
                                </Group>
                            </Card>
                        </Grid.Col>
                        <Grid.Col span={3}>
                            <Card withBorder>
                                <Group>
                                    <ThemeIcon color="teal" variant="light" size="lg">
                                        <IconChartLine size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" c="dimmed">Efetividade</Text>
                                        <Text size="xl" fw={700} c="teal">{jobSelecionado.estatisticas.efetividade_media}</Text>
                                    </div>
                                </Group>
                            </Card>
                        </Grid.Col>
                    </Grid>
                )}
                
                {/* Tabela de Resultados */}
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
                                        backgroundColor: row[coluna] === 'Total' ? '#f8f9fa' : undefined,
                                        fontWeight: row[coluna] === 'Total' ? 'bold' : undefined
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

    // ======================== EFEITOS ========================
    
    useEffect(() => {
        fetchAnalises();
        fetchLojasShopify();
        fetchJobsAtivos();
        
        // Auto-update para jobs ativos
        intervalRef.current = setInterval(() => {
            fetchJobsAtivos();
        }, 10000); // 10 segundos
        
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    // ======================== RENDER PRINCIPAL ========================
    
    return (
        <Container fluid p="md">
            {/* Header */}
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2}>🚀 ECOMHUB - Processamento Assíncrono</Title>
                    <Text c="dimmed">Análise de efetividade sem limite de dados com progresso em tempo real</Text>
                </div>
                <Group>
                    <Button 
                        leftSection={<IconRefresh size={16} />} 
                        variant="outline" 
                        onClick={() => {
                            fetchAnalises();
                            fetchLojasShopify();
                            fetchJobsAtivos();
                        }}
                    >
                        Atualizar Tudo
                    </Button>
                    {jobsAtivos.length > 0 && (
                        <Badge color="blue" variant="light" size="lg">
                            {jobsAtivos.length} jobs ativos
                        </Badge>
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
                        Novo Processamento
                    </Tabs.Tab>
                    <Tabs.Tab value="jobs" leftSection={<IconActivity size={16} />}>
                        Jobs em Andamento {jobsAtivos.length > 0 && `(${jobsAtivos.length})`}
                    </Tabs.Tab>
                    <Tabs.Tab value="lojas" leftSection={<IconBuildingStore size={16} />}>
                        Gerenciar Lojas Shopify ({lojasShopify.length})
                    </Tabs.Tab>
                    <Tabs.Tab value="analises" leftSection={<IconDatabase size={16} />}>
                        Análises Salvas {loadingAnalises ? <Loader size="xs" ml="xs" /> : `(${analisesSalvas.length})`}
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="upload">
                    <Grid gutter="md">
                        <Grid.Col span={{ base: 12, md: 8 }}>
                            <Paper shadow="sm" p="md" style={{ position: 'relative' }}>
                                {loadingUpload && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 10
                                    }}>
                                        <Loader size="lg" />
                                        <Text mt="md" fw={500}>Iniciando processamento...</Text>
                                    </div>
                                )}
                                
                                <Title order={4} mb="md">📁 Iniciar Processamento Assíncrono</Title>
                                <Stack>
                                    <TextInput
                                        label="Nome do Job"
                                        placeholder="Ex: Análise Produtos Chile - Maio 2025"
                                        value={nomeJob}
                                        onChange={(e) => setNomeJob(e.target.value)}
                                        leftSection={<IconFileText size={16} />}
                                        disabled={loadingUpload}
                                    />
                                    
                                    <Group grow>
                                        <Select
                                            label="Modo de Processamento"
                                            data={[
                                                { value: 'produto', label: '🛍️ Por Produto (Shopify)' },
                                                { value: 'loja', label: '🏪 Por Loja (Tradicional)' }
                                            ]}
                                            value={modoProcessamento}
                                            onChange={setModoProcessamento}
                                            disabled={loadingUpload}
                                        />
                                        
                                        {modoProcessamento === 'produto' && (
                                            <Select
                                                label="Loja Shopify"
                                                placeholder="Selecione a loja"
                                                data={lojasShopify.map(loja => ({ value: loja.id.toString(), label: loja.nome }))}
                                                value={lojaSelecionada?.toString()}
                                                onChange={(value) => setLojaSelecionada(value ? parseInt(value) : null)}
                                                required
                                                disabled={loadingUpload}
                                            />
                                        )}
                                    </Group>
                                    
                                    <FileInput
                                        label="Arquivo CSV ECOMHUB"
                                        placeholder="Selecione o arquivo (até 50MB)"
                                        accept=".csv"
                                        value={arquivoEcomhub}
                                        onChange={setArquivoEcomhub}
                                        leftSection={<IconFileText size={16} />}
                                        disabled={loadingUpload}
                                    />
                                    
                                    <Button 
                                        fullWidth 
                                        leftSection={loadingUpload ? <Loader size="xs" /> : <IconPlayerPlay size={16} />}
                                        onClick={iniciarProcessamentoAsync}
                                        disabled={!arquivoEcomhub || (modoProcessamento === 'produto' && !lojaSelecionada) || loadingUpload}
                                        loading={loadingUpload}
                                        size="lg"
                                        color="blue"
                                    >
                                        {loadingUpload ? 'Iniciando Processamento...' : 'Iniciar Processamento Assíncrono'}
                                    </Button>
                                </Stack>
                            </Paper>
                        </Grid.Col>
                        
                        <Grid.Col span={{ base: 12, md: 4 }}>
                            <Paper shadow="sm" p="md">
                                <Title order={4} mb="md">✨ Vantagens do Processamento Assíncrono</Title>
                                <List size="sm" spacing="xs">
                                    <List.Item icon={<IconCheck size={16} color="green" />}>
                                        Sem limite de dados ou timeout
                                    </List.Item>
                                    <List.Item icon={<IconCheck size={16} color="green" />}>
                                        Progresso em tempo real via SSE
                                    </List.Item>
                                    <List.Item icon={<IconCheck size={16} color="green" />}>
                                        Multitarefa durante processamento
                                    </List.Item>
                                    <List.Item icon={<IconCheck size={16} color="green" />}>
                                        Rate limiting inteligente
                                    </List.Item>
                                    <List.Item icon={<IconCheck size={16} color="green" />}>
                                        Cache otimizado para performance
                                    </List.Item>
                                    <List.Item icon={<IconCheck size={16} color="green" />}>
                                        Controle total (pausar/cancelar)
                                    </List.Item>
                                </List>
                                
                                <Divider my="md" />
                                
                                <Text size="sm" c="dimmed">
                                    <strong>💡 Dica:</strong> Arquivos grandes são processados em chunks para máxima estabilidade e controle.
                                </Text>
                            </Paper>
                        </Grid.Col>
                    </Grid>
                    
                    {/* Resultados */}
                    {renderResultados()}
                </Tabs.Panel>

                <Tabs.Panel value="jobs">
                    <Paper shadow="sm" p="md">
                        <Group justify="space-between" mb="md">
                            <Title order={4}>⚡ Jobs em Andamento</Title>
                            <Button 
                                leftSection={<IconRefresh size={16} />} 
                                variant="outline" 
                                size="sm"
                                onClick={fetchJobsAtivos}
                            >
                                Atualizar
                            </Button>
                        </Group>
                        
                        {jobsAtivos.length === 0 ? (
                            <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                                <Text fw={500} mb="xs">Nenhum job em andamento</Text>
                                <Text size="sm" c="dimmed">
                                    Inicie um novo processamento na aba "Novo Processamento" para acompanhar o progresso aqui.
                                </Text>
                            </Alert>
                        ) : (
                            <Grid>
                                {jobsAtivos.map(job => (
                                    <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={job.job_id}>
                                        {renderProgressCard(job)}
                                    </Grid.Col>
                                ))}
                            </Grid>
                        )}
                    </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="lojas">
                    {renderGerenciamentoLojas()}
                </Tabs.Panel>

                <Tabs.Panel value="analises">
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
                        
                        <Title order={4} mb="md">💾 Análises Salvas</Title>
                        
                        {analisesSalvas.length === 0 ? (
                            <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                                <Text fw={500} mb="xs">Nenhuma análise salva</Text>
                                <Text size="sm" c="dimmed">
                                    Complete um processamento e salve o resultado para vê-lo aqui.
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
                                                <Badge 
                                                    color={analise.tipo_metrica === 'produto' ? 'blue' : 'orange'} 
                                                    variant="light"
                                                >
                                                    {analise.tipo_metrica === 'produto' ? '🛍️ Produto' : '🏪 Loja'}
                                                </Badge>
                                            </Group>
                                            
                                            {analise.loja_shopify_nome && (
                                                <Text size="xs" c="blue" mb="xs">
                                                    🏪 {analise.loja_shopify_nome}
                                                </Text>
                                            )}
                                            
                                            <Text size="xs" c="dimmed" mb="md">
                                                📅 {new Date(analise.criado_em).toLocaleDateString('pt-BR')} por {analise.criado_por_nome}
                                            </Text>
                                            
                                            <Group justify="space-between">
                                                <Button 
                                                    size="xs" 
                                                    variant="light" 
                                                    onClick={() => {
                                                        setDadosResultado(analise.dados_efetividade);
                                                        setJobSelecionado({ 
                                                            ...analise, 
                                                            job_id: analise.id,
                                                            status: 'completed',
                                                            analise_id: analise.id
                                                        });
                                                        showNotification('success', '✅ Análise carregada com sucesso!');
                                                    }}
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
                    {loadingLoja && (
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
                            leftSection={loadingLoja ? <Loader size="xs" /> : <IconCheck size={16} />}
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
                    
                    <Alert color="blue" mb="md" icon={<IconInfoCircle size={16} />}>
                        <Text fw={500} mb="xs">Salvando resultado do job:</Text>
                        <Text size="sm"><strong>{jobSelecionado?.nome}</strong></Text>
                        <Text size="xs" c="dimmed" mt="xs">
                            Modo: {jobSelecionado?.tipo_metrica === 'produto' ? '🛍️ Por Produto' : '🏪 Por Loja'}
                            {jobSelecionado?.loja_shopify_nome && (
                                <> • Loja: {jobSelecionado.loja_shopify_nome}</>
                            )}
                        </Text>
                    </Alert>
                    
                    <TextInput
                        label="Nome da Análise"
                        placeholder="Ex: Produtos Chile - Maio 2025"
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
                            onClick={salvarAnaliseDeJob} 
                            disabled={!nomeAnalise} 
                            loading={loadingSalvar}
                            leftSection={loadingSalvar ? <Loader size="xs" /> : <IconDownload size={16} />}
                        >
                            {loadingSalvar ? 'Salvando...' : 'Salvar Análise'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal de detalhes do job */}
            <Modal 
                opened={modalDetalhes} 
                onClose={() => setModalDetalhes(false)}
                title={`📋 Detalhes do Job: ${jobSelecionado?.nome}`}
                size="lg"
            >
                {jobSelecionado && (
                    <Stack>
                        <Group>
                            <Badge color={getStatusColor(jobSelecionado.status)} size="lg">
                                {jobSelecionado.status}
                            </Badge>
                            <Text c="dimmed">
                                {jobSelecionado.duracao && `Duração: ${jobSelecionado.duracao}`}
                            </Text>
                        </Group>
                        
                        {jobSelecionado.erro_detalhes && (
                            <Alert color="red" title="Erro Detalhado">
                                <Code block>{jobSelecionado.erro_detalhes}</Code>
                            </Alert>
                        )}
                        
                        {jobSelecionado.mensagem_atual && (
                            <Alert color="blue" title="Última Mensagem">
                                {jobSelecionado.mensagem_atual}
                            </Alert>
                        )}
                        
                        <Button variant="outline" onClick={() => setModalDetalhes(false)}>
                            Fechar
                        </Button>
                    </Stack>
                )}
            </Modal>
        </Container>
    );
}

export default EcomhubAsyncPage;