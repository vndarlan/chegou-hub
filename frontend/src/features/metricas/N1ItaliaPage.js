// frontend/src/features/metricas/N1ItaliaPage.js - PÁGINA COMPLETA N1 ITÁLIA
import React, { useState, useEffect, useCallback } from 'react';
import {
    Upload, Download, Trash2, RefreshCw, Check, X,
    AlertTriangle, TrendingUp, BarChart3, Eye, Search, FileSpreadsheet,
    ArrowUpDown, ArrowUp, ArrowDown, Package, Target, Percent,
    PieChart, Filter, Rocket, LayoutDashboard, Loader2, FileX,
    Gift, Box
} from 'lucide-react';
import axios from 'axios';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Separator } from '../../components/ui/separator';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

// Utilitários
import { getCSRFToken } from '../../utils/csrf';

// Status N1 Específicos
const STATUS_N1_MAPPING = {
    entregues: ['Delivered'],
    finalizados: ['Delivered', 'Return', 'Invalid', 'Out of stock', 'Deleted', 'Rejected', 'Duplicate'],
    transito: ['To prepare', 'Waiting for carrier', 'Assigned to carrier', 'Shipped'],
    problemas: ['Invalid', 'Out of stock', 'Rejected'],
    devolucao: ['Return'],
    cancelados: ['Deleted', 'Rejected', 'Duplicate']
};

const STATUS_N1_TOTAL = [
    'Unprocessed', 'To prepare', 'Waiting for carrier', 'Assigned to carrier',
    'Shipped', 'Delivered', 'Return', 'Invalid', 'Out of stock',
    'Duplicate', 'Lead', 'Deleted', 'Rejected'
];

