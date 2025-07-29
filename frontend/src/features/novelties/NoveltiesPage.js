// frontend/src/features/novelties/NoveltiesPage.js - SHADCN/UI VERSION
import React, { useState, useEffect } from 'react';
import {
  RefreshCw, Calendar, TrendingUp, TrendingDown, Clock, 
  Check, X, AlertTriangle, Activity, BarChart3, Eye, Globe
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, Bar, BarChart, YAxis } from 'recharts';
import axios from 'axios';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '../../components/ui/chart';

const STATUS_COLORS = {
    success: 'hsl(var(--chart-1))',
    partial: 'hsl(var(--chart-4))', 
    failed: 'hsl(var(--destructive))',
    error: 'hsl(var(--chart-5))'
};

const COUNTRY_CONFIG = {
    chile: { label: '🇨🇱 Chile', variant: 'destructive' },
    mexico: { label: '🇲🇽 México', variant: 'default' },
    all: { label: '🌍 Todos', variant: 'secondary' }
};

function NoveltiesPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [recentExecutions, setRecentExecutions] = useState([]);
    const [trendsData, setTrendsData] = useState([]);
    const [canView, setCanView] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [filterPeriod, setFilterPeriod] = useState('7');
    const [selectedCountry, setSelectedCountry] = useState('all');

    // Verificar permissões
    useEffect(() => {
        const checkPermissions = async () => {
            try {
                const response = await axios.get('/novelties/check-permissions/');
                setCanView(response.data.can_view);
                if (!response.data.can_view) {
                    setError('Você não tem permissão para visualizar esta página.');
                    setLoading(false);
                }
            } catch (err) {
                console.error("Erro ao verificar permissões:", err);
                setCanView(false);
                setError('Erro ao verificar permissões de acesso.');
                setLoading(false);
            }
        };
        checkPermissions();
    }, []);

    // Carregar dados do dashboard
    useEffect(() => {
        if (!canView) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const countryParam = selectedCountry === 'all' ? {} : { country: selectedCountry };

                const [statsResponse, recentResponse, trendsResponse] = await Promise.all([
                    axios.get('/novelties/executions/dashboard_stats/', { params: countryParam }),
                    axios.get('/novelties/recent/', { params: { limit: 10, ...countryParam } }),
                    axios.get('/novelties/trends/', { params: { days: filterPeriod, ...countryParam } })
                ]);

                setDashboardStats(statsResponse.data);
                setRecentExecutions(recentResponse.data);
                setTrendsData(trendsResponse.data.daily_data);

            } catch (err) {
                console.error("Erro ao carregar dados:", err);
                setError(`Erro ao carregar dados: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [canView, filterPeriod, selectedCountry]);

    const handleRefresh = () => {
        window.location.reload();
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('pt-BR');
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            success: { variant: 'default', label: 'Sucesso' },
            partial: { variant: 'secondary', label: 'Parcial' },
            failed: { variant: 'destructive', label: 'Falha' },
            error: { variant: 'outline', label: 'Erro' }
        };
        const config = statusMap[status] || { variant: 'outline', label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getCountryBadge = (country) => {
        const config = COUNTRY_CONFIG[country] || { label: country.toUpperCase(), variant: 'outline' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    // Cards de estatísticas
    const StatsCards = () => {
        if (!dashboardStats) return null;

        const timeSaved = dashboardStats.total_processed * dashboardStats.avg_execution_time;
        
        const formatTime = (minutes) => {
            if (minutes < 60) return `${Math.round(minutes)}min`;
            const hours = Math.floor(minutes / 60);
            const mins = Math.round(minutes % 60);
            return hours >= 24 ? 
                `${Math.floor(hours/24)}d ${hours%24}h` : 
                `${hours}h ${mins > 0 ? mins + 'min' : ''}`;
        };

        const cards = [
            {
                title: 'Execuções Total',
                value: dashboardStats.total_executions,
                icon: Activity,
                color: 'text-blue-500'
            },
            {
                title: 'Novelties Processadas',
                value: dashboardStats.total_processed,
                icon: BarChart3,
                color: 'text-green-500'
            },
            {
                title: 'Taxa de Sucesso',
                value: `${dashboardStats.success_rate}%`,
                icon: dashboardStats.success_rate >= 90 ? TrendingUp : TrendingDown,
                color: dashboardStats.success_rate >= 90 ? 'text-green-500' : 'text-orange-500'
            },
            {
                title: 'Tempo Médio',
                value: `${dashboardStats.avg_execution_time}min`,
                icon: Clock,
                color: 'text-purple-500'
            },
            {
                title: 'Tempo Economizado',
                value: formatTime(timeSaved),
                icon: Clock,
                color: 'text-orange-500',
                subtitle: `${dashboardStats.total_processed} × ${dashboardStats.avg_execution_time}min`
            }
        ];

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {cards.map((card, index) => (
                    <Card key={index}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground uppercase">
                                        {card.title}
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {card.value}
                                    </p>
                                    {card.subtitle && (
                                        <p className="text-xs text-muted-foreground">
                                            {card.subtitle}
                                        </p>
                                    )}
                                </div>
                                <card.icon className={`h-8 w-8 ${card.color}`} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };

    // Configuração do gráfico de tendências
    const chartConfig = {
        processed: {
            label: "Processadas",
            color: "var(--chart-1)",
        },
        successful: {
            label: "Sucessos",
            color: "var(--chart-2)",
        },
        failed: {
            label: "Falhas",
            color: "var(--chart-3)",
        },
    };

    // Gráfico de tendências
    const TrendsChart = () => {
        if (!trendsData.length) return null;

        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>📈 Tendência de Execuções</CardTitle>
                        <CardDescription>
                            Acompanhe o desempenho das execuções ao longo do tempo
                        </CardDescription>
                    </div>
                    <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                        <SelectTrigger className="w-24">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">7 dias</SelectItem>
                            <SelectItem value="15">15 dias</SelectItem>
                            <SelectItem value="30">30 dias</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                        <AreaChart data={trendsData} margin={{ left: 12, right: 12 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="line" />}
                            />
                            <Area
                                dataKey="failed"
                                type="natural"
                                fill="var(--color-failed)"
                                fillOpacity={0.4}
                                stroke="var(--color-failed)"
                                stackId="a"
                            />
                            <Area
                                dataKey="successful"
                                type="natural"
                                fill="var(--color-successful)"
                                fillOpacity={0.4}
                                stroke="var(--color-successful)"
                                stackId="a"
                            />
                            <Area
                                dataKey="processed"
                                type="natural"
                                fill="var(--color-processed)"
                                fillOpacity={0.4}
                                stroke="var(--color-processed)"
                                stackId="a"
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                        </AreaChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        );
    };

    // Distribuição por status
    const StatusDistribution = () => {
        if (!dashboardStats?.status_distribution) return null;

        const data = Object.entries(dashboardStats.status_distribution).map(([status, count]) => ({
            status: status,
            count: count,
            fill: STATUS_COLORS[status.toLowerCase()] || 'hsl(var(--muted))'
        }));

        const statusConfig = {
            count: { label: "Execuções" },
            success: { label: "Sucesso", color: "var(--chart-1)" },
            partial: { label: "Parcial", color: "var(--chart-4)" },
            failed: { label: "Falha", color: "var(--destructive)" },
            error: { label: "Erro", color: "var(--chart-5)" }
        };

        return (
            <Card>
                <CardHeader>
                    <CardTitle>📊 Distribuição por Status</CardTitle>
                    <CardDescription>Proporção de execuções por resultado</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={statusConfig} className="h-[250px]">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ left: 0 }}
                        >
                            <YAxis
                                dataKey="status"
                                type="category"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => value}
                            />
                            <XAxis dataKey="count" type="number" hide />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Bar dataKey="count" layout="vertical" radius={5} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        );
    };

    // Tabela de execuções recentes
    const RecentExecutionsTable = () => {
        if (!recentExecutions.length) {
            return (
                <div className="flex h-32 items-center justify-center">
                    <p className="text-muted-foreground">Nenhuma execução encontrada</p>
                </div>
            );
        }

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>País</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Processadas</TableHead>
                        <TableHead>Sucessos</TableHead>
                        <TableHead>Falhas</TableHead>
                        <TableHead>Taxa</TableHead>
                        <TableHead>Tempo</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recentExecutions.map((execution) => (
                        <TableRow key={execution.id}>
                            <TableCell className="text-sm">
                                {formatDateTime(execution.execution_date)}
                            </TableCell>
                            <TableCell>
                                {getCountryBadge(execution.country)}
                            </TableCell>
                            <TableCell>
                                {getStatusBadge(execution.status)}
                            </TableCell>
                            <TableCell className="font-medium">
                                {execution.total_processed}
                            </TableCell>
                            <TableCell className="text-green-600">
                                {execution.successful}
                            </TableCell>
                            <TableCell className="text-red-600">
                                {execution.failed}
                            </TableCell>
                            <TableCell className={execution.success_rate >= 90 ? "text-green-600" : "text-orange-600"}>
                                {execution.success_rate}%
                            </TableCell>
                            <TableCell className="text-sm">
                                {execution.execution_time_minutes}min
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    };

    if (!canView && !loading) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <X className="h-4 w-4" />
                    <AlertDescription>
                        Você não tem permissão para visualizar esta página.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header com filtro de país */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">🌎 Novelties Chile & México</h1>
                    <p className="text-muted-foreground">
                        Dashboard de monitoramento das automações de novelties Dropi
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Filtro de país */}
                    <div className="flex bg-muted p-1 rounded-lg">
                        {Object.entries(COUNTRY_CONFIG).map(([key, config]) => (
                            <Button
                                key={key}
                                variant={selectedCountry === key ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setSelectedCountry(key)}
                                className="text-xs"
                            >
                                {config.label}
                            </Button>
                        ))}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!loading && !error && dashboardStats && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="dashboard" className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="executions" className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Execuções
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="space-y-6">
                        {/* Cards de estatísticas */}
                        <StatsCards />

                        {/* Gráficos */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <TrendsChart />
                            </div>
                            <div>
                                <StatusDistribution />
                            </div>
                        </div>

                        {/* Informações da última execução */}
                        {dashboardStats.last_execution_date && (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">Última Execução</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDateTime(dashboardStats.last_execution_date)}
                                            </p>
                                        </div>
                                        {getStatusBadge(dashboardStats.last_execution_status)}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="executions">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>📋 Execuções Recentes</CardTitle>
                                    <CardDescription>Histórico das últimas execuções</CardDescription>
                                </div>
                                <Badge variant="secondary">
                                    {recentExecutions.length} execuções
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <RecentExecutionsTable />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}

export default NoveltiesPage;