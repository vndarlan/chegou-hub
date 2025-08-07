// frontend/src/features/ia/OpenAIAnalytics.js
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

// shadcn/ui imports
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';

// lucide-react icons
import {
    DollarSign, Activity, Zap, Bot, RefreshCw, Filter,
    TrendingUp, Calendar, AlertCircle, BarChart3,
    LineChart, Users, Clock, Coins
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
    // Estados
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    
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
        const token = document.querySelector('[name=csrfmiddlewaretoken]');
        if (token) {
            axios.defaults.headers.common['X-CSRFToken'] = token.value;
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
            
            // Calcular datas
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - parseInt(selectedPeriod));

            params.append('start_date', startDate.toISOString().split('T')[0]);
            params.append('end_date', endDate.toISOString().split('T')[0]);

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
            setError('Erro ao carregar dados de analytics: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleSyncData = async () => {
        try {
            setSyncing(true);
            setError(null);

            const response = await axios.post(`${API_BASE}/sync-openai/`, {
                days_back: parseInt(selectedPeriod)
            });

            if (response.data.success) {
                // Recarregar dados após sincronização
                await loadInitialData();
                alert(`Sincronização concluída! ${response.data.data.usage_records_synced} registros de uso e ${response.data.data.cost_records_synced} de custos sincronizados.`);
            } else {
                setError('Erro na sincronização: ' + response.data.error);
            }

        } catch (err) {
            setError('Erro ao sincronizar dados: ' + (err.response?.data?.error || err.message));
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
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
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
                            <SelectItem value="30">Últimos 30 dias</SelectItem>
                            <SelectItem value="90">Últimos 90 dias</SelectItem>
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
                        onClick={handleSyncData} 
                        disabled={syncing}
                        variant="outline"
                    >
                        {syncing ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        {syncing ? 'Sincronizando...' : 'Sincronizar'}
                    </Button>
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

            {/* Status da Sincronização */}
            {syncStatus && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    Última sincronização: {syncStatus.last_sync_date || 'Nunca'}
                                </span>
                            </div>
                            <Badge variant={syncStatus.sync_status === 'success' ? 'default' : 'destructive'}>
                                {syncStatus.sync_status === 'success' ? 'Sucesso' : 'Erro'}
                            </Badge>
                        </div>
                        {syncStatus.error_message && (
                            <p className="text-sm text-destructive mt-2">{syncStatus.error_message}</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default OpenAIAnalytics;