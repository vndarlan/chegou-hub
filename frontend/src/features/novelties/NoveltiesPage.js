// frontend/src/features/novelties/NoveltiesPage.js - NOVELTIES DASHBOARD
import React, { useState, useEffect } from 'react';
import {
  RefreshCw, Calendar, TrendingUp, TrendingDown, Clock, 
  Check, X, AlertTriangle, Activity, BarChart3, Eye, Globe, Filter,
  ChevronDown, Users, Target, Zap
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../components/ui/pagination';
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
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
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

    // Cards de métricas Novelties
    const MetricsCards = () => {
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

        const metrics = [
            {
                title: 'Total de Execuções',
                value: dashboardStats.total_executions?.toLocaleString() || '0',
                change: '+12.5%',
                changeType: 'positive',
                description: 'Crescimento este mês',
                subtext: 'Execuções automatizadas',
                icon: <div className="p-2 bg-blue-500/10 rounded-lg"><Activity className="h-4 w-4 text-blue-600" /></div>
            },
            {
                title: 'Novelties Processadas',
                value: dashboardStats.total_processed?.toLocaleString() || '0',
                change: '+8.2%',
                changeType: 'positive',
                description: 'Itens processados',
                subtext: 'Performance melhorada',
                icon: <div className="p-2 bg-green-500/10 rounded-lg"><Target className="h-4 w-4 text-green-600" /></div>
            },
            {
                title: 'Taxa de Sucesso',
                value: `${dashboardStats.success_rate || 0}%`,
                change: dashboardStats.success_rate >= 90 ? '+2.1%' : '-1.3%',
                changeType: dashboardStats.success_rate >= 90 ? 'positive' : 'negative',
                description: 'Performance geral',
                subtext: 'Qualidade das execuções',
                icon: <div className="p-2 bg-purple-500/10 rounded-lg"><BarChart3 className="h-4 w-4 text-purple-600" /></div>
            },
            {
                title: 'Tempo Economizado',
                value: formatTime(timeSaved),
                change: '+15.7%',
                changeType: 'positive',
                description: 'Automação vs manual',
                subtext: 'Eficiência operacional',
                icon: <div className="p-2 bg-orange-500/10 rounded-lg"><Zap className="h-4 w-4 text-orange-600" /></div>
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

    // Configuração do gráfico com cores específicas
    const chartConfig = {
        processed: { label: "Processadas", color: "hsl(217, 91%, 60%)" }, // azul
        successful: { label: "Sucessos", color: "hsl(142, 76%, 36%)" }, // verde
        failed: { label: "Falhas", color: "hsl(0, 84%, 60%)" }, // vermelho
        partial: { label: "Parciais", color: "hsl(38, 92%, 50%)" }, // laranja
        error: { label: "Erro Crítico", color: "hsl(0, 100%, 50%)" }, // vermelho vibrante
        success: { label: "Sucesso", color: "hsl(142, 76%, 36%)" }, // verde (alias)
    };

    // Gráfico de tendências (mesmos status da distribuição)
    const TrendsChart = () => {
        if (!trendsData.length) return null;

        return (
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Tendência de Execuções</CardTitle>
                    <CardDescription>
                        Acompanhe os status das execuções nos últimos {filterPeriod} dias
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig}>
                        <AreaChart
                            accessibilityLayer
                            data={trendsData}
                            margin={{
                                left: 12,
                                right: 12,
                            }}
                        >
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
                                dataKey="error"
                                type="natural"
                                fill="hsl(0, 100%, 50%)"
                                fillOpacity={0.4}
                                stroke="hsl(0, 100%, 50%)"
                                stackId="a"
                            />
                            <Area
                                dataKey="failed"
                                type="natural"
                                fill="hsl(0, 84%, 60%)"
                                fillOpacity={0.4}
                                stroke="hsl(0, 84%, 60%)"
                                stackId="a"
                            />
                            <Area
                                dataKey="partial"
                                type="natural"
                                fill="hsl(38, 92%, 50%)"
                                fillOpacity={0.4}
                                stroke="hsl(38, 92%, 50%)"
                                stackId="a"
                            />
                            <Area
                                dataKey="success"
                                type="natural"
                                fill="hsl(142, 76%, 36%)"
                                fillOpacity={0.4}
                                stroke="hsl(142, 76%, 36%)"
                                stackId="a"
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                        </AreaChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter>
                    <div className="flex w-full items-start gap-2 text-sm">
                        <div className="grid gap-2">
                            <div className="flex items-center gap-2 leading-none font-medium">
                                Performance melhorou 5.2% este mês <TrendingUp className="h-4 w-4" />
                            </div>
                            <div className="text-muted-foreground flex items-center gap-2 leading-none">
                                Dados dos últimos {filterPeriod} dias
                            </div>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        );
    };

    // Status Distribution Chart (seu formato específico)
    const StatusDistribution = () => {
        if (!dashboardStats?.status_distribution) return null;

        const data = Object.entries(dashboardStats.status_distribution).map(([status, count]) => ({
            browser: status,
            visitors: count,
            fill: status === 'success' ? 'hsl(142, 76%, 36%)' : 
                  status === 'partial' ? 'hsl(38, 92%, 50%)' : 
                  status === 'failed' ? 'hsl(0, 84%, 60%)' : 'hsl(0, 100%, 50%)'
        }));

        const statusConfig = {
            visitors: { label: "Execuções" },
            success: { label: "Sucesso", color: "hsl(142, 76%, 36%)" },
            partial: { label: "Parcial", color: "hsl(38, 92%, 50%)" },
            failed: { label: "Falha", color: "hsl(0, 84%, 60%)" },
            error: { label: "Erro Crítico", color: "hsl(0, 100%, 50%)" }
        };

        return (
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Distribuição por Status</CardTitle>
                    <CardDescription>Performance das execuções por resultado</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={statusConfig}>
                        <BarChart
                            accessibilityLayer
                            data={data}
                            layout="vertical"
                            margin={{
                                left: 0,
                            }}
                        >
                            <YAxis
                                dataKey="browser"
                                type="category"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) =>
                                    statusConfig[value]?.label || value
                                }
                            />
                            <XAxis dataKey="visitors" type="number" hide />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Bar dataKey="visitors" layout="vertical" radius={5} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 text-sm">
                    <div className="flex gap-2 font-medium leading-none">
                        Taxa melhorou 5.2% este mês <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="text-muted-foreground leading-none">
                        Baseado nas execuções dos últimos {filterPeriod} dias
                    </div>
                </CardFooter>
            </Card>
        );
    };

    // Tabela de execuções com paginação
    const ExecutionsTable = () => {
        if (!recentExecutions.length) {
            return (
                <div className="flex h-32 items-center justify-center">
                    <div className="text-center">
                        <Activity className="mx-auto h-8 w-8 text-muted-foreground/50" />
                        <p className="mt-2 text-sm text-muted-foreground">Nenhuma execução encontrada</p>
                    </div>
                </div>
            );
        }

        // Cálculo da paginação
        const totalPages = Math.ceil(recentExecutions.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentExecutions = recentExecutions.slice(startIndex, endIndex);

        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Histórico de Execuções</CardTitle>
                            <CardDescription>
                                {recentExecutions.length} execuções encontradas
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b">
                                <TableHead>Data de Execução</TableHead>
                                <TableHead>País</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Processadas</TableHead>
                                <TableHead>Taxa de Sucesso</TableHead>
                                <TableHead>Tempo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentExecutions.map((execution) => (
                                <TableRow key={execution.id} className="hover:bg-muted/50">
                                    <TableCell className="font-mono text-sm">
                                        {formatDateTime(execution.execution_date)}
                                    </TableCell>
                                    <TableCell>{getCountryBadge(execution.country)}</TableCell>
                                    <TableCell>{getStatusBadge(execution.status)}</TableCell>
                                    <TableCell className="font-medium">
                                        {execution.total_processed?.toLocaleString()}
                                    </TableCell>
                                    <TableCell className={`font-medium ${
                                        execution.success_rate >= 90 ? 'text-green-600' : 'text-orange-600'
                                    }`}>
                                        {execution.success_rate}%
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {execution.execution_time_minutes}min
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                
                {/* Paginação shadcn/ui */}
                {totalPages > 1 && (
                    <CardFooter className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            Mostrando {startIndex + 1} a {Math.min(endIndex, recentExecutions.length)} de {recentExecutions.length} execuções
                        </div>
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious 
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                                        }}
                                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                                    />
                                </PaginationItem>
                                
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    let pageNumber;
                                    if (totalPages <= 5) {
                                        pageNumber = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNumber = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNumber = totalPages - 4 + i;
                                    } else {
                                        pageNumber = currentPage - 2 + i;
                                    }
                                    
                                    return (
                                        <PaginationItem key={pageNumber}>
                                            <PaginationLink
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setCurrentPage(pageNumber);
                                                }}
                                                isActive={currentPage === pageNumber}
                                            >
                                                {pageNumber}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                })}
                                
                                {totalPages > 5 && currentPage < totalPages - 2 && (
                                    <PaginationItem>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                )}
                                
                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                                        }}
                                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </CardFooter>
                )}
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
                <div className="flex items-center space-x-2">
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                        <SelectTrigger className="w-[180px] bg-background text-foreground border-border">
                            <Globe className="mr-2 h-4 w-4 text-foreground" />
                            <SelectValue className="text-foreground" />
                        </SelectTrigger>
                        <SelectContent className="bg-background text-foreground border-border">
                            {Object.entries(COUNTRY_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key} className="text-foreground hover:bg-accent hover:text-accent-foreground">
                                    {config.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground">
                        <RefreshCw className={`h-4 w-4 mr-2 text-foreground ${loading ? 'animate-spin' : ''}`} />
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
                        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        <TabsTrigger value="executions">Execuções</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="space-y-4">
                        {/* Cards de métricas */}
                        <MetricsCards />
                        
                        {/* Grid principal */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            <TrendsChart />
                            <StatusDistribution />
                        </div>
                    </TabsContent>

                    <TabsContent value="executions" className="space-y-4">
                        <ExecutionsTable />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}

export default NoveltiesPage;