// frontend/src/features/status/EcomhubStatusPage.js - SPRINT 4 FINAL - Sistema Completo de Tracking ECOMHUB
import React, { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle, Activity, Truck, Package, Clock, TrendingUp,
    RefreshCw, Settings, Filter, Eye, Search, ChevronDown, ChevronUp,
    RotateCcw, CheckCircle, XCircle, AlertCircle, Timer,
    List, BarChart3, Users, Globe, LayoutDashboard,
    Loader2, Calendar, ArrowUpDown, ArrowUp, ArrowDown, ArrowRight
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
import { ScrollArea } from '../../components/ui/scroll-area';
import { useToast } from '../../components/ui/use-toast';
import { Toaster } from '../../components/ui/toaster';

// Constantes
const PAISES = [
    { value: 'todos', label: 'Todos os Países', id: null },
    { value: '164', label: 'Espanha', id: 164 },
    { value: '41', label: 'Croácia', id: 41 },
    { value: '66', label: 'Grécia', id: 66 },
    { value: '82', label: 'Itália', id: 82 },
    { value: '142', label: 'Romênia', id: 142 },
    { value: '44', label: 'República Checa', id: 44 },
    { value: '139', label: 'Polônia', id: 139 }
];

const STATUS_MAP = {
    'processing': { label: 'Processando', color: 'bg-blue-500', icon: Package },
    'preparing_for_shipping': { label: 'Preparando Envio', color: 'bg-blue-600', icon: Package },
    'ready_to_ship': { label: 'Pronto p/ Envio', color: 'bg-indigo-500', icon: Package },
    'shipped': { label: 'Enviado', color: 'bg-purple-500', icon: Truck },
    'with_courier': { label: 'Com Transportadora', color: 'bg-purple-600', icon: Truck },
    'out_for_delivery': { label: 'Saiu p/ Entrega', color: 'bg-orange-500', icon: Truck },
    'issue': { label: 'Com Problemas', color: 'bg-red-500', icon: AlertTriangle }
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
    const [statusFiltro, setStatusFiltro] = useState('');
    const [nivelAlertaFiltro, setNivelAlertaFiltro] = useState('');
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

    // ======================== FUNÇÕES DE API ========================

    const fetchDashboard = useCallback(async () => {
        setLoadingDashboard(true);
        try {
            const params = {};
            if (paisSelecionado !== 'todos') {
                params.country_id = paisSelecionado;
            }

            const response = await axios.get('/api/metricas/ecomhub/orders/dashboard/', {
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
            if (statusFiltro) params.status = statusFiltro;
            if (nivelAlertaFiltro) params.alert_level = nivelAlertaFiltro;
            if (buscaTexto.trim()) params.search = buscaTexto.trim();

            const response = await axios.get('/api/metricas/ecomhub/orders/', {
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
            const response = await axios.get(`/api/metricas/ecomhub/orders/${orderId}/history/`, {
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
            const response = await axios.post('/api/metricas/ecomhub/orders/sync/', {}, {
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
            const response = await axios.get('/api/metricas/ecomhub/alert-config/', {
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

    const atualizarConfig = async (status, thresholds) => {
        try {
            await axios.put(`/api/metricas/ecomhub/alert-config/${status}/`, thresholds, {
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
        } catch (error) {
            console.error('Erro ao atualizar config:', error);
            toast({
                title: "Erro",
                description: "Erro ao atualizar configuração",
                variant: "destructive"
            });
        }
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
        setStatusFiltro('');
        setNivelAlertaFiltro('');
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
                        {PAISES.map(pais => (
                            <SelectItem key={pais.value} value={pais.value}>
                                {pais.label}
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

    const renderCardMetricas = () => {
        if (!dadosDashboard) return null;

        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            <div className="text-2xl font-bold">{dadosDashboard.total_active_orders || 0}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">Pedidos Ativos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <XCircle className="h-5 w-5 text-red-600" />
                            <div className="text-2xl font-bold text-red-600">{dadosDashboard.by_alert_level?.critical || 0}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">Críticos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                            <div className="text-2xl font-bold text-orange-600">{dadosDashboard.by_alert_level?.red || 0}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">Urgentes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="h-5 w-5 text-yellow-600" />
                            <div className="text-2xl font-bold text-yellow-600">{dadosDashboard.by_alert_level?.yellow || 0}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">Atenção</p>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderDistribuicaoStatus = () => {
        if (!dadosDashboard?.by_status) return null;

        const total = dadosDashboard.total_active_orders || 1;

        return (
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Distribuição por Status</CardTitle>
                    <CardDescription>Pedidos ativos por status atual</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Object.entries(dadosDashboard.by_status).map(([status, count]) => {
                            const statusConfig = STATUS_MAP[status];
                            if (!statusConfig || count === 0) return null;

                            const IconComponent = statusConfig.icon;
                            const percentage = ((count / total) * 100).toFixed(1);

                            return (
                                <div key={status} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`w-3 h-3 rounded-full ${statusConfig.color}`}></div>
                                        <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-sm truncate">{statusConfig.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <Progress value={parseFloat(percentage)} className="w-24 h-2" />
                                        <span className="text-sm font-medium w-8 text-right">{count}</span>
                                        <span className="text-xs text-muted-foreground w-12 text-right">{percentage}%</span>
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
                                <SelectItem value="">Todos os Status</SelectItem>
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
                                <SelectItem value="">Todos os Níveis</SelectItem>
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
                                        <TableHead>Pedido</TableHead>
                                        <TableHead>Cliente</TableHead>
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
                                                    <TableCell className="font-mono text-xs">{pedido.order_id}</TableCell>
                                                    <TableCell>
                                                        <div className="text-sm font-medium">{pedido.customer_name}</div>
                                                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                                                            {pedido.product_name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <StatusIcon className="h-3 w-3" />
                                                            <span className="text-xs">{statusConfig.label}</span>
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
                <CardDescription>Defina os limites de tempo para cada status (em horas)</CardDescription>
            </CardHeader>
            <CardContent>
                {loadingConfigs ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : configsAlerta.length > 0 ? (
                    <div className="space-y-4">
                        {configsAlerta.map(config => (
                            <div key={config.status} className="p-4 border rounded">
                                <h4 className="font-medium mb-3">
                                    {STATUS_MAP[config.status]?.label || config.status}
                                </h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-xs">🟡 Atenção (horas)</Label>
                                        <Input
                                            type="number"
                                            defaultValue={config.yellow_threshold_hours}
                                            className="h-9"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">🟠 Urgente (horas)</Label>
                                        <Input
                                            type="number"
                                            defaultValue={config.red_threshold_hours}
                                            className="h-9"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">🔴 Crítico (horas)</Label>
                                        <Input
                                            type="number"
                                            defaultValue={config.critical_threshold_hours}
                                            className="h-9"
                                        />
                                    </div>
                                </div>
                                <Button size="sm" className="mt-3">
                                    Salvar Configuração
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
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

    // ======================== RENDER PRINCIPAL ========================

    return (
        <div className="flex-1 space-y-4 p-6 min-h-screen bg-background">
            {renderHeader()}
            {renderAlertasCriticos()}

            <Tabs value={abaSelecionada} onValueChange={setAbaSelecionada}>
                <TabsList className="grid w-fit grid-cols-3">
                    <TabsTrigger value="dashboard">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="lista">
                        <List className="h-4 w-4 mr-2" />
                        Lista
                    </TabsTrigger>
                    <TabsTrigger value="configuracoes">
                        <Settings className="h-4 w-4 mr-2" />
                        Configurações
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-4">
                    {loadingDashboard ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            {renderCardMetricas()}
                            {renderDistribuicaoStatus()}
                            {renderGargalos()}

                            {dadosDashboard?.last_sync && (
                                <div className="text-xs text-muted-foreground text-center">
                                    Última sincronização: {formatarData(dadosDashboard.last_sync)}
                                </div>
                            )}
                        </>
                    )}
                </TabsContent>

                <TabsContent value="lista" className="space-y-4">
                    {renderFiltrosPedidos()}
                    {renderTabelaPedidos()}
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
