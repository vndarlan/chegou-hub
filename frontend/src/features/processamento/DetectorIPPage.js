// frontend/src/features/processamento/DetectorIPPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import {
    Shield, Globe, Eye, Users, ShoppingBag, AlertCircle, Check, X, RefreshCw,
    Settings, History, Building, Search, Target, Loader2, Calendar
} from 'lucide-react';
import { getCSRFToken } from '../../utils/csrf';
import { useToast } from '../../components/ui/use-toast';

function DetectorIPPage() {
    // Estados principais
    const [lojas, setLojas] = useState([]);
    const [lojaSelecionada, setLojaSelecionada] = useState(null);
    const [ipGroups, setIPGroups] = useState([]);
    const [searchingIPs, setSearchingIPs] = useState(false);
    const [searchParams, setSearchParams] = useState({
        days: 30
    });
    
    
    
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
    
    // Toast hook
    const { toast } = useToast();

    useEffect(() => {
        loadLojas();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    

    const showNotification = (message, type = 'success') => {
        // Manter compatibilidade com notificações visuais existentes
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
        
        // Adicionar toast para melhor UX
        const toastConfig = {
            title: type === 'error' ? 'Erro' : 'Sucesso',
            description: message,
        };
        
        if (type === 'error') {
            toastConfig.variant = 'destructive';
        }
        
        toast(toastConfig);
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

        // DEBUG: Log detalhado antes da requisição
        console.log('🔍 DEBUG DetectorIP - Iniciando busca...');
        console.log('📋 Dados que serão enviados:', {
            loja_id: lojaSelecionada,
            days: searchParams.days,
            lojaSelecionada_type: typeof lojaSelecionada,
            days_type: typeof searchParams.days
        });
        console.log('🏪 Lojas disponíveis:', lojas);
        console.log('🔑 CSRF Token:', getCSRFToken());

        try {
            const response = await axios.post('/processamento/buscar-ips-duplicados-simples/', {
                loja_id: lojaSelecionada,
                days: searchParams.days
            }, {
                headers: {
                    'X-CSRFToken': getCSRFToken()
                },
                timeout: 30000
            });

            if (response.data.ips_duplicados) {
                // Debug: Log dos dados recebidos do backend
                console.log('Dados do backend:', response.data.ips_duplicados[0]);
                
                // Mapear dados do backend para formato esperado pelo frontend
                const mappedIPs = response.data.ips_duplicados.map(ip => {
                    // Calcula valores derivados a partir dos pedidos
                    const pedidos = ip.pedidos || [];
                    const uniqueCustomers = new Set(pedidos.map(p => p.customer_name)).size;
                    const totalSales = 0; // TODO: Implementar cálculo de vendas se necessário
                    
                    // Conta pedidos ativos vs cancelados (Shopify usa cancelled_at)
                    const cancelledPedidos = pedidos.filter(p => p.cancelled_at != null).length;
                    const activePedidos = pedidos.length - cancelledPedidos;
                    
                    // Cria período de datas se disponível
                    let dateRange = null;
                    if (ip.primeiro_pedido && ip.ultimo_pedido) {
                        dateRange = {
                            first: ip.primeiro_pedido,
                            last: ip.ultimo_pedido
                        };
                    }
                    
                    return {
                        // Campos obrigatórios para funcionalidade
                        ip: ip.browser_ip,                    // Campo IP para exibição e ações
                        order_count: ip.total_pedidos,        // Total de pedidos
                        total_sales: totalSales,              // Valor total (calculado)
                        unique_customers: uniqueCustomers,    // Clientes únicos (calculado)
                        currency: 'BRL',                      // Moeda padrão
                        
                        // Status dos pedidos (calculado)
                        active_orders: activePedidos,
                        cancelled_orders: cancelledPedidos,
                        
                        // Análise de segurança (TODO: implementar no backend se necessário)
                        is_suspicious: false,
                        suspicious_flags: {},
                        
                        // Período dos pedidos
                        date_range: dateRange,
                        
                        // Método usado para capturar IP
                        method_used: ip.method_used || 'browser_ip',
                        confidence: ip.confidence || 0.95,
                        
                        // Dados originais preservados para compatibilidade
                        ...ip
                    };
                });
                
                // Debug: Log dos dados mapeados
                console.log('Dados mapeados:', mappedIPs[0]);
                
                setIPGroups(mappedIPs);
                const totalFound = mappedIPs.length;
                showNotification(`${totalFound} IPs encontrados com múltiplos pedidos`);
            } else {
                showNotification(response.data.message || 'Erro na busca', 'error');
            }
        } catch (error) {
            console.error('🚨 Erro na busca de IPs:', error);
            console.error('📋 Detalhes do erro:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                headers: error.response?.headers,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    data: error.config?.data
                }
            });
            showNotification(error.response?.data?.error || 'Erro na busca', 'error');
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
            const response = await axios.post('/processamento/detalhar-pedidos-ip/', {
                loja_id: lojaSelecionada,
                ip: ipGroup.ip,
                days: searchParams.days
            }, {
                headers: {
                    'X-CSRFToken': getCSRFToken()
                },
                timeout: 30000
            });

            if (response.data.success && response.data.data) {
                setIPDetails(response.data.data);
            } else {
                showNotification(response.data.message || response.data.error || 'Erro ao carregar detalhes', 'error');
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
                    <p className="text-muted-foreground">Detecta IPs com CLIENTES DIFERENTES - Ferramenta anti-fraude otimizada</p>
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
                                <div className="space-y-6">
                                    {/* Como Usar */}
                                    <Card className="bg-card border-border">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-foreground">Como Usar</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
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
                                        </CardContent>
                                    </Card>

                                    {/* Análise por Endereço IP */}
                                    <Card className="bg-card border-border">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-foreground">Análise por Endereço IP</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">🎯 O que esta ferramenta faz:</h4>
                                                <div className="space-y-3 text-sm text-muted-foreground ml-4">
                                                    <div>
                                                        <strong className="text-foreground">Detecção de IPs com Clientes Diferentes:</strong>
                                                        <ul className="ml-4 space-y-1">
                                                            <li>• Identifica APENAS IPs onde há CLIENTES DIFERENTES fazendo pedidos</li>
                                                            <li>• Se o mesmo cliente faz múltiplos pedidos, é considerado comportamento normal</li>
                                                            <li>• Foco na detecção de fraudes e compartilhamento de IP suspeito</li>
                                                            <li>• Período configurável (7 a 365 dias)</li>
                                                        </ul>
                                                    </div>
                                                    
                                                    <div>
                                                        <strong className="text-foreground">Dados Analisados:</strong>
                                                        <ul className="ml-4 space-y-1">
                                                            <li>• Número total de pedidos por IP suspeito</li>
                                                            <li>• Quantidade de clientes únicos (sempre > 1)</li>
                                                            <li>• Valores totais por IP</li>
                                                            <li>• Período de atividade (primeiro/último pedido)</li>
                                                            <li>• Status correto: ativos vs cancelados (via cancelled_at)</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <Separator />
                                            
                                            <div>
                                                <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">✅ Casos de Uso Principais:</h4>
                                                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                                                    <li>• <span className="font-medium text-foreground">Detecção de Fraudes:</span> Clientes diferentes usando o mesmo IP (suspeito)</li>
                                                    <li>• <span className="font-medium text-foreground">IPs Compartilhados:</span> Escritórios, lan houses, redes públicas</li>
                                                    <li>• <span className="font-medium text-foreground">Investigação de Cartões:</span> Cartões diferentes no mesmo IP</li>
                                                    <li>• <span className="font-medium text-foreground">Auditoria de Risco:</span> Verificação de padrões suspeitos</li>
                                                    <li>• <span className="font-medium text-foreground">Análise de Comportamento:</span> Múltiplos compradores no mesmo local</li>
                                                </ul>
                                            </div>
                                            
                                            <Separator />
                                            
                                            <div>
                                                <h4 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">📊 Fonte de Dados (Otimizada):</h4>
                                                <div className="text-sm text-muted-foreground ml-4 space-y-1">
                                                    <p>• <strong className="text-foreground">note_attributes "IP address":</strong> IP mais confiável capturado pelo sistema</p>
                                                    <p>• <strong className="text-foreground">Fallback geográfico:</strong> Coordenadas de entrega quando IP não disponível</p>
                                                    <p>• <strong className="text-foreground">Dados completos:</strong> Status real via cancelled_at (não financial_status)</p>
                                                </div>
                                            </div>
                                            
                                            <Separator />
                                            
                                            <div>
                                                <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">⚠️ Limitações e Considerações:</h4>
                                                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                                                    <li>• <strong className="text-foreground">Redes Legítimas:</strong> Escritórios e famílias podem ter múltiplos compradores legítimos</li>
                                                    <li>• <strong className="text-foreground">VPNs e Proxies:</strong> Podem mascarar IPs reais e gerar alertas falsos</li>
                                                    <li>• <strong className="text-foreground">IPs Dinâmicos:</strong> Provedores que reutilizam IPs entre clientes diferentes</li>
                                                    <li>• <strong className="text-foreground">Dependência de Dados:</strong> Requer note_attributes "IP address" configurado</li>
                                                    <li>• <strong className="text-foreground">Análise Contextual:</strong> Sempre investigar manualmente os casos encontrados</li>
                                                </ul>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    
                    <Button variant="outline" size="icon" onClick={() => { setShowHistory(true); loadLogs(); }}>
                        <History className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Filtros Compactos */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Período:</span>
                    <Select value={searchParams.days.toString()} onValueChange={(value) => setSearchParams(prev => ({ ...prev, days: parseInt(value) }))}>
                        <SelectTrigger className="w-32 h-8 bg-background border-input text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">7 dias</SelectItem>
                            <SelectItem value="15">15 dias</SelectItem>
                            <SelectItem value="30">30 dias</SelectItem>
                            <SelectItem value="60">60 dias</SelectItem>
                            <SelectItem value="90">90 dias</SelectItem>
                            <SelectItem value="180">180 dias</SelectItem>
                            <SelectItem value="365">365 dias</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <Button
                    onClick={searchIPDuplicates}
                    disabled={searchingIPs || !lojaSelecionada}
                    size="sm"
                    className="min-w-[120px]"
                >
                    {searchingIPs ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                    Buscar IPs
                </Button>
            </div>

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
                            </CardDescription>
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
                        <div className="flex items-center justify-center py-8 space-y-3">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span className="text-muted-foreground">Analisando pedidos por endereço IP...</span>
                            </div>
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
                                                            disabled={loadingDetails && selectedIP?.ip === ipGroup.ip}
                                                        >
                                                            {loadingDetails && selectedIP?.ip === ipGroup.ip ? (
                                                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                            ) : (
                                                                <Eye className="h-4 w-4 mr-1" />
                                                            )}
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
            

            <>
            {/* Modal de Detalhes do IP */}
            <Dialog open={showIPDetails} onOpenChange={setShowIPDetails}>
                <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[95vh] bg-background border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Detalhes do IP: {selectedIP ? selectedIP.ip : 'N/A'}
                            {ipDetails && ` - ${ipDetails.client_details?.length || 0} pedidos encontrados`}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Lista completa de todos os pedidos feitos deste endereço IP
                        </DialogDescription>
                    </DialogHeader>
                    
                    {loadingDetails ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-foreground" />
                                <span className="text-muted-foreground">Carregando detalhes...</span>
                            </div>
                        </div>
                    ) : ipDetails ? (
                        <ScrollArea className="max-h-[75vh] pr-4">
                            <div className="space-y-6">
                                {/* Resumo do IP */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Card className="bg-primary/5 border-primary/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Total de Pedidos</p>
                                                    <p className="text-2xl font-bold text-foreground">{ipDetails.total_orders}</p>
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
                                                </div>
                                                <ShoppingBag className="h-8 w-8 text-primary/60" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card className="bg-blue-500/5 border-blue-500/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">IP Analisado</p>
                                                    <p className="text-lg font-bold text-foreground font-mono">{ipDetails.ip}</p>
                                                </div>
                                                <Globe className="h-8 w-8 text-blue-500/60" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card className="bg-amber-500/5 border-amber-500/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Clientes</p>
                                                    <p className="text-2xl font-bold text-foreground">{ipDetails.client_details?.length || 0}</p>
                                                </div>
                                                <Users className="h-8 w-8 text-amber-500/60" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Separator />

                                {/* Lista de Pedidos Individuais */}
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                        <ShoppingBag className="h-5 w-5" />
                                        Pedidos Individuais ({ipDetails.client_details?.length || 0})
                                    </h3>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {ipDetails.client_details?.map((pedido, index) => {
                                            // Determinar status do pedido (corrigido - usa cancelled_at)
                                            const isActive = pedido.cancelled_at == null;
                                            const statusVariant = isActive ? 'default' : 'secondary';
                                            const statusText = isActive ? 'Ativo' : 'Cancelado';
                                            const cardBorder = isActive ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800';
                                            const cardBg = isActive ? 'bg-green-50/30 dark:bg-green-950/10' : 'bg-red-50/30 dark:bg-red-950/10';
                                            
                                            return (
                                                <Card key={`${pedido.order_id}-${index}`} className={`${cardBg} ${cardBorder} hover:shadow-md transition-shadow`}>
                                                    <CardHeader className="pb-3">
                                                        <div className="flex items-center justify-between">
                                                            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                                                Pedido {pedido.order_number || `#${pedido.order_id}`}
                                                                <Badge variant={statusVariant} className="text-xs">
                                                                    {statusText}
                                                                </Badge>
                                                            </CardTitle>
                                                            <Badge variant="outline" className="text-xs bg-background">
                                                                {pedido.financial_status || 'N/A'}
                                                            </Badge>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        {/* Informações do Pedido */}
                                                        <div className="space-y-2">
                                                            <h5 className="font-medium text-sm text-foreground flex items-center gap-1">
                                                                <Calendar className="h-4 w-4" />
                                                                Dados do Pedido
                                                            </h5>
                                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Data</Label>
                                                                    <p className="text-foreground font-medium">{pedido.created_at ? formatDate(pedido.created_at) : 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Valor</Label>
                                                                    <p className="text-foreground font-semibold">{formatCurrency(pedido.total_price, pedido.currency || 'BRL')}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <Separator />
                                                        
                                                        {/* Informações do Cliente */}
                                                        <div className="space-y-2">
                                                            <h5 className="font-medium text-sm text-foreground flex items-center gap-1">
                                                                <Users className="h-4 w-4" />
                                                                Cliente
                                                            </h5>
                                                            <div className="space-y-2 text-sm">
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Nome</Label>
                                                                    <p className="text-foreground">{pedido.customer_name?.trim() || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Email</Label>
                                                                    <p className="text-foreground text-xs break-all">{pedido.customer_email || 'N/A'}</p>
                                                                </div>
                                                                {pedido.customer_phone && (
                                                                    <div>
                                                                        <Label className="text-xs text-muted-foreground">Telefone</Label>
                                                                        <p className="text-foreground">{pedido.customer_phone}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Data de Cancelamento (se aplicável) */}
                                                        {pedido.cancelled_at && (
                                                            <>
                                                                <Separator />
                                                                <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-800">
                                                                    <Label className="text-xs text-red-600 dark:text-red-400">Cancelado em</Label>
                                                                    <p className="text-red-700 dark:text-red-300 text-sm font-medium">{formatDate(pedido.cancelled_at)}</p>
                                                                </div>
                                                            </>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                        {(!ipDetails.client_details || ipDetails.client_details.length === 0) && (
                                            <div className="col-span-full text-center py-8">
                                                <div className="bg-muted/30 rounded-lg p-6">
                                                    <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                                    <p className="text-muted-foreground font-medium">Nenhum pedido encontrado</p>
                                                    <p className="text-xs text-muted-foreground mt-1">Não há dados de pedidos disponíveis para este IP</p>
                                                </div>
                                            </div>
                                        )}
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