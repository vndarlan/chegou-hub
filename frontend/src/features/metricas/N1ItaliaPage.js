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
    transito: ['To prepare', 'Waiting for carrier', 'Assigned to carrier', 'Shipped', 'Unprocessed'],
    problemas: ['Invalid', 'Out of stock'],
    devolucao: ['Return', 'Rejected'],
    cancelados: ['Deleted']
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

    // Estados para agrupamento de kits
    const [linhasSelecionadas, setLinhasSelecionadas] = useState(new Set());
    const [agrupamentos, setAgrupamentos] = useState([]);
    const [mostrarAgrupados, setMostrarAgrupados] = useState(false);
    const [modalAgrupamento, setModalAgrupamento] = useState(false);
    const [nomeAgrupamento, setNomeAgrupamento] = useState('');

    // ======================== FUNÇÕES DE API ========================

    const fetchAnalises = async () => {
        setLoadingAnalises(true);
        try {
            const response = await axios.get('/metricas/n1italia/analise-n1italia/', {
                headers: {
                    'X-CSRFToken': getCSRFToken()
                },
                withCredentials: true
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
            formData.append('nome_analise', 'Análise N1 Itália');
            formData.append('descricao', 'Análise de efetividade N1 Itália por upload de Excel');

            const uploadResponse = await axios.post(
                '/metricas/n1italia/analise-n1italia/upload_excel/',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'X-CSRFToken': getCSRFToken()
                    },
                    withCredentials: true
                }
            );

            if (uploadResponse.data.status === 'success') {
                setProgressoAtual({ etapa: 'Processando dados...', porcentagem: 70 });

                // Processar dados usando os dados retornados do upload
                const dadosParaProcessamento = uploadResponse.data.dados_para_processamento;

                const processResponse = await axios.post(
                    '/metricas/n1italia/analise-n1italia/processar/',
                    {
                        nome_analise: dadosParaProcessamento.nome_analise,
                        descricao: dadosParaProcessamento.descricao,
                        dados_excel: dadosParaProcessamento.dados_excel
                    },
                    {
                        headers: {
                            'X-CSRFToken': getCSRFToken()
                        },
                        withCredentials: true
                    }
                );

                if (processResponse.data.status === 'success') {
                    setDadosResultado(processResponse.data.dados_processados);
                    showNotification('success', 'Arquivo processado com sucesso!');

                    // Limpar arquivo após processar
                    setArquivoSelecionado(null);

                    // Limpar nome da análise para que o usuário defina manualmente
                    setNomeAnalise('');
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
            // Adicionar prefixo se não existir
            const nomeComPrefixo = nomeAnalise.startsWith('[N1 ITÁLIA]')
                ? nomeAnalise
                : `[N1 ITÁLIA] ${nomeAnalise}`;

            const response = await axios.post('/metricas/n1italia/analise-n1italia/', {
                nome: nomeComPrefixo,
                dados_processados: dadosResultado,
                tipo_metrica: 'n1_italia',
                descricao: 'Análise de efetividade N1 Itália por upload de Excel'
            }, {
                headers: {
                    'X-CSRFToken': getCSRFToken()
                },
                withCredentials: true
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
        setDadosResultado(analise.dados_processados);
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
                },
                withCredentials: true
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

    const getEfetividadeParcialCor = (valor) => {
        if (!valor || typeof valor !== 'string') return '';

        const numero = parseFloat(valor.replace('%', '').replace('(Média)', ''));

        // Para efetividade parcial: quanto maior, melhor
        if (numero >= 70) return 'bg-green-600 text-white';
        if (numero >= 60) return 'bg-green-500 text-white';
        if (numero >= 50) return 'bg-yellow-500 text-black';
        return 'bg-red-500 text-white';
    };

    const getTaxaTransitoCor = (valor) => {
        if (!valor || typeof valor !== 'string') return '';

        const numero = parseFloat(valor.replace('%', '').replace('(Média)', ''));

        // Para trânsito: valores médios são aceitáveis
        if (numero <= 15) return 'bg-green-600 text-white';
        if (numero <= 25) return 'bg-green-500 text-white';
        if (numero <= 35) return 'bg-yellow-500 text-black';
        return 'bg-red-500 text-white';
    };

    const getTaxaDevolucaoCor = (valor) => {
        if (!valor || typeof valor !== 'string') return '';

        const numero = parseFloat(valor.replace('%', '').replace('(Média)', ''));

        // Para devolução: quanto menor, melhor (cores invertidas)
        if (numero <= 3) return 'bg-green-600 text-white';
        if (numero <= 6) return 'bg-green-500 text-white';
        if (numero <= 10) return 'bg-yellow-500 text-black';
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
        if (!nomeProduto) return { isKit: false, icon: '🎁', display: nomeProduto, produtos: [] };

        // Limpar nome do produto removendo "Kit (" e ")" se existir
        let nomeTexto = nomeProduto;
        if (nomeTexto.startsWith('Kit (') && nomeTexto.endsWith(')')) {
            nomeTexto = nomeTexto.replace(/^Kit \(/, '').replace(/\)$/, '');
        }

        // Detectar se é um kit (contém múltiplos produtos separados por vírgula ou "e")
        const hasMultipleProducts = nomeTexto.includes(',') || nomeTexto.includes(' e ') || nomeTexto.includes(' + ');

        if (hasMultipleProducts) {
            // Separar produtos por vírgula e limpar espaços
            const produtos = nomeTexto.split(',').map(p => p.trim()).filter(p => p.length > 0);

            return {
                isKit: true,
                icon: '📦',
                display: nomeTexto,
                produtos: produtos
            };
        }

        return {
            isKit: false,
            icon: '🎁',
            display: nomeTexto,
            produtos: [nomeTexto]
        };
    };

    // ======================== FUNÇÕES DE AGRUPAMENTO ========================

    const handleSelecionarLinha = (index) => {
        const novaSelecao = new Set(linhasSelecionadas);
        if (novaSelecao.has(index)) {
            novaSelecao.delete(index);
        } else {
            novaSelecao.add(index);
        }
        setLinhasSelecionadas(novaSelecao);
    };

    const handleSelecionarTodos = () => {
        const dados = getDadosVisualizacao();
        if (!dados) return;

        const dadosFiltrados = dados.filter(item => item.Produto !== 'Total');

        if (linhasSelecionadas.size === dadosFiltrados.length) {
            setLinhasSelecionadas(new Set());
        } else {
            const todosIndices = new Set(dadosFiltrados.map((_, index) => index));
            setLinhasSelecionadas(todosIndices);
        }
    };

    const calcularMetricasAgrupadas = (indicesSelecionados) => {
        const dados = getDadosVisualizacao();
        if (!dados) return null;

        const dadosFiltrados = dados.filter(item => item.Produto !== 'Total');
        const itensSelecionados = indicesSelecionados.map(index => dadosFiltrados[index]);

        // Somar valores numéricos
        const total_pedidos = itensSelecionados.reduce((sum, item) => sum + (item.Total_Pedidos || 0), 0);
        const entregues = itensSelecionados.reduce((sum, item) => sum + (item.Entregues || 0), 0);
        const finalizados = itensSelecionados.reduce((sum, item) => sum + (item.Finalizados || 0), 0);
        const em_transito = itensSelecionados.reduce((sum, item) => sum + (item.Em_Transito || 0), 0);
        const devolucao = itensSelecionados.reduce((sum, item) => sum + (item.Devolucao || 0), 0);
        const cancelados = itensSelecionados.reduce((sum, item) => sum + (item.Cancelados || 0), 0);

        // Recalcular percentuais
        const pct_caminho = total_pedidos > 0 ? ((em_transito / total_pedidos) * 100).toFixed(1) : '0.0';
        const pct_devolvidos = total_pedidos > 0 ? ((devolucao / total_pedidos) * 100).toFixed(1) : '0.0';
        const efetividade_parcial = finalizados > 0 ? ((entregues / finalizados) * 100).toFixed(1) : '0.0';
        const efetividade_total = total_pedidos > 0 ? ((entregues / total_pedidos) * 100).toFixed(1) : '0.0';

        return {
            Total_Pedidos: total_pedidos,
            Entregues: entregues,
            Finalizados: finalizados,
            Em_Transito: em_transito,
            Devolucao: devolucao,
            Cancelados: cancelados,
            '% A Caminho': `${pct_caminho}%`,
            '% Devolvidos': `${pct_devolvidos}%`,
            'Efetividade Parcial': `${efetividade_parcial}%`,
            'Efetividade': `${efetividade_total}%`,
            produtos_originais: itensSelecionados.map(item => item.Produto),
            indices_originais: Array.from(indicesSelecionados)
        };
    };

    const handleCriarAgrupamento = () => {
        if (linhasSelecionadas.size < 2) {
            showNotification('error', 'Selecione pelo menos 2 itens para agrupar');
            return;
        }

        const metricas = calcularMetricasAgrupadas(Array.from(linhasSelecionadas));
        if (!metricas) return;

        const novoAgrupamento = {
            id: Date.now(),
            nome: nomeAgrupamento || `Agrupamento ${agrupamentos.length + 1}`,
            metricas: metricas,
            quantidade_itens: linhasSelecionadas.size,
            criado_em: new Date().toISOString()
        };

        setAgrupamentos([...agrupamentos, novoAgrupamento]);
        setLinhasSelecionadas(new Set());
        setModalAgrupamento(false);
        setNomeAgrupamento('');
        setMostrarAgrupados(true);
        showNotification('success', `Agrupamento "${novoAgrupamento.nome}" criado com sucesso!`);
    };

    const handleDesfazerAgrupamento = (agrupamentoId) => {
        setAgrupamentos(agrupamentos.filter(ag => ag.id !== agrupamentoId));
        showNotification('success', 'Agrupamento removido');
    };

    const limparSelecao = () => {
        setLinhasSelecionadas(new Set());
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

    // Upload Section - COMPACTA E MINIMALISTA
    const renderUploadSection = () => (
        <div className="mb-4 max-w-md ml-auto relative">
            {(loadingUpload || loadingProcessar) && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur flex flex-col items-center justify-center z-10 rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin mb-2 text-primary" />
                    <p className="text-xs text-foreground">
                        {loadingUpload ? 'Upload...' : 'Processando...'}
                    </p>
                    {progressoAtual && (
                        <Progress value={progressoAtual.porcentagem} className="w-32 mt-2" />
                    )}
                </div>
            )}

            <Card className="border-border bg-card p-3">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Upload className="h-3 w-3" />
                        <span>Upload Excel N1</span>
                    </div>

                    {/* Área de drag & drop compacta */}
                    <div
                        className={`
                            border border-dashed rounded p-2 text-center transition-colors cursor-pointer text-xs
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

                        <div className="flex items-center gap-2 justify-center py-1">
                            {arquivoSelecionado ? (
                                <>
                                    <FileSpreadsheet className="h-3 w-3 text-green-500" />
                                    <span className="text-green-600 font-medium text-xs truncate max-w-[120px]">
                                        {arquivoSelecionado.name}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <FileSpreadsheet className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-foreground text-xs">
                                        Arraste ou clique
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Botões compactos */}
                    <div className="flex gap-2">
                        {arquivoSelecionado && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setArquivoSelecionado(null)}
                                disabled={loadingUpload}
                                className="border-border bg-background text-foreground hover:bg-accent text-xs px-2 py-1 h-6"
                            >
                                <X className="h-3 w-3 mr-1" />
                                Remover
                            </Button>
                        )}

                        <Button
                            onClick={uploadExcel}
                            disabled={!arquivoSelecionado || loadingUpload}
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-2 py-1 h-6 flex-1"
                        >
                            {loadingUpload ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                                <Upload className="h-3 w-3 mr-1" />
                            )}
                            {loadingUpload ? 'Processando...' : 'Processar'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );

    // Estatísticas
    const renderEstatisticas = () => {
        const dados = getDadosVisualizacao();
        if (tipoVisualizacao === 'total' || !dados || !Array.isArray(dados)) return null;

        // Filtrar linha "Total" se existir
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

        // Filtrar linha "Total" se existir
        const dadosFiltrados = dados.filter(item => item.Produto !== 'Total');

        // Definir ordem específica das colunas
        const ordemColunasOtimizada = [
            'Produto',
            'Total_Pedidos',
            'Entregues',
            'Finalizados',
            'Em_Transito',
            'Problemas',
            'Devolucao',
            'Cancelados',
            '% A Caminho',
            '% Devolvidos',
            'Efetividade Parcial',
            'Efetividade'
        ];

        const ordemColunasTotal = [
            'Produto',
            'Total_Pedidos',
            'Unprocessed',
            'To_prepare',
            'Waiting_for_carrier',
            'Assigned_to_carrier',
            'Shipped',
            'Delivered',
            'Return',
            'Invalid',
            'Out_of_stock',
            'Duplicate',
            'Lead',
            'Deleted',
            'Rejected'
        ];

        // Obter colunas disponíveis nos dados
        const colunasDisponiveis = Object.keys(dadosFiltrados[0] || {});

        // Usar ordem específica baseada no tipo de visualização
        const ordemEsperada = tipoVisualizacao === 'otimizada' ? ordemColunasOtimizada : ordemColunasTotal;

        // Filtrar apenas colunas que existem nos dados e manter ordem
        let colunas = ordemEsperada.filter(col => colunasDisponiveis.includes(col));

        // Adicionar colunas extras não previstas (caso existam)
        const colunasExtras = colunasDisponiveis.filter(col => !ordemEsperada.includes(col));
        colunas = [...colunas, ...colunasExtras];

        const dadosOrdenados = sortData(dadosFiltrados, sortBy, sortOrder);

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
                            <CardDescription className="text-muted-foreground">
                                {dadosFiltrados.length} registros
                                {agrupamentos.length > 0 && ` • ${agrupamentos.length} agrupamento(s)`}
                            </CardDescription>
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

                    {/* Toolbar de Agrupamento */}
                    {tipoVisualizacao === 'otimizada' && (
                        <div className="flex items-center gap-2 mt-3 p-2 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={linhasSelecionadas.size === dadosFiltrados.length && dadosFiltrados.length > 0}
                                    onChange={handleSelecionarTodos}
                                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-muted-foreground">
                                    {linhasSelecionadas.size > 0 ? `${linhasSelecionadas.size} selecionado(s)` : 'Selecionar todos'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                                {linhasSelecionadas.size >= 2 && (
                                    <Button
                                        size="sm"
                                        onClick={() => setModalAgrupamento(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        <Package className="h-4 w-4 mr-2" />
                                        Agrupar {linhasSelecionadas.size} itens
                                    </Button>
                                )}

                                {linhasSelecionadas.size > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={limparSelecao}
                                        className="border-border bg-background text-foreground hover:bg-accent"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Limpar
                                    </Button>
                                )}

                                {agrupamentos.length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setMostrarAgrupados(!mostrarAgrupados)}
                                        className="border-border bg-background text-foreground hover:bg-accent"
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        {mostrarAgrupados ? 'Ocultar' : 'Mostrar'} Agrupados
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="p-0">
                    <div className="w-full max-w-[calc(100vw-280px)] overflow-x-auto">
                        <Table className="w-full table-fixed" style={{ minWidth: '1800px' }}>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border">
                                    {/* Coluna de checkbox apenas na visualização otimizada */}
                                    {tipoVisualizacao === 'otimizada' && (
                                        <TableHead className="w-[50px] px-2 py-2 text-xs text-muted-foreground sticky left-0 z-20 bg-background border-r border-border">
                                            <input
                                                type="checkbox"
                                                checked={linhasSelecionadas.size === dadosOrdenados.length && dadosOrdenados.length > 0}
                                                onChange={handleSelecionarTodos}
                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                            />
                                        </TableHead>
                                    )}

                                    {colunas.map(col => {
                                        const isProduto = col === 'Produto';

                                        let classesHeader = 'whitespace-nowrap px-2 py-2 text-xs text-muted-foreground';

                                        if (isProduto) {
                                            const leftOffset = tipoVisualizacao === 'otimizada' ? '50px' : '0px';
                                            classesHeader += ` sticky z-10 bg-background border-r border-border min-w-[600px] max-w-[600px]`;
                                            classesHeader += tipoVisualizacao === 'otimizada' ? ' left-[50px]' : ' left-0';
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
                                {/* Exibir agrupamentos primeiro se ativado */}
                                {mostrarAgrupados && agrupamentos.map(agrupamento => (
                                    <TableRow key={`agrupamento-${agrupamento.id}`} className="border-border bg-blue-50 dark:bg-blue-900/20">
                                        {/* Checkbox para agrupamento */}
                                        {tipoVisualizacao === 'otimizada' && (
                                            <TableCell className="w-[50px] px-2 py-2 sticky left-0 z-10 bg-blue-50 dark:bg-blue-900/20 border-r border-border">
                                                <div className="text-blue-600">🔗</div>
                                            </TableCell>
                                        )}

                                        {colunas.map(col => {
                                            const isProduto = col === 'Produto';
                                            const value = agrupamento.metricas[col];

                                            let classesCelula = 'px-2 py-2 text-xs text-card-foreground';

                                            if (col === 'Efetividade') {
                                                classesCelula += ` font-bold ${getEfetividadeCor(value)} px-2 py-1 rounded text-center`;
                                            } else if (col.includes('Efetividade Parcial')) {
                                                classesCelula += ` font-bold ${getEfetividadeParcialCor(value)} px-2 py-1 rounded text-center`;
                                            } else if (col.includes('% A Caminho')) {
                                                classesCelula += ` font-bold ${getTaxaTransitoCor(value)} px-2 py-1 rounded text-center`;
                                            } else if (col.includes('% Devolvidos')) {
                                                classesCelula += ` font-bold ${getTaxaDevolucaoCor(value)} px-2 py-1 rounded text-center`;
                                            }

                                            if (isProduto) {
                                                classesCelula += tipoVisualizacao === 'otimizada' ?
                                                    ' sticky left-[50px] z-10 bg-blue-50 dark:bg-blue-900/20 border-r border-border min-w-[600px] max-w-[600px]' :
                                                    ' sticky left-0 z-10 bg-blue-50 dark:bg-blue-900/20 border-r border-border min-w-[600px] max-w-[600px]';
                                            }

                                            return (
                                                <TableCell key={col} className={classesCelula}>
                                                    {col === 'Produto' ? (
                                                        <div className="flex items-center gap-3 w-full">
                                                            <span className="text-lg flex-shrink-0">🔗</span>
                                                            <div className="flex-1 overflow-hidden">
                                                                <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                                                    {agrupamento.nome}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {agrupamento.quantidade_itens} itens agrupados
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDesfazerAgrupamento(agrupamento.id)}
                                                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                                                title="Desfazer agrupamento"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        typeof value === 'number' ? value.toLocaleString() : value
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}

                                {/* Exibir dados originais */}
                                {dadosOrdenados.map((row, idx) => {
                                    // Pular linhas que estão agrupadas
                                    if (mostrarAgrupados && agrupamentos.some(ag =>
                                        ag.metricas.indices_originais.includes(idx)
                                    )) {
                                        return null;
                                    }

                                    const isSelected = linhasSelecionadas.has(idx);

                                    return (
                                        <TableRow
                                            key={idx}
                                            className={`border-border ${row.Produto === 'Total' ? 'bg-muted/20 font-medium' : ''} ${isSelected ? 'bg-primary/10' : ''}`}
                                        >
                                            {/* Checkbox apenas na visualização otimizada */}
                                            {tipoVisualizacao === 'otimizada' && (
                                                <TableCell className="w-[50px] px-2 py-2 sticky left-0 z-10 bg-background border-r border-border">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleSelecionarLinha(idx)}
                                                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                                    />
                                                </TableCell>
                                            )}

                                            {colunas.map(col => {
                                                const isProduto = col === 'Produto';

                                                let classesCelula = 'px-2 py-2 text-xs text-card-foreground';

                                                if (col === 'Efetividade') {
                                                    classesCelula += ` font-bold ${getEfetividadeCor(row[col])} px-2 py-1 rounded text-center`;
                                                } else if (col.includes('Efetividade Parcial') || col === 'Efetividade Parcial') {
                                                    classesCelula += ` font-bold ${getEfetividadeParcialCor(row[col])} px-2 py-1 rounded text-center`;
                                                } else if (col.includes('% A Caminho') || col === '% A Caminho') {
                                                    classesCelula += ` font-bold ${getTaxaTransitoCor(row[col])} px-2 py-1 rounded text-center`;
                                                } else if (col.includes('% Devolvidos') || col === '% Devolvidos') {
                                                    classesCelula += ` font-bold ${getTaxaDevolucaoCor(row[col])} px-2 py-1 rounded text-center`;
                                                }

                                                if (isProduto) {
                                                    classesCelula += tipoVisualizacao === 'otimizada' ?
                                                        ' sticky left-[50px] z-10 bg-background border-r border-border min-w-[600px] max-w-[600px]' :
                                                        ' sticky left-0 z-10 bg-background border-r border-border min-w-[600px] max-w-[600px]';
                                                }

                                                return (
                                                    <TableCell
                                                        key={col}
                                                        className={classesCelula}
                                                    >
                                                        {col === 'Produto' ? (
                                                            <div className="flex items-center gap-3 w-full">
                                                                {(() => {
                                                                    const kitInfo = detectarKits(row[col]);
                                                                    return (
                                                                        <>
                                                                            <span className="text-lg flex-shrink-0">{kitInfo.icon}</span>
                                                                            <div className="flex-1 overflow-hidden">
                                                                                <div
                                                                                    className="text-sm whitespace-nowrap overflow-hidden text-ellipsis pr-2 cursor-help"
                                                                                    title={kitInfo.display}
                                                                                >
                                                                                    {kitInfo.display}
                                                                                </div>
                                                                            </div>
                                                                            {kitInfo.isKit && <Badge variant="secondary" className="text-xs flex-shrink-0">Kit</Badge>}
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
                                    );
                                })}
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
                                            <span className="text-sm text-muted-foreground">To prepare + Waiting for carrier + Assigned to carrier + Shipped + Unprocessed</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-red-500 rounded"></div>
                                            <span className="text-sm font-medium">Problemas:</span>
                                            <span className="text-sm text-muted-foreground">Invalid + Out of stock</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                                            <span className="text-sm font-medium">Devolução:</span>
                                            <span className="text-sm text-muted-foreground">Return + Rejected</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-gray-500 rounded"></div>
                                            <span className="text-sm font-medium">Cancelados:</span>
                                            <span className="text-sm text-muted-foreground">Deleted</span>
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

            {/* Modal de agrupamento */}
            <Dialog open={modalAgrupamento} onOpenChange={setModalAgrupamento}>
                <DialogContent className="border-border bg-popover max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-popover-foreground">Agrupar Itens Selecionados</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Digite um nome para o agrupamento dos {linhasSelecionadas.size} itens selecionados
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {/* Lista dos itens selecionados */}
                        <div className="max-h-32 overflow-y-auto border rounded p-2 bg-muted/50">
                            <div className="text-xs font-medium text-muted-foreground mb-2">Itens a serem agrupados:</div>
                            {Array.from(linhasSelecionadas).map(index => {
                                const dados = getDadosVisualizacao();
                                if (!dados) return null;
                                const dadosFiltrados = dados.filter(item => item.Produto !== 'Total');
                                const item = dadosFiltrados[index];
                                if (!item) return null;

                                return (
                                    <div key={index} className="text-xs text-foreground py-1 border-b border-border last:border-b-0">
                                        • {item.Produto} ({item.Total_Pedidos} pedidos)
                                    </div>
                                );
                            })}
                        </div>

                        {/* Campo nome do agrupamento */}
                        <div className="space-y-2">
                            <Label htmlFor="nome-agrupamento" className="text-foreground">Nome do Agrupamento</Label>
                            <Input
                                id="nome-agrupamento"
                                placeholder="Ex: Kits Similares de Perfume"
                                value={nomeAgrupamento}
                                onChange={(e) => setNomeAgrupamento(e.target.value)}
                                className="border-border bg-background text-foreground"
                            />
                        </div>

                        {/* Prévia das métricas */}
                        {linhasSelecionadas.size >= 2 && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border">
                                <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Prévia das métricas agrupadas:</div>
                                {(() => {
                                    const metricas = calcularMetricasAgrupadas(Array.from(linhasSelecionadas));
                                    if (!metricas) return null;

                                    return (
                                        <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                                            <div>Total Pedidos: {metricas.Total_Pedidos.toLocaleString()}</div>
                                            <div>Entregues: {metricas.Entregues.toLocaleString()}</div>
                                            <div>Efetividade: {metricas.Efetividade}</div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setModalAgrupamento(false)}
                            className="border-border bg-background text-foreground hover:bg-accent"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCriarAgrupamento}
                            disabled={!nomeAgrupamento.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Package className="h-4 w-4 mr-2" />
                            Criar Agrupamento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default N1ItaliaPage;