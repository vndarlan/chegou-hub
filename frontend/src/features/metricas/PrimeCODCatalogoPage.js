// frontend/src/features/metricas/PrimeCODCatalogoPage.js
import React, { useState, useEffect } from 'react';
import {
    RefreshCw, Search, Package, TrendingUp, TrendingDown,
    Filter, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Globe
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

    // ======================== FUNÇÕES DE API ========================

    const fetchCatalogo = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (paisSelecionado !== 'all') params.append('country', paisSelecionado);
            if (nivelEstoque !== 'all') params.append('stock_label', nivelEstoque);
            if (searchTerm) params.append('search', searchTerm);
            if (sortBy) {
                const ordering = sortOrder === 'desc' ? `-${sortBy}` : sortBy;
                params.append('ordering', ordering);
            }

            const response = await apiClient.get(`/metricas/primecod/catalog/?${params.toString()}`);
            setProdutos(response.data.results || response.data || []);

            if ((response.data.results || response.data || []).length === 0) {
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
                {countries.map((countryCode, idx) => {
                    const pais = PAISES_PRIMECOD.find(p => p.code === countryCode.toLowerCase());
                    return (
                        <Badge key={idx} variant="secondary" className="text-xs">
                            {pais?.code.toUpperCase() || countryCode}
                        </Badge>
                    );
                })}
            </div>
        );
    };

    // ======================== EFEITOS ========================

    useEffect(() => {
        fetchCatalogo();
    }, [paisSelecionado, nivelEstoque, sortBy, sortOrder]);

    // Debounce para busca
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== undefined) {
                fetchCatalogo();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

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

    const renderTabela = () => (
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
                            {produtos.length} produtos encontrados
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
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
                                <TableHead className="text-muted-foreground">Países</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {produtos.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );

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

            {/* Tabela de Produtos */}
            {renderTabela()}
        </div>
    );
}

export default PrimeCODCatalogoPage;
