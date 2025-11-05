// frontend/src/features/processamento/DetectorIPPage.js
import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/axios';
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
    Settings, History, Building, Search, Target, Loader2, Calendar, Info
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
    
    // Estados para IPs resolvidos
    const [resolvedIPs, setResolvedIPs] = useState([]);
    const [showResolvedIPs, setShowResolvedIPs] = useState(false);
    const [loadingResolved, setLoadingResolved] = useState(false);
    const [markingIP, setMarkingIP] = useState(null);

    // Estados para IPs em observação
    const [observedIPs, setObservedIPs] = useState([]);
    const [showObservedIPs, setShowObservedIPs] = useState(false);
    const [loadingObserved, setLoadingObserved] = useState(false);
    const [markingObserved, setMarkingObserved] = useState(null);


    
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

    useEffect(() => {
        if (lojaSelecionada) {
            loadResolvedIPs();
            loadObservedIPs();
        }
    }, [lojaSelecionada]); // eslint-disable-line react-hooks/exhaustive-deps
    

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
            const response = await apiClient.get('/processamento/lojas/');
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

        // Validação de limite de dias
        if (searchParams.days < 1) {
            showNotification('O período deve ser de pelo menos 1 dia', 'error');
            return;
        }
        
        if (searchParams.days > 90) {
            showNotification('O período máximo é de 90 dias para garantir sincronização com o backend', 'error');
            // Redefine para 90 dias automaticamente
            setSearchParams(prev => ({ ...prev, days: 90 }));
            return;
        }

        setSearchingIPs(true);
        setIPGroups([]);

        // DEBUG: Log detalhado antes da requisição
        console.log('DEBUG DetectorIP - Iniciando busca...');
        console.log('Dados que serão enviados:', {
            loja_id: lojaSelecionada,
            days: searchParams.days,
            lojaSelecionada_type: typeof lojaSelecionada,
            days_type: typeof searchParams.days
        });
        console.log('🏪 Lojas disponíveis:', lojas);
        console.log('🔑 CSRF Token:', getCSRFToken());

        try {
            // Verificar se temos CSRF token antes de fazer a requisição
            const csrfToken = getCSRFToken();
            if (!csrfToken) {
                console.warn('CSRF Token não encontrado, tentando continuar...');
            }

            console.log('Fazendo requisição para:', '/processamento/buscar-ips-duplicados-simples/');
            
            const response = await apiClient.post('/processamento/buscar-ips-duplicados-simples/', {
                loja_id: parseInt(lojaSelecionada),
                days: parseInt(searchParams.days)
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken && { 'X-CSRFToken': csrfToken })
                },
                timeout: 60000 // Aumentado para 60 segundos
            });

            console.log('Resposta recebida:', response.status, response.statusText);

            if (response.data && response.data.ips_duplicados) {
                // Debug: Log dos dados recebidos do backend
                console.log('Dados do backend:', response.data.ips_duplicados.length, 'IPs encontrados');
                if (response.data.ips_duplicados.length > 0) {
                    console.log('Primeiro IP:', response.data.ips_duplicados[0]);
                }
                
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
                if (mappedIPs.length > 0) {
                    console.log('Dados mapeados (primeiro):', mappedIPs[0]);
                }
                
                setIPGroups(mappedIPs);
                const totalFound = mappedIPs.length;
                showNotification(`${totalFound} IPs encontrados com múltiplos pedidos`);
            } else {
                const errorMessage = response.data?.message || response.data?.error || 'Nenhum resultado encontrado';
                console.log('Resposta sem dados:', errorMessage);
                showNotification(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Erro na busca de IPs:', error);
            
            // Tratamento de erro mais detalhado
            let errorMessage = 'Erro na busca de IPs';
            
            if (error.code === 'ECONNABORTED') {
                errorMessage = 'Timeout: A consulta demorou muito para responder';
            } else if (error.response) {
                // O servidor respondeu com um status de erro
                const status = error.response.status;
                const data = error.response.data;
                
                console.error('Detalhes da resposta de erro:', {
                    status: status,
                    statusText: error.response.statusText,
                    data: data,
                    url: error.config?.url
                });
                
                if (status === 404) {
                    errorMessage = 'Endpoint não encontrado. Verifique se o backend está rodando';
                } else if (status === 403) {
                    errorMessage = 'Erro de autenticação. Verifique o CSRF token';
                } else if (status === 500) {
                    errorMessage = 'Erro interno do servidor';
                } else if (data?.error) {
                    errorMessage = data.error;
                } else if (data?.message) {
                    errorMessage = data.message;
                } else {
                    errorMessage = `Erro ${status}: ${error.response.statusText}`;
                }
            } else if (error.request) {
                // A requisição foi feita mas não houve resposta
                console.error('Erro de rede:', error.request);
                errorMessage = 'Erro de conexão. Verifique se o servidor está rodando';
            } else {
                // Erro na configuração da requisição
                console.error('Erro de configuração:', error.message);
                errorMessage = `Erro de configuração: ${error.message}`;
            }
            
            showNotification(errorMessage, 'error');
        } finally {
            setSearchingIPs(false);
        }
    };

    const openIPDetails = async (ipGroup) => {
        if (!ipGroup?.ip) {
            showNotification('IP inválido', 'error');
            return;
        }

        // Validação adicional para garantir limite de 90 dias
        const validDays = Math.min(Math.max(searchParams.days, 1), 90);

        setSelectedIP(ipGroup);
        setShowIPDetails(true);
        setLoadingDetails(true);
        setIPDetails(null);

        try {
            const response = await apiClient.post('/processamento/detalhar-pedidos-ip/', {
                loja_id: lojaSelecionada,
                ip: ipGroup.ip,
                days: validDays
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
            const response = await apiClient.get(url);
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

    // Funções para gerenciar IPs resolvidos
    const loadResolvedIPs = async () => {
        if (!lojaSelecionada) return;
        
        setLoadingResolved(true);
        try {
            const response = await apiClient.get('/processamento/listar-ips-resolvidos/', {
                params: { loja_id: lojaSelecionada }
            });
            
            if (response.data.success) {
                setResolvedIPs(response.data.resolved_ips || []);
            } else {
                console.error('Erro ao carregar IPs resolvidos:', response.data.error);
            }
        } catch (error) {
            console.error('Erro ao carregar IPs resolvidos:', error);
        } finally {
            setLoadingResolved(false);
        }
    };

    const markIPAsResolved = async (ipGroup) => {
        if (!lojaSelecionada || !ipGroup?.ip) {
            showNotification('Dados insuficientes para marcar IP como resolvido', 'error');
            return;
        }

        setMarkingIP(ipGroup.ip);
        try {
            const response = await apiClient.post('/processamento/marcar-ip-resolvido/', {
                loja_id: parseInt(lojaSelecionada),
                ip_address: ipGroup.ip,
                total_orders: ipGroup.order_count || 0,
                unique_customers: ipGroup.unique_customers || 0,
                notes: 'Marcado como resolvido via interface do detector'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (response.data.success) {
                // Remove IP da lista principal
                setIPGroups(prev => prev.filter(ip => ip.ip !== ipGroup.ip));
                
                // Recarrega lista de IPs resolvidos
                await loadResolvedIPs();
                
                showNotification(`IP ${ipGroup.ip} marcado como resolvido com sucesso`);
            } else {
                showNotification(response.data.error || 'Erro ao marcar IP como resolvido', 'error');
            }
        } catch (error) {
            console.error('Erro ao marcar IP como resolvido:', error);
            showNotification('Erro ao marcar IP como resolvido', 'error');
        } finally {
            setMarkingIP(null);
        }
    };

    const unmarkIPAsResolved = async (ipAddress) => {
        if (!lojaSelecionada || !ipAddress) {
            showNotification('Dados insuficientes para desmarcar IP', 'error');
            return;
        }

        try {
            const response = await apiClient.delete('/processamento/desmarcar-ip-resolvido/', {
                data: {
                    loja_id: parseInt(lojaSelecionada),
                    ip_address: ipAddress
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (response.data.success) {
                // Remove da lista de resolvidos
                setResolvedIPs(prev => prev.filter(ip => ip.ip_address !== ipAddress));

                // Força nova busca para mostrar o IP novamente
                showNotification(`IP ${ipAddress} removido da lista de resolvidos. Execute uma nova busca para vê-lo novamente.`);
            } else {
                showNotification(response.data.error || 'Erro ao desmarcar IP', 'error');
            }
        } catch (error) {
            console.error('Erro ao desmarcar IP:', error);
            showNotification('Erro ao desmarcar IP', 'error');
        }
    };

    // Funções para gerenciar IPs em observação
    const loadObservedIPs = async () => {
        if (!lojaSelecionada) return;

        setLoadingObserved(true);
        try {
            const response = await apiClient.get('/processamento/listar-ips-observacao/', {
                params: { loja_id: lojaSelecionada }
            });

            if (response.data.success) {
                setObservedIPs(response.data.observed_ips || []);
            } else {
                console.error('Erro ao carregar IPs em observação:', response.data.error);
            }
        } catch (error) {
            console.error('Erro ao carregar IPs em observação:', error);
        } finally {
            setLoadingObserved(false);
        }
    };

    const markIPAsObserved = async (ipGroup) => {
        if (!lojaSelecionada || !ipGroup?.ip) {
            showNotification('Dados insuficientes para marcar IP como em observação', 'error');
            return;
        }

        setMarkingObserved(ipGroup.ip);
        try {
            const response = await apiClient.post('/processamento/marcar-ip-observacao/', {
                loja_id: parseInt(lojaSelecionada),
                ip_address: ipGroup.ip,
                total_orders: ipGroup.order_count || 0,
                unique_customers: ipGroup.unique_customers || 0,
                notes: 'Marcado como em observação via interface do detector'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (response.data.success) {
                // Remove IP da lista principal
                setIPGroups(prev => prev.filter(ip => ip.ip !== ipGroup.ip));

                // Recarrega lista de IPs em observação
                await loadObservedIPs();

                showNotification(`IP ${ipGroup.ip} marcado como em observação com sucesso`);
            } else {
                showNotification(response.data.error || 'Erro ao marcar IP como em observação', 'error');
            }
        } catch (error) {
            console.error('Erro ao marcar IP como em observação:', error);
            showNotification('Erro ao marcar IP como em observação', 'error');
        } finally {
            setMarkingObserved(null);
        }
    };

    const unmarkIPAsObserved = async (ipAddress) => {
        if (!lojaSelecionada || !ipAddress) {
            showNotification('Dados insuficientes para desmarcar IP', 'error');
            return;
        }

        try {
            const response = await apiClient.delete('/processamento/desmarcar-ip-observacao/', {
                data: {
                    loja_id: parseInt(lojaSelecionada),
                    ip_address: ipAddress
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (response.data.success) {
                // Remove da lista de observação
                setObservedIPs(prev => prev.filter(ip => ip.ip_address !== ipAddress));

                showNotification(`IP ${ipAddress} removido da lista de observação. Execute uma nova busca para vê-lo novamente.`);
            } else {
                showNotification(response.data.error || 'Erro ao desmarcar IP', 'error');
            }
        } catch (error) {
            console.error('Erro ao desmarcar IP da observação:', error);
            showNotification('Erro ao desmarcar IP', 'error');
        }
    };

    const moveObservedToResolved = async (observedIP) => {
        if (!lojaSelecionada || !observedIP?.ip_address) {
            showNotification('Dados insuficientes para mover IP', 'error');
            return;
        }

        setMarkingIP(observedIP.ip_address);
        try {
            // 1. Marcar como resolvido (com os mesmos dados salvos)
            const markResolvedResponse = await apiClient.post('/processamento/marcar-ip-resolvido/', {
                loja_id: parseInt(lojaSelecionada),
                ip_address: observedIP.ip_address,
                total_orders: observedIP.total_orders_at_observation || 0,
                unique_customers: observedIP.unique_customers_at_observation || 0,
                notes: `Movido de observação para resolvido. ${observedIP.notes || ''}`
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (!markResolvedResponse.data.success) {
                showNotification(markResolvedResponse.data.error || 'Erro ao marcar como resolvido', 'error');
                setMarkingIP(null);
                return;
            }

            // 2. Remover da lista de observação
            const unmarkObservedResponse = await apiClient.delete('/processamento/desmarcar-ip-observacao/', {
                data: {
                    loja_id: parseInt(lojaSelecionada),
                    ip_address: observedIP.ip_address
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (unmarkObservedResponse.data.success) {
                // Atualiza ambas as listas
                await Promise.all([
                    loadResolvedIPs(),
                    loadObservedIPs()
                ]);

                showNotification(`IP ${observedIP.ip_address} movido para resolvidos com sucesso`);
            } else {
                showNotification('IP marcado como resolvido mas não removido da observação. Atualize a página.', 'warning');
                await loadResolvedIPs();
            }
        } catch (error) {
            console.error('Erro ao mover IP para resolvidos:', error);
            showNotification('Erro ao mover IP para resolvidos', 'error');
        } finally {
            setMarkingIP(null);
        }
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
                    <p className="text-muted-foreground">Detecta IPs com CLIENTES DIFERENTES - Ferramenta anti-fraude com busca histórica completa</p>
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
                                <Info className="h-4 w-4" />
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
                                                <p className="text-sm text-muted-foreground">Escolha uma das lojas configuradas na página de Processamento</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">2. Configurar Período</h4>
                                                <p className="text-sm text-muted-foreground">Selecione o período para descobrir IPs candidatos (7 a 90 dias)</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">3. Analisar Resultados</h4>
                                                <p className="text-sm text-muted-foreground">Tabela mostra contagem histórica completa. Use "Ver Detalhes" para investigar</p>
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
                                                <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Como funciona o algoritmo:</h4>
                                                <div className="space-y-3 text-sm text-muted-foreground ml-4">
                                                    <div>
                                                        <strong className="text-foreground">Processo em 2 Etapas:</strong>
                                                        <ul className="ml-4 space-y-1">
                                                            <li>• <strong>Etapa 1:</strong> Busca pedidos no período selecionado para descobrir IPs candidatos</li>
                                                            <li>• <strong>Etapa 2:</strong> Para cada IP candidato, busca TODOS os pedidos históricos</li>
                                                            <li>• Tabela mostra contagem histórica completa, não apenas do período filtrado</li>
                                                            <li>• Garante sincronização perfeita entre tabela e detalhes</li>
                                                        </ul>
                                                    </div>
                                                    
                                                    <div>
                                                        <strong className="text-foreground">Critério de Detecção:</strong>
                                                        <ul className="ml-4 space-y-1">
                                                            <li>• Identifica APENAS IPs onde há CLIENTES DIFERENTES fazendo pedidos</li>
                                                            <li>• Mesmo cliente com múltiplos pedidos = comportamento normal (ignorado)</li>
                                                            <li>• Inclui TODOS os pedidos (ativos, cancelados, reembolsados)</li>
                                                            <li>• Usa apenas pedidos com note_attributes "IP address"</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <Separator />
                                            
                                            <div>
                                                <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">Casos de Uso Principais:</h4>
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
                                                <h4 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">Fonte de Dados (Simplificada):</h4>
                                                <div className="text-sm text-muted-foreground ml-4 space-y-1">
                                                    <p>• <strong className="text-foreground">ÚNICA FONTE:</strong> note_attributes "IP address" (98% confiável)</p>
                                                    <p>• <strong className="text-foreground">Sem fallbacks:</strong> Se não tiver IP address, pedido é ignorado</p>
                                                    <p>• <strong className="text-foreground">Dados históricos:</strong> Busca completa em ~10 anos de pedidos</p>
                                                    <p>• <strong className="text-foreground">Status real:</strong> Inclui ativos, cancelados e reembolsados</p>
                                                </div>
                                            </div>
                                            
                                            <Separator />
                                            
                                            <div>
                                                <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">Importante Saber:</h4>
                                                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                                                    <li>• <strong className="text-foreground">Dependência Crítica:</strong> Funciona APENAS com note_attributes "IP address" configurado</li>
                                                    <li>• <strong className="text-foreground">Contexto é Essencial:</strong> IPs legítimos podem ter múltiplos clientes (escritórios, famílias)</li>
                                                    <li>• <strong className="text-foreground">Busca Histórica:</strong> Contagens mostram TODOS os pedidos, não apenas do período</li>
                                                    <li>• <strong className="text-foreground">VPNs e Proxies:</strong> Podem mascarar IPs reais e gerar alertas falsos</li>
                                                    <li>• <strong className="text-foreground">Análise Manual:</strong> Sempre investigar os casos encontrados individualmente</li>
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
                            <SelectItem value="90">90 dias (máximo)</SelectItem>
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
                                                        <div className="flex items-center gap-2 justify-end">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => markIPAsObserved(ipGroup)}
                                                                disabled={markingObserved === ipGroup.ip}
                                                                className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 border-amber-200"
                                                            >
                                                                {markingObserved === ipGroup.ip ? (
                                                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                                ) : (
                                                                    <Eye className="h-4 w-4 mr-1" />
                                                                )}
                                                                Observação
                                                            </Button>

                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => markIPAsResolved(ipGroup)}
                                                                disabled={markingIP === ipGroup.ip}
                                                                className="text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200"
                                                            >
                                                                {markingIP === ipGroup.ip ? (
                                                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                                ) : (
                                                                    <Check className="h-4 w-4 mr-1" />
                                                                )}
                                                                Resolvido
                                                            </Button>

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
                                                        </div>
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

            {/* Seção de IPs Resolvidos */}
            {resolvedIPs.length > 0 && (
                <Card className="bg-green-50/30 dark:bg-green-950/10 border-green-200 dark:border-green-800 border-dashed">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                                <Check className="h-4 w-4" />
                                IPs Resolvidos ({resolvedIPs.length})
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowResolvedIPs(!showResolvedIPs)}
                                className="h-6 px-2 text-xs text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                            >
                                {showResolvedIPs ? 'Ocultar' : 'Mostrar'}
                            </Button>
                        </div>
                    </CardHeader>

                    {showResolvedIPs && (
                        <CardContent className="pt-0">
                            <div className="space-y-3">
                                {resolvedIPs.map((resolvedIP, index) => (
                                    <Card key={`${resolvedIP.ip_address}-${index}`}
                                          className="bg-background border-green-200 dark:border-green-800">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono font-medium text-foreground">{resolvedIP.ip_address}</span>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span>{resolvedIP.total_orders_at_resolution} pedidos</span>
                                                        <span>{resolvedIP.unique_customers_at_resolution} clientes</span>
                                                        <span>{formatDate(resolvedIP.resolved_at)}</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => unmarkIPAsResolved(resolvedIP.ip_address)}
                                                    className="h-6 px-2 text-xs text-muted-foreground hover:text-red-600"
                                                >
                                                    <X className="h-3 w-3 mr-1" />
                                                    Remover
                                                </Button>
                                            </div>
                                        </CardHeader>

                                        {/* Dados dos Clientes */}
                                        {resolvedIP.client_data && resolvedIP.client_data.client_details && resolvedIP.client_data.client_details.length > 0 && (
                                            <CardContent className="pt-0">
                                                <div className="border-t border-green-200 dark:border-green-800 pt-3">
                                                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                                        <Users className="h-4 w-4" />
                                                        Clientes ({resolvedIP.client_data.client_details.length})
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {resolvedIP.client_data.client_details.map((client, idx) => (
                                                            <div key={`${client.order_id}-${idx}`}
                                                                 className="p-3 bg-muted/30 rounded border text-sm">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="font-medium text-foreground">
                                                                        Pedido {client.order_number || `#${client.order_id}`}
                                                                    </span>
                                                                    <Badge variant={client.cancelled_at ? 'secondary' : 'default'} className="text-xs">
                                                                        {client.cancelled_at ? 'Cancelado' : 'Ativo'}
                                                                    </Badge>
                                                                </div>
                                                                <div className="space-y-1 text-xs text-muted-foreground">
                                                                    <p><strong>Cliente:</strong> {client.customer_name}</p>
                                                                    <p><strong>Email:</strong> {client.customer_email}</p>
                                                                    {client.customer_phone && <p><strong>Telefone:</strong> {client.customer_phone}</p>}
                                                                    <p><strong>Valor:</strong> {formatCurrency(client.total_price, client.currency)}</p>
                                                                    <p><strong>Data:</strong> {formatDate(client.created_at)}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Seção de IPs em Observação */}
            {observedIPs.length > 0 && (
                <Card className="bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800 border-dashed">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                IPs em Observação ({observedIPs.length})
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowObservedIPs(!showObservedIPs)}
                                className="h-6 px-2 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300"
                            >
                                {showObservedIPs ? 'Ocultar' : 'Mostrar'}
                            </Button>
                        </div>
                    </CardHeader>

                    {showObservedIPs && (
                        <CardContent className="pt-0">
                            <div className="space-y-3">
                                {observedIPs.map((observedIP, index) => (
                                    <Card key={`${observedIP.ip_address}-${index}`}
                                          className="bg-background border-amber-200 dark:border-amber-800">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono font-medium text-foreground">{observedIP.ip_address}</span>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span>{observedIP.total_orders_at_observation} pedidos</span>
                                                        <span>{observedIP.unique_customers_at_observation} clientes</span>
                                                        <span>{formatDate(observedIP.observed_at)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {/* NOVO BOTÃO - Resolvido */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => moveObservedToResolved(observedIP)}
                                                        disabled={markingIP === observedIP.ip_address}
                                                        className="h-6 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    >
                                                        {markingIP === observedIP.ip_address ? (
                                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                        ) : (
                                                            <Check className="h-3 w-3 mr-1" />
                                                        )}
                                                        Resolvido
                                                    </Button>

                                                    {/* Botão Remover existente */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => unmarkIPAsObserved(observedIP.ip_address)}
                                                        className="h-6 px-2 text-xs text-muted-foreground hover:text-red-600"
                                                    >
                                                        <X className="h-3 w-3 mr-1" />
                                                        Remover
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        {/* Dados dos Clientes */}
                                        {observedIP.client_data && observedIP.client_data.client_details && observedIP.client_data.client_details.length > 0 && (
                                            <CardContent className="pt-0">
                                                <div className="border-t border-amber-200 dark:border-amber-800 pt-3">
                                                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                                        <Users className="h-4 w-4" />
                                                        Clientes ({observedIP.client_data.client_details.length})
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {observedIP.client_data.client_details.map((client, idx) => (
                                                            <div key={`${client.order_id}-${idx}`}
                                                                 className="p-3 bg-muted/30 rounded border text-sm">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="font-medium text-foreground">
                                                                        Pedido {client.order_number || `#${client.order_id}`}
                                                                    </span>
                                                                    <Badge variant={client.cancelled_at ? 'secondary' : 'default'} className="text-xs">
                                                                        {client.cancelled_at ? 'Cancelado' : 'Ativo'}
                                                                    </Badge>
                                                                </div>
                                                                <div className="space-y-1 text-xs text-muted-foreground">
                                                                    <p><strong>Cliente:</strong> {client.customer_name}</p>
                                                                    <p><strong>Email:</strong> {client.customer_email}</p>
                                                                    {client.customer_phone && <p><strong>Telefone:</strong> {client.customer_phone}</p>}
                                                                    <p><strong>Valor:</strong> {formatCurrency(client.total_price, client.currency)}</p>
                                                                    <p><strong>Data:</strong> {formatDate(client.created_at)}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    )}
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
                                                    <span>Analisados: {log.pedidos_encontrados}</span>
                                                )}
                                                {log.detalhes && (
                                                    <span>{typeof log.detalhes === 'object' ? JSON.stringify(log.detalhes) : log.detalhes}</span>
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