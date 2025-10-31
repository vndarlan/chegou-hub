// frontend/src/features/metricas/EcomhubEfetividadeV2Page.js
import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon, Download, Trash2, RefreshCw, Check, X,
    AlertTriangle, TrendingUp, BarChart3, Eye, Search, Store,
    ArrowUpDown, ArrowUp, ArrowDown, Package, Target, Percent,
    Rocket, LayoutDashboard, Loader2, Minus, Plus, Database
} from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../datepicker-custom.css';

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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';

function EcomhubEfetividadeV2Page() {
    // Estados principais
    const [lojas, setLojas] = useState([]);
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [dadosResultado, setDadosResultado] = useState(null);
    const [secaoAtiva, setSecaoAtiva] = useState('gerar');
    const [tipoVisualizacao, setTipoVisualizacao] = useState('otimizada');

    // Estados do formulário
    const [lojaSelecionada, setLojaSelecionada] = useState('todas');
    const [periodoPreset, setPeriodoPreset] = useState(null);
    const [dateRange, setDateRange] = useState({
        from: undefined,
        to: undefined
    });

    // Estados de modal e loading
    const [modalSalvar, setModalSalvar] = useState(false);
    const [modalInstrucoes, setModalInstrucoes] = useState(false);
    const [nomeAnalise, setNomeAnalise] = useState('');
    const [loadingProcessar, setLoadingProcessar] = useState(false);
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [loadingAnalises, setLoadingAnalises] = useState(false);
    const [loadingLojas, setLoadingLojas] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState({});

    // Estados de notificação
    const [notification, setNotification] = useState(null);

    // Estado para controlar Popover do Calendar
    const [openPopover, setOpenPopover] = useState(false);

    // Estados para ordenação
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');

    // Estado para largura da coluna Produto
    const [larguraProduto, setLarguraProduto] = useState(() => {
        const saved = localStorage.getItem('ecomhub_v2_largura_produto');
        return saved ? parseInt(saved, 10) : 150;
    });

    // ======================== FUNÇÕES DE API ========================

    const fetchLojas = async () => {
        setLoadingLojas(true);
        try {
            const response = await axios.get('/metricas/ecomhub/efetividade-v2/stores_disponiveis/');
            setLojas(response.data.stores || []);
        } catch (error) {
            console.error('Erro ao buscar lojas:', error);
            showNotification('error', 'Erro ao carregar lojas disponíveis');
        } finally {
            setLoadingLojas(false);
        }
    };

    const fetchAnalises = async () => {
        setLoadingAnalises(true);
        try {
            const response = await axios.get('/metricas/ecomhub/efetividade-v2/');
            setAnalisesSalvas(response.data);
        } catch (error) {
            console.error('Erro ao buscar análises:', error);
            showNotification('error', 'Erro ao carregar análises salvas');
        } finally {
            setLoadingAnalises(false);
        }
    };

    const getAnalisesFiltradas = () => {
        if (lojaSelecionada === 'todas') return analisesSalvas;
        const lojaNome = lojas.find(l => l.id.toString() === lojaSelecionada)?.name;
        return analisesSalvas.filter(analise =>
            analise.nome.includes(lojaNome) || analise.descricao?.includes(lojaNome)
        );
    };

    const processarDados = async () => {
        if (!dateRange?.from || !dateRange?.to) {
            showNotification('error', 'Selecione o período completo');
            return;
        }

        if (dateRange.from > dateRange.to) {
            showNotification('error', 'Data de início deve ser anterior à data fim');
            return;
        }

        setLoadingProcessar(true);

        try {
            const payload = {
                data_inicio: dateRange.from.toISOString().split('T')[0],
                data_fim: dateRange.to.toISOString().split('T')[0],
                store_id: lojaSelecionada === 'todas' ? null : lojaSelecionada
            };

            const response = await axios.post('/metricas/ecomhub/efetividade-v2/processar_tempo_real/', payload);

            if (response.data.status === 'success') {
                // Salvar TODA a resposta, não só dados_processados
                setDadosResultado({
                    dados_processados: response.data.dados_processados,
                    estatisticas: response.data.estatisticas,
                    lojas_processadas: response.data.lojas_processadas,
                    dados_brutos: response.data.dados_brutos || []
                });
                showNotification('success', 'Dados processados com sucesso!');

                const lojaNome = lojaSelecionada === 'todas' ?
                    'Todas as Lojas' :
                    lojas.find(l => l.id.toString() === lojaSelecionada)?.name || 'Loja';
                const dataStr = `${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}`;
                setNomeAnalise(`${lojaNome} ${dataStr}`);
            }
        } catch (error) {
            console.error('Erro no processamento:', error);
            showNotification('error', `Erro: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingProcessar(false);
        }
    };

    const salvarAnalise = async () => {
        if (!dadosResultado || !nomeAnalise) {
            showNotification('error', 'Dados ou nome da análise inválidos');
            return;
        }

        setLoadingSalvar(true);
        try {
            const lojaNome = lojaSelecionada === 'todas' ?
                'API Tempo Real - Todas as Lojas' :
                `API Tempo Real - ${lojas.find(l => l.id.toString() === lojaSelecionada)?.name}`;

            const response = await axios.post('/metricas/ecomhub/efetividade-v2/', {
                nome: nomeAnalise,
                descricao: lojaNome,
                data_inicio: dateRange.from.toISOString().split('T')[0],
                data_fim: dateRange.to.toISOString().split('T')[0],
                store: lojaSelecionada === 'todas' ? null : parseInt(lojaSelecionada),
                dados_brutos: dadosResultado.dados_brutos || [],
                dados_processados: dadosResultado.dados_processados,
                estatisticas: dadosResultado.estatisticas || {}
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
        const nomeDisplay = nome.replace('[ECOMHUB V2] ', '');
        if (!window.confirm(`Deletar análise '${nomeDisplay}'?`)) return;

        setLoadingDelete(prev => ({ ...prev, [id]: true }));
        try {
            await axios.delete(`/metricas/ecomhub/efetividade-v2/${id}/`);
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

    const aplicarPreset = (preset) => {
        const hoje = new Date();
        const dataInicio = new Date();

        switch (preset) {
            case 'semana':
                dataInicio.setDate(hoje.getDate() - 7);
                break;
            case 'mes':
                dataInicio.setDate(hoje.getDate() - 30);
                break;
            case '3meses':
                dataInicio.setDate(hoje.getDate() - 90);
                break;
            default:
                return;
        }

        setDateRange({ from: dataInicio, to: hoje });
        setPeriodoPreset(preset);
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
        if (!dadosResultado?.dados_processados) return null;
        return tipoVisualizacao === 'otimizada' ?
            dadosResultado.dados_processados.visualizacao_otimizada :
            dadosResultado.dados_processados.visualizacao_total;
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

    const aumentarLarguraProduto = () => {
        setLarguraProduto(prev => {
            const novaLargura = Math.min(prev + 30, 400);
            localStorage.setItem('ecomhub_v2_largura_produto', novaLargura);
            return novaLargura;
        });
    };

    const diminuirLarguraProduto = () => {
        setLarguraProduto(prev => {
            const novaLargura = Math.max(prev - 30, 120);
            localStorage.setItem('ecomhub_v2_largura_produto', novaLargura);
            return novaLargura;
        });
    };

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    // Header
    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Efetividade V2 - API Tempo Real</h1>
                    <p className="text-sm text-muted-foreground">Análise por loja usando dados da API ECOMHUB</p>
                </div>
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

                <Select value={lojaSelecionada} onValueChange={setLojaSelecionada}>
                    <SelectTrigger className="w-64 border-border bg-background text-foreground">
                        <Store className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Selecione uma loja" />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-popover">
                        <SelectItem value="todas" className="text-popover-foreground hover:bg-accent">
                            Todas as Lojas
                        </SelectItem>
                        {lojas.map(loja => (
                            <SelectItem key={loja.id} value={loja.id.toString()} className="text-popover-foreground hover:bg-accent">
                                {loja.name} ({loja.country_name})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    // Formulário
    const renderFormulario = () => (
        <div className="mb-6 relative">
            {loadingProcessar && (
                <div className="fixed inset-0 bg-background/95 backdrop-blur flex items-center justify-center z-50">
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="font-medium text-foreground">Buscando</p>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {/* Períodos Rápidos + Período Personalizado */}
                <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            onClick={() => aplicarPreset('semana')}
                            variant={periodoPreset === 'semana' ? 'default' : 'outline'}
                            size="sm"
                        >
                            Última Semana
                        </Button>
                        <Button
                            onClick={() => aplicarPreset('mes')}
                            variant={periodoPreset === 'mes' ? 'default' : 'outline'}
                            size="sm"
                        >
                            Último Mês
                        </Button>
                        <Button
                            onClick={() => aplicarPreset('3meses')}
                            variant={periodoPreset === '3meses' ? 'default' : 'outline'}
                            size="sm"
                        >
                            Últimos 3 Meses
                        </Button>

                        {/* Popover com ReactDatePicker */}
                        <Popover open={openPopover} onOpenChange={setOpenPopover}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={periodoPreset === null && dateRange?.from ? 'default' : 'outline'}
                                    size="sm"
                                    className="gap-2"
                                >
                                    <CalendarIcon className="h-4 w-4" />
                                    Período Personalizado
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 max-w-none" align="start">
                                <div className="p-4 space-y-4">
                                    <ReactDatePicker
                                        selectsRange={true}
                                        startDate={dateRange?.from}
                                        endDate={dateRange?.to}
                                        onChange={(dates) => {
                                            const [start, end] = dates;
                                            setDateRange({ from: start, to: end });
                                            setPeriodoPreset(null);
                                        }}
                                        monthsShown={2}
                                        dateFormat="dd/MM/yyyy"
                                        locale={ptBR}
                                        inline
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setOpenPopover(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => setOpenPopover(false)}
                                            disabled={!dateRange?.from || !dateRange?.to}
                                        >
                                            Aplicar
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Mostrar período selecionado */}
                    {dateRange?.from && dateRange?.to && (
                        <p className="text-xs text-muted-foreground">
                            Período selecionado: {format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} até {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                    )}
                </div>

                {/* Botão Buscar */}
                <div className="flex justify-center">
                    <Button
                        onClick={processarDados}
                        disabled={!dateRange?.from || !dateRange?.to || loadingProcessar}
                        size="lg"
                        className="min-w-48"
                    >
                        {loadingProcessar ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Buscando
                            </>
                        ) : (
                            <>
                                <Search className="h-4 w-4 mr-2" />
                                Buscar
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );

    // Cards de métricas (após processar)
    const renderCardsMetricas = () => {
        const dados = getDadosVisualizacao();
        if (tipoVisualizacao === 'total' || !dados || !Array.isArray(dados)) return null;

        const produtos = dados.filter(item => item.Produto !== 'Total');
        const totalProdutos = produtos.length;
        const totalVendas = produtos.reduce((sum, item) => sum + (item.Entregues || 0), 0);
        const totalLeads = produtos.reduce((sum, item) => sum + (item.Totais || 0), 0);
        const efetividadeMedia = produtos.reduce((sum, item) => {
            const ef = parseFloat(item.Efetividade_Total?.replace('%', '') || 0);
            return sum + ef;
        }, 0) / (totalProdutos || 1);

        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total de Produtos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-card-foreground">{totalProdutos}</div>
                            <Package className="h-6 w-6 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Vendas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-blue-600">{totalLeads.toLocaleString()}</div>
                            <Target className="h-6 w-6 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Entregues
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-green-600">{totalVendas.toLocaleString()}</div>
                            <TrendingUp className="h-6 w-6 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Efetividade Média
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-orange-600">{efetividadeMedia.toFixed(1)}%</div>
                            <Percent className="h-6 w-6 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    // Tabela de resultados
    const renderResultados = () => {
        const dados = getDadosVisualizacao();
        if (!dados || !Array.isArray(dados) || dados.length === 0) return null;

        let colunas = Object.keys(dados[0] || {}).filter(col =>
            col !== 'Imagem' && !col.startsWith('_')  // Remove _efetividade_total_num, etc
        );
        if (colunas.length === 0) return null;

        const dadosOrdenados = sortData(dados, sortBy, sortOrder);

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
                    <div className="w-full max-w-[calc(100vw-280px)] overflow-x-auto">
                        <Table className="w-full" style={{ minWidth: 'max-content' }}>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border">
                                    {colunas.map(col => {
                                        const isProduto = col === 'Produto';
                                        const isPais = col === 'Pais';

                                        let classesHeader = 'whitespace-nowrap px-3 py-2 text-xs text-muted-foreground';
                                        let styleHeader = {};

                                        if (isProduto) {
                                            classesHeader += ' sticky left-0 z-20 bg-background border-r border-border';
                                            styleHeader = { minWidth: `${larguraProduto}px`, width: `${larguraProduto}px`, maxWidth: `${larguraProduto}px` };
                                        } else if (isPais) {
                                            styleHeader = { minWidth: '60px', maxWidth: '80px' };
                                        } else {
                                            // Colunas adaptáveis: crescem conforme o conteúdo
                                            styleHeader = { minWidth: '80px' };
                                        }

                                        return (
                                            <TableHead key={col} className={classesHeader} style={styleHeader}>
                                                {isProduto ? (
                                                    <div className="flex items-center justify-between gap-1">
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
                                                        <div className="flex items-center gap-0.5">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={diminuirLarguraProduto}
                                                                disabled={larguraProduto <= 120}
                                                                className="h-5 w-5 p-0 hover:bg-accent"
                                                                title="Diminuir largura"
                                                            >
                                                                <Minus className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={aumentarLarguraProduto}
                                                                disabled={larguraProduto >= 400}
                                                                className="h-5 w-5 p-0 hover:bg-accent"
                                                                title="Aumentar largura"
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
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
                                                )}
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
                                            const isPais = col === 'Pais';

                                            let classesCelula = 'px-3 py-2 text-xs text-card-foreground whitespace-nowrap';
                                            let styleCelula = {};

                                            if (tipoVisualizacao === 'otimizada' && (col === 'Efetividade_Total' || col === 'Efetividade_Parcial')) {
                                                classesCelula += ` font-bold ${getEfetividadeCor(row[col])} px-2 py-1 rounded text-center`;
                                            }

                                            if (isProduto) {
                                                classesCelula += ' sticky left-0 z-10 bg-background border-r border-border';
                                                styleCelula = { minWidth: `${larguraProduto}px`, width: `${larguraProduto}px`, maxWidth: `${larguraProduto}px` };
                                            } else if (isPais) {
                                                styleCelula = { minWidth: '60px', maxWidth: '80px' };
                                            } else {
                                                // Colunas adaptáveis: crescem conforme o conteúdo
                                                styleCelula = { minWidth: '80px' };
                                            }

                                            return (
                                                <TableCell
                                                    key={col}
                                                    className={classesCelula}
                                                    style={styleCelula}
                                                >
                                                    {col === 'Produto' ? (
                                                        <div className="truncate" style={{ maxWidth: `${larguraProduto - 16}px` }} title={row[col]}>
                                                            {row[col]}
                                                        </div>
                                                    ) : (
                                                        <div title={row[col]}>
                                                            {typeof row[col] === 'number' ? row[col].toLocaleString() : row[col]}
                                                        </div>
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
                                                {analise.nome.replace('[ECOMHUB V2] ', '')}
                                            </h3>
                                            <Badge variant="secondary" className="text-xs bg-blue-600 text-white">V2</Badge>
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
        fetchLojas();
        fetchAnalises();

        // Definir período padrão (última semana)
        const hoje = new Date();
        const semanaPassada = new Date();
        semanaPassada.setDate(hoje.getDate() - 7);

        setDateRange({
            from: semanaPassada,
            to: hoje
        });
        setPeriodoPreset('semana');
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
                        Gerar Análise
                    </TabsTrigger>
                    <TabsTrigger value="salvas" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Análises Salvas
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="gerar" className="space-y-4">
                    {renderFormulario()}
                    {renderCardsMetricas()}
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
                                placeholder="Ex: Loja Espanha Janeiro 2025"
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

export default EcomhubEfetividadeV2Page;
