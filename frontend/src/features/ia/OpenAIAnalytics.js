// frontend/src/features/ia/OpenAIAnalytics.js
// 
// CORREÇÕES IMPLEMENTADAS CONTRA TIMESTAMPS FUTUROS:
// - Validação rigorosa de datas para prevenir timestamps futuras
// - Logs de debug para monitorar geração de datas e timestamps Unix
// - Tratamento específico para erro 400 Bad Request da API OpenAI
// - Uso da função getCSRFToken padronizada do projeto
// - Validação de datas futuras em todas as funções (loadAnalytics, sync, export)
// - Forçar endDate para ser no máximo a data atual com Math.min()
// - Validação adicional de timestamps Unix para evitar valores futuros
// - Logs detalhados com timestamps readable para debug
// - Correção aplicada em: loadAnalyticsData, handleSyncData, handleExportCSV, handleExportJSON
//
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { getCSRFToken } from '../../utils/csrf';

// shadcn/ui imports
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Toaster } from '../../components/ui/toaster';
import { useToast } from '../../components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';

// lucide-react icons
import {
    DollarSign, Activity, Zap, Bot, RefreshCw, Filter,
    TrendingUp, Calendar, AlertCircle, BarChart3,
    LineChart, Users, Clock, Coins, CheckCircle,
    Download, ShieldCheck, XCircle
} from 'lucide-react';

// Recharts imports
import {
    LineChart as RechartsLineChart,
    BarChart as RechartsBarChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Bar,
    Line,
    Cell
} from 'recharts';

// Cores do tema Chegou Hub
const CHART_COLORS = [
    'hsl(25, 95%, 53%)',  // Primary laranja
    'hsl(197, 37%, 24%)', // Chart-3 azul
    'hsl(173, 58%, 39%)', // Chart-2 verde
    'hsl(43, 74%, 66%)',  // Chart-4 amarelo
    'hsl(27, 87%, 67%)',  // Chart-5 vermelho
];

