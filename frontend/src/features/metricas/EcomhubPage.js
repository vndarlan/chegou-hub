// frontend/src/features/metricas/EcomhubPage.js - VERSÃO MINIMALISTA SHADCN/UI
import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon, Download, Trash2, RefreshCw, Check, X, 
    AlertTriangle, TrendingUp, BarChart3, Eye, Search, Globe, 
    ArrowUpDown, ArrowUp, ArrowDown, Package, Target, Percent, 
    PieChart, Filter, Rocket, LayoutDashboard, Loader2
} from 'lucide-react';
import axios from 'axios';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Separator } from '../../components/ui/separator';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Calendar } from '../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';

const PAISES = [
    { value: 'todos', label: 'Todos os Países', emoji: '🌍' },
    { value: '164', label: 'Espanha', emoji: '🇪🇸' },
    { value: '41', label: 'Croácia', emoji: '🇭🇷' },
    { value: '66', label: 'Grécia', emoji: '🇬🇷' },
    { value: '82', label: 'Itália', emoji: '🇮🇹' },
    { value: '142', label: 'Romênia', emoji: '🇷🇴' },
    { value: '44', label: 'República Checa', emoji: '🇨🇿' },
    { value: '139', label: 'Polônia', emoji: '🇵🇱' }
];

function EcomhubPage() {
    // Estados principais
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [dadosResultado, setDadosResultado] = useState(null);
    const [secaoAtiva, setSecaoAtiva] = useState('gerar');
    const [tipoVisualizacao, setTipoVisualizacao] = useState('otimizada');
    
    // Estados do formulário com Calendar
    const [dataInicio, setDataInicio] = useState(null);
    const [dataFim, setDataFim] = useState(null);
    const [paisSelecionado, setPaisSelecionado] = useState('todos');
    
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

    // Estados para ordenação e controle de imagens
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');
    const [imagensComErro, setImagensComErro] = useState(new Set());

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

    const getAnalisesFiltradas = () => {
        if (paisSelecionado === 'todos') return analisesSalvas;
        const paisNome = PAISES.find(p => p.value === paisSelecionado)?.label;
        return analisesSalvas.filter(analise => 
            analise.nome.includes(paisNome) || analise.descricao?.includes(paisNome)
        );
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
        setProgressoAtual({ etapa: 'Iniciando...', porcentagem: 0 });

        try {
            const response = await axios.post('/metricas/ecomhub/analises/processar_selenium/', {
                data_inicio: dataInicio.toISOString().split('T')[0],
                data_fim: dataFim.toISOString().split('T')[0],
                pais_id: paisSelecionado
            });

            if (response.data.status === 'success') {
                setDadosResultado(response.data.dados_processados);
                showNotification('success', 'Dados processados com sucesso!');
                
                const paisNome = paisSelecionado === 'todos' ? 
                    'Todos os Países' : 
                    PAISES.find(p => p.value === paisSelecionado)?.label || 'País';
                const dataStr = `${dataInicio.toLocaleDateString()} - ${dataFim.toLocaleDateString()}`;
                setNomeAnalise(`${paisNome} ${dataStr}`);
            }
        } catch (error) {
            console.error('Erro no processamento:', error);
            showNotification('error', `Erro: ${error.response?.data?.message || error.message}`);
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
            const descricaoPais = paisSelecionado === 'todos' ? 
                'Automação Selenium - Todos os Países' :
                `Automação Selenium - ${PAISES.find(p => p.value === paisSelecionado)?.label}`;

            const response = await axios.post('/metricas/ecomhub/analises/', {
                nome: nomeAnalise,
                dados_efetividade: dadosResultado,
                tipo_metrica: 'produto',
                descricao: descricaoPais
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
        const nomeDisplay = nome.replace('[ECOMHUB] ', '');
        if (!window.confirm(`Deletar análise '${nomeDisplay}'?`)) return;

        setLoadingDelete(prev => ({ ...prev, [id]: true }));
        try {
            await axios.delete(`/metricas/ecomhub/analises/${id}/`);
            showNotification('success', `Análise deletada!`);
            fetchAnalises();
            
            if (dadosResultado && dadosResultado?.id === id) {
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

    // Cores das efetividades originais (4 níveis)
    const getEfetividadeCor = (valor) => {
        if (!valor || typeof valor !== 'string') return '';
        
        const numero = parseFloat(valor.replace('%', '').replace('(Média)', ''));
        
        if (numero >= 60) return 'bg-green-600 text-white'; // Verde escuro
        if (numero >= 50) return 'bg-green-500 text-white'; // Verde claro
        if (numero >= 40) return 'bg-yellow-500 text-black'; // Amarelo
        return 'bg-red-500 text-white'; // Vermelho
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

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    // Header minimalista
    const renderHeader = () => (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 mb-6 text-white">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <LayoutDashboard className="h-8 w-8" />
                    <div>
                        <h1 className="text-2xl font-bold">Métricas ECOMHUB</h1>
                        <p className="text-orange-100">Analytics Dashboard</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSecaoAtiva('instrucoes')}
                        className="bg-white/20 border-0 text-white hover:bg-white/30"
                    >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Instruções
                    </Button>
                    
                    <Select value={paisSelecionado} onValueChange={setPaisSelecionado}>
                        <SelectTrigger className="w-52 bg-white/20 border-white/30 text-white [&>span]:text-white">
                            <Globe className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAISES.map(pais => (
                                <SelectItem key={pais.value} value={pais.value}>
                                    {pais.emoji} {pais.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );

    // Formulário com Calendar
    const renderFormulario = () => (
        <Card className="mb-6 relative">
            {loadingProcessar && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur flex flex-col items-center justify-center z-10 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p className="font-medium mb-2">Processando dados...</p>
                    {progressoAtual && (
                        <>
                            <Progress value={progressoAtual.porcentagem} className="w-60 mb-2" />
                            <p className="text-sm text-muted-foreground">{progressoAtual.etapa}</p>
                        </>
                    )}
                </div>
            )}

            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Filter className="h-5 w-5 text-primary" />
                        <div>
                            <CardTitle>Configuração</CardTitle>
                            <CardDescription>Configure o período e execute</CardDescription>
                        </div>
                    </div>

                    <div className="flex items-end gap-4">
                        {/* Data Início com Calendar */}
                        <div>
                            <Label className="mb-2 block">Data de Início</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-48 justify-start text-left font-normal"
                                        disabled={loadingProcessar}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dataInicio ? dataInicio.toLocaleDateString('pt-BR') : "Selecionar data"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dataInicio}
                                        onSelect={setDataInicio}
                                        disabled={(date) => date > new Date()}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        
                        {/* Data Fim com Calendar */}
                        <div>
                            <Label className="mb-2 block">Data de Fim</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-48 justify-start text-left font-normal"
                                        disabled={loadingProcessar}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dataFim ? dataFim.toLocaleDateString('pt-BR') : "Selecionar data"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dataFim}
                                        onSelect={setDataFim}
                                        disabled={(date) => date > new Date() || (dataInicio && date < dataInicio)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        
                        <Button
                            onClick={processarDados}
                            disabled={!dataInicio || !dataFim || !paisSelecionado || loadingProcessar}
                            size="lg"
                            className="min-w-36"
                        >
                            {loadingProcessar ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Search className="h-4 w-4 mr-2" />
                            )}
                            {loadingProcessar ? 'Processando...' : 'Processar'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );

    // Estatísticas minimalistas
    const renderEstatisticas = () => {
        const dados = getDadosVisualizacao();
        if (tipoVisualizacao === 'total' || !dados || !Array.isArray(dados)) return null;
        
        const produtos = dados.filter(item => item.Produto !== 'Total');
        const totalProdutos = produtos.length;
        const efetividadeMedia = produtos.reduce((sum, item) => {
            const ef = parseFloat(item.Efetividade_Total?.replace('%', '') || 0);
            return sum + ef;
        }, 0) / totalProdutos;
        const totalVendas = produtos.reduce((sum, item) => sum + (item.Entregues || 0), 0);
        const totalLeads = produtos.reduce((sum, item) => sum + (item.Totais || 0), 0);
        
        return (
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Produtos</p>
                                <p className="text-xl font-bold">{totalProdutos}</p>
                            </div>
                            <Package className="h-5 w-5 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Entregues</p>
                                <p className="text-xl font-bold text-green-600">{totalVendas.toLocaleString()}</p>
                            </div>
                            <TrendingUp className="h-5 w-5 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Totais</p>
                                <p className="text-xl font-bold text-blue-600">{totalLeads.toLocaleString()}</p>
                            </div>
                            <Target className="h-5 w-5 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
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

    const renderImagemProduto = (value, rowIndex) => {
        const imageKey = `${rowIndex}-${value}`;
        const hasError = imagensComErro.has(imageKey);
        
        if (!value || hasError) {
            return <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-lg">📦</div>;
        }

        return (
            <img 
                src={value} 
                alt="Produto" 
                className="w-10 h-10 object-cover rounded border"
                onError={() => setImagensComErro(prev => new Set(prev).add(imageKey))}
            />
        );
    };

    // Tabela responsiva e menor
    const renderResultados = () => {
        const dados = getDadosVisualizacao();
        if (!dados || !Array.isArray(dados)) return null;

        const colunas = Object.keys(dados[0] || {});
        const dadosOrdenados = sortData(dados, sortBy, sortOrder);

        return (
            <Card className="mb-6">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Resultados</CardTitle>
                            <CardDescription>{dados.length} registros</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Tabs value={tipoVisualizacao} onValueChange={setTipoVisualizacao}>
                                <TabsList className="grid w-fit grid-cols-2">
                                    <TabsTrigger value="otimizada">Otimizada</TabsTrigger>
                                    <TabsTrigger value="total">Total</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <Button variant="outline" size="sm" onClick={() => setModalSalvar(true)}>
                                <Download className="h-4 w-4 mr-2" />
                                Salvar
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="relative">
                        <ScrollArea className="h-96 w-full">
                            <div className="min-w-full">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            {colunas.map(col => (
                                                <TableHead key={col} className="whitespace-nowrap">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-auto p-0 font-medium"
                                                        onClick={() => handleSort(col)}
                                                    >
                                                        {col.replace('_', ' ')}
                                                        {sortBy === col ? (
                                                            sortOrder === 'asc' ? 
                                                                <ArrowUp className="ml-1 h-3 w-3" /> : 
                                                                <ArrowDown className="ml-1 h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                                        )}
                                                    </Button>
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dadosOrdenados.map((row, idx) => (
                                            <TableRow key={idx} className={row.Produto === 'Total' ? 'bg-muted/20 font-medium' : ''}>
                                                {Object.entries(row).map(([col, value]) => (
                                                    <TableCell
                                                        key={col}
                                                        className={`whitespace-nowrap ${
                                                            tipoVisualizacao === 'otimizada' &&
                                                            (col === 'Efetividade_Total' || col === 'Efetividade_Parcial') ?
                                                            `font-bold ${getEfetividadeCor(value)} px-2 py-1 rounded text-center` : ''
                                                        }`}
                                                    >
                                                        {col === 'Imagem' ? (
                                                            renderImagemProduto(value, idx)
                                                        ) : (
                                                            typeof value === 'number' ? value.toLocaleString() : value
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>
        );
    };

    // Análises salvas minimalista
    const renderAnalisesSalvas = () => {
        const analisesFiltradas = getAnalisesFiltradas();
        
        return (
            <Card className="relative">
                {loadingAnalises && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur flex items-center justify-center z-10 rounded-lg">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                )}

                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Análises Salvas</CardTitle>
                            <CardDescription>{analisesFiltradas.length} análises encontradas</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchAnalises}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Atualizar
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {analisesFiltradas.length === 0 ? (
                        <Alert>
                            <BarChart3 className="h-4 w-4" />
                            <AlertDescription>
                                Nenhuma análise salva encontrada. Processe dados e salve o resultado.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {analisesFiltradas.map(analise => (
                                <Card key={analise.id} className="relative">
                                    {loadingDelete[analise.id] && (
                                        <div className="absolute inset-0 bg-white/80 backdrop-blur flex items-center justify-center z-10 rounded-lg">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </div>
                                    )}

                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-medium text-sm truncate max-w-[80%]">
                                                {analise.nome.replace('[ECOMHUB] ', '')}
                                            </h3>
                                            <Badge variant="secondary" className="text-xs">ECOMHUB</Badge>
                                        </div>

                                        <p className="text-xs text-muted-foreground mb-3">
                                            {new Date(analise.criado_em).toLocaleDateString('pt-BR')}
                                        </p>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => carregarAnalise(analise)}
                                                className="flex-1"
                                            >
                                                <Eye className="h-3 w-3 mr-1" />
                                                Carregar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => deletarAnalise(analise.id, analise.nome)}
                                                disabled={loadingDelete[analise.id]}
                                                className="text-red-600 border-red-200 hover:bg-red-50"
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

    // Instruções minimalistas
    const renderInstrucoes = () => (
        <Card>
            <CardHeader>
                <CardTitle className="text-blue-600">Instruções - ECOMHUB</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h4 className="font-semibold text-green-600 mb-2">Visualização Otimizada</h4>
                    <p className="text-sm text-muted-foreground mb-3">Colunas agrupadas para análise eficiente</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div className="border border-blue-200 rounded p-2">
                            <p className="font-medium text-blue-600 text-xs">Totais</p>
                            <p className="text-xs text-muted-foreground">Soma de todos os pedidos</p>
                        </div>
                        <div className="border border-green-200 rounded p-2">
                            <p className="font-medium text-green-600 text-xs">Finalizados</p>
                            <p className="text-xs text-muted-foreground">Delivered + issue + returning + returned + cancelled</p>
                        </div>
                        <div className="border border-orange-200 rounded p-2">
                            <p className="font-medium text-orange-600 text-xs">Em Trânsito</p>
                            <p className="text-xs text-muted-foreground">Out_for_delivery + preparing + ready + courier</p>
                        </div>
                        <div className="border border-red-200 rounded p-2">
                            <p className="font-medium text-red-600 text-xs">Problemas</p>
                            <p className="text-xs text-muted-foreground">Apenas "issue"</p>
                        </div>
                    </div>
                </div>

                <Separator />

                <div>
                    <h4 className="font-semibold text-purple-600 mb-2">Todos os Países</h4>
                    <div className="space-y-1 text-sm">
                        <p>• <strong>Inclui:</strong> Espanha, Croácia, Grécia, Itália, Romênia, República Checa, Polônia</p>
                        <p>• <strong>Análise:</strong> Dados consolidados em tabela unificada</p>
                        <p>• <strong>Performance:</strong> Consulta simultânea para eficiência</p>
                    </div>
                </div>

                <Separator />

                <div>
                    <h5 className="font-medium text-indigo-600 mb-2">Cores das Efetividades:</h5>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-3 bg-green-600 rounded"></div>
                            <span className="text-xs">≥ 60% (Excelente)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-3 bg-green-500 rounded"></div>
                            <span className="text-xs">≥ 50% (Boa)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-3 bg-yellow-500 rounded"></div>
                            <span className="text-xs">≥ 40% (Regular)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-3 bg-red-500 rounded"></div>
                            <span className="text-xs">&lt; 40% (Ruim)</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    // ======================== EFEITOS ========================

    useEffect(() => {
        fetchAnalises();
    }, []);

    // ======================== RENDER PRINCIPAL ========================

    return (
        <div className="flex-1 space-y-4 p-6 bg-gray-50/30 min-h-screen">
            {/* Notificações */}
            {notification && (
                <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className="mb-4">
                    {notification.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <AlertDescription>{notification.message}</AlertDescription>
                </Alert>
            )}

            {/* Header */}
            {renderHeader()}

            {/* Navegação */}
            {paisSelecionado && (
                <Tabs value={secaoAtiva} onValueChange={setSecaoAtiva} className="w-full">
                    <TabsList className="grid w-fit grid-cols-2">
                        <TabsTrigger value="gerar">
                            <Rocket className="h-4 w-4 mr-2" />
                            Gerar
                        </TabsTrigger>
                        <TabsTrigger value="salvas">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Salvas
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="gerar" className="space-y-4">
                        {renderFormulario()}
                        {renderEstatisticas()}
                        {renderResultados()}
                    </TabsContent>

                    <TabsContent value="salvas">
                        {renderAnalisesSalvas()}
                    </TabsContent>
                </Tabs>
            )}

            {/* Instruções */}
            {secaoAtiva === 'instrucoes' && renderInstrucoes()}

            {/* Modal salvar */}
            <Dialog open={modalSalvar} onOpenChange={setModalSalvar}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Salvar Análise</DialogTitle>
                        <DialogDescription>Digite um nome para identificar esta análise</DialogDescription>
                    </DialogHeader>
                    
                    <div className="relative py-4">
                        {loadingSalvar && (
                            <div className="absolute inset-0 bg-white/90 backdrop-blur flex items-center justify-center z-10 rounded">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="nome-analise">Nome da Análise</Label>
                            <Input
                                id="nome-analise"
                                placeholder="Ex: República Checa Janeiro 2025"
                                value={nomeAnalise}
                                onChange={(e) => setNomeAnalise(e.target.value)}
                                disabled={loadingSalvar}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalSalvar(false)} disabled={loadingSalvar}>
                            Cancelar
                        </Button>
                        <Button onClick={salvarAnalise} disabled={!nomeAnalise || loadingSalvar}>
                            {loadingSalvar ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                            {loadingSalvar ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default EcomhubPage;