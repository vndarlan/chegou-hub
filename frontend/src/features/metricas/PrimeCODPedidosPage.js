// frontend/src/features/metricas/PrimeCODPedidosPage.js
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';

function PrimeCODPedidosPage() {
    // Estados principais
    const [pedidos, setPedidos] = useState([]);
    const [totalPedidos, setTotalPedidos] = useState(0);

    // Estados do formulario
    const [periodoPreset, setPeriodoPreset] = useState(null);
    const [dateRange, setDateRange] = useState({
        from: undefined,
        to: undefined
    });
    const [paisSelecionado, setPaisSelecionado] = useState('todos');
    const [statusSelecionado, setStatusSelecionado] = useState('todos');

    // Estados de expansao
    const [expandedRows, setExpandedRows] = useState({});
    const [copiedRow, setCopiedRow] = useState(null);

    // Estados de loading
    const [loadingBuscar, setLoadingBuscar] = useState(false);

    // Estados de notificacao
    const [notification, setNotification] = useState(null);

    // Estado para controlar Popover do Calendar
    const [openPopover, setOpenPopover] = useState(false);

    // Paginacao
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // Estados para as novas funcionalidades
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRows, setSelectedRows] = useState([]);

    // Estado para controlar se o usuario ja interagiu (para evitar auto-busca no load)
    const [hasUserInteracted, setHasUserInteracted] = useState(false);

    // Estado para colunas visiveis
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const COLUMNS_VERSION = '1'; // Versao das colunas padrao
        const savedVersion = localStorage.getItem('primecod-pedidos-columns-version');
        const saved = localStorage.getItem('primecod-pedidos-visible-columns');

        // Se nao tem versao salva OU versao diferente, usar padrao novo
        if (!savedVersion || savedVersion !== COLUMNS_VERSION) {
            localStorage.setItem('primecod-pedidos-columns-version', COLUMNS_VERSION);
            const defaultColumns = [
                'country_name',
                'reference',
                'raw_shipping_status',
                'created_at',
                'name',
                'phone',
                'city',
                'products_name',
                'products_sku',
                'products_quantity',
                'total_price',
                'total_price_eur',
                'shipping_cost',
                'tracking_number',
                'delivered_at',
                'shipped_at',
                'warehouse_name'
            ];
            localStorage.setItem('primecod-pedidos-visible-columns', JSON.stringify(defaultColumns));
            return defaultColumns;
        }

        // Versao correta, usar colunas salvas
        return saved ? JSON.parse(saved) : [
            'country_name',
            'reference',
            'raw_shipping_status',
            'created_at',
            'name',
            'phone',
            'city',
            'products_name',
            'products_sku',
            'products_quantity',
            'total_price',
            'total_price_eur',
            'shipping_cost',
            'tracking_number',
            'delivered_at',
            'shipped_at',
            'warehouse_name'
        ];
    });

    // Estado para controlar o Sheet de Referencia de Colunas
    const [openReferenceSheet, setOpenReferenceSheet] = useState(false);

    // Paises disponiveis PrimeCOD (16 paises europeus)
    const paisesDisponiveis = [
        { id: 'todos', name: 'Todos os Paises', flag: '' },
        { id: '1', name: 'Romania', flag: '' },
        { id: '2', name: 'Hungary', flag: '' },
        { id: '3', name: 'Bulgaria', flag: '' },
        { id: '4', name: 'Greece', flag: '' },
        { id: '5', name: 'Slovakia', flag: '' },
        { id: '6', name: 'Slovenia', flag: '' },
        { id: '7', name: 'Poland', flag: '' },
        { id: '8', name: 'Croatia', flag: '' },
        { id: '9', name: 'Czech Republic', flag: '' },
        { id: '10', name: 'Austria', flag: '' },
        { id: '11', name: 'Italy', flag: '' },
        { id: '12', name: 'Spain', flag: '' },
        { id: '13', name: 'Portugal', flag: '' },
        { id: '14', name: 'France', flag: '' },
        { id: '15', name: 'Germany', flag: '' },
    ];

    // ======================== FUNCOES AUXILIARES ========================

    // Funcao auxiliar para formatar arrays de products
    const formatProducts = (products, field) => {
        if (!products || products.length === 0) return 'N/A';

        const values = products.map(product => {
            if (field === 'name') {
                return product?.name;
            } else if (field === 'sku') {
                return product?.sku;
            } else if (field === 'quantity') {
                return product?.pivot?.quantity;
            }
            return null;
        }).filter(Boolean);

        return values.length > 0 ? values.join(', ') : 'N/A';
    };

    // Funcao auxiliar para formatar datas com seguranca
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

    // ======================== FUNCOES DE API ========================

    const buscarPedidos = useCallback(async () => {
        if (!dateRange?.from || !dateRange?.to) {
            showNotification('error', 'Selecione o periodo completo');
            return;
        }

        if (dateRange.from > dateRange.to) {
            showNotification('error', 'Data de inicio deve ser anterior a data fim');
            return;
        }

        setLoadingBuscar(true);
        setPedidos([]);
        setExpandedRows({});
        setSelectedRows([]);
        setSearchTerm('');
        setStatusSelecionado('todos');
        setCurrentPage(1);

        // Resetar colunas para padrao ao buscar novos pedidos
        setVisibleColumns([
            'country_name',
            'reference',
            'raw_shipping_status',
            'created_at',
            'name',
            'phone',
            'city',
            'products_name',
            'products_sku',
            'products_quantity',
            'total_price',
            'total_price_eur',
            'shipping_cost',
            'tracking_number',
            'delivered_at',
            'shipped_at',
            'warehouse_name'
        ]);

        try {
            const payload = {
                data_inicio: dateRange.from.toISOString().split('T')[0],
                data_fim: dateRange.to.toISOString().split('T')[0]
            };

            // Adicionar filtro de pais se selecionado
            if (paisSelecionado !== 'todos') {
                payload.country_id = parseInt(paisSelecionado);
            }

            const response = await apiClient.post('/metricas/primecod/pedidos/buscar/', payload);

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
        setHasUserInteracted(true); // Marcar que o usuario interagiu
    };

    // ======================== FUNCOES AUXILIARES ========================

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
            showNotification('success', 'JSON copiado para area de transferencia!');
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
        link.download = `pedido-${pedido.reference || pedido.id}.json`;
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
        link.download = `pedidos-primecod-selecionados-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('success', `${pedidosSelecionados.length} pedidos exportados!`);
    };

    // ======================== FUNCOES DE EXPORTACAO CSV ========================

    const escapeCsvValue = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Se contem virgula, aspas ou quebra de linha, envolver em aspas e duplicar aspas existentes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    const pedidoToCsvRow = (pedido) => {
        const row = [];

        if (isColumnVisible('country_name')) row.push(escapeCsvValue(pedido.country?.name || ''));
        if (isColumnVisible('reference')) row.push(escapeCsvValue(pedido.reference || ''));
        if (isColumnVisible('raw_shipping_status')) row.push(escapeCsvValue(pedido.raw_shipping_status || ''));
        if (isColumnVisible('created_at')) row.push(escapeCsvValue(formatSafeDate(pedido.created_at)));
        if (isColumnVisible('name')) row.push(escapeCsvValue(pedido.name || ''));
        if (isColumnVisible('phone')) row.push(escapeCsvValue(pedido.phone || ''));
        if (isColumnVisible('city')) row.push(escapeCsvValue(pedido.city || ''));
        if (isColumnVisible('address')) row.push(escapeCsvValue(pedido.address || ''));
        if (isColumnVisible('zip_code')) row.push(escapeCsvValue(pedido.zip_code || ''));
        if (isColumnVisible('tracking_number')) row.push(escapeCsvValue(pedido.tracking_number || ''));
        if (isColumnVisible('products_name')) row.push(escapeCsvValue(formatProducts(pedido.products, 'name')));
        if (isColumnVisible('products_sku')) row.push(escapeCsvValue(formatProducts(pedido.products, 'sku')));
        if (isColumnVisible('products_quantity')) row.push(escapeCsvValue(formatProducts(pedido.products, 'quantity')));
        if (isColumnVisible('total_price')) row.push(escapeCsvValue(pedido.total_price || ''));
        if (isColumnVisible('total_price_eur')) row.push(escapeCsvValue(pedido.total_price_eur || ''));
        if (isColumnVisible('shipping_cost')) row.push(escapeCsvValue(pedido.shipping_cost || ''));
        if (isColumnVisible('cod_fees')) row.push(escapeCsvValue(pedido.cod_fees || ''));
        if (isColumnVisible('cod_cost')) row.push(escapeCsvValue(pedido.cod_cost || ''));
        if (isColumnVisible('sourcing_price')) row.push(escapeCsvValue(pedido.sourcing_price || ''));
        if (isColumnVisible('return_cost')) row.push(escapeCsvValue(pedido.return_cost || ''));
        if (isColumnVisible('delivered_at')) row.push(escapeCsvValue(formatSafeDate(pedido.delivered_at)));
        if (isColumnVisible('shipped_at')) row.push(escapeCsvValue(formatSafeDate(pedido.shipped_at)));
        if (isColumnVisible('warehouse_name')) row.push(escapeCsvValue(pedido.warehouse?.name || ''));

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
        link.download = `pedido-${pedido.reference || pedido.id}.csv`;
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
        link.download = `pedidos-primecod-selecionados-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('success', `${pedidosSelecionados.length} pedidos exportados em CSV!`);
    };

    const getStatusBadgeColor = (status) => {
        const statusLower = status?.toLowerCase() || '';

        // Verde - Entregue
        if (statusLower === 'delivered') return 'bg-green-600 text-white hover:bg-green-700';

        // Azul - Enviado
        if (statusLower === 'sent') return 'bg-blue-600 text-white hover:bg-blue-700';

        // Amarelo - Pendente
        if (statusLower === 'pending') return 'bg-yellow-600 text-white hover:bg-yellow-700';

        // Vermelho - Devolvido
        if (statusLower === 'returned') return 'bg-red-600 text-white hover:bg-red-700';

        // Cinza - Cancelado
        if (statusLower === 'cancelled') return 'bg-gray-500 text-white hover:bg-gray-600';

        return 'bg-gray-400 text-white';
    };

    // Gerenciamento de colunas visiveis
    const availableColumns = [
        { id: 'country_name', label: 'Pais', apiPath: 'country.name' },
        { id: 'reference', label: 'N. Pedido', apiPath: 'reference' },
        { id: 'raw_shipping_status', label: 'Status Envio', apiPath: 'raw_shipping_status' },
        { id: 'created_at', label: 'Data Criacao', apiPath: 'created_at' },
        { id: 'name', label: 'Cliente', apiPath: 'name' },
        { id: 'phone', label: 'Telefone', apiPath: 'phone' },
        { id: 'city', label: 'Cidade', apiPath: 'city' },
        { id: 'address', label: 'Endereco', apiPath: 'address' },
        { id: 'zip_code', label: 'CEP', apiPath: 'zip_code' },
        { id: 'tracking_number', label: 'Tracking', apiPath: 'tracking_number' },
        { id: 'products_name', label: 'Produto(s)', apiPath: 'products[].name' },
        { id: 'products_sku', label: 'SKU(s)', apiPath: 'products[].sku' },
        { id: 'products_quantity', label: 'Qtd', apiPath: 'products[].pivot.quantity' },
        { id: 'total_price', label: 'Preco Total', apiPath: 'total_price' },
        { id: 'total_price_eur', label: 'Preco EUR', apiPath: 'total_price_eur' },
        { id: 'shipping_cost', label: 'Frete', apiPath: 'shipping_cost' },
        { id: 'cod_fees', label: 'Taxa COD', apiPath: 'cod_fees' },
        { id: 'cod_cost', label: 'Custo COD', apiPath: 'cod_cost' },
        { id: 'sourcing_price', label: 'Custo Sourcing', apiPath: 'sourcing_price' },
        { id: 'return_cost', label: 'Custo Retorno', apiPath: 'return_cost' },
        { id: 'delivered_at', label: 'Entregue em', apiPath: 'delivered_at' },
        { id: 'shipped_at', label: 'Enviado em', apiPath: 'shipped_at' },
        { id: 'warehouse_name', label: 'Warehouse', apiPath: 'warehouse.name' }
    ];

    const toggleColumn = (columnId) => {
        setVisibleColumns(prev => {
            if (prev.includes(columnId)) {
                // Manter pelo menos uma coluna visivel
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
                    pedido.reference?.toLowerCase().includes(search) ||
                    pedido.name?.toLowerCase().includes(search) ||
                    pedido.tracking_number?.toLowerCase().includes(search) ||
                    String(pedido.id)?.toLowerCase().includes(search)
                );
                if (!matchSearch) return false;
            }

            // Filtro de status
            if (statusSelecionado !== 'todos') {
                const statusLower = pedido.raw_shipping_status?.toLowerCase() || '';

                switch (statusSelecionado) {
                    case 'delivered':
                        return statusLower === 'delivered';
                    case 'sent':
                        return statusLower === 'sent';
                    case 'pending':
                        return statusLower === 'pending';
                    case 'returned':
                        return statusLower === 'returned';
                    case 'cancelled':
                        return statusLower === 'cancelled';
                    default:
                        return true;
                }
            }

            return true;
        });
    }, [pedidos, searchTerm, statusSelecionado]);

    // ======================== COMPONENTES DE RENDERIZACAO ========================

    const renderHeader = () => (
        <div className="space-y-4 mb-6">
            {/* Linha superior: Titulo a esquerda, Filtros a direita */}
            <div className="flex items-center justify-between gap-6">
                {/* Lado Esquerdo - Titulo */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold text-foreground">Lista de Pedidos PrimeCOD</h1>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOpenReferenceSheet(true)}
                        className="gap-2 w-fit"
                    >
                        <Info className="h-4 w-4" />
                        Referencia de Colunas
                    </Button>
                </div>

                {/* Lado Direito - Filtros Horizontais */}
                <div className="flex items-center gap-3">
                    {/* Filtro de Periodo */}
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => aplicarPreset('semana')}
                            variant={periodoPreset === 'semana' ? 'default' : 'outline'}
                            size="sm"
                            disabled={loadingBuscar}
                        >
                            Ultima Semana
                        </Button>
                        <Button
                            onClick={() => aplicarPreset('mes')}
                            variant={periodoPreset === 'mes' ? 'default' : 'outline'}
                            size="sm"
                            disabled={loadingBuscar}
                        >
                            Ultimo Mes
                        </Button>
                        <Button
                            onClick={() => aplicarPreset('3meses')}
                            variant={periodoPreset === '3meses' ? 'default' : 'outline'}
                            size="sm"
                            disabled={loadingBuscar}
                        >
                            Ultimos 3 Meses
                        </Button>

                        {/* Popover Periodo Personalizado */}
                        <Popover open={openPopover} onOpenChange={setOpenPopover}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={periodoPreset === null && dateRange?.from ? 'default' : 'outline'}
                                    size="sm"
                                    className="gap-2"
                                    disabled={loadingBuscar}
                                >
                                    <CalendarIcon className="h-4 w-4" />
                                    Personalizado
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 max-w-none" align="end">
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

                    <Separator orientation="vertical" className="h-8" />

                    {/* Filtro de Pais */}
                    <Select value={paisSelecionado} onValueChange={setPaisSelecionado} disabled={loadingBuscar}>
                        <SelectTrigger className="w-[180px] border-border bg-background text-foreground">
                            <SelectValue placeholder="Todos os paises" />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-popover">
                            {paisesDisponiveis.map(pais => (
                                <SelectItem
                                    key={pais.id}
                                    value={pais.id}
                                    className="text-popover-foreground hover:bg-accent"
                                >
                                    {pais.flag} {pais.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );

    const renderTabela = () => {
        if (pedidos.length === 0 && !loadingBuscar) {
            return (
                <Alert className="border-border bg-background">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <AlertDescription className="text-muted-foreground">
                        Nenhum pedido encontrado. Selecione um periodo para buscar.
                    </AlertDescription>
                </Alert>
            );
        }

        // Paginacao (usa pedidosFiltrados do useMemo)
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
                                {pedidosFiltrados.length} de {pedidos.length} pedidos | Pagina {currentPage} de {totalPaginas} | {visibleColumns.length} colunas visiveis
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
                                                'country_name',
                                                'reference',
                                                'raw_shipping_status',
                                                'created_at',
                                                'name',
                                                'phone',
                                                'city',
                                                'products_name',
                                                'products_sku',
                                                'products_quantity',
                                                'total_price',
                                                'total_price_eur',
                                                'shipping_cost',
                                                'tracking_number',
                                                'delivered_at',
                                                'shipped_at',
                                                'warehouse_name'
                                            ]);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setVisibleColumns([
                                                    'country_name',
                                                    'reference',
                                                    'raw_shipping_status',
                                                    'created_at',
                                                    'name',
                                                    'phone',
                                                    'city',
                                                    'products_name',
                                                    'products_sku',
                                                    'products_quantity',
                                                    'total_price',
                                                    'total_price_eur',
                                                    'shipping_cost',
                                                    'tracking_number',
                                                    'delivered_at',
                                                    'shipped_at',
                                                    'warehouse_name'
                                                ]);
                                            }
                                        }}
                                    >
                                        <Settings2 className="h-4 w-4 mr-2" />
                                        Restaurar Padrao
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Campo de Busca Global e Filtro de Status */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por numero, cliente ou tracking..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1); // Reset para primeira pagina ao buscar
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
                                    Entregue
                                </SelectItem>
                                <SelectItem value="sent" className="text-popover-foreground hover:bg-accent">
                                    Enviado
                                </SelectItem>
                                <SelectItem value="pending" className="text-popover-foreground hover:bg-accent">
                                    Pendente
                                </SelectItem>
                                <SelectItem value="returned" className="text-popover-foreground hover:bg-accent">
                                    Devolvido
                                </SelectItem>
                                <SelectItem value="cancelled" className="text-popover-foreground hover:bg-accent">
                                    Cancelado
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Contador de Selecao */}
                    {selectedRows.length > 0 && (
                        <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded">
                            <p className="text-sm text-muted-foreground">
                                {selectedRows.length} de {pedidosFiltrados.length} pedido(s) selecionado(s)
                            </p>
                            <Button variant="outline" size="sm" onClick={() => setSelectedRows([])}>
                                Limpar selecao
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
                    {/* GRID WRAPPER - FORCA CONTENCAO REAL */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', minWidth: 0 }}>
                        <div
                            id="table-scroll-container-primecod"
                            style={{
                                overflowX: 'auto',
                                overflowY: 'visible',
                                minWidth: 0,
                                WebkitOverflowScrolling: 'touch'
                            }}
                        >
                            <Table style={{ width: 'max-content', display: 'table', tableLayout: 'auto' }}>
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
                                            aria-label="Selecionar todos os pedidos da pagina atual"
                                        />
                                    </TableHead>
                                    {isColumnVisible('country_name') && <TableHead className="min-w-[120px]">Pais</TableHead>}
                                    {isColumnVisible('reference') && <TableHead className="min-w-[130px]">N. Pedido</TableHead>}
                                    {isColumnVisible('raw_shipping_status') && <TableHead className="min-w-[120px]">Status Envio</TableHead>}
                                    {isColumnVisible('created_at') && <TableHead className="min-w-[150px]">Data Criacao</TableHead>}
                                    {isColumnVisible('name') && <TableHead className="min-w-[180px]">Cliente</TableHead>}
                                    {isColumnVisible('phone') && <TableHead className="min-w-[140px]">Telefone</TableHead>}
                                    {isColumnVisible('city') && <TableHead className="min-w-[140px]">Cidade</TableHead>}
                                    {isColumnVisible('address') && <TableHead className="min-w-[250px]">Endereco</TableHead>}
                                    {isColumnVisible('zip_code') && <TableHead className="min-w-[100px]">CEP</TableHead>}
                                    {isColumnVisible('tracking_number') && <TableHead className="min-w-[150px]">Tracking</TableHead>}
                                    {isColumnVisible('products_name') && <TableHead className="min-w-[250px]">Produto(s)</TableHead>}
                                    {isColumnVisible('products_sku') && <TableHead className="min-w-[150px]">SKU(s)</TableHead>}
                                    {isColumnVisible('products_quantity') && <TableHead className="min-w-[80px]">Qtd</TableHead>}
                                    {isColumnVisible('total_price') && <TableHead className="min-w-[120px]">Preco Total</TableHead>}
                                    {isColumnVisible('total_price_eur') && <TableHead className="min-w-[120px]">Preco EUR</TableHead>}
                                    {isColumnVisible('shipping_cost') && <TableHead className="min-w-[100px]">Frete</TableHead>}
                                    {isColumnVisible('cod_fees') && <TableHead className="min-w-[100px]">Taxa COD</TableHead>}
                                    {isColumnVisible('cod_cost') && <TableHead className="min-w-[100px]">Custo COD</TableHead>}
                                    {isColumnVisible('sourcing_price') && <TableHead className="min-w-[130px]">Custo Sourcing</TableHead>}
                                    {isColumnVisible('return_cost') && <TableHead className="min-w-[130px]">Custo Retorno</TableHead>}
                                    {isColumnVisible('delivered_at') && <TableHead className="min-w-[150px]">Entregue em</TableHead>}
                                    {isColumnVisible('shipped_at') && <TableHead className="min-w-[150px]">Enviado em</TableHead>}
                                    {isColumnVisible('warehouse_name') && <TableHead className="min-w-[140px]">Warehouse</TableHead>}
                                    <TableHead className="text-right min-w-[80px] sticky right-0 z-50 bg-muted/50">Acoes</TableHead>
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
                                                        aria-label={`Selecionar pedido ${pedido.reference}`}
                                                    />
                                                </TableCell>
                                                {isColumnVisible('country_name') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.country?.name || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('reference') && (
                                                    <TableCell className="text-xs font-medium">
                                                        {pedido.reference || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('raw_shipping_status') && (
                                                    <TableCell>
                                                        <Badge className={getStatusBadgeColor(pedido.raw_shipping_status)}>
                                                            {pedido.raw_shipping_status || 'N/A'}
                                                        </Badge>
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('created_at') && (
                                                    <TableCell className="text-xs">
                                                        {formatSafeDate(pedido.created_at)}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('name') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.name || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('phone') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.phone || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('city') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.city || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('address') && (
                                                    <TableCell className="text-xs max-w-[250px] break-words">
                                                        {pedido.address || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('zip_code') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.zip_code || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('tracking_number') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.tracking_number || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('products_name') && (
                                                    <TableCell className="text-xs max-w-[300px] break-words">
                                                        {formatProducts(pedido.products, 'name')}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('products_sku') && (
                                                    <TableCell className="text-xs max-w-[200px] break-words">
                                                        {formatProducts(pedido.products, 'sku')}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('products_quantity') && (
                                                    <TableCell className="text-xs">
                                                        {formatProducts(pedido.products, 'quantity')}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('total_price') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.total_price || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('total_price_eur') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.total_price_eur || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('shipping_cost') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.shipping_cost || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('cod_fees') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.cod_fees || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('cod_cost') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.cod_cost || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('sourcing_price') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.sourcing_price || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('return_cost') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.return_cost || '-'}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('delivered_at') && (
                                                    <TableCell className="text-xs">
                                                        {formatSafeDate(pedido.delivered_at)}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('shipped_at') && (
                                                    <TableCell className="text-xs">
                                                        {formatSafeDate(pedido.shipped_at)}
                                                    </TableCell>
                                                )}
                                                {isColumnVisible('warehouse_name') && (
                                                    <TableCell className="text-xs">
                                                        {pedido.warehouse?.name || '-'}
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
                                                            <DropdownMenuLabel>Acoes</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => toggleExpandRow(pedido.id)}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                Ver JSON Completo
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => copiarParaAreaTransferencia(pedido.id)}>
                                                                <Copy className="mr-2 h-4 w-4" />
                                                                Copiar ID do Pedido
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
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
                    </div>

                    {/* Paginacao Avancada */}
                    {totalPaginas > 0 && (
                        <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground">Linhas por pagina</p>
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
                                    Pagina {currentPage} de {totalPaginas}
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
        // Definir periodo padrao (ultima semana)
        const hoje = new Date();
        const semanaPassada = new Date();
        semanaPassada.setDate(hoje.getDate() - 7);

        setDateRange({
            from: semanaPassada,
            to: hoje
        });
        setPeriodoPreset('semana');
    }, []);

    // Busca automatica quando filtros mudarem (somente apos interacao do usuario)
    useEffect(() => {
        // Nao executar se o usuario ainda nao interagiu (evita busca automatica no load)
        if (!hasUserInteracted) return;

        // Debounce para evitar multiplas chamadas
        const timer = setTimeout(() => {
            if (dateRange?.from && dateRange?.to) {
                buscarPedidos();
            }
        }, 500);

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange, paisSelecionado, hasUserInteracted]);

    // Salvar preferencias de colunas
    useEffect(() => {
        localStorage.setItem('primecod-pedidos-visible-columns', JSON.stringify(visibleColumns));
        // Garantir que a versao esta sempre sincronizada
        const COLUMNS_VERSION = '1';
        localStorage.setItem('primecod-pedidos-columns-version', COLUMNS_VERSION);
    }, [visibleColumns]);

    // CSS customizado para scrollbar ULTRA visivel
    useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.id = 'primecod-pedidos-scroll-fix';
        styleEl.textContent = `
            /* Scrollbar GRANDE e SEMPRE visivel */
            #table-scroll-container-primecod::-webkit-scrollbar {
                height: 20px !important;
                background: #f8fafc;
            }

            #table-scroll-container-primecod::-webkit-scrollbar-track {
                background: #e2e8f0 !important;
                border: 2px solid #cbd5e1;
                border-radius: 10px;
            }

            #table-scroll-container-primecod::-webkit-scrollbar-thumb {
                background: #64748b !important;
                border-radius: 8px;
                border: 3px solid #e2e8f0;
                min-width: 50px;
            }

            #table-scroll-container-primecod::-webkit-scrollbar-thumb:hover {
                background: #475569 !important;
            }

            #table-scroll-container-primecod::-webkit-scrollbar-thumb:active {
                background: #334155 !important;
            }

            /* Garantir contencao e scroll suave */
            #table-scroll-container-primecod {
                -webkit-overflow-scrolling: touch;
                scrollbar-width: thin;
                scrollbar-color: #64748b #e2e8f0;
            }

            /* Garantir que o Card contem o conteudo */
            #table-scroll-container-primecod table {
                margin: 0 !important;
            }
        `;
        document.head.appendChild(styleEl);

        return () => {
            const el = document.getElementById('primecod-pedidos-scroll-fix');
            if (el) el.remove();
        };
    }, []);

    // ======================== RENDER PRINCIPAL ========================

    return (
        <div className="flex-1 p-6 min-h-screen bg-background" style={{ overflowX: 'hidden', maxWidth: '100%', boxSizing: 'border-box' }}>
            {/* Notificacoes */}
            {notification && (
                <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className="mb-4 border-border">
                    {notification.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <AlertDescription>{notification.message}</AlertDescription>
                </Alert>
            )}

            {/* Header */}
            {renderHeader()}

            {/* Layout principal: Tabela em largura total */}
            <div className="w-full relative" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
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

            {/* Sheet de Referencia de Colunas */}
            <Sheet open={openReferenceSheet} onOpenChange={setOpenReferenceSheet}>
                <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Referencia de Colunas</SheetTitle>
                        <SheetDescription>
                            Mapeamento entre colunas da tabela e campos da API PrimeCOD
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

export default PrimeCODPedidosPage;
