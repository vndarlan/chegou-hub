// frontend/src/features/metricas/EcomhubPedidosPage.js
import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    FileJson,
    Filter,
    Loader2,
    Package,
    RefreshCw,
    Copy,
    Check,
    X,
    Search,
    MoreHorizontal,
    Eye,
    ExternalLink,
    Download,
    ChevronsLeft,
    ChevronLeft,
    ChevronRight,
    ChevronsRight
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';

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
    const [paisSelecionado, setPaisSelecionado] = useState('todos');

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
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // Estados para as novas funcionalidades
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRows, setSelectedRows] = useState([]);

    // ======================== FUNÇÕES AUXILIARES ========================

    // Função auxiliar para formatar arrays de ordersItems
    const formatOrdersItems = (items, field) => {
        if (!items || items.length === 0) return 'N/A';
        return items.map(item => item[field]).filter(Boolean).join(', ') || 'N/A';
    };

    // Função auxiliar para formatar datas com segurança
    const formatSafeDate = (dateString, formatStr = 'dd/MM/yyyy HH:mm') => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return format(date, formatStr, { locale: ptBR });
        } catch {
            return '-';
        }
    };

    // Função auxiliar para validar URLs
    const isValidUrl = (url) => {
        if (!url) return false;
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
            return false;
        }
    };

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
        setSelectedRows([]);
        setSearchTerm('');
        setCurrentPage(1);

        try {
            const payload = {
                data_inicio: dateRange.from.toISOString().split('T')[0],
                data_fim: dateRange.to.toISOString().split('T')[0]
            };

            // Adicionar filtro de país se selecionado
            if (paisSelecionado !== 'todos') {
                payload.country_ids = [parseInt(paisSelecionado)];
            }

            const response = await apiClient.post('/metricas/ecomhub/pedidos/buscar/', payload);

            if (response.data.status === 'success') {
                const pedidosData = response.data.pedidos || [];
                setPedidos(pedidosData);
                setTotalPedidos(response.data.total || pedidosData.length);
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

    const copiarParaAreaTransferencia = async (pedidoId) => {
        try {
            await navigator.clipboard.writeText(pedidoId);
            showNotification('success', 'ID do pedido copiado!');
        } catch (error) {
            showNotification('error', 'Erro ao copiar ID');
        }
    };

    const exportarPedidoIndividual = (pedido) => {
        const dataStr = JSON.stringify(pedido, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pedido-${pedido.shopifyOrderNumber || pedido.id}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('success', 'Pedido exportado com sucesso!');
    };

    const exportarSelecionados = () => {
        const pedidosSelecionados = pedidos.filter(p => selectedRows.includes(p.id));
        const dataStr = JSON.stringify(pedidosSelecionados, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pedidos-selecionados-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('success', `${pedidosSelecionados.length} pedidos exportados!`);
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

                            {/* Filtro de País */}
                            <div className="ml-auto">
                                <Select value={paisSelecionado} onValueChange={setPaisSelecionado} disabled={loadingBuscar}>
                                    <SelectTrigger className="w-48 border-border bg-background text-foreground">
                                        <SelectValue placeholder="Filtrar por país" />
                                    </SelectTrigger>
                                    <SelectContent className="border-border bg-popover">
                                        <SelectItem value="todos" className="text-popover-foreground hover:bg-accent">
                                            Todos os Países
                                        </SelectItem>
                                        <SelectItem value="164" className="text-popover-foreground hover:bg-accent">
                                            🇪🇸 Espanha
                                        </SelectItem>
                                        <SelectItem value="41" className="text-popover-foreground hover:bg-accent">
                                            🇭🇷 Croácia
                                        </SelectItem>
                                        <SelectItem value="66" className="text-popover-foreground hover:bg-accent">
                                            🇬🇷 Grécia
                                        </SelectItem>
                                        <SelectItem value="82" className="text-popover-foreground hover:bg-accent">
                                            🇮🇹 Itália
                                        </SelectItem>
                                        <SelectItem value="142" className="text-popover-foreground hover:bg-accent">
                                            🇷🇴 Romênia
                                        </SelectItem>
                                        <SelectItem value="44" className="text-popover-foreground hover:bg-accent">
                                            🇨🇿 República Tcheca
                                        </SelectItem>
                                        <SelectItem value="139" className="text-popover-foreground hover:bg-accent">
                                            🇵🇱 Polônia
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Mostrar período selecionado */}
                        {dateRange?.from && dateRange?.to && (
                            <p className="text-xs text-muted-foreground">
                                Período selecionado: {format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} até {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                            </p>
                        )}

                        {/* Botão de busca */}
                        <div className="flex justify-end mt-4">
                            <Button
                                onClick={buscarPedidos}
                                disabled={loadingBuscar || !dateRange?.from || !dateRange?.to}
                                className="gap-2"
                            >
                                {loadingBuscar ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Buscando...
                                    </>
                                ) : (
                                    <>
                                        <Search className="h-4 w-4" />
                                        Buscar Pedidos
                                    </>
                                )}
                            </Button>
                        </div>
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
                        Nenhum pedido encontrado. Selecione um período para buscar.
                    </AlertDescription>
                </Alert>
            );
        }

        // Aplicar filtro de busca
        const pedidosFiltrados = pedidos.filter(pedido => {
            if (!searchTerm) return true;
            const search = searchTerm.toLowerCase();
            return (
                pedido.shopifyOrderNumber?.toLowerCase().includes(search) ||
                pedido.customerName?.toLowerCase().includes(search) ||
                pedido.waybill?.toLowerCase().includes(search) ||
                pedido.id?.toLowerCase().includes(search)
            );
        });

        // Paginação
        const totalPaginas = Math.ceil(pedidosFiltrados.length / rowsPerPage);
        const indexInicio = (currentPage - 1) * rowsPerPage;
        const indexFim = indexInicio + rowsPerPage;
        const pedidosPaginados = pedidosFiltrados.slice(indexInicio, indexFim);

        return (
            <Card className="border-border bg-card overflow-x-hidden">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <CardTitle className="text-lg text-card-foreground">Pedidos Encontrados</CardTitle>
                            <CardDescription className="text-muted-foreground">
                                {pedidosFiltrados.length} de {pedidos.length} pedidos | Página {currentPage} de {totalPaginas}
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

                    {/* Campo de Busca Global */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por número, cliente ou rastreio..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1); // Reset para primeira página ao buscar
                                }}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    {/* Contador de Seleção */}
                    {selectedRows.length > 0 && (
                        <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded">
                            <p className="text-sm text-muted-foreground">
                                {selectedRows.length} de {pedidosFiltrados.length} pedido(s) selecionado(s)
                            </p>
                            <Button variant="outline" size="sm" onClick={() => setSelectedRows([])}>
                                Limpar seleção
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => exportarSelecionados()}>
                                <Download className="h-4 w-4 mr-2" />
                                Exportar Selecionados
                            </Button>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="p-0 overflow-x-auto">
                    <div style={{ minWidth: '100%', width: 'max-content', maxWidth: '100%' }}>
                        <Table style={{ minWidth: '3500px', width: '100%' }}>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border">
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={selectedRows.length === pedidosFiltrados.length && pedidosFiltrados.length > 0}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedRows(pedidosFiltrados.map(p => p.id));
                                                } else {
                                                    setSelectedRows([]);
                                                }
                                            }}
                                            aria-label="Selecionar todos"
                                        />
                                    </TableHead>
                                    <TableHead className="min-w-[150px]">countries_name</TableHead>
                                    <TableHead className="min-w-[180px]">revenueReleaseWindow</TableHead>
                                    <TableHead className="min-w-[150px]">shopifyOrderNumber</TableHead>
                                    <TableHead className="min-w-[200px]">customerName</TableHead>
                                    <TableHead className="min-w-[150px]">customerPhone</TableHead>
                                    <TableHead className="min-w-[250px]">billingAddress</TableHead>
                                    <TableHead className="min-w-[300px]">trackingUrl</TableHead>
                                    <TableHead className="min-w-[150px]">waybill</TableHead>
                                    <TableHead className="min-w-[180px]">createdAt</TableHead>
                                    <TableHead className="min-w-[120px]">status</TableHead>
                                    <TableHead className="min-w-[180px]">updatedAt</TableHead>
                                    <TableHead className="min-w-[150px]">revenueReleaseDate</TableHead>
                                    <TableHead className="min-w-[200px]">ordersItems[].sku</TableHead>
                                    <TableHead className="min-w-[250px]">ordersItems[].name</TableHead>
                                    <TableHead className="min-w-[100px]">volume</TableHead>
                                    <TableHead className="min-w-[120px]">priceOriginal</TableHead>
                                    <TableHead className="min-w-[100px]">price</TableHead>
                                    <TableHead className="min-w-[150px]">ordersItems[].cost</TableHead>
                                    <TableHead className="min-w-[120px]">costCourier</TableHead>
                                    <TableHead className="min-w-[130px]">costWarehouse</TableHead>
                                    <TableHead className="min-w-[130px]">costCommission</TableHead>
                                    <TableHead className="min-w-[180px]">costCommissionReturn</TableHead>
                                    <TableHead className="min-w-[180px]">costWarehouseReturn</TableHead>
                                    <TableHead className="min-w-[170px]">costCourierReturn</TableHead>
                                    <TableHead className="min-w-[170px]">costPaymentMethod</TableHead>
                                    <TableHead className="min-w-[200px]">isCostManuallyOverwritten</TableHead>
                                    <TableHead className="min-w-[250px]">note</TableHead>
                                    <TableHead className="text-right min-w-[80px]">Ações</TableHead>
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
                                                    <Checkbox
                                                        checked={selectedRows.includes(pedido.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedRows([...selectedRows, pedido.id]);
                                                            } else {
                                                                setSelectedRows(selectedRows.filter(id => id !== pedido.id));
                                                            }
                                                        }}
                                                        aria-label={`Selecionar pedido ${pedido.shopifyOrderNumber}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.countries?.name || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.revenueReleaseWindow || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.shopifyOrderNumber || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.customerName || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.customerPhone || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[250px] break-words">
                                                    {pedido.billingAddress || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[300px]">
                                                    {pedido.trackingUrl && isValidUrl(pedido.trackingUrl) ? (
                                                        <a
                                                            href={pedido.trackingUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline break-all"
                                                        >
                                                            {pedido.trackingUrl}
                                                        </a>
                                                    ) : (pedido.trackingUrl || '-')}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.waybill || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {formatSafeDate(pedido.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusBadgeColor(pedido.status)}>
                                                        {pedido.status || 'N/A'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {formatSafeDate(pedido.updatedAt)}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {formatSafeDate(pedido.revenueReleaseDate, 'dd/MM/yyyy')}
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[200px] break-words">
                                                    {formatOrdersItems(pedido.ordersItems, 'sku')}
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[300px] break-words">
                                                    {formatOrdersItems(pedido.ordersItems, 'name')}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.volume || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.priceOriginal || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.price || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[200px] break-words">
                                                    {formatOrdersItems(pedido.ordersItems, 'cost')}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.costCourier || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.costWarehouse || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.costCommission || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.costCommissionReturn || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.costWarehouseReturn || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.costCourierReturn || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.costPaymentMethod || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {pedido.isCostManuallyOverwritten !== undefined ? (pedido.isCostManuallyOverwritten ? 'Sim' : 'Não') : '-'}
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[200px] break-words">
                                                    {pedido.note || '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Abrir menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => toggleExpandRow(pedido.id)}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                Ver JSON Completo
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => copiarParaAreaTransferencia(pedido.id)}>
                                                                <Copy className="mr-2 h-4 w-4" />
                                                                Copiar ID do Pedido
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            {pedido.trackingUrl && isValidUrl(pedido.trackingUrl) && (
                                                                <DropdownMenuItem onClick={() => window.open(pedido.trackingUrl, '_blank')}>
                                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                                    Abrir Tracking
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem onClick={() => exportarPedidoIndividual(pedido)}>
                                                                <Download className="mr-2 h-4 w-4" />
                                                                Exportar Pedido
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>

                                            {/* Linha expandida (JSON completo) */}
                                            {isExpanded && (
                                                <TableRow className="bg-muted/10 border-border">
                                                    <TableCell colSpan={28} className="p-4">
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

                    {/* Paginação Avançada */}
                    {totalPaginas > 0 && (
                        <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground">Linhas por página</p>
                                <Select
                                    value={rowsPerPage.toString()}
                                    onValueChange={(value) => {
                                        setRowsPerPage(Number(value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[70px] border-border bg-background text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-border bg-popover">
                                        <SelectItem value="10" className="text-popover-foreground hover:bg-accent">10</SelectItem>
                                        <SelectItem value="25" className="text-popover-foreground hover:bg-accent">25</SelectItem>
                                        <SelectItem value="50" className="text-popover-foreground hover:bg-accent">50</SelectItem>
                                        <SelectItem value="100" className="text-popover-foreground hover:bg-accent">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-4">
                                <p className="text-sm text-muted-foreground">
                                    Página {currentPage} de {totalPaginas}
                                </p>
                                <div className="flex gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="h-8 w-8 p-0 border-border bg-background text-foreground hover:bg-accent"
                                    >
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 w-8 p-0 border-border bg-background text-foreground hover:bg-accent"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(totalPaginas, prev + 1))}
                                        disabled={currentPage === totalPaginas}
                                        className="h-8 w-8 p-0 border-border bg-background text-foreground hover:bg-accent"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(totalPaginas)}
                                        disabled={currentPage === totalPaginas}
                                        className="h-8 w-8 p-0 border-border bg-background text-foreground hover:bg-accent"
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
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
        <div className="flex-1 space-y-4 p-6 min-h-screen bg-background overflow-x-hidden">
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
