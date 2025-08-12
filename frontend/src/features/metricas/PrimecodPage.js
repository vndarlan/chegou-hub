// frontend/src/features/metricas/PrimecodPage.js - INTEGRAÇÃO DIRETA API PRIMECOD
import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon, Download, Trash2, RefreshCw, Check, X, 
    AlertTriangle, TrendingUp, BarChart3, Eye, Search, Globe, 
    ArrowUpDown, ArrowUp, ArrowDown, Package, Target, Percent, 
    PieChart, Filter, Rocket, LayoutDashboard, Loader2
} from 'lucide-react';
import axios from 'axios';

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
import { SimpleDateRangePicker } from '../../components/ui/simple-date-range-picker';
import { DateInputs } from '../../components/ui/date-inputs';
import { getCSRFToken } from '../../utils/csrf';

// Países PrimeCOD disponíveis
const PAISES_PRIMECOD = [
    { value: 'todos', label: 'Todos os Países' },
    { value: 'Austria', label: 'Austria' },
    { value: 'Bulgaria', label: 'Bulgaria' },
    { value: 'Croatia', label: 'Croatia' },
    { value: 'Czech Republic', label: 'Czech Republic' },
    { value: 'Greece', label: 'Greece' },
    { value: 'Hungary', label: 'Hungary' },
    { value: 'Italy', label: 'Italy' },
    { value: 'Poland', label: 'Poland' },
    { value: 'Romania', label: 'Romania' },
    { value: 'Slovakia', label: 'Slovakia' },
    { value: 'Slovenia', label: 'Slovenia' },
    { value: 'Spain', label: 'Spain' },
    { value: 'Ukraine', label: 'Ukraine' },
    { value: 'United Kingdom', label: 'United Kingdom' }
];

// Status mapping PrimeCOD
const STATUS_MAPPING = {
    1: "Placed",
    2: "Packed", 
    4: "Shipped",
    6: "Out for delivery",
    7: "Delivered",
    8: "Refused",
    10: "Returned",
    12: "Cancelled"
};

// Token API PrimeCOD - Via variável de ambiente segura
const API_TOKEN = process.env.REACT_APP_PRIMECOD_TOKEN;

// Validação robusta de token obrigatória
if (!API_TOKEN) {
    console.error('❌ CONFIGURAÇÃO OBRIGATÓRIA: Token PrimeCOD não encontrado');
    console.error('👉 Configure REACT_APP_PRIMECOD_TOKEN no arquivo .env');
    console.error('👉 Exemplo: REACT_APP_PRIMECOD_TOKEN=seu_token_aqui');
} else if (API_TOKEN.length < 10) {
    console.warn('⚠️ AVISO: Token PrimeCOD parece muito curto. Verifique se está correto.');
} else {
    console.log('✅ Token PrimeCOD configurado e validado');
}

// Cliente API PrimeCOD
class PrimeCODClient {
    constructor() {
        this.baseUrl = 'https://api.primecod.app/api';
        
        // Validar token antes de criar headers
        if (!API_TOKEN) {
            throw new Error('Token PrimeCOD não configurado. Verifique REACT_APP_PRIMECOD_TOKEN no .env');
        }
        
        this.headers = {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
        };
    }

