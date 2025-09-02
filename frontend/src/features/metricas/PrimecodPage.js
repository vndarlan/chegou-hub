// frontend/src/features/metricas/PrimecodPage.js - INTEGRAÇÃO VIA PROXY BACKEND
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
import { getCSRFToken } from '../../utils/csrf';

// Países PrimeCOD disponíveis
const PAISES_PRIMECOD = [
    { value: 'todos', label: 'Todos os Países' },
    { value: 'Austria', label: 'Austria' },
    { value: 'Bulgaria', label: 'Bulgaria' },
    { value: 'Croatia', label: 'Croatia' },
    { value: 'Czech Republic', label: 'Czech Republic' },
    { value: 'Greece', label: 'Greece' },
    { value: 'Hungary', label: 'Hungary' },
    { value: 'Italy', label: 'Italy' },
    { value: 'Poland', label: 'Poland' },
    { value: 'Romania', label: 'Romania' },
    { value: 'Slovakia', label: 'Slovakia' },
    { value: 'Slovenia', label: 'Slovenia' },
    { value: 'Spain', label: 'Spain' },
    { value: 'Ukraine', label: 'Ukraine' },
    { value: 'United Kingdom', label: 'United Kingdom' }
];

// Status mapping PrimeCOD - COMPLETO com 15 status
const STATUS_MAPPING = {
    1: "Efetuado",              // Placed
    2: "Empacotado",            // Packed  
    3: "Despachado",            // Dispatched
    4: "Enviado",               // Shipped
    5: "Chegada ao Destino",    // Chegada ao Destino
    6: "Saiu para Entrega",     // Out for delivery
    7: "Entregue",              // Delivered
    8: "Recusado",              // Refused
    9: "Retornando",            // Returning
    10: "Devolvido",            // Returned
    11: "Fora de Estoque",      // Out of stock
    12: "Cancelado",            // Cancelled
    13: "Erro",                 // Error
    15: "Erro de Fulfillment",  // Fulfilment Error
    16: "Incidente"             // Incident
};

