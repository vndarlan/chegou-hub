// frontend/src/features/status/EcomhubStatusPage.js - DASHBOARD STATUS TRACKING
import React, { useState, useEffect } from 'react';
import {
    Clock, RefreshCw, AlertTriangle, TrendingUp, BarChart3, Eye, Search, Globe,
    ArrowUpDown, ArrowUp, ArrowDown, Package, Truck, CheckCircle, AlertCircle,
    Filter, Settings, Calendar as CalendarIcon, Download, Loader2, MoreVertical,
    History, Ship, MapPin, User, AlertOctagon, Zap, Activity, Target,
    Timer, FileText, ExternalLink, Bell, PieChart, Percent
} from 'lucide-react';
import axios from 'axios';
import { getCSRFToken } from '../../utils/csrf';

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
import { RobustDatePicker } from '../../components/ui/robust-date-picker';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';

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

const STATUS_OPTIONS = [
    { value: 'todos', label: 'Todos os Status' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'with_courier', label: 'With Courier' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'issue', label: 'Issue' },
    { value: 'returning', label: 'Returning' },
    { value: 'returned', label: 'Returned' },
    { value: 'cancelled', label: 'Cancelled' }
];

const NIVEL_ALERTA_OPTIONS = [
    { value: 'todos', label: 'Todos os Níveis' },
    { value: 'normal', label: 'Normal' },
    { value: 'amarelo', label: 'Amarelo' },
    { value: 'vermelho', label: 'Vermelho' },
    { value: 'critico', label: 'Crítico' }
];

const ORDENACAO_OPTIONS = [
    { value: 'tempo_desc', label: 'Maior tempo no status' },
    { value: 'tempo_asc', label: 'Menor tempo no status' },
    { value: 'data_desc', label: 'Mais recente' },
    { value: 'data_asc', label: 'Mais antigo' },
    { value: 'cliente', label: 'Nome do cliente' }
];

