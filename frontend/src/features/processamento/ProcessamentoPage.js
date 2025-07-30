// frontend/src/features/processamento/ProcessamentoPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Checkbox } from '../../components/ui/checkbox';
import { Avatar, AvatarFallback } from '../../components/ui';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
    ShoppingCart, AlertCircle, Check, X, RefreshCw, Trash2, 
    Settings, History, Plus, Building, Cloud, CloudOff, 
    Book, Search, Target, Loader2
} from 'lucide-react';

function ProcessamentoPage() {
    // Estados principais
    const [lojas, setLojas] = useState([]);
    const [lojaSelecionada, setLojaSelecionada] = useState(null);
    const [duplicates, setDuplicates] = useState([]);
    const [searchingDuplicates, setSearchingDuplicates] = useState(false);
    const [cancellingOrder, setCancellingOrder] = useState(null);
    const [cancellingBatch, setCancellingBatch] = useState(false);
    const [selectedDuplicates, setSelectedDuplicates] = useState([]);
    
    // Estados modais/configuração
    const [showAddStore, setShowAddStore] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [newStore, setNewStore] = useState({ nome_loja: '', shop_url: '', access_token: '' });
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionResult, setConnectionResult] = useState(null);
    
    // Estados interface
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    const [confirmBatchModal, setConfirmBatchModal] = useState(false);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        loadLojas();
    }, []);

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
        } finally {
            setLoading(false);
        }
    };

    const testConnection = async () => {
        if (!newStore.shop_url || !newStore.access_token) {
            showNotification('Preencha URL da loja e token', 'error');
            return;
        }

        setTestingConnection(true);
        setConnectionResult(null);

        try {
            const response = await axios.post('/processamento/test-connection/', {
                shop_url: newStore.shop_url,
                access_token: newStore.access_token
            });
            setConnectionResult(response.data);
        } catch (error) {
            setConnectionResult({
                success: false,
                message: error.response?.data?.error || 'Erro na conexão'
            });
        } finally {
            setTestingConnection(false);
        }
    };

    const addStore = async () => {
        if (!newStore.nome_loja || !newStore.shop_url || !newStore.access_token) {
            showNotification('Preencha todos os campos', 'error');
            return;
        }

        try {
            const response = await axios.post('/processamento/lojas/', newStore);
            showNotification(response.data.message);
            setNewStore({ nome_loja: '', shop_url: '', access_token: '' });
            setConnectionResult(null);
            setShowAddStore(false);
            loadLojas();
        } catch (error) {
            showNotification(error.response?.data?.error || 'Erro ao adicionar loja', 'error');
        }
    };

    const searchDuplicates = async () => {
        if (!lojaSelecionada) {
            showNotification('Selecione uma loja primeiro', 'error');
            return;
        }

        setSearchingDuplicates(true);
        setDuplicates([]);
        setSelectedDuplicates([]);

        try {
            const response = await axios.post('/processamento/buscar-duplicatas/', {
                loja_id: lojaSelecionada
            });
            setDuplicates(response.data.duplicates || []);
            showNotification(`${response.data.count} duplicatas encontradas`);
        } catch (error) {
            showNotification(error.response?.data?.error || 'Erro na busca', 'error');
        } finally {
            setSearchingDuplicates(false);
        }
    };

    const cancelOrder = async (duplicate) => {
        setCancellingOrder(duplicate.duplicate_order.id);

        try {
            const response = await axios.post('/processamento/cancelar-pedido/', {
                loja_id: lojaSelecionada,
                order_id: duplicate.duplicate_order.id,
                order_number: duplicate.duplicate_order.number
            });

            if (response.data.success) {
                showNotification(`Pedido #${duplicate.duplicate_order.number} cancelado!`);
                setDuplicates(prev => prev.filter(d => d.duplicate_order.id !== duplicate.duplicate_order.id));
                setSelectedDuplicates(prev => prev.filter(id => id !== duplicate.duplicate_order.id));
            } else {
                showNotification(response.data.message, 'error');
            }
        } catch (error) {
            showNotification(error.response?.data?.error || 'Erro ao cancelar', 'error');
        } finally {
            setCancellingOrder(null);
        }
    };

    const cancelSelected = async () => {
        if (selectedDuplicates.length === 0) return;

        setCancellingBatch(true);
        setConfirmBatchModal(false);

        try {
            const response = await axios.post('/processamento/cancelar-lote/', {
                loja_id: lojaSelecionada,
                order_ids: selectedDuplicates
            });

            showNotification(`${response.data.success_count}/${response.data.total_count} pedidos cancelados`);
            setDuplicates(prev => prev.filter(d => !selectedDuplicates.includes(d.duplicate_order.id)));
            setSelectedDuplicates([]);
        } catch (error) {
            showNotification(error.response?.data?.error || 'Erro no cancelamento em lote', 'error');
        } finally {
            setCancellingBatch(false);
        }
    };

    const loadLogs = async () => {
        try {
            const url = lojaSelecionada 
                ? `/processamento/historico-logs/?loja_id=${lojaSelecionada}`
                : '/processamento/historico-logs/';
            const response = await axios.get(url);
            setLogs(response.data.logs || []);
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
        }
    };

    const toggleDuplicateSelection = (duplicateId) => {
        setSelectedDuplicates(prev => 
            prev.includes(duplicateId) 
                ? prev.filter(id => id !== duplicateId)
                : [...prev, duplicateId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedDuplicates.length === duplicates.length) {
            setSelectedDuplicates([]);
        } else {
            setSelectedDuplicates(duplicates.map(d => d.duplicate_order.id));
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 space-y-6">
            {/* Notification */}
            {notification && (
                <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className="mb-4">
                    {notification.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <AlertDescription>{notification.message}</AlertDescription>
                </Alert>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <ShoppingCart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Shopify Duplicados</h1>
                        <p className="text-muted-foreground">Gerenciamento de pedidos duplicados</p>
                    </div>
                </div>
                
                <div className="flex items-center space-x-2">
                    <Select value={lojaSelecionada?.toString()} onValueChange={(value) => setLojaSelecionada(parseInt(value))}>
                        <SelectTrigger className="w-48">
                            <Building className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Selecionar loja" />
                        </SelectTrigger>
                        <SelectContent>
                            {lojas.map(loja => (
                                <SelectItem key={loja.id} value={loja.id.toString()}>
                                    {loja.nome_loja}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Dialog open={showAddStore} onOpenChange={setShowAddStore}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adicionar Nova Loja</DialogTitle>
                                <DialogDescription>Configure uma nova integração Shopify</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="nome">Nome da Loja</Label>
                                    <Input
                                        id="nome"
                                        placeholder="Ex: Loja Principal"
                                        value={newStore.nome_loja}
                                        onChange={(e) => setNewStore(prev => ({ ...prev, nome_loja: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="url">URL da Loja</Label>
                                    <Input
                                        id="url"
                                        placeholder="minha-loja.myshopify.com"
                                        value={newStore.shop_url}
                                        onChange={(e) => setNewStore(prev => ({ ...prev, shop_url: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="token">Access Token</Label>
                                    <Input
                                        id="token"
                                        type="password"
                                        placeholder="Token de acesso da API"
                                        value={newStore.access_token}
                                        onChange={(e) => setNewStore(prev => ({ ...prev, access_token: e.target.value }))}
                                    />
                                </div>

                                <div className="flex space-x-2">
                                    <Button
                                        variant="outline"
                                        onClick={testConnection}
                                        disabled={testingConnection}
                                    >
                                        {testingConnection ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Cloud className="h-4 w-4 mr-2" />}
                                        Testar Conexão
                                    </Button>
                                    <Button
                                        onClick={addStore}
                                        disabled={!connectionResult?.success}
                                    >
                                        <Check className="h-4 w-4 mr-2" />
                                        Adicionar Loja
                                    </Button>
                                </div>

                                {connectionResult && (
                                    <Alert variant={connectionResult.success ? 'default' : 'destructive'}>
                                        {connectionResult.success ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
                                        <AlertDescription>{connectionResult.message}</AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                    
                    <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Configurações & Lógica</DialogTitle>
                                <DialogDescription>Instruções de configuração e lógica de detecção</DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="config">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="config">Configuração Shopify</TabsTrigger>
                                    <TabsTrigger value="logic">Lógica de Detecção</TabsTrigger>
                                </TabsList>
                                <TabsContent value="config" className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="p-3 bg-muted rounded-lg">
                                            <h4 className="font-semibold text-sm">1. Criar App Privado</h4>
                                            <p className="text-sm text-muted-foreground">Acesse sua loja → Settings → Apps → Develop apps → Create an app</p>
                                        </div>
                                        <div className="p-3 bg-muted rounded-lg">
                                            <h4 className="font-semibold text-sm">2. Configurar Permissões</h4>
                                            <p className="text-sm text-muted-foreground">Adicione: read_orders, write_orders, read_products, read_customers</p>
                                        </div>
                                        <div className="p-3 bg-muted rounded-lg">
                                            <h4 className="font-semibold text-sm">3. Gerar Token</h4>
                                            <p className="text-sm text-muted-foreground">Install app → Copie o Admin API access token</p>
                                        </div>
                                    </div>
                                </TabsContent>
                                <TabsContent value="logic" className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-green-700 mb-2">✅ DETECTA DUPLICATA quando:</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                                            <li>• Mesmo cliente (telefone normalizado)</li>
                                            <li>• Mesmo produto (Product ID)</li>
                                            <li>• Intervalo ≤ 30 dias entre pedidos</li>
                                            <li>• Pedido original: <strong>PROCESSADO</strong> (tem tags "order sent to dropi" ou "dropi sync error")</li>
                                            <li>• Pedido duplicado: <strong>NÃO PROCESSADO</strong> (sem tags do Dropi)</li>
                                        </ul>
                                    </div>
                                    
                                    <Separator />
                                    
                                    <div>
                                        <h4 className="font-semibold text-red-700 mb-2">❌ NÃO detecta quando:</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                                            <li>• Ambos pedidos não têm tags (ambos não processados)</li>
                                            <li>• Produtos diferentes</li>
                                            <li>• Clientes diferentes (telefones diferentes)</li>
                                            <li>• Intervalo , 30 dias</li>
                                        </ul>
                                    </div>
                                    
                                    <Alert>
                                        <AlertDescription>
                                            <strong>Objetivo:</strong> Cancelar apenas pedidos duplicados não processados de produtos já enviados/processados anteriormente.
                                        </AlertDescription>
                                    </Alert>
                                </TabsContent>
                            </Tabs>
                        </DialogContent>
                    </Dialog>
                    
                    <Button variant="outline" size="icon" onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadLogs(); }}>
                        <History className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Área Principal */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center space-x-2">
                                <Target className="h-5 w-5" />
                                <span>Pedidos Duplicados</span>
                            </CardTitle>
                            <CardDescription>Detecte e gerencie pedidos duplicados automaticamente</CardDescription>
                        </div>
                        
                        <div className="flex space-x-2">
                            <Button
                                onClick={searchDuplicates}
                                disabled={searchingDuplicates || !lojaSelecionada}
                            >
                                {searchingDuplicates ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                                Buscar Duplicatas
                            </Button>
                            
                            {selectedDuplicates.length > 0 && (
                                <Dialog open={confirmBatchModal} onOpenChange={setConfirmBatchModal}>
                                    <DialogTrigger asChild>
                                        <Button variant="destructive" disabled={cancellingBatch}>
                                            {cancellingBatch ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                            Cancelar Selecionados ({selectedDuplicates.length})
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Confirmar Cancelamento</DialogTitle>
                                            <DialogDescription>
                                                Esta ação cancelará {selectedDuplicates.length} pedidos selecionados. Esta operação não pode ser desfeita.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="flex justify-end space-x-2">
                                            <Button variant="outline" onClick={() => setConfirmBatchModal(false)}>
                                                Cancelar
                                            </Button>
                                            <Button variant="destructive" onClick={cancelSelected}>
                                                Confirmar Cancelamento
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent>
                    {!lojaSelecionada && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>Selecione uma loja no header para buscar pedidos duplicados</AlertDescription>
                        </Alert>
                    )}

                    {searchingDuplicates && (
                        <div className="space-y-2 mb-4">
                            <p className="text-sm text-muted-foreground">Analisando pedidos...</p>
                            <Progress value={100} className="w-full animate-pulse" />
                        </div>
                    )}

                    {duplicates.length === 0 && !searchingDuplicates ? (
                        <div className="text-center py-12">
                            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Nenhuma duplicata encontrada</p>
                            <p className="text-sm text-muted-foreground">Execute uma busca para detectar pedidos duplicados</p>
                        </div>
                    ) : duplicates.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox 
                                                checked={selectedDuplicates.length === duplicates.length}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Pedido Original</TableHead>
                                        <TableHead>Duplicata</TableHead>
                                        <TableHead>Produtos</TableHead>
                                        <TableHead>Intervalo</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {duplicates.map((duplicate, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Checkbox 
                                                    checked={selectedDuplicates.includes(duplicate.duplicate_order.id)}
                                                    onCheckedChange={() => toggleDuplicateSelection(duplicate.duplicate_order.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback className="text-xs">{duplicate.customer_name?.charAt(0) || 'U'}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-sm">{duplicate.customer_name}</p>
                                                        <p className="text-xs text-muted-foreground">{duplicate.customer_phone}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-sm">#{duplicate.first_order.number}</p>
                                                    <p className="text-xs text-muted-foreground">{duplicate.first_order.date}</p>
                                                    <p className="text-xs text-green-700">{duplicate.first_order.total}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-sm">#{duplicate.duplicate_order.number}</p>
                                                    <p className="text-xs text-muted-foreground">{duplicate.duplicate_order.date}</p>
                                                    <p className="text-xs text-red-700">{duplicate.duplicate_order.total}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-xs text-muted-foreground truncate max-w-32">
                                                    {duplicate.product_names?.join(', ') || 'N/A'}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={duplicate.days_between <= 7 ? 'destructive' : duplicate.days_between <= 15 ? 'secondary' : 'outline'}>
                                                    {duplicate.days_between} dias
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => cancelOrder(duplicate)}
                                                    disabled={cancellingOrder === duplicate.duplicate_order.id}
                                                >
                                                    {cancellingOrder === duplicate.duplicate_order.id ? 
                                                        <Loader2 className="h-4 w-4 animate-spin" /> : 
                                                        <Trash2 className="h-4 w-4" />
                                                    }
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {/* Histórico */}
            {showHistory && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center space-x-2">
                                <History className="h-5 w-5" />
                                <span>Histórico de Operações</span>
                            </CardTitle>
                            <Button variant="outline" size="sm" onClick={loadLogs}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Atualizar
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {logs.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">Nenhum histórico encontrado</p>
                        ) : (
                            <ScrollArea className="h-96">
                                <div className="space-y-3">
                                    {logs.map((log) => (
                                        <div key={log.id} className="p-3 border rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    {log.status === 'Sucesso' ? <Check className="h-4 w-4 text-green-600" /> : 
                                                     log.status === 'Erro' ? <X className="h-4 w-4 text-red-600" /> : 
                                                     <AlertCircle className="h-4 w-4 text-orange-600" />}
                                                    <span className="font-medium text-sm">{log.tipo}</span>
                                                    <Badge variant={log.status === 'Sucesso' ? 'default' : log.status === 'Erro' ? 'destructive' : 'secondary'}>
                                                        {log.status}
                                                    </Badge>
                                                    <span className="text-sm text-muted-foreground">• {log.loja_nome}</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(log.data_execucao).toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                            
                                            <div className="flex space-x-4 text-xs text-muted-foreground">
                                                {log.pedidos_encontrados > 0 && (
                                                    <span>📊 Encontrados: {log.pedidos_encontrados}</span>
                                                )}
                                                {log.pedidos_cancelados > 0 && (
                                                    <span>❌ Cancelados: {log.pedidos_cancelados}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default ProcessamentoPage;