// frontend/src/features/ia/LogsPage.js - VERSÃO SHADCN/UI
import React, { useState, useEffect } from 'react';
import {
    Search, RefreshCw, Check, X,
    AlertTriangle, AlertCircle,
    Eye, Clock, MapPin, Bot,
    BarChart3, Activity, GitBranch
} from 'lucide-react';
import axios from 'axios';

// shadcn/ui imports
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { LoadingSpinner } from '../../components/ui';
import { Textarea } from '../../components/ui/textarea';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../../components/ui/pagination';

function LogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [stats, setStats] = useState(null);
    
    // Estado para paginação
    const [paginacao, setPaginacao] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0
    });
    
    // Filtros apenas para erros e críticos
    const [filtros, setFiltros] = useState({
        ferramenta: '',
        nivel: 'error,critical', // Apenas erros e críticos
        pais: '',
        resolvido: '',
        periodo: '24h',
        busca: ''
    });
    
    // Estados do modal
    const [modalDetalhes, setModalDetalhes] = useState(false);
    const [modalResolucao, setModalResolucao] = useState(false);
    const [logSelecionado, setLogSelecionado] = useState(null);
    const [observacoesResolucao, setObservacoesResolucao] = useState('');

    useEffect(() => {
        carregarLogs(1); // Sempre volta pra página 1 quando filtro muda
        carregarStats();
    }, [filtros]);

    const carregarLogs = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filtros).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            
            // Adicionar parâmetro de página
            params.append('page', page);
            
            const response = await axios.get(`/ia/logs/?${params}`);
            const data = response.data;
            
            // Estrutura paginada do Django REST Framework
            setLogs(data.results || []);
            setPaginacao({
                currentPage: page,
                totalPages: Math.ceil(data.count / 10), // 10 itens por página
                totalItems: data.count
            });
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            setNotification({ type: 'error', message: 'Erro ao carregar logs' });
        } finally {
            setLoading(false);
        }
    };

    const carregarStats = async () => {
        try {
            // CORREÇÃO: Endpoint correto para logs
            const response = await axios.get('/ia/dashboard-logs-stats/');
            const data = response.data;
            
            // Usar dados dos últimos 7 dias para o total
            const errorStats = {
                total_erros_7d: data.resumo?.total_logs_7d || 0,  // NOVO: 7 dias
                total_erros: (data.por_ferramenta || []).reduce((sum, f) => sum + (f.erros || 0), 0),
                nao_resolvidos: data.resumo?.logs_nao_resolvidos || 0,
                criticos_7d: data.resumo?.logs_criticos_7d || 0,
                por_ferramenta: (data.por_ferramenta || []).filter(f => f.erros > 0),
                por_pais_nicochat: (data.por_pais_nicochat || []).filter(p => p.erros > 0)
            };
            
            setStats(errorStats);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    };

    // Função para mudança de página
    const handlePageChange = (page) => {
        carregarLogs(page);
    };

    const marcarResolvido = async (logId, resolvido) => {
        try {
            const csrfResponse = await axios.get('/current-state/');
            const csrfToken = csrfResponse.data.csrf_token;
            
            await axios.post(`/ia/logs/${logId}/marcar_resolvido/`, {
                resolvido: resolvido,
                observacoes: observacoesResolucao
            }, {
                headers: { 'X-CSRFToken': csrfToken }
            });
            
            setNotification({ 
                type: 'success', 
                message: `Erro marcado como ${resolvido ? 'resolvido' : 'não resolvido'}` 
            });
            setModalResolucao(false);
            setObservacoesResolucao('');
            carregarLogs(paginacao.currentPage);
            carregarStats();
        } catch (error) {
            console.error('Erro ao marcar log:', error);
            setNotification({ type: 'error', message: 'Erro ao atualizar log' });
        }
    };

    const getNivelColor = (nivel) => {
        return nivel === 'critical' ? 'red' : 'orange';
    };

    const getNivelIcon = (nivel) => {
        return nivel === 'critical' ? X : AlertCircle;
    };

    const getPaisDisplayName = (pais) => {
        const nomes = {
            'colombia': 'Colômbia', 'chile': 'Chile', 'mexico': 'México',
            'polonia': 'Polônia', 'romenia': 'Romênia', 'espanha': 'Espanha', 'italia': 'Itália'
        };
        return nomes[pais] || pais;
    };

    const getPaisFlag = (pais) => {
        const flags = {
            'colombia': '🇨🇴', 'chile': '🇨🇱', 'mexico': '🇲🇽',
            'polonia': '🇵🇱', 'romenia': '🇷🇴', 'espanha': '🇪🇸', 'italia': '🇮🇹'
        };
        return flags[pais] || '🌍';
    };

    // Componente de estatísticas de erros
    const StatsErros = () => {
        if (!stats) return null;
        
        return (
            <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Total de Erros</p>
                                <p className="text-2xl font-bold text-red-600">{stats.total_erros_7d}</p>
                                <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
                            </div>
                            <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Não Resolvidos</p>
                                <p className="text-2xl font-bold text-orange-600">{stats.nao_resolvidos}</p>
                                <p className="text-xs text-muted-foreground">Precisam atenção</p>
                            </div>
                            <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Críticos (7d)</p>
                                <p className="text-2xl font-bold text-red-600">{stats.criticos_7d}</p>
                                <p className="text-xs text-muted-foreground">Erros graves</p>
                            </div>
                            <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                                <X className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    // Componente de erros por ferramenta
    const ErrosPorFerramenta = () => {
        if (!stats?.por_ferramenta?.length) return null;
        
        return (
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-red-600" />
                        Erros por Ferramenta (24h)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        {stats.por_ferramenta.map((stat) => (
                            <Card key={stat.ferramenta} className="border border-red-200">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">
                                                {stat.ferramenta === 'Nicochat' ? '🤖' : '⚙️'}
                                            </span>
                                            <span className="font-medium text-sm">{stat.ferramenta}</span>
                                        </div>
                                        <Badge variant="destructive">{stat.erros}</Badge>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-red-500" />
                                        <span className="text-xs text-red-600 font-medium">
                                            {stat.erros} erro(s) registrados
                                        </span>
                                    </div>
                                    
                                    {stat.nao_resolvidos > 0 && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                                            <span className="text-xs text-orange-600 font-medium">
                                                {stat.nao_resolvidos} não resolvidos
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">Monitoramento de Erros - IA</h1>
                    </div>
                    <p className="text-muted-foreground">Central de erros e falhas críticas do Nicochat e N8N</p>
                </div>
                <Button
                    onClick={() => { carregarLogs(paginacao.currentPage); carregarStats(); }}
                    disabled={loading}
                    variant="outline"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                </Button>
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

            <StatsErros />
            <ErrosPorFerramenta />

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Filtros de Pesquisa
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-6">
                        <div>
                            <Label>🔧 Ferramenta</Label>
                            <Select value={filtros.ferramenta} onValueChange={(value) => setFiltros(prev => ({ ...prev, ferramenta: value || '' }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Todas</SelectItem>
                                    <SelectItem value="Nicochat">🤖 Nicochat</SelectItem>
                                    <SelectItem value="N8N">⚙️ N8N</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div>
                            <Label>⚠️ Gravidade</Label>
                            <Select value={filtros.nivel} onValueChange={(value) => setFiltros(prev => ({ ...prev, nivel: value }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="error,critical">Todos os erros</SelectItem>
                                    <SelectItem value="error">🟠 Apenas Error</SelectItem>
                                    <SelectItem value="critical">🔴 Apenas Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div>
                            <Label>🌍 País (Nicochat)</Label>
                            <Select value={filtros.pais} onValueChange={(value) => setFiltros(prev => ({ ...prev, pais: value || '' }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Todos</SelectItem>
                                    <SelectItem value="colombia">🇨🇴 Colômbia</SelectItem>
                                    <SelectItem value="chile">🇨🇱 Chile</SelectItem>
                                    <SelectItem value="mexico">🇲🇽 México</SelectItem>
                                    <SelectItem value="polonia">🇵🇱 Polônia</SelectItem>
                                    <SelectItem value="romenia">🇷🇴 Romênia</SelectItem>
                                    <SelectItem value="espanha">🇪🇸 Espanha</SelectItem>
                                    <SelectItem value="italia">🇮🇹 Itália</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div>
                            <Label>✅ Status</Label>
                            <Select value={filtros.resolvido} onValueChange={(value) => setFiltros(prev => ({ ...prev, resolvido: value || '' }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Todos</SelectItem>
                                    <SelectItem value="false">⏳ Pendentes</SelectItem>
                                    <SelectItem value="true">✅ Resolvidos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div>
                            <Label>📅 Período</Label>
                            <Select value={filtros.periodo} onValueChange={(value) => setFiltros(prev => ({ ...prev, periodo: value }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1h">Última hora</SelectItem>
                                    <SelectItem value="6h">Últimas 6h</SelectItem>
                                    <SelectItem value="24h">Últimas 24h</SelectItem>
                                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div>
                            <Label>🔍 Buscar Erro</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Mensagem..."
                                    value={filtros.busca}
                                    onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela de Erros */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-red-600" />
                            <CardTitle>Central de Erros</CardTitle>
                        </div>
                        <Badge variant="destructive">{paginacao.totalItems} erros</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <LoadingSpinner className="h-8 w-8" />
                        </div>
                    )}
                    
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data/Hora</TableHead>
                                    <TableHead>Ferramenta</TableHead>
                                    <TableHead>Gravidade</TableHead>
                                    <TableHead>Erro</TableHead>
                                    <TableHead>País</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => {
                                    const Icon = getNivelIcon(log.nivel);
                                    return (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="text-sm font-medium">{log.tempo_relativo}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={log.ferramenta === 'Nicochat' ? 'default' : 'secondary'}>
                                                    {log.ferramenta === 'Nicochat' ? '🤖' : '⚙️'} {log.ferramenta}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={log.nivel === 'critical' ? 'destructive' : 'secondary'}>
                                                    <Icon className="h-3 w-3 mr-1" />
                                                    {log.nivel.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell style={{ maxWidth: '300px' }}>
                                                <p className="text-sm text-red-600 truncate">
                                                    {log.mensagem}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                {log.pais && (
                                                    <Badge variant="outline">
                                                        <span className="mr-1">{getPaisFlag(log.pais)}</span>
                                                        {getPaisDisplayName(log.pais)}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={log.resolvido ? 'default' : 'secondary'}>
                                                    {log.resolvido ? <Check className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                                                    {log.resolvido ? 'Resolvido' : 'Pendente'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setLogSelecionado(log);
                                                            setModalDetalhes(true);
                                                        }}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setLogSelecionado(log);
                                                            setObservacoesResolucao('');
                                                            setModalResolucao(true);
                                                        }}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        {log.resolvido ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Paginação */}
                    {logs.length > 0 && (
                        <div className="flex items-center justify-center mt-6 space-y-2">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious 
                                            onClick={() => handlePageChange(Math.max(1, paginacao.currentPage - 1))}
                                            className={paginacao.currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                    
                                    {Array.from({ length: Math.min(5, paginacao.totalPages) }, (_, i) => {
                                        const pageNum = i + 1;
                                        return (
                                            <PaginationItem key={pageNum}>
                                                <PaginationLink
                                                    onClick={() => handlePageChange(pageNum)}
                                                    isActive={pageNum === paginacao.currentPage}
                                                    className="cursor-pointer"
                                                >
                                                    {pageNum}
                                                </PaginationLink>
                                            </PaginationItem>
                                        );
                                    })}
                                    
                                    <PaginationItem>
                                        <PaginationNext 
                                            onClick={() => handlePageChange(Math.min(paginacao.totalPages, paginacao.currentPage + 1))}
                                            className={paginacao.currentPage >= paginacao.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                            <p className="text-sm text-muted-foreground">
                                Página {paginacao.currentPage} de {paginacao.totalPages} 
                                ({paginacao.totalItems} erros no total)
                            </p>
                        </div>
                    )}

                    {logs.length === 0 && !loading && (
                        <div className="text-center py-12">
                            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-4">
                                <Check className="h-8 w-8 text-green-600" />
                            </div>
                            <p className="text-green-600 font-medium">Nenhum erro encontrado! 🎉</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Todas as ferramentas estão funcionando sem problemas
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Detalhes */}
            <Dialog open={modalDetalhes} onOpenChange={setModalDetalhes}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            Detalhes do Erro
                        </DialogTitle>
                    </DialogHeader>
                    {logSelecionado && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Badge variant={logSelecionado.ferramenta === 'Nicochat' ? 'default' : 'secondary'}>
                                    {logSelecionado.ferramenta === 'Nicochat' ? '🤖' : '⚙️'} {logSelecionado.ferramenta}
                                </Badge>
                                <Badge variant={logSelecionado.nivel === 'critical' ? 'destructive' : 'secondary'}>
                                    {logSelecionado.nivel.toUpperCase()}
                                </Badge>
                                {logSelecionado.pais && (
                                    <Badge variant="outline">
                                        <span className="mr-1">{getPaisFlag(logSelecionado.pais)}</span>
                                        {getPaisDisplayName(logSelecionado.pais)}
                                    </Badge>
                                )}
                            </div>
                            
                            <div className="border-t pt-4">
                                <Label className="text-sm font-medium">🚨 Mensagem de Erro:</Label>
                                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                                    <p className="text-red-800">{logSelecionado.mensagem}</p>
                                </div>
                            </div>
                            
                            {logSelecionado.id_conversa && (
                                <div>
                                    <Label className="text-sm font-medium">💬 ID da Conversa:</Label>
                                    <div className="mt-2 p-2 bg-muted rounded font-mono text-sm">
                                        {logSelecionado.id_conversa}
                                    </div>
                                </div>
                            )}
                            
                            {logSelecionado.detalhes && Object.keys(logSelecionado.detalhes).length > 0 && (
                                <div>
                                    <Label className="text-sm font-medium">🔧 Detalhes Técnicos:</Label>
                                    <Textarea
                                        value={JSON.stringify(logSelecionado.detalhes, null, 2)}
                                        readOnly
                                        className="mt-2 font-mono text-xs"
                                        rows={6}
                                    />
                                </div>
                            )}
                            
                            <div className="border-t pt-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">🕒 Ocorreu em:</Label>
                                        <p className="text-sm">{new Date(logSelecionado.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">🌐 IP de Origem:</Label>
                                        <p className="text-sm">{logSelecionado.ip_origem || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {logSelecionado.resolvido && (
                                <Alert className="border-green-500">
                                    <Check className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>✅ Erro resolvido por: {logSelecionado.resolvido_por_nome}</strong><br />
                                        🕒 Em: {new Date(logSelecionado.data_resolucao).toLocaleString()}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Resolução */}
            <Dialog open={modalResolucao} onOpenChange={setModalResolucao}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {logSelecionado?.resolvido ? '↩️ Reabrir Erro' : '✅ Marcar como Resolvido'}
                        </DialogTitle>
                        <DialogDescription>
                            Deseja marcar este erro como {logSelecionado?.resolvido ? 'não resolvido' : 'resolvido'}?
                        </DialogDescription>
                    </DialogHeader>
                    {logSelecionado && (
                        <div className="space-y-4">
                            <div>
                                <Label>📝 Observações sobre a resolução</Label>
                                <Textarea
                                    placeholder="Descreva como o erro foi resolvido..."
                                    value={observacoesResolucao}
                                    onChange={(e) => setObservacoesResolucao(e.target.value)}
                                    rows={3}
                                    className="mt-1"
                                />
                            </div>
                            
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setModalResolucao(false)}>
                                    Cancelar
                                </Button>
                                <Button 
                                    variant={logSelecionado.resolvido ? 'secondary' : 'default'}
                                    onClick={() => marcarResolvido(logSelecionado.id, !logSelecionado.resolvido)}
                                >
                                    {logSelecionado.resolvido ? <X className="h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                    {logSelecionado.resolvido ? 'Reabrir Erro' : 'Marcar Resolvido'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default LogsPage;