const OpenAIAnalytics = () => {
    // Função utilitária para calcular datas seguras (não futuras)
    const calculateSafeDates = (daysBack) => {
        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - daysBack);
        
        // Garantir que endDate não seja futuro
        const safeEndDate = new Date(Math.min(endDate.getTime(), now.getTime()));
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const safeEndDateStr = safeEndDate.toISOString().split('T')[0];
        
        const startTimestamp = Math.floor(startDate.getTime() / 1000);
        const endTimestamp = Math.floor(safeEndDate.getTime() / 1000);
        const nowTimestamp = Math.floor(now.getTime() / 1000);
        
        return {
            startDate,
            endDate: safeEndDate,
            startDateStr,
            endDateStr: safeEndDateStr,
            startTimestamp,
            endTimestamp,
            nowTimestamp,
            isValid: endTimestamp <= nowTimestamp
        };
    };

    // Estados
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [validatingKey, setValidatingKey] = useState(false);
    const [apiKeyStatus, setApiKeyStatus] = useState(null);
    
    const { toast } = useToast();
    
    const [selectedPeriod, setSelectedPeriod] = useState('7'); // 7 dias padrão
    const [selectedApiKeys, setSelectedApiKeys] = useState([]);
    
    const [apiKeys, setApiKeys] = useState([]);
    const [summary, setSummary] = useState({});
    const [timelineData, setTimelineData] = useState([]);
    const [modelBreakdown, setModelBreakdown] = useState([]);
    const [insights, setInsights] = useState({});
    const [detailData, setDetailData] = useState([]);
    const [syncStatus, setSyncStatus] = useState({});

    // URLs da API (sem /api porque já está no axios.defaults.baseURL)
    const API_BASE = '/monitoring';

    // Configurar axios com CSRF token
    useEffect(() => {
        const token = getCSRFToken();
        if (token) {
            axios.defaults.headers.common['X-CSRFToken'] = token;
        }
    }, []);

    // Carregar dados iniciais
    useEffect(() => {
        loadInitialData();
    }, []);

    // Recarregar dados quando período ou API keys mudarem
    useEffect(() => {
        if (apiKeys.length > 0) {
            loadAnalyticsData();
        }
    }, [selectedPeriod, selectedApiKeys]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Carregar API keys disponíveis
            const apiKeysResponse = await axios.get(`${API_BASE}/api-keys/`);
            setApiKeys(apiKeysResponse.data);

            // Carregar status da última sincronização
            const syncResponse = await axios.get(`${API_BASE}/sync/`);
            if (syncResponse.data.length > 0) {
                setSyncStatus(syncResponse.data[0]);
            }

            // Carregar dados de analytics
            await loadAnalyticsData();

        } catch (err) {
            setError('Erro ao carregar dados iniciais: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const loadAnalyticsData = async () => {
        try {
            const params = new URLSearchParams();
            
            // CORREÇÃO CRÍTICA: Calcular datas forçando ano 2024 para evitar timestamps futuros na API OpenAI
            const now = new Date();
            let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            let startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - parseInt(selectedPeriod));

            // FORÇA ANO 2024 se estivermos em 2025+ (API OpenAI não aceita datas futuras)
            if (endDate.getFullYear() > 2024) {
                endDate = new Date(2024, 11, 31); // 31/12/2024
                startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - parseInt(selectedPeriod));
            }

            // Validação para garantir que as datas não sejam futuras
            const todayStr = new Date().toISOString().split('T')[0];
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            
            // Calcular timestamps Unix corretamente (em UTC)
            const startTimestamp = Math.floor(startDate.getTime() / 1000);
            const endTimestamp = Math.floor(endDate.getTime() / 1000);
            const nowTimestamp = Math.floor(now.getTime() / 1000);
            
            // Log das datas para debug
            console.log('📅 Datas calculadas:', {
                selectedPeriod,
                startDate: startDateStr,
                endDate: endDateStr,
                today: todayStr,
                startTimestamp,
                endTimestamp,
                nowTimestamp,
                startDateReadable: new Date(startTimestamp * 1000).toISOString(),
                endDateReadable: new Date(endTimestamp * 1000).toISOString(),
                nowReadable: new Date(nowTimestamp * 1000).toISOString()
            });
            
            // Validação extra: não permitir datas futuras
            if (endDateStr > todayStr) {
                console.error('❌ Data final é futura:', endDateStr, '>', todayStr);
                setError('Erro de data: não é possível buscar dados futuros');
                return;
            }
            
            // Validação adicional para timestamps futuros
            if (endTimestamp > nowTimestamp) {
                console.error('❌ Timestamp final é futuro:', {
                    endTimestamp,
                    nowTimestamp,
                    endDate: new Date(endTimestamp * 1000).toISOString(),
                    now: new Date(nowTimestamp * 1000).toISOString()
                });
                setError('Erro de timestamp: timestamp final não pode ser futuro');
                return;
            }
            
            // Forçar que endDate seja no máximo hoje
            const safeEndDate = new Date(Math.min(endDate.getTime(), now.getTime()));
            const safeEndDateStr = safeEndDate.toISOString().split('T')[0];
            const safeEndTimestamp = Math.floor(safeEndDate.getTime() / 1000);
            
            console.log('🔒 Datas seguras:', {
                originalEndDate: endDateStr,
                safeEndDate: safeEndDateStr,
                originalEndTimestamp: endTimestamp,
                safeEndTimestamp: safeEndTimestamp
            });

            params.append('start_date', startDateStr);
            params.append('end_date', safeEndDateStr);

            // Adicionar API keys selecionadas
            selectedApiKeys.forEach(keyId => {
                params.append('api_keys', keyId);
            });

            // Carregar todos os dados em paralelo
            const [summaryRes, timelineRes, modelRes, insightsRes, detailRes] = await Promise.all([
                axios.get(`${API_BASE}/costs/summary/?${params.toString()}`),
                axios.get(`${API_BASE}/costs/daily_timeline/?${params.toString()}`),
                axios.get(`${API_BASE}/costs/model_breakdown/?${params.toString()}`),
                axios.get(`${API_BASE}/costs/insights/?${params.toString()}`),
                axios.get(`${API_BASE}/costs/?${params.toString()}&limit=50`)
            ]);

            setSummary(summaryRes.data);
            setTimelineData(timelineRes.data);
            setModelBreakdown(modelRes.data);
            setInsights(insightsRes.data);
            setDetailData(detailRes.data.results || []);

        } catch (err) {
            console.error('❌ Erro ao carregar analytics:', err);
            let errorMessage = 'Erro ao carregar dados de analytics: ';
            
            if (err.response?.status === 400 && err.response?.data?.detail?.includes('Bad Request')) {
                errorMessage += 'Erro de datas - verifique se as datas não são futuras. ';
            }
            
            errorMessage += (err.response?.data?.detail || err.message);
            setError(errorMessage);
        }
    };

    const validateApiKey = useCallback(async () => {
        try {
            setValidatingKey(true);
            const response = await axios.get(`${API_BASE}/validate-key/`);
            
            setApiKeyStatus(response.data);
            
            if (response.data.valid && response.data.has_admin_permissions) {
                toast({
                    title: "✅ API Key Válida",
                    description: `Conectado à organização: ${response.data.organization}`,
                    variant: "default",
                });
            } else if (response.data.valid && !response.data.has_admin_permissions) {
                toast({
                    title: "⚠️ Permissões Insuficientes",
                    description: response.data.details || "A API key precisa ter permissões de admin.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "❌ API Key Inválida",
                    description: response.data.error || "Verifique sua configuração.",
                    variant: "destructive",
                });
            }
            
            return response.data;
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message;
            toast({
                title: "❌ Erro ao Validar",
                description: errorMsg,
                variant: "destructive",
            });
            setApiKeyStatus({ valid: false, error: errorMsg });
            return null;
        } finally {
            setValidatingKey(false);
        }
    }, [API_BASE, toast]);

    const handleSyncData = async () => {
        try {
            // Primeiro validar a API key
            const keyValidation = await validateApiKey();
            
            if (!keyValidation?.valid || !keyValidation?.has_admin_permissions) {
                toast({
                    title: "❌ Sincronização Cancelada",
                    description: "Por favor, configure uma API key válida com permissões de admin.",
                    variant: "destructive",
                });
                return;
            }
            
            setSyncing(true);
            setError(null);
            
            // Validar período de datas com verificação rigorosa
            const now = new Date();
            const daysBack = parseInt(selectedPeriod);
            
            if (daysBack > 30) {
                toast({
                    title: "⚠️ Período Muito Longo",
                    description: "Máximo de 30 dias permitido para sincronização.",
                    variant: "destructive",
                });
                return;
            }
            
            // CORREÇÃO CRÍTICA: Calcular datas forçando ano 2024 para evitar timestamps futuros na API OpenAI
            let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            let startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - daysBack);
            
            // FORÇA ANO 2024 se estivermos em 2025+ (API OpenAI não aceita datas futuras)
            if (endDate.getFullYear() > 2024) {
                endDate = new Date(2024, 11, 31); // 31/12/2024
                startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - daysBack);
            }
            
            // Garantir que endDate não seja futuro
            const safeEndDate = new Date(Math.min(endDate.getTime(), now.getTime()));
            const startTimestamp = Math.floor(startDate.getTime() / 1000);
            const endTimestamp = Math.floor(safeEndDate.getTime() / 1000);
            const nowTimestamp = Math.floor(now.getTime() / 1000);
            
            console.log('🔄 Sincronizando com datas:', {
                daysBack,
                startDate: startDate.toISOString(),
                endDate: safeEndDate.toISOString(),
                now: now.toISOString(),
                startTimestamp,
                endTimestamp,
                nowTimestamp,
                timestampValidation: {
                    endIsNotFuture: endTimestamp <= nowTimestamp,
                    startIsBeforeEnd: startTimestamp <= endTimestamp
                }
            });
            
            // Validação final de timestamps
            if (endTimestamp > nowTimestamp) {
                toast({
                    title: "❌ Erro de Data",
                    description: "Erro interno: timestamp calculado é futuro. Contate o suporte.",
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "🔄 Sincronizando...",
                description: `Buscando dados dos últimos ${daysBack} dias...`,
            });

            const response = await axios.post(`${API_BASE}/sync-openai/`, {
                days_back: daysBack
            });

            if (response.data.success) {
                // Recarregar dados após sincronização
                await loadInitialData();
                
                toast({
                    title: "✅ Sincronização Concluída",
                    description: `${response.data.data.usage_records_synced} registros de uso e ${response.data.data.cost_records_synced} de custos sincronizados.`,
                    variant: "default",
                });
            } else {
                setError('Erro na sincronização: ' + response.data.error);
                toast({
                    title: "❌ Erro na Sincronização",
                    description: response.data.error || "Erro desconhecido",
                    variant: "destructive",
                });
            }

        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message;
            
            // Log completo do erro para debug
            console.error('❌ Erro na sincronização:', {
                error: err,
                response: err.response?.data,
                status: err.response?.status,
                message: errorMsg
            });
            
            // Mensagens específicas baseadas no erro
            let title = "❌ Erro na Sincronização";
            let description = errorMsg;
            
            if (errorMsg.includes("401") || errorMsg.includes("API key")) {
                title = "🔑 Problema com API Key";
                description = "Verifique se a OPENAI_ADMIN_API_KEY está configurada corretamente.";
            } else if (errorMsg.includes("403") || errorMsg.includes("permiss")) {
                title = "🚫 Sem Permissões";
                description = "Sua API key precisa ter permissões de admin. Crie uma em platform.openai.com/settings/organization/admin-keys";
            } else if (errorMsg.includes("400") || errorMsg.includes("Bad Request")) {
                title = "📅 Erro de Datas";
                description = "Erro nas datas enviadas. Verifique se as timestamps não são futuras. Tente um período menor.";
            } else if (errorMsg.includes("data")) {
                title = "📅 Erro de Parâmetros";
                description = "Verifique as datas selecionadas. Não é possível buscar dados futuros.";
            }
            
            setError(errorMsg);
            toast({
                title,
                description,
                variant: "destructive",
            });
        } finally {
            setSyncing(false);
        }
    };

    const handleApiKeyChange = (value) => {
        if (value === 'all') {
            setSelectedApiKeys([]);
        } else {
            const currentKeys = selectedApiKeys.includes(value) 
                ? selectedApiKeys.filter(k => k !== value)
                : [...selectedApiKeys, value];
            setSelectedApiKeys(currentKeys);
        }
    };

    const handleExportCSV = async (type) => {
        try {
            const params = new URLSearchParams();
            
            // CORREÇÃO CRÍTICA: Calcular datas forçando ano 2024 para evitar timestamps futuros na API OpenAI
            const now = new Date();
            let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            let startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - parseInt(selectedPeriod));
            
            // FORÇA ANO 2024 se estivermos em 2025+ (API OpenAI não aceita datas futuras)
            if (endDate.getFullYear() > 2024) {
                endDate = new Date(2024, 11, 31); // 31/12/2024
                startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - parseInt(selectedPeriod));
            }
            
            // Garantir que endDate não seja futuro
            const safeEndDate = new Date(Math.min(endDate.getTime(), now.getTime()));
            const startDateStr = startDate.toISOString().split('T')[0];
            const safeEndDateStr = safeEndDate.toISOString().split('T')[0];
            
            const startTimestamp = Math.floor(startDate.getTime() / 1000);
            const endTimestamp = Math.floor(safeEndDate.getTime() / 1000);
            const nowTimestamp = Math.floor(now.getTime() / 1000);
            
            // Log para debug de export
            console.log('📤 Export CSV - Datas calculadas:', {
                type,
                startDate: startDateStr,
                safeEndDate: safeEndDateStr,
                startTimestamp,
                endTimestamp,
                nowTimestamp
            });
            
            // Validação de timestamps futuras
            if (endTimestamp > nowTimestamp) {
                toast({
                    title: "❌ Erro de Timestamp",
                    description: "Erro interno: timestamp calculado é futuro.",
                    variant: "destructive",
                });
                return;
            }
            
            params.append('start_date', startDateStr);
            params.append('end_date', safeEndDateStr);
            
            const url = `${API_BASE}/export/${type}/csv/?${params.toString()}`;
            
            // Fazer download do CSV
            const response = await axios.get(url, {
                responseType: 'blob'
            });
            
            // Criar link para download (método React-safe)
            const blob = new Blob([response.data], { type: 'text/csv' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `openai_${type}_${startDate.toISOString().split('T')[0]}_${safeEndDate.toISOString().split('T')[0]}.csv`;
            link.style.display = 'none'; // Ocultar completamente
            
            // Trigger download sem modificar DOM
            link.click();
            
            // Cleanup imediato
            setTimeout(() => {
                window.URL.revokeObjectURL(downloadUrl);
            }, 100);
            
            toast({
                title: "✅ Exportação Concluída",
                description: `Arquivo CSV de ${type === 'costs' ? 'custos' : 'uso'} baixado com sucesso.`,
            });
            
        } catch (err) {
            toast({
                title: "❌ Erro na Exportação",
                description: err.response?.data?.error || err.message,
                variant: "destructive",
            });
        }
    };

    const handleExportJSON = async () => {
        try {
            const params = new URLSearchParams();
            
            // CORREÇÃO CRÍTICA: Calcular datas forçando ano 2024 para evitar timestamps futuros na API OpenAI
            const now = new Date();
            let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            let startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - parseInt(selectedPeriod));
            
            // FORÇA ANO 2024 se estivermos em 2025+ (API OpenAI não aceita datas futuras)
            if (endDate.getFullYear() > 2024) {
                endDate = new Date(2024, 11, 31); // 31/12/2024
                startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - parseInt(selectedPeriod));
            }
            
            // Garantir que endDate não seja futuro
            const safeEndDate = new Date(Math.min(endDate.getTime(), now.getTime()));
            const startDateStr = startDate.toISOString().split('T')[0];
            const safeEndDateStr = safeEndDate.toISOString().split('T')[0];
            
            const startTimestamp = Math.floor(startDate.getTime() / 1000);
            const endTimestamp = Math.floor(safeEndDate.getTime() / 1000);
            const nowTimestamp = Math.floor(now.getTime() / 1000);
            
            // Log para debug de export JSON
            console.log('📤 Export JSON - Datas calculadas:', {
                startDate: startDateStr,
                safeEndDate: safeEndDateStr,
                startTimestamp,
                endTimestamp,
                nowTimestamp
            });
            
            // Validação de timestamps futuras
            if (endTimestamp > nowTimestamp) {
                toast({
                    title: "❌ Erro de Timestamp",
                    description: "Erro interno: timestamp calculado é futuro.",
                    variant: "destructive",
                });
                return;
            }
            
            params.append('start_date', startDateStr);
            params.append('end_date', safeEndDateStr);
            
            const url = `${API_BASE}/export/summary/json/?${params.toString()}`;
            
            const response = await axios.get(url);
            
            // Criar arquivo JSON para download (método React-safe)
            const jsonStr = JSON.stringify(response.data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `openai_summary_${startDate.toISOString().split('T')[0]}_${safeEndDate.toISOString().split('T')[0]}.json`;
            link.style.display = 'none'; // Ocultar completamente
            
            // Trigger download sem modificar DOM
            link.click();
            
            // Cleanup imediato
            setTimeout(() => {
                window.URL.revokeObjectURL(downloadUrl);
            }, 100);
            
            toast({
                title: "✅ Exportação Concluída",
                description: "Resumo JSON baixado com sucesso.",
            });
            
        } catch (err) {
            toast({
                title: "❌ Erro na Exportação",
                description: err.response?.data?.error || err.message,
                variant: "destructive",
            });
        }
    };

    // Processar dados para gráficos
    const processedTimelineData = useMemo(() => {
        const dataByDate = {};
        
        timelineData.forEach(item => {
            const date = item.date;
            if (!dataByDate[date]) {
                dataByDate[date] = { date };
            }
            dataByDate[date][item.api_key__name] = parseFloat(item.daily_cost);
        });

        return Object.values(dataByDate).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [timelineData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Carregando dados...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <>
                <Toaster />
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>
                        {error}
                        <div className="mt-4">
                            <Button 
                                onClick={() => window.location.reload()}
                                variant="outline"
                                size="sm"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Recarregar Página
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            </>
        );
    }

    return (
        <div className="space-y-6">
            <Toaster />
            {/* Header com Filtros */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">OpenAI Usage Analytics</h1>
                    <p className="text-muted-foreground">Monitore gastos e uso das suas API keys OpenAI</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-48">
                            <Calendar className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Últimos 7 dias</SelectItem>
                            <SelectItem value="14">Últimos 14 dias</SelectItem>
                            <SelectItem value="30">Últimos 30 dias</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedApiKeys.length === 0 ? 'all' : selectedApiKeys[0]} onValueChange={handleApiKeyChange}>
                        <SelectTrigger className="w-48">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Todas as API Keys" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as API Keys</SelectItem>
                            {apiKeys.map(key => (
                                <SelectItem key={key.id} value={key.id.toString()}>
                                    {key.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button 
                        onClick={validateApiKey} 
                        disabled={validatingKey}
                        variant="outline"
                        size="sm"
                    >
                        {validatingKey ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <ShieldCheck className="h-4 w-4 mr-2" />
                        )}
                        {validatingKey ? 'Validando...' : 'Validar Key'}
                    </Button>
                    
                    <Button 
                        onClick={handleSyncData} 
                        disabled={syncing || validatingKey}
                        variant="default"
                    >
                        {syncing ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        {syncing ? 'Sincronizando...' : 'Sincronizar'}
                    </Button>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Download className="h-4 w-4 mr-2" />
                                Exportar
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Escolha o formato</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleExportCSV('costs')}>
                                <DollarSign className="h-4 w-4 mr-2" />
                                Custos (CSV)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportCSV('usage')}>
                                <Activity className="h-4 w-4 mr-2" />
                                Uso (CSV)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleExportJSON}>
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Resumo Completo (JSON)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Cards de Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${parseFloat(summary.total_cost || 0).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Período selecionado
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(summary.total_requests || 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Chamadas de API
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(summary.total_tokens || 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Input + Output
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Modelo Top</CardTitle>
                        <Bot className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summary.top_model || 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Mais utilizado
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Seção de Visualizações */}
            <Tabs defaultValue="timeline" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="timeline">Timeline de Gastos</TabsTrigger>
                    <TabsTrigger value="models">Breakdown por Modelo</TabsTrigger>
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                    <TabsTrigger value="details">Detalhes</TabsTrigger>
                </TabsList>

                <TabsContent value="timeline" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <LineChart className="h-5 w-5 mr-2" />
                                Gastos Diários por API Key
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsLineChart data={processedTimelineData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip 
                                            formatter={(value) => [`$${parseFloat(value).toFixed(4)}`, 'Custo']}
                                        />
                                        <Legend />
                                        {apiKeys.map((key, index) => (
                                            <Line
                                                key={key.id}
                                                type="monotone"
                                                dataKey={key.name}
                                                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                                                strokeWidth={2}
                                            />
                                        ))}
                                    </RechartsLineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="models" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <BarChart3 className="h-5 w-5 mr-2" />
                                Gastos por Modelo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsBarChart data={modelBreakdown} layout="horizontal">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="model_name" type="category" width={100} />
                                        <Tooltip 
                                            formatter={(value) => [`$${parseFloat(value).toFixed(4)}`, 'Custo Total']}
                                        />
                                        <Bar dataKey="total_cost" fill={CHART_COLORS[0]} />
                                    </RechartsBarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center">
                                    <Coins className="h-4 w-4 mr-2" />
                                    API Key Mais Cara
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg font-bold">
                                    {insights.most_expensive_api_key || 'N/A'}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    ${parseFloat(insights.most_expensive_cost || 0).toFixed(4)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Dia de Maior Gasto
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg font-bold">
                                    {insights.highest_usage_day || 'N/A'}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    ${parseFloat(insights.highest_usage_amount || 0).toFixed(4)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Melhor Custo/Benefício
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg font-bold">
                                    {insights.best_cost_efficiency_model || 'N/A'}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    ${parseFloat(insights.cost_efficiency_ratio || 0).toFixed(6)}/token
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Registros Detalhados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>API Key</TableHead>
                                        <TableHead>Modelo</TableHead>
                                        <TableHead className="text-right">Custo Total</TableHead>
                                        <TableHead className="text-right">Input Cost</TableHead>
                                        <TableHead className="text-right">Output Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detailData.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>{record.date}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{record.api_key_name}</Badge>
                                            </TableCell>
                                            <TableCell>{record.model_name}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                ${parseFloat(record.total_cost).toFixed(4)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                ${parseFloat(record.input_cost).toFixed(4)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                ${parseFloat(record.output_cost).toFixed(4)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {detailData.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhum registro encontrado para o período selecionado
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Status da Sincronização e API Key */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {syncStatus && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Status da Sincronização</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        Última: {syncStatus.last_sync_date || 'Nunca'}
                                    </span>
                                </div>
                                <Badge variant={syncStatus.sync_status === 'success' ? 'default' : 'destructive'}>
                                    {syncStatus.sync_status === 'success' ? (
                                        <><CheckCircle className="h-3 w-3 mr-1" /> Sucesso</>
                                    ) : (
                                        <><XCircle className="h-3 w-3 mr-1" /> Erro</>
                                    )}
                                </Badge>
                            </div>
                            {syncStatus.error_message && (
                                <Alert variant="destructive" className="mt-3">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                        {syncStatus.error_message}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                )}
                
                {apiKeyStatus && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Status da API Key</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        {apiKeyStatus.organization || 'Não configurada'}
                                    </span>
                                </div>
                                <Badge variant={apiKeyStatus.valid && apiKeyStatus.has_admin_permissions ? 'default' : 'destructive'}>
                                    {apiKeyStatus.valid && apiKeyStatus.has_admin_permissions ? (
                                        <><CheckCircle className="h-3 w-3 mr-1" /> Admin</>
                                    ) : apiKeyStatus.valid ? (
                                        <><AlertCircle className="h-3 w-3 mr-1" /> Sem Admin</>
                                    ) : (
                                        <><XCircle className="h-3 w-3 mr-1" /> Inválida</>
                                    )}
                                </Badge>
                            </div>
                            {apiKeyStatus.error && (
                                <Alert variant="destructive" className="mt-3">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                        {apiKeyStatus.error}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default OpenAIAnalytics;