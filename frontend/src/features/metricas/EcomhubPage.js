// frontend/src/features/metricas/EcomhubPage.js - VERSÃO CORRIGIDA
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
import { DateRangePicker } from '../../components/ui/date-range-picker';

const PAISES = [
    { value: 'todos', label: 'Todos os Países' },
    { value: '164', label: 'Espanha' },
    { value: '41', label: 'Croácia' },
    { value: '66', label: 'Grécia' },
    { value: '82', label: 'Itália' },
    { value: '142', label: 'Romênia' },
    { value: '44', label: 'República Checa' },
    { value: '139', label: 'Polônia' }
];

function EcomhubPage() {
    // Estados principais
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [dadosResultado, setDadosResultado] = useState(null);
    const [secaoAtiva, setSecaoAtiva] = useState('gerar');
    const [tipoVisualizacao, setTipoVisualizacao] = useState('otimizada');
    
    // Estados do formulário - usando DateRange
    const [dateRange, setDateRange] = useState({
        from: undefined,
        to: undefined
    });
    const [paisSelecionado, setPaisSelecionado] = useState('todos');
    
    // Estados de modal e loading
    const [modalSalvar, setModalSalvar] = useState(false);
    const [modalInstrucoes, setModalInstrucoes] = useState(false);
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
        if (!dateRange?.from || !dateRange?.to || !paisSelecionado) {
            showNotification('error', 'Selecione o período e o país');
            return;
        }

        if (dateRange.from > dateRange.to) {
            showNotification('error', 'Data de início deve ser anterior à data fim');
            return;
        }

        setLoadingProcessar(true);
        setProgressoAtual({ etapa: 'Iniciando...', porcentagem: 0 });

        try {
            const response = await axios.post('/metricas/ecomhub/analises/processar_selenium/', {
                data_inicio: dateRange.from.toISOString().split('T')[0],
                data_fim: dateRange.to.toISOString().split('T')[0],
                pais_id: paisSelecionado
            });

            if (response.data.status === 'success') {
                setDadosResultado(response.data.dados_processados);
                showNotification('success', 'Dados processados com sucesso!');
                
                const paisNome = paisSelecionado === 'todos' ? 
                    'Todos os Países' : 
                    PAISES.find(p => p.value === paisSelecionado)?.label || 'País';
                const dataStr = `${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}`;
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

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    // Header minimalista
    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Análise de Efetividade por Produto</h1>
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
                
                <Select value={paisSelecionado} onValueChange={setPaisSelecionado}>
                    <SelectTrigger className="w-52 border-border bg-background text-foreground">
                        <Globe className="h-4 w-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-popover">
                        {PAISES.map(pais => (
                            <SelectItem key={pais.value} value={pais.value} className="text-popover-foreground hover:bg-accent">
                                {pais.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    // Formulário com input type="date" (mais confiável)
    const renderFormulario = () => (
        <Card className="mb-6 relative border-border bg-card">
            {loadingProcessar && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur flex flex-col items-center justify-center z-10 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                    <p className="font-medium mb-2 text-foreground">Processando dados...</p>
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
                            <CardTitle className="text-card-foreground">Configuração</CardTitle>
                            <CardDescription className="text-muted-foreground">Configure o período e execute</CardDescription>
                        </div>
                    </div>

                    <div className="flex items-end gap-4">
                        {/* Date Range Picker */}
                        <div>
                            <Label className="mb-2 block text-foreground">Período</Label>
                            <DateRangePicker
                                dateRange={dateRange}
                                onDateRangeChange={setDateRange}
                                disabled={loadingProcessar}
                                className="w-80"
                                placeholder="Selecione o período..."
                            />
                        </div>
                        
                        <Button
                            onClick={processarDados}
                            disabled={!dateRange?.from || !dateRange?.to || !paisSelecionado || loadingProcessar}
                            size="lg"
                            className="min-w-36 bg-primary text-primary-foreground hover:bg-primary/90"
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

    // Estatísticas
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
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Produtos</p>
                                <p className="text-xl font-bold text-card-foreground">{totalProdutos}</p>
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
                                <p className="text-xl font-bold text-green-600">{totalVendas.toLocaleString()}</p>
                            </div>
                            <TrendingUp className="h-5 w-5 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-border bg-card">
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

    const renderImagemProduto = (value, rowIndex) => {
        const imageKey = `${rowIndex}-${value}`;
        const hasError = imagensComErro.has(imageKey);
        
        if (!value || hasError) {
            return <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-sm">📦</div>;
        }

        return (
            <img 
                src={value} 
                alt="Produto" 
                className="w-8 h-8 object-cover rounded border"
                onError={() => setImagensComErro(prev => new Set(prev).add(imageKey))}
            />
        );
    };

    // Tabela responsiva
    const renderResultados = () => {
        const dados = getDadosVisualizacao();
        if (!dados || !Array.isArray(dados)) return null;

        let colunas = Object.keys(dados[0] || {});
        const dadosOrdenados = sortData(dados, sortBy, sortOrder);

        const colunasEssenciais = ['Produto', 'Totais', 'Entregues', 'Efetividade_Total'];
        const isMobile = window.innerWidth < 768;
        
        if (isMobile && tipoVisualizacao === 'otimizada') {
            colunas = colunas.filter(col => colunasEssenciais.includes(col));
        }

        return (
            <Card className="mb-6 border-border bg-card">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg text-card-foreground">Resultados</CardTitle>
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
                    <div className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 border-border">
                                        {colunas.map(col => (
                                            <TableHead key={col} className="whitespace-nowrap px-2 py-2 text-xs text-muted-foreground">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-auto p-0 font-medium text-xs text-muted-foreground hover:text-foreground"
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
                                        <TableRow key={idx} className={`border-border ${row.Produto === 'Total' ? 'bg-muted/20 font-medium' : ''}`}>
                                            {colunas.map(col => (
                                                <TableCell
                                                    key={col}
                                                    className={`px-2 py-2 text-xs text-card-foreground ${
                                                        tipoVisualizacao === 'otimizada' &&
                                                        (col === 'Efetividade_Total' || col === 'Efetividade_Parcial') ?
                                                        `font-bold ${getEfetividadeCor(row[col])} px-2 py-1 rounded text-center` : ''
                                                    }`}
                                                >
                                                    {col === 'Imagem' ? (
                                                        renderImagemProduto(row[col], idx)
                                                    ) : col === 'Produto' ? (
                                                        <div className="max-w-[120px] truncate" title={row[col]}>
                                                            {row[col]}
                                                        </div>
                                                    ) : (
                                                        typeof row[col] === 'number' ? row[col].toLocaleString() : row[col]
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    // Análises salvas
    const renderAnalisesSalvas = () => {
        const analisesFiltradas = getAnalisesFiltradas();
        
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
                            <CardTitle className="text-card-foreground">Análises Salvas</CardTitle>
                            <CardDescription className="text-muted-foreground">{analisesFiltradas.length} análises encontradas</CardDescription>
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
                    {analisesFiltradas.length === 0 ? (
                        <Alert className="border-border bg-background">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <AlertDescription className="text-muted-foreground">
                                Nenhuma análise salva encontrada. Processe dados e salve o resultado.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {analisesFiltradas.map(analise => (
                                <Card key={analise.id} className="relative border-border bg-card">
                                    {loadingDelete[analise.id] && (
                                        <div className="absolute inset-0 bg-background/80 backdrop-blur flex items-center justify-center z-10 rounded-lg">
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        </div>
                                    )}

                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-medium text-sm truncate max-w-[80%] text-card-foreground">
                                                {analise.nome.replace('[ECOMHUB] ', '')}
                                            </h3>
                                            <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">ECOMHUB</Badge>
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
        
        // Definir período padrão (última semana)
        const hoje = new Date();
        const setemantepassada = new Date();
        setemantepassada.setDate(hoje.getDate() - 7);
        
        setDateRange({
            from: setemantepassada,
            to: hoje
        });
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

            {/* Header minimalista */}
            {renderHeader()}

            {/* Navegação */}
            {paisSelecionado && (
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
                        {renderFormulario()}
                        {renderEstatisticas()}
                        {renderResultados()}
                    </TabsContent>

                    <TabsContent value="salvas">
                        {renderAnalisesSalvas()}
                    </TabsContent>
                </Tabs>
            )}

            {/* Modal instruções */}
            <Dialog open={modalInstrucoes} onOpenChange={setModalInstrucoes}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto border-border bg-popover">
                    <DialogHeader>
                        <DialogTitle className="text-blue-600">Manual de Instruções - Métricas ECOMHUB</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Guia completo para uso da ferramenta
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-lg font-semibold text-green-600 mb-3">Visualização Otimizada</h4>
                            <p className="text-sm text-muted-foreground mb-4">Colunas agrupadas para análise mais eficiente:</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="border-blue-200 bg-card">
                                    <CardContent className="p-4">
                                        <h5 className="font-semibold text-blue-600 text-sm">Totais</h5>
                                        <p className="text-xs text-muted-foreground">Soma de todos os pedidos (todos os status)</p>
                                    </CardContent>
                                </Card>
                                
                                <Card className="border-green-200 bg-card">
                                    <CardContent className="p-4">
                                        <h5 className="font-semibold text-green-600 text-sm">Finalizados</h5>
                                        <p className="text-xs text-muted-foreground">"delivered" + "issue" + "returning" + "returned" + "cancelled"</p>
                                    </CardContent>
                                </Card>
                                
                                <Card className="border-orange-200 bg-card">
                                    <CardContent className="p-4">
                                        <h5 className="font-semibold text-orange-600 text-sm">Em Trânsito</h5>
                                        <p className="text-xs text-muted-foreground">"out_for_delivery" + "preparing_for_shipping" + "ready_to_ship" + "with_courier"</p>
                                    </CardContent>
                                </Card>
                                
                                <Card className="border-red-200 bg-card">
                                    <CardContent className="p-4">
                                        <h5 className="font-semibold text-red-600 text-sm">Problemas</h5>
                                        <p className="text-xs text-muted-foreground">Apenas "issue"</p>
                                    </CardContent>
                                </Card>
                                
                                <Card className="border-purple-200 bg-card">
                                    <CardContent className="p-4">
                                        <h5 className="font-semibold text-purple-600 text-sm">Devolução</h5>
                                        <p className="text-xs text-muted-foreground">"returning" + "returned" + "issue"</p>
                                    </CardContent>
                                </Card>
                                
                                <Card className="border-gray-200 bg-card">
                                    <CardContent className="p-4">
                                        <h5 className="font-semibold text-gray-600 text-sm">Cancelados</h5>
                                        <p className="text-xs text-muted-foreground">"cancelled"</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h4 className="text-lg font-semibold text-purple-600 mb-3">🌍 Opção "Todos os Países"</h4>
                            <p className="text-sm text-muted-foreground mb-4">Funcionalidades especiais quando "Todos" está selecionado:</p>
                            
                            <div className="space-y-2">
                                <p className="text-sm text-foreground">• <strong>Países Incluídos:</strong> Espanha, Croácia, Grécia, Itália, Romênia, República Checa e Polônia</p>
                                <p className="text-sm text-foreground">• <strong>Métricas Salvas:</strong> Exibe análises de todos os países em uma única lista</p>
                                <p className="text-sm text-foreground">• <strong>Gerar Métricas:</strong> Combina dados de todos os 7 países em uma tabela unificada</p>
                                <p className="text-sm text-foreground">• <strong>Processamento:</strong> Consulta todos os países simultaneamente para maior eficiência</p>
                                <p className="text-sm text-foreground">• <strong>Análise Comparativa:</strong> Permite comparar performance entre produtos de diferentes países</p>
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h5 className="font-semibold text-teal-600 mb-2">Percentuais Calculados:</h5>
                            <div className="space-y-1">
                                <p className="text-sm text-foreground">• <strong>% A Caminho:</strong> (Em Trânsito ÷ Totais) × 100</p>
                                <p className="text-sm text-foreground">• <strong>% Devolvidos:</strong> (Devolução ÷ Totais) × 100</p>
                                <p className="text-sm text-foreground">• <strong>Efetividade Parcial:</strong> (Entregues ÷ Finalizados) × 100</p>
                                <p className="text-sm text-foreground">• <strong>Efetividade Total:</strong> (Entregues ÷ Totais) × 100</p>
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h4 className="text-lg font-semibold text-orange-600 mb-3">Visualização Total</h4>
                            <p className="text-sm text-muted-foreground">Mostra todos os status individuais conforme retornados da API ECOMHUB, sem agrupamentos.</p>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h5 className="font-semibold text-indigo-600 mb-2">Cores das Métricas:</h5>
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
                                    <span className="text-sm text-foreground">Efetividade &lt; 40% (Ruim)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal salvar */}
            <Dialog open={modalSalvar} onOpenChange={setModalSalvar}>
                <DialogContent className="border-border bg-popover">
                    <DialogHeader>
                        <DialogTitle className="text-popover-foreground">Salvar Análise</DialogTitle>
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
                                placeholder="Ex: República Checa Janeiro 2025"
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

export default EcomhubPage;