function N1ItaliaPage() {
    // Estados principais
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [dadosResultado, setDadosResultado] = useState(null);
    const [secaoAtiva, setSecaoAtiva] = useState('gerar');
    const [tipoVisualizacao, setTipoVisualizacao] = useState('otimizada');

    // Estados do upload
    const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    // Estados de modal e loading
    const [modalSalvar, setModalSalvar] = useState(false);
    const [modalInstrucoes, setModalInstrucoes] = useState(false);
    const [nomeAnalise, setNomeAnalise] = useState('');
    const [loadingUpload, setLoadingUpload] = useState(false);
    const [loadingProcessar, setLoadingProcessar] = useState(false);
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [loadingAnalises, setLoadingAnalises] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState({});

    // Estados de notificação e progresso
    const [notification, setNotification] = useState(null);
    const [progressoAtual, setProgressoAtual] = useState(null);

    // Estados para ordenação
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');

    // ======================== FUNÇÕES DE API ========================

    const fetchAnalises = async () => {
        setLoadingAnalises(true);
        try {
            const response = await axios.get('/metricas/n1italia/analise-n1italia/', {
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });
            setAnalisesSalvas(response.data);
        } catch (error) {
            console.error('Erro ao buscar análises:', error);
            showNotification('error', 'Erro ao carregar análises salvas');
        } finally {
            setLoadingAnalises(false);
        }
    };

    const uploadExcel = async () => {
        if (!arquivoSelecionado) {
            showNotification('error', 'Selecione um arquivo Excel');
            return;
        }

        // Validar tipo de arquivo
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];

        if (!allowedTypes.includes(arquivoSelecionado.type)) {
            showNotification('error', 'Arquivo deve ser .xlsx ou .xls');
            return;
        }

        // Validar tamanho (10MB max)
        if (arquivoSelecionado.size > 10 * 1024 * 1024) {
            showNotification('error', 'Arquivo muito grande. Máximo 10MB');
            return;
        }

        setLoadingUpload(true);
        setProgressoAtual({ etapa: 'Fazendo upload...', porcentagem: 30 });

        try {
            const formData = new FormData();
            formData.append('arquivo', arquivoSelecionado);

            const uploadResponse = await axios.post(
                '/metricas/n1italia/analise-n1italia/upload_excel/',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'X-CSRFToken': getCSRFToken()
                    }
                }
            );

            if (uploadResponse.data.status === 'success') {
                setProgressoAtual({ etapa: 'Processando dados...', porcentagem: 70 });

                // Processar dados
                const processResponse = await axios.post(
                    '/metricas/n1italia/analise-n1italia/processar/',
                    {
                        arquivo_id: uploadResponse.data.arquivo_id
                    },
                    {
                        headers: {
                            'X-CSRFToken': getCSRFToken()
                        }
                    }
                );

                if (processResponse.data.status === 'success') {
                    setDadosResultado(processResponse.data.dados_processados);
                    showNotification('success', 'Arquivo processado com sucesso!');

                    // Gerar nome automático
                    const agora = new Date();
                    const dataStr = agora.toLocaleDateString('pt-BR');
                    const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    setNomeAnalise(`N1 Itália ${dataStr} ${horaStr}`);

                    // Limpar arquivo após processar
                    setArquivoSelecionado(null);
                } else {
                    throw new Error(processResponse.data.message || 'Erro no processamento');
                }
            } else {
                throw new Error(uploadResponse.data.message || 'Erro no upload');
            }
        } catch (error) {
            console.error('Erro no upload/processamento:', error);
            showNotification('error', `Erro: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingUpload(false);
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
            const response = await axios.post('/metricas/n1italia/analise-n1italia/', {
                nome: nomeAnalise,
                dados_efetividade: dadosResultado,
                tipo_metrica: 'n1_italia',
                descricao: 'Análise de efetividade N1 Itália por upload de Excel'
            }, {
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (response.data.id) {
                showNotification('success', `Análise '${nomeAnalise}' salva!`);
                setModalSalvar(false);
                setNomeAnalise('');
                fetchAnalises();
            }
        } catch (error) {
            showNotification('error', `Erro ao salvar: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingSalvar(false);
        }
    };

    const carregarAnalise = (analise) => {
        setDadosResultado(analise.dados_efetividade);
        setSecaoAtiva('gerar');
        showNotification('success', 'Análise carregada!');
    };

    const deletarAnalise = async (id, nome) => {
        const nomeDisplay = nome.replace('[N1 ITÁLIA] ', '');
        if (!window.confirm(`Deletar análise '${nomeDisplay}'?`)) return;

        setLoadingDelete(prev => ({ ...prev, [id]: true }));
        try {
            await axios.delete(`/metricas/n1italia/analise-n1italia/${id}/`, {
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });
            showNotification('success', 'Análise deletada!');
            fetchAnalises();

            if (dadosResultado?.id === id) {
                setDadosResultado(null);
            }
        } catch (error) {
            showNotification('error', `Erro ao deletar: ${error.response?.data?.message || error.message}`);
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
        if (!valor || typeof valor !== 'string') return '';

        const numero = parseFloat(valor.replace('%', '').replace('(Média)', ''));

        if (numero >= 60) return 'bg-green-600 text-white';
        if (numero >= 50) return 'bg-green-500 text-white';
        if (numero >= 40) return 'bg-yellow-500 text-black';
        return 'bg-red-500 text-white';
    };

    const getDadosVisualizacao = () => {
        if (!dadosResultado) return null;
        return tipoVisualizacao === 'otimizada' ?
            (dadosResultado.visualizacao_otimizada || dadosResultado) :
            (dadosResultado.visualizacao_total || dadosResultado);
    };

    const sortData = (data, sortBy, sortOrder) => {
        if (!sortBy) return data;

        return [...data].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            if (typeof aVal === 'string' && aVal.includes('%')) {
                aVal = parseFloat(aVal.replace('%', ''));
            }
            if (typeof bVal === 'string' && bVal.includes('%')) {
                bVal = parseFloat(bVal.replace('%', ''));
            }

            if (typeof aVal === 'string' && !isNaN(aVal)) aVal = parseFloat(aVal);
            if (typeof bVal === 'string' && !isNaN(bVal)) bVal = parseFloat(bVal);

            if (sortOrder === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const detectarKits = (nomeProduto) => {
        if (!nomeProduto) return { isKit: false, icon: '🎁', display: nomeProduto };

        // Detectar se é um kit (contém múltiplos produtos separados por vírgula ou "e")
        const hasMultipleProducts = nomeProduto.includes(',') || nomeProduto.includes(' e ') || nomeProduto.includes(' + ');

        if (hasMultipleProducts) {
            return {
                isKit: true,
                icon: '📦',
                display: `Kit (${nomeProduto})`
            };
        }

        return {
            isKit: false,
            icon: '🎁',
            display: nomeProduto
        };
    };

    // ======================== HANDLERS DE DRAG & DROP ========================

    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            setArquivoSelecionado(files[0]);
        }
    }, []);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setArquivoSelecionado(files[0]);
        }
    };

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    // Header
    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Análise de Efetividade N1 Itália</h1>
            </div>

            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModalInstrucoes(true)}
                    className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Instruções
                </Button>
            </div>
        </div>
    );

    // Upload Section
    const renderUploadSection = () => (
        <Card className="mb-6 relative border-border bg-card">
            {(loadingUpload || loadingProcessar) && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur flex flex-col items-center justify-center z-10 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                    <p className="font-medium mb-2 text-foreground">
                        {loadingUpload ? 'Fazendo upload...' : 'Processando dados...'}
                    </p>
                    {progressoAtual && (
                        <>
                            <Progress value={progressoAtual.porcentagem} className="w-60 mb-2" />
                            <p className="text-sm text-muted-foreground">{progressoAtual.etapa}</p>
                        </>
                    )}
                </div>
            )}

            <CardHeader>
                <div className="flex items-center gap-3">
                    <Upload className="h-5 w-5 text-primary" />
                    <div>
                        <CardTitle className="text-card-foreground">Upload de Excel</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Faça upload do arquivo Excel com dados N1 Itália
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div className="space-y-4">
                    {/* Área de drag & drop */}
                    <div
                        className={`
                            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                            ${dragActive
                                ? 'border-primary bg-primary/5'
                                : 'border-border bg-background hover:bg-accent/50'
                            }
                            ${loadingUpload ? 'opacity-50 pointer-events-none' : ''}
                        `}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('file-input')?.click()}
                    >
                        <input
                            id="file-input"
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileSelect}
                            className="hidden"
                            disabled={loadingUpload}
                        />

                        <div className="space-y-2">
                            {arquivoSelecionado ? (
                                <>
                                    <FileSpreadsheet className="h-12 w-12 text-green-500 mx-auto" />
                                    <p className="text-green-600 font-medium">
                                        {arquivoSelecionado.name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {(arquivoSelecionado.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </>
                            ) : (
                                <>
                                    <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto" />
                                    <p className="text-foreground font-medium">
                                        Arraste um arquivo Excel aqui ou clique para selecionar
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Formatos: .xlsx, .xls (máx. 10MB)
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex justify-between items-center">
                        {arquivoSelecionado && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setArquivoSelecionado(null)}
                                disabled={loadingUpload}
                                className="border-border bg-background text-foreground hover:bg-accent"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Remover Arquivo
                            </Button>
                        )}

                        <Button
                            onClick={uploadExcel}
                            disabled={!arquivoSelecionado || loadingUpload}
                            size="lg"
                            className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {loadingUpload ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4 mr-2" />
                            )}
                            {loadingUpload ? 'Processando...' : 'Processar Arquivo'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    // Estatísticas
    const renderEstatisticas = () => {
        const dados = getDadosVisualizacao();
        if (tipoVisualizacao === 'total' || !dados || !Array.isArray(dados)) return null;

        const produtos = dados.filter(item => item.Produto !== 'Total');
        const totalProdutos = produtos.length;
        const kits = produtos.filter(item => detectarKits(item.Produto).isKit);

        // Calcular totais
        const totalEntregues = produtos.reduce((sum, item) => sum + (item.Entregues || 0), 0);
        const totalPedidos = produtos.reduce((sum, item) => sum + (item.Total_Pedidos || item.Totais || 0), 0);

        const efetividadeMedia = totalPedidos > 0 ? (totalEntregues / totalPedidos * 100) : 0;

        return (
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Produtos/Kits</p>
                                <p className="text-xl font-bold text-card-foreground">
                                    {totalProdutos}
                                    {kits.length > 0 && (
                                        <span className="text-sm text-muted-foreground ml-2">
                                            ({kits.length} kits)
                                        </span>
                                    )}
                                </p>
                            </div>
                            <Package className="h-5 w-5 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Entregues</p>
                                <p className="text-xl font-bold text-green-600">{totalEntregues.toLocaleString()}</p>
                            </div>
                            <TrendingUp className="h-5 w-5 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Pedidos</p>
                                <p className="text-xl font-bold text-blue-600">{totalPedidos.toLocaleString()}</p>
                            </div>
                            <Target className="h-5 w-5 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Efetividade</p>
                                <p className="text-xl font-bold text-orange-600">{efetividadeMedia.toFixed(1)}%</p>
                            </div>
                            <Percent className="h-5 w-5 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    // Tabela de resultados
    const renderResultados = () => {
        const dados = getDadosVisualizacao();
        if (!dados || !Array.isArray(dados)) return null;

        let colunas = Object.keys(dados[0] || {});
        const dadosOrdenados = sortData(dados, sortBy, sortOrder);

        const colunasEssenciais = ['Produto', 'Total_Pedidos', 'Entregues', 'Efetividade'];
        const isMobile = window.innerWidth < 768;

        if (isMobile && tipoVisualizacao === 'otimizada') {
            colunas = colunas.filter(col => colunasEssenciais.some(essencial => col.includes(essencial)));
        }

        return (
            <Card className="mb-6 border-border bg-card">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg text-card-foreground">Resultados N1 Itália</CardTitle>
                            <CardDescription className="text-muted-foreground">{dados.length} registros</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Tabs value={tipoVisualizacao} onValueChange={setTipoVisualizacao}>
                                <TabsList className="grid w-fit grid-cols-2 bg-muted">
                                    <TabsTrigger value="otimizada" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Otimizada</TabsTrigger>
                                    <TabsTrigger value="total" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Total</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setModalSalvar(true)}
                                className="border-border bg-background text-foreground hover:bg-accent"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Salvar
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="w-full max-w-[calc(100vw-280px)] overflow-x-auto">
                        <Table className="w-full table-fixed" style={{ minWidth: '1000px' }}>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border">
                                    {colunas.map(col => {
                                        const isProduto = col === 'Produto';

                                        let classesHeader = 'whitespace-nowrap px-2 py-2 text-xs text-muted-foreground';

                                        if (isProduto) {
                                            classesHeader += ' sticky left-0 z-20 bg-background border-r border-border min-w-[200px]';
                                        }

                                        return (
                                            <TableHead key={col} className={classesHeader}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-auto p-0 font-medium text-xs text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleSort(col)}
                                                >
                                                    {col.replace(/_/g, ' ')}
                                                    {sortBy === col ? (
                                                        sortOrder === 'asc' ?
                                                            <ArrowUp className="ml-1 h-3 w-3" /> :
                                                            <ArrowDown className="ml-1 h-3 w-3" />
                                                    ) : (
                                                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                                    )}
                                                </Button>
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dadosOrdenados.map((row, idx) => (
                                    <TableRow key={idx} className={`border-border ${row.Produto === 'Total' ? 'bg-muted/20 font-medium' : ''}`}>
                                        {colunas.map(col => {
                                            const isProduto = col === 'Produto';

                                            let classesCelula = 'px-2 py-2 text-xs text-card-foreground';

                                            if (col.includes('Efetividade') || col.includes('efetividade')) {
                                                classesCelula += ` font-bold ${getEfetividadeCor(row[col])} px-2 py-1 rounded text-center`;
                                            }

                                            if (isProduto) {
                                                classesCelula += ' sticky left-0 z-10 bg-background border-r border-border min-w-[200px]';
                                            }

                                            return (
                                                <TableCell
                                                    key={col}
                                                    className={classesCelula}
                                                >
                                                    {col === 'Produto' ? (
                                                        <div className="flex items-center gap-2 max-w-[180px]">
                                                            {(() => {
                                                                const kitInfo = detectarKits(row[col]);
                                                                return (
                                                                    <>
                                                                        <span className="text-lg">{kitInfo.icon}</span>
                                                                        <div className="truncate" title={kitInfo.display}>
                                                                            {kitInfo.display}
                                                                        </div>
                                                                        {kitInfo.isKit && <Badge variant="secondary" className="text-xs">Kit</Badge>}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        typeof row[col] === 'number' ? row[col].toLocaleString() : row[col]
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
        </Card>
    );
    };

    // Análises salvas
    const renderAnalisesSalvas = () => {
        return (
            <Card className="relative border-border bg-card">
                {loadingAnalises && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur flex items-center justify-center z-10 rounded-lg">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                )}

                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-card-foreground">Análises N1 Itália Salvas</CardTitle>
                            <CardDescription className="text-muted-foreground">{analisesSalvas.length} análises encontradas</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchAnalises}
                            className="border-border bg-background text-foreground hover:bg-accent"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Atualizar
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {analisesSalvas.length === 0 ? (
                        <Alert className="border-border bg-background">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <AlertDescription className="text-muted-foreground">
                                Nenhuma análise N1 Itália encontrada. Faça upload de um Excel e salve o resultado.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {analisesSalvas.map(analise => (
                                <Card key={analise.id} className="relative border-border bg-card">
                                    {loadingDelete[analise.id] && (
                                        <div className="absolute inset-0 bg-background/80 backdrop-blur flex items-center justify-center z-10 rounded-lg">
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        </div>
                                    )}

                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-medium text-sm truncate max-w-[80%] text-card-foreground">
                                                {analise.nome.replace('[N1 ITÁLIA] ', '')}
                                            </h3>
                                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">N1 🇮🇹</Badge>
                                        </div>

                                        <p className="text-xs text-muted-foreground mb-3">
                                            {new Date(analise.criado_em).toLocaleDateString('pt-BR')}
                                        </p>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => carregarAnalise(analise)}
                                                className="flex-1 border-border bg-background text-foreground hover:bg-accent"
                                            >
                                                <Eye className="h-3 w-3 mr-1" />
                                                Carregar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => deletarAnalise(analise.id, analise.nome)}
                                                disabled={loadingDelete[analise.id]}
                                                className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    // ======================== EFEITOS ========================

    useEffect(() => {
        fetchAnalises();
    }, []);

    // ======================== RENDER PRINCIPAL ========================

    return (
        <div className="flex-1 space-y-4 p-6 min-h-screen bg-background">
            {/* Notificações */}
            {notification && (
                <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className="mb-4 border-border">
                    {notification.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <AlertDescription>{notification.message}</AlertDescription>
                </Alert>
            )}

            {/* Header */}
            {renderHeader()}

            {/* Navegação */}
            <Tabs value={secaoAtiva} onValueChange={setSecaoAtiva} className="w-full">
                <TabsList className="grid w-fit grid-cols-2 bg-muted">
                    <TabsTrigger value="gerar" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Rocket className="h-4 w-4 mr-2" />
                        Gerar
                    </TabsTrigger>
                    <TabsTrigger value="salvas" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Salvas
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="gerar" className="space-y-4">
                    {renderUploadSection()}
                    {renderEstatisticas()}
                    {renderResultados()}
                </TabsContent>

                <TabsContent value="salvas">
                    {renderAnalisesSalvas()}
                </TabsContent>
            </Tabs>

            {/* Modal instruções */}
            <Dialog open={modalInstrucoes} onOpenChange={setModalInstrucoes}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto border-border bg-popover">
                    <DialogHeader>
                        <DialogTitle className="text-orange-600">Manual N1 Itália - Análise de Efetividade</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Guia completo para análise de dados N1 da Itália
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div>
                            <h4 className="text-lg font-semibold text-blue-600 mb-3">📊 Upload de Excel</h4>
                            <div className="space-y-2">
                                <p className="text-sm text-foreground">• <strong>Formato aceito:</strong> .xlsx ou .xls (máximo 10MB)</p>
                                <p className="text-sm text-foreground">• <strong>Como fazer:</strong> Arraste o arquivo para a área ou clique para selecionar</p>
                                <p className="text-sm text-foreground">• <strong>Processamento:</strong> Automático após upload</p>
                                <p className="text-sm text-foreground">• <strong>Estrutura esperada:</strong> Colunas com dados de produtos e status N1</p>
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h4 className="text-lg font-semibold text-green-600 mb-3">📦 Detecção Automática de Kits</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="border-blue-200 bg-card">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Box className="h-4 w-4 text-blue-600" />
                                            <h5 className="font-semibold text-blue-600 text-sm">Kits</h5>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Produtos detectados com múltiplos itens (vírgula, "e", "+")</p>
                                        <p className="text-xs text-blue-600 mt-1">📦 Kit (Produto A, Produto B, Produto C)</p>
                                    </CardContent>
                                </Card>

                                <Card className="border-green-200 bg-card">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Gift className="h-4 w-4 text-green-600" />
                                            <h5 className="font-semibold text-green-600 text-sm">Produtos Únicos</h5>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Produtos individuais</p>
                                        <p className="text-xs text-green-600 mt-1">🎁 Produto Individual</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h4 className="text-lg font-semibold text-purple-600 mb-3">📋 Status N1 Específicos</h4>

                            <div className="mb-4">
                                <h5 className="font-semibold text-teal-600 mb-2">Visualização Otimizada:</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-green-500 rounded"></div>
                                            <span className="text-sm font-medium">Entregues:</span>
                                            <span className="text-sm text-muted-foreground">Delivered</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                            <span className="text-sm font-medium">Finalizados:</span>
                                            <span className="text-sm text-muted-foreground">Delivered + Return + Invalid + Out of stock + Deleted + Rejected + Duplicate</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-orange-500 rounded"></div>
                                            <span className="text-sm font-medium">Em Trânsito:</span>
                                            <span className="text-sm text-muted-foreground">To prepare + Waiting for carrier + Assigned to carrier + Shipped</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-red-500 rounded"></div>
                                            <span className="text-sm font-medium">Problemas:</span>
                                            <span className="text-sm text-muted-foreground">Invalid + Out of stock + Rejected</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                                            <span className="text-sm font-medium">Devolução:</span>
                                            <span className="text-sm text-muted-foreground">Return</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-gray-500 rounded"></div>
                                            <span className="text-sm font-medium">Cancelados:</span>
                                            <span className="text-sm text-muted-foreground">Deleted + Rejected + Duplicate</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h5 className="font-semibold text-indigo-600 mb-2">Visualização Total:</h5>
                                <p className="text-sm text-muted-foreground mb-2">Colunas individuais para cada status:</p>
                                <div className="flex flex-wrap gap-1">
                                    {STATUS_N1_TOTAL.map(status => (
                                        <Badge key={status} variant="outline" className="text-xs">{status}</Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h5 className="font-semibold text-orange-600 mb-2">📈 Métricas Calculadas:</h5>
                            <div className="space-y-1">
                                <p className="text-sm text-foreground">• <strong>Efetividade:</strong> (Entregues ÷ Total de Pedidos) × 100</p>
                                <p className="text-sm text-foreground">• <strong>Taxa de Problemas:</strong> (Problemas ÷ Total de Pedidos) × 100</p>
                                <p className="text-sm text-foreground">• <strong>Taxa em Trânsito:</strong> (Em Trânsito ÷ Total de Pedidos) × 100</p>
                                <p className="text-sm text-foreground">• <strong>Taxa de Devolução:</strong> (Devolvidos ÷ Total de Pedidos) × 100</p>
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h5 className="font-semibold text-teal-600 mb-2">🎨 Cores de Performance:</h5>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-4 bg-green-600 rounded"></div>
                                    <span className="text-sm text-foreground">Efetividade ≥ 60% (Excelente)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-4 bg-green-500 rounded"></div>
                                    <span className="text-sm text-foreground">Efetividade ≥ 50% (Boa)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-4 bg-yellow-500 rounded"></div>
                                    <span className="text-sm text-foreground">Efetividade ≥ 40% (Regular)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-4 bg-red-500 rounded"></div>
                                    <span className="text-sm text-foreground">Efetividade &lt; 40% (Precisa melhorar)</span>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h5 className="font-semibold text-pink-600 mb-2">💾 Sistema de Salvamento:</h5>
                            <div className="space-y-1">
                                <p className="text-sm text-foreground">• <strong>Salvar:</strong> Clique em "Salvar" após processar os dados</p>
                                <p className="text-sm text-foreground">• <strong>Nome automático:</strong> Gerado com data e hora do processamento</p>
                                <p className="text-sm text-foreground">• <strong>Carregar:</strong> Acesse a aba "Salvas" para ver análises anteriores</p>
                                <p className="text-sm text-foreground">• <strong>Deletar:</strong> Remova análises que não precisa mais</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal salvar */}
            <Dialog open={modalSalvar} onOpenChange={setModalSalvar}>
                <DialogContent className="border-border bg-popover">
                    <DialogHeader>
                        <DialogTitle className="text-popover-foreground">Salvar Análise N1 Itália</DialogTitle>
                        <DialogDescription className="text-muted-foreground">Digite um nome para identificar esta análise</DialogDescription>
                    </DialogHeader>

                    <div className="relative py-4">
                        {loadingSalvar && (
                            <div className="absolute inset-0 bg-background/90 backdrop-blur flex items-center justify-center z-10 rounded">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="nome-analise" className="text-foreground">Nome da Análise</Label>
                            <Input
                                id="nome-analise"
                                placeholder="Ex: N1 Itália Janeiro 2025 - Campanha XYZ"
                                value={nomeAnalise}
                                onChange={(e) => setNomeAnalise(e.target.value)}
                                disabled={loadingSalvar}
                                className="border-border bg-background text-foreground"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setModalSalvar(false)}
                            disabled={loadingSalvar}
                            className="border-border bg-background text-foreground hover:bg-accent"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={salvarAnalise}
                            disabled={!nomeAnalise || loadingSalvar}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {loadingSalvar ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                            {loadingSalvar ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default N1ItaliaPage;