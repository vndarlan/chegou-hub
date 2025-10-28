// frontend/src/features/status/EcomhubStatusPage.js - SPRINT 4 FINAL - Sistema Completo de Tracking ECOMHUB
import React, { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle, Activity, Truck, Package, Clock, TrendingUp,
    RefreshCw, Settings, Filter, Eye, Search, ChevronDown, ChevronUp,
    RotateCcw, CheckCircle, XCircle, AlertCircle, Timer,
    List, BarChart3, Users, Globe, LayoutDashboard,
    Loader2, Calendar, ArrowUpDown, ArrowUp, ArrowDown, ArrowRight,
    Info, ShoppingBag, PieChart, ArrowLeft
} from 'lucide-react';
import axios from 'axios';
import { getCSRFToken } from '../../utils/csrf';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { ScrollArea } from '../../components/ui/scroll-area';
import { useToast } from '../../components/ui/use-toast';
import { Toaster } from '../../components/ui/toaster';

// Constantes
const STATUS_MAP = {
    'processing': { label: 'Processando', color: 'bg-blue-500', icon: Package, chartColor: '#3b82f6' },
    'preparing_for_shipping': { label: 'Preparando Envio', color: 'bg-blue-600', icon: Package, chartColor: '#2563eb' },
    'ready_to_ship': { label: 'Pronto p/ Envio', color: 'bg-indigo-500', icon: Package, chartColor: '#6366f1' },
    'shipped': { label: 'Enviado', color: 'bg-purple-500', icon: Truck, chartColor: '#a855f7' },
    'with_courier': { label: 'Com Transportadora', color: 'bg-purple-600', icon: Truck, chartColor: '#9333ea' },
    'out_for_delivery': { label: 'Saiu p/ Entrega', color: 'bg-orange-500', icon: Truck, chartColor: '#f97316' },
    'returning': { label: 'Em Devolução', color: 'bg-yellow-500', icon: ArrowLeft, chartColor: '#eab308' },
    'issue': { label: 'Com Problemas', color: 'bg-red-500', icon: AlertTriangle, chartColor: '#ef4444' }
};

const NIVEL_ALERTA_CONFIG = {
    'normal': { label: 'Normal', variant: 'secondary', icon: CheckCircle },
    'yellow': { label: 'Atenção', variant: 'warning', icon: Clock },
    'red': { label: 'Urgente', variant: 'destructive', icon: AlertCircle },
    'critical': { label: 'Crítico', variant: 'destructive', icon: XCircle }
};

