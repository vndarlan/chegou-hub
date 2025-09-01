// frontend/src/features/estoque/ControleEstoquePage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import {
    Package, AlertCircle, Check, X, RefreshCw, Trash2, 
    Settings, History, Plus, Building, TrendingUp, TrendingDown,
    Edit, Search, Target, Loader2, Eye, PackageOpen,
    BarChart3, AlertTriangle, ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import { getCSRFToken } from '../../utils/csrf';

// WebSocket e componentes de tempo real
import useWebSocket from '../../hooks/useWebSocket';
import SyncStatus from './components/SyncStatus';
import RealtimeNotifications from './components/RealtimeNotifications';
import { 
    useProductHighlight, 
    ProductHighlightBadge, 
    HighlightedTableRow, 
    UpdateAnimation 
} from './components/ProductHighlight';

function ControleEstoquePage() {
    // Estados principais
    const [lojas, setLojas] = useState([]);
    const [lojaSelecionada, setLojaSelecionada] = useState(null);
    const [produtos, setProdutos] = useState([]);
    const [produtosFiltrados, setProdutosFiltrados] = useState([]);
    const [searchingProdutos, setSearchingProdutos] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados modais/formulários
    const [showAddProduto, setShowAddProduto] = useState(false);
    const [showEditProduto, setShowEditProduto] = useState(false);
    const [showAjusteEstoque, setShowAjusteEstoque] = useState(false);
    const [showHistorico, setShowHistorico] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [selectedProduto, setSelectedProduto] = useState(null);
    
    // Formulários
    const [novoProduto, setNovoProduto] = useState({ 
        sku: '', 
        nome: '', 
        fornecedor: 'N1',
        estoque_inicial: 0, 
        estoque_minimo: 5
    });
    const [ajusteEstoque, setAjusteEstoque] = useState({
        tipo: 'adicionar', // 'adicionar' ou 'remover'
        quantidade: 0,
        motivo: '',
        observacoes: ''
    });
    
    // Estados de dados
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [alertas, setAlertas] = useState([]);
    const [showAlertas, setShowAlertas] = useState(true);
    
    // Estados interface
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    const [savingProduto, setSavingProduto] = useState(false);
    const [ajustandoEstoque, setAjustandoEstoque] = useState(false);
    const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);
    
    // WebSocket e tempo real
    const {
        connectionStatus,
        lastMessage,
        messageHistory,
        reconnectAttempts,
        maxReconnectAttempts
    } = useWebSocket(null, { // WebSocket desabilitado temporariamente
        shouldReconnect: true,
        reconnectInterval: 3000,
        maxReconnectAttempts: 5
    });
    
    // Sistema de destaque de produtos
    const {
        highlightProduct,
        isHighlighted,
        getHighlight,
        clearAllHighlights
    } = useProductHighlight();

    useEffect(() => {
        loadLojas();
    }, []);

    useEffect(() => {
        if (lojaSelecionada) {
            loadProdutos();
            loadAlertas();
            // Limpar destaques quando trocar de loja
            clearAllHighlights();
        }
    }, [lojaSelecionada, clearAllHighlights]);

    useEffect(() => {
        // Filtrar produtos baseado no termo de busca
        if (searchTerm.trim() === '') {
            setProdutosFiltrados(produtos);
        } else {
            const filtered = produtos.filter(produto => 
                produto.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                produto.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                produto.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setProdutosFiltrados(filtered);
        }
    }, [produtos, searchTerm]);
    
    // Handlers para notificações em tempo real
    const handleStockUpdate = async (data) => {
        // Destacar produto atualizado
        if (data.produto?.id) {
            const highlightType = data.estoque_atual > data.estoque_anterior ? 
                'stock_increase' : 'stock_decrease';
            highlightProduct(data.produto.id, highlightType, 5000);
        }
        
        // Recarregar dados
        await loadProdutos();
        await loadAlertas();
    };
    
    const handleProductUpdate = async () => {
        await loadProdutos();
        await loadAlertas();
    };
    
    const handleWebhookConfigured = () => {
        // Callback quando webhook é configurado
        console.log('Webhook configurado com sucesso');
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const loadLojas = async () => {
        try {
            const response = await axios.get('/processamento/lojas/');
            setLojas(response.data.lojas || []);
            if (response.data.lojas?.length > 0 && !lojaSelecionada) {
                setLojaSelecionada(response.data.lojas[0].id);
            }
        } catch (error) {
            console.error('Erro ao carregar lojas:', error);
            showNotification('Erro ao carregar lojas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadProdutos = async () => {
        if (!lojaSelecionada) return;
        
        setSearchingProdutos(true);
        try {
            const response = await axios.get('/estoque/produtos/', {
                params: { loja_id: lojaSelecionada }
            });
            
            if (response.data && Array.isArray(response.data)) {
                setProdutos(response.data);
                showNotification(`${response.data.length || 0} produtos carregados`);
            } else {
                showNotification(response.data.error || 'Erro ao carregar produtos', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            showNotification('Erro ao carregar produtos', 'error');
            setProdutos([]);
        } finally {
            setSearchingProdutos(false);
        }
    };

    const loadAlertas = async () => {
        if (!lojaSelecionada) return;
        
        try {
            const response = await axios.get('/estoque/alertas/', {
                params: { loja_id: lojaSelecionada }
            });
            
            if (response.data && Array.isArray(response.data)) {
                setAlertas(response.data);
            } else {
                console.error('Erro ao carregar alertas:', response.data.error);
            }
        } catch (error) {
            console.error('Erro ao carregar alertas:', error);
        }
    };

    const loadMovimentacoes = async (produtoId = null) => {
        if (!lojaSelecionada) return;
        
        setLoadingMovimentacoes(true);
        try {
            const params = { loja_id: lojaSelecionada };
            if (produtoId) params.produto_id = produtoId;
            
            const response = await axios.get('/estoque/movimentacoes/', { params });
            
            if (response.data && Array.isArray(response.data)) {
                setMovimentacoes(response.data);
            } else {
                showNotification(response.data.error || 'Erro ao carregar movimentações', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar movimentações:', error);
            showNotification('Erro ao carregar movimentações', 'error');
        } finally {
            setLoadingMovimentacoes(false);
        }
    };

    const salvarProduto = async () => {
        if (!lojaSelecionada) {
            showNotification('Selecione uma loja primeiro', 'error');
            return;
        }

        if (!novoProduto.sku || !novoProduto.nome || !novoProduto.fornecedor) {
            showNotification('SKU, nome e fornecedor são obrigatórios', 'error');
            return;
        }

        setSavingProduto(true);
        try {
            const dados = {
                ...novoProduto,
                loja_config: lojaSelecionada,
                estoque_inicial: parseInt(novoProduto.estoque_inicial) || 0,
                estoque_minimo: parseInt(novoProduto.estoque_minimo) || 5
            };

            const response = await axios.post('/estoque/produtos/', dados, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            if (response.data && response.data.id) {
                showNotification('Produto adicionado com sucesso!');
                setNovoProduto({ 
                    sku: '', 
                    nome: '', 
                    fornecedor: 'N1',
                    estoque_inicial: 0, 
                    estoque_minimo: 5
                });
                setShowAddProduto(false);
                await loadProdutos();
                await loadAlertas();
            } else {
                showNotification(response.data.error || 'Erro ao salvar produto', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            showNotification(error.response?.data?.error || 'Erro ao salvar produto', 'error');
        } finally {
            setSavingProduto(false);
        }
    };

    const editarProduto = async () => {
        if (!selectedProduto?.id) return;

        setSavingProduto(true);
        try {
            const dados = {
                sku: selectedProduto.sku,
                nome: selectedProduto.nome,
                fornecedor: selectedProduto.fornecedor,
                estoque_minimo: parseInt(selectedProduto.estoque_minimo) || 5
            };

            const response = await axios.put(`/estoque/produtos/${selectedProduto.id}/`, dados, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            if (response.data && response.data.id) {
                showNotification('Produto atualizado com sucesso!');
                setShowEditProduto(false);
                setSelectedProduto(null);
                await loadProdutos();
                await loadAlertas();
            } else {
                showNotification(response.data.error || 'Erro ao atualizar produto', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            showNotification(error.response?.data?.error || 'Erro ao atualizar produto', 'error');
        } finally {
            setSavingProduto(false);
        }
    };

    const ajustarEstoque = async () => {
        if (!selectedProduto?.id) return;

        if (!ajusteEstoque.quantidade || ajusteEstoque.quantidade <= 0) {
            showNotification('Quantidade deve ser maior que zero', 'error');
            return;
        }

        if (!ajusteEstoque.motivo.trim()) {
            showNotification('Motivo é obrigatório', 'error');
            return;
        }

        setAjustandoEstoque(true);
        try {
            const dados = {
                produto: selectedProduto.id,
                tipo_movimento: ajusteEstoque.tipo === 'adicionar' ? 'entrada' : 'saida',
                quantidade: parseInt(ajusteEstoque.quantidade),
                observacoes: `${ajusteEstoque.motivo}${ajusteEstoque.observacoes ? ': ' + ajusteEstoque.observacoes : ''}`
            };

            const response = await axios.post('/estoque/movimentacoes/', dados, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            if (response.data && response.data.id) {
                const acao = ajusteEstoque.tipo === 'adicionar' ? 'adicionado' : 'removido';
                showNotification(`Estoque ${acao} com sucesso!`);
                setAjusteEstoque({
                    tipo: 'adicionar',
                    quantidade: 0,
                    motivo: '',
                    observacoes: ''
                });
                setShowAjusteEstoque(false);
                setSelectedProduto(null);
                await loadProdutos();
                await loadAlertas();
            } else {
                showNotification(response.data.error || 'Erro ao ajustar estoque', 'error');
            }
        } catch (error) {
            console.error('Erro ao ajustar estoque:', error);
            showNotification(error.response?.data?.error || 'Erro ao ajustar estoque', 'error');
        } finally {
            setAjustandoEstoque(false);
        }
    };

    const deletarProduto = async (produto) => {
        if (!window.confirm(`Tem certeza que deseja deletar o produto "${produto.nome}"?`)) {
            return;
        }

        try {
            const response = await axios.delete(`/estoque/produtos/${produto.id}/`, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            if (response.status === 204) {
                showNotification('Produto deletado com sucesso!');
                await loadProdutos();
                await loadAlertas();
            } else {
                showNotification(response.data.error || 'Erro ao deletar produto', 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar produto:', error);
            showNotification(error.response?.data?.error || 'Erro ao deletar produto', 'error');
        }
    };

    const openEditProduto = (produto) => {
        setSelectedProduto({ ...produto });
        setShowEditProduto(true);
    };

    const openAjusteEstoque = (produto) => {
        setSelectedProduto(produto);
        setShowAjusteEstoque(true);
    };

    const openHistorico = (produto = null) => {
        setSelectedProduto(produto);
        setShowHistorico(true);
        loadMovimentacoes(produto?.id);
    };

    const getStatusEstoque = (produto) => {
        const atual = produto.estoque_atual || 0;
        const minimo = produto.estoque_minimo || 0;
        
        if (atual <= 0) {
            return { status: 'Sem Estoque', variant: 'destructive', icon: AlertTriangle };
        } else if (atual <= minimo) {
            return { status: 'Estoque Baixo', variant: 'secondary', icon: AlertCircle };
        } else if (atual <= minimo * 2) {
            return { status: 'Estoque Médio', variant: 'outline', icon: Package };
        } else {
            return { status: 'Estoque Normal', variant: 'default', icon: Check };
        }
    };


    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getFornecedorBadge = (fornecedor) => {
        const fornecedorMap = {
            'Dropi': { variant: 'default', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
            'PrimeCod': { variant: 'default', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
            'Ecomhub': { variant: 'default', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
            'N1': { variant: 'default', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' }
        };
        return fornecedorMap[fornecedor] || { variant: 'outline', className: '' };
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
            {/* Notification */}
            {notification && (
                <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className="mb-4">
                    {notification.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <AlertDescription>{notification.message}</AlertDescription>
                </Alert>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Package className="h-6 w-6 text-primary" />
                        Controle de Estoque
                        {connectionStatus === 'Open' && (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <Zap className="h-3 w-3 mr-1" />
                                Tempo Real
                            </Badge>
                        )}
                    </h1>
                    <p className="text-muted-foreground">
                        Gestão completa do estoque de produtos
                        {connectionStatus === 'Open' && ' - Sincronização automática ativa'}
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={lojaSelecionada?.toString()} onValueChange={(value) => setLojaSelecionada(parseInt(value))}>
                        <SelectTrigger className="w-full sm:w-48 bg-background border-input text-foreground">
                            <Building className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Selecionar loja" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                            {lojas.map(loja => (
                                <SelectItem key={loja.id} value={loja.id.toString()} className="text-foreground hover:bg-accent">
                                    {loja.nome_loja}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Dialog open={showAddProduto} onOpenChange={setShowAddProduto}>
                        <DialogTrigger asChild>
                            <Button variant="default">
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Produto
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-background border-border max-w-[95vw] sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">Adicionar Novo Produto</DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                    Cadastre um novo produto no estoque
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="sku" className="text-foreground">SKU *</Label>
                                        <Input
                                            id="sku"
                                            placeholder="Ex: PROD-001"
                                            value={novoProduto.sku}
                                            onChange={(e) => setNovoProduto(prev => ({ ...prev, sku: e.target.value }))}
                                            className="bg-background border-input text-foreground"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="nome" className="text-foreground">Nome do Produto *</Label>
                                        <Input
                                            id="nome"
                                            placeholder="Ex: Camiseta Branca"
                                            value={novoProduto.nome}
                                            onChange={(e) => setNovoProduto(prev => ({ ...prev, nome: e.target.value }))}
                                            className="bg-background border-input text-foreground"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <Label htmlFor="fornecedor" className="text-foreground">Fornecedor *</Label>
                                    <Select value={novoProduto.fornecedor} onValueChange={(value) => setNovoProduto(prev => ({ ...prev, fornecedor: value }))}>
                                        <SelectTrigger className="bg-background border-input text-foreground">
                                            <SelectValue placeholder="Selecione o fornecedor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Dropi">Dropi</SelectItem>
                                            <SelectItem value="PrimeCod">PrimeCod</SelectItem>
                                            <SelectItem value="Ecomhub">Ecomhub</SelectItem>
                                            <SelectItem value="N1">N1</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="estoque_inicial" className="text-foreground">Estoque Inicial</Label>
                                        <Input
                                            id="estoque_inicial"
                                            type="number"
                                            min="0"
                                            value={novoProduto.estoque_inicial}
                                            onChange={(e) => setNovoProduto(prev => ({ ...prev, estoque_inicial: e.target.value }))}
                                            className="bg-background border-input text-foreground"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="estoque_minimo" className="text-foreground">Estoque Mínimo</Label>
                                        <Input
                                            id="estoque_minimo"
                                            type="number"
                                            min="0"
                                            value={novoProduto.estoque_minimo}
                                            onChange={(e) => setNovoProduto(prev => ({ ...prev, estoque_minimo: e.target.value }))}
                                            className="bg-background border-input text-foreground"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-2 pt-4">
                                    <Button variant="outline" onClick={() => setShowAddProduto(false)}>
                                        Cancelar
                                    </Button>
                                    <Button onClick={salvarProduto} disabled={savingProduto}>
                                        {savingProduto ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                        Salvar Produto
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    
                    <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] bg-background border-border">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">Instruções - Controle de Estoque</DialogTitle>
                                <DialogDescription className="text-muted-foreground">Como utilizar o sistema de controle de estoque</DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[70vh] pr-4">
                                <div className="space-y-6">
                                    <Card className="bg-card border-border">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-foreground">Funcionalidades Principais</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">1. Cadastro de Produtos</h4>
                                                <p className="text-sm text-muted-foreground">Adicione produtos com SKU, nome, estoque inicial e mínimo</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">2. Ajustes de Estoque</h4>
                                                <p className="text-sm text-muted-foreground">Adicione ou remova quantidades com motivos de movimentação</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">3. Alertas Automáticos</h4>
                                                <p className="text-sm text-muted-foreground">Receba alertas quando produtos atingem estoque mínimo</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">4. Histórico Completo</h4>
                                                <p className="text-sm text-muted-foreground">Visualize todas as movimentações de estoque por produto</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card className="bg-card border-border">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-foreground">Status de Estoque</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="destructive">Sem Estoque</Badge>
                                                <span className="text-sm text-muted-foreground">Quantidade igual a 0</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="secondary">Estoque Baixo</Badge>
                                                <span className="text-sm text-muted-foreground">Quantidade menor ou igual ao mínimo</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline">Estoque Médio</Badge>
                                                <span className="text-sm text-muted-foreground">Quantidade até 2x o mínimo</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="default">Estoque Normal</Badge>
                                                <span className="text-sm text-muted-foreground">Quantidade acima de 2x o mínimo</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    
                    <Button variant="outline" size="icon" onClick={() => openHistorico()}>
                        <History className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Notificações em Tempo Real */}
            <RealtimeNotifications 
                lastMessage={lastMessage}
                onStockUpdate={handleStockUpdate}
                onProductUpdate={handleProductUpdate}
            />

            {/* Status de Sincronização */}
            <SyncStatus 
                connectionStatus={connectionStatus}
                lastMessage={lastMessage}
                messageHistory={messageHistory}
                reconnectAttempts={reconnectAttempts}
                maxReconnectAttempts={maxReconnectAttempts}
                lojaSelecionada={lojaSelecionada}
                lojas={lojas}
                onConfigWebhook={handleWebhookConfigured}
            />

            {/* Alertas de Estoque Baixo */}
            {alertas.length > 0 && (
                <Collapsible open={showAlertas} onOpenChange={setShowAlertas}>
                    <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                        <CollapsibleTrigger className="w-full">
                            <CardHeader className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                        <CardTitle className="text-red-700 dark:text-red-300">
                                            Alertas de Estoque ({alertas.length})
                                        </CardTitle>
                                    </div>
                                    {showAlertas ? <ChevronUp className="h-4 w-4 text-red-600" /> : <ChevronDown className="h-4 w-4 text-red-600" />}
                                </div>
                                <CardDescription className="text-red-600 dark:text-red-400 text-left">
                                    Produtos com estoque baixo ou zerado
                                </CardDescription>
                            </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent className="pt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {alertas.map((alerta, index) => {
                                        const statusInfo = getStatusEstoque(alerta);
                                        return (
                                            <div key={`alerta-${alerta.id || index}`} 
                                                 className="p-3 bg-white dark:bg-red-950/10 rounded border border-red-200 dark:border-red-800">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-sm text-foreground">{alerta.nome}</span>
                                                    <Badge variant={statusInfo.variant} className="text-xs">
                                                        {statusInfo.status}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground space-y-1">
                                                    <p>SKU: {alerta.sku}</p>
                                                    <p>Atual: {alerta.estoque_atual} | Mínimo: {alerta.estoque_minimo}</p>
                                                </div>
                                                <div className="flex gap-1 mt-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => openAjusteEstoque(alerta)}
                                                        className="text-xs h-6"
                                                    >
                                                        <TrendingUp className="h-3 w-3 mr-1" />
                                                        Ajustar
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>
            )}

            {/* Área Principal - Produtos */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-foreground">Produtos em Estoque</CardTitle>
                            <CardDescription className="text-muted-foreground">
                                {produtosFiltrados.length > 0 
                                    ? `${produtosFiltrados.length} produtos${searchTerm ? ' (filtrados)' : ''}`
                                    : 'Nenhum produto encontrado'
                                }
                            </CardDescription>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por SKU, nome ou fornecedor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-64 h-8 bg-background border-input text-foreground"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadProdutos}
                                disabled={searchingProdutos}
                                className={connectionStatus === 'Open' ? 'border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/20' : ''}
                            >
                                {searchingProdutos ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                {connectionStatus === 'Open' ? 'Atualizar' : 'Atualizar'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent>
                    {!lojaSelecionada && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-foreground">Selecione uma loja no header para visualizar produtos</AlertDescription>
                        </Alert>
                    )}

                    {searchingProdutos && (
                        <div className="flex items-center justify-center py-8 space-y-3">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span className="text-muted-foreground">Carregando produtos...</span>
                            </div>
                        </div>
                    )}

                    {produtosFiltrados.length === 0 && !searchingProdutos ? (
                        <div className="text-center py-12">
                            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Nenhum produto encontrado</p>
                            <p className="text-sm text-muted-foreground">
                                {searchTerm ? 'Tente ajustar os filtros de busca' : 'Adicione produtos para começar'}
                            </p>
                        </div>
                    ) : produtosFiltrados.length > 0 ? (
                        <div className="w-full max-w-[calc(100vw-280px)] overflow-x-auto">
                            <div className="rounded-md border border-border" style={{ minWidth: '900px' }}>
                                <Table className="w-full">
                                    <TableHeader>
                                        <TableRow className="border-border">
                                            <TableHead className="text-foreground">Produto</TableHead>
                                            <TableHead className="text-foreground text-center">Fornecedor</TableHead>
                                            <TableHead className="text-foreground text-center">Estoque</TableHead>
                                            <TableHead className="text-foreground text-center">Status</TableHead>
                                            <TableHead className="text-right text-foreground">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {produtosFiltrados.map((produto, index) => {
                                            const statusInfo = getStatusEstoque(produto);
                                            const StatusIcon = statusInfo.icon;
                                            const highlight = isHighlighted(produto.id) ? getHighlight(produto.id) : null;
                                            
                                            return (
                                                <HighlightedTableRow 
                                                    key={produto.id || index} 
                                                    className="border-border hover:bg-muted/50"
                                                    highlight={highlight}
                                                >
                                                    <TableCell>
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                                                statusInfo.variant === 'destructive' ? 'bg-red-100 dark:bg-red-900/30' :
                                                                statusInfo.variant === 'secondary' ? 'bg-amber-100 dark:bg-amber-900/30' :
                                                                'bg-primary/10'
                                                            }`}>
                                                                <StatusIcon className={`h-4 w-4 ${
                                                                    statusInfo.variant === 'destructive' ? 'text-red-600 dark:text-red-400' :
                                                                    statusInfo.variant === 'secondary' ? 'text-amber-600 dark:text-amber-400' :
                                                                    'text-primary'
                                                                }`} />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm text-foreground">{produto.nome}</p>
                                                                <p className="text-xs text-muted-foreground font-mono">SKU: {produto.sku}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge 
                                                            variant={getFornecedorBadge(produto.fornecedor).variant}
                                                            className={`text-xs ${getFornecedorBadge(produto.fornecedor).className}`}
                                                        >
                                                            {produto.fornecedor || 'N/A'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="space-y-1">
                                                            <Badge variant="outline" className="font-mono">
                                                                {produto.estoque_atual || 0}
                                                            </Badge>
                                                            <p className="text-xs text-muted-foreground">
                                                                Min: {produto.estoque_minimo || 0}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Badge variant={statusInfo.variant} className="text-xs">
                                                                {statusInfo.status}
                                                            </Badge>
                                                            <ProductHighlightBadge 
                                                                productId={produto.id} 
                                                                highlight={highlight} 
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openHistorico(produto)}
                                                                className="text-xs"
                                                            >
                                                                <Eye className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openEditProduto(produto)}
                                                                className="text-xs"
                                                            >
                                                                <Edit className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openAjusteEstoque(produto)}
                                                                className="text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                                                            >
                                                                <BarChart3 className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => deletarProduto(produto)}
                                                                className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </HighlightedTableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {/* Modal de Edição de Produto */}
            <Dialog open={showEditProduto} onOpenChange={setShowEditProduto}>
                <DialogContent className="bg-background border-border max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Editar Produto</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Altere as informações do produto
                        </DialogDescription>
                    </DialogHeader>
                    {selectedProduto && (
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="edit-sku" className="text-foreground">SKU</Label>
                                    <Input
                                        id="edit-sku"
                                        value={selectedProduto.sku}
                                        onChange={(e) => setSelectedProduto(prev => ({ ...prev, sku: e.target.value }))}
                                        className="bg-background border-input text-foreground"
                                        disabled
                                    />
                                    <p className="text-xs text-muted-foreground">SKU não pode ser alterado</p>
                                </div>
                                <div>
                                    <Label htmlFor="edit-nome" className="text-foreground">Nome do Produto</Label>
                                    <Input
                                        id="edit-nome"
                                        value={selectedProduto.nome}
                                        onChange={(e) => setSelectedProduto(prev => ({ ...prev, nome: e.target.value }))}
                                        className="bg-background border-input text-foreground"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <Label htmlFor="edit-fornecedor" className="text-foreground">Fornecedor</Label>
                                <Select value={selectedProduto.fornecedor} onValueChange={(value) => setSelectedProduto(prev => ({ ...prev, fornecedor: value }))}>
                                    <SelectTrigger className="bg-background border-input text-foreground">
                                        <SelectValue placeholder="Selecione o fornecedor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Dropi">Dropi</SelectItem>
                                        <SelectItem value="PrimeCod">PrimeCod</SelectItem>
                                        <SelectItem value="Ecomhub">Ecomhub</SelectItem>
                                        <SelectItem value="N1">N1</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div>
                                <Label htmlFor="edit-estoque-minimo" className="text-foreground">Estoque Mínimo</Label>
                                <Input
                                    id="edit-estoque-minimo"
                                    type="number"
                                    min="0"
                                    value={selectedProduto.estoque_minimo}
                                    onChange={(e) => setSelectedProduto(prev => ({ ...prev, estoque_minimo: e.target.value }))}
                                    className="bg-background border-input text-foreground"
                                />
                            </div>
                            
                            <Alert className="bg-muted/30 border-border">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-foreground text-sm">
                                    <strong>Estoque atual:</strong> {selectedProduto.estoque_atual || 0} unidades
                                    <br />
                                    Para alterar o estoque, use a função "Ajustar Estoque"
                                </AlertDescription>
                            </Alert>

                            <div className="flex justify-end space-x-2 pt-4">
                                <Button variant="outline" onClick={() => setShowEditProduto(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={editarProduto} disabled={savingProduto}>
                                    {savingProduto ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                    Salvar Alterações
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Ajuste de Estoque */}
            <Dialog open={showAjusteEstoque} onOpenChange={setShowAjusteEstoque}>
                <DialogContent className="bg-background border-border max-w-[95vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Ajustar Estoque</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            {selectedProduto && `${selectedProduto.nome} (SKU: ${selectedProduto.sku})`}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedProduto && (
                        <div className="space-y-4">
                            <Alert className="bg-muted/30 border-border">
                                <PackageOpen className="h-4 w-4" />
                                <AlertDescription className="text-foreground">
                                    <strong>Estoque atual:</strong> {selectedProduto.estoque_atual || 0} unidades
                                </AlertDescription>
                            </Alert>
                            
                            <div>
                                <Label className="text-foreground">Tipo de Movimentação</Label>
                                <Select value={ajusteEstoque.tipo} onValueChange={(value) => setAjusteEstoque(prev => ({ ...prev, tipo: value }))}>
                                    <SelectTrigger className="bg-background border-input text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="adicionar">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                                Adicionar ao Estoque
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="remover">
                                            <div className="flex items-center gap-2">
                                                <TrendingDown className="h-4 w-4 text-red-600" />
                                                Remover do Estoque
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div>
                                <Label htmlFor="quantidade" className="text-foreground">Quantidade *</Label>
                                <Input
                                    id="quantidade"
                                    type="number"
                                    min="1"
                                    value={ajusteEstoque.quantidade}
                                    onChange={(e) => setAjusteEstoque(prev => ({ ...prev, quantidade: e.target.value }))}
                                    className="bg-background border-input text-foreground"
                                />
                            </div>
                            
                            <div>
                                <Label htmlFor="motivo" className="text-foreground">Motivo *</Label>
                                <Select value={ajusteEstoque.motivo} onValueChange={(value) => setAjusteEstoque(prev => ({ ...prev, motivo: value }))}>
                                    <SelectTrigger className="bg-background border-input text-foreground">
                                        <SelectValue placeholder="Selecione o motivo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ajusteEstoque.tipo === 'adicionar' ? (
                                            <>
                                                <SelectItem value="Compra">Compra</SelectItem>
                                                <SelectItem value="Devolução">Devolução de Cliente</SelectItem>
                                                <SelectItem value="Ajuste de Inventário">Ajuste de Inventário</SelectItem>
                                                <SelectItem value="Transferência">Transferência de Loja</SelectItem>
                                                <SelectItem value="Outro">Outro</SelectItem>
                                            </>
                                        ) : (
                                            <>
                                                <SelectItem value="Venda">Venda</SelectItem>
                                                <SelectItem value="Avaria">Avaria/Defeito</SelectItem>
                                                <SelectItem value="Perda">Perda</SelectItem>
                                                <SelectItem value="Ajuste de Inventário">Ajuste de Inventário</SelectItem>
                                                <SelectItem value="Transferência">Transferência para Loja</SelectItem>
                                                <SelectItem value="Outro">Outro</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div>
                                <Label htmlFor="observacoes" className="text-foreground">Observações</Label>
                                <Textarea
                                    id="observacoes"
                                    placeholder="Observações adicionais (opcional)"
                                    value={ajusteEstoque.observacoes}
                                    onChange={(e) => setAjusteEstoque(prev => ({ ...prev, observacoes: e.target.value }))}
                                    className="bg-background border-input text-foreground"
                                    rows={2}
                                />
                            </div>
                            
                            {ajusteEstoque.quantidade > 0 && ajusteEstoque.tipo && (
                                <Alert className={`${ajusteEstoque.tipo === 'adicionar' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
                                    <AlertDescription className="text-foreground">
                                        <strong>Resultado:</strong> {selectedProduto.estoque_atual || 0} {ajusteEstoque.tipo === 'adicionar' ? '+' : '-'} {ajusteEstoque.quantidade} = {
                                            ajusteEstoque.tipo === 'adicionar' 
                                                ? (selectedProduto.estoque_atual || 0) + parseInt(ajusteEstoque.quantidade || 0)
                                                : (selectedProduto.estoque_atual || 0) - parseInt(ajusteEstoque.quantidade || 0)
                                        } unidades
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="flex justify-end space-x-2 pt-4">
                                <Button variant="outline" onClick={() => setShowAjusteEstoque(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={ajustarEstoque} disabled={ajustandoEstoque}>
                                    {ajustandoEstoque ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 
                                     ajusteEstoque.tipo === 'adicionar' ? <TrendingUp className="h-4 w-4 mr-2" /> : <TrendingDown className="h-4 w-4 mr-2" />}
                                    {ajusteEstoque.tipo === 'adicionar' ? 'Adicionar' : 'Remover'} Estoque
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Histórico de Movimentações */}
            <Dialog open={showHistorico} onOpenChange={setShowHistorico}>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] bg-background border-border">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center space-x-2 text-foreground">
                                <History className="h-5 w-5" />
                                <span>Histórico de Movimentações</span>
                                {selectedProduto && <Badge variant="outline">{selectedProduto.nome}</Badge>}
                            </DialogTitle>
                            <Button variant="outline" size="sm" onClick={() => loadMovimentacoes(selectedProduto?.id)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Atualizar
                            </Button>
                        </div>
                    </DialogHeader>
                    <div>
                        {loadingMovimentacoes ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-foreground" />
                                <span className="ml-2 text-muted-foreground">Carregando movimentações...</span>
                            </div>
                        ) : movimentacoes.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">Nenhuma movimentação encontrada</p>
                        ) : (
                            <ScrollArea className="h-96">
                                <div className="space-y-3">
                                    {movimentacoes.map((mov) => (
                                        <div key={mov.id} className="p-3 border border-border rounded-lg bg-card">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    {mov.tipo === 'adicionar' ? 
                                                        <TrendingUp className="h-4 w-4 text-green-600" /> : 
                                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                                    }
                                                    <span className="font-medium text-sm text-foreground">{mov.motivo}</span>
                                                    <Badge variant={mov.tipo === 'adicionar' ? 'default' : 'secondary'}>
                                                        {mov.tipo === 'adicionar' ? '+' : '-'}{mov.quantidade}
                                                    </Badge>
                                                    {mov.produto_nome && (
                                                        <span className="text-sm text-muted-foreground">• {mov.produto_nome}</span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDate(mov.data_movimentacao)}
                                                </span>
                                            </div>
                                            
                                            <div className="flex space-x-4 text-xs text-muted-foreground">
                                                {mov.estoque_anterior !== undefined && (
                                                    <span>Anterior: {mov.estoque_anterior}</span>
                                                )}
                                                {mov.estoque_posterior !== undefined && (
                                                    <span>Posterior: {mov.estoque_posterior}</span>
                                                )}
                                                {mov.observacoes && (
                                                    <span>Obs: {mov.observacoes}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default ControleEstoquePage;