// Cliente Backend Proxy PrimeCOD
const buscarDadosPrimeCOD = async (dataInicio, dataFim, paisSelecionado) => {
    const response = await axios.post('/metricas/primecod/buscar-orders/', {
        data_inicio: dataInicio,
        data_fim: dataFim,
        pais_filtro: paisSelecionado !== 'todos' ? paisSelecionado : null
    }, {
        headers: {
            'X-CSRFToken': getCSRFToken(),
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};


function PrimecodPage() {
    // Estados principais
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [dadosResultado, setDadosResultado] = useState(null);
    const [secaoAtiva, setSecaoAtiva] = useState('gerar');
    const [tipoVisualizacao, setTipoVisualizacao] = useState('total');
    
    // Estados do formulário
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
    const [authChecked, setAuthChecked] = useState(false);
    

    // Estados para ordenação
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');


    // ======================== FUNÇÕES DE API ========================

    const fetchAnalises = async () => {
        setLoadingAnalises(true);
        try {
            const response = await axios.get('/metricas/primecod/analises/');
            const primecodAnalises = response.data.filter(a => 
                a.tipo === 'PRIMECOD' || a.tipo === 'primecod'
            );
            setAnalisesSalvas([...primecodAnalises]);
        } catch (error) {
            console.error('Erro ao buscar análises:', error);
            if (error.response?.status === 404) {
                showNotification('error', 'Endpoint de análises não encontrado');
            } else {
                showNotification('error', `Erro ao carregar análises: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setLoadingAnalises(false);
        }
    };

    const processarDados = async () => {
        if (!dateRange?.from || !dateRange?.to) {
            showNotification('error', 'Selecione o período de análise');
            return;
        }

        if (dateRange.from > dateRange.to) {
            showNotification('error', 'Data de início deve ser anterior à data fim');
            return;
        }


        setLoadingProcessar(true);
        setProgressoAtual({ etapa: 'Conectando com PrimeCOD...', porcentagem: 0 });

        try {
            const dataInicio = dateRange.from.toISOString().split('T')[0];
            const dataFim = dateRange.to.toISOString().split('T')[0];
            
            setProgressoAtual({ etapa: 'Buscando dados...', porcentagem: 50 });
            
            // Chamar endpoint interno do backend
            const result = await buscarDadosPrimeCOD(dataInicio, dataFim, paisSelecionado);
            
            setProgressoAtual({ etapa: 'Processando dados...', porcentagem: 90 });
            
            if (result.status === 'success' && result.dados_processados) {
                setDadosResultado(result.dados_processados);
                
                // Gerar nome automático
                const paisNome = paisSelecionado === 'todos' ? 
                    'Todos os Países' : 
                    PAISES_PRIMECOD.find(p => p.value === paisSelecionado)?.label || 'País';
                const dataStr = `${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}`;
                setNomeAnalise(`PrimeCOD ${paisNome} ${dataStr}`);

                // Verificar se há dados para exibir
                if (result.dados_processados.length === 0) {
                    showNotification('info', 
                        'Nenhum order encontrado para o período selecionado. ' +
                        'Tente um período diferente ou verifique se há dados na sua conta PrimeCOD.'
                    );
                } else {
                    showNotification('success', 
                        `Dados processados com sucesso! ${result.total_orders || 0} orders encontradas` +
                        (result.tempo_processamento ? ` (${result.tempo_processamento})` : '')
                    );
                }
            } else {
                showNotification('error', result.message || 'Erro no processamento dos dados');
            }
            
        } catch (error) {
            console.error('Erro no processamento:', error);
            
            // Error handling específico para backend
            if (error.response?.status === 401) {
                showNotification('error', 'Sessão expirada. Faça login novamente para acessar os dados do PrimeCOD.');
                // Opcional: redirecionar para login após alguns segundos
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            } else if (error.response?.status === 500) {
                showNotification('error', 'Erro interno do servidor. Tente novamente.');
            } else if (error.response?.status === 503) {
                showNotification('error', 'Serviço PrimeCOD temporariamente indisponível.');
            } else {
                showNotification('error', `Erro: ${error.response?.data?.message || error.message}`);
            }
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
            // Garantir estrutura correta de dados para o backend
            const dadosParaSalvar = {
                nome: nomeAnalise.trim(),
                tipo: 'PRIMECOD',
                dados_processados: dadosResultado,
                descricao: `Integração Backend PrimeCOD - ${paisSelecionado === 'todos' ? 'Todos os Países' : PAISES_PRIMECOD.find(p => p.value === paisSelecionado)?.label}`,
                configuracao: {
                    pais: paisSelecionado,
                    periodo: {
                        inicio: dateRange?.from?.toISOString()?.split('T')[0],
                        fim: dateRange?.to?.toISOString()?.split('T')[0]
                    },
                    total_registros: Array.isArray(dadosResultado) ? dadosResultado.length : 0
                }
            };

            const response = await axios.post('/metricas/primecod/analises/', dadosParaSalvar, {
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                }
            });

            // Verificar sucesso baseado na resposta do backend corrigido
            if (response.data && (response.data.status === 'success' || response.data.id)) {
                showNotification('success', `Análise '${nomeAnalise}' salva com sucesso!`);
                setModalSalvar(false);
                setNomeAnalise('');
                await fetchAnalises(); // Aguardar recarga das análises
            } else {
                showNotification('error', 'Resposta inesperada do servidor ao salvar');
            }
        } catch (error) {
            console.error('Erro ao salvar análise:', error);
            
            // Error handling específico para salvamento
            if (error.response?.status === 400) {
                showNotification('error', `Dados inválidos: ${error.response?.data?.message || 'Verifique os campos'}`);
            } else if (error.response?.status === 403) {
                showNotification('error', 'Sem permissão para salvar análises');
            } else if (error.response?.status === 500) {
                showNotification('error', 'Erro interno do servidor. Tente novamente.');
            } else {
                showNotification('error', `Erro ao salvar: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setLoadingSalvar(false);
        }
    };

    const carregarAnalise = (analise) => {
        // Usar campo dados_processados primeiro, com fallback para campos antigos
        const dados = analise.dados_processados || analise.dados_efetividade || analise.dados_leads;
        
        if (!dados) {
            showNotification('error', 'Análise não possui dados válidos para carregar');
            return;
        }
        
        setDadosResultado(dados);
        setSecaoAtiva('gerar');
        showNotification('success', `Análise '${analise.nome}' carregada com sucesso!`);
    };

    const deletarAnalise = async (id, nome) => {
        if (!window.confirm(`Deletar análise '${nome}'?`)) return;

        setLoadingDelete(prev => ({ ...prev, [id]: true }));
        try {
            await axios.delete(`/metricas/primecod/analises/${id}/`, {
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                }
            });
            
            showNotification('success', `Análise '${nome}' deletada com sucesso!`);
            await fetchAnalises(); // Aguardar recarga das análises
            
            // Limpar dados se for a análise atualmente carregada
            if (dadosResultado && Array.isArray(dadosResultado) && dadosResultado.some(item => item.id === id)) {
                setDadosResultado(null);
            }
        } catch (error) {
            console.error('Erro ao deletar análise:', error);
            
            // Error handling específico para deleção
            if (error.response?.status === 404) {
                showNotification('error', 'Análise não encontrada (pode ter sido deletada)');
                await fetchAnalises(); // Atualizar lista
            } else if (error.response?.status === 403) {
                showNotification('error', 'Sem permissão para deletar esta análise');
            } else {
                showNotification('error', `Erro ao deletar: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setLoadingDelete(prev => ({ ...prev, [id]: false }));
        }
    };

    // ======================== FUNÇÕES AUXILIARES ========================

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const agruparDadosPrimeCOD = (dados) => {
        if (!dados || !Array.isArray(dados)) return [];
        
        return dados.map(row => {
            const emProcessamento = (row['Efetuado'] || 0) + (row['Empacotado'] || 0);
            const emTransito = (row['Despachado'] || 0) + (row['Enviado'] || 0) + 
                               (row['Chegada ao Destino'] || 0) + (row['Saiu para Entrega'] || 0);
            const entregues = row['Entregue'] || 0;
            const devolucoes = (row['Recusado'] || 0) + (row['Retornando'] || 0) + (row['Devolvido'] || 0);
            const cancelados = (row['Cancelado'] || 0) + (row['Fora de Estoque'] || 0);
            const problemas = (row['Erro'] || 0) + (row['Erro de Fulfillment'] || 0) + (row['Incidente'] || 0);
            const finalizados = entregues + (row['Recusado'] || 0) + (row['Devolvido'] || 0) + 
                               cancelados + problemas;
            const totais = row['total'] || 0;
            
            return {
                produto: row.produto,
                pais: row.pais,
                'Totais': totais,
                'Finalizados': finalizados,
                'Em Processamento': emProcessamento,
                'Em Trânsito': emTransito,
                'Entregues': entregues,
                'Devoluções': devolucoes,
                'Cancelados': cancelados,
                'Problemas': problemas,
                '% Processamento': totais > 0 ? ((emProcessamento / totais) * 100).toFixed(1) + '%' : '0.0%',
                '% A Caminho': totais > 0 ? ((emTransito / totais) * 100).toFixed(1) + '%' : '0.0%',
                '% Devolvidos': totais > 0 ? ((devolucoes / totais) * 100).toFixed(1) + '%' : '0.0%',
                'Efetividade_Parcial': finalizados > 0 ? ((entregues / finalizados) * 100).toFixed(1) + '%' : '0.0%',
                'Efetividade_Total': totais > 0 ? ((entregues / totais) * 100).toFixed(1) + '%' : '0.0%'
            };
        });
    };

    const getEfetividadeCor = (valor) => {
        if (!valor) return '';
        
        let numero;
        if (typeof valor === 'string') {
            numero = parseFloat(valor.replace('%', '').replace('(Média)', ''));
        } else {
            numero = parseFloat(valor);
        }
        
        if (isNaN(numero)) return '';
        
        // Usando cores que funcionam bem com temas claro/escuro
        if (numero >= 70) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-300 dark:border-green-700';
        if (numero >= 50) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700';
        if (numero >= 30) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border border-orange-300 dark:border-orange-700';
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-300 dark:border-red-700';
    };

    const sortData = (data, sortBy, sortOrder) => {
        if (!sortBy || !data) return data;
        
        return [...data].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
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
                        {PAISES_PRIMECOD.map(pais => (
                            <SelectItem key={pais.value} value={pais.value} className="text-popover-foreground hover:bg-accent">
                                {pais.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    const renderFormulario = () => (
        <Card className="mb-6 relative border-border bg-card">
            {loadingProcessar && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur flex flex-col items-center justify-center z-50 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                    <p className="font-medium mb-2 text-foreground">Processando dados via backend...</p>
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
                        {/* Dois calendários separados - simples e funcional */}
                        <div className="flex gap-4">
                            <div className="flex flex-col gap-2">
                                <Label className="text-sm font-medium">Data Inicial</Label>
                                <input
                                    type="date"
                                    value={dateRange?.from ? dateRange.from.toISOString().split('T')[0] : ''}
                                    onChange={(e) => {
                                        const newDate = e.target.value ? new Date(e.target.value) : undefined;
                                        setDateRange(prev => ({ ...prev, from: newDate }));
                                    }}
                                    disabled={loadingProcessar}
                                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <Label className="text-sm font-medium">Data Final</Label>
                                <input
                                    type="date"
                                    value={dateRange?.to ? dateRange.to.toISOString().split('T')[0] : ''}
                                    onChange={(e) => {
                                        const newDate = e.target.value ? new Date(e.target.value) : undefined;
                                        setDateRange(prev => ({ ...prev, to: newDate }));
                                    }}
                                    disabled={loadingProcessar}
                                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>
                        
                        <Button
                            onClick={processarDados}
                            disabled={!dateRange?.from || !dateRange?.to || loadingProcessar || !authChecked}
                            size="lg"
                            className="min-w-36 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {loadingProcessar ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Search className="h-4 w-4 mr-2" />
                            )}
                            {!authChecked ? 'Verificando...' : (loadingProcessar ? 'Buscando...' : 'Buscar Dados')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );

    const renderEstatisticas = () => {
        if (!dadosResultado || !Array.isArray(dadosResultado)) return null;
        
        if (tipoVisualizacao === 'otimizada') {
            const dadosAgrupados = agruparDadosPrimeCOD(dadosResultado);
            const totalRow = dadosAgrupados.find(item => item.produto === 'TOTAL');
            
            if (!totalRow) return null;
            
            return (
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <Card className="border-border bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Efetividade Total</p>
                                    <p className={`text-xl font-bold px-2 py-1 rounded ${getEfetividadeCor(totalRow.Efetividade_Total || 0)}`}>
                                        {totalRow.Efetividade_Total || 0}
                                    </p>
                                </div>
                                <Target className="h-5 w-5 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-border bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Efetividade Parcial</p>
                                    <p className={`text-xl font-bold px-2 py-1 rounded ${getEfetividadeCor(totalRow.Efetividade_Parcial || 0)}`}>
                                        {totalRow.Efetividade_Parcial || 0}
                                    </p>
                                </div>
                                <TrendingUp className="h-5 w-5 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-border bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                                    <p className="text-xl font-bold text-blue-600">{(totalRow.Totais || 0).toLocaleString()}</p>
                                </div>
                                <Package className="h-5 w-5 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-border bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">% Processamento</p>
                                    <p className={`text-xl font-bold px-2 py-1 rounded ${getEfetividadeCor(totalRow['% Processamento'] || 0)}`}>
                                        {totalRow['% Processamento'] || 0}
                                    </p>
                                </div>
                                <Percent className="h-5 w-5 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }
        
        // Versão padrão para visualização total
        const produtos = dadosResultado.filter(item => item.produto !== 'TOTAL');
        const totalRow = dadosResultado.find(item => item.produto === 'TOTAL');
        
        const totalProdutos = produtos.length;
        const totalOrders = totalRow?.total || 0;
        const totalDelivered = totalRow?.Entregue || 0;
        const totalReturned = totalRow?.Devolvido || 0;
        
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
                                <p className="text-sm text-muted-foreground">Total Orders</p>
                                <p className="text-xl font-bold text-blue-600">{totalOrders.toLocaleString()}</p>
                            </div>
                            <Target className="h-5 w-5 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Entregues</p>
                                <p className="text-xl font-bold text-green-600">{totalDelivered.toLocaleString()}</p>
                            </div>
                            <TrendingUp className="h-5 w-5 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Devolvidos</p>
                                <p className="text-xl font-bold text-red-600">{totalReturned.toLocaleString()}</p>
                            </div>
                            <Percent className="h-5 w-5 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderResultados = () => {
        if (!dadosResultado || !Array.isArray(dadosResultado)) return null;

        const dadosOrdenados = sortData(dadosResultado, sortBy, sortOrder);
        const dadosParaExibir = tipoVisualizacao === 'otimizada' 
            ? agruparDadosPrimeCOD(dadosOrdenados)
            : dadosOrdenados;
        
        let colunas;
        if (tipoVisualizacao === 'otimizada') {
            colunas = ['produto', 'pais', 'Totais', 'Finalizados', 'Em Processamento', 'Em Trânsito', 'Entregues', 'Devoluções', 'Cancelados', 'Problemas', '% Processamento', '% A Caminho', '% Devolvidos', 'Efetividade_Parcial', 'Efetividade_Total'];
        } else {
            const statusColumns = Object.values(STATUS_MAPPING);
            colunas = ['produto', 'pais', ...statusColumns, 'total'];
        }
            
        // Debug temporário para verificar os dados
        if (dadosParaExibir.length > 0) {
            console.log('Primeira linha de dados:', dadosParaExibir[0]);
            console.log('Tipo de visualização:', tipoVisualizacao);
            console.log('Colunas:', colunas);
        }

        return (
            <Card className="mb-6 border-border bg-card">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg text-card-foreground">
                                {tipoVisualizacao === 'otimizada' ? 'Resultados' : 'Resultados'}
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">{dadosResultado.length} registros</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Tabs value={tipoVisualizacao} onValueChange={setTipoVisualizacao}>
                                <TabsList className="grid w-fit grid-cols-2 bg-muted">
                                    <TabsTrigger value="total" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Total</TabsTrigger>
                                    <TabsTrigger value="otimizada" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Otimizada</TabsTrigger>
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
                    {/* SOLUÇÃO: Separar overflow do sticky - container externo SEM overflow */}
                    <div className="relative border-t" style={{ height: `${Math.min(300, (dadosParaExibir.length + 1) * 45)}px`, overflow: 'visible' }}>
                        {/* Container interno COM overflow para scroll */}
                        <div 
                            className="absolute inset-0 overflow-auto"
                            style={{ overflowX: 'auto', overflowY: 'auto' }}
                        >
                            <table className="w-full text-sm border-collapse" style={{ minWidth: `${350 + colunas.length * 120}px` }}>
                                <thead>
                                    <tr className="bg-muted/50">
                                        {colunas.map(col => {
                                            const isProduto = col === 'produto';
                                            const isPais = col === 'pais';
                                            
                                            return (
                                                <th 
                                                    key={col} 
                                                    className={`px-3 py-2 text-left text-xs font-medium text-muted-foreground border-r border-border last:border-r-0 ${
                                                        isProduto || isPais ? '' : 'text-center'
                                                    }`}
                                                    style={{
                                                        position: isProduto ? 'sticky' : isPais ? 'sticky' : 'static',
                                                        left: isProduto ? '0px' : isPais ? '200px' : 'auto',
                                                        backgroundColor: isProduto || isPais ? 'hsl(var(--muted)/0.5)' : 'hsl(var(--muted)/0.5)',
                                                        zIndex: isProduto || isPais ? 30 : 20,
                                                        minWidth: isProduto ? '200px' : isPais ? '150px' : '120px',
                                                        width: isProduto ? '200px' : isPais ? '150px' : '120px',
                                                        boxShadow: isProduto || isPais ? '2px 0 5px -2px rgba(0,0,0,0.1)' : 'none'
                                                    }}
                                                >
                                                    <button
                                                        className="flex items-center gap-1 text-xs hover:text-foreground transition-colors w-full"
                                                        onClick={() => handleSort(col)}
                                                    >
                                                        <span className="truncate">
                                                            {col.toUpperCase()}
                                                        </span>
                                                        {sortBy === col ? (
                                                            sortOrder === 'asc' ? 
                                                                <ArrowUp className="h-3 w-3 flex-shrink-0" /> : 
                                                                <ArrowDown className="h-3 w-3 flex-shrink-0" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 opacity-50 flex-shrink-0" />
                                                        )}
                                                    </button>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {dadosParaExibir.map((row, idx) => (
                                        <tr 
                                            key={idx} 
                                            className={`border-b border-border hover:bg-muted/50 transition-colors ${
                                                row.produto === 'TOTAL' ? 'bg-muted/20 font-medium' : ''
                                            }`}
                                        >
                                            {colunas.map(col => {
                                                const isProduto = col === 'produto';
                                                const isPais = col === 'pais';
                                                
                                                // Aplicar cores nas métricas da versão otimizada
                                                const isMetrica = tipoVisualizacao === 'otimizada' && 
                                                    (col === 'Efetividade_Total' || col === 'Efetividade_Parcial' || 
                                                     col === '% Processamento' || col === '% A Caminho' || col === '% Devolvidos');
                                                
                                                let cellClassesAdicionais = `px-3 py-2 text-xs border-r border-border last:border-r-0 ${
                                                    isProduto || isPais ? '' : 'text-center'
                                                }`;
                                                
                                                if (isMetrica) {
                                                    cellClassesAdicionais += ` font-bold ${getEfetividadeCor(row[col])} px-2 py-1 rounded`;
                                                }
                                                
                                                return (
                                                    <td 
                                                        key={col} 
                                                        className={cellClassesAdicionais}
                                                        style={{
                                                            position: isProduto ? 'sticky' : isPais ? 'sticky' : 'static',
                                                            left: isProduto ? '0px' : isPais ? '200px' : 'auto',
                                                            backgroundColor: isProduto || isPais ? 'hsl(var(--background))' : 'transparent',
                                                            zIndex: isProduto || isPais ? 10 : 1,
                                                            minWidth: isProduto ? '200px' : isPais ? '150px' : '120px',
                                                            width: isProduto ? '200px' : isPais ? '150px' : '120px',
                                                            boxShadow: isProduto || isPais ? '2px 0 5px -2px rgba(0,0,0,0.1)' : 'none'
                                                        }}
                                                    >
                                                        <div className="truncate" title={row[col]}>
                                                            {typeof row[col] === 'number' ? row[col].toLocaleString() : (row[col] || 0)}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderAnalisesSalvas = () => (
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
                        <CardDescription className="text-muted-foreground">{analisesSalvas.length} análises PrimeCOD</CardDescription>
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
                            Nenhuma análise PrimeCOD encontrada. Processe dados e salve o resultado.
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
                                            {analise.nome}
                                        </h3>
                                        <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">PRIMECOD</Badge>
                                    </div>

                                    <p className="text-xs text-muted-foreground mb-3">
                                        {new Date(analise.criado_em).toLocaleDateString('pt-BR')} por {analise.criado_por_nome}
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

    // ======================== EFEITOS ========================

    useEffect(() => {
        const inicializar = async () => {
            // Verificar autenticação primeiro
            try {
                const authResponse = await axios.get('/current-state/', { withCredentials: true });
                if (authResponse.status === 200 && authResponse.data.logged_in) {
                    setAuthChecked(true);
                    // Buscar análises apenas se autenticado
                    fetchAnalises();
                } else {
                    showNotification('error', 'Você precisa estar logado para acessar os dados do PrimeCOD. Redirecionando...');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                }
            } catch (error) {
                console.error('Erro ao verificar autenticação:', error);
                showNotification('error', 'Erro ao verificar autenticação. Redirecionando para login...');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            }
            
            // Definir período padrão (última semana)
            const hoje = new Date();
            const semanaPassada = new Date();
            semanaPassada.setDate(hoje.getDate() - 7);
            
            setDateRange({
                from: semanaPassada,
                to: hoje
            });
        };
        
        inicializar();
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
                    {renderFormulario()}
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
                        <DialogTitle className="text-blue-600">Manual - PrimeCOD API Analytics</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Integração direta com a API do PrimeCOD
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">

                        <div>
                            <h4 className="text-lg font-semibold text-green-600 mb-3">🔗 Integração via Backend</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                Esta ferramenta usa o backend Django como proxy para a API do PrimeCOD, garantindo segurança e performance.
                            </p>
                            
                            <div className="space-y-2">
                                <p className="text-sm text-foreground">• <strong>Arquitetura:</strong> Frontend → Backend Django → API PrimeCOD</p>
                                <p className="text-sm text-foreground">• <strong>Segurança:</strong> Token API protegido no backend</p>
                                <p className="text-sm text-foreground">• <strong>Filtros:</strong> Período de datas e países</p>
                                <p className="text-sm text-foreground">• <strong>Processamento:</strong> Backend otimizado com cache</p>
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h4 className="text-lg font-semibold text-purple-600 mb-3">📊 Status Disponíveis</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(STATUS_MAPPING).map(([id, status]) => (
                                    <Card key={id} className="border-blue-200 bg-card">
                                        <CardContent className="p-3">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-blue-600 text-sm">{status}</span>
                                                <Badge variant="outline" className="text-xs">ID: {id}</Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h4 className="text-lg font-semibold text-orange-600 mb-3">🌍 Países Suportados</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {PAISES_PRIMECOD.slice(1).map(pais => (
                                    <span key={pais.value} className="text-sm text-foreground">{pais.label}</span>
                                ))}
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h4 className="text-lg font-semibold text-teal-600 mb-3">📈 Modos de Visualização</h4>
                            
                            <div className="space-y-4">
                                <div>
                                    <h5 className="font-semibold text-blue-600 mb-2">🔹 Visualização Total</h5>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Visualização completa com todas as 15 colunas de status individuais:
                                    </p>
                                    <div className="space-y-1 text-xs">
                                        <p className="text-foreground">• <strong>Produto:</strong> SKU do produto</p>
                                        <p className="text-foreground">• <strong>País:</strong> País de envio</p>
                                        <p className="text-foreground">• <strong>Status:</strong> Colunas individuais para cada um dos 15 status</p>
                                        <p className="text-foreground">• <strong>Total:</strong> Soma de todos os status</p>
                                    </div>
                                </div>

                                <Separator className="bg-border" />

                                <div>
                                    <h5 className="font-semibold text-purple-600 mb-2">🔹 Visualização Otimizada</h5>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Versão agrupada com métricas calculadas para análise rápida:
                                    </p>
                                    
                                    <div className="space-y-3">
                                        <div className="bg-card border rounded-lg p-3">
                                            <h6 className="font-medium text-green-600 mb-2">📊 Categorias de Status:</h6>
                                            <div className="space-y-1 text-xs">
                                                <p><strong>Em Processamento:</strong> Efetuado + Empacotado</p>
                                                <p><strong>A Caminho:</strong> Despachado + Enviado + Chegada ao Destino + Saiu para Entrega</p>
                                                <p><strong>Entregues:</strong> Entregue</p>
                                                <p><strong>Devoluções:</strong> Recusado + Retornando + Devolvido</p>
                                                <p><strong>Cancelados:</strong> Cancelado + Fora de Estoque</p>
                                                <p><strong>Problemas:</strong> Erro + Erro de Fulfillment + Incidente</p>
                                                <p><strong>Finalizados:</strong> Entregues + Devoluções + Cancelados + Problemas</p>
                                            </div>
                                        </div>

                                        <div className="bg-card border rounded-lg p-3">
                                            <h6 className="font-medium text-orange-600 mb-2">🧮 Métricas Calculadas:</h6>
                                            <div className="space-y-1 text-xs">
                                                <p><strong>Efetividade Total:</strong> (Entregues ÷ Total) × 100</p>
                                                <p><strong>Efetividade Parcial:</strong> (Entregues ÷ Finalizados) × 100</p>
                                                <p><strong>% Processamento:</strong> (Em Processamento ÷ Total) × 100</p>
                                                <p><strong>% A Caminho:</strong> (A Caminho ÷ Total) × 100</p>
                                                <p><strong>% Devolvidos:</strong> (Devoluções ÷ Total) × 100</p>
                                            </div>
                                        </div>

                                        <div className="bg-card border rounded-lg p-3">
                                            <h6 className="font-medium text-red-600 mb-2">🎨 Código de Cores:</h6>
                                            <div className="space-y-1 text-xs">
                                                <p className="text-green-600"><strong>Verde:</strong> ≥ 70% (Excelente)</p>
                                                <p className="text-yellow-600"><strong>Amarelo:</strong> 50-69% (Bom)</p>
                                                <p className="text-orange-600"><strong>Laranja:</strong> 30-49% (Regular)</p>
                                                <p className="text-red-600"><strong>Vermelho:</strong> &lt; 30% (Crítico)</p>
                                            </div>
                                        </div>
                                    </div>
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
                        <DialogTitle className="text-popover-foreground">Salvar Análise PrimeCOD</DialogTitle>
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
                                placeholder="Ex: PrimeCOD Grécia Janeiro 2025"
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

export default PrimecodPage;