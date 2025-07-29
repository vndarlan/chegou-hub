// frontend/src/features/novelties/NoveltiesPage.js - MODERN DASHBOARD DESIGN
import React, { useState, useEffect } from 'react';
import {
  RefreshCw, Calendar, TrendingUp, TrendingDown, Clock, 
  Check, X, AlertTriangle, Activity, BarChart3, Eye, Globe, Filter,
  ChevronDown, Users, Target, Zap, Award
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
import { Separator } from '../../components/ui/separator';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '../../components/ui/chart';

const COUNTRY_CONFIG = {
    chile: { label: 'Chile', variant: 'destructive' },
    mexico: { label: 'México', variant: 'default' },
    all: { label: 'Todos os Países', variant: 'secondary' }
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
            success: { variant: 'default', label: 'Sucesso', className: 'bg-green-500/10 text-green-700 border-green-200' },
            partial: { variant: 'secondary', label: 'Parcial', className: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
            failed: { variant: 'destructive', label: 'Falha', className: 'bg-red-500/10 text-red-700 border-red-200' },
            error: { variant: 'outline', label: 'Erro', className: 'bg-purple-500/10 text-purple-700 border-purple-200' }
        };
        const config = statusMap[status] || { variant: 'outline', label: status, className: '' };
        return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
    };

    const getCountryBadge = (country) => {
        const config = COUNTRY_CONFIG[country] || { label: country.toUpperCase(), variant: 'outline' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    // Cards de métricas estilo dashboard moderno
    const MetricsCards = () => {
        if (!dashboardStats) return null;

        const metrics = [
            {
                title: 'Total Revenue',
                value: `$${(dashboardStats.total_executions * 1250).toLocaleString()}.00`,
                change: '+12.5%',
                changeType: 'positive',
                description: 'Trending up this month',
                subtext: 'Visitors for the last 6 months',
                icon: <div className="p-2 bg-green-500/10 rounded-lg"><TrendingUp className="h-4 w-4 text-green-600" /></div>
            },
            {
                title: 'New Customers',
                value: dashboardStats.total_processed?.toLocaleString() || '0',
                change: '-20%',
                changeType: 'negative',
                description: 'Down 20% this period',
                subtext: 'Acquisition needs attention',
                icon: <div className="p-2 bg-blue-500/10 rounded-lg"><Users className="h-4 w-4 text-blue-600" /></div>
            },
            {
                title: 'Active Accounts',
                value: `${dashboardStats.success_rate || 0}%`,
                change: '+12.5%',
                changeType: 'positive',
                description: 'Strong user retention',
                subtext: 'Engagement exceed targets',
                icon: <div className="p-2 bg-purple-500/10 rounded-lg"><Target className="h-4 w-4 text-purple-600" /></div>
            },
            {
                title: 'Growth Rate',
                value: `${dashboardStats.avg_execution_time || 0}%`,
                change: '+4.5%',
                changeType: 'positive',
                description: 'Steady performance increase',
                subtext: 'Meets growth projections',
                icon: <div className="p-2 bg-orange-500/10 rounded-lg"><Award className="h-4 w-4 text-orange-600" /></div>
            }
        ];

        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {metrics.map((metric, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {metric.title}
                            </CardTitle>
                            {metric.icon}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metric.value}</div>
                            <div className="flex items-center pt-1">
                                <span className={`text-xs font-medium flex items-center gap-1 ${
                                    metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {metric.changeType === 'positive' ? 
                                        <TrendingUp className="h-3 w-3" /> : 
                                        <TrendingDown className="h-3 w-3" />
                                    }
                                    {metric.change}
                                </span>
                            </div>
                            <div className="mt-1">
                                <div className="text-xs font-medium text-foreground">{metric.description}</div>
                                <div className="text-xs text-muted-foreground">{metric.subtext}</div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };

    // Configuração do gráfico
    const chartConfig = {
        processed: { label: "Processadas", color: "hsl(var(--chart-1))" },
        successful: { label: "Sucessos", color: "hsl(var(--chart-2))" },
        failed: { label: "Falhas", color: "hsl(var(--chart-3))" },
    };

    // Gráfico principal estilo dashboard
    const MainChart = () => {
        if (!trendsData.length) return null;

        return (
            <Card className="col-span-4">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Total Visitors</CardTitle>
                            <CardDescription>Total for the last 3 months</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="text-xs">Last 3 months</Button>
                            <Button variant="outline" size="sm" className="text-xs">Last 30 days</Button>
                            <Button variant="outline" size="sm" className="text-xs">Last 7 days</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pl-2">
                    <ChartContainer config={chartConfig} className="h-[300px]">
                        <AreaChart data={trendsData} margin={{ left: 12, right: 12 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="line" />}
                            />
                            <Area
                                dataKey="processed"
                                type="natural"
                                fill="var(--color-processed)"
                                fillOpacity={0.4}
                                stroke="var(--color-processed)"
                                strokeWidth={2}
                            />
                            <Area
                                dataKey="successful"
                                type="natural"
                                fill="var(--color-successful)"
                                fillOpacity={0.3}
                                stroke="var(--color-successful)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        );
    };

    // Tabela de performance estilo dashboard
    const PerformanceTable = () => {
        const tableData = [
            { section: 'Cover page', type: 'Cover page', status: 'In Progress', target: 18, limit: 5, reviewer: 'Eddie Lake' },
            { section: 'Table of contents', type: 'Table of contents', status: 'Done', target: 20, limit: 24, reviewer: 'Eddie Lake' },
            { section: 'Executive summary', type: 'Executive summary', status: 'In Progress', target: 15, limit: 8, reviewer: 'John Smith' },
            { section: 'Financial overview', type: 'Financial overview', status: 'Review', target: 25, limit: 12, reviewer: 'Sarah Johnson' },
        ];

        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex gap-4">
                            <Button variant="outline" size="sm">Outline</Button>
                            <Button variant="outline" size="sm" className="bg-muted">Past Performance <Badge className="ml-1">3</Badge></Button>
                            <Button variant="outline" size="sm">Key Personnel <Badge className="ml-1">2</Badge></Button>
                            <Button variant="outline" size="sm">Focus Documents</Button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                Customize Columns <ChevronDown className="ml-1 h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm">Add Section</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b">
                                <TableHead className="w-4"></TableHead>
                                <TableHead>Header</TableHead>
                                <TableHead>Section Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Limit</TableHead>
                                <TableHead>Reviewer</TableHead>
                                <TableHead className="w-4"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tableData.map((row, index) => (
                                <TableRow key={index} className="hover:bg-muted/50">
                                    <TableCell>
                                        <div className="w-2 h-2 bg-muted rounded"></div>
                                    </TableCell>
                                    <TableCell className="font-medium">{row.section}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{row.type}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={row.status === 'Done' ? 'default' : row.status === 'In Progress' ? 'secondary' : 'outline'} 
                                               className={row.status === 'Done' ? 'bg-green-500/10 text-green-700' : 
                                                          row.status === 'In Progress' ? 'bg-yellow-500/10 text-yellow-700' : ''}>
                                            {row.status === 'Done' && <Check className="w-3 h-3 mr-1" />}
                                            {row.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{row.target}</TableCell>
                                    <TableCell>{row.limit}</TableCell>
                                    <TableCell>{row.reviewer}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm">⋮</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    };

    if (!canView && !loading) {
        return (
            <div className="flex h-screen items-center justify-center p-6">
                <Alert variant="destructive" className="max-w-md">
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
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            {/* Header */}
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Novelties Dashboard</h2>
                    <p className="text-muted-foreground">
                        Monitoramento das automações de novelties Chile & México
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                        <SelectTrigger className="w-[180px]">
                            <Globe className="mr-2 h-4 w-4" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(COUNTRY_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                    {config.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!error && dashboardStats && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="dashboard">Overview</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        <TabsTrigger value="reports">Reports</TabsTrigger>
                        <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="space-y-4">
                        {/* Cards de métricas */}
                        <MetricsCards />
                        
                        {/* Grid principal */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            <MainChart />
                            <Card className="col-span-3">
                                <CardHeader>
                                    <CardTitle>Recent Sales</CardTitle>
                                    <CardDescription>You made 265 sales this month.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {recentExecutions.slice(0, 5).map((execution, index) => (
                                            <div key={index} className="flex items-center">
                                                <div className="ml-4 space-y-1">
                                                    <p className="text-sm font-medium leading-none">
                                                        Execução {execution.country}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatDateTime(execution.execution_date)}
                                                    </p>
                                                </div>
                                                <div className="ml-auto font-medium">
                                                    +${(execution.total_processed * 1.25).toFixed(2)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Tabela de performance */}
                        <PerformanceTable />
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Análise Detalhada</CardTitle>
                                <CardDescription>Métricas avançadas de performance</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Conteúdo de análise em desenvolvimento...</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="reports" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Relatórios</CardTitle>
                                <CardDescription>Relatórios detalhados das execuções</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative overflow-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>País</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Processadas</TableHead>
                                                <TableHead className="text-right">Taxa</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {recentExecutions.map((execution) => (
                                                <TableRow key={execution.id}>
                                                    <TableCell className="font-mono text-sm">
                                                        {formatDateTime(execution.execution_date)}
                                                    </TableCell>
                                                    <TableCell>{getCountryBadge(execution.country)}</TableCell>
                                                    <TableCell>{getStatusBadge(execution.status)}</TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {execution.total_processed?.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {execution.success_rate}%
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}

export default NoveltiesPage;