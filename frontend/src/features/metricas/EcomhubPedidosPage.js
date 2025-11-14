// frontend/src/features/metricas/EcomhubPedidosPage.js
import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon, ChevronDown, ChevronRight, FileJson,
    Filter, Loader2, Package, RefreshCw, Copy, Check, X,
    AlertTriangle, Search, Database
} from 'lucide-react';
import apiClient from '../../utils/axios';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Separator } from '../../components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';

function EcomhubPedidosPage() {
    // Estados principais
    const [pedidos, setPedidos] = useState([]);
    const [totalPedidos, setTotalPedidos] = useState(0);

    // Estados do formulário
    const [periodoPreset, setPeriodoPreset] = useState(null);
    const [dateRange, setDateRange] = useState({
        from: undefined,
        to: undefined
    });

    // Estados de expansão
    const [expandedRows, setExpandedRows] = useState({});
    const [copiedRow, setCopiedRow] = useState(null);

    // Estados de loading
    const [loadingBuscar, setLoadingBuscar] = useState(false);

    // Estados de notificação
    const [notification, setNotification] = useState(null);

    // Estado para controlar Popover do Calendar
    const [openPopover, setOpenPopover] = useState(false);

    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // ======================== FUNÇÕES DE API ========================

    const buscarPedidos = async () => {
        if (!dateRange?.from || !dateRange?.to) {
            showNotification('error', 'Selecione o período completo');
            return;
        }

        if (dateRange.from > dateRange.to) {
            showNotification('error', 'Data de início deve ser anterior à data fim');
            return;
        }

        setLoadingBuscar(true);
        setPedidos([]);
        setExpandedRows({});

        try {
            const payload = {
                data_inicio: dateRange.from.toISOString().split('T')[0],
                data_fim: dateRange.to.toISOString().split('T')[0]
            };

            const response = await apiClient.post('/metricas/ecomhub/pedidos/buscar/', payload);

            if (response.data.status === 'success') {
                const pedidosData = response.data.pedidos || [];
                setPedidos(pedidosData);
                setTotalPedidos(response.data.total || pedidosData.length);
                setCurrentPage(1);
                showNotification('success', response.data.message || `${pedidosData.length} pedidos encontrados!`);
            } else {
                showNotification('error', response.data.message || 'Erro ao buscar pedidos');
            }
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
            showNotification('error', `Erro: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingBuscar(false);
        }
    };

    const aplicarPreset = async (preset) => {
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

        // Buscar automaticamente após selecionar preset
        setTimeout(() => {
            buscarPedidos();
        }, 100);
    };

    // ======================== FUNÇÕES AUXILIARES ========================

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const toggleExpandRow = (pedidoId) => {
        setExpandedRows(prev => ({
            ...prev,
            [pedidoId]: !prev[pedidoId]
        }));
    };

    const copyToClipboard = async (pedido) => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(pedido, null, 2));
            setCopiedRow(pedido.id);
            setTimeout(() => setCopiedRow(null), 2000);
            showNotification('success', 'JSON copiado para área de transferência!');
        } catch (error) {
            showNotification('error', 'Erro ao copiar JSON');
        }
    };

    const getStatusBadgeVariant = (status) => {
        const statusLower = status?.toLowerCase() || '';

        // Verde - Entregues
        if (statusLower === 'delivered') return 'success';

        // Azul - Em trânsito
        if (['shipped', 'with_courier', 'out_for_delivery'].includes(statusLower)) return 'info';

        // Amarelo - Preparando
        if (['processing', 'preparing_for_shipping', 'ready_to_ship'].includes(statusLower)) return 'warning';

        // Vermelho - Problemas
        if (['issue', 'returning'].includes(statusLower)) return 'destructive';

        // Cinza - Finalizados com problema
        if (['returned', 'cancelled'].includes(statusLower)) return 'secondary';

        return 'default';
    };

    const getStatusBadgeColor = (status) => {
        const statusLower = status?.toLowerCase() || '';

        if (statusLower === 'delivered') return 'bg-green-600 text-white hover:bg-green-700';
        if (['shipped', 'with_courier', 'out_for_delivery'].includes(statusLower)) return 'bg-blue-600 text-white hover:bg-blue-700';
        if (['processing', 'preparing_for_shipping', 'ready_to_ship'].includes(statusLower)) return 'bg-yellow-600 text-white hover:bg-yellow-700';
        if (['issue', 'returning'].includes(statusLower)) return 'bg-red-600 text-white hover:bg-red-700';
        if (['returned', 'cancelled'].includes(statusLower)) return 'bg-gray-500 text-white hover:bg-gray-600';

        return 'bg-gray-400 text-white';
    };

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Pedidos - API Tempo Real</h1>
                    <p className="text-sm text-muted-foreground">Consulta de pedidos da API ECOMHUB via Selenium</p>
                </div>
            </div>
        </div>
    );

    const renderFormulario = () => (
        <Card className="mb-6 border-border bg-card">
            <CardHeader>
                <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Períodos Rápidos */}
                    <div className="space-y-3">
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                onClick={() => aplicarPreset('semana')}
                                variant={periodoPreset === 'semana' ? 'default' : 'outline'}
                                size="sm"
                                disabled={loadingBuscar}
                            >
                                Última Semana
                            </Button>
                            <Button
                                onClick={() => aplicarPreset('mes')}
                                variant={periodoPreset === 'mes' ? 'default' : 'outline'}
                                size="sm"
                                disabled={loadingBuscar}
                            >
                                Último Mês
                            </Button>
                            <Button
                                onClick={() => aplicarPreset('3meses')}
                                variant={periodoPreset === '3meses' ? 'default' : 'outline'}
                                size="sm"
                                disabled={loadingBuscar}
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
                                        disabled={loadingBuscar}
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
                                                onClick={() => {
                                                    if (dateRange?.from && dateRange?.to) {
                                                        setOpenPopover(false);
                                                        setPeriodoPreset(null);
                                                        buscarPedidos();
                                                    }
                                                }}
                                                disabled={!dateRange?.from || !dateRange?.to}
                                            >
                                                Aplicar
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Button
                                onClick={buscarPedidos}
                                variant="default"
                                size="sm"
                                disabled={loadingBuscar || !dateRange?.from || !dateRange?.to}
                                className="ml-auto"
                            >
                                {loadingBuscar ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Buscando...
                                    </>
                                ) : (
                                    <>
                                        <Search className="h-4 w-4 mr-2" />
                                        Buscar Pedidos
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Mostrar período selecionado */}
                        {dateRange?.from && dateRange?.to && (
                            <p className="text-xs text-muted-foreground">
                                Período selecionado: {format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} até {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    const renderTabela = () => {
        if (pedidos.length === 0 && !loadingBuscar) {
            return (
                <Alert className="border-border bg-background">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <AlertDescription className="text-muted-foreground">
                        Nenhum pedido encontrado. Selecione um período e clique em "Buscar Pedidos".
                    </AlertDescription>
                </Alert>
            );
        }

        // Paginação
        const indexInicio = (currentPage - 1) * itemsPerPage;
        const indexFim = indexInicio + itemsPerPage;
        const pedidosPaginados = pedidos.slice(indexInicio, indexFim);
        const totalPaginas = Math.ceil(pedidos.length / itemsPerPage);

        return (
            <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg text-card-foreground">Pedidos Encontrados</CardTitle>
                            <CardDescription className="text-muted-foreground">
                                {pedidos.length} pedidos | Página {currentPage} de {totalPaginas}
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={buscarPedidos}
                            disabled={loadingBuscar}
                            className="border-border bg-background text-foreground hover:bg-accent"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Atualizar
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border">
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead className="min-w-[200px]">ID Pedido</TableHead>
                                    <TableHead className="min-w-[150px]">Data de Criação</TableHead>
                                    <TableHead className="min-w-[120px]">Status</TableHead>
                                    <TableHead className="min-w-[100px]">País</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pedidosPaginados.map((pedido) => {
                                    const isExpanded = expandedRows[pedido.id];
                                    return (
                                        <React.Fragment key={pedido.id}>
                                            {/* Linha principal */}
                                            <TableRow className="border-border hover:bg-muted/20">
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleExpandRow(pedido.id)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    <div className="truncate max-w-[200px]" title={pedido.id}>
                                                        {pedido.id}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.createdAt ? format(new Date(pedido.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusBadgeColor(pedido.status)}>
                                                        {pedido.status || 'N/A'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.countries?.name || 'N/A'}
                                                </TableCell>
                                            </TableRow>

                                            {/* Linha expandida (JSON completo) */}
                                            {isExpanded && (
                                                <TableRow className="bg-muted/10 border-border">
                                                    <TableCell colSpan={5} className="p-4">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <FileJson className="h-4 w-4 text-blue-500" />
                                                                    <span className="text-sm font-medium text-foreground">Dados Completos (JSON)</span>
                                                                </div>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => copyToClipboard(pedido)}
                                                                    className="border-border bg-background text-foreground hover:bg-accent"
                                                                >
                                                                    {copiedRow === pedido.id ? (
                                                                        <>
                                                                            <Check className="h-3 w-3 mr-2 text-green-600" />
                                                                            Copiado!
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Copy className="h-3 w-3 mr-2" />
                                                                            Copiar JSON
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                            <Separator className="bg-border" />
                                                            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-96 overflow-y-auto">
                                                                {JSON.stringify(pedido, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Paginação */}
                    {totalPaginas > 1 && (
                        <div className="flex items-center justify-center gap-2 py-4 border-t border-border">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="border-border bg-background text-foreground hover:bg-accent"
                            >
                                Anterior
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Página {currentPage} de {totalPaginas}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPaginas, prev + 1))}
                                disabled={currentPage === totalPaginas}
                                className="border-border bg-background text-foreground hover:bg-accent"
                            >
                                Próxima
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    // ======================== EFEITOS ========================

    useEffect(() => {
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

            {/* Formulário de Filtros */}
            {renderFormulario()}

            {/* Loading Overlay */}
            {loadingBuscar && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="font-medium text-foreground">Buscando pedidos...</p>
                    </div>
                </div>
            )}

            {/* Tabela de Resultados */}
            {!loadingBuscar && renderTabela()}
        </div>
    );
}

export default EcomhubPedidosPage;
