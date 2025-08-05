// frontend/src/features/ia/LogsPage.js - VERSÃO SHADCN/UI
import React, { useState, useEffect } from 'react';
import {
    Search, RefreshCw, Check, X,
    AlertTriangle, AlertCircle,
    Eye, Clock, MapPin, Bot,
    BarChart3, Activity, GitBranch,
    Settings, Globe, MessageCircle,
    Wrench, Flag, Calendar
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

    const getPaisIcon = () => {
        return Globe;
    };

    // Componente de estatísticas de erros
    const StatsErros = () => {
        if (!stats) return null;
        
        return (
            <div className="flex items-center gap-3">
                <Card className="w-32 bg-gradient-to-b from-muted/50 to-muted border-border">
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Total</p>
                                <p className="text-lg font-bold text-red-600">{stats.total_erros_7d}</p>
                            </div>
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="w-32 bg-gradient-to-b from-muted/50 to-muted border-border">
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Pendentes</p>
                                <p className="text-lg font-bold text-orange-600">{stats.nao_resolvidos}</p>
                            </div>
                            <Clock className="h-4 w-4 text-orange-600" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="w-32 bg-gradient-to-b from-muted/50 to-muted border-border">
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Críticos</p>
                                <p className="text-lg font-bold text-red-600">{stats.criticos_7d}</p>
                            </div>
                            <X className="h-4 w-4 text-red-600" />
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
            <div className="flex items-center gap-3 mb-4 p-3 border rounded-lg bg-card">
                <Activity className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Erros por Ferramenta:</span>
                <div className="flex items-center gap-3">
                    {stats.por_ferramenta.map((stat) => (
                        <div key={stat.ferramenta} className="flex items-center gap-2">
                            {stat.ferramenta === 'Nicochat' ? 
                                <Bot className="h-4 w-4" /> : 
                                <Settings className="h-4 w-4" />
                            }
                            <span className="text-sm">{stat.ferramenta}</span>
                            <Badge variant="destructive" className="text-xs px-2 py-0">
                                {stat.erros}
                            </Badge>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 space-y-4 p-4">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Monitoramento de Erros</h1>
                </div>
                <div className="flex items-center gap-3">
                    <StatsErros />
                    <Button
                        onClick={() => { carregarLogs(paginacao.currentPage); carregarStats(); }}
                        disabled={loading}
                        variant="outline"
                        className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Notificações */}
            {notification && (
                <Alert className={`${notification.type === 'error' ? 'border-destructive bg-destructive/10' : 'border-green-500 bg-green-500/10'}`}>
                    {notification.type === 'success' ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-destructive" />}
                    <AlertDescription className="text-foreground">
                        <strong>{notification.type === 'success' ? 'Sucesso!' : 'Erro!'}</strong> {notification.message}
                    </AlertDescription>
                </Alert>
            )}

            <ErrosPorFerramenta />


            {/* Tabela de Erros */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-red-600" />
                            <CardTitle className="text-base">Central de Erros</CardTitle>
                        </div>
                        <Badge variant="destructive" className="text-xs">{paginacao.totalItems}</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-6">
                        <div>
                            <Label className="text-xs font-medium mb-1 block">Ferramenta</Label>
                            <Select value={filtros.ferramenta || "todas"} onValueChange={(value) => setFiltros(prev => ({ ...prev, ferramenta: value === "todas" ? '' : value }))}>
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todas">Todas</SelectItem>
                                    <SelectItem value="Nicochat">Nicochat</SelectItem>
                                    <SelectItem value="N8N">N8N</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div>
                            <Label className="text-xs font-medium mb-1 block">Gravidade</Label>
                            <Select value={filtros.nivel} onValueChange={(value) => setFiltros(prev => ({ ...prev, nivel: value }))}>
                                <SelectTrigger className="h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="error,critical">Todos os erros</SelectItem>
                                    <SelectItem value="error">Apenas Error</SelectItem>
                                    <SelectItem value="critical">Apenas Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div>
                            <Label className="text-xs font-medium mb-1 block">País</Label>
                            <Select value={filtros.pais || "todos"} onValueChange={(value) => setFiltros(prev => ({ ...prev, pais: value === "todos" ? '' : value }))}>
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos</SelectItem>
                                    <SelectItem value="colombia">Colômbia</SelectItem>
                                    <SelectItem value="chile">Chile</SelectItem>
                                    <SelectItem value="mexico">México</SelectItem>
                                    <SelectItem value="polonia">Polônia</SelectItem>
                                    <SelectItem value="romenia">Romênia</SelectItem>
                                    <SelectItem value="espanha">Espanha</SelectItem>
                                    <SelectItem value="italia">Itália</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div>
                            <Label className="text-xs font-medium mb-1 block">Status</Label>
                            <Select value={filtros.resolvido || "todos"} onValueChange={(value) => setFiltros(prev => ({ ...prev, resolvido: value === "todos" ? '' : value }))}>
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos</SelectItem>
                                    <SelectItem value="false">Pendentes</SelectItem>
                                    <SelectItem value="true">Resolvidos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div>
                            <Label className="text-xs font-medium mb-1 block">Período</Label>
                            <Select value={filtros.periodo} onValueChange={(value) => setFiltros(prev => ({ ...prev, periodo: value }))}>
                                <SelectTrigger className="h-8">
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
                            <Label className="text-xs font-medium mb-1 block">Buscar</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                                <Input
                                    placeholder="Mensagem..."
                                    value={filtros.busca}
                                    onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                                    className="pl-7 h-8 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    {loading && (
                        <div className="flex items-center justify-center py-4">
                            <LoadingSpinner className="h-6 w-6" />
                        </div>
                    )}
                    
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="h-8">
                                    <TableHead className="text-xs p-2">Data/Hora</TableHead>
                                    <TableHead className="text-xs p-2">Ferramenta</TableHead>
                                    <TableHead className="text-xs p-2">Gravidade</TableHead>
                                    <TableHead className="text-xs p-2">Erro</TableHead>
                                    <TableHead className="text-xs p-2">País</TableHead>
                                    <TableHead className="text-xs p-2">Status</TableHead>
                                    <TableHead className="text-xs p-2">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => {
                                    const Icon = getNivelIcon(log.nivel);
                                    return (
                                        <TableRow key={log.id} className="h-10">
                                            <TableCell className="p-2">
                                                <div>
                                                    <p className="text-xs font-medium">{log.tempo_relativo}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <div className="flex items-center gap-1">
                                                    {log.ferramenta === 'Nicochat' ? 
                                                        <Bot className="h-3 w-3" /> : 
                                                        <Settings className="h-3 w-3" />
                                                    }
                                                    <span className="text-xs">{log.ferramenta}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Badge variant={log.nivel === 'critical' ? 'destructive' : 'secondary'} className="text-xs px-2 py-0">
                                                    <Icon className="h-3 w-3 mr-1" />
                                                    {log.nivel.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="p-2" style={{ maxWidth: '250px' }}>
                                                <p className="text-xs text-red-600 truncate">
                                                    {log.mensagem}
                                                </p>
                                            </TableCell>
                                            <TableCell className="p-2">
                                                {log.pais && (
                                                    <div className="flex items-center gap-1">
                                                        <Globe className="h-3 w-3" />
                                                        <span className="text-xs">{getPaisDisplayName(log.pais)}</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Badge variant={log.resolvido ? 'default' : 'secondary'} className="text-xs px-2 py-0">
                                                    {log.resolvido ? <Check className="h-2 w-2 mr-1" /> : <Clock className="h-2 w-2 mr-1" />}
                                                    {log.resolvido ? 'OK' : 'Pendente'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setLogSelecionado(log);
                                                            setModalDetalhes(true);
                                                        }}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setLogSelecionado(log);
                                                            setObservacoesResolucao('');
                                                            setModalResolucao(true);
                                                        }}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        {log.resolvido ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
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
                        <div className="flex items-center justify-center mt-4 space-y-2">
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
                        <div className="text-center py-8">
                            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-3">
                                <Check className="h-6 w-6 text-green-600" />
                            </div>
                            <p className="text-green-600 font-medium">Nenhum erro encontrado!</p>
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
                                <div className="flex items-center gap-1">
                                    {logSelecionado.ferramenta === 'Nicochat' ? 
                                        <Bot className="h-3 w-3" /> : 
                                        <Settings className="h-3 w-3" />
                                    }
                                    <span className="text-sm font-medium">{logSelecionado.ferramenta}</span>
                                </div>
                                <Badge variant={logSelecionado.nivel === 'critical' ? 'destructive' : 'secondary'}>
                                    {logSelecionado.nivel.toUpperCase()}
                                </Badge>
                                {logSelecionado.pais && (
                                    <div className="flex items-center gap-1">
                                        <Globe className="h-3 w-3" />
                                        <span className="text-sm">{getPaisDisplayName(logSelecionado.pais)}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="border-t pt-4">
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Mensagem de Erro:
                                </Label>
                                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                                    <p className="text-red-800">{logSelecionado.mensagem}</p>
                                </div>
                            </div>
                            
                            {logSelecionado.id_conversa && (
                                <div>
                                    <Label className="text-sm font-medium flex items-center gap-1">
                                        <MessageCircle className="h-3 w-3" />
                                        ID da Conversa:
                                    </Label>
                                    <div className="mt-2 p-2 bg-muted rounded font-mono text-sm">
                                        {logSelecionado.id_conversa}
                                    </div>
                                </div>
                            )}
                            
                            {logSelecionado.detalhes && Object.keys(logSelecionado.detalhes).length > 0 && (
                                <div>
                                    <Label className="text-sm font-medium flex items-center gap-1">
                                        <Settings className="h-3 w-3" />
                                        Detalhes Técnicos:
                                    </Label>
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
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            Ocorreu em:
                                        </Label>
                                        <p className="text-sm">{new Date(logSelecionado.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <Globe className="h-3 w-3" />
                                            IP de Origem:
                                        </Label>
                                        <p className="text-sm">{logSelecionado.ip_origem || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {logSelecionado.resolvido && (
                                <Alert className="border-green-500">
                                    <Check className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Erro resolvido por: {logSelecionado.resolvido_por_nome}</strong><br />
                                        Em: {new Date(logSelecionado.data_resolucao).toLocaleString()}
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
                            {logSelecionado?.resolvido ? 'Reabrir Erro' : 'Marcar como Resolvido'}
                        </DialogTitle>
                        <DialogDescription>
                            Deseja marcar este erro como {logSelecionado?.resolvido ? 'não resolvido' : 'resolvido'}?
                        </DialogDescription>
                    </DialogHeader>
                    {logSelecionado && (
                        <div className="space-y-4">
                            <div>
                                <Label className="flex items-center gap-1">
                                    <MessageCircle className="h-3 w-3" />
                                    Observações sobre a resolução
                                </Label>
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