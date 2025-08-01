// frontend/src/features/engajamento/EngajamentoPage.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Trash2, RefreshCw, Send, AlertCircle,
    Check, X, ExternalLink, Copy, Download, DollarSign
} from 'lucide-react';
import axios from 'axios';

// shadcn/ui imports
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { LoadingSpinner } from '../../components/ui';

function EngajamentoPage() {
    const [activeTab, setActiveTab] = useState('cadastrar');
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    
    // Estados para saldo
    const [saldo, setSaldo] = useState(null);
    const [loadingSaldo, setLoadingSaldo] = useState(false);
    
    // Estados para engajamentos
    const [engajamentos, setEngajamentos] = useState([]);
    const [modalEngajamento, setModalEngajamento] = useState(false);
    const [novoEngajamento, setNovoEngajamento] = useState({
        nome: '',
        engajamento_id: '',
        tipo: 'Like',
        funcionando: true
    });
    
    // Estados para URLs
    const [urlsInput, setUrlsInput] = useState('');
    
    // Estados para pedidos
    const [engajamentosSelecionados, setEngajamentosSelecionados] = useState({});
    const [pedidos, setPedidos] = useState([]);

    // Handlers otimizados
    const handleNomeChange = useCallback((e) => {
        const value = e.target.value;
        setNovoEngajamento(prev => ({ ...prev, nome: value }));
    }, []);

    const handleIdChange = useCallback((e) => {
        const value = e.target.value;
        setNovoEngajamento(prev => ({ ...prev, engajamento_id: value }));
    }, []);

    const handleTipoChange = useCallback((value) => {
        setNovoEngajamento(prev => ({ ...prev, tipo: value }));
    }, []);

    const handleFuncionandoChange = useCallback((checked) => {
        setNovoEngajamento(prev => ({ ...prev, funcionando: checked }));
    }, []);

    // Reset do estado quando o modal abre (não quando fecha)
    const handleOpenModal = useCallback(() => {
        setNovoEngajamento({ nome: '', engajamento_id: '', tipo: 'Like', funcionando: true });
        setModalEngajamento(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setModalEngajamento(false);
    }, []);

    // Carregar dados iniciais
    useEffect(() => {
        const initCSRF = async () => {
            try {
                await axios.get('/current-state/');
            } catch (error) {
                console.error('Erro ao obter CSRF:', error);
            }
        };
        initCSRF();
        carregarEngajamentos();
        carregarSaldo();
        carregarPedidos();
    }, []);

    // Funções de API
    const carregarSaldo = async () => {
        setLoadingSaldo(true);
        try {
            const response = await axios.get('/saldo/');
            setSaldo(response.data);
        } catch (error) {
            console.error('Erro ao carregar saldo:', error);
            setNotification({ type: 'error', message: 'Erro ao carregar saldo' });
        } finally {
            setLoadingSaldo(false);
        }
    };

    const carregarEngajamentos = async () => {
        try {
            const response = await axios.get('/engajamentos/');
            setEngajamentos(response.data);
        } catch (error) {
            console.error('Erro ao carregar engajamentos:', error);
        }
    };

    const carregarPedidos = async () => {
        try {
            const response = await axios.get('/pedidos/');
            setPedidos(response.data);
        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
        }
    };

    const salvarEngajamento = async () => {
        if (!novoEngajamento.nome || !novoEngajamento.engajamento_id) {
            setNotification({ type: 'error', message: 'Preencha todos os campos obrigatórios' });
            return;
        }

        setLoading(true);
        try {
            const csrfResponse = await axios.get('/current-state/');
            const csrfToken = csrfResponse.data.csrf_token;
            
            await axios.post('/engajamentos/', novoEngajamento, {
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json',
                }
            });
            setNotification({ type: 'success', message: 'Engajamento salvo com sucesso!' });
            setModalEngajamento(false);
            setNovoEngajamento({ nome: '', engajamento_id: '', tipo: 'Like', funcionando: true });
            carregarEngajamentos();
        } catch (error) {
            console.error('Erro completo:', error);
            setNotification({ type: 'error', message: 'Erro ao salvar engajamento' });
        } finally {
            setLoading(false);
        }
    };

    const excluirEngajamento = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este engajamento?')) return;

        try {
            const csrfResponse = await axios.get('/current-state/');
            const csrfToken = csrfResponse.data.csrf_token;
            
            await axios.delete(`/engajamentos/${id}/`, {
                headers: {
                    'X-CSRFToken': csrfToken,
                }
            });
            setNotification({ type: 'success', message: 'Engajamento excluído com sucesso!' });
            carregarEngajamentos();
        } catch (error) {
            console.error('Erro completo:', error);
            setNotification({ type: 'error', message: 'Erro ao excluir engajamento' });
        }
    };

    const criarPedido = async () => {
        const engajamentosAtivos = Object.entries(engajamentosSelecionados)
            .filter(([_, data]) => data.ativo)
            .map(([id, data]) => ({ id, quantidade: data.quantidade }));

        if (engajamentosAtivos.length === 0) {
            setNotification({ type: 'error', message: 'Selecione pelo menos um engajamento' });
            return;
        }

        if (!urlsInput.trim()) {
            setNotification({ type: 'error', message: 'Insira pelo menos uma URL' });
            return;
        }

        setLoading(true);
        try {
            const csrfResponse = await axios.get('/current-state/');
            const csrfToken = csrfResponse.data.csrf_token;
            
            const response = await axios.post('/criar-pedido/', {
                urls: urlsInput,
                engajamentos: engajamentosAtivos
            }, {
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json',
                }
            });
            setNotification({ type: 'success', message: 'Pedido criado com sucesso!' });
            carregarPedidos();
            setEngajamentosSelecionados({});
            setUrlsInput('');
        } catch (error) {
            console.error('Erro completo:', error);
            setNotification({ type: 'error', message: 'Erro ao criar pedido' });
        } finally {
            setLoading(false);
        }
    };

    // Componente de Saldo Minimizado
    const SaldoCompact = () => (
        <Card className="w-64 bg-gradient-to-b from-muted/50 to-muted border-border">
            <CardContent className="p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Saldo</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={carregarSaldo}
                        disabled={loadingSaldo}
                        className="h-6 w-6 p-0"
                    >
                        {loadingSaldo ? <LoadingSpinner className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
                    </Button>
                </div>
                {saldo ? (
                    <p className="text-lg font-bold text-green-600 mt-1">
                        {saldo.moeda === 'BRL' ? 'R$' : saldo.moeda} {parseFloat(saldo.saldo).toFixed(2).replace('.', ',')}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground mt-1">Carregando...</p>
                )}
            </CardContent>
        </Card>
    );

    const EngajamentosTable = () => (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Engajamentos</CardTitle>
                    <Dialog open={modalEngajamento} onOpenChange={setModalEngajamento}>
                        <DialogTrigger asChild>
                            <Button size="sm" onClick={handleOpenModal}>
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Novo Engajamento</DialogTitle>
                                <DialogDescription>
                                    Adicione um novo tipo de engajamento para usar em suas campanhas.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                                <div>
                                    <Label htmlFor="nome-input" className="text-sm">Nome</Label>
                                    <Input
                                        id="nome-input"
                                        type="text"
                                        placeholder="Ex: Like Facebook"
                                        value={novoEngajamento.nome}
                                        onChange={handleNomeChange}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="id-input" className="text-sm">ID</Label>
                                    <Input
                                        id="id-input"
                                        type="text"
                                        placeholder="Ex: 101"
                                        value={novoEngajamento.engajamento_id}
                                        onChange={handleIdChange}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm">Tipo</Label>
                                    <Select 
                                        value={novoEngajamento.tipo} 
                                        onValueChange={handleTipoChange}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Like">👍 Like</SelectItem>
                                            <SelectItem value="Amei">❤️ Amei</SelectItem>
                                            <SelectItem value="Uau">😮 Uau</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="funcionando-checkbox"
                                        checked={novoEngajamento.funcionando}
                                        onCheckedChange={handleFuncionandoChange}
                                    />
                                    <Label htmlFor="funcionando-checkbox" className="text-sm">Ativo</Label>
                                </div>
                                <div className="flex justify-end space-x-2 pt-2">
                                    <Button variant="outline" size="sm" onClick={handleCloseModal}>
                                        Cancelar
                                    </Button>
                                    <Button size="sm" onClick={salvarEngajamento} disabled={loading}>
                                        {loading && <LoadingSpinner className="h-4 w-4 mr-2" />}
                                        Salvar
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Nome</TableHead>
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead className="w-[100px]">Tipo</TableHead>
                                <TableHead className="w-[100px]">Status</TableHead>
                                <TableHead className="w-[80px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {engajamentos.map((eng) => (
                                <TableRow key={eng.id}>
                                    <TableCell className="font-medium">{eng.nome}</TableCell>
                                    <TableCell>
                                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{eng.engajamento_id}</code>
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={eng.tipo === 'Amei' ? 'destructive' : 'secondary'}
                                            className={`text-xs ${
                                                eng.tipo === 'Like' ? 'bg-blue-500 text-white hover:bg-blue-600' : 
                                                eng.tipo === 'Uau' ? 'bg-yellow-500 text-white hover:bg-yellow-600' : ''
                                            }`}
                                        >
                                            {eng.tipo === 'Like' && '👍 '}
                                            {eng.tipo === 'Amei' && '❤️ '}
                                            {eng.tipo === 'Uau' && '😮 '}
                                            {eng.tipo}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={eng.funcionando ? 'default' : 'secondary'} className="text-xs">
                                            {eng.funcionando ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => excluirEngajamento(eng.id)}
                                            className="h-7 w-7 p-0"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="flex-1 space-y-4 p-6">
            {/* Header com Saldo */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Engajamento</h1>
                </div>
                <SaldoCompact />
            </div>

            {notification && (
                <Alert className={notification.type === 'error' ? 'border-destructive' : 'border-green-500'}>
                    {notification.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <AlertDescription>
                        <strong>{notification.type === 'success' ? 'Sucesso!' : 'Erro!'}</strong> {notification.message}
                    </AlertDescription>
                </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="cadastrar">Gerenciar</TabsTrigger>
                    <TabsTrigger value="comprar">Comprar</TabsTrigger>
                    <TabsTrigger value="historico">Histórico</TabsTrigger>
                </TabsList>

                <TabsContent value="cadastrar" className="mt-4">
                    <EngajamentosTable />
                </TabsContent>

                <TabsContent value="comprar" className="mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Selecionar Engajamentos</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {engajamentos.filter(eng => eng.funcionando).map((eng) => (
                                    <div key={eng.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <Checkbox
                                                id={`eng-${eng.id}`}
                                                checked={engajamentosSelecionados[eng.id]?.ativo || false}
                                                onCheckedChange={(checked) => setEngajamentosSelecionados(prev => ({
                                                    ...prev,
                                                    [eng.id]: {
                                                        ...prev[eng.id],
                                                        ativo: checked,
                                                        quantidade: prev[eng.id]?.quantidade || 100
                                                    }
                                                }))}
                                            />
                                            <Label htmlFor={`eng-${eng.id}`} className="font-medium">
                                                {eng.nome} ({eng.tipo})
                                            </Label>
                                        </div>
                                        {engajamentosSelecionados[eng.id]?.ativo && (
                                            <Input
                                                type="number"
                                                placeholder="Qtd"
                                                value={engajamentosSelecionados[eng.id]?.quantidade || 100}
                                                onChange={(e) => setEngajamentosSelecionados(prev => ({
                                                    ...prev,
                                                    [eng.id]: {
                                                        ...prev[eng.id],
                                                        quantidade: parseInt(e.target.value) || 0
                                                    }
                                                }))}
                                                min="1"
                                                className="w-20"
                                            />
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">URLs</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Textarea
                                    placeholder="Cole as URLs do Facebook aqui, uma por linha..."
                                    value={urlsInput}
                                    onChange={(e) => setUrlsInput(e.target.value)}
                                    rows={8}
                                />
                                <Button
                                    onClick={criarPedido}
                                    disabled={loading}
                                    className="w-full"
                                >
                                    {loading ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                    Enviar Pedidos
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="historico" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Histórico de Pedidos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Links</TableHead>
                                            <TableHead>Engajamentos</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pedidos.map((pedido) => (
                                            <TableRow key={pedido.id}>
                                                <TableCell>{new Date(pedido.data_criacao).toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        pedido.status === 'concluido' ? 'default' :
                                                        pedido.status === 'erro' ? 'destructive' : 'secondary'
                                                    } className="text-xs">
                                                        {pedido.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{pedido.total_links}</TableCell>
                                                <TableCell>{pedido.itens?.length || 0}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {loading && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <LoadingSpinner className="h-8 w-8" />
                </div>
            )}
        </div>
    );
}

export default EngajamentoPage;