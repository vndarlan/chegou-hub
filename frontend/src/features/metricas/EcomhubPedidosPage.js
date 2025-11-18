// frontend/src/features/metricas/EcomhubPedidosPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    ChevronsRight,
    Settings2,
    Columns,
    FileSpreadsheet,
    Info
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet';

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
    const [statusSelecionado, setStatusSelecionado] = useState('todos');

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

    // Estado para controlar se o usuário já interagiu (para evitar auto-busca no load)
    const [hasUserInteracted, setHasUserInteracted] = useState(false);

    // Estado para colunas visíveis
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const saved = localStorage.getItem('ecomhub-visible-columns');
        return saved ? JSON.parse(saved) : [
            'countries_name',
            'shopifyOrderNumber',
            'revenueReleaseWindow',
            'createdAt',
            'status',
            'updatedAt',
            'revenueReleaseDate',
            'ordersItems_name',
            'volume',
            'priceOriginal',
            'price',
            'ordersItems_cost',
            'costCourier',
            'costWarehouse',
            'costCommission',
            'costCommissionReturn',
            'costWarehouseReturn',
            'costCourierReturn',
            'costPaymentMethod',
            'isCostManuallyOverwritten',
            'note'
        ];
    });

    // Estado para controlar o Sheet de Referência de Colunas
    const [openReferenceSheet, setOpenReferenceSheet] = useState(false);

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

    const buscarPedidos = useCallback(async () => {
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
        setStatusSelecionado('todos');
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
    }, [dateRange, paisSelecionado]);

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
        setHasUserInteracted(true); // Marcar que o usuário interagiu
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

    // ======================== FUNÇÕES DE EXPORTAÇÃO CSV ========================

    const escapeCsvValue = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Se contém vírgula, aspas ou quebra de linha, envolver em aspas e duplicar aspas existentes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    const pedidoToCsvRow = (pedido) => {
        const row = [];

        if (isColumnVisible('countries_name')) row.push(escapeCsvValue(pedido.countries?.name || ''));
        if (isColumnVisible('revenueReleaseWindow')) row.push(escapeCsvValue(pedido.revenueReleaseWindow || ''));
        if (isColumnVisible('shopifyOrderNumber')) row.push(escapeCsvValue(pedido.shopifyOrderNumber || ''));
        if (isColumnVisible('customerName')) row.push(escapeCsvValue(pedido.customerName || ''));
        if (isColumnVisible('customerPhone')) row.push(escapeCsvValue(pedido.customerPhone || ''));
        if (isColumnVisible('billingAddress')) row.push(escapeCsvValue(pedido.billingAddress || ''));
        if (isColumnVisible('trackingUrl')) row.push(escapeCsvValue(pedido.trackingUrl || ''));
        if (isColumnVisible('waybill')) row.push(escapeCsvValue(pedido.waybill || ''));
        if (isColumnVisible('createdAt')) row.push(escapeCsvValue(formatSafeDate(pedido.createdAt)));
        if (isColumnVisible('status')) row.push(escapeCsvValue(pedido.status || ''));
        if (isColumnVisible('updatedAt')) row.push(escapeCsvValue(formatSafeDate(pedido.updatedAt)));
        if (isColumnVisible('revenueReleaseDate')) row.push(escapeCsvValue(formatSafeDate(pedido.revenueReleaseDate, 'dd/MM/yyyy')));
        if (isColumnVisible('ordersItems_sku')) row.push(escapeCsvValue(formatOrdersItems(pedido.ordersItems, 'sku')));
        if (isColumnVisible('ordersItems_name')) row.push(escapeCsvValue(formatOrdersItems(pedido.ordersItems, 'name')));
        if (isColumnVisible('volume')) row.push(escapeCsvValue(pedido.volume || ''));
        if (isColumnVisible('priceOriginal')) row.push(escapeCsvValue(pedido.priceOriginal || ''));
        if (isColumnVisible('price')) row.push(escapeCsvValue(pedido.price || ''));
        if (isColumnVisible('ordersItems_cost')) row.push(escapeCsvValue(formatOrdersItems(pedido.ordersItems, 'cost')));
        if (isColumnVisible('costCourier')) row.push(escapeCsvValue(pedido.costCourier || ''));
        if (isColumnVisible('costWarehouse')) row.push(escapeCsvValue(pedido.costWarehouse || ''));
        if (isColumnVisible('costCommission')) row.push(escapeCsvValue(pedido.costCommission || ''));
        if (isColumnVisible('costCommissionReturn')) row.push(escapeCsvValue(pedido.costCommissionReturn || ''));
        if (isColumnVisible('costWarehouseReturn')) row.push(escapeCsvValue(pedido.costWarehouseReturn || ''));
        if (isColumnVisible('costCourierReturn')) row.push(escapeCsvValue(pedido.costCourierReturn || ''));
        if (isColumnVisible('costPaymentMethod')) row.push(escapeCsvValue(pedido.costPaymentMethod || ''));
        if (isColumnVisible('isCostManuallyOverwritten')) row.push(escapeCsvValue(pedido.isCostManuallyOverwritten !== undefined ? (pedido.isCostManuallyOverwritten ? 'Sim' : 'Não') : ''));
        if (isColumnVisible('note')) row.push(escapeCsvValue(pedido.note || ''));

        return row.join(',');
    };

    const getCsvHeaders = () => {
        const headers = [];
        availableColumns.forEach(column => {
            if (isColumnVisible(column.id)) {
                headers.push(escapeCsvValue(column.label));
            }
        });
        return headers.join(',');
    };

    const exportarPedidoIndividualCsv = (pedido) => {
        const csvContent = '\uFEFF' + getCsvHeaders() + '\n' + pedidoToCsvRow(pedido);
        const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pedido-${pedido.shopifyOrderNumber || pedido.id}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('success', 'Pedido exportado em CSV com sucesso!');
    };

    const exportarSelecionadosCsv = () => {
        const pedidosSelecionados = pedidos.filter(p => selectedRows.includes(p.id));
        const csvRows = [getCsvHeaders()];
        pedidosSelecionados.forEach(pedido => {
            csvRows.push(pedidoToCsvRow(pedido));
        });
        const csvContent = '\uFEFF' + csvRows.join('\n');
        const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pedidos-selecionados-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('success', `${pedidosSelecionados.length} pedidos exportados em CSV!`);
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

    // Gerenciamento de colunas visíveis
    const availableColumns = [
        { id: 'countries_name', label: 'País', apiPath: 'countries.name' },
        { id: 'revenueReleaseWindow', label: 'Janela de Liberação', apiPath: 'revenueReleaseWindow' },
        { id: 'shopifyOrderNumber', label: 'Nº Pedido Shopify', apiPath: 'shopifyOrderNumber' },
        { id: 'customerName', label: 'Nome Cliente', apiPath: 'customerName' },
        { id: 'customerPhone', label: 'Telefone Cliente', apiPath: 'customerPhone' },
        { id: 'billingAddress', label: 'Endereço', apiPath: 'billingAddress' },
        { id: 'trackingUrl', label: 'URL Rastreio', apiPath: 'trackingUrl' },
        { id: 'waybill', label: 'Código Rastreio', apiPath: 'waybill' },
        { id: 'createdAt', label: 'Data Criação', apiPath: 'createdAt' },
        { id: 'status', label: 'Status', apiPath: 'status' },
        { id: 'updatedAt', label: 'Última Atualização', apiPath: 'updatedAt' },
        { id: 'revenueReleaseDate', label: 'Data Liberação', apiPath: 'revenueReleaseDate' },
        { id: 'ordersItems_sku', label: 'SKU(s)', apiPath: 'ordersItems[].sku' },
        { id: 'ordersItems_name', label: 'Produto(s)', apiPath: 'ordersItems[].name' },
        { id: 'volume', label: 'Volume', apiPath: 'volume' },
        { id: 'priceOriginal', label: 'Preço Original', apiPath: 'priceOriginal' },
        { id: 'price', label: 'Preço Convertido', apiPath: 'price' },
        { id: 'ordersItems_cost', label: 'Custo(s)', apiPath: 'ordersItems[].cost' },
        { id: 'costCourier', label: 'Custo Courier', apiPath: 'costCourier' },
        { id: 'costWarehouse', label: 'Custo Armazém', apiPath: 'costWarehouse' },
        { id: 'costCommission', label: 'Custo Comissão', apiPath: 'costCommission' },
        { id: 'costCommissionReturn', label: 'Custo Comissão Devolução', apiPath: 'costCommissionReturn' },
        { id: 'costWarehouseReturn', label: 'Custo Armazém Devolução', apiPath: 'costWarehouseReturn' },
        { id: 'costCourierReturn', label: 'Custo Courier Devolução', apiPath: 'costCourierReturn' },
        { id: 'costPaymentMethod', label: 'Custo Método Pagamento', apiPath: 'costPaymentMethod' },
        { id: 'isCostManuallyOverwritten', label: 'Custo Manual?', apiPath: 'isCostManuallyOverwritten' },
        { id: 'note', label: 'Nota', apiPath: 'note' }
    ];

    const toggleColumn = (columnId) => {
        setVisibleColumns(prev => {
            if (prev.includes(columnId)) {
                // Manter pelo menos uma coluna visível
                if (prev.length === 1) return prev;
                return prev.filter(id => id !== columnId);
            } else {
                return [...prev, columnId];
            }
        });
    };

    const isColumnVisible = (columnId) => visibleColumns.includes(columnId);

    // ======================== FILTRO DE PEDIDOS (MEMOIZADO) ========================

    // Aplicar filtros de busca e status com useMemo para otimizar performance
    const pedidosFiltrados = useMemo(() => {
        return pedidos.filter(pedido => {
            // Filtro de busca por texto
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                const matchSearch = (
                    pedido.shopifyOrderNumber?.toLowerCase().includes(search) ||
                    pedido.customerName?.toLowerCase().includes(search) ||
                    pedido.waybill?.toLowerCase().includes(search) ||
                    pedido.id?.toLowerCase().includes(search)
                );
                if (!matchSearch) return false;
            }

            // Filtro de status
            // Nota: Os valores 'em_transito', 'preparando', etc são categorias do frontend
            // que agrupam múltiplos status reais da API ECOMHUB
            if (statusSelecionado !== 'todos') {
                const statusLower = pedido.status?.toLowerCase() || '';

                switch (statusSelecionado) {
                    case 'delivered':
                        return statusLower === 'delivered';
                    case 'em_transito':
                        // Agrupa: shipped, with_courier, out_for_delivery
                        return ['shipped', 'with_courier', 'out_for_delivery'].includes(statusLower);
                    case 'preparando':
                        // Agrupa: processing, preparing_for_shipping, ready_to_ship
                        return ['processing', 'preparing_for_shipping', 'ready_to_ship'].includes(statusLower);
                    case 'problemas':
                        // Agrupa: issue, returning
                        return ['issue', 'returning'].includes(statusLower);
                    case 'cancelado':
                        // Agrupa: returned, cancelled
                        return ['returned', 'cancelled'].includes(statusLower);
                    default:
                        return true;
                }
            }

            return true;
        });
    }, [pedidos, searchTerm, statusSelecionado]);

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Lista de Pedidos</h1>
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenReferenceSheet(true)}
                className="gap-2"
            >
                <Info className="h-4 w-4" />
                Referência de Colunas
            </Button>
        </div>
    );

    const renderFiltrosLaterais = () => (
        <div className="space-y-4 w-80">
            {/* Períodos Rápidos */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground mb-3">Período</h3>
                <div className="flex flex-col gap-2">
                    <Button
                        onClick={() => aplicarPreset('semana')}
                        variant={periodoPreset === 'semana' ? 'default' : 'outline'}
                        size="sm"
                        disabled={loadingBuscar}
                        className="w-full justify-start"
                    >
                        Última Semana
                    </Button>
                    <Button
                        onClick={() => aplicarPreset('mes')}
                        variant={periodoPreset === 'mes' ? 'default' : 'outline'}
                        size="sm"
                        disabled={loadingBuscar}
                        className="w-full justify-start"
                    >
                        Último Mês
                    </Button>
                    <Button
                        onClick={() => aplicarPreset('3meses')}
                        variant={periodoPreset === '3meses' ? 'default' : 'outline'}
                        size="sm"
                        disabled={loadingBuscar}
                        className="w-full justify-start"
                    >
                        Últimos 3 Meses
                    </Button>

                    {/* Popover com ReactDatePicker */}
                    <Popover open={openPopover} onOpenChange={setOpenPopover}>
                        <PopoverTrigger asChild>
                            <Button
                                variant={periodoPreset === null && dateRange?.from ? 'default' : 'outline'}
                                size="sm"
                                className="gap-2 w-full justify-start"
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
                                        if (start && end) {
                                            setHasUserInteracted(true);
                                        }
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
                </div>

                {/* Mostrar período selecionado */}
                {dateRange?.from && dateRange?.to && (
                    <div className="mt-2">
                        <p className="text-xs text-muted-foreground">
                            {format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} até {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                    </div>
                )}
            </div>

            <Separator />

            {/* Filtro de País */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground mb-2">País</h3>
                <Select value={paisSelecionado} onValueChange={setPaisSelecionado} disabled={loadingBuscar}>
                    <SelectTrigger className="w-full border-border bg-background text-foreground">
                        <SelectValue placeholder="Todos os países" />
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

            {loadingBuscar && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Buscando pedidos...</span>
                </div>
            )}
        </div>
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

        // Paginação (usa pedidosFiltrados do useMemo)
        const totalPaginas = Math.ceil(pedidosFiltrados.length / rowsPerPage);
        const indexInicio = (currentPage - 1) * rowsPerPage;
        const indexFim = indexInicio + rowsPerPage;
        const pedidosPaginados = pedidosFiltrados.slice(indexInicio, indexFim);

        return (
            <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <CardTitle className="text-lg text-card-foreground">Pedidos Encontrados</CardTitle>
                            <CardDescription className="text-muted-foreground">
                                {pedidosFiltrados.length} de {pedidos.length} pedidos | Página {currentPage} de {totalPaginas} | {visibleColumns.length} colunas visíveis
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-border bg-background text-foreground hover:bg-accent"
                                    >
                                        <Columns className="h-4 w-4 mr-2" />
                                        Colunas
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto z-[100]">
                                    <DropdownMenuLabel>Selecionar Colunas</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {availableColumns.map(column => (
                                        <DropdownMenuItem
                                            key={column.id}
                                            className="flex items-center gap-2 cursor-pointer"
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                toggleColumn(column.id);
                                            }}
                                        >
                                            <Checkbox
                                                checked={isColumnVisible(column.id)}
                                                onCheckedChange={() => toggleColumn(column.id)}
                                            />
                                            <span className="text-sm">{column.label}</span>
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm font-medium transition-colors"
                                        onClick={() => {
                                            setVisibleColumns(availableColumns.map(col => col.id));
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setVisibleColumns(availableColumns.map(col => col.id));
                                            }
                                        }}
                                    >
                                        <Check className="h-4 w-4 mr-2" />
                                        Selecionar Todas
                                    </div>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm font-medium transition-colors"
                                        onClick={() => {
                                            setVisibleColumns([
                                                'countries_name',
                                                'shopifyOrderNumber',
                                                'revenueReleaseWindow',
                                                'createdAt',
                                                'status',
                                                'updatedAt',
                                                'revenueReleaseDate',
                                                'ordersItems_name',
                                                'volume',
                                                'priceOriginal',
                                                'price',
                                                'ordersItems_cost',
                                                'costCourier',
                                                'costWarehouse',
                                                'costCommission',
                                                'costCommissionReturn',
                                                'costWarehouseReturn',
                                                'costCourierReturn',
                                                'costPaymentMethod',
                                                'isCostManuallyOverwritten',
                                                'note'
                                            ]);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setVisibleColumns([
                                                    'countries_name',
                                                    'shopifyOrderNumber',
                                                    'revenueReleaseWindow',
                                                    'createdAt',
                                                    'status',
                                                    'updatedAt',
                                                    'revenueReleaseDate',
                                                    'ordersItems_name',
                                                    'volume',
                                                    'priceOriginal',
                                                    'price',
                                                    'ordersItems_cost',
                                                    'costCourier',
                                                    'costWarehouse',
                                                    'costCommission',
                                                    'costCommissionReturn',
                                                    'costWarehouseReturn',
                                                    'costCourierReturn',
                                                    'costPaymentMethod',
                                                    'isCostManuallyOverwritten',
                                                    'note'
                                                ]);
                                            }
                                        }}
                                    >
                                        <Settings2 className="h-4 w-4 mr-2" />
                                        Restaurar Padrão
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
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
                    </div>

                    {/* Campo de Busca Global e Filtro de Status */}
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

                        {/* Filtro de Status */}
                        <Select value={statusSelecionado} onValueChange={setStatusSelecionado}>
                            <SelectTrigger className="w-[200px] border-border bg-background text-foreground">
                                <SelectValue placeholder="Filtrar por status" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-popover">
                                <SelectItem value="todos" className="text-popover-foreground hover:bg-accent">
                                    Todos os Status
                                </SelectItem>
                                <SelectItem value="delivered" className="text-popover-foreground hover:bg-accent">
                                    ✅ Entregue
                                </SelectItem>
                                <SelectItem value="em_transito" className="text-popover-foreground hover:bg-accent">
                                    🚚 Em Trânsito
                                </SelectItem>
                                <SelectItem value="preparando" className="text-popover-foreground hover:bg-accent">
                                    📦 Preparando
                                </SelectItem>
                                <SelectItem value="problemas" className="text-popover-foreground hover:bg-accent">
                                    ⚠️ Problemas
                                </SelectItem>
                                <SelectItem value="cancelado" className="text-popover-foreground hover:bg-accent">
                                    ❌ Cancelado/Devolvido
                                </SelectItem>
                            </SelectContent>
                        </Select>
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
                                <FileJson className="h-4 w-4 mr-2" />
                                Exportar JSON
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => exportarSelecionadosCsv()}>
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Exportar CSV
                            </Button>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="p-0">
                    <div className="w-full overflow-x-auto">
                        <Table className="w-full" style={{ minWidth: 'max-content' }}>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border">
                                    <TableHead className="w-12 sticky left-0 z-20 bg-muted/50">
                                        <Checkbox
                                            checked={selectedRows.length === pedidosFiltrados.length && pedidosFiltrados.length > 0}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedRows(pedidosFiltrados.map(p => p.id));
                                                } else {
                                                    setSelectedRows([]);
                                                }
                                            }}
                                            aria-label="Selecionar todos os pedidos da página atual"
                                        />
                                    </TableHead>
                                    {isColumnVisible('countries_name') && <TableHead className="min-w-[150px]">País</TableHead>}
                                    {isColumnVisible('revenueReleaseWindow') && <TableHead className="min-w-[180px]">Janela Liberação</TableHead>}
                                    {isColumnVisible('shopifyOrderNumber') && <TableHead className="min-w-[150px]">Nº Pedido</TableHead>}
                                    {isColumnVisible('customerName') && <TableHead className="min-w-[200px]">Cliente</TableHead>}
                                    {isColumnVisible('customerPhone') && <TableHead className="min-w-[150px]">Telefone</TableHead>}
                                    {isColumnVisible('billingAddress') && <TableHead className="min-w-[250px]">Endereço</TableHead>}
                                    {isColumnVisible('trackingUrl') && <TableHead className="min-w-[300px]">URL Rastreio</TableHead>}
                                    {isColumnVisible('waybill') && <TableHead className="min-w-[150px]">Código Rastreio</TableHead>}
                                    {isColumnVisible('createdAt') && <TableHead className="min-w-[180px]">Data Criação</TableHead>}
                                    {isColumnVisible('status') && <TableHead className="min-w-[120px]">Status</TableHead>}
                                    {isColumnVisible('updatedAt') && <TableHead className="min-w-[180px]">Última Atualização</TableHead>}
                                    {isColumnVisible('revenueReleaseDate') && <TableHead className="min-w-[150px]">Data Liberação</TableHead>}
                                    {isColumnVisible('ordersItems_sku') && <TableHead className="min-w-[200px]">SKU(s)</TableHead>}
                                    {isColumnVisible('ordersItems_name') && <TableHead className="min-w-[250px]">Produto(s)</TableHead>}
                                    {isColumnVisible('volume') && <TableHead className="min-w-[100px]">Volume</TableHead>}
                                    {isColumnVisible('priceOriginal') && <TableHead className="min-w-[120px]">Preço Original</TableHead>}
                                    {isColumnVisible('price') && <TableHead className="min-w-[100px]">Preço</TableHead>}
                                    {isColumnVisible('ordersItems_cost') && <TableHead className="min-w-[150px]">Custo(s)</TableHead>}
                                    {isColumnVisible('costCourier') && <TableHead className="min-w-[120px]">Custo Courier</TableHead>}
                                    {isColumnVisible('costWarehouse') && <TableHead className="min-w-[130px]">Custo Armazém</TableHead>}
                                    {isColumnVisible('costCommission') && <TableHead className="min-w-[130px]">Custo Comissão</TableHead>}
                                    {isColumnVisible('costCommissionReturn') && <TableHead className="min-w-[180px]">Custo Com. Devolução</TableHead>}
                                    {isColumnVisible('costWarehouseReturn') && <TableHead className="min-w-[180px]">Custo Arm. Devolução</TableHead>}
                                    {isColumnVisible('costCourierReturn') && <TableHead className="min-w-[170px]">Custo Cour. Devolução</TableHead>}
                                    {isColumnVisible('costPaymentMethod') && <TableHead className="min-w-[170px]">Custo Método Pag.</TableHead>}
                                    {isColumnVisible('isCostManuallyOverwritten') && <TableHead className="min-w-[150px]">Custo Manual?</TableHead>}
                                    {isColumnVisible('note') && <TableHead className="min-w-[250px]">Nota</TableHead>}
                                    <TableHead className="text-right min-w-[80px] sticky right-0 z-50 bg-muted/50">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pedidosPaginados.map((pedido) => {
                                    const isExpanded = expandedRows[pedido.id];
                                    return (
                                        <React.Fragment key={pedido.id}>
                                            {/* Linha principal */}
                                            <TableRow className="border-border hover:bg-muted/20">
                                                <TableCell className="sticky left-0 z-20 bg-background">
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
                                                {isColumnVisible('countries_name') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.countries?.name || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('revenueReleaseWindow') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.revenueReleaseWindow || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('shopifyOrderNumber') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.shopifyOrderNumber || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('customerName') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.customerName || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('customerPhone') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.customerPhone || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('billingAddress') && (
                                                    <TableCell className="text-xs max-w-[250px] break-words">
                                                        {pedido.billingAddress || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('trackingUrl') && (
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
                                                )}
                                                {isColumnVisible('waybill') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.waybill || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('createdAt') && (
                                                    <TableCell className="text-xs">
                                                        {formatSafeDate(pedido.createdAt)}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('status') && (
                                                    <TableCell>
                                                        <Badge className={getStatusBadgeColor(pedido.status)}>
                                                            {pedido.status || 'N/A'}
                                                        </Badge>
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('updatedAt') && (
                                                    <TableCell className="text-xs">
                                                        {formatSafeDate(pedido.updatedAt)}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('revenueReleaseDate') && (
                                                    <TableCell className="text-xs">
                                                        {formatSafeDate(pedido.revenueReleaseDate, 'dd/MM/yyyy')}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('ordersItems_sku') && (
                                                    <TableCell className="text-xs max-w-[200px] break-words">
                                                        {formatOrdersItems(pedido.ordersItems, 'sku')}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('ordersItems_name') && (
                                                    <TableCell className="text-xs max-w-[300px] break-words">
                                                        {formatOrdersItems(pedido.ordersItems, 'name')}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('volume') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.volume || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('priceOriginal') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.priceOriginal || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('price') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.price || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('ordersItems_cost') && (
                                                    <TableCell className="text-xs max-w-[200px] break-words">
                                                        {formatOrdersItems(pedido.ordersItems, 'cost')}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('costCourier') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.costCourier || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('costWarehouse') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.costWarehouse || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('costCommission') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.costCommission || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('costCommissionReturn') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.costCommissionReturn || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('costWarehouseReturn') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.costWarehouseReturn || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('costCourierReturn') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.costCourierReturn || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('costPaymentMethod') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.costPaymentMethod || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('isCostManuallyOverwritten') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.isCostManuallyOverwritten !== undefined ? (pedido.isCostManuallyOverwritten ? 'Sim' : 'Não') : '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('note') && (
                                                    <TableCell className="text-xs max-w-[200px] break-words">
                                                        {pedido.note || '-'}
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-right sticky right-0 z-50 bg-background">
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
                                                                <FileJson className="mr-2 h-4 w-4" />
                                                                Exportar JSON
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => exportarPedidoIndividualCsv(pedido)}>
                                                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                                                Exportar CSV
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>

                                            {/* Linha expandida (JSON completo) */}
                                            {isExpanded && (
                                                <TableRow className="bg-muted/10 border-border">
                                                    <TableCell colSpan={visibleColumns.length + 2} className="p-4">
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

    // Busca automática quando filtros mudarem (somente após interação do usuário)
    useEffect(() => {
        // Não executar se o usuário ainda não interagiu (evita busca automática no load)
        if (!hasUserInteracted) return;

        // Debounce para evitar múltiplas chamadas
        const timer = setTimeout(() => {
            if (dateRange?.from && dateRange?.to) {
                buscarPedidos();
            }
        }, 500);

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange, paisSelecionado, hasUserInteracted]);

    // Salvar preferências de colunas
    useEffect(() => {
        localStorage.setItem('ecomhub-visible-columns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    // ======================== RENDER PRINCIPAL ========================

    return (
        <div className="flex-1 p-6 min-h-screen bg-background">
            {/* Notificações */}
            {notification && (
                <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className="mb-4 border-border">
                    {notification.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <AlertDescription>{notification.message}</AlertDescription>
                </Alert>
            )}

            {/* Header */}
            {renderHeader()}

            {/* Layout principal: Tabela à esquerda, Filtros à direita */}
            <div className="flex gap-6">
                {/* Conteúdo Principal (Tabela) */}
                <div className="flex-1 min-w-0">
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

                {/* Filtros Laterais */}
                <div className="flex-shrink-0">
                    {renderFiltrosLaterais()}
                </div>
            </div>

            {/* Sheet de Referência de Colunas */}
            <Sheet open={openReferenceSheet} onOpenChange={setOpenReferenceSheet}>
                <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Referência de Colunas</SheetTitle>
                        <SheetDescription>
                            Mapeamento entre colunas da tabela e campos da API ECOMHUB
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-3">
                        {availableColumns.map((column) => (
                            <div
                                key={column.id}
                                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex-1 space-y-1">
                                    <p className="font-semibold text-sm text-foreground">
                                        {column.label}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">API:</span>
                                        <code className="font-mono text-xs bg-background px-2 py-1 rounded border border-border text-primary">
                                            {column.apiPath}
                                        </code>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

export default EcomhubPedidosPage;
