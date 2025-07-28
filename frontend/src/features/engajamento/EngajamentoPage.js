// frontend/src/features/engajamento/EngajamentoPage.js
import React, { useState, useEffect } from 'react';
import {
    Plus, Trash2, RefreshCw, Send, AlertCircle,
    Check, X, ExternalLink, Copy, Download
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
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
            // Garantir CSRF token
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
            // Garantir CSRF token
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
            // Garantir CSRF token
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

    const copiarUrls = () => {
        navigator.clipboard.writeText(urlsInput);
        setNotification({ type: 'success', message: 'URLs copiadas para a área de transferência' });
    };

    // Componentes internos
    const SaldoCard = () => (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        💰 Saldo Disponível
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={carregarSaldo}
                        disabled={loadingSaldo}
                    >
                        {loadingSaldo ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Atualizar
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {saldo ? (
                    <p className="text-2xl font-bold text-green-600">
                        {saldo.moeda === 'BRL' ? 'R$' : saldo.moeda} {parseFloat(saldo.saldo).toFixed(2).replace('.', ',')}
                    </p>
                ) : (
                    <p className="text-muted-foreground">Carregando saldo...</p>
                )}
            </CardContent>
        </Card>
    );

    const EngajamentosTable = () => (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Engajamentos Cadastrados</CardTitle>
                    <Dialog open={modalEngajamento} onOpenChange={setModalEngajamento}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adicionar Engajamento</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="nome">Nome do Engajamento</Label>
                                    <Input
                                        id="nome"
                                        placeholder="Ex: Like Facebook"
                                        value={novoEngajamento.nome}
                                        onChange={(e) => setNovoEngajamento(prev => ({ ...prev, nome: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="engajamento_id">ID do Engajamento</Label>
                                    <Input
                                        id="engajamento_id"
                                        placeholder="Ex: 101"
                                        value={novoEngajamento.engajamento_id}
                                        onChange={(e) => setNovoEngajamento(prev => ({ ...prev, engajamento_id: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>Tipo</Label>
                                    <Select value={novoEngajamento.tipo} onValueChange={(value) => setNovoEngajamento(prev => ({ ...prev, tipo: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Like">👍 Like</SelectItem>
                                            <SelectItem value="Amei">😍 Amei</SelectItem>
                                            <SelectItem value="Uau">😮 Uau</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="funcionando"
                                        checked={novoEngajamento.funcionando}
                                        onCheckedChange={(checked) => setNovoEngajamento(prev => ({ ...prev, funcionando: checked }))}
                                    />
                                    <Label htmlFor="funcionando">Engajamento funcionando</Label>
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <Button variant="outline" onClick={() => setModalEngajamento(false)}>
                                        Cancelar
                                    </Button>
                                    <Button onClick={salvarEngajamento} disabled={loading}>
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {engajamentos.map((eng) => (
                            <TableRow key={eng.id}>
                                <TableCell>{eng.nome}</TableCell>
                                <TableCell>
                                    <code className="bg-muted px-2 py-1 rounded text-sm">{eng.engajamento_id}</code>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={eng.tipo === 'Like' ? 'default' : eng.tipo === 'Amei' ? 'destructive' : 'secondary'}>
                                        {eng.tipo}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={eng.funcionando ? 'default' : 'secondary'}>
                                        {eng.funcionando ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => excluirEngajamento(eng.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">📈 Engajamento</h1>
                    <p className="text-muted-foreground">Gerencie engajamentos e crie pedidos para URLs do Facebook</p>
                </div>
            </div>

            {notification && (
                <Alert className={notification.type === 'error' ? 'border-destructive' : 'border-green-500'}>
                    {notification.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    <AlertDescription>
                        <strong>{notification.type === 'success' ? 'Sucesso!' : 'Erro!'}</strong> {notification.message}
                    </AlertDescription>
                </Alert>
            )}

            <SaldoCard />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="cadastrar">Cadastrar Engajamentos</TabsTrigger>
                    <TabsTrigger value="comprar">Comprar Engajamento</TabsTrigger>
                    <TabsTrigger value="historico">Histórico</TabsTrigger>
                </TabsList>

                <TabsContent value="cadastrar" className="mt-6">
                    <EngajamentosTable />
                </TabsContent>

                <TabsContent value="comprar" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>🛒 Comprar Engajamento</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Selecionar Engajamentos</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {engajamentos.filter(eng => eng.funcionando).map((eng) => (
                                        <Card key={eng.id} className="p-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-2">
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
                                                    <Label htmlFor={`eng-${eng.id}`}>{eng.nome} ({eng.tipo})</Label>
                                                </div>
                                                {engajamentosSelecionados[eng.id]?.ativo && (
                                                    <Input
                                                        type="number"
                                                        placeholder="Quantidade"
                                                        value={engajamentosSelecionados[eng.id]?.quantidade || 100}
                                                        onChange={(e) => setEngajamentosSelecionados(prev => ({
                                                            ...prev,
                                                            [eng.id]: {
                                                                ...prev[eng.id],
                                                                quantidade: parseInt(e.target.value) || 0
                                                            }
                                                        }))}
                                                        min="1"
                                                    />
                                                )}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="border-t pt-6">
                                <h3 className="text-lg font-semibold mb-4">URLs para Engajamento</h3>
                                <Textarea
                                    placeholder="Cole as URLs do Facebook aqui, uma por linha..."
                                    value={urlsInput}
                                    onChange={(e) => setUrlsInput(e.target.value)}
                                    rows={6}
                                />
                            </div>
                            
                            <Button
                                onClick={criarPedido}
                                disabled={loading}
                                size="lg"
                                className="w-full"
                            >
                                {loading ? <LoadingSpinner className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                Enviar Pedidos
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="historico" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>📊 Histórico de Pedidos</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                                                }>
                                                    {pedido.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{pedido.total_links}</TableCell>
                                            <TableCell>{pedido.itens?.length || 0}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
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