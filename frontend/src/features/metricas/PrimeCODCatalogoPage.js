// frontend/src/features/metricas/PrimeCODCatalogoPage.js
import React, { useState, useEffect } from 'react';
import {
    RefreshCw, Search, Package, TrendingUp, TrendingDown,
    Filter, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Globe,
    ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
    LayoutGrid, Table2, Clock, CheckCircle, XCircle, History, X
} from 'lucide-react';
import apiClient from '../../utils/axios';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { getCSRFToken } from '../../utils/csrf';

// Países PrimeCOD disponíveis
const PAISES_PRIMECOD = [
    { code: 'all', label: 'Todos os Países', name: 'Todos' },
    { code: 'ro', label: 'Romania', name: 'Romania' },
    { code: 'hu', label: 'Hungary', name: 'Hungary' },
    { code: 'bg', label: 'Bulgaria', name: 'Bulgaria' },
    { code: 'gr', label: 'Greece', name: 'Greece' },
    { code: 'sk', label: 'Slovakia', name: 'Slovakia' },
    { code: 'si', label: 'Slovenia', name: 'Slovenia' },
    { code: 'pl', label: 'Poland', name: 'Poland' },
    { code: 'hr', label: 'Croatia', name: 'Croatia' },
    { code: 'cz', label: 'Czech Republic', name: 'Czech Republic' },
    { code: 'at', label: 'Austria', name: 'Austria' },
    { code: 'it', label: 'Italy', name: 'Italy' },
    { code: 'es', label: 'Spain', name: 'Spain' },
    { code: 'pt', label: 'Portugal', name: 'Portugal' },
    { code: 'fr', label: 'France', name: 'France' },
    { code: 'de', label: 'Germany', name: 'Germany' }
];

// Níveis de estoque
const STOCK_LEVELS = [
    { value: 'all', label: 'Todos os Níveis' },
    { value: 'high', label: 'Alto' },
    { value: 'medium', label: 'Médio' },
    { value: 'low', label: 'Baixo' }
];

