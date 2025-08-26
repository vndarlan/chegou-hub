// frontend/src/features/status/EcomhubStatusPage.js - DASHBOARD COMPLETO STATUS TRACKING ECOMHUB
import React, { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle, Activity, Truck, Package, Clock, TrendingUp, 
    RefreshCw, Settings, Filter, Eye, Search, ChevronDown, ChevronUp,
    RotateCcw, CheckCircle, XCircle, AlertCircle, Timer, 
    List, BarChart3, Users, Globe, LayoutDashboard, 
    Loader2, Calendar, ArrowUpDown, ArrowUp, ArrowDown
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

// Constantes
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
    'normal': { label: 'Normal', color: 'bg-green-500 text-white', icon: CheckCircle },
    'amarelo': { label: 'Atenção', color: 'bg-yellow-500 text-black', icon: Clock },
    'vermelho': { label: 'Urgente', color: 'bg-red-500 text-white', icon: AlertCircle },
    'critico': { label: 'Crítico', color: 'bg-red-700 text-white', icon: XCircle }
};

function EcomhubStatusPage() {
    // Estados principais
    const [abaSelecionada, setAbaSelecionada] = useState('dashboard');
    const [dadosDashboard, setDadosDashboard] = useState(null);
    const [listaPedidos, setListaPedidos] = useState([]);
    const [pedidoHistorico, setPedidoHistorico] = useState(null);
    
    // Estados de filtros
    const [paisSelecionado, setPaisSelecionado] = useState('todos');
    const [statusFiltro, setStatusFiltro] = useState('todos');
    const [nivelAlertaFiltro, setNivelAlertaFiltro] = useState('todos');
    const [buscaCliente, setBuscaCliente] = useState('');
    const [buscaPedidoId, setBuscaPedidoId] = useState('');
    
    // Estados de ordenação
    const [sortBy, setSortBy] = useState('tempo_no_status_atual');
    const [sortOrder, setSortOrder] = useState('desc');
    
    // Estados de loading e modal
    const [loadingDashboard, setLoadingDashboard] = useState(false);
    const [loadingPedidos, setLoadingPedidos] = useState(false);
    const [loadingSincronizar, setLoadingSincronizar] = useState(false);
    const [modalHistorico, setModalHistorico] = useState(false);
    const [modalConfiguracoes, setModalConfiguracoes] = useState(false);
    
    // Estados de notificação e configuração
    const [notification, setNotification] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [configuracoes, setConfiguracoes] = useState(null);
    
    // Estados de paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalItens, setTotalItens] = useState(0);

    // ======================== FUNÇÕES DE API ========================

    const buscarDadosDashboard = useCallback(async () => {
        setLoadingDashboard(true);
        try {
            const response = await axios.get('/api/metricas/ecomhub/status-tracking/dashboard/', {
                params: { pais: paisSelecionado !== 'todos' ? paisSelecionado : undefined },
                headers: { 'X-CSRFToken': getCSRFToken() }
            });
            setDadosDashboard(response.data);
        } catch (error) {
            console.error('Erro ao buscar dashboard:', error);
            showNotification('error', 'Erro ao carregar métricas do dashboard');
        } finally {
            setLoadingDashboard(false);
        }
    }, [paisSelecionado]);

    const buscarPedidos = useCallback(async (resetarPagina = false) => {
        setLoadingPedidos(true);
        const pagina = resetarPagina ? 1 : paginaAtual;
        
        try {
            const params = {
                page: pagina,
                ordering: sortOrder === 'desc' ? `-${sortBy}` : sortBy
            };
            
            if (paisSelecionado !== 'todos') params.pais = paisSelecionado;
            if (statusFiltro !== 'todos') params.status_atual = statusFiltro;
            if (nivelAlertaFiltro !== 'todos') params.nivel_alerta = nivelAlertaFiltro;
            if (buscaCliente.trim()) params.customer_name = buscaCliente.trim();
            if (buscaPedidoId.trim()) params.pedido_id = buscaPedidoId.trim();

            const response = await axios.get('/api/metricas/ecomhub/status-tracking/pedidos/', {
                params,
                headers: { 'X-CSRFToken': getCSRFToken() }
            });
            
            setListaPedidos(response.data.results || []);
            setTotalPaginas(Math.ceil(response.data.count / 20));
            setTotalItens(response.data.count);
            
            if (resetarPagina) setPaginaAtual(1);
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
            showNotification('error', 'Erro ao carregar lista de pedidos');
        } finally {
            setLoadingPedidos(false);
        }
    }, [paisSelecionado, statusFiltro, nivelAlertaFiltro, buscaCliente, buscaPedidoId, sortBy, sortOrder, paginaAtual]);

    const buscarHistoricoPedido = async (pedidoId) => {
        try {
            const response = await axios.get(`/api/metricas/ecomhub/status-tracking/historico/${pedidoId}/`, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });
            setPedidoHistorico(response.data);
            setModalHistorico(true);
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            showNotification('error', 'Erro ao carregar histórico do pedido');
        }
    };

    const sincronizarAgora = async () => {
        setLoadingSincronizar(true);
        try {
            const today = new Date();
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(today.getDate() - 7);

            const response = await axios.post('/api/metricas/ecomhub/status-tracking/sincronizar/', {
                data_inicio: oneWeekAgo.toISOString().split('T')[0],
                data_fim: today.toISOString().split('T')[0],
                pais_id: paisSelecionado,
                forcar_sincronizacao: true
            }, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            if (response.data.status === 'success') {
                showNotification('success', `Sincronização concluída! ${response.data.dados_processados?.total_processados || 0} pedidos processados`);
                buscarDadosDashboard();
                if (abaSelecionada === 'lista') {
                    buscarPedidos(true);
                }
            }
        } catch (error) {
            console.error('Erro na sincronização:', error);
            showNotification('error', `Erro na sincronização: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingSincronizar(false);
        }
    };

    // ======================== FUNÇÕES AUXILIARES ========================

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

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

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <Activity className="h-6 w-6 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Status Teste</h1>
                    <p className="text-sm text-muted-foreground">
                        Monitoramento em tempo real de pedidos ativos
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <Select value={paisSelecionado} onValueChange={setPaisSelecionado}>
                    <SelectTrigger className="w-48 border-border bg-background text-foreground">
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

                <Button
                    variant="outline"
                    size="sm"
                    onClick={sincronizarAgora}
                    disabled={loadingSincronizar}
                    className="border-border bg-background text-foreground hover:bg-accent"
                >
                    {loadingSincronizar ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {loadingSincronizar ? 'Sincronizando...' : 'Sincronizar'}
                </Button>
            </div>
        </div>
    );

    const renderAlertasCriticos = () => {
        if (!dadosDashboard || dadosDashboard.alertas_criticos === 0) return null;

        return (
            <Alert variant="destructive" className="mb-4 border-red-500 bg-red-50 dark:bg-red-900/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                    ⚠️ <strong>{dadosDashboard.alertas_criticos} pedidos críticos</strong> precisam de atenção imediata!
                    {dadosDashboard.alertas_vermelhos > 0 && (
                        <span className="ml-2">+ {dadosDashboard.alertas_vermelhos} pedidos urgentes</span>
                    )}
                </AlertDescription>
            </Alert>
        );
    };

    const renderCardsDashboard = () => {
        if (!dadosDashboard) return null;

        const cards = [
            {
                title: 'Pedidos Ativos',
                value: dadosDashboard.total_pedidos_ativos || 0,
                icon: Package,
                color: 'text-blue-600',
                description: 'Total em monitoramento'
            },
            {
                title: 'Alertas Críticos',
                value: dadosDashboard.alertas_criticos || 0,
                icon: XCircle,
                color: 'text-red-600',
                description: 'Precisam ação imediata'
            },
            {
                title: 'Alertas Urgentes',
                value: dadosDashboard.alertas_vermelhos || 0,
                icon: AlertCircle,
                color: 'text-orange-600',
                description: 'Atraso significativo'
            },
            {
                title: 'Em Atenção',
                value: dadosDashboard.alertas_amarelos || 0,
                icon: Clock,
                color: 'text-yellow-600',
                description: 'Atraso moderado'
            },
            {
                title: 'Eficiência Entrega',
                value: `${dadosDashboard.eficiencia_entrega_pct || 0}%`,
                icon: TrendingUp,
                color: 'text-green-600',
                description: 'Taxa de sucesso'
            },
            {
                title: 'Taxa de Problemas',
                value: `${dadosDashboard.taxa_problemas_pct || 0}%`,
                icon: AlertTriangle,
                color: 'text-red-500',
                description: 'Pedidos com problemas'
            }
        ];

        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {cards.map((card, index) => {
                    const IconComponent = card.icon;
                    return (
                        <Card key={index} className="border-border bg-card">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <IconComponent className={`h-5 w-5 ${card.color}`} />
                                    <span className="text-2xl font-bold text-card-foreground">
                                        {card.value}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-card-foreground">{card.title}</p>
                                    <p className="text-xs text-muted-foreground">{card.description}</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        );
    };

    const renderDistribuicaoStatus = () => {
        if (!dadosDashboard?.distribuicao_status) return null;

        return (
            <Card className="mb-6 border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-card-foreground">Distribuição por Status</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Pedidos ativos por status atual
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Object.entries(dadosDashboard.distribuicao_status).map(([status, count]) => {
                            const statusConfig = STATUS_MAP[status];
                            if (!statusConfig || count === 0) return null;
                            
                            const IconComponent = statusConfig.icon;
                            const total = dadosDashboard.total_pedidos_ativos || 1;
                            const percentage = ((count / total) * 100).toFixed(1);

                            return (
                                <div key={status} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${statusConfig.color}`}></div>
                                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-card-foreground">{statusConfig.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-24">
                                            <Progress value={parseFloat(percentage)} className="h-2" />
                                        </div>
                                        <span className="text-sm font-medium text-card-foreground w-12 text-right">
                                            {count}
                                        </span>
                                        <span className="text-xs text-muted-foreground w-12 text-right">
                                            {percentage}%
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

    const renderFiltrosPedidos = () => (
        <Card className="mb-4 border-border bg-card">
            <CardHeader>
                <CardTitle className="text-sm text-card-foreground">Filtros Avançados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <Label htmlFor="status-filter" className="text-xs text-foreground">Status</Label>
                        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                            <SelectTrigger className="h-8 text-xs border-border bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-popover">
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
                        <Label htmlFor="alerta-filter" className="text-xs text-foreground">Nível de Alerta</Label>
                        <Select value={nivelAlertaFiltro} onValueChange={setNivelAlertaFiltro}>
                            <SelectTrigger className="h-8 text-xs border-border bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-popover">
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
                        <Label htmlFor="cliente-search" className="text-xs text-foreground">Cliente</Label>
                        <Input
                            id="cliente-search"
                            placeholder="Nome do cliente..."
                            value={buscaCliente}
                            onChange={(e) => setBuscaCliente(e.target.value)}
                            className="h-8 text-xs border-border bg-background"
                        />
                    </div>

                    <div>
                        <Label htmlFor="pedido-search" className="text-xs text-foreground">ID do Pedido</Label>
                        <Input
                            id="pedido-search"
                            placeholder="ID ou número..."
                            value={buscaPedidoId}
                            onChange={(e) => setBuscaPedidoId(e.target.value)}
                            className="h-8 text-xs border-border bg-background"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={() => buscarPedidos(true)}
                        disabled={loadingPedidos}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Search className="h-3 w-3 mr-1" />
                        Filtrar
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setStatusFiltro('todos');
                            setNivelAlertaFiltro('todos');
                            setBuscaCliente('');
                            setBuscaPedidoId('');
                            setSortBy('tempo_no_status_atual');
                            setSortOrder('desc');
                        }}
                        className="border-border bg-background text-foreground hover:bg-accent"
                    >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Limpar
                    </Button>
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
                            {totalItens} pedidos encontrados
                        </CardDescription>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => buscarPedidos()}
                        disabled={loadingPedidos}
                        className="border-border bg-background text-foreground hover:bg-accent"
                    >
                        {loadingPedidos ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                            <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Atualizar
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 border-border">
                                <TableHead className="text-xs">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto p-0 font-medium text-xs hover:text-foreground"
                                        onClick={() => handleSort('pedido_id')}
                                    >
                                        Pedido
                                        {sortBy === 'pedido_id' ? (
                                            sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                                        ) : (
                                            <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                        )}
                                    </Button>
                                </TableHead>
                                <TableHead className="text-xs">Cliente</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto p-0 font-medium text-xs hover:text-foreground"
                                        onClick={() => handleSort('tempo_no_status_atual')}
                                    >
                                        Tempo no Status
                                        {sortBy === 'tempo_no_status_atual' ? (
                                            sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                                        ) : (
                                            <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                        )}
                                    </Button>
                                </TableHead>
                                <TableHead className="text-xs">Alerta</TableHead>
                                <TableHead className="text-xs">País</TableHead>
                                <TableHead className="text-xs">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {listaPedidos.map((pedido) => {
                                const statusConfig = STATUS_MAP[pedido.status_atual] || { label: pedido.status_atual, color: 'bg-gray-500', icon: Package };
                                const alertaConfig = NIVEL_ALERTA_CONFIG[pedido.nivel_alerta] || NIVEL_ALERTA_CONFIG.normal;
                                const StatusIcon = statusConfig.icon;
                                const AlertaIcon = alertaConfig.icon;

                                return (
                                    <TableRow key={pedido.pedido_id} className="border-border hover:bg-muted/30">
                                        <TableCell className="text-xs font-mono">
                                            {pedido.pedido_id}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <div>
                                                <div className="font-medium">{pedido.customer_name}</div>
                                                <div className="text-muted-foreground truncate max-w-32">
                                                    {pedido.produto_nome}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <div className="flex items-center gap-2">
                                                <StatusIcon className="h-3 w-3" />
                                                <span>{statusConfig.label}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {formatarTempo(pedido.tempo_no_status_atual)}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <Badge variant="secondary" className={`text-xs ${alertaConfig.color}`}>
                                                <AlertaIcon className="h-3 w-3 mr-1" />
                                                {alertaConfig.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {pedido.pais}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => buscarHistoricoPedido(pedido.pedido_id)}
                                                className="h-6 px-2 text-xs border-border bg-background hover:bg-accent"
                                            >
                                                <Eye className="h-3 w-3" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Paginação */}
                {totalPaginas > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-border">
                        <div className="text-xs text-muted-foreground">
                            Página {paginaAtual} de {totalPaginas} ({totalItens} total)
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                                disabled={paginaAtual <= 1 || loadingPedidos}
                                className="h-6 px-3 text-xs border-border bg-background hover:bg-accent"
                            >
                                Anterior
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                                disabled={paginaAtual >= totalPaginas || loadingPedidos}
                                className="h-6 px-3 text-xs border-border bg-background hover:bg-accent"
                            >
                                Próxima
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const renderModalHistorico = () => (
        <Dialog open={modalHistorico} onOpenChange={setModalHistorico}>
            <DialogContent className="max-w-4xl max-h-[80vh] border-border bg-popover">
                <DialogHeader>
                    <DialogTitle className="text-popover-foreground">
                        Histórico do Pedido {pedidoHistorico?.pedido?.pedido_id}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Timeline completa de mudanças de status
                    </DialogDescription>
                </DialogHeader>

                {pedidoHistorico && (
                    <ScrollArea className="max-h-96 pr-4">
                        <div className="space-y-4">
                            {/* Dados do pedido */}
                            <Card className="border-border bg-card">
                                <CardContent className="p-4">
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <strong>Cliente:</strong> {pedidoHistorico.pedido.customer_name}
                                        </div>
                                        <div>
                                            <strong>Email:</strong> {pedidoHistorico.pedido.customer_email}
                                        </div>
                                        <div>
                                            <strong>Produto:</strong> {pedidoHistorico.pedido.produto_nome}
                                        </div>
                                        <div>
                                            <strong>País:</strong> {pedidoHistorico.pedido.pais}
                                        </div>
                                        <div>
                                            <strong>Status Atual:</strong> {STATUS_MAP[pedidoHistorico.pedido.status_atual]?.label || pedidoHistorico.pedido.status_atual}
                                        </div>
                                        <div>
                                            <strong>Tempo no Status:</strong> {formatarTempo(pedidoHistorico.pedido.tempo_no_status_atual)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Timeline do histórico */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-sm text-popover-foreground">Timeline de Status</h4>
                                {pedidoHistorico.historico?.length > 0 ? (
                                    pedidoHistorico.historico.map((registro, index) => (
                                        <div key={index} className="flex items-start gap-3 p-3 border border-border rounded bg-card">
                                            <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-medium text-card-foreground">
                                                        {STATUS_MAP[registro.status_anterior]?.label || registro.status_anterior}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">→</span>
                                                    <span className="text-xs font-medium text-primary">
                                                        {STATUS_MAP[registro.status_novo]?.label || registro.status_novo}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatarData(registro.data_mudanca)}
                                                </div>
                                                {registro.tempo_no_status_anterior && (
                                                    <div className="text-xs text-muted-foreground">
                                                        Ficou {formatarTempo(registro.tempo_no_status_anterior)} no status anterior
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs text-muted-foreground text-center py-4">
                                        Nenhuma mudança de status registrada
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                )}

                <DialogFooter>
                    <Button 
                        variant="outline" 
                        onClick={() => setModalHistorico(false)}
                        className="border-border bg-background text-foreground hover:bg-accent"
                    >
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    // ======================== EFEITOS ========================

    useEffect(() => {
        buscarDadosDashboard();
    }, [buscarDadosDashboard]);

    useEffect(() => {
        if (abaSelecionada === 'lista') {
            buscarPedidos(true);
        }
    }, [abaSelecionada, paisSelecionado]);

    useEffect(() => {
        if (abaSelecionada === 'lista') {
            buscarPedidos();
        }
    }, [buscarPedidos]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            if (abaSelecionada === 'dashboard') {
                buscarDadosDashboard();
            } else if (abaSelecionada === 'lista') {
                buscarPedidos();
            }
        }, 30000); // 30 segundos

        return () => clearInterval(interval);
    }, [autoRefresh, abaSelecionada, buscarDadosDashboard, buscarPedidos]);

    // ======================== RENDER PRINCIPAL ========================

    return (
        <div className="flex-1 space-y-4 p-6 min-h-screen bg-background">
            {/* Notificações */}
            {notification && (
                <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className="mb-4 border-border">
                    {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <AlertDescription>{notification.message}</AlertDescription>
                </Alert>
            )}

            {/* Header */}
            {renderHeader()}

            {/* Alertas críticos */}
            {renderAlertasCriticos()}

            {/* Navegação por tabs */}
            <Tabs value={abaSelecionada} onValueChange={setAbaSelecionada} className="w-full">
                <TabsList className="grid w-fit grid-cols-3 bg-muted">
                    <TabsTrigger value="dashboard" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="lista" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <List className="h-4 w-4 mr-2" />
                        Lista Pedidos
                    </TabsTrigger>
                    <TabsTrigger value="configuracao" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Settings className="h-4 w-4 mr-2" />
                        Configuração
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-4">
                    {loadingDashboard ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            {renderCardsDashboard()}
                            {renderDistribuicaoStatus()}
                            
                            {dadosDashboard?.ultima_sincronizacao && (
                                <div className="text-xs text-muted-foreground text-center">
                                    Última sincronização: {formatarData(dadosDashboard.ultima_sincronizacao)}
                                </div>
                            )}
                        </>
                    )}
                </TabsContent>

                <TabsContent value="lista" className="space-y-4">
                    {renderFiltrosPedidos()}
                    {renderTabelaPedidos()}
                </TabsContent>

                <TabsContent value="configuracao" className="space-y-4">
                    <Card className="border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-card-foreground">Configurações do Sistema</CardTitle>
                            <CardDescription className="text-muted-foreground">
                                Configure limites de alerta e sincronização automática
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-sm font-medium text-foreground">Auto-Refresh</Label>
                                        <p className="text-xs text-muted-foreground">Atualizar dados a cada 30 segundos</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={autoRefresh ? "default" : "outline"}
                                        onClick={() => setAutoRefresh(!autoRefresh)}
                                        className={autoRefresh ? "bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-accent"}
                                    >
                                        {autoRefresh ? 'Ativo' : 'Inativo'}
                                    </Button>
                                </div>
                                
                                <div className="p-4 border border-border rounded bg-muted/30">
                                    <h4 className="text-sm font-medium text-foreground mb-2">Limites de Alerta</h4>
                                    <div className="space-y-2 text-xs text-muted-foreground">
                                        <div>• <strong>Amarelo:</strong> 7 dias (168h) - Atenção</div>
                                        <div>• <strong>Vermelho:</strong> 14 dias (336h) - Urgente</div>
                                        <div>• <strong>Crítico:</strong> 21 dias (504h) - Crítico</div>
                                        <div>• <strong>Entrega:</strong> 3, 5 e 7 dias respectivamente</div>
                                        <div>• <strong>Problemas (issue):</strong> Sempre crítico após 24h</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal de histórico */}
            {renderModalHistorico()}
        </div>
    );
}

export default EcomhubStatusPage;