// frontend/src/features/metricas/DropiPage.js - VERSÃO ESTRUTURADA COMO ECOMHUB
import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon, Download, Trash2, RefreshCw, Check, X, 
    AlertTriangle, TrendingUp, BarChart3, Eye, Search, Globe, 
    Filter, Rocket, Loader2, ShoppingCart, Target, Percent,
    Package, DollarSign, Building, Clock, User
} from 'lucide-react';
import axios from 'axios';
import { getCSRFToken } from '../../utils/csrf';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Separator } from '../../components/ui/separator';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

const PAISES = [
    { value: 'mexico', label: '🇲🇽 México' },
    { value: 'chile', label: '🇨🇱 Chile' },
    { value: 'colombia', label: '🇨🇴 Colômbia' }
];

// Status traduzidos do Dropi
const STATUS_DROPI = {
    'GUIA_GENERADA': { label: 'Guia Gerada', color: 'blue' },
    'PREPARADO PARA TRANSPORTADORA': { label: 'Preparado', color: 'orange' },
    'ENTREGADO A TRANSPORTADORA': { label: 'Entregue', color: 'green' },
    'INTENTO DE ENTREGA': { label: 'Tentativa', color: 'yellow' },
    'CANCELADO': { label: 'Cancelado', color: 'red' },
    'PENDIENTE': { label: 'Pendente', color: 'gray' }
};