function EcomhubStatusPage() {
    // Estados principais
    const [tabAtiva, setTabAtiva] = useState('dashboard');
    const [dadosDashboard, setDadosDashboard] = useState(null);
    const [pedidos, setPedidos] = useState([]);
    const [alertasCriticos, setAlertasCriticos] = useState([]);
    const [historicoPedido, setHistoricoPedido] = useState(null);
    
    // Estados de loading
    const [loadingDashboard, setLoadingDashboard] = useState(false);
    const [loadingPedidos, setLoadingPedidos] = useState(false);
    const [loadingSincronizar, setLoadingSincronizar] = useState(false);
    const [loadingHistorico, setLoadingHistorico] = useState(false);
    
    // Estados de filtros
    const [filtros, setFiltros] = useState({
        pais: 'todos',
        status: 'todos',
        nivel_alerta: 'todos',
        ordenacao: 'tempo_desc'
    });
    
    // Estados de modais e controles
    const [modalHistorico, setModalHistorico] = useState(false);
    const [modalConfiguracao, setModalConfiguracao] = useState(false);
    const [notification, setNotification] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    
    // Estados para sincronização
    const [dateRange, setDateRange] = useState({
        from: undefined,
        to: undefined
    });

    // ======================== FUNÇÕES DE API ========================

    const fetchDashboard = async () => {
        setLoadingDashboard(true);
        try {
            const response = await axios.get('/api/metricas/ecomhub/status-tracking/dashboard/', {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });
            
            setDadosDashboard(response.data);
            setAlertasCriticos(response.data.alertas_criticos || []);
            showNotification('success', 'Dashboard atualizado');
        } catch (error) {
            console.error('Erro ao buscar dashboard:', error);
            showNotification('error', `Erro ao carregar dashboard: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingDashboard(false);
        }
    };

    const fetchPedidos = async (pagina = 1) => {
        setLoadingPedidos(true);
        try {
            const params = new URLSearchParams({
                pagina: pagina.toString(),
                ...filtros
            });
            
            if (filtros.pais !== 'todos') params.append('pais', filtros.pais);
            if (filtros.status !== 'todos') params.append('status', filtros.status);
            if (filtros.nivel_alerta !== 'todos') params.append('nivel_alerta', filtros.nivel_alerta);
            
            const response = await axios.get(`/api/metricas/ecomhub/status-tracking/pedidos/?${params}`, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });
            
            setPedidos(response.data.results || []);
            setTotalPaginas(Math.ceil((response.data.count || 0) / 20));
            setPaginaAtual(pagina);
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
            showNotification('error', `Erro ao carregar pedidos: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingPedidos(false);
        }
    };

    const sincronizarAgora = async () => {
        if (!dateRange?.from || !dateRange?.to || filtros.pais === 'todos') {
            showNotification('error', 'Selecione o período e um país específico para sincronizar');
            return;
        }

        if (dateRange.from > dateRange.to) {
            showNotification('error', 'Data de início deve ser anterior à data fim');
            return;
        }

        setLoadingSincronizar(true);
        try {
            const response = await axios.post('/api/metricas/ecomhub/status-tracking/sincronizar/', {
                data_inicio: dateRange.from.toISOString().split('T')[0],
                data_fim: dateRange.to.toISOString().split('T')[0],
                pais_id: filtros.pais
            }, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            if (response.data.status === 'success') {
                showNotification('success', `Sincronização concluída! ${response.data.pedidos_atualizados || 0} pedidos atualizados`);
                // Recarregar dados após sincronização
                fetchDashboard();
                if (tabAtiva === 'pedidos') {
                    fetchPedidos(paginaAtual);
                }
            }
        } catch (error) {
            console.error('Erro na sincronização:', error);
            showNotification('error', `Erro na sincronização: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingSincronizar(false);
        }
    };

    const fetchHistorico = async (pedidoId) => {
        setLoadingHistorico(true);
        try {
            const response = await axios.get(`/api/metricas/ecomhub/status-tracking/historico/${pedidoId}/`, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });
            
            setHistoricoPedido(response.data);
            setModalHistorico(true);
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            showNotification('error', `Erro ao carregar histórico: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingHistorico(false);
        }
    };

    // ======================== FUNÇÕES AUXILIARES ========================

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const getAlertaBadge = (nivel) => {
        const cores = {
            'normal': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            'amarelo': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            'vermelho': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
            'critico': 'bg-red-600 text-white animate-pulse'
        };
        return cores[nivel] || cores.normal;
    };

    const getStatusIcon = (status) => {
        const icons = {
            'processing': Package,
            'shipped': Ship,
            'with_courier': Truck,
            'out_for_delivery': MapPin,
            'delivered': CheckCircle,
            'issue': AlertCircle,
            'returning': ArrowUpDown,
            'returned': ArrowDown,
            'cancelled': AlertOctagon
        };
        const IconComponent = icons[status] || Package;
        return <IconComponent className="h-4 w-4" />;
    };

    const getStatusColor = (status) => {
        const cores = {
            'processing': 'text-yellow-600',
            'shipped': 'text-blue-600',
            'with_courier': 'text-purple-600',
            'out_for_delivery': 'text-orange-600',
            'delivered': 'text-green-600',
            'issue': 'text-red-600',
            'returning': 'text-gray-600',
            'returned': 'text-gray-500',
            'cancelled': 'text-red-500'
        };
        return cores[status] || 'text-gray-600';
    };

    const formatarTempo = (horas) => {
        if (horas < 24) return `${Math.round(horas)}h`;
        const dias = Math.floor(horas / 24);
        const horasRestantes = Math.round(horas % 24);
        return `${dias}d ${horasRestantes}h`;
    };

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <Activity className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Status Tracking EcomHub</h1>
                {autoRefresh && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Zap className="h-3 w-3 mr-1" />
                        Auto-refresh ativo
                    </Badge>
                )}
            </div>
            
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`border-border ${autoRefresh ? 'bg-green-50 text-green-700 border-green-200' : 'bg-background text-foreground'}`}
                >
                    <Activity className="h-4 w-4 mr-2" />
                    Auto-refresh
                </Button>
                
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchDashboard}
                    disabled={loadingDashboard}
                    className="border-border bg-background text-foreground hover:bg-accent"
                >
                    {loadingDashboard ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Atualizar
                </Button>

                <Select value={filtros.pais} onValueChange={(value) => setFiltros(prev => ({ ...prev, pais: value }))}>
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

    const renderAlertasCriticos = () => {
        if (!alertasCriticos || alertasCriticos.length === 0) return null;

        return (
            <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <AlertDescription>
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-red-800 dark:text-red-200">
                            🚨 ALERTAS CRÍTICOS ({alertasCriticos.length})
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTabAtiva('pedidos')}
                            className="text-red-600 hover:bg-red-100 dark:hover:bg-red-800"
                        >
                            Ver todos
                            <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                        {alertasCriticos.slice(0, 3).map((alerta, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 bg-white dark:bg-red-900/30 rounded border border-red-200 dark:border-red-700">
                                <Badge className={getAlertaBadge(alerta.nivel_alerta)}>
                                    {alerta.nivel_alerta === 'critico' ? '🔴' : '⚠️'}
                                </Badge>
                                <div className="flex-1">
                                    <span className="font-medium text-red-900 dark:text-red-100">
                                        {alerta.cliente_nome} (Pedido #{alerta.shopify_order_number})
                                    </span>
                                    <span className="text-red-700 dark:text-red-300 ml-2">
                                        - {formatarTempo(alerta.tempo_no_status_atual)} em "{alerta.status_atual}"
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => fetchHistorico(alerta.id)}
                                    className="text-red-600 hover:bg-red-100 dark:hover:bg-red-800"
                                >
                                    <History className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </AlertDescription>
            </Alert>
        );
    };

    const renderMetricasCards = () => {
        if (!dadosDashboard?.distribuicao_status) return null;

        const distribuicao = dadosDashboard.distribuicao_status;
        const metricas = dadosDashboard.metricas_performance || {};

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">🟨 Processing</p>
                                <p className="text-xl font-bold text-card-foreground">{distribuicao.processing || 0} pedidos</p>
                                <p className="text-xs text-muted-foreground">
                                    {metricas.tempo_medio_processing ? `${formatarTempo(metricas.tempo_medio_processing)} ⌀` : 'N/A'}
                                </p>
                            </div>
                            <Package className="h-5 w-5 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">🚢 Shipped</p>
                                <p className="text-xl font-bold text-card-foreground">{distribuicao.shipped || 0} pedidos</p>
                                <p className="text-xs text-muted-foreground">
                                    {metricas.tempo_medio_shipped ? `${formatarTempo(metricas.tempo_medio_shipped)} ⌀` : 'N/A'}
                                </p>
                            </div>
                            <Ship className="h-5 w-5 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">✅ Delivered</p>
                                <p className="text-xl font-bold text-card-foreground">{distribuicao.delivered || 0} pedidos</p>
                                <p className="text-xs text-muted-foreground">Finais</p>
                            </div>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">⚠️ Problems</p>
                                <p className="text-xl font-bold text-card-foreground">{distribuicao.issue || 0} pedidos</p>
                                <p className="text-xs text-red-600 font-medium">!Ação!</p>
                            </div>
                            <AlertCircle className="h-5 w-5 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderPerformanceGeral = () => {
        if (!dadosDashboard?.metricas_performance) return null;

        const metricas = dadosDashboard.metricas_performance;

        return (
            <Card className="mb-6 border-border bg-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-card-foreground">
                        <PieChart className="h-5 w-5 text-primary" />
                        Performance Geral
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded">
                            <p className="text-sm text-muted-foreground">Tempo médio total</p>
                            <p className="text-lg font-bold text-card-foreground">
                                {metricas.tempo_medio_total ? formatarTempo(metricas.tempo_medio_total) : 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">(criação → entrega)</p>
                        </div>
                        
                        <div className="text-center p-3 bg-muted/50 rounded">
                            <p className="text-sm text-muted-foreground">Eficiência de entrega</p>
                            <p className="text-lg font-bold text-green-600">
                                {metricas.eficiencia_entrega ? `${metricas.eficiencia_entrega}%` : 'N/A'}
                            </p>
                        </div>
                        
                        <div className="text-center p-3 bg-muted/50 rounded">
                            <p className="text-sm text-muted-foreground">Pedidos problemáticos</p>
                            <p className="text-lg font-bold text-red-600">
                                {metricas.percentual_problemas ? `${metricas.percentual_problemas}%` : 'N/A'}
                            </p>
                        </div>
                        
                        <div className="text-center p-3 bg-muted/50 rounded">
                            <p className="text-sm text-muted-foreground">Melhor performance</p>
                            <p className="text-lg font-bold text-blue-600">
                                {metricas.pais_melhor_performance || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {metricas.tempo_melhor_performance ? `(${formatarTempo(metricas.tempo_melhor_performance)})` : ''}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderControlesSincronizacao = () => (
        <Card className="mb-6 border-border bg-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                    <Settings className="h-5 w-5 text-primary" />
                    Controles de Sincronização
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Sincronize dados manualmente para um período específico
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-end gap-4">
                    <div className="flex-1">
                        <Label htmlFor="period" className="text-sm font-medium text-foreground">
                            Período para Sincronização
                        </Label>
                        <RobustDatePicker
                            dateRange={dateRange}
                            onDateRangeChange={setDateRange}
                            disabled={loadingSincronizar}
                            className="w-full mt-1"
                            placeholder="Selecione o período..."
                        />
                    </div>
                    
                    <Button
                        onClick={sincronizarAgora}
                        disabled={!dateRange?.from || !dateRange?.to || filtros.pais === 'todos' || loadingSincronizar}
                        size="lg"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {loadingSincronizar ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4 mr-2" />
                        )}
                        {loadingSincronizar ? 'Sincronizando...' : 'Sincronizar Agora'}
                    </Button>
                </div>
                
                {filtros.pais === 'todos' && (
                    <p className="text-sm text-yellow-600 mt-2">
                        ⚠️ Selecione um país específico para permitir sincronização manual
                    </p>
                )}
            </CardContent>
        </Card>
    );

    const renderFiltrosPedidos = () => (
        <Card className="mb-4 border-border bg-card">
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <Label htmlFor="status" className="text-sm font-medium text-foreground">Status</Label>
                        <Select 
                            value={filtros.status} 
                            onValueChange={(value) => setFiltros(prev => ({ ...prev, status: value }))}
                        >
                            <SelectTrigger className="border-border bg-background text-foreground">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-popover">
                                {STATUS_OPTIONS.map(status => (
                                    <SelectItem key={status.value} value={status.value} className="text-popover-foreground hover:bg-accent">
                                        {status.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div>
                        <Label htmlFor="nivel-alerta" className="text-sm font-medium text-foreground">Nível de Alerta</Label>
                        <Select 
                            value={filtros.nivel_alerta} 
                            onValueChange={(value) => setFiltros(prev => ({ ...prev, nivel_alerta: value }))}
                        >
                            <SelectTrigger className="border-border bg-background text-foreground">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-popover">
                                {NIVEL_ALERTA_OPTIONS.map(nivel => (
                                    <SelectItem key={nivel.value} value={nivel.value} className="text-popover-foreground hover:bg-accent">
                                        {nivel.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div>
                        <Label htmlFor="ordenacao" className="text-sm font-medium text-foreground">Ordenação</Label>
                        <Select 
                            value={filtros.ordenacao} 
                            onValueChange={(value) => setFiltros(prev => ({ ...prev, ordenacao: value }))}
                        >
                            <SelectTrigger className="border-border bg-background text-foreground">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-popover">
                                {ORDENACAO_OPTIONS.map(ordem => (
                                    <SelectItem key={ordem.value} value={ordem.value} className="text-popover-foreground hover:bg-accent">
                                        {ordem.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="flex items-end">
                        <Button
                            onClick={() => fetchPedidos(1)}
                            disabled={loadingPedidos}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {loadingPedidos ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Filter className="h-4 w-4 mr-2" />
                            )}
                            Filtrar
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    const renderTabelaPedidos = () => (
        <Card className="border-border bg-card">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-card-foreground">Lista de Pedidos</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            {pedidos.length} pedidos encontrados
                        </CardDescription>
                    </div>
                    
                    {totalPaginas > 1 && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchPedidos(paginaAtual - 1)}
                                disabled={paginaAtual <= 1 || loadingPedidos}
                                className="border-border bg-background text-foreground hover:bg-accent"
                            >
                                Anterior
                            </Button>
                            
                            <span className="text-sm text-muted-foreground">
                                Página {paginaAtual} de {totalPaginas}
                            </span>
                            
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchPedidos(paginaAtual + 1)}
                                disabled={paginaAtual >= totalPaginas || loadingPedidos}
                                className="border-border bg-background text-foreground hover:bg-accent"
                            >
                                Próxima
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            
            <CardContent className="p-0">
                {loadingPedidos ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Carregando pedidos...</span>
                    </div>
                ) : pedidos.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">Nenhum pedido encontrado com os filtros aplicados</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border">
                                    <TableHead className="text-muted-foreground">Cliente</TableHead>
                                    <TableHead className="text-muted-foreground">Pedido</TableHead>
                                    <TableHead className="text-muted-foreground">Status</TableHead>
                                    <TableHead className="text-muted-foreground">Tempo no Status</TableHead>
                                    <TableHead className="text-muted-foreground">País</TableHead>
                                    <TableHead className="text-muted-foreground">Alerta</TableHead>
                                    <TableHead className="text-muted-foreground">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pedidos.map((pedido) => (
                                    <TableRow key={pedido.id} className="border-border">
                                        <TableCell className="text-card-foreground">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{pedido.cliente_nome}</span>
                                            </div>
                                        </TableCell>
                                        
                                        <TableCell className="text-card-foreground">
                                            <span className="font-mono text-sm">#{pedido.shopify_order_number}</span>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <div className={`flex items-center gap-2 ${getStatusColor(pedido.status_atual)}`}>
                                                {getStatusIcon(pedido.status_atual)}
                                                <span className="font-medium">{pedido.status_atual}</span>
                                            </div>
                                        </TableCell>
                                        
                                        <TableCell className="text-card-foreground">
                                            <div className="flex items-center gap-2">
                                                <Timer className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">
                                                    {formatarTempo(pedido.tempo_no_status_atual)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        
                                        <TableCell className="text-card-foreground">
                                            <span className="text-sm">{pedido.pais_nome}</span>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <Badge className={getAlertaBadge(pedido.nivel_alerta)}>
                                                {pedido.nivel_alerta}
                                            </Badge>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="border-border bg-popover">
                                                    <DropdownMenuItem 
                                                        onClick={() => fetchHistorico(pedido.id)}
                                                        className="text-popover-foreground hover:bg-accent"
                                                    >
                                                        <History className="h-4 w-4 mr-2" />
                                                        Ver Histórico
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const renderModalHistorico = () => (
        <Dialog open={modalHistorico} onOpenChange={setModalHistorico}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto border-border bg-popover">
                <DialogHeader>
                    <DialogTitle className="text-popover-foreground">
                        Histórico - Pedido #{historicoPedido?.shopify_order_number}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Timeline completo de mudanças de status do pedido
                    </DialogDescription>
                </DialogHeader>
                
                {loadingHistorico ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Carregando histórico...</span>
                    </div>
                ) : historicoPedido ? (
                    <div className="space-y-4">
                        {/* Informações gerais do pedido */}
                        <Card className="border-border bg-card">
                            <CardContent className="p-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Cliente</p>
                                        <p className="font-medium text-card-foreground">{historicoPedido.cliente_nome}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">País</p>
                                        <p className="font-medium text-card-foreground">{historicoPedido.pais_nome}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Status Atual</p>
                                        <div className={`flex items-center gap-2 ${getStatusColor(historicoPedido.status_atual)}`}>
                                            {getStatusIcon(historicoPedido.status_atual)}
                                            <span className="font-medium">{historicoPedido.status_atual}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tempo Total</p>
                                        <p className="font-medium text-card-foreground">
                                            {formatarTempo(historicoPedido.tempo_total_processamento)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Timeline de mudanças */}
                        <Card className="border-border bg-card">
                            <CardHeader>
                                <CardTitle className="text-card-foreground">Timeline de Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {historicoPedido.historico?.map((item, index) => (
                                        <div key={index} className="flex items-start gap-4 relative">
                                            {/* Linha vertical conectora */}
                                            {index < historicoPedido.historico.length - 1 && (
                                                <div className="absolute left-3 top-8 w-px h-8 bg-border"></div>
                                            )}
                                            
                                            {/* Ícone do status */}
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center bg-background ${getStatusColor(item.status_novo)}`}>
                                                {getStatusIcon(item.status_novo)}
                                            </div>
                                            
                                            {/* Informações da mudança */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-medium ${getStatusColor(item.status_novo)}`}>
                                                        {item.status_novo}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground">
                                                        {new Date(item.data_mudanca).toLocaleString('pt-BR')}
                                                    </span>
                                                </div>
                                                
                                                {item.tempo_no_status_anterior && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatarTempo(item.tempo_no_status_anterior)} no status anterior
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-8">Nenhum histórico encontrado</p>
                )}
                
                <DialogFooter>
                    <Button 
                        onClick={() => setModalHistorico(false)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    const renderConfiguracao = () => (
        <Card className="border-border bg-card">
            <CardHeader>
                <CardTitle className="text-card-foreground">Configurações do Sistema</CardTitle>
                <CardDescription className="text-muted-foreground">
                    Configure os limites de alerta e outras preferências
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Alert className="border-border bg-background">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <AlertDescription className="text-muted-foreground">
                        As configurações de alerta são gerenciadas pelo backend automaticamente.
                        <br />
                        Consulte a documentação técnica para ajustes avançados.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );

    // ======================== EFEITOS ========================

    useEffect(() => {
        fetchDashboard();
        
        // Auto-refresh a cada 5 minutos se habilitado
        let interval;
        if (autoRefresh) {
            interval = setInterval(() => {
                fetchDashboard();
                if (tabAtiva === 'pedidos') {
                    fetchPedidos(paginaAtual);
                }
            }, 5 * 60 * 1000); // 5 minutos
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh, tabAtiva, paginaAtual]);

    useEffect(() => {
        if (tabAtiva === 'pedidos') {
            fetchPedidos(1);
        }
    }, [tabAtiva, filtros]);

    // ======================== RENDER PRINCIPAL ========================

    return (
        <div className="flex-1 space-y-4 p-6 min-h-screen bg-background">
            {/* Notificações */}
            {notification && (
                <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className="mb-4 border-border">
                    {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertDescription>{notification.message}</AlertDescription>
                </Alert>
            )}

            {/* Header */}
            {renderHeader()}

            {/* Alertas Críticos */}
            {renderAlertasCriticos()}

            {/* Navegação por Tabs */}
            <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="w-full">
                <TabsList className="grid w-fit grid-cols-3 bg-muted">
                    <TabsTrigger value="dashboard" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="pedidos" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Package className="h-4 w-4 mr-2" />
                        Lista Pedidos
                    </TabsTrigger>
                    <TabsTrigger value="configuracao" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Settings className="h-4 w-4 mr-2" />
                        Configuração
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-4">
                    {renderMetricasCards()}
                    {renderPerformanceGeral()}
                    {renderControlesSincronizacao()}
                </TabsContent>

                <TabsContent value="pedidos" className="space-y-4">
                    {renderFiltrosPedidos()}
                    {renderTabelaPedidos()}
                </TabsContent>

                <TabsContent value="configuracao">
                    {renderConfiguracao()}
                </TabsContent>
            </Tabs>

            {/* Modal de Histórico */}
            {renderModalHistorico()}
        </div>
    );
}

export default EcomhubStatusPage;