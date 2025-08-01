// frontend/src/features/metricas/EcomhubPage.js - MIGRAÇÃO COMPLETA PARA SHADCN/UI
import React, { useState, useEffect } from 'react';
import {
    Calendar, Download, Trash2, RefreshCw, Check, X, 
    AlertTriangle, TrendingUp, Building, BarChart3, Plus,
    Eye, Activity, Search, Globe, ArrowUpDown, ArrowUp, ArrowDown,
    Package, Target, Percent, ListChecks, PieChart, Filter,
    CalendarDays, Rocket, LayoutDashboard, Loader2, Settings
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

// PAÍSES DISPONÍVEIS COM BANDEIRAS + NOVOS PAÍSES
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
    
    // Controle de seções
    const [secaoAtiva, setSecaoAtiva] = useState('gerar');
    
    // Tipo de visualização
    const [tipoVisualizacao, setTipoVisualizacao] = useState('otimizada');
    
    // Estados do formulário
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
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
        if (paisSelecionado === 'todos') {
            return analisesSalvas;
        }
        
        const paisNome = PAISES.find(p => p.value === paisSelecionado)?.label;
        return analisesSalvas.filter(analise => 
            analise.nome.includes(paisNome) || 
            analise.descricao?.includes(paisNome)
        );
    };

    const processarDados = async () => {
        if (!dataInicio || !dataFim || !paisSelecionado) {
            showNotification('error', 'Selecione as datas e o país');
            return;
        }

        if (new Date(dataInicio) > new Date(dataFim)) {
            showNotification('error', 'Data de início deve ser anterior à data fim');
            return;
        }

        setLoadingProcessar(true);
        setProgressoAtual({ etapa: 'Iniciando...', porcentagem: 0 });

        try {
            const response = await axios.post('/metricas/ecomhub/analises/processar_selenium/', {
                data_inicio: dataInicio,
                data_fim: dataFim,
                pais_id: paisSelecionado
            });

            if (response.data.status === 'success') {
                setDadosResultado(response.data.dados_processados);
                showNotification('success', 'Dados processados com sucesso!');
                
                const paisNome = paisSelecionado === 'todos' ? 
                    'Todos os Países' : 
                    PAISES.find(p => p.value === paisSelecionado)?.label || 'País';
                const dataStr = `${new Date(dataInicio).toLocaleDateString()} - ${new Date(dataFim).toLocaleDateString()}`;
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
        
        if (numero >= 60) return 'bg-green-500/10 text-green-700 border-green-200';
        if (numero >= 50) return 'bg-green-400/10 text-green-600 border-green-200';
        if (numero >= 40) return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
        return 'bg-red-500/10 text-red-700 border-red-200';
    };

    const getDadosVisualizacao = () => {
        if (!dadosResultado) return null;
        
        if (tipoVisualizacao === 'otimizada') {
            return dadosResultado.visualizacao_otimizada || dadosResultado;
        } else {
            return dadosResultado.visualizacao_total || dadosResultado;
        }
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

    // Header moderno
    const renderHeader = () => (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-8 mb-6 shadow-lg">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                        <LayoutDashboard className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">
                            Métricas ECOMHUB
                        </h1>
                        <p className="text-white/80 text-base">
                            Analytics Dashboard - Análise de Performance
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => setSecaoAtiva('instrucoes')}
                        className="bg-white/15 border-white/20 text-white hover:bg-white/25 font-medium backdrop-blur-sm"
                    >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Instruções
                    </Button>
                    
                    <Select value={paisSelecionado} onValueChange={setPaisSelecionado}>
                        <SelectTrigger className="w-60 bg-white/15 border-white/20 text-white backdrop-blur-sm [&>span]:text-white">
                            <Globe className="h-4 w-4 mr-2 text-white" />
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

    // Navegação por seções
    const renderNavegacao = () => (
        <Card className="mb-6">
            <CardContent className="p-4">
                <div className="flex justify-center gap-2">
                    <Button
                        variant={secaoAtiva === 'gerar' ? 'default' : 'outline'}
                        onClick={() => setSecaoAtiva('gerar')}
                        className="min-w-40 font-semibold"
                    >
                        <Rocket className="h-4 w-4 mr-2" />
                        Gerar Métricas
                    </Button>
                    <Button
                        variant={secaoAtiva === 'salvas' ? 'default' : 'outline'}
                        onClick={() => setSecaoAtiva('salvas')}
                        className="min-w-40 font-semibold"
                    >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Métricas Salvas
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    // Formulário
    const renderFormulario = () => {
        const hoje = new Date().toISOString().split('T')[0];
        
        return (
            <Card className="mb-6 relative">
                {loadingProcessar && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-lg font-semibold mb-2">Processando dados...</p>
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
                            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                                <Filter className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Configuração de Análise</CardTitle>
                                <CardDescription>Configure o período e execute a análise</CardDescription>
                            </div>
                        </div>

                        <div className="flex items-end gap-4">
                            <div className="min-w-48">
                                <Label className="flex items-center gap-2 mb-2">
                                    <CalendarDays className="h-4 w-4" />
                                    Data de Início
                                </Label>
                                <Input
                                    type="date"
                                    value={dataInicio}
                                    onChange={(e) => setDataInicio(e.target.value)}
                                    disabled={loadingProcessar}
                                    max={hoje}
                                    className="cursor-pointer"
                                />
                            </div>
                            
                            <div className="min-w-48">
                                <Label className="flex items-center gap-2 mb-2">
                                    <CalendarDays className="h-4 w-4" />
                                    Data de Fim
                                </Label>
                                <Input
                                    type="date"
                                    value={dataFim}
                                    onChange={(e) => setDataFim(e.target.value)}
                                    disabled={loadingProcessar}
                                    max={hoje}
                                    className="cursor-pointer"
                                />
                            </div>
                            
                            <Button
                                onClick={processarDados}
                                disabled={!dataInicio || !dataFim || !paisSelecionado || loadingProcessar}
                                size="lg"
                                className="min-w-36 font-semibold"
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
    };

    // Instruções
    const renderInstrucoes = () => (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="text-blue-600">Manual de Instruções - Métricas ECOMHUB</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h4 className="text-lg font-semibold text-green-600 mb-3">Visualização Otimizada</h4>
                    <p className="text-sm text-muted-foreground mb-4">Colunas agrupadas para análise mais eficiente:</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border-blue-200">
                            <CardContent className="p-4">
                                <h5 className="font-semibold text-blue-600 text-sm">Totais</h5>
                                <p className="text-xs text-muted-foreground">Soma de todos os pedidos (todos os status)</p>
                            </CardContent>
                        </Card>
                        
                        <Card className="border-green-200">
                            <CardContent className="p-4">
                                <h5 className="font-semibold text-green-600 text-sm">Finalizados</h5>
                                <p className="text-xs text-muted-foreground">"delivered" + "issue" + "returning" + "returned" + "cancelled"</p>
                            </CardContent>
                        </Card>
                        
                        <Card className="border-orange-200">
                            <CardContent className="p-4">
                                <h5 className="font-semibold text-orange-600 text-sm">Em Trânsito</h5>
                                <p className="text-xs text-muted-foreground">"out_for_delivery" + "preparing_for_shipping" + "ready_to_ship" + "with_courier"</p>
                            </CardContent>
                        </Card>
                        
                        <Card className="border-red-200">
                            <CardContent className="p-4">
                                <h5 className="font-semibold text-red-600 text-sm">Problemas</h5>
                                <p className="text-xs text-muted-foreground">Apenas "issue"</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div>
                    <h4 className="text-lg font-semibold text-purple-600 mb-3">🌍 Opção "Todos os Países"</h4>
                    <p className="text-sm text-muted-foreground mb-4">Funcionalidades especiais quando "Todos" está selecionado:</p>
                    
                    <div className="space-y-2">
                        <p className="text-sm">• <strong>Países Incluídos:</strong> Espanha, Croácia, Grécia, Itália, Romênia, República Checa e Polônia</p>
                        <p className="text-sm">• <strong>Métricas Salvas:</strong> Exibe análises de todos os países em uma única lista</p>
                        <p className="text-sm">• <strong>Gerar Métricas:</strong> Combina dados de todos os 7 países em uma tabela unificada</p>
                        <p className="text-sm">• <strong>Processamento:</strong> Consulta todos os países simultaneamente para maior eficiência</p>
                    </div>
                </div>

                <div>
                    <h5 className="font-semibold text-teal-600 mb-2">Percentuais Calculados:</h5>
                    <div className="space-y-1">
                        <p className="text-sm">• <strong>% A Caminho:</strong> (Em Trânsito ÷ Totais) × 100</p>
                        <p className="text-sm">• <strong>% Devolvidos:</strong> (Devolução ÷ Totais) × 100</p>
                        <p className="text-sm">• <strong>Efetividade Parcial:</strong> (Entregues ÷ Finalizados) × 100</p>
                        <p className="text-sm">• <strong>Efetividade Total:</strong> (Entregues ÷ Totais) × 100</p>
                    </div>
                </div>

                <div>
                    <h5 className="font-semibold text-indigo-600 mb-2">Cores das Métricas:</h5>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-4 bg-green-500 rounded"></div>
                            <span className="text-sm">Efetividade ≥ 60% (Excelente)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-4 bg-green-400 rounded"></div>
                            <span className="text-sm">Efetividade ≥ 50% (Boa)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-4 bg-yellow-500 rounded"></div>
                            <span className="text-sm">Efetividade ≥ 40% (Regular)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-4 bg-red-500 rounded"></div>
                            <span className="text-sm">Efetividade &lt; 40% (Ruim)</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    const renderEstatisticas = () => {
        const dados = getDadosVisualizacao();
        
        if (tipoVisualizacao === 'total' || !dados || !Array.isArray(dados)) return null;
        
        const produtos = dados.filter(item => item.Produto !== 'Total');
        const totalProdutos = produtos.length;

        let efetividadeMedia = 0;
        let totalVendas = 0;
        let totalLeads = 0;

        efetividadeMedia = produtos.reduce((sum, item) => {
            const ef = parseFloat(item.Efetividade_Total?.replace('%', '') || 0);
            return sum + ef;
        }, 0) / totalProdutos;
        
        totalVendas = produtos.reduce((sum, item) => sum + (item.Entregues || 0), 0);
        totalLeads = produtos.reduce((sum, item) => sum + (item.Totais || 0), 0);
        
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Produtos</p>
                                <p className="text-2xl font-bold">{totalProdutos}</p>
                            </div>
                            <div className="flex items-center justify-center w-12 h-12 bg-blue-500/10 rounded-xl">
                                <Package className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Entregues</p>
                                <p className="text-2xl font-bold text-green-600">{totalVendas.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center justify-center w-12 h-12 bg-green-500/10 rounded-xl">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Totais</p>
                                <p className="text-2xl font-bold text-blue-600">{totalLeads.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center justify-center w-12 h-12 bg-blue-500/10 rounded-xl">
                                <Target className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Efetividade Média</p>
                                <p className="text-2xl font-bold text-orange-600">{efetividadeMedia.toFixed(1)}%</p>
                            </div>
                            <div className="flex items-center justify-center w-12 h-12 bg-orange-500/10 rounded-xl">
                                <Percent className="h-6 w-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderSeletorVisualizacao = () => {
        if (!dadosResultado) return null;

        return (
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-indigo-500/10 rounded-lg">
                                <PieChart className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Tipo de Visualização</h3>
                                <p className="text-sm text-muted-foreground">Escolha como visualizar os dados</p>
                            </div>
                        </div>
                        
                        <Tabs value={tipoVisualizacao} onValueChange={setTipoVisualizacao}>
                            <TabsList>
                                <TabsTrigger value="otimizada">Otimizada</TabsTrigger>
                                <TabsTrigger value="total">Total</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {tipoVisualizacao === 'otimizada' && (
                        <Alert className="mt-4 border-blue-200">
                            <PieChart className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Visualização Otimizada:</strong> Status agrupados em colunas mais analíticas 
                                (Totais, Enviados, Em Trânsito, Problemas, etc.) com percentuais e efetividades calculadas.
                            </AlertDescription>
                        </Alert>
                    )}

                    {tipoVisualizacao === 'total' && (
                        <Alert className="mt-4 border-orange-200">
                            <ListChecks className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Visualização Total:</strong> Todos os status individuais conforme retornados 
                                da ECOMHUB, sem agrupamentos ou cálculos adicionais.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        );
    };

    const renderImagemProduto = (value, rowIndex) => {
        const imageKey = `${rowIndex}-${value}`;
        const hasError = imagensComErro.has(imageKey);
        
        if (!value || hasError) {
            return (
                <div className="w-11 h-11 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center text-xl">
                    📦
                </div>
            );
        }

        return (
            <img 
                src={value} 
                alt="Produto" 
                className="w-11 h-11 object-cover rounded-lg border-2 border-gray-200"
                onError={() => {
                    setImagensComErro(prev => new Set(prev).add(imageKey));
                }}
            />
        );
    };

    const renderResultados = () => {
        const dados = getDadosVisualizacao();
        if (!dados || !Array.isArray(dados)) return null;

        const colunas = Object.keys(dados[0] || {});
        const dadosOrdenados = sortData(dados, sortBy, sortOrder);

        const tituloAnalise = paisSelecionado === 'todos' ? 
            'Métricas Consolidadas - Todos os Países' : 
            `Métricas de Produtos - ${PAISES.find(p => p.value === paisSelecionado)?.label}`;

        return (
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>
                                {tituloAnalise} - {tipoVisualizacao === 'otimizada' ? 'Otimizada' : 'Total'}
                            </CardTitle>
                            <CardDescription>
                                {paisSelecionado === 'todos' ? 
                                    'Análise consolidada de todos os países disponíveis (incluindo novos países)' :
                                    'Análise detalhada dos dados de performance'
                                }
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="rounded-lg">
                                {dados.length} registros
                            </Badge>
                            <Button
                                onClick={() => setModalSalvar(true)}
                                variant="outline"
                                className="font-semibold"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Salvar Análise
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    {colunas.map(col => (
                                        <TableHead key={col} className="font-semibold">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                                onClick={() => handleSort(col)}
                                            >
                                                {col.replace('_', ' ').replace(/([A-Z])/g, ' $1').trim()}
                                                {sortBy === col && (
                                                    sortOrder === 'asc' ? 
                                                        <ArrowUp className="ml-2 h-3 w-3" /> : 
                                                        <ArrowDown className="ml-2 h-3 w-3" />
                                                )}
                                                {sortBy !== col && <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />}
                                            </Button>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dadosOrdenados.map((row, idx) => (
                                    <TableRow
                                        key={idx}
                                        className={row.Produto === 'Total' ? 'bg-muted/30 font-medium' : 'hover:bg-muted/50'}
                                    >
                                        {Object.entries(row).map(([col, value]) => (
                                            <TableCell
                                                key={col}
                                                className={
                                                    tipoVisualizacao === 'otimizada' &&
                                                    (col === 'Efetividade_Total' || col === 'Efetividade_Parcial') ?
                                                    `font-medium border ${getEfetividadeCor(value)}` : ''
                                                }
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
                    </ScrollArea>
                </CardContent>
            </Card>
        );
    };

    const renderAnalisesSalvas = () => {
        const analisesFiltradas = getAnalisesFiltradas();
        
        const tituloAnalises = paisSelecionado === 'todos' ? 
            'Análises Salvas - Todos os Países' : 
            `Análises Salvas - ${PAISES.find(p => p.value === paisSelecionado)?.emoji} ${PAISES.find(p => p.value === paisSelecionado)?.label}`;
        
        return (
            <Card className="relative">
                {loadingAnalises && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}

                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-blue-500/10 rounded-lg">
                                {paisSelecionado === 'todos' ? <Globe className="h-5 w-5 text-blue-600" /> : <BarChart3 className="h-5 w-5 text-blue-600" />}
                            </div>
                            <div>
                                <CardTitle>{tituloAnalises}</CardTitle>
                                <CardDescription>
                                    {paisSelecionado === 'todos' ? 
                                        'Histórico completo de todas as análises processadas' :
                                        'Histórico de análises processadas'
                                    }
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary">{analisesFiltradas.length}</Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchAnalises}
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Atualizar
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {analisesFiltradas.length === 0 ? (
                        <Alert>
                            <BarChart3 className="h-4 w-4" />
                            <AlertDescription>
                                <p className="font-medium mb-1">
                                    {paisSelecionado === 'todos' ? 
                                        'Nenhuma análise salva encontrada' : 
                                        'Nenhuma análise salva para este país'
                                    }
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Processe dados e salve o resultado para vê-lo aqui.
                                </p>
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {analisesFiltradas.map(analise => (
                                <Card key={analise.id} className="relative">
                                    {loadingDelete[analise.id] && (
                                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        </div>
                                    )}

                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold truncate max-w-[70%]">
                                                {analise.nome.replace('[ECOMHUB] ', '')}
                                            </h3>
                                            <Badge variant="outline" className="rounded">
                                                ECOMHUB
                                            </Badge>
                                        </div>

                                        <p className="text-xs text-muted-foreground mb-4">
                                            {new Date(analise.criado_em).toLocaleDateString('pt-BR')} por {analise.criado_por_nome}
                                        </p>

                                        <div className="flex items-center justify-between">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => carregarAnalise(analise)}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                Carregar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => deletarAnalise(analise.id, analise.nome)}
                                                disabled={loadingDelete[analise.id]}
                                                className="text-red-600 border-red-200 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
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
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-gray-50/50 min-h-screen">
            {/* Notificações */}
            {notification && (
                <Alert
                    variant={notification.type === 'error' ? 'destructive' : 'default'}
                    className="mb-4"
                >
                    {notification.type === 'success' ? <Check className="h-4 w-4" /> :
                        notification.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <AlertDescription>{notification.message}</AlertDescription>
                </Alert>
            )}

            {/* Header moderno */}
            {renderHeader()}

            {/* Navegação por Seções */}
            {paisSelecionado && renderNavegacao()}

            {/* Seção Gerar Métricas */}
            {secaoAtiva === 'gerar' && paisSelecionado && (
                <>
                    {renderFormulario()}
                    {renderSeletorVisualizacao()}
                    {renderEstatisticas()}
                    {renderResultados()}
                </>
            )}

            {/* Seção Métricas Salvas */}
            {secaoAtiva === 'salvas' && paisSelecionado && renderAnalisesSalvas()}

            {/* Seção Instruções */}
            {secaoAtiva === 'instrucoes' && renderInstrucoes()}

            {/* Modal para salvar análise */}
            <Dialog open={modalSalvar} onOpenChange={setModalSalvar}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Salvar Análise</DialogTitle>
                        <DialogDescription>
                            Digite um nome para identificar esta análise
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="relative py-4">
                        {loadingSalvar && (
                            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10 rounded">
                                <Loader2 className="h-6 w-6 animate-spin" />
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
                        <Button 
                            variant="outline" 
                            onClick={() => setModalSalvar(false)} 
                            disabled={loadingSalvar}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={salvarAnalise}
                            disabled={!nomeAnalise || loadingSalvar}
                        >
                            {loadingSalvar ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            {loadingSalvar ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default EcomhubPage;