function DropiPage() {
    // Estados principais
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [dadosResultado, setDadosResultado] = useState(null);
    const [secaoAtiva, setSecaoAtiva] = useState('gerar');
    
    // Estados do formulário - usando strings para input type="date"
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [paisSelecionado, setPaisSelecionado] = useState(null);
    
    // Estados de modal e loading
    const [modalSalvar, setModalSalvar] = useState(false);
    const [modalInstrucoes, setModalInstrucoes] = useState(false);
    const [nomeAnalise, setNomeAnalise] = useState('');
    const [loadingProcessar, setLoadingProcessar] = useState(false);
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [loadingAnalises, setLoadingAnalises] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState({});
    
    // Estados de notificação e progresso
    const [notification, setNotification] = useState(null);
    const [progressoAtual, setProgressoAtual] = useState(null);

    // Estados para filtros da tabela
    const [filtroStatus, setFiltroStatus] = useState('');
    const [filtroFornecedor, setFiltroFornecedor] = useState('');
    const [filtroNome, setFiltroNome] = useState('');

    // ======================== FUNÇÕES DE API ========================

    const fetchAnalises = async () => {
        setLoadingAnalises(true);
        try {
            const response = await axios.get('/metricas/dropi/analises/');
            setAnalisesSalvas(response.data);
        } catch (error) {
            console.error('Erro ao buscar análises:', error);
            showNotification('error', 'Erro ao carregar análises salvas');
        } finally {
            setLoadingAnalises(false);
        }
    };

    const getAnalisesFiltradas = () => {
        if (!paisSelecionado) return analisesSalvas;
        const paisNome = PAISES.find(p => p.value === paisSelecionado)?.label;
        return analisesSalvas.filter(analise => 
            analise.nome.includes(paisNome) || analise.descricao?.includes(paisNome)
        );
    };

    const processarDados = async () => {
        if (!dataInicio || !dataFim || !paisSelecionado) {
            showNotification('error', 'Selecione as datas e o país');
            return;
        }

        if (new Date(dataInicio) > new Date(dataFim)) {
            showNotification('error', 'Data de início deve ser anterior à data fim');
            return;
        }

        setLoadingProcessar(true);
        setProgressoAtual({ etapa: 'Iniciando...', porcentagem: 0 });

        try {
            const response = await axios.post('/metricas/dropi/analises/extract_orders_new_api/', {
                data_inicio: dataInicio,
                data_fim: dataFim,
                pais: paisSelecionado
            }, {
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (response.data.status === 'success') {
                setDadosResultado(response.data.dados_processados);
                showNotification('success', 'Dados processados com sucesso!');
                
                const paisNome = PAISES.find(p => p.value === paisSelecionado)?.label || 'País';
                const dataStr = `${new Date(dataInicio).toLocaleDateString('pt-BR')} - ${new Date(dataFim).toLocaleDateString('pt-BR')}`;
                setNomeAnalise(`${paisNome} ${dataStr}`);
            }
        } catch (error) {
            console.error('Erro no processamento:', error);
            showNotification('error', `Erro: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingProcessar(false);
            setProgressoAtual(null);
        }
    };

    const salvarAnalise = async () => {
        if (!dadosResultado || !nomeAnalise) {
            showNotification('error', 'Dados ou nome da análise inválidos');
            return;
        }

        setLoadingSalvar(true);
        try {
            const descricaoPais = `Extração Dropi - ${PAISES.find(p => p.value === paisSelecionado)?.label}`;

            const response = await axios.post('/metricas/dropi/analises/', {
                nome: nomeAnalise,
                dados_pedidos: dadosResultado,
                data_inicio: dataInicio,
                data_fim: dataFim,
                pais: paisSelecionado,
                total_pedidos: dadosResultado?.length || 0,
                tipo_metrica: 'pedidos',
                descricao: descricaoPais
            }, {
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (response.data.id) {
                showNotification('success', `Análise '${nomeAnalise}' salva!`);
                setModalSalvar(false);
                setNomeAnalise('');
                fetchAnalises();
            }
        } catch (error) {
            showNotification('error', `Erro ao salvar: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingSalvar(false);
        }
    };

    const carregarAnalise = (analise) => {
        setDadosResultado(analise.dados_pedidos);
        setSecaoAtiva('gerar');
        showNotification('success', 'Análise carregada!');
    };

    const deletarAnalise = async (id, nome) => {
        const nomeDisplay = nome.replace('[DROPI] ', '');
        if (!window.confirm(`Deletar análise '${nomeDisplay}'?`)) return;

        setLoadingDelete(prev => ({ ...prev, [id]: true }));
        try {
            await axios.delete(`/metricas/dropi/analises/${id}/`, {
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });
            showNotification('success', `Análise deletada!`);
            fetchAnalises();
            
            if (dadosResultado && dadosResultado?.id === id) {
                setDadosResultado(null);
            }
        } catch (error) {
            showNotification('error', `Erro ao deletar: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingDelete(prev => ({ ...prev, [id]: false }));
        }
    };

    // ======================== FUNÇÕES AUXILIARES ========================

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    // Filtrar dados da tabela
    const dadosFiltrados = dadosResultado?.filter(pedido => {
        const matchStatus = !filtroStatus || pedido.status?.includes(filtroStatus.toUpperCase());
        const matchFornecedor = !filtroFornecedor || pedido.supplier_name?.toLowerCase().includes(filtroFornecedor.toLowerCase());
        const matchNome = !filtroNome || pedido.name?.toLowerCase().includes(filtroNome.toLowerCase());
        return matchStatus && matchFornecedor && matchNome;
    }) || [];

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    // Header minimalista
    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Análise de Pedidos Dropi</h1>
            </div>
            
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModalInstrucoes(true)}
                    className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Instruções
                </Button>
                
                <Select value={paisSelecionado} onValueChange={setPaisSelecionado}>
                    <SelectTrigger className="w-52 border-border bg-background text-foreground">
                        <Globe className="h-4 w-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-popover">
                        {PAISES.map(pais => (
                            <SelectItem key={pais.value} value={pais.value} className="text-popover-foreground hover:bg-accent">
                                {pais.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    // Formulário com input type="date" (mais confiável)
    const renderFormulario = () => (
        <Card className="mb-6 relative border-border bg-card">
            {loadingProcessar && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur flex flex-col items-center justify-center z-10 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                    <p className="font-medium mb-2 text-foreground">Processando dados...</p>
                    {progressoAtual && (
                        <>
                            <Progress value={progressoAtual.porcentagem} className="w-60 mb-2" />
                            <p className="text-sm text-muted-foreground">{progressoAtual.etapa}</p>
                        </>
                    )}
                </div>
            )}

            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Filter className="h-5 w-5 text-primary" />
                        <div>
                            <CardTitle className="text-card-foreground">Configuração</CardTitle>
                            <CardDescription className="text-muted-foreground">Configure o período e execute</CardDescription>
                        </div>
                    </div>

                    <div className="flex items-end gap-4">
                        {/* Data Início - input nativo */}
                        <div>
                            <Label className="mb-2 block text-foreground">Data de Início</Label>
                            <Input
                                type="date"
                                value={dataInicio}
                                onChange={(e) => setDataInicio(e.target.value)}
                                disabled={loadingProcessar}
                                className="w-48 border-border bg-background text-foreground"
                                max={new Date().toISOString().split('T')[0]}
                                min="2020-01-01"
                            />
                        </div>
                        
                        {/* Data Fim - input nativo */}
                        <div>
                            <Label className="mb-2 block text-foreground">Data de Fim</Label>
                            <Input
                                type="date"
                                value={dataFim}
                                onChange={(e) => setDataFim(e.target.value)}
                                disabled={loadingProcessar}
                                className="w-48 border-border bg-background text-foreground"
                                max={new Date().toISOString().split('T')[0]}
                                min={dataInicio || "2020-01-01"}
                            />
                        </div>
                        
                        <Button
                            onClick={processarDados}
                            disabled={!dataInicio || !dataFim || !paisSelecionado || loadingProcessar}
                            size="lg"
                            className="min-w-36 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {loadingProcessar ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Search className="h-4 w-4 mr-2" />
                            )}
                            {loadingProcessar ? 'Processando...' : 'Processar'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );

    // Estatísticas
    const renderEstatisticas = () => {
        if (!dadosResultado || !Array.isArray(dadosResultado)) return null;
        
        const totalPedidos = dadosResultado.length;
        const totalValor = dadosResultado.reduce((sum, item) => sum + (parseFloat(item.total_order) || 0), 0);
        
        // Contar por status
        const statusCount = dadosResultado.reduce((acc, item) => {
            const status = item.status || 'UNKNOWN';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
        
        const entregues = statusCount['ENTREGADO A TRANSPORTADORA'] || 0;
        const efetividade = totalPedidos > 0 ? ((entregues / totalPedidos) * 100).toFixed(1) : 0;
        
        return (
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pedidos</p>
                                <p className="text-xl font-bold text-card-foreground">{totalPedidos}</p>
                            </div>
                            <Package className="h-5 w-5 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Entregues</p>
                                <p className="text-xl font-bold text-green-600">{entregues.toLocaleString()}</p>
                            </div>
                            <TrendingUp className="h-5 w-5 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Valor Total</p>
                                <p className="text-xl font-bold text-blue-600">R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <Target className="h-5 w-5 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Taxa Entrega</p>
                                <p className="text-xl font-bold text-orange-600">{efetividade}%</p>
                            </div>
                            <Percent className="h-5 w-5 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderFiltros = () => (
        <Card className="mb-4 border-border bg-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-card-foreground">
                    <Target className="h-4 w-4" />
                    Filtros
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="relative">
                        <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filtrar por status..."
                            value={filtroStatus}
                            onChange={(e) => setFiltroStatus(e.target.value)}
                            className="pl-10 border-border bg-background text-foreground"
                        />
                    </div>
                    
                    <div className="relative">
                        <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filtrar por fornecedor..."
                            value={filtroFornecedor}
                            onChange={(e) => setFiltroFornecedor(e.target.value)}
                            className="pl-10 border-border bg-background text-foreground"
                        />
                    </div>
                    
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filtrar por nome cliente..."
                            value={filtroNome}
                            onChange={(e) => setFiltroNome(e.target.value)}
                            className="pl-10 border-border bg-background text-foreground"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );


    // Tabela responsiva
    const renderResultados = () => {
        if (!dadosResultado || !Array.isArray(dadosResultado)) return null;

        return (
            <Card className="mb-6 border-border bg-card">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg text-card-foreground">Resultados</CardTitle>
                            <CardDescription className="text-muted-foreground">{dadosFiltrados.length} registros</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setModalSalvar(true)}
                                className="border-border bg-background text-foreground hover:bg-accent"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Salvar
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {renderFiltros()}
                    
                    <div className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 border-border">
                                        <TableHead className="whitespace-nowrap px-2 py-2 text-xs text-muted-foreground">ID</TableHead>
                                        <TableHead className="whitespace-nowrap px-2 py-2 text-xs text-muted-foreground">Cliente</TableHead>
                                        <TableHead className="whitespace-nowrap px-2 py-2 text-xs text-muted-foreground">Fornecedor</TableHead>
                                        <TableHead className="whitespace-nowrap px-2 py-2 text-xs text-muted-foreground">Status</TableHead>
                                        <TableHead className="whitespace-nowrap px-2 py-2 text-xs text-muted-foreground">Valor</TableHead>
                                        <TableHead className="whitespace-nowrap px-2 py-2 text-xs text-muted-foreground">Telefone</TableHead>
                                        <TableHead className="whitespace-nowrap px-2 py-2 text-xs text-muted-foreground">Cidade</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dadosFiltrados.map((pedido) => (
                                        <TableRow key={pedido.id} className="border-border">
                                            <TableCell className="px-2 py-2 text-xs text-card-foreground">
                                                <span className="font-medium">{pedido.id}</span>
                                            </TableCell>
                                            <TableCell className="px-2 py-2 text-xs text-card-foreground">
                                                <div>
                                                    <p className="font-medium">{pedido.name} {pedido.surname}</p>
                                                    {pedido.client_email && (
                                                        <p className="text-xs text-muted-foreground">{pedido.client_email}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-2 py-2 text-xs text-card-foreground">
                                                <span>{pedido.supplier_name}</span>
                                            </TableCell>
                                            <TableCell className="px-2 py-2 text-xs text-card-foreground">
                                                <Badge 
                                                    variant="secondary"
                                                    className={`${
                                                        STATUS_DROPI[pedido.status]?.color === 'red' ? 'bg-red-100 text-red-800' :
                                                        STATUS_DROPI[pedido.status]?.color === 'green' ? 'bg-green-100 text-green-800' :
                                                        STATUS_DROPI[pedido.status]?.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                                                        STATUS_DROPI[pedido.status]?.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                                        STATUS_DROPI[pedido.status]?.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}
                                                >
                                                    {STATUS_DROPI[pedido.status]?.label || pedido.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-2 py-2 text-xs text-card-foreground">
                                                <span className="font-medium text-green-600">
                                                    R$ {parseFloat(pedido.total_order || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-2 py-2 text-xs text-card-foreground">
                                                <span>{pedido.phone}</span>
                                            </TableCell>
                                            <TableCell className="px-2 py-2 text-xs text-card-foreground">
                                                <span className="truncate max-w-[120px] block" title={pedido.dir}>
                                                    {pedido.dir}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    // Análises salvas
    const renderAnalisesSalvas = () => {
        const analisesFiltradas = getAnalisesFiltradas();
        
        return (
            <Card className="relative border-border bg-card">
                {loadingAnalises && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur flex items-center justify-center z-10 rounded-lg">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                )}

                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-card-foreground">Análises Salvas</CardTitle>
                            <CardDescription className="text-muted-foreground">{analisesFiltradas.length} análises encontradas</CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchAnalises}
                            className="border-border bg-background text-foreground hover:bg-accent"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Atualizar
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {analisesFiltradas.length === 0 ? (
                        <Alert className="border-border bg-background">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <AlertDescription className="text-muted-foreground">
                                Nenhuma análise salva encontrada. Processe dados e salve o resultado.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {analisesFiltradas.map(analise => (
                                <Card key={analise.id} className="relative border-border bg-card">
                                    {loadingDelete[analise.id] && (
                                        <div className="absolute inset-0 bg-background/80 backdrop-blur flex items-center justify-center z-10 rounded-lg">
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        </div>
                                    )}

                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-medium text-sm truncate max-w-[80%] text-card-foreground">
                                                {analise.nome.replace('[DROPI] ', '')}
                                            </h3>
                                            <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">DROPI</Badge>
                                        </div>

                                        <p className="text-xs text-muted-foreground mb-3">
                                            {new Date(analise.criado_em).toLocaleDateString('pt-BR')}
                                        </p>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => carregarAnalise(analise)}
                                                className="flex-1 border-border bg-background text-foreground hover:bg-accent"
                                            >
                                                <Eye className="h-3 w-3 mr-1" />
                                                Carregar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => deletarAnalise(analise.id, analise.nome)}
                                                disabled={loadingDelete[analise.id]}
                                                className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    // ======================== EFEITOS ========================

    useEffect(() => {
        fetchAnalises();
        
        // Definir datas padrão (última semana) como strings para input type="date"
        const hoje = new Date();
        const setemantepassada = new Date();
        setemantepassada.setDate(hoje.getDate() - 7);
        
        setDataFim(hoje.toISOString().split('T')[0]);
        setDataInicio(setemantepassada.toISOString().split('T')[0]);
    }, []);

    // ======================== RENDER PRINCIPAL ========================

    return (
        <div className="flex-1 space-y-4 p-6 min-h-screen bg-background">
            {/* Notificações */}
            {notification && (
                <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className="mb-4 border-border">
                    {notification.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <AlertDescription>{notification.message}</AlertDescription>
                </Alert>
            )}

            {/* Header minimalista */}
            {renderHeader()}

            {/* Navegação */}
            {paisSelecionado && (
                <Tabs value={secaoAtiva} onValueChange={setSecaoAtiva} className="w-full">
                    <TabsList className="grid w-fit grid-cols-2 bg-muted">
                        <TabsTrigger value="gerar" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                            <Rocket className="h-4 w-4 mr-2" />
                            Gerar
                        </TabsTrigger>
                        <TabsTrigger value="salvas" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Salvas
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="gerar" className="space-y-4">
                        {renderFormulario()}
                        {renderEstatisticas()}
                        {renderResultados()}
                    </TabsContent>

                    <TabsContent value="salvas">
                        {renderAnalisesSalvas()}
                    </TabsContent>
                </Tabs>
            )}

            {/* Modal instruções */}
            <Dialog open={modalInstrucoes} onOpenChange={setModalInstrucoes}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto border-border bg-popover">
                    <DialogHeader>
                        <DialogTitle className="text-orange-600">Manual de Instruções - Métricas DROPI</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Guia completo para uso da ferramenta
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-lg font-semibold text-orange-600 mb-3">Países Suportados</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="border-blue-200 bg-card">
                                    <CardContent className="p-4">
                                        <h5 className="font-semibold text-blue-600 text-sm">🇲🇽 México</h5>
                                        <p className="text-xs text-muted-foreground">Extração de pedidos Dropi México</p>
                                    </CardContent>
                                </Card>
                                
                                <Card className="border-red-200 bg-card">
                                    <CardContent className="p-4">
                                        <h5 className="font-semibold text-red-600 text-sm">🇨🇱 Chile</h5>
                                        <p className="text-xs text-muted-foreground">Extração de pedidos Dropi Chile</p>
                                    </CardContent>
                                </Card>
                                
                                <Card className="border-yellow-200 bg-card">
                                    <CardContent className="p-4">
                                        <h5 className="font-semibold text-yellow-600 text-sm">🇨🇴 Colômbia</h5>
                                        <p className="text-xs text-muted-foreground">Extração de pedidos Dropi Colômbia</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h4 className="text-lg font-semibold text-green-600 mb-3">Status dos Pedidos</h4>
                            <p className="text-sm text-muted-foreground mb-4">Status traduzidos e organizados:</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(STATUS_DROPI).map(([key, status]) => (
                                    <Card key={key} className="border-gray-200 bg-card">
                                        <CardContent className="p-3">
                                            <div className="flex items-center gap-2">
                                                <Badge 
                                                    variant="secondary"
                                                    className={`${
                                                        status.color === 'red' ? 'bg-red-100 text-red-800' :
                                                        status.color === 'green' ? 'bg-green-100 text-green-800' :
                                                        status.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                                                        status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                                        status.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}
                                                >
                                                    {status.label}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">{key}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal salvar */}
            <Dialog open={modalSalvar} onOpenChange={setModalSalvar}>
                <DialogContent className="border-border bg-popover">
                    <DialogHeader>
                        <DialogTitle className="text-popover-foreground">Salvar Análise</DialogTitle>
                        <DialogDescription className="text-muted-foreground">Digite um nome para identificar esta análise</DialogDescription>
                    </DialogHeader>
                    
                    <div className="relative py-4">
                        {loadingSalvar && (
                            <div className="absolute inset-0 bg-background/90 backdrop-blur flex items-center justify-center z-10 rounded">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="nome-analise" className="text-foreground">Nome da Análise</Label>
                            <Input
                                id="nome-analise"
                                placeholder="Ex: México Janeiro 2025"
                                value={nomeAnalise}
                                onChange={(e) => setNomeAnalise(e.target.value)}
                                disabled={loadingSalvar}
                                className="border-border bg-background text-foreground"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setModalSalvar(false)} 
                            disabled={loadingSalvar}
                            className="border-border bg-background text-foreground hover:bg-accent"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={salvarAnalise} 
                            disabled={!nomeAnalise || loadingSalvar}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {loadingSalvar ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                            {loadingSalvar ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default DropiPage;