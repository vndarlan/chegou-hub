// frontend/src/features/metricas/PrimecodPage.js - VERSÃO SHADCN/UI
import React, { useState, useEffect } from 'react';
import {
    Upload,
    Download,
    Trash2,
    RefreshCw,
    FileText,
    Check,
    X,
    AlertTriangle,
    TrendingUp,
    Users,
    Copy,
    BarChart3,
    Save
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
import { LoadingSpinner } from '../../components/ui';

function PrimecodPage() {
    // Estados principais
    const [isLoading, setIsLoading] = useState(false);
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [analiseSelecionada, setAnaliseSelecionada] = useState(null);
    
    // Estados para upload
    const [arquivoLeads, setArquivoLeads] = useState(null);
    const [arquivoOrders, setArquivoOrders] = useState(null);
    const [dadosLeads, setDadosLeads] = useState(null);
    const [dadosOrders, setDadosOrders] = useState(null);
    const [dadosEfetividade, setDadosEfetividade] = useState(null);
    
    // Estados para salvar
    const [modalSalvar, setModalSalvar] = useState(false);
    const [nomeAnalise, setNomeAnalise] = useState('');
    
    // Estados de notificação
    const [notification, setNotification] = useState(null);

    // ======================== FUNÇÕES DE API ========================

    // Buscar análises salvas
    const fetchAnalises = async () => {
        try {
            const response = await axios.get('/metricas/primecod/analises/');
            const primecodAnalises = response.data.filter(a => a.tipo === 'PRIMECOD');
            setAnalisesSalvas([...primecodAnalises]);
        } catch (error) {
            console.error('Erro ao buscar análises:', error);
            showNotification('error', 'Erro ao carregar análises salvas');
        }
    };

    // Upload de arquivo
    const uploadArquivo = async (arquivo, tipo) => {
        if (!arquivo) return;
        
        setIsLoading(true);
        const formData = new FormData();
        formData.append('arquivo', arquivo);
        formData.append('tipo_arquivo', tipo);
        
        try {
            const response = await axios.post('/metricas/primecod/analises/upload_csv/', formData);
            
            if (response.data.status === 'success') {
                const dados = response.data.dados_processados;
                const unmapped = response.data.status_nao_mapeados || [];
                
                if (tipo === 'leads') {
                    setDadosLeads(dados);
                    if (unmapped.length > 0) {
                        showNotification('warning', `Status não mapeados encontrados: ${unmapped.join(', ')}`);
                    }
                } else if (tipo === 'orders') {
                    setDadosOrders(dados);
                    if (unmapped.length > 0) {
                        showNotification('warning', `Status de shipping não mapeados: ${unmapped.join(', ')}`);
                    }
                }
                
                // Se ambos os arquivos foram processados, gerar efetividade
                if (dadosLeads && tipo === 'orders') {
                    gerarEfetividade(dadosLeads, dados);
                } else if (dadosOrders && tipo === 'leads') {
                    gerarEfetividade(dados, dadosOrders);
                }
                
                showNotification('success', `Arquivo de ${tipo} processado com sucesso!`);
            }
        } catch (error) {
            showNotification('error', `Erro ao processar arquivo: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Salvar análise
    const salvarAnalise = async () => {
        if (!nomeAnalise || !dadosLeads) {
            showNotification('error', 'Nome da análise e dados de leads são obrigatórios');
            return;
        }
        
        setIsLoading(true);
        try {
            const response = await axios.post('/metricas/primecod/analises/processar_analise/', {
                nome_analise: nomeAnalise,
                tipo: 'PRIMECOD',
                dados_leads: dadosLeads,
                dados_orders: dadosOrders || {}
            });
            
            if (response.data.status === 'success') {
                showNotification('success', `Análise '${nomeAnalise}' salva com sucesso!`);
                setModalSalvar(false);
                setNomeAnalise('');
                fetchAnalises();
            }
        } catch (error) {
            showNotification('error', `Erro ao salvar análise: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Carregar análise
    const carregarAnalise = (analise) => {
        setDadosLeads(analise.dados_leads);
        setDadosEfetividade(analise.dados_efetividade);
        setAnaliseSelecionada(analise);
        showNotification('success', `Análise '${analise.nome}' carregada!`);
    };

    // Deletar análise
    const deletarAnalise = async (id, nome) => {
        if (!window.confirm(`Deseja deletar a análise '${nome}'?`)) return;
        
        setIsLoading(true);
        try {
            await axios.delete(`/metricas/primecod/analises/${id}/`);
            showNotification('success', `Análise '${nome}' deletada!`);
            fetchAnalises();
            
            if (analiseSelecionada?.id === id) {
                setAnaliseSelecionada(null);
                setDadosLeads(null);
                setDadosEfetividade(null);
            }
        } catch (error) {
            showNotification('error', `Erro ao deletar análise: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // ======================== FUNÇÕES AUXILIARES ========================

    // Sistema de notificações
    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    // Gerar efetividade combinada
    const gerarEfetividade = (leadsData, ordersData) => {
        const efetividade = [];
        
        leadsData.forEach(leadRow => {
            if (leadRow.Product === 'Total') return;
            
            const product = leadRow.Product;
            const confirmed = leadRow.Confirmed || 0;
            const totalMinusDup = leadRow['Total - duplicados'] || 0;
            
            const orderInfo = ordersData[product] || {};
            const delivered = orderInfo.Delivered || 0;
            
            const efetividadePercent = totalMinusDup > 0 ? (delivered / totalMinusDup * 100) : 0;
            
            efetividade.push({
                Product: product,
                'Confirmed (Leads)': confirmed,
                Delivered: delivered,
                Returned: orderInfo.Returned || 0,
                Refused: orderInfo.Refused || 0,
                Incident: orderInfo.Incident || 0,
                'Order Placed': orderInfo['Order Placed'] || 0,
                'Out of Stock': orderInfo['Out of Stock'] || 0,
                Returning: orderInfo.Returning || 0,
                'Out for Delivery': orderInfo['Out for Delivery'] || 0,
                Shipped: orderInfo.Shipped || 0,
                Canceled: orderInfo.Canceled || 0,
                'Outros Orders': orderInfo.Outros || 0,
                Efetividade: `${efetividadePercent.toFixed(0)}%`
            });
        });
        
        // Adicionar totais
        if (efetividade.length > 0) {
            const totals = { Product: 'Total' };
            const numericCols = [
                'Confirmed (Leads)', 'Delivered', 'Returned', 'Refused', 'Incident',
                'Order Placed', 'Out of Stock', 'Returning', 'Out for Delivery', 
                'Shipped', 'Canceled', 'Outros Orders'
            ];
            
            numericCols.forEach(col => {
                totals[col] = efetividade.reduce((sum, row) => sum + (row[col] || 0), 0);
            });
            
            const totalDelivered = totals.Delivered;
            const totalLeads = leadsData.find(row => row.Product === 'Total')?.['Total - duplicados'] || 1;
            const efetividadeMedia = (totalDelivered / totalLeads * 100);
            totals.Efetividade = `${efetividadeMedia.toFixed(0)}% (Média)`;
            
            efetividade.push(totals);
        }
        
        setDadosEfetividade(efetividade);
    };

    // Cores para efetividade
    const getEfetividadeCor = (valor) => {
        if (!valor || typeof valor !== 'string') return {};
        
        const numero = parseFloat(valor.replace('%', '').replace('(Média)', ''));
        
        if (numero >= 60) return { backgroundColor: '#2E7D2E', color: 'white', fontWeight: 'bold' };
        if (numero >= 50) return { backgroundColor: '#4CAF50', color: 'white', fontWeight: 'bold' };
        if (numero >= 40) return { backgroundColor: '#FFA726', color: 'black', fontWeight: 'bold' };
        return { backgroundColor: '#F44336', color: 'white', fontWeight: 'bold' };
    };

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    // Cards de estatísticas
    const renderEstatisticas = () => {
        if (!dadosLeads) return null;
        
        const totalRow = dadosLeads.find(row => row.Product === 'Total');
        if (!totalRow) return null;
        
        const total = totalRow['Total - duplicados'] || 0;
        const confirmados = totalRow.Confirmed || 0;
        const duplicados = totalRow.Duplicate || 0;
        const taxaConfirmacao = total > 0 ? (confirmados / total * 100) : 0;
        
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total de Leads</p>
                                <p className="text-2xl font-bold">{total.toLocaleString()}</p>
                            </div>
                            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Users className="h-4 w-4 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Confirmados</p>
                                <p className="text-2xl font-bold text-green-600">{confirmados.toLocaleString()}</p>
                            </div>
                            <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <Check className="h-4 w-4 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Duplicados</p>
                                <p className="text-2xl font-bold text-orange-600">{duplicados.toLocaleString()}</p>
                            </div>
                            <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                <Copy className="h-4 w-4 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Taxa de Confirmação</p>
                                <p className="text-2xl font-bold text-blue-600">{taxaConfirmacao.toFixed(1)}%</p>
                            </div>
                            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <BarChart3 className="h-4 w-4 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    // Renderizar tabela
    const renderTabela = (dados, titulo, aplicarCores = false) => {
        if (!dados || dados.length === 0) return null;
        
        const colunas = Object.keys(dados[0]);
        
        return (
            <Card className="mt-4">
                <CardHeader>
                    <CardTitle className="text-lg">{titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {colunas.map(col => (
                                        <TableHead key={col}>{col}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dados.map((row, idx) => (
                                    <TableRow 
                                        key={idx} 
                                        className={row.Product === 'Total' ? 'bg-muted/50 font-semibold' : ''}
                                    >
                                        {colunas.map(col => (
                                            <TableCell 
                                                key={col}
                                                style={aplicarCores && col === 'Efetividade' ? 
                                                    getEfetividadeCor(row[col]) : {}}
                                            >
                                                {typeof row[col] === 'number' ? row[col].toLocaleString() : row[col]}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        );
    };

    // ======================== EFEITOS ========================
    useEffect(() => {
        fetchAnalises();
    }, []);

    // ======================== RENDER PRINCIPAL ========================
    return (
        <div className="flex-1 space-y-6 p-6">
            {isLoading && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <LoadingSpinner className="h-8 w-8" />
                </div>
            )}
            
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">📊 Prime COD Analytics</h1>
                    <p className="text-muted-foreground">Análise de efetividade de leads e orders</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        onClick={fetchAnalises}
                        disabled={isLoading}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                    {(dadosLeads || dadosEfetividade) && (
                        <Button onClick={() => setModalSalvar(true)}>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Análise
                        </Button>
                    )}
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

            {/* Análises Salvas */}
            {analisesSalvas.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">💾 Análises Salvas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {analisesSalvas.map(analise => (
                                <Card key={analise.id} className="border">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-medium truncate">{analise.nome}</h4>
                                            <Badge variant="secondary" className="text-xs">PRIMECOD</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-3">
                                            {new Date(analise.criado_em).toLocaleDateString('pt-BR')} por {analise.criado_por_nome}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <Button size="sm" variant="outline" onClick={() => carregarAnalise(analise)}>
                                                Carregar
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="destructive" 
                                                onClick={() => deletarAnalise(analise.id, analise.nome)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Upload de Arquivos */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">1️⃣ Arquivo de Leads</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="leads-file">Leads Export CSV</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <Input
                                    id="leads-file"
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setArquivoLeads(e.target.files[0])}
                                    className="file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-muted file:text-muted-foreground hover:file:bg-muted/80"
                                />
                            </div>
                        </div>
                        <Button 
                            className="w-full"
                            onClick={() => uploadArquivo(arquivoLeads, 'leads')}
                            disabled={!arquivoLeads || isLoading}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Processar Leads
                        </Button>
                        {dadosLeads && (
                            <Alert className="border-green-500">
                                <Check className="h-4 w-4" />
                                <AlertDescription>
                                    Arquivo de leads processado! {dadosLeads.length - 1} produtos encontrados.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">2️⃣ Arquivo de Orders</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="orders-file">Orders Export CSV</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <Input
                                    id="orders-file"
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setArquivoOrders(e.target.files[0])}
                                    className="file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-muted file:text-muted-foreground hover:file:bg-muted/80"
                                />
                            </div>
                        </div>
                        <Button 
                            className="w-full"
                            onClick={() => uploadArquivo(arquivoOrders, 'orders')}
                            disabled={!arquivoOrders || isLoading}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Processar Orders
                        </Button>
                        {dadosOrders && (
                            <Alert className="border-green-500">
                                <Check className="h-4 w-4" />
                                <AlertDescription>
                                    Arquivo de orders processado!
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Instruções */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">📋 Instruções</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                            Faça upload do arquivo <strong>leadsexport.csv</strong> exportado da seção de leads do Prime COD
                        </li>
                        <li className="flex items-start gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                            Faça upload do arquivo <strong>ordersexport.csv</strong> exportado da seção de orders do Prime COD
                        </li>
                        <li className="flex items-start gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                            A tabela de efetividade será gerada automaticamente combinando os dois arquivos
                        </li>
                        <li className="flex items-start gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                            Salve sua análise para acessá-la posteriormente
                        </li>
                    </ul>
                </CardContent>
            </Card>

            {/* Estatísticas */}
            {renderEstatisticas()}

            {/* Tabelas */}
            {renderTabela(dadosLeads, "📊 Tabela de Leads")}
            {renderTabela(dadosEfetividade, "📦 Tabela de Efetividade", true)}

            {/* Modal para salvar */}
            <Dialog open={modalSalvar} onOpenChange={setModalSalvar}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>💾 Salvar Análise</DialogTitle>
                        <DialogDescription>
                            Salve sua análise Prime COD para acessá-la posteriormente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="nome-analise">Nome da Análise</Label>
                            <Input
                                id="nome-analise"
                                placeholder="Ex: Análise Maio 2025 - Espanha"
                                value={nomeAnalise}
                                onChange={(e) => setNomeAnalise(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setModalSalvar(false)}>
                                Cancelar
                            </Button>
                            <Button 
                                onClick={salvarAnalise} 
                                disabled={!nomeAnalise || isLoading}
                            >
                                {isLoading && <LoadingSpinner className="h-4 w-4 mr-2" />}
                                Salvar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default PrimecodPage;