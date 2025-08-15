// frontend/src/features/processamento/DetectorIPPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import {
    Shield, Globe, Eye, Users, ShoppingBag, AlertCircle, Check, X, RefreshCw,
    Settings, History, Building, Search, Target, Loader2, Calendar, ChevronDown, ChevronRight, Code, Copy, XCircle
} from 'lucide-react';
import { getCSRFToken } from '../../utils/csrf';

function DetectorIPPage() {
    // Estados principais
    const [lojas, setLojas] = useState([]);
    const [lojaSelecionada, setLojaSelecionada] = useState(null);
    const [ipGroups, setIPGroups] = useState([]);
    const [searchingIPs, setSearchingIPs] = useState(false);
    const [searchParams, setSearchParams] = useState({
        days: 30,
        min_orders: 2
    });
    
    // Estado para dados de debug
    const [debugSampleOrder, setDebugSampleOrder] = useState(null);
    const [debugExpanded, setDebugExpanded] = useState(false);
    
    // Estados modais/interface
    const [showInstructions, setShowInstructions] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showIPDetails, setShowIPDetails] = useState(false);
    const [selectedIP, setSelectedIP] = useState(null);
    const [ipDetails, setIPDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    // Estados interface
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        loadLojas();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    const searchIPDuplicates = async () => {
        if (!lojaSelecionada) {
            showNotification('Selecione uma loja primeiro', 'error');
            return;
        }

        setSearchingIPs(true);
        setIPGroups([]);

        try {
            const response = await axios.post('/processamento/buscar-ips-duplicados/', {
                loja_id: lojaSelecionada,
                days: searchParams.days,
                min_orders: searchParams.min_orders
            }, {
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (response.data.success) {
                setIPGroups(response.data.data.ip_groups || []);
                if (response.data.data.debug_sample_order) {
                    setDebugSampleOrder(response.data.data.debug_sample_order);
                }
                showNotification(`${response.data.data.total_ips_found || 0} IPs encontrados com múltiplos pedidos`);
            } else {
                showNotification(response.data.message || 'Erro na busca', 'error');
            }
        } catch (error) {
            console.error('Erro na busca de IPs:', error);
            showNotification(error.response?.data?.error || 'Erro na busca de IPs', 'error');
        } finally {
            setSearchingIPs(false);
        }
    };

    const openIPDetails = async (ipGroup) => {
        if (!ipGroup?.ip) {
            showNotification('IP inválido', 'error');
            return;
        }

        setSelectedIP(ipGroup);
        setShowIPDetails(true);
        setLoadingDetails(true);
        setIPDetails(null);

        try {
            const response = await axios.post('/processamento/detalhar-ip/', {
                loja_id: lojaSelecionada,
                ip: ipGroup.ip,
                days: searchParams.days
            }, {
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (response.data.success) {
                setIPDetails(response.data.data);
            } else {
                showNotification(response.data.message || 'Erro ao carregar detalhes', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes do IP:', error);
            showNotification(error.response?.data?.error || 'Erro ao carregar detalhes', 'error');
        } finally {
            setLoadingDetails(false);
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

    const formatCurrency = (value, currency = 'BRL') => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency
        }).format(parseFloat(value) || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getDaysBadgeVariant = (days) => {
        if (days <= 7) return 'destructive';
        if (days <= 15) return 'secondary';
        return 'outline';
    };
    
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Copiado para a área de transferência!');
        }).catch(() => {
            showNotification('Erro ao copiar', 'error');
        });
    };
    
    const extractIPFields = (orderData) => {
        const ipFields = [];
        
        const searchForIPs = (obj, path = '') => {
            for (const [key, value] of Object.entries(obj || {})) {
                const currentPath = path ? `${path}.${key}` : key;
                
                if (key.toLowerCase().includes('ip') && typeof value === 'string') {
                    ipFields.push({ field: currentPath, value });
                } else if (typeof value === 'object' && value !== null) {
                    searchForIPs(value, currentPath);
                }
            }
        };
        
        searchForIPs(orderData);
        return ipFields;
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
                        <Shield className="h-6 w-6 text-primary" />
                        Detector de IP
                    </h1>
                    <p className="text-muted-foreground">Análise de pedidos por endereço IP - Detecção de fraudes e padrões</p>
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
                    
                    <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] bg-background border-border">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">Detector de IP - Informações</DialogTitle>
                                <DialogDescription className="text-muted-foreground">Como funciona a análise por endereços IP</DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[70vh] pr-4">
                                <Tabs defaultValue="usage">
                                    <TabsList className="grid w-full grid-cols-2 bg-muted">
                                        <TabsTrigger value="usage" className="text-foreground">Como Usar</TabsTrigger>
                                        <TabsTrigger value="logic" className="text-foreground">Lógica de Análise</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="usage" className="space-y-4">
                                        <div className="space-y-3">
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">1. Selecionar Loja</h4>
                                                <p className="text-sm text-muted-foreground">Escolha a loja configurada para análise de pedidos</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">2. Configurar Filtros</h4>
                                                <p className="text-sm text-muted-foreground">Período (até 365 dias) e mínimo de pedidos por IP</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">3. Analisar Resultados</h4>
                                                <p className="text-sm text-muted-foreground">Clique em "Ver Detalhes" para investigar IPs específicos</p>
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="logic" className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">✅ O que é detectado:</h4>
                                            <div className="space-y-3 text-sm text-muted-foreground ml-4">
                                                <div>
                                                    <strong className="text-foreground">Múltiplos Pedidos:</strong>
                                                    <ul className="ml-4 space-y-1">
                                                        <li>• Pedidos do mesmo IP (browser_ip do Shopify)</li>
                                                        <li>• Período configurável (até 365 dias, padrão: 30 dias)</li>
                                                        <li>• Mínimo de pedidos configurável (padrão: 2)</li>
                                                    </ul>
                                                </div>
                                                
                                                <div>
                                                    <strong className="text-foreground">Informações Coletadas:</strong>
                                                    <ul className="ml-4 space-y-1">
                                                        <li>• Quantidade total de pedidos por IP</li>
                                                        <li>• Número de clientes únicos</li>
                                                        <li>• Valor total das vendas</li>
                                                        <li>• Intervalo de datas (primeiro/último pedido)</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <Separator />
                                        
                                        <div>
                                            <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">🎯 Casos de Uso:</h4>
                                            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                                                <li>• <span className="font-medium text-foreground">Detecção de Fraude:</span> Múltiplas compras suspeitas</li>
                                                <li>• <span className="font-medium text-foreground">Análise Comportamental:</span> Padrões de compra por região</li>
                                                <li>• <span className="font-medium text-foreground">Marketing:</span> Concentração de clientes por local</li>
                                                <li>• <span className="font-medium text-foreground">Auditoria:</span> Compliance e investigações</li>
                                            </ul>
                                        </div>
                                        
                                        <Separator />
                                        
                                        <div>
                                            <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">⚠️ Limitações:</h4>
                                            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                                                <li>• Depende do Shopify registrar o browser_ip</li>
                                                <li>• IPs dinâmicos podem gerar falsos positivos</li>
                                                <li>• VPNs/proxies podem mascarar origem real</li>
                                                <li>• Não detecta fraudes cross-IP</li>
                                            </ul>
                                        </div>
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

            {/* Filtros */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Configuração da Busca
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Configure o período (até 365 dias) e critérios para análise de IPs
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <Label htmlFor="days" className="text-foreground">Período (dias)</Label>
                            <Select value={searchParams.days.toString()} onValueChange={(value) => setSearchParams(prev => ({ ...prev, days: parseInt(value) }))}>
                                <SelectTrigger className="bg-background border-input text-foreground">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7">7 dias</SelectItem>
                                    <SelectItem value="15">15 dias</SelectItem>
                                    <SelectItem value="30">30 dias</SelectItem>
                                    <SelectItem value="60">60 dias</SelectItem>
                                    <SelectItem value="90">90 dias</SelectItem>
                                    <SelectItem value="180">180 dias</SelectItem>
                                    <SelectItem value="365">365 dias (1 ano)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="flex-1">
                            <Label htmlFor="min_orders" className="text-foreground">Mínimo de pedidos</Label>
                            <Select value={searchParams.min_orders.toString()} onValueChange={(value) => setSearchParams(prev => ({ ...prev, min_orders: parseInt(value) }))}>
                                <SelectTrigger className="bg-background border-input text-foreground">
                                    <ShoppingBag className="h-4 w-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2">2 pedidos</SelectItem>
                                    <SelectItem value="3">3 pedidos</SelectItem>
                                    <SelectItem value="4">4 pedidos</SelectItem>
                                    <SelectItem value="5">5 pedidos</SelectItem>
                                    <SelectItem value="10">10 pedidos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <Button
                            onClick={searchIPDuplicates}
                            disabled={searchingIPs || !lojaSelecionada}
                            className="min-w-[150px]"
                        >
                            {searchingIPs ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                            Buscar IPs
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Resultados */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-foreground">Resultados da Análise</CardTitle>
                            <CardDescription className="text-muted-foreground">
                                {ipGroups.length > 0 
                                    ? `${ipGroups.length} endereços IP com múltiplos pedidos encontrados`
                                    : 'Execute uma busca para analisar pedidos por IP'
                                }
                                {ipGroups.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(() => {
                                            const suspiciousCount = ipGroups.filter(ip => ip.is_suspicious).length;
                                            const legitimateCount = ipGroups.length - suspiciousCount;
                                            return (
                                                <>
                                                    <Badge variant="default" className="text-xs">
                                                        {legitimateCount} IPs legítimos
                                                    </Badge>
                                                    {suspiciousCount > 0 && (
                                                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                            {suspiciousCount} IPs suspeitos (possível servidor/proxy)
                                                        </Badge>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent>
                    {!lojaSelecionada && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-foreground">Selecione uma loja para começar a análise</AlertDescription>
                        </Alert>
                    )}

                    {searchingIPs && (
                        <div className="space-y-2 mb-4">
                            <p className="text-sm text-muted-foreground">Analisando pedidos por endereço IP...</p>
                            <Progress value={100} className="w-full animate-pulse" />
                        </div>
                    )}

                    {ipGroups.length === 0 && !searchingIPs ? (
                        <div className="text-center py-12">
                            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Nenhum IP com múltiplos pedidos encontrado</p>
                            <p className="text-sm text-muted-foreground">Ajuste os filtros ou tente um período maior</p>
                        </div>
                    ) : ipGroups.length > 0 ? (
                        <div className="w-full max-w-[calc(100vw-280px)] overflow-x-auto">
                            <div className="rounded-md border border-border" style={{ minWidth: '800px' }}>
                                <Table className="w-full">
                                    <TableHeader>
                                        <TableRow className="border-border">
                                            <TableHead className="text-foreground">IP</TableHead>
                                            <TableHead className="text-foreground text-center">Pedidos</TableHead>
                                            <TableHead className="text-foreground text-center">Status</TableHead>
                                            <TableHead className="text-foreground text-center">Clientes</TableHead>
                                            <TableHead className="text-foreground text-right">Total</TableHead>
                                            <TableHead className="text-foreground">Período</TableHead>
                                            <TableHead className="text-right text-foreground">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ipGroups.map((ipGroup, index) => {
                                            const daysDiff = ipGroup.date_range ? 
                                                Math.ceil((new Date(ipGroup.date_range.last) - new Date(ipGroup.date_range.first)) / (1000 * 60 * 60 * 24)) : 0;
                                            
                                            return (
                                                <TableRow key={`${ipGroup.ip}-${index}`} className={`border-border hover:bg-muted/50 ${ipGroup.is_suspicious ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''}`}>
                                                    <TableCell>
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                                                ipGroup.is_suspicious ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-primary/10'
                                                            }`}>
                                                                <Globe className={`h-4 w-4 ${
                                                                    ipGroup.is_suspicious ? 'text-amber-600 dark:text-amber-400' : 'text-primary'
                                                                }`} />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="flex items-center space-x-2">
                                                                    <p className="font-mono text-sm text-foreground">{ipGroup.ip}</p>
                                                                    {ipGroup.is_suspicious && (
                                                                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                                            Suspeito
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                {ipGroup.is_suspicious && ipGroup.suspicious_flags?.pattern_match && (
                                                                    <p className="text-xs text-muted-foreground">{ipGroup.suspicious_flags.pattern_match}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className="font-mono">
                                                            {ipGroup.order_count}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col gap-1">
                                                            {ipGroup.active_orders > 0 && (
                                                                <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                                    {ipGroup.active_orders} ativo{ipGroup.active_orders > 1 ? 's' : ''}
                                                                </Badge>
                                                            )}
                                                            {ipGroup.cancelled_orders > 0 && (
                                                                <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                                    {ipGroup.cancelled_orders} cancelado{ipGroup.cancelled_orders > 1 ? 's' : ''}
                                                                </Badge>
                                                            )}
                                                            {!ipGroup.active_orders && !ipGroup.cancelled_orders && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {ipGroup.order_count} total
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center space-x-1">
                                                            <Users className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-sm text-foreground">{ipGroup.unique_customers}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <p className="font-semibold text-sm text-foreground">
                                                            {formatCurrency(ipGroup.total_sales, ipGroup.currency || 'BRL')}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            {ipGroup.date_range && (
                                                                <>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {formatDate(ipGroup.date_range.first)} a {formatDate(ipGroup.date_range.last)}
                                                                    </p>
                                                                    <Badge variant={getDaysBadgeVariant(daysDiff)}>
                                                                        {daysDiff} dias
                                                                    </Badge>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openIPDetails(ipGroup)}
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            Ver Detalhes
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>
            
            {/* Seção de Debug */}
            {debugSampleOrder && (
                <Card className="bg-card border-border">
                    <Collapsible open={debugExpanded} onOpenChange={setDebugExpanded}>
                        <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Code className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-foreground">🔍 Debug: Dados RAW do Shopify</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-xs">
                                            Pedido de exemplo
                                        </Badge>
                                        {debugExpanded ? 
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        }
                                    </div>
                                </div>
                                <CardDescription className="text-muted-foreground">
                                    Visualizar estrutura completa dos dados retornados pelo Shopify e campos de IP identificados
                                </CardDescription>
                            </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent>
                                <Tabs defaultValue="ips" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 bg-muted">
                                        <TabsTrigger value="ips" className="text-foreground">IPs Encontrados</TabsTrigger>
                                        <TabsTrigger value="raw" className="text-foreground">Dados Completos</TabsTrigger>
                                    </TabsList>
                                    
                                    <TabsContent value="ips" className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-foreground">Campos de IP Identificados</h4>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => copyToClipboard(JSON.stringify(extractIPFields(debugSampleOrder), null, 2))}
                                            >
                                                <Copy className="h-4 w-4 mr-2" />
                                                Copiar IPs
                                            </Button>
                                        </div>
                                        
                                        <ScrollArea className="h-64 w-full">
                                            <div className="space-y-2">
                                                {extractIPFields(debugSampleOrder).map((ipField, index) => (
                                                    <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <Badge variant="outline" className="text-xs mb-2">
                                                                    {ipField.field}
                                                                </Badge>
                                                                <p className="font-mono text-sm text-foreground">
                                                                    {ipField.value}
                                                                </p>
                                                            </div>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm"
                                                                onClick={() => copyToClipboard(ipField.value)}
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                {extractIPFields(debugSampleOrder).length === 0 && (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        <Target className="h-8 w-8 mx-auto mb-2" />
                                                        <p>Nenhum campo de IP encontrado nos dados</p>
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>
                                    
                                    <TabsContent value="raw" className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-foreground">Estrutura JSON Completa</h4>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => copyToClipboard(JSON.stringify(debugSampleOrder, null, 2))}
                                            >
                                                <Copy className="h-4 w-4 mr-2" />
                                                Copiar JSON
                                            </Button>
                                        </div>
                                        
                                        <ScrollArea className="h-96 w-full">
                                            <pre className="bg-muted/20 p-4 rounded-lg border border-border text-xs overflow-x-auto">
                                                <code className="text-foreground">
                                                    {JSON.stringify(debugSampleOrder, null, 2)}
                                                </code>
                                            </pre>
                                        </ScrollArea>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>
            )}

            <>
            {/* Modal de Detalhes do IP */}
            <Dialog open={showIPDetails} onOpenChange={setShowIPDetails}>
                <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[95vh] bg-background border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Detalhes do IP: {selectedIP ? selectedIP.ip : 'N/A'}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Análise completa dos pedidos e clientes deste endereço IP
                        </DialogDescription>
                    </DialogHeader>
                    
                    {loadingDetails ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-foreground" />
                            <span className="ml-2 text-muted-foreground">Carregando detalhes...</span>
                        </div>
                    ) : ipDetails ? (
                        <ScrollArea className="max-h-[75vh] pr-4">
                            <div className="space-y-6">
                                {/* Resumo do IP */}
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <Card className="bg-primary/5 border-primary/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Total de Pedidos</p>
                                                    <p className="text-2xl font-bold text-foreground">{ipDetails.order_count}</p>
                                                    {(ipDetails.active_orders || ipDetails.cancelled_orders) && (
                                                        <div className="flex gap-1 mt-1">
                                                            {ipDetails.active_orders > 0 && (
                                                                <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                                    {ipDetails.active_orders} ativo{ipDetails.active_orders > 1 ? 's' : ''}
                                                                </Badge>
                                                            )}
                                                            {ipDetails.cancelled_orders > 0 && (
                                                                <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                                    {ipDetails.cancelled_orders} cancelado{ipDetails.cancelled_orders > 1 ? 's' : ''}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <ShoppingBag className="h-8 w-8 text-primary/60" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card className="bg-blue-500/5 border-blue-500/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Clientes Únicos</p>
                                                    <p className="text-2xl font-bold text-foreground">{ipDetails.unique_customers}</p>
                                                </div>
                                                <Users className="h-8 w-8 text-blue-500/60" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card className="bg-green-500/5 border-green-500/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Total Vendas</p>
                                                    <p className="text-lg font-bold text-foreground">
                                                        {formatCurrency(ipDetails.total_sales, ipDetails.currency)}
                                                    </p>
                                                </div>
                                                <div className="text-green-500/60 text-2xl font-bold">R$</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card className="bg-amber-500/5 border-amber-500/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Período</p>
                                                    <p className="text-sm font-bold text-foreground">
                                                        {ipDetails.date_range ? 
                                                            `${formatDate(ipDetails.date_range.first)} a ${formatDate(ipDetails.date_range.last)}` : 
                                                            'N/A'
                                                        }
                                                    </p>
                                                </div>
                                                <Calendar className="h-8 w-8 text-amber-500/60" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Separator />

                                {/* Lista de Pedidos */}
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-4">Pedidos Deste IP</h3>
                                    <div className="space-y-3">
                                        {ipDetails.orders?.map((order, index) => (
                                            <Card key={`${order.id}-${index}`} className="bg-muted/20">
                                                <CardContent className="p-4">
                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                        {/* Dados do Pedido */}
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-foreground mb-2">Informações do Pedido</h4>
                                                            <div className="space-y-2 text-sm">
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Número</Label>
                                                                    <p className="text-foreground">#{order.order_number}</p>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Data</Label>
                                                                    <p className="text-foreground">{formatDate(order.created_at)}</p>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Valor</Label>
                                                                    <p className="font-semibold text-foreground">
                                                                        {formatCurrency(order.total_price, order.currency)}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Status</Label>
                                                                    <div className="flex gap-1 flex-wrap">
                                                                        {order.is_cancelled ? (
                                                                            <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                                                Cancelado
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                                                Ativo
                                                                            </Badge>
                                                                        )}
                                                                        <Badge variant="outline">{order.financial_status}</Badge>
                                                                        <Badge variant="secondary">{order.fulfillment_status || 'N/A'}</Badge>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Dados do Cliente */}
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-foreground mb-2">Cliente</h4>
                                                            <div className="space-y-2 text-sm">
                                                                {order.customer && (
                                                                    <>
                                                                        <div>
                                                                            <Label className="text-xs text-muted-foreground">Nome</Label>
                                                                            <p className="text-foreground">
                                                                                {order.customer.first_name} {order.customer.last_name}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <Label className="text-xs text-muted-foreground">Email</Label>
                                                                            <p className="text-foreground">{order.customer.email}</p>
                                                                        </div>
                                                                        <div>
                                                                            <Label className="text-xs text-muted-foreground">Telefone</Label>
                                                                            <p className="text-foreground">{order.customer.phone || 'N/A'}</p>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Endereço (se disponível) */}
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-foreground mb-2">Detalhes</h4>
                                                            <div className="space-y-2 text-sm">
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Items</Label>
                                                                    <p className="text-foreground">{order.line_items_count} item(s)</p>
                                                                </div>
                                                                {order.tags && (
                                                                    <div>
                                                                        <Label className="text-xs text-muted-foreground">Tags</Label>
                                                                        <p className="text-foreground text-xs">{order.tags}</p>
                                                                    </div>
                                                                )}
                                                                {order.address_details?.shipping_address && (
                                                                    <div>
                                                                        <Label className="text-xs text-muted-foreground">Cidade</Label>
                                                                        <p className="text-foreground">
                                                                            {order.address_details.shipping_address.city}, {order.address_details.shipping_address.province}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Erro ao carregar detalhes do IP
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Historico */}
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] bg-background border-border">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center space-x-2 text-foreground">
                                <History className="h-5 w-5" />
                                <span>Histórico de Análises</span>
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
                                                    <span>📊 Analisados: {log.pedidos_encontrados}</span>
                                                )}
                                                {log.detalhes && (
                                                    <span>🔍 {typeof log.detalhes === 'object' ? JSON.stringify(log.detalhes) : log.detalhes}</span>
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
            </>
        </div>
    );
}

export default DetectorIPPage;