function EcomhubStatusPage() {
    const { toast } = useToast();

    // Estados principais
    const [abaSelecionada, setAbaSelecionada] = useState('dashboard');
    const [paisSelecionado, setPaisSelecionado] = useState('todos');
    const [paisesDisponiveis, setPaisesDisponiveis] = useState([
        { id: 'todos', name: 'Todos os Países' }
    ]);

    // Dashboard
    const [dadosDashboard, setDadosDashboard] = useState(null);
    const [loadingDashboard, setLoadingDashboard] = useState(false);

    // Lista de pedidos
    const [listaPedidos, setListaPedidos] = useState([]);
    const [loadingPedidos, setLoadingPedidos] = useState(false);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalItens, setTotalItens] = useState(0);

    // Filtros
    const [statusFiltro, setStatusFiltro] = useState('todos');
    const [nivelAlertaFiltro, setNivelAlertaFiltro] = useState('todos');
    const [buscaTexto, setBuscaTexto] = useState('');
    const [ordenacao, setOrdenacao] = useState('-time_in_status_hours');

    // Modal histórico
    const [modalHistorico, setModalHistorico] = useState(false);
    const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
    const [historicoPedido, setHistoricoPedido] = useState(null);
    const [loadingHistorico, setLoadingHistorico] = useState(false);

    // Sincronização
    const [sincronizando, setSincronizando] = useState(false);

    // Configurações de alerta
    const [configsAlerta, setConfigsAlerta] = useState([]);
    const [loadingConfigs, setLoadingConfigs] = useState(false);
    const [editedConfigs, setEditedConfigs] = useState({});
    const [savingConfig, setSavingConfig] = useState({});

    // Status desconhecidos
    const [unknownStatuses, setUnknownStatuses] = useState([]);
    const [loadingUnknown, setLoadingUnknown] = useState(false);
    const [statusReferenceMap, setStatusReferenceMap] = useState(null);

    // ======================== FUNÇÕES DE API ========================

    const fetchPaisesDisponiveis = async () => {
        try {
            const response = await axios.get('/metricas/ecomhub/stores/', {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            const stores = response.data;

            // Extrair países únicos
            const paisesUnicos = new Set();
            stores.forEach(store => {
                if (store.country_id && store.country_name) {
                    paisesUnicos.add(JSON.stringify({
                        id: store.country_id.toString(),
                        name: store.country_name
                    }));
                }
            });

            const paises = Array.from(paisesUnicos).map(p => JSON.parse(p));

            setPaisesDisponiveis([
                { id: 'todos', name: 'Todos os Países' },
                ...paises
            ]);
        } catch (error) {
            console.error('Erro ao buscar países:', error);
        }
    };

    const fetchDashboard = useCallback(async () => {
        setLoadingDashboard(true);
        try {
            const params = {};
            if (paisSelecionado !== 'todos') {
                params.country_id = paisSelecionado;
            }

            const response = await axios.get('/metricas/ecomhub/orders/dashboard/', {
                params,
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            setDadosDashboard(response.data);
        } catch (error) {
            console.error('Erro ao buscar dashboard:', error);
            toast({
                title: "Erro",
                description: "Erro ao carregar métricas do dashboard",
                variant: "destructive"
            });
        } finally {
            setLoadingDashboard(false);
        }
    }, [paisSelecionado, toast]);

    const fetchPedidos = useCallback(async () => {
        setLoadingPedidos(true);
        try {
            const params = {
                page: paginaAtual,
                ordering: ordenacao
            };

            if (paisSelecionado !== 'todos') params.country_id = paisSelecionado;
            if (statusFiltro !== 'todos') params.status = statusFiltro;
            if (nivelAlertaFiltro !== 'todos') params.alert_level = nivelAlertaFiltro;
            if (buscaTexto.trim()) params.search = buscaTexto.trim();

            const response = await axios.get('/metricas/ecomhub/orders/', {
                params,
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            setListaPedidos(response.data.results || []);
            setTotalItens(response.data.count || 0);
            setTotalPaginas(Math.ceil((response.data.count || 0) / 20));
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
            toast({
                title: "Erro",
                description: "Erro ao carregar lista de pedidos",
                variant: "destructive"
            });
        } finally {
            setLoadingPedidos(false);
        }
    }, [paisSelecionado, statusFiltro, nivelAlertaFiltro, buscaTexto, ordenacao, paginaAtual, toast]);

    const fetchHistorico = async (orderId) => {
        setLoadingHistorico(true);
        try {
            const response = await axios.get(`/metricas/ecomhub/orders/${orderId}/history/`, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            setHistoricoPedido(response.data);
            setPedidoSelecionado(orderId);
            setModalHistorico(true);
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            toast({
                title: "Erro",
                description: "Erro ao carregar histórico do pedido",
                variant: "destructive"
            });
        } finally {
            setLoadingHistorico(false);
        }
    };

    const sincronizarAgora = async () => {
        setSincronizando(true);
        try {
            const response = await axios.post('/metricas/ecomhub/orders/sync/', {}, {
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                toast({
                    title: "Sucesso!",
                    description: `Sincronização concluída! ${response.data.stats?.orders_created || 0} novos, ${response.data.stats?.orders_updated || 0} atualizados`,
                });

                fetchDashboard();
                if (abaSelecionada === 'lista') {
                    fetchPedidos();
                }
            }
        } catch (error) {
            console.error('Erro ao sincronizar:', error);
            toast({
                title: "Erro",
                description: "Erro ao sincronizar dados",
                variant: "destructive"
            });
        } finally {
            setSincronizando(false);
        }
    };

    const fetchConfigsAlerta = async () => {
        setLoadingConfigs(true);
        try {
            const response = await axios.get('/metricas/ecomhub/alert-config/', {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });
            setConfigsAlerta(response.data || []);
        } catch (error) {
            console.error('Erro ao buscar configs:', error);
            // Não mostra toast para não ser invasivo
        } finally {
            setLoadingConfigs(false);
        }
    };

    const fetchUnknownStatuses = async () => {
        setLoadingUnknown(true);
        try {
            const response = await axios.get('/metricas/ecomhub/unknown-status/', {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });
            setUnknownStatuses(response.data || []);
        } catch (error) {
            console.error('Erro ao buscar status desconhecidos:', error);
        } finally {
            setLoadingUnknown(false);
        }
    };

    const fetchStatusReferenceMap = async () => {
        try {
            const response = await axios.get('/metricas/ecomhub/unknown-status/reference_map/', {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });
            setStatusReferenceMap(response.data);
        } catch (error) {
            console.error('Erro ao buscar mapa de referência:', error);
        }
    };

    const classificarStatus = async (status, isActive) => {
        try {
            await axios.post('/metricas/ecomhub/unknown-status/classify/', {
                status,
                is_active: isActive
            }, {
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                }
            });

            toast({
                title: "Sucesso!",
                description: `Status "${status}" classificado como ${isActive ? 'ATIVO' : 'FINAL'}`,
            });

            fetchUnknownStatuses();
            fetchDashboard();
        } catch (error) {
            console.error('Erro ao classificar status:', error);
            toast({
                title: "Erro",
                description: "Erro ao classificar status",
                variant: "destructive"
            });
        }
    };

    const atualizarConfig = async (status, thresholds) => {
        // Validar que yellow < red < critical
        const yellow = Number(thresholds.yellow_threshold_hours);
        const red = Number(thresholds.red_threshold_hours);
        const critical = Number(thresholds.critical_threshold_hours);

        if (yellow >= red || red >= critical) {
            toast({
                title: "Validação Falhou",
                description: "Os limites devem ser: Atenção < Urgente < Crítico",
                variant: "destructive"
            });
            return;
        }

        setSavingConfig(prev => ({ ...prev, [status]: true }));
        try {
            await axios.put(`/metricas/ecomhub/alert-config/${status}/`, thresholds, {
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                }
            });

            toast({
                title: "Sucesso!",
                description: "Configuração de alerta atualizada",
            });

            fetchConfigsAlerta();
            // Limpar o edited state para esse status
            setEditedConfigs(prev => {
                const newState = { ...prev };
                delete newState[status];
                return newState;
            });
        } catch (error) {
            console.error('Erro ao atualizar config:', error);
            toast({
                title: "Erro",
                description: "Erro ao atualizar configuração",
                variant: "destructive"
            });
        } finally {
            setSavingConfig(prev => ({ ...prev, [status]: false }));
        }
    };

    const handleConfigChange = (status, field, value) => {
        setEditedConfigs(prev => ({
            ...prev,
            [status]: {
                ...(prev[status] || {}),
                [field]: value
            }
        }));
    };

    const getConfigValue = (config, field) => {
        return editedConfigs[config.status]?.[field] ?? config[field];
    };

    // ======================== FUNÇÕES AUXILIARES ========================

    const formatarTempo = (horas) => {
        if (!horas) return '0h';
        if (horas < 24) return `${Math.round(horas)}h`;
        const dias = Math.floor(horas / 24);
        const horasRestantes = Math.round(horas % 24);
        return horasRestantes > 0 ? `${dias}d ${horasRestantes}h` : `${dias}d`;
    };

    const formatarData = (dataStr) => {
        if (!dataStr) return '-';
        return new Date(dataStr).toLocaleString('pt-BR');
    };

    const limparFiltros = () => {
        setStatusFiltro('todos');
        setNivelAlertaFiltro('todos');
        setBuscaTexto('');
        setOrdenacao('-time_in_status_hours');
        setPaginaAtual(1);
    };

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-2xl font-bold">Status Tracking ECOMHUB</h1>
                <p className="text-sm text-muted-foreground">Monitoramento em tempo real</p>
            </div>
            <div className="flex gap-3">
                <Select value={paisSelecionado} onValueChange={setPaisSelecionado}>
                    <SelectTrigger className="w-48">
                        <Globe className="h-4 w-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {paisesDisponiveis.map(pais => (
                            <SelectItem key={pais.id} value={pais.id}>
                                {pais.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={sincronizarAgora} disabled={sincronizando}>
                    {sincronizando ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sincronizar
                </Button>
            </div>
        </div>
    );

    const renderAlertasCriticos = () => {
        if (!dadosDashboard) return null;

        const criticos = dadosDashboard.by_alert_level?.critical || 0;
        const urgentes = dadosDashboard.by_alert_level?.red || 0;

        if (criticos === 0 && urgentes === 0) return null;

        return (
            <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    {criticos > 0 && <strong>⚠️ {criticos} pedidos críticos precisam atenção imediata!</strong>}
                    {urgentes > 0 && <span className="ml-2">+ {urgentes} pedidos urgentes</span>}
                </AlertDescription>
            </Alert>
        );
    };

    const renderAlertaStatusDesconhecidos = () => {
        const unknownCount = dadosDashboard?.unknown_statuses_count || 0;
        if (unknownCount === 0) return null;

        return (
            <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>⚠️ {unknownCount} Status Desconhecido{unknownCount > 1 ? 's' : ''} Detectado{unknownCount > 1 ? 's' : ''}!</strong>
                    <p className="mt-1">
                        Foram encontrados pedidos com status não mapeados no sistema.
                        Vá para a aba <strong>"Gerenciar Status"</strong> para revisar e classificar.
                    </p>
                </AlertDescription>
            </Alert>
        );
    };

    const renderCardMetricas = () => {
        if (!dadosDashboard) return null;

        const criticos = dadosDashboard.by_alert_level?.critical || 0;
        const urgentes = dadosDashboard.by_alert_level?.red || 0;
        const atencao = dadosDashboard.by_alert_level?.yellow || 0;
        const normal = dadosDashboard.by_alert_level?.normal || 0;

        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <Package className="h-6 w-6 text-blue-600" />
                            <div className="text-3xl font-bold text-blue-600">{dadosDashboard.total_active_orders || 0}</div>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">Pedidos Ativos</p>
                    </CardContent>
                </Card>
                <Card className={`border-l-4 border-l-red-500 transition-all duration-200 ${criticos > 0 ? 'bg-red-50 dark:bg-red-950 hover:shadow-xl animate-pulse' : 'hover:shadow-lg hover:scale-105'}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <XCircle className="h-6 w-6 text-red-600" />
                            <div className="text-3xl font-bold text-red-600">{criticos}</div>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">Críticos</p>
                    </CardContent>
                </Card>
                <Card className={`border-l-4 border-l-orange-500 transition-all duration-200 ${urgentes > 10 ? 'bg-orange-50 dark:bg-orange-950' : ''} hover:shadow-lg hover:scale-105`}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <AlertCircle className="h-6 w-6 text-orange-600" />
                            <div className="text-3xl font-bold text-orange-600">{urgentes}</div>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">Urgentes</p>
                            {urgentes > 10 && (
                                <Badge variant="destructive" className="text-xs">Atenção!</Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="h-6 w-6 text-yellow-600" />
                            <div className="text-3xl font-bold text-yellow-600">{atencao}</div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Atenção</p>
                            <p className="text-xs text-green-600 font-medium">Normal: {normal}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderGraficoPizza = () => {
        if (!dadosDashboard?.by_status) return null;

        // Preparar dados para o gráfico
        const chartData = Object.entries(dadosDashboard.by_status)
            .filter(([_, count]) => count > 0)
            .map(([status, count]) => ({
                name: STATUS_MAP[status]?.label || status,
                value: count,
                status: status,
                percentage: ((count / dadosDashboard.total_active_orders) * 100).toFixed(1)
            }))
            .sort((a, b) => b.value - a.value);

        if (chartData.length === 0) return null;

        const CustomTooltip = ({ active, payload }) => {
            if (active && payload && payload.length) {
                return (
                    <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
                        <p className="font-medium">{payload[0].payload.name}</p>
                        <p className="text-sm text-muted-foreground">
                            {payload[0].value} pedidos ({payload[0].payload.percentage}%)
                        </p>
                    </div>
                );
            }
            return null;
        };

        return (
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-primary" />
                        <CardTitle>Distribuição de Status</CardTitle>
                    </div>
                    <CardDescription>Visualização da distribuição dos pedidos por status</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <RechartsPie>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ percentage }) => `${percentage}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={STATUS_MAP[entry.status]?.chartColor || '#6b7280'} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value) => <span className="text-xs">{value}</span>}
                            />
                        </RechartsPie>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        );
    };

    const renderTop5Status = () => {
        if (!dadosDashboard?.by_status) return null;

        const top5 = Object.entries(dadosDashboard.by_status)
            .filter(([_, count]) => count > 0)
            .map(([status, count]) => ({
                status,
                count,
                config: STATUS_MAP[status] || { label: status, color: 'bg-gray-500', icon: Package, chartColor: '#6b7280' },
                percentage: ((count / dadosDashboard.total_active_orders) * 100).toFixed(1)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        if (top5.length === 0) return null;

        return (
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <CardTitle>Top 5 Status</CardTitle>
                    </div>
                    <CardDescription>Status com mais pedidos ativos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {top5.map((item, index) => {
                        const IconComponent = item.config.icon;
                        return (
                            <div key={item.status} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ backgroundColor: item.config.chartColor }}></div>
                                        <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-sm font-medium truncate">{item.config.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className="text-lg font-bold">{item.count}</span>
                                        <Badge variant="secondary" className="text-xs">{item.percentage}%</Badge>
                                    </div>
                                </div>
                                <Progress value={parseFloat(item.percentage)} className="h-2" />
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        );
    };

    const renderTempoMedioStatus = () => {
        if (!dadosDashboard?.avg_time_per_status) return null;

        const statusComTempo = Object.entries(dadosDashboard.avg_time_per_status)
            .filter(([_, avgTime]) => avgTime > 0)
            .map(([status, avgTime]) => ({
                status,
                avgTime,
                config: STATUS_MAP[status] || { label: status, icon: Package, color: 'bg-gray-500' }
            }))
            .sort((a, b) => b.avgTime - a.avgTime);

        if (statusComTempo.length === 0) return null;

        return (
            <Card className="mb-6 hover:shadow-lg transition-shadow">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Timer className="h-5 w-5 text-primary" />
                        <CardTitle>Tempo Médio por Status</CardTitle>
                    </div>
                    <CardDescription>Média de tempo que os pedidos permanecem em cada status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {statusComTempo.map(({ status, avgTime, config }) => {
                            const IconComponent = config.icon;
                            const dias = Math.floor(avgTime / 24);
                            const horas = Math.round(avgTime % 24);

                            return (
                                <div key={status} className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-sm font-medium truncate">{config.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-sm font-bold">
                                            {dias > 0 ? `${dias}d ${horas}h` : `${horas}h`}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderGargalos = () => {
        if (!dadosDashboard?.bottlenecks?.length) return null;

        return (
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Gargalos Detectados</CardTitle>
                    <CardDescription>Status com pedidos parados há muito tempo</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {dadosDashboard.bottlenecks.map((gargalo, i) => (
                            <Alert key={i} variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>{STATUS_MAP[gargalo.status]?.label || gargalo.status}:</strong> {gargalo.count} pedidos há mais de {Math.round(gargalo.avg_days)} dias
                                </AlertDescription>
                            </Alert>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderFiltrosPedidos = () => (
        <Card className="mb-4">
            <CardHeader>
                <CardTitle className="text-sm">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <Label className="text-xs">Status</Label>
                        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os Status</SelectItem>
                                {Object.entries(STATUS_MAP).map(([status, config]) => (
                                    <SelectItem key={status} value={status}>
                                        {config.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="text-xs">Nível de Alerta</Label>
                        <Select value={nivelAlertaFiltro} onValueChange={setNivelAlertaFiltro}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os Níveis</SelectItem>
                                {Object.entries(NIVEL_ALERTA_CONFIG).map(([nivel, config]) => (
                                    <SelectItem key={nivel} value={nivel}>
                                        {config.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="text-xs">Buscar</Label>
                        <Input
                            placeholder="Cliente ou pedido..."
                            value={buscaTexto}
                            onChange={(e) => setBuscaTexto(e.target.value)}
                            className="h-9"
                        />
                    </div>

                    <div>
                        <Label className="text-xs">Ordenar por</Label>
                        <Select value={ordenacao} onValueChange={setOrdenacao}>
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="-time_in_status_hours">Tempo no Status (desc)</SelectItem>
                                <SelectItem value="time_in_status_hours">Tempo no Status (asc)</SelectItem>
                                <SelectItem value="-date">Data (mais recente)</SelectItem>
                                <SelectItem value="date">Data (mais antigo)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setPaginaAtual(1); fetchPedidos(); }}>
                        <Search className="h-3 w-3 mr-1" />
                        Aplicar Filtros
                    </Button>
                    <Button size="sm" variant="outline" onClick={limparFiltros}>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Limpar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    const renderTabelaPedidos = () => (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Lista de Pedidos</CardTitle>
                        <CardDescription>{totalItens} pedidos encontrados</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={fetchPedidos} disabled={loadingPedidos}>
                        {loadingPedidos ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                            <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Atualizar
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loadingPedidos ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Número do Pedido</TableHead>
                                        <TableHead>Produto</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Tempo no Status</TableHead>
                                        <TableHead>Alerta</TableHead>
                                        <TableHead>País</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {listaPedidos.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                Nenhum pedido encontrado
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        listaPedidos.map((pedido) => {
                                            const statusConfig = STATUS_MAP[pedido.status] || { label: pedido.status, color: 'bg-gray-500', icon: Package };
                                            const alertaConfig = NIVEL_ALERTA_CONFIG[pedido.alert_level] || NIVEL_ALERTA_CONFIG.normal;
                                            const StatusIcon = statusConfig.icon;

                                            return (
                                                <TableRow key={pedido.id}>
                                                    <TableCell className="font-mono text-xs font-medium">
                                                        {pedido.order_id}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm truncate max-w-xs" title={pedido.product_name}>
                                                            {pedido.product_name || '-'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <StatusIcon className="h-3 w-3" />
                                                            <span className="text-xs">{statusConfig.label}</span>
                                                            {!STATUS_MAP[pedido.status] && (
                                                                <Badge variant="outline" className="ml-1 border-yellow-500 text-yellow-700 text-xs">
                                                                    <AlertTriangle className="h-2 w-2 mr-1" />
                                                                    Novo!
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {formatarTempo(pedido.time_in_status_hours)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={alertaConfig.variant}>
                                                            {alertaConfig.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{pedido.country_name}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => fetchHistorico(pedido.id)}
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Paginação */}
                        {totalPaginas > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t mt-4">
                                <div className="text-sm text-muted-foreground">
                                    Página {paginaAtual} de {totalPaginas} ({totalItens} total)
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                                        disabled={paginaAtual <= 1}
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                                        disabled={paginaAtual >= totalPaginas}
                                    >
                                        Próxima
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );

    const renderModalHistorico = () => (
        <Dialog open={modalHistorico} onOpenChange={setModalHistorico}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Histórico do Pedido</DialogTitle>
                    <DialogDescription>Timeline completa de mudanças de status</DialogDescription>
                </DialogHeader>

                {loadingHistorico ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : historicoPedido ? (
                    <ScrollArea className="max-h-96 pr-4">
                        <div className="space-y-4">
                            {/* Dados do pedido */}
                            <Card>
                                <CardContent className="p-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <strong>Pedido:</strong> {historicoPedido.order?.order_id}
                                        </div>
                                        <div>
                                            <strong>Cliente:</strong> {historicoPedido.order?.customer_name}
                                        </div>
                                        <div>
                                            <strong>Produto:</strong> {historicoPedido.order?.product_name}
                                        </div>
                                        <div>
                                            <strong>País:</strong> {historicoPedido.order?.country_name}
                                        </div>
                                        <div>
                                            <strong>Status Atual:</strong> {STATUS_MAP[historicoPedido.order?.status]?.label || historicoPedido.order?.status}
                                        </div>
                                        <div>
                                            <strong>Tempo no Status:</strong> {formatarTempo(historicoPedido.order?.time_in_status_hours)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Timeline do histórico */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-sm">Timeline de Mudanças</h4>
                                {historicoPedido.history?.length > 0 ? (
                                    historicoPedido.history.map((registro, index) => (
                                        <div key={index} className="flex items-start gap-3 p-3 border rounded">
                                            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium">
                                                        {STATUS_MAP[registro.status_from]?.label || registro.status_from}
                                                    </span>
                                                    <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                    <span className="text-sm font-medium text-primary">
                                                        {STATUS_MAP[registro.status_to]?.label || registro.status_to}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatarData(registro.changed_at)}
                                                </div>
                                                {registro.duration_in_previous_status_hours && (
                                                    <div className="text-xs text-muted-foreground">
                                                        Ficou {formatarTempo(registro.duration_in_previous_status_hours)} no status anterior
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-muted-foreground text-center py-4">
                                        Nenhuma mudança de status registrada
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                ) : null}

                <DialogFooter>
                    <Button variant="outline" onClick={() => setModalHistorico(false)}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    const renderConfiguracoes = () => (
        <Card>
            <CardHeader>
                <CardTitle>Configurações de Alertas</CardTitle>
                <CardDescription>Defina os limites de tempo para cada status (em horas). Os valores devem ser: Atenção &lt; Urgente &lt; Crítico</CardDescription>
            </CardHeader>
            <CardContent>
                {loadingConfigs ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : configsAlerta.length > 0 ? (
                    <div className="space-y-4">
                        {configsAlerta.map(config => {
                            const statusConfig = STATUS_MAP[config.status];
                            const StatusIcon = statusConfig?.icon || Settings;
                            const isSaving = savingConfig[config.status];
                            const hasChanges = editedConfigs[config.status] !== undefined;

                            return (
                                <div key={config.status} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                                    <div className="flex items-center gap-2 mb-3">
                                        <StatusIcon className="h-5 w-5 text-primary" />
                                        <h4 className="font-medium">
                                            {statusConfig?.label || config.status}
                                        </h4>
                                        {hasChanges && (
                                            <Badge variant="outline" className="ml-auto">Modificado</Badge>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                        <div>
                                            <Label className="text-xs flex items-center gap-1">
                                                <Clock className="h-3 w-3 text-yellow-600" />
                                                🟡 Atenção (horas)
                                            </Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={getConfigValue(config, 'yellow_threshold_hours')}
                                                onChange={(e) => handleConfigChange(config.status, 'yellow_threshold_hours', e.target.value)}
                                                className="h-9 mt-1"
                                                disabled={isSaving}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3 text-orange-600" />
                                                🟠 Urgente (horas)
                                            </Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={getConfigValue(config, 'red_threshold_hours')}
                                                onChange={(e) => handleConfigChange(config.status, 'red_threshold_hours', e.target.value)}
                                                className="h-9 mt-1"
                                                disabled={isSaving}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs flex items-center gap-1">
                                                <XCircle className="h-3 w-3 text-red-600" />
                                                🔴 Crítico (horas)
                                            </Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={getConfigValue(config, 'critical_threshold_hours')}
                                                onChange={(e) => handleConfigChange(config.status, 'critical_threshold_hours', e.target.value)}
                                                className="h-9 mt-1"
                                                disabled={isSaving}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => atualizarConfig(config.status, {
                                                yellow_threshold_hours: getConfigValue(config, 'yellow_threshold_hours'),
                                                red_threshold_hours: getConfigValue(config, 'red_threshold_hours'),
                                                critical_threshold_hours: getConfigValue(config, 'critical_threshold_hours')
                                            })}
                                            disabled={isSaving || !hasChanges}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                    Salvando...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Salvar Configuração
                                                </>
                                            )}
                                        </Button>
                                        {hasChanges && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setEditedConfigs(prev => {
                                                        const newState = { ...prev };
                                                        delete newState[config.status];
                                                        return newState;
                                                    });
                                                }}
                                                disabled={isSaving}
                                            >
                                                <RotateCcw className="h-3 w-3 mr-1" />
                                                Resetar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="mb-4">Configurações de alerta não disponíveis</p>
                        <p className="text-sm">Limites padrão:</p>
                        <div className="mt-2 space-y-1 text-xs">
                            <div>🟡 Atenção: 168h (7 dias)</div>
                            <div>🟠 Urgente: 336h (14 dias)</div>
                            <div>🔴 Crítico: 504h (21 dias)</div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    // ======================== EFEITOS ========================

    useEffect(() => {
        fetchPaisesDisponiveis();
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    useEffect(() => {
        if (abaSelecionada === 'lista') {
            fetchPedidos();
        }
    }, [abaSelecionada, fetchPedidos]);

    useEffect(() => {
        if (abaSelecionada === 'configuracoes') {
            fetchConfigsAlerta();
        }
    }, [abaSelecionada]);

    useEffect(() => {
        if (abaSelecionada === 'gerenciar-status') {
            fetchUnknownStatuses();
            fetchStatusReferenceMap();
        }
    }, [abaSelecionada]);

    // ======================== RENDER PRINCIPAL ========================

    return (
        <div className="flex-1 space-y-4 p-6 min-h-screen bg-background">
            {renderHeader()}
            {renderAlertasCriticos()}
            {renderAlertaStatusDesconhecidos()}

            {/* Aviso sobre pedidos finalizados */}
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Informação:</strong> Esta página exibe apenas pedidos <strong>ATIVOS</strong>.
                    Pedidos finalizados (entregues, cancelados ou devolvidos) não são sincronizados e não aparecem nas listagens.
                </AlertDescription>
            </Alert>

            <Tabs value={abaSelecionada} onValueChange={setAbaSelecionada}>
                <TabsList className="grid w-fit grid-cols-4">
                    <TabsTrigger value="dashboard">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="lista">
                        <List className="h-4 w-4 mr-2" />
                        Lista
                    </TabsTrigger>
                    <TabsTrigger value="gerenciar-status">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Gerenciar Status
                        {unknownStatuses.length > 0 && (
                            <Badge variant="destructive" className="ml-2">{unknownStatuses.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="configuracoes">
                        <Settings className="h-4 w-4 mr-2" />
                        Configurações
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-4">
                    {loadingDashboard ? (
                        <div className="space-y-4 animate-pulse">
                            {/* Skeleton para cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <Card key={i}>
                                        <CardContent className="p-4">
                                            <div className="h-12 bg-muted rounded mb-2"></div>
                                            <div className="h-4 bg-muted rounded w-2/3"></div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            {/* Skeleton para gráficos */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {[1, 2].map(i => (
                                    <Card key={i}>
                                        <CardContent className="p-6">
                                            <div className="h-64 bg-muted rounded"></div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            {renderCardMetricas()}

                            {/* Gráfico de Pizza + Top 5 Status */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                {renderGraficoPizza()}
                                {renderTop5Status()}
                            </div>

                            {renderTempoMedioStatus()}
                            {renderGargalos()}

                            {dadosDashboard?.last_sync && (
                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>Última sincronização: {formatarData(dadosDashboard.last_sync)}</span>
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="lista" className="space-y-4">
                    {renderFiltrosPedidos()}
                    {renderTabelaPedidos()}
                </TabsContent>

                <TabsContent value="gerenciar-status" className="space-y-4">
                    {/* Card: Guia de Referência */}
                    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Info className="h-5 w-5 text-blue-600" />
                                <CardTitle>Guia de Referência de Status</CardTitle>
                            </div>
                            <CardDescription>Mapeamento oficial da API ECOMHUB para traduções em português</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {statusReferenceMap ? (
                                <div className="space-y-6">
                                    {/* Status Ativos */}
                                    <div>
                                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            Status Ativos (sincronizados)
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {Object.entries(statusReferenceMap.active || {}).map(([apiStatus, translation]) => (
                                                <div key={apiStatus} className="flex items-center justify-between p-2 bg-background rounded border">
                                                    <span className="font-mono text-xs text-muted-foreground">{apiStatus}</span>
                                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm font-medium">{translation}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Status Finais */}
                                    <div>
                                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                            <XCircle className="h-4 w-4 text-gray-600" />
                                            Status Finais (não sincronizados)
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {Object.entries(statusReferenceMap.final || {}).map(([apiStatus, translation]) => (
                                                <div key={apiStatus} className="flex items-center justify-between p-2 bg-background rounded border opacity-60">
                                                    <span className="font-mono text-xs text-muted-foreground">{apiStatus}</span>
                                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm font-medium">{translation}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Card: Status Desconhecidos Detectados */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                        <CardTitle>Status Desconhecidos Detectados</CardTitle>
                                    </div>
                                    <CardDescription>Classifique os novos status encontrados nos pedidos</CardDescription>
                                </div>
                                <Button size="sm" variant="outline" onClick={fetchUnknownStatuses} disabled={loadingUnknown}>
                                    {loadingUnknown ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                    )}
                                    Atualizar
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingUnknown ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : unknownStatuses.length === 0 ? (
                                <div className="text-center py-8">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600 opacity-50" />
                                    <p className="text-muted-foreground">Nenhum status desconhecido encontrado!</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Todos os status estão mapeados corretamente.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                                        <Info className="h-4 w-4 text-yellow-600" />
                                        <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                                            <strong>Como classificar:</strong>
                                            <ul className="mt-2 space-y-1 text-xs">
                                                <li>• <strong>Status ATIVO:</strong> Pedido ainda está em trânsito (será sincronizado)</li>
                                                <li>• <strong>Status FINAL:</strong> Pedido já foi finalizado/concluído (não será mais sincronizado)</li>
                                            </ul>
                                        </AlertDescription>
                                    </Alert>

                                    {unknownStatuses.map((item) => (
                                        <div key={item.status} className="p-4 border rounded-lg hover:border-yellow-500 transition-colors">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                                                            Status Desconhecido
                                                        </Badge>
                                                        <span className="font-mono text-sm font-bold">{item.status}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Detectado pela primeira vez: {formatarData(item.first_seen)}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Última ocorrência: {formatarData(item.last_seen)}
                                                    </div>
                                                    <div className="text-xs font-medium mt-1">
                                                        {item.occurrences} pedido{item.occurrences > 1 ? 's' : ''} encontrado{item.occurrences > 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => classificarStatus(item.status, true)}
                                                    className="flex-1"
                                                >
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Classificar como ATIVO
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => classificarStatus(item.status, false)}
                                                    className="flex-1"
                                                >
                                                    <XCircle className="h-3 w-3 mr-1" />
                                                    Classificar como FINAL
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="configuracoes" className="space-y-4">
                    {renderConfiguracoes()}
                </TabsContent>
            </Tabs>

            {renderModalHistorico()}
            <Toaster />
        </div>
    );
}

export default EcomhubStatusPage;
