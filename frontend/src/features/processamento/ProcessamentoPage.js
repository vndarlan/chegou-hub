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
    Book, Search, Target, Loader2, Eye, MapPin
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
    const [showClientDetails, setShowClientDetails] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
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

    const openClientDetails = (duplicate) => {
        setSelectedClient(duplicate);
        setShowClientDetails(true);
    };

    // Função para renderizar um endereço completo
    const renderAddressSection = (addressData, title, bgColor = "bg-gray-50 dark:bg-gray-950/20", borderColor = "border-gray-200 dark:border-gray-800") => {
        if (!addressData) return null;

        return (
            <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{title}</span>
                </h3>
                
                {/* Informações do Cliente */}
                {addressData.customer_info && (
                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 ${bgColor} rounded-lg border ${borderColor}`}>
                        <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                            <h4 className="font-medium text-foreground mb-3">Dados do Cliente</h4>
                        </div>
                        
                        {addressData.customer_info.email && (
                            <div>
                                <Label className="text-sm font-medium text-foreground">Email</Label>
                                <p className="text-sm text-muted-foreground">{addressData.customer_info.email}</p>
                            </div>
                        )}
                        {addressData.customer_info.orders_count > 0 && (
                            <div>
                                <Label className="text-sm font-medium text-foreground">Total de Pedidos</Label>
                                <p className="text-sm text-muted-foreground">{addressData.customer_info.orders_count}</p>
                            </div>
                        )}
                        {addressData.customer_info.total_spent && (
                            <div>
                                <Label className="text-sm font-medium text-foreground">Total Gasto</Label>
                                <p className="text-sm text-muted-foreground">R$ {addressData.customer_info.total_spent}</p>
                            </div>
                        )}
                        {addressData.customer_info.state && (
                            <div>
                                <Label className="text-sm font-medium text-foreground">Status Cliente</Label>
                                <Badge variant="outline" className="text-xs">{addressData.customer_info.state}</Badge>
                            </div>
                        )}
                        <div>
                            <Label className="text-sm font-medium text-foreground">Email Verificado</Label>
                            <Badge variant={addressData.customer_info.verified_email ? "default" : "secondary"} className="text-xs">
                                {addressData.customer_info.verified_email ? "Sim" : "Não"}
                            </Badge>
                        </div>
                        <div>
                            <Label className="text-sm font-medium text-foreground">Aceita Marketing</Label>
                            <Badge variant={addressData.customer_info.accepts_marketing ? "default" : "secondary"} className="text-xs">
                                {addressData.customer_info.accepts_marketing ? "Sim" : "Não"}
                            </Badge>
                        </div>
                        {addressData.customer_info.tags && (
                            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                                <Label className="text-sm font-medium text-foreground">Tags do Cliente</Label>
                                <p className="text-sm text-muted-foreground">{addressData.customer_info.tags}</p>
                            </div>
                        )}
                        {addressData.customer_info.note && (
                            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                                <Label className="text-sm font-medium text-foreground">Observações</Label>
                                <p className="text-sm text-muted-foreground">{addressData.customer_info.note}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Endereço de Entrega */}
                {addressData.has_shipping && (
                    <div className={`p-4 ${bgColor} rounded-lg border ${borderColor}`}>
                        <h4 className="font-medium text-foreground mb-3">Endereço de Entrega</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {addressData.shipping_address.name && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">Nome Completo</Label>
                                    <p className="text-sm text-muted-foreground">{addressData.shipping_address.name}</p>
                                </div>
                            )}
                            {(addressData.shipping_address.first_name || addressData.shipping_address.last_name) && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">Nome</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {addressData.shipping_address.first_name} {addressData.shipping_address.last_name}
                                    </p>
                                </div>
                            )}
                            {addressData.shipping_address.company && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">Empresa</Label>
                                    <p className="text-sm text-muted-foreground">{addressData.shipping_address.company}</p>
                                </div>
                            )}
                            {addressData.shipping_address.address1 && (
                                <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                                    <Label className="text-sm font-medium text-foreground">Endereço</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {addressData.shipping_address.address1}
                                        {addressData.shipping_address.address2 && `, ${addressData.shipping_address.address2}`}
                                    </p>
                                </div>
                            )}
                            {addressData.shipping_address.city && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">Cidade</Label>
                                    <p className="text-sm text-muted-foreground">{addressData.shipping_address.city}</p>
                                </div>
                            )}
                            {addressData.shipping_address.province && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">Estado</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {addressData.shipping_address.province}
                                        {addressData.shipping_address.province_code && ` (${addressData.shipping_address.province_code})`}
                                    </p>
                                </div>
                            )}
                            {addressData.shipping_address.zip && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">CEP</Label>
                                    <p className="text-sm text-muted-foreground">{addressData.shipping_address.zip}</p>
                                </div>
                            )}
                            {addressData.shipping_address.country && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">País</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {addressData.shipping_address.country}
                                        {addressData.shipping_address.country_code && ` (${addressData.shipping_address.country_code})`}
                                    </p>
                                </div>
                            )}
                            {addressData.shipping_address.phone && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">Telefone</Label>
                                    <p className="text-sm text-muted-foreground">{addressData.shipping_address.phone}</p>
                                </div>
                            )}
                            {(addressData.shipping_address.latitude && addressData.shipping_address.longitude) && (
                                <div className="col-span-1 sm:col-span-2">
                                    <Label className="text-sm font-medium text-foreground">Coordenadas</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {addressData.shipping_address.latitude}, {addressData.shipping_address.longitude}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Endereço de Cobrança */}
                {addressData.has_billing && (
                    <div className={`p-4 ${bgColor} rounded-lg border ${borderColor}`}>
                        <h4 className="font-medium text-foreground mb-3">Endereço de Cobrança</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {addressData.billing_address.name && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">Nome Completo</Label>
                                    <p className="text-sm text-muted-foreground">{addressData.billing_address.name}</p>
                                </div>
                            )}
                            {(addressData.billing_address.first_name || addressData.billing_address.last_name) && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">Nome</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {addressData.billing_address.first_name} {addressData.billing_address.last_name}
                                    </p>
                                </div>
                            )}
                            {addressData.billing_address.company && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">Empresa</Label>
                                    <p className="text-sm text-muted-foreground">{addressData.billing_address.company}</p>
                                </div>
                            )}
                            {addressData.billing_address.address1 && (
                                <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                                    <Label className="text-sm font-medium text-foreground">Endereço</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {addressData.billing_address.address1}
                                        {addressData.billing_address.address2 && `, ${addressData.billing_address.address2}`}
                                    </p>
                                </div>
                            )}
                            {addressData.billing_address.city && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">Cidade</Label>
                                    <p className="text-sm text-muted-foreground">{addressData.billing_address.city}</p>
                                </div>
                            )}
                            {addressData.billing_address.province && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">Estado</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {addressData.billing_address.province}
                                        {addressData.billing_address.province_code && ` (${addressData.billing_address.province_code})`}
                                    </p>
                                </div>
                            )}
                            {addressData.billing_address.zip && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">CEP</Label>
                                    <p className="text-sm text-muted-foreground">{addressData.billing_address.zip}</p>
                                </div>
                            )}
                            {addressData.billing_address.country && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">País</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {addressData.billing_address.country}
                                        {addressData.billing_address.country_code && ` (${addressData.billing_address.country_code})`}
                                    </p>
                                </div>
                            )}
                            {addressData.billing_address.phone && (
                                <div>
                                    <Label className="text-sm font-medium text-foreground">Telefone</Label>
                                    <p className="text-sm text-muted-foreground">{addressData.billing_address.phone}</p>
                                </div>
                            )}
                            {(addressData.billing_address.latitude && addressData.billing_address.longitude) && (
                                <div className="col-span-1 sm:col-span-2">
                                    <Label className="text-sm font-medium text-foreground">Coordenadas</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {addressData.billing_address.latitude}, {addressData.billing_address.longitude}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
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
                    <h1 className="text-2xl font-bold text-foreground">Shopify Duplicados</h1>
                    <p className="text-muted-foreground">Gerenciamento de pedidos duplicados</p>
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
                    
                    <Dialog open={showAddStore} onOpenChange={setShowAddStore}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-background border-border max-w-[95vw] sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">Adicionar Nova Loja</DialogTitle>
                                <DialogDescription className="text-muted-foreground">Configure uma nova integração Shopify</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="nome" className="text-foreground">Nome da Loja</Label>
                                    <Input
                                        id="nome"
                                        placeholder="Ex: Loja Principal"
                                        value={newStore.nome_loja}
                                        onChange={(e) => setNewStore(prev => ({ ...prev, nome_loja: e.target.value }))}
                                        className="bg-background border-input text-foreground"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="url" className="text-foreground">URL da Loja</Label>
                                    <Input
                                        id="url"
                                        placeholder="minha-loja.myshopify.com"
                                        value={newStore.shop_url}
                                        onChange={(e) => setNewStore(prev => ({ ...prev, shop_url: e.target.value }))}
                                        className="bg-background border-input text-foreground"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="token" className="text-foreground">Access Token</Label>
                                    <Input
                                        id="token"
                                        type="password"
                                        placeholder="Token de acesso da API"
                                        value={newStore.access_token}
                                        onChange={(e) => setNewStore(prev => ({ ...prev, access_token: e.target.value }))}
                                        className="bg-background border-input text-foreground"
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={testConnection}
                                        disabled={testingConnection}
                                        className="flex-1"
                                    >
                                        {testingConnection ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Cloud className="h-4 w-4 mr-2" />}
                                        Testar Conexão
                                    </Button>
                                    <Button
                                        onClick={addStore}
                                        disabled={!connectionResult?.success}
                                        className="flex-1"
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
                        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] bg-background border-border">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">Configurações & Lógica</DialogTitle>
                                <DialogDescription className="text-muted-foreground">Instruções de configuração e lógica de detecção</DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[70vh] pr-4">
                                <Tabs defaultValue="config">
                                    <TabsList className="grid w-full grid-cols-2 bg-muted">
                                        <TabsTrigger value="config" className="text-foreground">Configuração Shopify</TabsTrigger>
                                        <TabsTrigger value="logic" className="text-foreground">Lógica de Detecção</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="config" className="space-y-4">
                                        <div className="space-y-3">
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">1. Criar App Privado</h4>
                                                <p className="text-sm text-muted-foreground">Acesse sua loja → Settings → Apps → Develop apps → Create an app</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">2. Configurar Permissões</h4>
                                                <p className="text-sm text-muted-foreground">Adicione: read_orders, write_orders, read_products, read_customers</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">3. Gerar Token</h4>
                                                <p className="text-sm text-muted-foreground">Install app → Copie o Admin API access token</p>
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="logic" className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">✅ DETECTA DUPLICATA quando:</h4>
                                            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                                                <li>• Mesmo cliente (telefone normalizado)</li>
                                                <li>• Mesmo produto (Product ID)</li>
                                                <li>• Intervalo ≤ 30 dias entre pedidos</li>
                                                <li>• Pedido original: <strong className="text-foreground">PROCESSADO</strong> (tem tags "order sent to dropi" ou "dropi sync error")</li>
                                                <li>• Pedido duplicado: <strong className="text-foreground">NÃO PROCESSADO</strong> (sem tags do Dropi)</li>
                                            </ul>
                                        </div>
                                        
                                        <Separator />
                                        
                                        <div>
                                            <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">❌ NÃO detecta quando:</h4>
                                            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                                                <li>• Ambos pedidos não têm tags (ambos não processados)</li>
                                                <li>• Produtos diferentes</li>
                                                <li>• Clientes diferentes (telefones diferentes)</li>
                                                <li>• Intervalo maior que 30 dias</li>
                                            </ul>
                                        </div>
                                        
                                        <Alert>
                                            <AlertDescription className="text-foreground">
                                                <strong>Objetivo:</strong> Cancelar apenas pedidos duplicados não processados de produtos já enviados/processados anteriormente.
                                            </AlertDescription>
                                        </Alert>
                                    </TabsContent>
                                </Tabs>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    
                    <Button variant="outline" size="icon" onClick={() => { setShowHistory(true); loadLogs(); }}>
                        <History className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Área Principal */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardDescription className="text-muted-foreground">Detecte e gerencie pedidos duplicados automaticamente</CardDescription>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
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
                                            <span className="hidden sm:inline">Cancelar Selecionados </span>({selectedDuplicates.length})
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-background border-border max-w-[95vw] sm:max-w-lg">
                                        <DialogHeader>
                                            <DialogTitle className="text-foreground">Confirmar Cancelamento</DialogTitle>
                                            <DialogDescription className="text-muted-foreground">
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
                            <AlertDescription className="text-foreground">Selecione uma loja no header para buscar pedidos duplicados</AlertDescription>
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
                        <div className="overflow-x-auto">
                            <div className="rounded-md border border-border min-w-[800px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-border">
                                            <TableHead className="w-12">
                                                <Checkbox 
                                                    checked={selectedDuplicates.length === duplicates.length}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead className="text-foreground">Cliente</TableHead>
                                            <TableHead className="text-foreground">Pedido Original</TableHead>
                                            <TableHead className="text-foreground">Duplicata</TableHead>
                                            <TableHead className="text-foreground">Produtos</TableHead>
                                            <TableHead className="text-foreground">Intervalo</TableHead>
                                            <TableHead className="text-right text-foreground">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {duplicates.map((duplicate, index) => (
                                            <TableRow key={index} className="border-border hover:bg-muted/50">
                                                <TableCell>
                                                    <Checkbox 
                                                        checked={selectedDuplicates.includes(duplicate.duplicate_order.id)}
                                                        onCheckedChange={() => toggleDuplicateSelection(duplicate.duplicate_order.id)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="text-xs bg-muted text-foreground">{duplicate.customer_name?.charAt(0) || 'U'}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium text-sm text-foreground">{duplicate.customer_name}</p>
                                                            <p className="text-xs text-muted-foreground">{duplicate.customer_phone}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium text-sm text-foreground">#{duplicate.first_order.number}</p>
                                                        <p className="text-xs text-muted-foreground">{duplicate.first_order.date}</p>
                                                        <p className="text-xs text-green-600 dark:text-green-400">{duplicate.first_order.total}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium text-sm text-foreground">#{duplicate.duplicate_order.number}</p>
                                                        <p className="text-xs text-muted-foreground">{duplicate.duplicate_order.date}</p>
                                                        <p className="text-xs text-red-600 dark:text-red-400">{duplicate.duplicate_order.total}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-xs text-muted-foreground">
                                                        {duplicate.product_names?.join(', ') || 'N/A'}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={duplicate.days_between <= 7 ? 'destructive' : duplicate.days_between <= 15 ? 'secondary' : 'outline'}>
                                                        {duplicate.days_between} dias
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end space-x-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openClientDetails(duplicate)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
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
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {/* Histórico */}
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] bg-background border-border">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center space-x-2 text-foreground">
                                <History className="h-5 w-5" />
                                <span>Histórico de Operações</span>
                            </DialogTitle>
                            <Button variant="outline" size="sm" onClick={loadLogs}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Atualizar
                            </Button>
                        </div>
                    </DialogHeader>
                    <div>
                        {logs.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">Nenhum histórico encontrado</p>
                        ) : (
                            <ScrollArea className="h-96">
                                <div className="space-y-3">
                                    {logs.map((log) => (
                                        <div key={log.id} className="p-3 border border-border rounded-lg bg-card">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    {log.status === 'Sucesso' ? <Check className="h-4 w-4 text-green-600" /> : 
                                                     log.status === 'Erro' ? <X className="h-4 w-4 text-red-600" /> : 
                                                     <AlertCircle className="h-4 w-4 text-orange-600" />}
                                                    <span className="font-medium text-sm text-foreground">{log.tipo}</span>
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
                    </div>
                </DialogContent>
            </Dialog>

            {/* Detalhes do Cliente - RESPONSIVO COM ENDEREÇOS DOS DOIS PEDIDOS */}
            <Dialog open={showClientDetails} onOpenChange={setShowClientDetails}>
                <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[95vh] bg-background border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Detalhes Completos do Cliente</DialogTitle>
                        <DialogDescription className="text-muted-foreground">Informações completas sobre o cliente e endereços dos dois pedidos</DialogDescription>
                    </DialogHeader>
                    {selectedClient && (
                        <ScrollArea className="max-h-[75vh] pr-4">
                            <div className="space-y-6">
                                {/* Informações do Cliente */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-foreground">Resumo dos Pedidos</h3>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                            <h4 className="font-medium text-green-700 dark:text-green-400 mb-3">Pedido Original</h4>
                                            <div className="space-y-2">
                                                <div>
                                                    <Label className="text-xs font-medium text-foreground">Número</Label>
                                                    <p className="text-sm text-foreground">#{selectedClient.first_order.number}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-medium text-foreground">Data</Label>
                                                    <p className="text-sm text-foreground">{selectedClient.first_order.date}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-medium text-foreground">Total</Label>
                                                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">{selectedClient.first_order.total}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                                            <h4 className="font-medium text-red-700 dark:text-red-400 mb-3">Pedido Duplicado</h4>
                                            <div className="space-y-2">
                                                <div>
                                                    <Label className="text-xs font-medium text-foreground">Número</Label>
                                                    <p className="text-sm text-foreground">#{selectedClient.duplicate_order.number}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-medium text-foreground">Data</Label>
                                                    <p className="text-sm text-foreground">{selectedClient.duplicate_order.date}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-xs font-medium text-foreground">Total</Label>
                                                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">{selectedClient.duplicate_order.total}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* ENDEREÇOS DO PEDIDO ORIGINAL */}
                                {selectedClient.original_order_address && 
                                    renderAddressSection(
                                        selectedClient.original_order_address, 
                                        `Endereços do Pedido Original (#${selectedClient.first_order.number})`,
                                        "bg-green-50 dark:bg-green-950/20",
                                        "border-green-200 dark:border-green-800"
                                    )
                                }

                                <Separator />

                                {/* ENDEREÇOS DO PEDIDO DUPLICADO */}
                                {selectedClient.customer_address && 
                                    renderAddressSection(
                                        selectedClient.customer_address, 
                                        `Endereços do Pedido Duplicado (#${selectedClient.duplicate_order.number})`,
                                        "bg-red-50 dark:bg-red-950/20",
                                        "border-red-200 dark:border-red-800"
                                    )
                                }

                                <Separator />

                                {/* Produtos e Intervalo */}
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-foreground">Produtos em Comum</Label>
                                        <p className="text-sm text-muted-foreground">{selectedClient.product_names?.join(', ') || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-foreground">Intervalo entre pedidos</Label>
                                        <div className="flex items-center space-x-2">
                                            <Badge variant={selectedClient.days_between <= 7 ? 'destructive' : selectedClient.days_between <= 15 ? 'secondary' : 'outline'}>
                                                {selectedClient.days_between} dias
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default ProcessamentoPage;