// Componente ProductCard
const ProductCard = ({ produto, onVerHistorico }) => {
    const primeiraImagem = produto.images?.[0]?.path || null;
    const [imagemFalhou, setImagemFalhou] = useState(false);

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
            {/* Imagem */}
            <div className="relative h-48 bg-muted">
                {primeiraImagem && !imagemFalhou ? (
                    <img
                        src={primeiraImagem}
                        alt={produto.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={() => setImagemFalhou(true)}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <Package className="h-16 w-16 text-muted-foreground" />
                    </div>
                )}

                {/* Badge NOVO */}
                {produto.is_new && (
                    <Badge className="absolute top-2 right-2 bg-yellow-500 text-white">
                        NOVO
                    </Badge>
                )}
            </div>

            <CardContent className="p-4">
                {/* Nome */}
                <h3 className="font-semibold text-lg mb-2 truncate" title={produto.name}>
                    {produto.name}
                </h3>

                {/* SKU */}
                <p className="text-xs text-muted-foreground font-mono mb-3">
                    {produto.sku}
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                        <p className="text-xs text-muted-foreground">Vendas</p>
                        <div className="flex items-center gap-1">
                            <p className="font-semibold">{produto.total_units_sold}</p>
                            {produto.units_sold_delta !== 0 && (
                                <Badge variant="outline" className={
                                    produto.units_sold_delta > 0
                                        ? 'text-green-600 border-green-600'
                                        : 'text-red-600 border-red-600'
                                }>
                                    <span className="flex items-center">
                                        {produto.units_sold_delta > 0 ? (
                                            <TrendingUp className="h-3 w-3 mr-1" />
                                        ) : (
                                            <TrendingDown className="h-3 w-3 mr-1" />
                                        )}
                                        {produto.units_sold_delta > 0 ? '+' : ''}
                                        {produto.units_sold_delta}
                                    </span>
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">Estoque</p>
                        <div className="flex items-center gap-1">
                            <p className="font-semibold">{produto.quantity}</p>
                            {produto.quantity_delta !== 0 && (
                                <Badge variant="outline" className={
                                    produto.quantity_delta > 0
                                        ? 'text-green-600 border-green-600'
                                        : 'text-red-600 border-red-600'
                                }>
                                    <span className="flex items-center">
                                        {produto.quantity_delta > 0 ? (
                                            <TrendingUp className="h-3 w-3 mr-1" />
                                        ) : (
                                            <TrendingDown className="h-3 w-3 mr-1" />
                                        )}
                                        {produto.quantity_delta > 0 ? '+' : ''}
                                        {produto.quantity_delta}
                                    </span>
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Nível de Estoque */}
                <Badge className={
                    produto.stock_label === 'High'
                        ? 'bg-green-500 text-white'
                        : produto.stock_label === 'Medium'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-red-500 text-white'
                }>
                    {produto.stock_label}
                </Badge>

                {/* Disponível em */}
                <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Disponível em:</p>
                    <div className="flex flex-wrap gap-1">
                        {produto.countries?.slice(0, 3).map((country, idx) => {
                            const countryCode = typeof country === 'string' ? country : country.code;
                            return (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                    {countryCode?.toUpperCase()}
                                </Badge>
                            );
                        })}
                        {produto.countries?.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                                +{produto.countries.length - 3}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Botão Ver Histórico */}
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => onVerHistorico(produto)}
                >
                    <History className="h-4 w-4 mr-2" />
                    Ver Histórico
                </Button>
            </CardContent>
        </Card>
    );
};

function PrimeCODCatalogoPage() {
    // Estados principais
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [notification, setNotification] = useState(null);

    // Estados de filtros
    const [paisSelecionado, setPaisSelecionado] = useState('all');
    const [nivelEstoque, setNivelEstoque] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para ordenação
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');

    // Estados de paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [totalProdutos, setTotalProdutos] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(0);

    // Estado de visualização
    const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'table'

    // Estado de última sincronização
    const [ultimaSync, setUltimaSync] = useState(null);
    const [loadingSync, setLoadingSync] = useState(false);

    // Estado do modal de histórico
    const [modalHistorico, setModalHistorico] = useState(false);
    const [produtoHistorico, setProdutoHistorico] = useState(null);
    const [historico, setHistorico] = useState([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);

    // ======================== FUNÇÕES DE API ========================

    const fetchCatalogo = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', currentPage);
            if (paisSelecionado !== 'all') params.append('country', paisSelecionado);
            if (nivelEstoque !== 'all') params.append('stock_label', nivelEstoque);
            if (searchTerm) params.append('search', searchTerm);
            if (sortBy) {
                const ordering = sortOrder === 'desc' ? `-${sortBy}` : sortBy;
                params.append('ordering', ordering);
            }

            const response = await apiClient.get(`/metricas/primecod/catalog/?${params.toString()}`);
            const data = response.data;

            setProdutos(data.results || []);
            setTotalProdutos(data.count || 0);
            setTotalPaginas(Math.ceil((data.count || 0) / 10));

            if ((data.results || []).length === 0) {
                showNotification('info', 'Nenhum produto encontrado com os filtros selecionados');
            }
        } catch (error) {
            console.error('Erro ao carregar catálogo:', error);

            // Verificar se realmente é erro de token ou outro erro 400
            if (error.response?.status === 400 && error.response?.data?.configured === false) {
                // Definitivamente é erro de token não configurado
                showNotification('error', 'Token da API não configurado. Configure em: Fornecedor > PrimeCOD > Configuração');
            } else {
                // Outro tipo de erro
                showNotification('error', error.response?.data?.message || 'Erro ao carregar catálogo');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchUltimaSync = async () => {
        setLoadingSync(true);
        try {
            const response = await apiClient.get('/metricas/primecod/catalog/last-sync/');
            setUltimaSync(response.data);
        } catch (error) {
            console.error('Erro ao carregar última sincronização:', error);
            // Não mostra notificação para não poluir a UI
        } finally {
            setLoadingSync(false);
        }
    };

    const abrirHistorico = async (produto) => {
        setProdutoHistorico(produto);
        setModalHistorico(true);
        setLoadingHistorico(true);
        setHistorico([]);

        try {
            const response = await apiClient.get(`/metricas/primecod/catalog/${produto.id}/history/?days=30`);
            setHistorico(response.data.snapshots || []);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            showNotification('error', 'Erro ao carregar histórico do produto');
        } finally {
            setLoadingHistorico(false);
        }
    };

    const fecharHistorico = () => {
        setModalHistorico(false);
        setProdutoHistorico(null);
        setHistorico([]);
    };

    const sincronizarCatalogo = async () => {
        setSyncing(true);
        try {
            const response = await apiClient.post('/metricas/primecod/catalog/sync/', {}, {
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.status === 'success') {
                showNotification('success', `Catálogo sincronizado! ${response.data.total_produtos || 0} produtos atualizados`);
                await fetchCatalogo(); // Recarregar após sincronização
                await fetchUltimaSync(); // Atualizar última sync
            } else {
                showNotification('error', response.data.message || 'Erro ao sincronizar');
            }
        } catch (error) {
            console.error('Erro ao sincronizar:', error);

            // Verificar se realmente é erro de token ou outro erro 400
            if (error.response?.status === 400 && error.response?.data?.configured === false) {
                // Definitivamente é erro de token não configurado
                showNotification('error', 'Token da API não configurado. Configure em: Fornecedor > PrimeCOD > Configuração');
            } else {
                // Outro tipo de erro
                showNotification('error', error.response?.data?.message || 'Erro ao sincronizar catálogo');
            }
        } finally {
            setSyncing(false);
        }
    };

    // ======================== FUNÇÕES AUXILIARES ========================

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const formatarDataSync = (dataISO) => {
        if (!dataISO) return 'Nunca';
        const data = new Date(dataISO);
        const agora = new Date();
        const diffMs = agora - data;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHoras = Math.floor(diffMs / 3600000);
        const diffDias = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora mesmo';
        if (diffMins < 60) return `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
        if (diffHoras < 24) return `Há ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
        if (diffDias === 1) return 'Ontem';
        if (diffDias < 7) return `Há ${diffDias} dias`;

        return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const getStockBadgeColor = (label) => {
        switch(label?.toLowerCase()) {
            case 'high':
                return 'bg-green-600 text-white';
            case 'medium':
                return 'bg-yellow-600 text-white';
            case 'low':
                return 'bg-red-600 text-white';
            default:
                return 'bg-gray-600 text-white';
        }
    };

    const renderVariationBadge = (delta, value) => {
        if (!delta || delta === 0) return null;

        const isPositive = delta > 0;
        return (
            <Badge variant="outline" className={`ml-2 ${isPositive ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}`}>
                {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {isPositive ? '+' : ''}{delta}
            </Badge>
        );
    };

    const renderCountryBadges = (countries) => {
        if (!countries || countries.length === 0) return null;

        return (
            <div className="flex flex-wrap gap-1">
                {countries.map((country, idx) => {
                    // country pode ser string (código) ou objeto {name, code}
                    const countryCode = typeof country === 'string' ? country : country.code;
                    const pais = PAISES_PRIMECOD.find(p => p.code === countryCode.toLowerCase());
                    return (
                        <Badge key={idx} variant="secondary" className="text-xs">
                            {pais?.code.toUpperCase() || countryCode.toUpperCase()}
                        </Badge>
                    );
                })}
            </div>
        );
    };

    // ======================== EFEITOS ========================

    useEffect(() => {
        fetchCatalogo();
        fetchUltimaSync(); // Carregar última sync na montagem
    }, [currentPage, paisSelecionado, nivelEstoque, sortBy, sortOrder]);

    // Debounce para busca e resetar página
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== undefined) {
                setCurrentPage(1); // Resetar para página 1 ao buscar
                fetchCatalogo();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Resetar para página 1 quando filtros mudarem
    useEffect(() => {
        setCurrentPage(1);
    }, [paisSelecionado, nivelEstoque, sortBy, sortOrder]);

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Catálogo PrimeCOD</h1>
                    <p className="text-sm text-muted-foreground">Gerenciamento de produtos e estoque</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Informação da Última Sincronização */}
                {ultimaSync && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                        {ultimaSync.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : ultimaSync.status === 'error' ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-foreground">
                                {ultimaSync.status === 'success' ? 'Última sync' : 'Última tentativa'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {formatarDataSync(ultimaSync.completed_at || ultimaSync.started_at)}
                            </span>
                        </div>
                        {ultimaSync.status === 'success' && ultimaSync.total_products_processed > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {ultimaSync.total_products_processed} produtos
                            </Badge>
                        )}
                    </div>
                )}

                <Button
                    onClick={sincronizarCatalogo}
                    disabled={syncing}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {syncing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {syncing ? 'Sincronizando...' : 'Sincronizar'}
                </Button>
            </div>
        </div>
    );

    const renderFiltros = () => (
        <Card className="mb-6 border-border bg-card">
            <CardHeader>
                <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Select de País */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">País</label>
                        <Select value={paisSelecionado} onValueChange={setPaisSelecionado}>
                            <SelectTrigger className="border-border bg-background text-foreground">
                                <Globe className="h-4 w-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-popover">
                                {PAISES_PRIMECOD.map(pais => (
                                    <SelectItem key={pais.code} value={pais.code} className="text-popover-foreground hover:bg-accent">
                                        {pais.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Select de Nível de Estoque */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Nível de Estoque</label>
                        <Select value={nivelEstoque} onValueChange={setNivelEstoque}>
                            <SelectTrigger className="border-border bg-background text-foreground">
                                <Package className="h-4 w-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-popover">
                                {STOCK_LEVELS.map(level => (
                                    <SelectItem key={level.value} value={level.value} className="text-popover-foreground hover:bg-accent">
                                        {level.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Input de Busca */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Buscar</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Nome ou descrição..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 border-border bg-background text-foreground"
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    const renderPaginacao = () => {
        if (totalPaginas <= 1) return null;

        return (
            <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * 10) + 1} a {Math.min(currentPage * 10, totalProdutos)} de {totalProdutos} produtos
                </div>

                <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPaginas}
                    </p>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPaginas, prev + 1))}
                            disabled={currentPage === totalPaginas}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(totalPaginas)}
                            disabled={currentPage === totalPaginas}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    // ======================== RENDER PRINCIPAL ========================

    return (
        <div className="flex-1 space-y-4 p-6 min-h-screen bg-background">
            {/* Notificações */}
            {notification && (
                <Alert
                    variant={notification.type === 'error' ? 'destructive' : 'default'}
                    className="mb-4 border-border"
                >
                    <AlertDescription>{notification.message}</AlertDescription>
                </Alert>
            )}

            {/* Header */}
            {renderHeader()}

            {/* Filtros */}
            {renderFiltros()}

            {/* Card de Produtos com Toggle */}
            <Card className="border-border bg-card">
                {loading && (
                    <div className="absolute inset-0 bg-background/95 backdrop-blur flex items-center justify-center z-10 rounded-lg">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg text-card-foreground">Produtos</CardTitle>
                            <CardDescription className="text-muted-foreground">
                                {totalProdutos} produtos encontrados
                            </CardDescription>
                        </div>

                        {/* Toggle de Visualização */}
                        <div className="flex gap-1 border rounded-md p-1 bg-muted">
                            <Button
                                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('cards')}
                                className="h-8"
                            >
                                <LayoutGrid className="h-4 w-4 mr-2" />
                                Cards
                            </Button>
                            <Button
                                variant={viewMode === 'table' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('table')}
                                className="h-8"
                            >
                                <Table2 className="h-4 w-4 mr-2" />
                                Tabela
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {viewMode === 'cards' ? (
                        <>
                            {/* Grid de Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {produtos.length === 0 ? (
                                    <div className="col-span-full text-center text-muted-foreground py-8">
                                        {loading ? 'Carregando...' : 'Nenhum produto encontrado'}
                                    </div>
                                ) : (
                                    produtos.map(produto => (
                                        <ProductCard key={produto.id} produto={produto} onVerHistorico={abrirHistorico} />
                                    ))
                                )}
                            </div>
                            {/* Paginação para Cards */}
                            {renderPaginacao()}
                        </>
                    ) : (
                        /* Tabela */
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 border-border">
                                        <TableHead className="text-muted-foreground">
                                            <button
                                                className="flex items-center gap-1 text-xs hover:text-foreground transition-colors"
                                                onClick={() => handleSort('name')}
                                            >
                                                Nome
                                                {sortBy === 'name' ? (
                                                    sortOrder === 'asc' ?
                                                        <ArrowUp className="h-3 w-3" /> :
                                                        <ArrowDown className="h-3 w-3" />
                                                ) : (
                                                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                )}
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-muted-foreground">Descrição</TableHead>
                                        <TableHead className="text-center text-muted-foreground">
                                            <button
                                                className="flex items-center gap-1 text-xs hover:text-foreground transition-colors mx-auto"
                                                onClick={() => handleSort('total_units_sold')}
                                            >
                                                Vendas
                                                {sortBy === 'total_units_sold' ? (
                                                    sortOrder === 'asc' ?
                                                        <ArrowUp className="h-3 w-3" /> :
                                                        <ArrowDown className="h-3 w-3" />
                                                ) : (
                                                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                )}
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-center text-muted-foreground">
                                            <button
                                                className="flex items-center gap-1 text-xs hover:text-foreground transition-colors mx-auto"
                                                onClick={() => handleSort('quantity')}
                                            >
                                                Estoque
                                                {sortBy === 'quantity' ? (
                                                    sortOrder === 'asc' ?
                                                        <ArrowUp className="h-3 w-3" /> :
                                                        <ArrowDown className="h-3 w-3" />
                                                ) : (
                                                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                )}
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-center text-muted-foreground">Nível</TableHead>
                                        <TableHead className="text-muted-foreground">Disponível em</TableHead>
                                        <TableHead className="text-center text-muted-foreground">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {produtos.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                {loading ? 'Carregando...' : 'Nenhum produto encontrado'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        produtos.map((produto, idx) => (
                                            <TableRow key={idx} className="border-border hover:bg-muted/50 transition-colors">
                                                <TableCell className="font-medium text-card-foreground">
                                                    <div className="flex items-center gap-2">
                                                        {produto.name}
                                                        {produto.is_new && (
                                                            <Badge className="bg-yellow-600 text-white">NOVO</Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground max-w-xs">
                                                    <div className="truncate" title={produto.description}>
                                                        {produto.description || '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center text-card-foreground">
                                                    <div className="flex items-center justify-center">
                                                        {produto.total_units_sold?.toLocaleString() || 0}
                                                        {renderVariationBadge(produto.units_sold_delta, produto.total_units_sold)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center text-card-foreground">
                                                    <div className="flex items-center justify-center">
                                                        {produto.quantity?.toLocaleString() || 0}
                                                        {renderVariationBadge(produto.quantity_delta, produto.quantity)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={getStockBadgeColor(produto.stock_label)}>
                                                        {produto.stock_label?.toUpperCase() || 'N/A'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {renderCountryBadges(produto.countries)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => abrirHistorico(produto)}
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            {/* Paginação para Tabela */}
                            {renderPaginacao()}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Histórico */}
            <Dialog open={modalHistorico} onOpenChange={fecharHistorico}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Histórico de Vendas e Estoque
                        </DialogTitle>
                        {produtoHistorico && (
                            <DialogDescription className="text-sm">
                                <span className="font-semibold">{produtoHistorico.name}</span>
                                <span className="text-muted-foreground ml-2">({produtoHistorico.sku})</span>
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    {loadingHistorico ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : historico.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            Nenhum histórico disponível para este produto
                        </div>
                    ) : (
                        <div className="mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-center">Vendas</TableHead>
                                        <TableHead className="text-center">Variação</TableHead>
                                        <TableHead className="text-center">Estoque</TableHead>
                                        <TableHead className="text-center">Variação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historico.map((snapshot, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">
                                                {new Date(snapshot.date).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric'
                                                })}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {snapshot.total_units_sold?.toLocaleString() || 0}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {snapshot.units_sold_delta !== 0 && (
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            snapshot.units_sold_delta > 0
                                                                ? 'text-green-600 border-green-600'
                                                                : 'text-red-600 border-red-600'
                                                        }
                                                    >
                                                        {snapshot.units_sold_delta > 0 ? '+' : ''}
                                                        {snapshot.units_sold_delta}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {snapshot.quantity?.toLocaleString() || 0}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {snapshot.quantity_delta !== 0 && (
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            snapshot.quantity_delta > 0
                                                                ? 'text-green-600 border-green-600'
                                                                : 'text-red-600 border-red-600'
                                                        }
                                                    >
                                                        {snapshot.quantity_delta > 0 ? '+' : ''}
                                                        {snapshot.quantity_delta}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default PrimeCODCatalogoPage;
