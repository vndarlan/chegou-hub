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
import {
    Shield, Globe, Eye, Users, ShoppingBag, AlertCircle, Check, X, RefreshCw,
    Settings, History, Building, Search, Target, Loader2, Calendar, Clock, RotateCcw,
    WifiOff, Server, Zap
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
    
    // Estados para jobs assíncronos
    const [currentJobId, setCurrentJobId] = useState(null);
    const [jobStatus, setJobStatus] = useState(null);
    const [isAsyncOperation, setIsAsyncOperation] = useState(false);
    const [pollingInterval, setPollingInterval] = useState(null);
    const [canCancelJob, setCanCancelJob] = useState(false);
    
    // Estados para retry e loading melhorado
    const [retryAttempt, setRetryAttempt] = useState(0);
    const [operationStartTime, setOperationStartTime] = useState(null);
    const [estimatedTime, setEstimatedTime] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [showRetryDialog, setShowRetryDialog] = useState(false);
    const [lastError, setLastError] = useState(null);
    const [progressValue, setProgressValue] = useState(0);
    
    // Timer para progresso visual
    const [progressTimer, setProgressTimer] = useState(null);
    
    
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
    
    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (progressTimer) {
                clearInterval(progressTimer);
            }
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [progressTimer, pollingInterval]);

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

    // Função para calcular tempo estimado baseado no período
    const calculateEstimatedTime = (days) => {
        if (days <= 7) return 5; // 5 segundos
        if (days <= 30) return 15; // 15 segundos
        if (days <= 90) return 30; // 30 segundos
        return 60; // 1 minuto para períodos maiores
    };
    
    // Função para cancelar job assíncrono
    const cancelAsyncJob = async () => {
        if (!currentJobId) return;
        
        try {
            await axios.post(`/processamento/cancel-job/${currentJobId}/`, {}, {
                headers: {
                    'X-CSRFToken': getCSRFToken()
                },
                timeout: 10000
            });
            
            // Limpar polling
            if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
            }
            
            setCurrentJobId(null);
            setJobStatus(null);
            setIsAsyncOperation(false);
            setCanCancelJob(false);
            setSearchingIPs(false);
            
            toast({
                title: 'Job Cancelado',
                description: 'A operação foi cancelada com sucesso.',
            });
        } catch (error) {
            console.error('Erro ao cancelar job:', error);
            toast({
                title: 'Erro ao Cancelar',
                description: 'Não foi possível cancelar o job. Ele pode ter terminado.',
                variant: 'destructive'
            });
        }
    };
    
    // Função para polling do status do job
    const pollJobStatus = async (jobId) => {
        try {
            const response = await axios.get(`/processamento/async-status/${jobId}/`, {
                timeout: 10000
            });
            
            const status = response.data;
            setJobStatus(status);
            
            // Atualizar progresso baseado no status
            if (status.progress !== undefined) {
                setProgressValue(status.progress);
            }
            
            // Verificar se o job terminou
            if (status.status === 'completed') {
                // Limpar polling
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    setPollingInterval(null);
                }
                
                // Processar resultado
                if (status.result && status.result.success) {
                    setIPGroups(status.result.data.ip_groups || []);
                    const totalFound = status.result.data.total_ips_found || 0;
                    const timeElapsed = Math.round((Date.now() - operationStartTime) / 1000);
                    
                    const successMessage = `${totalFound} IPs encontrados com múltiplos pedidos`;
                    showNotification(`${successMessage} (${timeElapsed}s)`);
                    
                    if (totalFound > 0) {
                        const suspiciousCount = status.result.data.ip_groups?.filter(ip => ip.is_suspicious)?.length || 0;
                        toast({
                            title: '✅ Busca Concluída (Assíncrona)',
                            description: `${totalFound} IPs encontrados${suspiciousCount > 0 ? `, ${suspiciousCount} suspeitos` : ''}. Tempo: ${timeElapsed}s`,
                        });
                    } else {
                        toast({
                            title: '🔍 Busca Concluída (Assíncrona)',
                            description: `Nenhum IP encontrado com múltiplos pedidos nos últimos ${searchParams.days} dias.`,
                        });
                    }
                } else {
                    showNotification(status.result?.message || 'Erro na busca assíncrona', 'error');
                }
                
                // Reset estados
                setCurrentJobId(null);
                setJobStatus(null);
                setIsAsyncOperation(false);
                setCanCancelJob(false);
                setSearchingIPs(false);
                setProgressValue(100);
                
            } else if (status.status === 'failed') {
                // Limpar polling
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    setPollingInterval(null);
                }
                
                const errorMsg = status.error || 'Job falhou';
                showNotification(`Busca assíncrona falhou: ${errorMsg}`, 'error');
                
                // Reset estados
                setCurrentJobId(null);
                setJobStatus(null);
                setIsAsyncOperation(false);
                setCanCancelJob(false);
                setSearchingIPs(false);
                
            } else if (status.status === 'cancelled') {
                // Job foi cancelado
                setCurrentJobId(null);
                setJobStatus(null);
                setIsAsyncOperation(false);
                setCanCancelJob(false);
                setSearchingIPs(false);
                
                showNotification('Operação cancelada', 'error');
            }
            // Para status 'pending' ou 'running', continue polling
            
        } catch (error) {
            console.error('Erro no polling do job:', error);
            
            // Se der erro no polling, parar e resetar
            if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
            }
            
            setCurrentJobId(null);
            setJobStatus(null);
            setIsAsyncOperation(false);
            setCanCancelJob(false);
            setSearchingIPs(false);
            
            showNotification('Erro ao verificar status da operação', 'error');
        }
    };

    // Função para retry com exponential backoff
    const retryWithBackoff = async (operation, maxRetries = 3) => {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                setRetryAttempt(attempt);
                if (attempt > 0) {
                    setIsRetrying(true);
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
                const result = await operation();
                setIsRetrying(false);
                setRetryAttempt(0);
                return result;
            } catch (error) {
                lastError = error;
                setIsRetrying(false);
                
                // Não fazer retry para alguns tipos de erro
                if (error.response?.status === 400 || error.response?.status === 401) {
                    throw error;
                }
                
                if (attempt === maxRetries) {
                    throw error;
                }
            }
        }
        
        throw lastError;
    };

    // Função para tratamento específico de erros
    const handleAPIError = (error, operation = 'operação') => {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.message;
        
        setLastError({ status, message, operation });
        
        let errorMessage;
        let suggestion = '';
        
        switch (status) {
            case 503:
                errorMessage = `Timeout na ${operation}`;
                suggestion = 'O servidor está processando muitos dados. Tente novamente em alguns minutos ou reduza o período de busca.';
                break;
            case 429:
                errorMessage = 'Limite de requisições excedido';
                suggestion = 'O servidor está limitando requisições. Aguarde alguns segundos antes de tentar novamente.';
                break;
            case 202:
                // Job assíncrono iniciado - não é erro
                return 'Operação assíncrona iniciada';
            case 410:
                errorMessage = 'Job não encontrado ou expirado';
                suggestion = 'O job pode ter expirado. Inicie uma nova busca.';
                break;
            case 500:
                errorMessage = 'Erro interno do servidor';
                suggestion = 'Tente com um período menor ou contate o suporte se o problema persistir.';
                break;
            case 400:
                errorMessage = message || `Dados inválidos para a ${operation}`;
                break;
            default:
                if (error.code === 'ECONNABORTED') {
                    errorMessage = `Timeout na ${operation}`;
                    suggestion = 'A operação demorou mais que o esperado. Tente com um período menor.';
                } else if (error.code === 'ERR_NETWORK') {
                    errorMessage = 'Erro de conexão';
                    suggestion = 'Verifique sua conexão com a internet.';
                } else {
                    errorMessage = `Erro na ${operation}: ${message}`;
                }
        }
        
        // Toast com mais detalhes para erros críticos
        if (status === 503 || status === 500 || error.code === 'ECONNABORTED') {
            toast({
                title: 'Operação Falhou',
                description: suggestion || errorMessage,
                variant: 'destructive',
                action: suggestion ? undefined : {
                    altText: 'Tentar novamente',
                    onClick: () => {
                        if (operation === 'busca de IPs') {
                            searchIPDuplicates();
                        }
                    }
                }
            });
        }
        
        return suggestion ? `${errorMessage}. ${suggestion}` : errorMessage;
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
        setOperationStartTime(Date.now());
        setEstimatedTime(calculateEstimatedTime(searchParams.days));
        setLastError(null);
        setProgressValue(0);
        
        // Iniciar progresso visual
        const startTime = Date.now();
        const timer = setInterval(() => {
            setProgressValue(prev => {
                const elapsed = (Date.now() - startTime) / 1000;
                const estimated = calculateEstimatedTime(searchParams.days);
                const newProgress = Math.min((elapsed / estimated) * 90, 90); // Max 90% até completar
                return newProgress;
            });
        }, 500);
        setProgressTimer(timer);

        try {
            const searchOperation = async () => {
                // Usar API otimizada
                return await axios.post('/processamento/buscar-ips-otimizado/', {
                    loja_id: lojaSelecionada,
                    days: searchParams.days,
                    min_orders: 2
                }, {
                    headers: {
                        'X-CSRFToken': getCSRFToken()
                    },
                    timeout: searchParams.days > 30 ? 30000 : 30000 // Timeout consistente para síncrono
                });
            };

            const response = await retryWithBackoff(searchOperation);

            if (response.status === 202) {
                // Operação assíncrona iniciada
                const jobId = response.data.job_id;
                setCurrentJobId(jobId);
                setIsAsyncOperation(true);
                setCanCancelJob(true);
                
                toast({
                    title: '🔄 Operação Assíncrona Iniciada',
                    description: `Processamento em background iniciado. Job ID: ${jobId}`,
                });
                
                // Iniciar polling do status
                const interval = setInterval(() => {
                    pollJobStatus(jobId);
                }, 2000); // Poll a cada 2 segundos
                setPollingInterval(interval);
                
                // Primeiro poll imediato
                setTimeout(() => pollJobStatus(jobId), 500);
                
            } else if (response.data.success) {
                // Operação síncrona concluída
                setIPGroups(response.data.data.ip_groups || []);
                const totalFound = response.data.data.total_ips_found || 0;
                const timeElapsed = Math.round((Date.now() - operationStartTime) / 1000);
                
                const successMessage = `${totalFound} IPs encontrados com múltiplos pedidos`;
                showNotification(`${successMessage} (${timeElapsed}s)`);
                
                // Toast adicional com mais detalhes
                if (totalFound > 0) {
                    const suspiciousCount = response.data.data.ip_groups?.filter(ip => ip.is_suspicious)?.length || 0;
                    toast({
                        title: '✅ Busca Concluída (Síncrona)',
                        description: `${totalFound} IPs encontrados${suspiciousCount > 0 ? `, ${suspiciousCount} suspeitos` : ''}. Tempo: ${timeElapsed}s`,
                    });
                } else {
                    toast({
                        title: '🔍 Busca Concluída (Síncrona)',
                        description: `Nenhum IP encontrado com múltiplos pedidos nos últimos ${searchParams.days} dias.`,
                    });
                }
            } else {
                showNotification(response.data.message || 'Erro na busca', 'error');
            }
        } catch (error) {
            console.error('Erro na busca de IPs:', error);
            const errorMessage = handleAPIError(error, 'busca de IPs');
            
            // Para timeouts e erros de servidor, mostrar opção de retry
            if (error.response?.status === 503 || error.code === 'ECONNABORTED') {
                setShowRetryDialog(true);
            }
            
            showNotification(errorMessage, 'error');
        } finally {
            // Só resetar se não for operação assíncrona
            if (!isAsyncOperation) {
                setSearchingIPs(false);
                setOperationStartTime(null);
                setEstimatedTime(null);
                setProgressValue(100);
                
                // Limpar timer
                if (progressTimer) {
                    clearInterval(progressTimer);
                    setProgressTimer(null);
                }
                
                // Reset progress após um tempo
                setTimeout(() => setProgressValue(0), 1000);
            }
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
        setOperationStartTime(Date.now());
        setLastError(null);

        try {
            const detailsOperation = async () => {
                return await axios.post('/processamento/detalhar-ip/', {
                    loja_id: lojaSelecionada,
                    ip: ipGroup.ip,
                    days: searchParams.days
                }, {
                    headers: {
                        'X-CSRFToken': getCSRFToken()
                    },
                    timeout: Math.max(20000, searchParams.days * 500) // Timeout dinâmico menor para detalhes
                });
            };

            const response = await retryWithBackoff(detailsOperation);

            if (response.data.success) {
                setIPDetails(response.data.data);
                const timeElapsed = Math.round((Date.now() - operationStartTime) / 1000);
                
                if (timeElapsed > 10) {
                    toast({
                        title: 'Detalhes Carregados',
                        description: `Dados do IP ${ipGroup.ip} carregados em ${timeElapsed}s`,
                    });
                }
            } else {
                showNotification(response.data.message || 'Erro ao carregar detalhes', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes do IP:', error);
            const errorMessage = handleAPIError(error, 'carregamento de detalhes');
            showNotification(errorMessage, 'error');
        } finally {
            setLoadingDetails(false);
            setOperationStartTime(null);
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

                                    {/* Lógica de Análise */}
                                    <Card className="bg-card border-border">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-foreground">Lógica de Análise</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
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

            {/* Filtros */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Configuração da Busca
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Configure o período para análise de IPs (mínimo fixo: 2 pedidos por IP)
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
                        <div className="space-y-3 mb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {isRetrying ? (
                                        <RotateCcw className="h-4 w-4 animate-spin text-orange-500" />
                                    ) : isAsyncOperation ? (
                                        <Server className="h-4 w-4 animate-pulse text-blue-500" />
                                    ) : (
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        {isRetrying 
                                            ? `Tentativa ${retryAttempt + 1} - Reconectando...`
                                            : isAsyncOperation
                                                ? 'Processamento assíncrono em andamento...'
                                                : 'Analisando pedidos por endereço IP...'}
                                    </p>
                                    {isAsyncOperation && currentJobId && (
                                        <Badge variant="outline" className="text-xs font-mono">
                                            Job: {currentJobId.slice(-8)}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* Tempo estimado para operações síncronas */}
                                    {!isAsyncOperation && estimatedTime && operationStartTime && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span>
                                                {(() => {
                                                    const elapsed = Math.round((Date.now() - operationStartTime) / 1000);
                                                    const remaining = Math.max(0, estimatedTime - elapsed);
                                                    return remaining > 0 ? `~${remaining}s restantes` : 'Finalizando...';
                                                })()} 
                                            </span>
                                        </div>
                                    )}
                                    
                                    {/* Status do job assíncrono */}
                                    {isAsyncOperation && jobStatus && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <span className="capitalize">{jobStatus.status}</span>
                                                {jobStatus.progress !== undefined && (
                                                    <span>({jobStatus.progress}%)</span>
                                                )}
                                            </div>
                                            {jobStatus.estimated_remaining && (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    <span>~{jobStatus.estimated_remaining}s</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Botão cancelar para jobs assíncronos */}
                                    {canCancelJob && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={cancelAsyncJob}
                                            className="text-xs h-6 px-2"
                                        >
                                            <X className="h-3 w-3 mr-1" />
                                            Cancelar
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Progress 
                                    value={isRetrying ? 100 : Math.max(progressValue, 5)} 
                                    className={`w-full transition-all duration-500 ${
                                        isRetrying ? 'animate-pulse' : isAsyncOperation ? 'animate-pulse' : ''
                                    }`} 
                                />
                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                    <span>
                                        {isRetrying ? 'Reconectando...' :
                                         isAsyncOperation && jobStatus ?
                                            `${jobStatus.status} - ${jobStatus.progress || 0}%` :
                                         progressValue > 0 && progressValue < 90 ? `${Math.round(progressValue)}% concluído` :
                                         progressValue >= 90 ? 'Finalizando...' : 'Iniciando...'}
                                    </span>
                                    {operationStartTime && (
                                        <span>
                                            {Math.round((Date.now() - operationStartTime) / 1000)}s
                                        </span>
                                    )}
                                </div>
                            </div>
                            {searchParams.days > 30 && (
                                <Alert className={`${isAsyncOperation ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10'}`}>
                                    <div className="flex items-center gap-2">
                                        {isAsyncOperation ? (
                                            <Server className="h-4 w-4 text-blue-600" />
                                        ) : searchParams.days > 90 ? (
                                            <Server className="h-4 w-4 text-amber-600" />
                                        ) : (
                                            <Clock className="h-4 w-4 text-amber-600" />
                                        )}
                                    </div>
                                    <AlertDescription className={`text-xs ${isAsyncOperation ? 'text-blue-800 dark:text-blue-200' : 'text-amber-800 dark:text-amber-200'}`}>
                                        <div className="space-y-1">
                                            {isAsyncOperation ? (
                                                <>
                                                    <p><strong>Processamento Assíncrono:</strong> Operação está rodando em background.</p>
                                                    <p>• Você pode acompanhar o progresso em tempo real</p>
                                                    <p>• Use o botão "Cancelar" se necessário</p>
                                                    <p>• Resultado aparecerá automaticamente quando pronto</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p>
                                                        <strong>Período longo ({searchParams.days} dias):</strong> Operação pode ser {searchParams.days > 30 ? 'assíncrona' : 'síncrona'}.
                                                    </p>
                                                    <p>• Sistema otimizado com jobs assíncronos para grandes volumes</p>
                                                    <p>• Períodos > 30 dias usam processamento em background</p>
                                                    <p>• Progresso em tempo real disponível</p>
                                                </>
                                            )}
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}
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
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Análise completa dos pedidos e clientes deste endereço IP
                        </DialogDescription>
                    </DialogHeader>
                    
                    {loadingDetails ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3">
                            <div className="flex items-center gap-2">
                                {isRetrying ? (
                                    <RotateCcw className="h-8 w-8 animate-spin text-orange-500" />
                                ) : (
                                    <Loader2 className="h-8 w-8 animate-spin text-foreground" />
                                )}
                                <span className="text-muted-foreground">
                                    {isRetrying 
                                        ? `Tentativa ${retryAttempt + 1} - Reconectando...`
                                        : 'Carregando detalhes...'}
                                </span>
                            </div>
                            {operationStartTime && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {Math.round((Date.now() - operationStartTime) / 1000)}s decorridos
                                </div>
                            )}
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

                                {/* Lista de Clientes */}
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-4">Dados dos Clientes</h3>
                                    <div className="space-y-3">
                                        {ipDetails.client_details?.map((client, index) => (
                                            <Card key={`${client.order_id}-${index}`} className="bg-muted/20">
                                                <CardContent className="p-4">
                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                        {/* Dados do Pedido */}
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                                                                Pedido #{client.order_number}
                                                                <Badge variant={client.status === 'cancelled' ? 'secondary' : 'default'} className="text-xs">
                                                                    {client.status === 'cancelled' ? 'Cancelado' : 'Ativo'}
                                                                </Badge>
                                                            </h4>
                                                            <div className="space-y-1 text-sm">
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Data</Label>
                                                                    <p className="text-foreground">{client.created_at ? formatDate(client.created_at) : 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Valor</Label>
                                                                    <p className="text-foreground">{formatCurrency(client.total_price, client.currency)}</p>
                                                                </div>
                                                                {client.cancelled_at && (
                                                                    <div>
                                                                        <Label className="text-xs text-muted-foreground">Cancelado em</Label>
                                                                        <p className="text-foreground text-xs">{formatDate(client.cancelled_at)}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Dados do Cliente */}
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-foreground mb-2">Cliente</h4>
                                                            <div className="space-y-1 text-sm">
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Nome</Label>
                                                                    <p className="text-foreground">{client.customer_name?.trim() || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Email</Label>
                                                                    <p className="text-foreground">{client.customer_email || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                                                                    <p className="text-foreground">{client.customer_phone || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Dados de Entrega */}
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-foreground mb-2">Endereço</h4>
                                                            <div className="space-y-1 text-sm">
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Cidade</Label>
                                                                    <p className="text-foreground">{client.shipping_city || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Estado</Label>
                                                                    <p className="text-foreground">{client.shipping_state || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {(!ipDetails.client_details || ipDetails.client_details.length === 0) && (
                                            <div className="text-center py-8">
                                                <p className="text-muted-foreground">Nenhum dado de cliente disponível</p>
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

            {/* Modal de Retry para Timeouts */}
            <Dialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
                <DialogContent className="max-w-md bg-background border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                            Operação Demorou Muito
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            A busca por IPs demorou mais que o esperado. Isso pode acontecer com períodos longos ou muitos dados.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        {lastError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                    <strong>Erro {lastError.status}:</strong> {lastError.message}
                                </AlertDescription>
                            </Alert>
                        )}
                        
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                    <Zap className="h-4 w-4 text-blue-600" />
                                    <div>
                                        <p className="font-medium text-blue-900 dark:text-blue-100">Rápido (7-15 dias)</p>
                                        <p className="text-blue-700 dark:text-blue-300">~5-10s</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                                    <Clock className="h-4 w-4 text-amber-600" />
                                    <div>
                                        <p className="font-medium text-amber-900 dark:text-amber-100">Médio (30-60 dias)</p>
                                        <p className="text-amber-700 dark:text-amber-300">~15-30s</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                                    <Server className="h-4 w-4 text-red-600" />
                                    <div>
                                        <p className="font-medium text-red-900 dark:text-red-100">Longo (90+ dias)</p>
                                        <p className="text-red-700 dark:text-red-300">~1-2min</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>• Período atual: <strong>{searchParams.days} dias</strong></p>
                                <p>• O sistema possui otimizações para grandes volumes</p>
                                <p>• Timeouts são normais com muitos dados - use o retry</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => setShowRetryDialog(false)}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                onClick={() => {
                                    setShowRetryDialog(false);
                                    // Sugerir período menor se for muito longo
                                    if (searchParams.days > 180) {
                                        toast({
                                            title: 'Dica',
                                            description: 'Considere usar um período menor (30-90 dias) para resultados mais rápidos.',
                                        });
                                    }
                                    searchIPDuplicates();
                                }}
                                className="flex-1"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Tentar Novamente
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            </>
        </div>
    );
}

export default DetectorIPPage;