    async getOrders(page = 1, dateRange = null) {
        const url = `${this.baseUrl}/orders?page=${page}`;
        const body = {};
        
        if (dateRange) {
            body.date_range = {
                start: dateRange.start,
                end: dateRange.end
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            // Log seguro - não expor token completo
            const tokenMasked = API_TOKEN ? `${API_TOKEN.substring(0, 6)}...${API_TOKEN.slice(-4)}` : 'não configurado';
            console.error('❌ Erro PrimeCOD API:', {
                status: response.status,
                statusText: response.statusText,
                url: url.replace(/Bearer [^&]*/, 'Bearer [TOKEN_MASKED]'),
                tokenStatus: API_TOKEN ? 'presente' : 'ausente',
                tokenLength: API_TOKEN ? API_TOKEN.length : 0
            });
            
            // Error handling mais específico
            if (response.status === 401) {
                throw new Error('Token PrimeCOD inválido ou expirado. Verifique as credenciais.');
            } else if (response.status === 403) {
                throw new Error('Token sem permissões necessárias. Contate o suporte PrimeCOD.');
            } else if (response.status === 429) {
                throw new Error('Muitas requisições. Aguarde alguns minutos e tente novamente.');
            } else if (response.status >= 500) {
                throw new Error(`Erro interno da API PrimeCOD (${response.status}). Tente novamente.`);
            } else {
                throw new Error(`Erro na API PrimeCOD: ${response.status} ${response.statusText}`);
            }
        }

        return await response.json();
    }
}

function PrimecodPage() {
    // Estados principais
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [dadosResultado, setDadosResultado] = useState(null);
    const [secaoAtiva, setSecaoAtiva] = useState('gerar');
    const [tipoVisualizacao, setTipoVisualizacao] = useState('otimizada');
    
    // Estados do formulário
    const [dateRange, setDateRange] = useState({
        from: undefined,
        to: undefined
    });
    const [paisSelecionado, setPaisSelecionado] = useState('todos');
    
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
    
    // Estado para rastreamento de compatibilidade
    const [backendCompatible, setBackendCompatible] = useState(true);

    // Estados para ordenação
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');

    // Cliente API
    const [apiClient] = useState(new PrimeCODClient());

    // ======================== FUNÇÕES DE API ========================

    const fetchAnalises = async () => {
        setLoadingAnalises(true);
        try {
            // Usar endpoint correto com fallback automático
            const response = await axios.get('/metricas/primecod/analises/');
            // Backend já filtra por PRIMECOD, mas aplicamos filtro adicional por segurança
            const primecodAnalises = response.data.filter(a => 
                a.tipo === 'PRIMECOD' || a.tipo === 'primecod'
            );
            setAnalisesSalvas([...primecodAnalises]);
        } catch (error) {
            console.error('Erro ao buscar análises:', error);
            if (error.response?.status === 404) {
                showNotification('error', 'Endpoint de análises não encontrado');
            } else {
                showNotification('error', `Erro ao carregar análises: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setLoadingAnalises(false);
        }
    };

    const processarDados = async () => {
        // Validação de token primeiro
        if (!API_TOKEN) {
            showNotification('error', 'Token PrimeCOD não configurado. Verifique o arquivo .env');
            return;
        }
        
        if (!dateRange?.from || !dateRange?.to) {
            showNotification('error', 'Selecione o período de análise');
            return;
        }

        if (dateRange.from > dateRange.to) {
            showNotification('error', 'Data de início deve ser anterior à data fim');
            return;
        }

        setLoadingProcessar(true);
        setProgressoAtual({ etapa: 'Iniciando busca de dados...', porcentagem: 0 });

        try {
            const dataInicio = dateRange.from.toISOString().split('T')[0];
            const dataFim = dateRange.to.toISOString().split('T')[0];
            
            // Buscar todas as páginas de dados
            let todasOrders = [];
            let paginaAtual = 1;
            let totalPaginas = 1;
            let parar = false;

            while (paginaAtual <= totalPaginas && paginaAtual <= 400 && !parar) {
                setProgressoAtual({ 
                    etapa: `Processando página ${paginaAtual} de ${totalPaginas}...`, 
                    porcentagem: Math.round((paginaAtual / Math.max(totalPaginas, 1)) * 100) 
                });

                try {
                    const response = await apiClient.getOrders(paginaAtual, {
                        start: dataInicio,
                        end: dataFim
                    });

                    if (response.data && response.data.length > 0) {
                        // Filtrar localmente por created_at (API ignora filtro)
                        const ordersFiltradas = response.data.filter(order => {
                            const orderDate = new Date(order.created_at).toISOString().split('T')[0];
                            return orderDate >= dataInicio && orderDate <= dataFim;
                        });

                        todasOrders = todasOrders.concat(ordersFiltradas);

                        // Se todas as datas são anteriores ao período, parar
                        const todasAnteriores = response.data.every(order => {
                            const orderDate = new Date(order.created_at).toISOString().split('T')[0];
                            return orderDate < dataInicio;
                        });

                        if (todasAnteriores) {
                            parar = true;
                        }

                        // Atualizar total de páginas se disponível
                        if (response.last_page) {
                            totalPaginas = response.last_page;
                        }
                    } else {
                        parar = true;
                    }

                    paginaAtual++;
                    
                    // Pequeno delay para não sobrecarregar a API
                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (error) {
                    console.warn(`Erro na página ${paginaAtual}:`, error);
                    parar = true;
                }
            }

            setProgressoAtual({ etapa: 'Processando dados coletados...', porcentagem: 95 });

            // Processar dados coletados
            const dadosProcessados = processarOrdersPrimeCOD(todasOrders, paisSelecionado);
            setDadosResultado(dadosProcessados);
            
            // Gerar nome automático
            const paisNome = paisSelecionado === 'todos' ? 
                'Todos os Países' : 
                PAISES_PRIMECOD.find(p => p.value === paisSelecionado)?.label || 'País';
            const dataStr = `${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}`;
            setNomeAnalise(`PrimeCOD ${paisNome} ${dataStr}`);

            showNotification('success', `Dados processados: ${todasOrders.length} orders encontradas`);
            
        } catch (error) {
            console.error('Erro no processamento:', error);
            
            // Error handling robusto baseado no tipo de erro
            if (error.message && error.message.includes('Token PrimeCOD inválido')) {
                showNotification('error', 'Token PrimeCOD inválido ou expirado. Verifique as credenciais.');
            } else if (error.message && error.message.includes('Token sem permissões')) {
                showNotification('error', 'Token PrimeCOD sem permissões necessárias. Contate o suporte.');
            } else if (error.message && error.message.includes('Token PrimeCOD não configurado')) {
                showNotification('error', 'CONFIGURAÇÃO: Token PrimeCOD não encontrado no .env');
            } else {
                showNotification('error', `Erro na busca de dados: ${error.message}`);
            }
        } finally {
            setLoadingProcessar(false);
            setProgressoAtual(null);
        }
    };

    const processarOrdersPrimeCOD = (orders, paisFiltro) => {
        // Filtrar por país se especificado
        let ordersFiltradas = orders;
        if (paisFiltro !== 'todos') {
            ordersFiltradas = orders.filter(order => 
                order.shipping_country === paisFiltro
            );
        }

        // Agrupar por produto + país + status
        const agrupamento = {};
        
        ordersFiltradas.forEach(order => {
            const produto = order.product_sku || 'Sem SKU';
            const pais = order.shipping_country || 'Sem País';
            const statusId = order.status_id;
            const statusNome = STATUS_MAPPING[statusId] || `Status ${statusId}`;

            const chave = `${produto}|${pais}`;
            
            if (!agrupamento[chave]) {
                agrupamento[chave] = {
                    produto,
                    pais,
                    ...Object.values(STATUS_MAPPING).reduce((acc, status) => {
                        acc[status] = 0;
                        return acc;
                    }, {}),
                    total: 0
                };
            }

            agrupamento[chave][statusNome] = (agrupamento[chave][statusNome] || 0) + 1;
            agrupamento[chave].total += 1;
        });

        // Converter para array e ordenar
        const resultado = Object.values(agrupamento).sort((a, b) => {
            if (a.produto !== b.produto) {
                return a.produto.localeCompare(b.produto);
            }
            return a.pais.localeCompare(b.pais);
        });

        // Adicionar linha de totais
        if (resultado.length > 0) {
            const totais = {
                produto: 'TOTAL',
                pais: 'TODOS',
                ...Object.values(STATUS_MAPPING).reduce((acc, status) => {
                    acc[status] = resultado.reduce((sum, item) => sum + (item[status] || 0), 0);
                    return acc;
                }, {}),
                total: resultado.reduce((sum, item) => sum + item.total, 0)
            };
            resultado.push(totais);
        }

        return resultado;
    };

    const salvarAnalise = async () => {
        if (!dadosResultado || !nomeAnalise) {
            showNotification('error', 'Dados ou nome da análise inválidos');
            return;
        }

        setLoadingSalvar(true);
        try {
            // Garantir estrutura correta de dados para o backend
            const dadosParaSalvar = {
                nome: nomeAnalise.trim(),
                tipo: 'PRIMECOD',
                dados_processados: dadosResultado, // Campo agora suportado pelo backend
                descricao: `Integração API PrimeCOD - ${paisSelecionado === 'todos' ? 'Todos os Países' : PAISES_PRIMECOD.find(p => p.value === paisSelecionado)?.label}`,
                configuracao: {
                    pais: paisSelecionado,
                    periodo: {
                        inicio: dateRange?.from?.toISOString()?.split('T')[0],
                        fim: dateRange?.to?.toISOString()?.split('T')[0]
                    },
                    total_registros: Array.isArray(dadosResultado) ? dadosResultado.length : 0
                }
            };

            const response = await axios.post('/metricas/primecod/analises/', dadosParaSalvar, {
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                }
            });

            // Verificar sucesso baseado na resposta do backend corrigido
            if (response.data && (response.data.status === 'success' || response.data.id)) {
                showNotification('success', `Análise '${nomeAnalise}' salva com sucesso!`);
                setModalSalvar(false);
                setNomeAnalise('');
                await fetchAnalises(); // Aguardar recarga das análises
            } else {
                showNotification('error', 'Resposta inesperada do servidor ao salvar');
            }
        } catch (error) {
            console.error('Erro ao salvar análise:', error);
            
            // Error handling específico para salvamento
            if (error.response?.status === 400) {
                showNotification('error', `Dados inválidos: ${error.response?.data?.message || 'Verifique os campos'}`);
            } else if (error.response?.status === 403) {
                showNotification('error', 'Sem permissão para salvar análises');
            } else if (error.response?.status === 500) {
                showNotification('error', 'Erro interno do servidor. Tente novamente.');
            } else {
                showNotification('error', `Erro ao salvar: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setLoadingSalvar(false);
        }
    };

    const carregarAnalise = (analise) => {
        // Usar campo dados_processados primeiro, com fallback para campos antigos
        const dados = analise.dados_processados || analise.dados_efetividade || analise.dados_leads;
        
        if (!dados) {
            showNotification('error', 'Análise não possui dados válidos para carregar');
            return;
        }
        
        setDadosResultado(dados);
        setSecaoAtiva('gerar');
        showNotification('success', `Análise '${analise.nome}' carregada com sucesso!`);
    };

    const deletarAnalise = async (id, nome) => {
        if (!window.confirm(`Deletar análise '${nome}'?`)) return;

        setLoadingDelete(prev => ({ ...prev, [id]: true }));
        try {
            await axios.delete(`/metricas/primecod/analises/${id}/`, {
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                }
            });
            
            showNotification('success', `Análise '${nome}' deletada com sucesso!`);
            await fetchAnalises(); // Aguardar recarga das análises
            
            // Limpar dados se for a análise atualmente carregada
            if (dadosResultado && Array.isArray(dadosResultado) && dadosResultado.some(item => item.id === id)) {
                setDadosResultado(null);
            }
        } catch (error) {
            console.error('Erro ao deletar análise:', error);
            
            // Error handling específico para deleção
            if (error.response?.status === 404) {
                showNotification('error', 'Análise não encontrada (pode ter sido deletada)');
                await fetchAnalises(); // Atualizar lista
            } else if (error.response?.status === 403) {
                showNotification('error', 'Sem permissão para deletar esta análise');
            } else {
                showNotification('error', `Erro ao deletar: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setLoadingDelete(prev => ({ ...prev, [id]: false }));
        }
    };

    // ======================== FUNÇÕES AUXILIARES ========================

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const sortData = (data, sortBy, sortOrder) => {
        if (!sortBy || !data) return data;
        
        return [...data].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            if (typeof aVal === 'string' && !isNaN(aVal)) aVal = parseFloat(aVal);
            if (typeof bVal === 'string' && !isNaN(bVal)) bVal = parseFloat(bVal);
            
            if (sortOrder === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    // ======================== COMPONENTES DE RENDERIZAÇÃO ========================

    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">📊 Prime COD Analytics</h1>
            </div>
            
            <div className="flex items-center gap-3">
                {/* Indicador de Status de Configuração */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border">
                    {backendCompatible ? (
                        <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-green-600 font-medium">API Configurada</span>
                        </>
                    ) : (
                        <>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-red-600 font-medium">Token Pendente</span>
                        </>
                    )}
                </div>
                
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
                        {PAISES_PRIMECOD.map(pais => (
                            <SelectItem key={pais.value} value={pais.value} className="text-popover-foreground hover:bg-accent">
                                {pais.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    const renderFormulario = () => (
        <Card className="mb-6 relative border-border bg-card">
            {loadingProcessar && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur flex flex-col items-center justify-center z-10 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                    <p className="font-medium mb-2 text-foreground">Buscando dados da API PrimeCOD...</p>
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
                            <CardDescription className="text-muted-foreground">Configure o período e execute a busca na API</CardDescription>
                        </div>
                    </div>

                    <div className="flex items-end gap-4">
                        <DateInputs
                            dateRange={dateRange}
                            onDateRangeChange={setDateRange}
                            disabled={loadingProcessar}
                            className="w-96"
                        />
                        
                        <Button
                            onClick={processarDados}
                            disabled={!dateRange?.from || !dateRange?.to || loadingProcessar || !backendCompatible}
                            size="lg"
                            className="min-w-36 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {loadingProcessar ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Search className="h-4 w-4 mr-2" />
                            )}
                            {loadingProcessar ? 'Processando...' : 'Buscar Dados'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );

    const renderEstatisticas = () => {
        if (!dadosResultado || !Array.isArray(dadosResultado)) return null;
        
        const produtos = dadosResultado.filter(item => item.produto !== 'TOTAL');
        const totalRow = dadosResultado.find(item => item.produto === 'TOTAL');
        
        const totalProdutos = produtos.length;
        const totalOrders = totalRow?.total || 0;
        const totalDelivered = totalRow?.Delivered || 0;
        const totalReturned = totalRow?.Returned || 0;
        
        return (
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Produtos</p>
                                <p className="text-xl font-bold text-card-foreground">{totalProdutos}</p>
                            </div>
                            <Package className="h-5 w-5 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Orders</p>
                                <p className="text-xl font-bold text-blue-600">{totalOrders.toLocaleString()}</p>
                            </div>
                            <Target className="h-5 w-5 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Entregues</p>
                                <p className="text-xl font-bold text-green-600">{totalDelivered.toLocaleString()}</p>
                            </div>
                            <TrendingUp className="h-5 w-5 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-border bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Devolvidos</p>
                                <p className="text-xl font-bold text-red-600">{totalReturned.toLocaleString()}</p>
                            </div>
                            <Percent className="h-5 w-5 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderResultados = () => {
        if (!dadosResultado || !Array.isArray(dadosResultado)) return null;

        const dadosOrdenados = sortData(dadosResultado, sortBy, sortOrder);
        const statusColumns = Object.values(STATUS_MAPPING);
        const colunas = ['produto', 'pais', ...statusColumns, 'total'];

        return (
            <Card className="mb-6 border-border bg-card">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg text-card-foreground">Tabela Cruzada: Produto × País × Status</CardTitle>
                            <CardDescription className="text-muted-foreground">{dadosResultado.length} registros</CardDescription>
                        </div>
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
                </CardHeader>

                <CardContent className="p-0">
                    <div className="w-full max-w-[calc(100vw-280px)] overflow-x-auto">
                        <Table className="w-full table-fixed" style={{ minWidth: '1200px' }}>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border">
                                    {colunas.map(col => {
                                        const isProduto = col === 'produto';
                                        const isPais = col === 'pais';
                                        
                                        let classesHeader = 'whitespace-nowrap px-2 py-2 text-xs text-muted-foreground';
                                        
                                        if (isProduto) {
                                            classesHeader += ' sticky left-0 z-20 bg-background border-r border-border min-w-[150px]';
                                        } else if (isPais) {
                                            classesHeader += ' sticky left-[150px] z-20 bg-background border-r border-border min-w-[120px]';
                                        }
                                        
                                        return (
                                            <TableHead key={col} className={classesHeader}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-auto p-0 font-medium text-xs text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleSort(col)}
                                                >
                                                    {col.toUpperCase()}
                                                    {sortBy === col ? (
                                                        sortOrder === 'asc' ? 
                                                            <ArrowUp className="ml-1 h-3 w-3" /> : 
                                                            <ArrowDown className="ml-1 h-3 w-3" />
                                                    ) : (
                                                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                                    )}
                                                </Button>
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dadosOrdenados.map((row, idx) => (
                                    <TableRow key={idx} className={`border-border ${row.produto === 'TOTAL' ? 'bg-muted/20 font-medium' : ''}`}>
                                        {colunas.map(col => {
                                            const isProduto = col === 'produto';
                                            const isPais = col === 'pais';
                                            
                                            let classesCelula = 'px-2 py-2 text-xs text-card-foreground';
                                            
                                            if (isProduto) {
                                                classesCelula += ' sticky left-0 z-10 bg-background border-r border-border min-w-[150px]';
                                            } else if (isPais) {
                                                classesCelula += ' sticky left-[150px] z-10 bg-background border-r border-border min-w-[120px]';
                                            }
                                            
                                            return (
                                                <TableCell key={col} className={classesCelula}>
                                                    {col === 'produto' ? (
                                                        <div className="max-w-[120px] truncate" title={row[col]}>
                                                            {row[col]}
                                                        </div>
                                                    ) : col === 'pais' ? (
                                                        <div className="max-w-[100px] truncate" title={row[col]}>
                                                            {row[col]}
                                                        </div>
                                                    ) : (
                                                        typeof row[col] === 'number' ? row[col].toLocaleString() : (row[col] || 0)
                                                    )}
                                                </TableCell>
                                            );
                                        })}
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
                        <CardDescription className="text-muted-foreground">{analisesSalvas.length} análises PrimeCOD</CardDescription>
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
                {analisesSalvas.length === 0 ? (
                    <Alert className="border-border bg-background">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <AlertDescription className="text-muted-foreground">
                            Nenhuma análise PrimeCOD encontrada. Processe dados e salve o resultado.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {analisesSalvas.map(analise => (
                            <Card key={analise.id} className="relative border-border bg-card">
                                {loadingDelete[analise.id] && (
                                    <div className="absolute inset-0 bg-background/80 backdrop-blur flex items-center justify-center z-10 rounded-lg">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    </div>
                                )}

                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-medium text-sm truncate max-w-[80%] text-card-foreground">
                                            {analise.nome}
                                        </h3>
                                        <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">PRIMECOD</Badge>
                                    </div>

                                    <p className="text-xs text-muted-foreground mb-3">
                                        {new Date(analise.criado_em).toLocaleDateString('pt-BR')} por {analise.criado_por_nome}
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

    // ======================== EFEITOS ========================

    useEffect(() => {
        // Verificação robusta de configuração na inicialização
        const verificarConfiguracao = () => {
            if (!API_TOKEN) {
                setBackendCompatible(false);
                showNotification('error', 'CONFIGURAÇÃO OBRIGATÓRIA: Configure REACT_APP_PRIMECOD_TOKEN no .env');
                console.error('🛡️ SEGURANÇA: Token PrimeCOD obrigatório não encontrado');
                console.error('📋 INSTRUÇÕES:', {
                    passo1: 'Crie/edite o arquivo .env na raiz do projeto frontend',
                    passo2: 'Adicione: REACT_APP_PRIMECOD_TOKEN=seu_token_aqui',
                    passo3: 'Reinicie o servidor de desenvolvimento'
                });
                return false;
            } else if (API_TOKEN.length < 10) {
                showNotification('error', 'Token PrimeCOD parece inválido. Verifique o formato.');
                console.warn('⚠️ Token muito curto, possivelmente inválido');
                return false;
            } else {
                console.log('✅ Token PrimeCOD configurado e validado');
                setBackendCompatible(true);
                return true;
            }
        };
        
        const tokenValido = verificarConfiguracao();
        
        // Só buscar análises se token estiver válido
        if (tokenValido) {
            fetchAnalises();
        }
        
        // Definir período padrão (última semana)
        const hoje = new Date();
        const semanaPassada = new Date();
        semanaPassada.setDate(hoje.getDate() - 7);
        
        setDateRange({
            from: semanaPassada,
            to: hoje
        });
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

            {/* Header */}
            {renderHeader()}

            {/* Navegação */}
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

            {/* Modal instruções */}
            <Dialog open={modalInstrucoes} onOpenChange={setModalInstrucoes}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto border-border bg-popover">
                    <DialogHeader>
                        <DialogTitle className="text-blue-600">Manual - PrimeCOD API Analytics</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Integração direta com a API do PrimeCOD
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                        {/* Status de Configuração */}
                        <div>
                            <h4 className="text-lg font-semibold mb-3">🔧 Status de Configuração</h4>
                            <Card className={`border-2 ${backendCompatible ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${backendCompatible ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                                        <div>
                                            <p className={`font-medium ${backendCompatible ? 'text-green-700' : 'text-red-700'}`}>
                                                {backendCompatible ? 'API PrimeCOD Configurada' : 'Configuração Pendente'}
                                            </p>
                                            <p className={`text-sm ${backendCompatible ? 'text-green-600' : 'text-red-600'}`}>
                                                {backendCompatible ? 
                                                    'Token válido e sistema pronto para uso' : 
                                                    'Configure REACT_APP_PRIMECOD_TOKEN no arquivo .env'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h4 className="text-lg font-semibold text-green-600 mb-3">🔗 Integração API Direta</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                Esta ferramenta conecta diretamente com a API do PrimeCOD para buscar dados em tempo real.
                            </p>
                            
                            <div className="space-y-2">
                                <p className="text-sm text-foreground">• <strong>Fonte:</strong> API PrimeCOD oficial</p>
                                <p className="text-sm text-foreground">• <strong>Limite:</strong> Até 400 páginas por busca</p>
                                <p className="text-sm text-foreground">• <strong>Filtros:</strong> Período de datas e países</p>
                                <p className="text-sm text-foreground">• <strong>Dados:</strong> Produto, País, Status das orders</p>
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h4 className="text-lg font-semibold text-purple-600 mb-3">📊 Status Disponíveis</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(STATUS_MAPPING).map(([id, status]) => (
                                    <Card key={id} className="border-blue-200 bg-card">
                                        <CardContent className="p-3">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-blue-600 text-sm">{status}</span>
                                                <Badge variant="outline" className="text-xs">ID: {id}</Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h4 className="text-lg font-semibold text-orange-600 mb-3">🌍 Países Suportados</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {PAISES_PRIMECOD.slice(1).map(pais => (
                                    <span key={pais.value} className="text-sm text-foreground">{pais.label}</span>
                                ))}
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        <div>
                            <h4 className="text-lg font-semibold text-teal-600 mb-3">📈 Tabela de Resultados</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                Visualização cruzada agrupando dados por:
                            </p>
                            <div className="space-y-1">
                                <p className="text-sm text-foreground">• <strong>Produto:</strong> SKU do produto</p>
                                <p className="text-sm text-foreground">• <strong>País:</strong> País de envio</p>
                                <p className="text-sm text-foreground">• <strong>Status:</strong> Colunas para cada status</p>
                                <p className="text-sm text-foreground">• <strong>Total:</strong> Soma de todos os status</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal salvar */}
            <Dialog open={modalSalvar} onOpenChange={setModalSalvar}>
                <DialogContent className="border-border bg-popover">
                    <DialogHeader>
                        <DialogTitle className="text-popover-foreground">Salvar Análise PrimeCOD</DialogTitle>
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
                                placeholder="Ex: PrimeCOD Grécia Janeiro 2025"
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

export default PrimecodPage;