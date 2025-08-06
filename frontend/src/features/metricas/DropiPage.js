// frontend/src/features/metricas/DropiPage.js - VERSÃO SHADCN/UI
import React, { useState, useEffect } from 'react';
import {
    Calendar, Download, Trash2, RefreshCw, Check, X, 
    AlertTriangle, TrendingUp, Building, BarChart3, Plus,
    Eye, Search, Package, Target, Percent, ShoppingCart,
    DollarSign, MapPin, Clock, User, Phone, Mail
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
    
    // Estados do formulário
    const [dataInicio, setDataInicio] = useState(null);
    const [dataFim, setDataFim] = useState(null);
    const [paisSelecionado, setPaisSelecionado] = useState(null);
    
    // Estados de modal e loading
    const [modalSalvar, setModalSalvar] = useState(false);
    const [nomeAnalise, setNomeAnalise] = useState('');
    const [loadingProcessar, setLoadingProcessar] = useState(false);
    const [loadingSalvar, setLoadingSalvar] = useState(false);
    const [loadingAnalises, setLoadingAnalises] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState({});
    
    // Estados de notificação
    const [notification, setNotification] = useState(null);

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

    const processarDados = async () => {
        if (!dataInicio || !dataFim || !paisSelecionado) {
            showNotification('error', 'Preencha todos os campos obrigatórios');
            return;
        }

        if (dataInicio > dataFim) {
            showNotification('error', 'Data de início deve ser anterior à data fim');
            return;
        }

        setLoadingProcessar(true);

        try {
            const response = await axios.post(`/api/metricas/dropi/analises/extract_orders_new_api/`, {
                data_inicio: dataInicio.toISOString().split('T')[0],
                data_fim: dataFim.toISOString().split('T')[0],
                pais: paisSelecionado
            });

            if (response.data.status === 'success') {
                setDadosResultado(response.data.dados_processados);
                showNotification('success', `${response.data.total_pedidos} pedidos extraídos com sucesso!`);
                
                // Gerar nome automático com flag do país
                const paisFlags = { mexico: '🇲🇽', chile: '🇨🇱', colombia: '🇨🇴' };
                const paisNomes = { mexico: 'México', chile: 'Chile', colombia: 'Colômbia' };
                const dataStr = `${dataInicio.toLocaleDateString()} - ${dataFim.toLocaleDateString()}`;
                setNomeAnalise(`Dropi ${paisFlags[paisSelecionado]} ${paisNomes[paisSelecionado]} ${dataStr}`);
            }
        } catch (error) {
            console.error('Erro no processamento:', error);
            showNotification('error', `Erro: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoadingProcessar(false);
        }
    };

    const salvarAnalise = async () => {
        if (!dadosResultado || !nomeAnalise) {
            showNotification('error', 'Dados ou nome da análise inválidos');
            return;
        }

        setLoadingSalvar(true);
        try {
            const response = await axios.post('/metricas/dropi/analises/', {
                nome: nomeAnalise,
                dados_pedidos: dadosResultado,
                data_inicio: dataInicio.toISOString().split('T')[0],
                data_fim: dataFim.toISOString().split('T')[0],
                pais: paisSelecionado,
                total_pedidos: dadosResultado?.length || 0,
                tipo_metrica: 'pedidos',
                descricao: `Extração Dropi - ${dadosResultado?.length || 0} pedidos`
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
        setDataInicio(new Date(analise.data_inicio));
        setDataFim(new Date(analise.data_fim));
        setPaisSelecionado(analise.pais);
        showNotification('success', 'Análise carregada!');
    };

    const deletarAnalise = async (id, nome) => {
        const nomeDisplay = nome.replace('[DROPI] ', '');
        if (!window.confirm(`Deletar análise '${nomeDisplay}'?`)) return;

        setLoadingDelete(prev => ({ ...prev, [id]: true }));
        try {
            await axios.delete(`/metricas/dropi/analises/${id}/`);
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Pedidos</p>
                                <p className="text-2xl font-bold">{totalPedidos}</p>
                            </div>
                            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <ShoppingCart className="h-4 w-4 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Valor Total</p>
                                <p className="text-2xl font-bold text-green-600">R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <DollarSign className="h-4 w-4 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Entregues</p>
                                <p className="text-2xl font-bold text-blue-600">{entregues}</p>
                            </div>
                            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Target className="h-4 w-4 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Taxa Entrega</p>
                                <p className="text-2xl font-bold text-orange-600">{efetividade}%</p>
                            </div>
                            <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                <Percent className="h-4 w-4 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderFormulario = () => (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Extrair Pedidos
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {loadingProcessar && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                        <LoadingSpinner className="h-8 w-8" />
                        <p className="mt-4 font-medium">Extraindo dados do Dropi...</p>
                        <p className="text-sm text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                    <div>
                        <Label htmlFor="pais">País *</Label>
                        <Select value={paisSelecionado} onValueChange={setPaisSelecionado} disabled={loadingProcessar}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o país" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mexico">🇲🇽 México</SelectItem>
                                <SelectItem value="chile">🇨🇱 Chile</SelectItem>
                                <SelectItem value="colombia">🇨🇴 Colômbia</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div>
                        <Label htmlFor="data-inicio">Data de Início *</Label>
                        <Input
                            id="data-inicio"
                            type="date"
                            value={dataInicio ? dataInicio.toISOString().split('T')[0] : ''}
                            onChange={(e) => setDataInicio(e.target.value ? new Date(e.target.value) : null)}
                            disabled={loadingProcessar}
                        />
                    </div>
                    
                    <div>
                        <Label htmlFor="data-fim">Data de Fim *</Label>
                        <Input
                            id="data-fim"
                            type="date"
                            value={dataFim ? dataFim.toISOString().split('T')[0] : ''}
                            onChange={(e) => setDataFim(e.target.value ? new Date(e.target.value) : null)}
                            disabled={loadingProcessar}
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button
                        onClick={processarDados}
                        disabled={!dataInicio || !dataFim || !paisSelecionado || loadingProcessar}
                        className="min-w-[140px]"
                    >
                        {loadingProcessar ? (
                            <>
                                <LoadingSpinner className="h-4 w-4 mr-2" />
                                Extraindo...
                            </>
                        ) : (
                            <>
                                <Search className="h-4 w-4 mr-2" />
                                Extrair Pedidos
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    const renderFiltros = () => (
        <Card className="mb-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
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
                            className="pl-10"
                        />
                    </div>
                    
                    <div className="relative">
                        <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filtrar por fornecedor..."
                            value={filtroFornecedor}
                            onChange={(e) => setFiltroFornecedor(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filtrar por nome cliente..."
                            value={filtroNome}
                            onChange={(e) => setFiltroNome(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    const renderResultados = () => {
        if (!dadosResultado || !Array.isArray(dadosResultado)) return null;

        return (
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>
                            {paisSelecionado ? (
                                <span className="flex items-center gap-2">
                                    Pedidos Dropi {paisSelecionado === 'mexico' ? '🇲🇽 México' : 
                                                    paisSelecionado === 'chile' ? '🇨🇱 Chile' : 
                                                    paisSelecionado === 'colombia' ? '🇨🇴 Colômbia' : 'Dropi'}
                                </span>
                            ) : 'Pedidos Dropi'}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                                {dadosFiltrados.length} de {dadosResultado.length} pedidos
                            </Badge>
                            <Button onClick={() => setModalSalvar(true)} variant="outline">
                                <Download className="h-4 w-4 mr-2" />
                                Salvar Análise
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {renderFiltros()}

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Fornecedor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Telefone</TableHead>
                                    <TableHead>Cidade</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dadosFiltrados.map((pedido) => (
                                    <TableRow key={pedido.id}>
                                        <TableCell>
                                            <span className="text-sm font-medium">{pedido.id}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="text-sm font-medium">{pedido.name} {pedido.surname}</p>
                                                {pedido.client_email && (
                                                    <p className="text-xs text-muted-foreground">{pedido.client_email}</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">{pedido.supplier_name}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant={STATUS_DROPI[pedido.status]?.color === 'green' ? 'default' : 'secondary'}
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
                                        <TableCell>
                                            <span className="text-sm font-medium text-green-600">
                                                R$ {parseFloat(pedido.total_order || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">{pedido.phone}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm truncate max-w-[150px] block">
                                                {pedido.dir}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderAnalisesSalvas = () => (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        <CardTitle>Análises Salvas</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{analisesSalvas.length}</Badge>
                        <Button variant="ghost" size="sm" onClick={fetchAnalises}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Atualizar
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loadingAnalises && (
                    <div className="flex items-center justify-center py-8">
                        <LoadingSpinner className="h-8 w-8" />
                    </div>
                )}

                {analisesSalvas.length === 0 && !loadingAnalises ? (
                    <Alert>
                        <BarChart3 className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Nenhuma análise salva</strong><br />
                            Extraia dados e salve o resultado para vê-lo aqui.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {analisesSalvas.map(analise => (
                            <Card key={analise.id} className="border">
                                <CardContent className="p-4">
                                    {loadingDelete[analise.id] && (
                                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                                            <LoadingSpinner className="h-4 w-4" />
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-medium truncate max-w-[70%]">
                                            {analise.nome.replace('[DROPI] ', '')}
                                        </h4>
                                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                            DROPI
                                        </Badge>
                                    </div>

                                    <p className="text-xs text-muted-foreground mb-2">
                                        {new Date(analise.data_inicio).toLocaleDateString('pt-BR')} - {new Date(analise.data_fim).toLocaleDateString('pt-BR')}
                                    </p>

                                    <p className="text-xs text-muted-foreground mb-3">
                                        {analise.total_pedidos} pedidos • {new Date(analise.criado_em).toLocaleDateString('pt-BR')}
                                    </p>

                                    <div className="flex items-center justify-between">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => carregarAnalise(analise)}
                                        >
                                            <Eye className="h-3 w-3 mr-1" />
                                            Carregar
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => deletarAnalise(analise.id, analise.nome)}
                                            disabled={loadingDelete[analise.id]}
                                            className="h-8 w-8 p-0"
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

    // ======================== EFEITOS ========================

    useEffect(() => {
        fetchAnalises();
        
        // Definir datas padrão (última semana)
        const hoje = new Date();
        const setemantepassada = new Date();
        setemantepassada.setDate(hoje.getDate() - 7);
        
        setDataFim(hoje);
        setDataInicio(setemantepassada);
    }, []);

    // ======================== RENDER PRINCIPAL ========================

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center">
                            <ShoppingCart className="h-4 w-4 text-orange-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {paisSelecionado ? (
                                <span className="flex items-center gap-2">
                                    Dropi {paisSelecionado === 'mexico' ? '🇲🇽' : 
                                           paisSelecionado === 'chile' ? '🇨🇱' : 
                                           paisSelecionado === 'colombia' ? '🇨🇴' : ''}
                                </span>
                            ) : 'Dropi'}
                        </h1>
                    </div>
                    <p className="text-muted-foreground">
                        Gestão de pedidos e métricas{paisSelecionado ? ` - ${paisSelecionado === 'mexico' ? 'México' : paisSelecionado === 'chile' ? 'Chile' : 'Colômbia'}` : ''}
                    </p>
                </div>
            </div>

            {/* Notificações */}
            {notification && (
                <Alert className={`${notification.type === 'error' ? 'border-destructive' : 
                    notification.type === 'warning' ? 'border-yellow-500' : 'border-green-500'}`}>
                    {notification.type === 'success' ? <Check className="h-4 w-4" /> : 
                     notification.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <AlertDescription>
                        <strong>{notification.type === 'success' ? 'Sucesso!' : 
                                 notification.type === 'warning' ? 'Atenção!' : 'Erro!'}</strong> {notification.message}
                    </AlertDescription>
                </Alert>
            )}

            {/* Formulário de Extração */}
            {renderFormulario()}

            {/* Estatísticas */}
            {renderEstatisticas()}

            {/* Resultados */}
            {renderResultados()}

            {/* Análises Salvas */}
            {renderAnalisesSalvas()}

            {/* Modal para salvar análise */}
            <Dialog open={modalSalvar} onOpenChange={setModalSalvar}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Salvar Análise</DialogTitle>
                        <DialogDescription>
                            Salve sua análise Dropi para acessá-la posteriormente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {loadingSalvar && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                                <LoadingSpinner className="h-8 w-8" />
                            </div>
                        )}

                        <div>
                            <Label htmlFor="nome-analise">Nome da Análise</Label>
                            <Input
                                id="nome-analise"
                                placeholder="Ex: Dropi México Janeiro 2025"
                                value={nomeAnalise}
                                onChange={(e) => setNomeAnalise(e.target.value)}
                                disabled={loadingSalvar}
                                className="mt-1"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setModalSalvar(false)} disabled={loadingSalvar}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={salvarAnalise}
                                disabled={!nomeAnalise || loadingSalvar}
                            >
                                {loadingSalvar ? (
                                    <>
                                        <LoadingSpinner className="h-4 w-4 mr-2" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-2" />
                                        Salvar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default DropiPage;