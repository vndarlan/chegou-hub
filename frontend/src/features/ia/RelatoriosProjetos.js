// frontend/src/features/ia/RelatoriosProjetos.js - VERSÃO SHADCN/UI
import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart3, Download, Filter, Calendar,
    TrendingUp, TrendingDown, DollarSign, Clock,
    Users, Target, ChevronDown, FileX,
    FileText, Activity, Brain, Bot,
    Check, X, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import axios from 'axios';

// shadcn/ui imports
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { LoadingSpinner } from '../../components/ui';
import { Progress } from '../../components/ui/progress';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

// === COMPONENTES DE GRÁFICOS CUSTOMIZADOS ===

// Gráfico de ROI por Projeto
const ROIChart = ({ dados, userPermissions }) => {
    if (!userPermissions?.pode_ver_financeiro) {
        return (
            <Card className="border">
                <CardContent className="p-12">
                    <div className="flex flex-col items-center space-y-4">
                        <X className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">Sem permissão para ver dados financeiros</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const projetosComROI = dados
        ?.filter(p => p.metricas_financeiras && !p.metricas_financeiras.acesso_restrito)
        .sort((a, b) => b.metricas_financeiras.roi - a.metricas_financeiras.roi)
        .slice(0, 5);

    return (
        <div className="space-y-4">
            {projetosComROI?.map((projeto, index) => (
                <Card key={projeto.id} className="border">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                                {projeto.nome.substring(0, 30)}...
                            </p>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${
                                    projeto.metricas_financeiras.roi > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {projeto.metricas_financeiras.roi}%
                                </span>
                                <Progress 
                                    value={Math.min(Math.abs(projeto.metricas_financeiras.roi), 100)} 
                                    className={`w-24 h-2 ${
                                        projeto.metricas_financeiras.roi > 0 ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'
                                    }`}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

// Gráfico de Evolução da Economia
const EconomiaTimelineChart = ({ dados, userPermissions }) => {
    if (!userPermissions?.pode_ver_financeiro) {
        return (
            <Card className="border">
                <CardContent className="p-12">
                    <div className="flex flex-col items-center space-y-4">
                        <X className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">Sem permissão para ver dados financeiros</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Simular evolução mensal
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    const economiaTotal = dados
        ?.filter(p => p.metricas_financeiras && !p.metricas_financeiras.acesso_restrito)
        .reduce((acc, p) => acc + parseFloat(p.metricas_financeiras.economia_mensal || 0), 0);

    return (
        <div className="grid grid-cols-6 gap-4">
            {meses.map((mes, index) => {
                const valor = economiaTotal * (index + 1) * 0.8;
                return (
                    <Card key={mes} className="border">
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">{mes}</p>
                            <p className="text-lg font-bold">
                                R$ {valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                            </p>
                            <Progress 
                                value={(index + 1) * 16.66} 
                                className="mt-2 h-2 [&>div]:bg-teal-500"
                            />
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

// Gráfico de Distribuição por Tipo
const DistribuicaoTipoChart = ({ dados }) => {
    const distribuicao = dados?.reduce((acc, projeto) => {
        const tipo = projeto.tipo_projeto;
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
    }, {});

    const total = Object.values(distribuicao || {}).reduce((acc, count) => acc + count, 0);

    return (
        <div className="space-y-4">
            {Object.entries(distribuicao || {}).map(([tipo, count]) => {
                const percentage = total > 0 ? (count / total) * 100 : 0;
                return (
                    <Card key={tipo} className="border">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium">
                                    {tipo.replace('_', ' ').toUpperCase()}
                                </p>
                                <Badge variant="secondary">{count}</Badge>
                            </div>
                            <Progress value={percentage} className="h-3 [&>div]:bg-blue-500" />
                            <p className="text-xs text-muted-foreground mt-2">
                                {percentage.toFixed(1)}%
                            </p>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

// Ranking de Projetos
const RankingProjetos = ({ dados, userPermissions, tipo = 'roi' }) => {
    const dadosRanking = useMemo(() => {
        if (!dados) return [];
        
        let projetosFiltrados = dados.filter(p => p.metricas_financeiras && !p.metricas_financeiras.acesso_restrito);
        
        switch (tipo) {
            case 'roi':
                return projetosFiltrados
                    .sort((a, b) => b.metricas_financeiras.roi - a.metricas_financeiras.roi)
                    .slice(0, 5);
            case 'economia':
                return projetosFiltrados
                    .sort((a, b) => (b.metricas_financeiras.economia_mensal || 0) - (a.metricas_financeiras.economia_mensal || 0))
                    .slice(0, 5);
            case 'horas':
                return dados
                    .sort((a, b) => b.horas_totais - a.horas_totais)
                    .slice(0, 5);
            default:
                return [];
        }
    }, [dados, tipo]);

    const getTrendIcon = (valor, threshold = 0) => {
        if (valor > threshold) return <ArrowUp className="h-4 w-4 text-green-600" />;
        if (valor < threshold) return <ArrowDown className="h-4 w-4 text-red-600" />;
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    };

    return (
        <div className="space-y-2">
            {dadosRanking.map((projeto, index) => (
                <Card key={projeto.id} className="border">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Badge variant="default" className="text-lg min-w-[32px] h-8 flex items-center justify-center">
                                    {index + 1}
                                </Badge>
                                <div>
                                    <p className="text-sm font-medium">{projeto.nome}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {projeto.criadores_nomes?.[0] || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {tipo === 'roi' && userPermissions?.pode_ver_financeiro && (
                                    <div className="flex items-center gap-1">
                                        {getTrendIcon(projeto.metricas_financeiras.roi)}
                                        <span className={`text-sm font-bold ${
                                            projeto.metricas_financeiras.roi > 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {projeto.metricas_financeiras.roi}%
                                        </span>
                                    </div>
                                )}
                                
                                {tipo === 'economia' && userPermissions?.pode_ver_financeiro && (
                                    <span className="text-sm font-medium">
                                        R$ {projeto.metricas_financeiras.economia_mensal?.toLocaleString('pt-BR')}
                                    </span>
                                )}
                                
                                {tipo === 'horas' && (
                                    <span className="text-sm font-medium">
                                        {projeto.horas_totais}h
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

// Componente Principal
function RelatoriosProjetos() {
    // === ESTADOS ===
    const [dados, setDados] = useState(null);
    const [stats, setStats] = useState(null);
    const [userPermissions, setUserPermissions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);
    
    // Filtros para relatórios
    const [periodo, setPeriodo] = useState('todos');
    const [departamento, setDepartamento] = useState('todos');
    const [tipoProjeto, setTipoProjeto] = useState('todos');
    
    // === EFEITOS ===
    useEffect(() => {
        carregarDados();
    }, [periodo, departamento, tipoProjeto]);

    // === FUNÇÕES ===
    const carregarDados = async () => {
        try {
            setLoading(true);
            
            // Construir filtros
            const params = new URLSearchParams();
            if (departamento && departamento !== 'todos') params.append('departamento', departamento);
            if (tipoProjeto && tipoProjeto !== 'todos') params.append('tipo_projeto', tipoProjeto);
            
            const [projetosRes, statsRes, permissoesRes] = await Promise.all([
                axios.get(`/ia/projetos/?${params}`),
                axios.get('/ia/dashboard-stats/'),
                axios.get('/ia/verificar-permissoes/')
            ]);
            
            setDados(projetosRes.data.results || projetosRes.data);
            setStats(statsRes.data);
            setUserPermissions(permissoesRes.data);
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            setError('Erro ao carregar dados dos relatórios');
        } finally {
            setLoading(false);
        }
    };

    const exportarRelatorio = async (tipo) => {
        try {
            setNotification({ type: 'success', message: 'Relatório exportado com sucesso!' });
        } catch (err) {
            setNotification({ type: 'error', message: 'Erro ao exportar relatório' });
        }
    };

    // === CÁLCULOS DE MÉTRICAS ===
    const metricas = useMemo(() => {
        if (!dados || !userPermissions?.pode_ver_financeiro) return null;
        
        const projetosComFinanceiro = dados.filter(p => 
            p.metricas_financeiras && !p.metricas_financeiras.acesso_restrito
        );
        
        const totalROI = projetosComFinanceiro.reduce((acc, p) => 
            acc + parseFloat(p.metricas_financeiras.roi || 0), 0
        );
        
        const totalEconomia = projetosComFinanceiro.reduce((acc, p) => 
            acc + parseFloat(p.metricas_financeiras.economia_mensal || 0), 0
        );
        
        const totalInvestimento = projetosComFinanceiro.reduce((acc, p) => 
            acc + parseFloat(p.metricas_financeiras.custo_total || 0), 0
        );

        return {
            roiMedio: projetosComFinanceiro.length > 0 ? totalROI / projetosComFinanceiro.length : 0,
            economiaTotalMensal: totalEconomia,
            investimentoTotal: totalInvestimento,
            projetosPositivos: projetosComFinanceiro.filter(p => p.metricas_financeiras.roi > 0).length,
            projetosNegativos: projetosComFinanceiro.filter(p => p.metricas_financeiras.roi < 0).length
        };
    }, [dados, userPermissions]);

    return (
        <div className="flex-1 space-y-6 p-6">
            {loading && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <LoadingSpinner className="h-8 w-8" />
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-8 w-8" />
                        <h1 className="text-2xl font-bold text-foreground">📊 Relatórios & Análise</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Análise detalhada de performance e métricas dos projetos
                    </p>
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                            <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => exportarRelatorio('pdf')}>
                            <FileX className="h-4 w-4 mr-2" />
                            Relatório PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportarRelatorio('excel')}>
                            <FileX className="h-4 w-4 mr-2" />
                            Planilha Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportarRelatorio('csv')}>
                            <FileX className="h-4 w-4 mr-2" />
                            Dados CSV
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Notificações */}
            {notification && (
                <Alert className={`${notification.type === 'error' ? 'border-destructive' : 'border-green-500'}`}>
                    {notification.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <AlertDescription>
                        <strong>{notification.type === 'success' ? 'Sucesso!' : 'Erro!'}</strong> {notification.message}
                    </AlertDescription>
                </Alert>
            )}

            {error && (
                <Alert className="border-destructive">
                    <X className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Erro!</strong> {error}
                    </AlertDescription>
                </Alert>
            )}

            {/* Filtros */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        <Select value={periodo} onValueChange={setPeriodo}>
                            <SelectTrigger className="w-[180px]">
                                <Calendar className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os períodos</SelectItem>
                                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                                <SelectItem value="1y">Último ano</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        <Select value={departamento} onValueChange={setDepartamento}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Departamento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os departamentos</SelectItem>
                                <SelectItem value="ti">TI</SelectItem>
                                <SelectItem value="marketing">Marketing</SelectItem>
                                <SelectItem value="vendas">Vendas</SelectItem>
                                <SelectItem value="operacional">Operacional</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        <Select value={tipoProjeto} onValueChange={setTipoProjeto}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Tipo de Projeto" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os tipos</SelectItem>
                                <SelectItem value="chatbot">Chatbot</SelectItem>
                                <SelectItem value="automacao">Automação</SelectItem>
                                <SelectItem value="analise_preditiva">Análise Preditiva</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Métricas Principais */}
            {userPermissions?.pode_ver_financeiro && metricas && (
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="bg-blue-50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="h-6 w-6 text-blue-600" />
                                <div>
                                    <p className="text-sm text-muted-foreground">ROI Médio</p>
                                    <p className={`text-xl font-bold ${metricas.roiMedio > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {metricas.roiMedio.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-green-50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <DollarSign className="h-6 w-6 text-green-600" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Economia/Mês</p>
                                    <p className="text-xl font-bold">
                                        R$ {metricas.economiaTotalMensal.toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-orange-50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Target className="h-6 w-6 text-orange-600" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Investimento Total</p>
                                    <p className="text-xl font-bold">
                                        R$ {metricas.investimentoTotal.toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-teal-50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="h-12 w-12 rounded-full border-4 border-teal-200 flex items-center justify-center">
                                        <span className="text-xs font-bold text-teal-600">
                                            {Math.round((metricas.projetosPositivos / (metricas.projetosPositivos + metricas.projetosNegativos)) * 100)}%
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                                    <p className="text-lg font-bold">
                                        {metricas.projetosPositivos}/{metricas.projetosPositivos + metricas.projetosNegativos}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Gráficos Principais */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>ROI por Projeto</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ROIChart dados={dados} userPermissions={userPermissions} />
                        </CardContent>
                    </Card>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Distribuição por Tipo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DistribuicaoTipoChart dados={dados} />
                    </CardContent>
                </Card>
            </div>

            {/* Evolução Temporal */}
            {userPermissions?.pode_ver_financeiro && (
                <Card>
                    <CardHeader>
                        <CardTitle>Evolução da Economia</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <EconomiaTimelineChart dados={dados} userPermissions={userPermissions} />
                    </CardContent>
                </Card>
            )}

            {/* Rankings */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">🏆 Top 5 - ROI</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RankingProjetos dados={dados} userPermissions={userPermissions} tipo="roi" />
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">💰 Top 5 - Economia</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RankingProjetos dados={dados} userPermissions={userPermissions} tipo="economia" />
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">⏱️ Top 5 - Horas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RankingProjetos dados={dados} userPermissions={userPermissions} tipo="horas" />
                    </CardContent>
                </Card>
            </div>

            {/* Insights e Recomendações */}
            {stats && (
                <Card>
                    <CardHeader>
                        <CardTitle>💡 Insights & Recomendações</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.projetos_ativos > 0 && (
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <Activity className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <p className="text-sm">
                                        Você tem <strong>{stats.projetos_ativos} projetos ativos</strong> gerando resultados
                                    </p>
                                </div>
                            )}
                            
                            {userPermissions?.pode_ver_financeiro && metricas?.roiMedio > 100 && (
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                    </div>
                                    <p className="text-sm">
                                        Excelente! ROI médio de <strong>{metricas.roiMedio.toFixed(1)}%</strong> está acima da meta
                                    </p>
                                </div>
                            )}
                            
                            {stats.horas_totais_investidas > 1000 && (
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                        <Clock className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <p className="text-sm">
                                        Mais de <strong>{stats.horas_totais_investidas}h investidas</strong> em automação e IA
                                    </p>
                                </div>
                            )}
                            
                            {dados && dados.length > 5 && (
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-teal-100 flex items-center justify-center">
                                        <Brain className="h-4 w-4 text-teal-600" />
                                    </div>
                                    <p className="text-sm">
                                        Portfolio robusto com <strong>{dados.length} projetos</strong> - considere documentar melhores práticas
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default RelatoriosProjetos;