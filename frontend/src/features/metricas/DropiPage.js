// frontend/src/features/metricas/DropiPage.js - VERSÃO ESTRUTURADA COMO ECOMHUB
import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon, Download, Trash2, RefreshCw, Check, X, 
    AlertTriangle, TrendingUp, BarChart3, Eye, Search, Globe, 
    Filter, Rocket, Loader2, Target, Percent,
    Package, Building, Clock, User, ArrowUpDown, 
    ArrowUp, ArrowDown, Image as ImageIcon
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
import { ScrollArea, ScrollBar } from '../../components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Calendar } from '../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';

const PAISES = [
    { value: 'mexico', label: 'México' },
    { value: 'chile', label: 'Chile' },
    { value: 'colombia', label: 'Colômbia' }
];

// Componente simples para imagem de produto com fallback
const ImagemProduto = ({ url, produto }) => {
    const [imagemFalhou, setImagemFalhou] = useState(false);

    if (!url || imagemFalhou) {
        return (
            <div className="flex justify-center">
                <div className="w-8 h-8 bg-muted border border-border rounded flex items-center justify-center">
                    <ImageIcon className="h-3 w-3 text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center">
            <img 
                src={url}
                alt={`Produto ${produto}`}
                className="w-8 h-8 object-cover rounded border border-border"
                loading="lazy"
                onError={() => setImagemFalhou(true)}
            />
        </div>
    );
};

// Status traduzidos do Dropi (baseados nos dados reais da API)
const STATUS_DROPI = {
    // Status originais
    'GUIA_GENERADA': { label: 'Guia Gerada', color: 'blue' },
    'PREPARADO PARA TRANSPORTADORA': { label: 'Preparado', color: 'orange' },
    'ENTREGADO A TRANSPORTADORA': { label: 'Entregue à Transportadora', color: 'green' },
    'INTENTO DE ENTREGA': { label: 'Tentativa', color: 'yellow' },
    'CANCELADO': { label: 'Cancelado', color: 'red' },
    'PENDIENTE': { label: 'Pendente', color: 'gray' },
    
    // Novos status encontrados na API
    'BODEGA DESTINO': { label: 'Bodega Destino', color: 'blue' },
    'EN BODEGA DROPI': { label: 'Em Bodega Dropi', color: 'orange' },
    'EN BODEGA ORIGEN': { label: 'Em Bodega Origem', color: 'orange' },
    'EN CAMINO': { label: 'Em Caminho', color: 'blue' },
    'EN CAMINO A CIUDAD DE DESTINO': { label: 'Rumo à Cidade', color: 'blue' },
    'EN CIUDAD DE DESTINO': { label: 'Na Cidade Destino', color: 'blue' },
    'EN CIUDAD DE ORIGEN': { label: 'Na Cidade Origem', color: 'orange' },
    'EN RUTA': { label: 'Em Rota', color: 'blue' },
    'EN RUTA DE ENTREGA': { label: 'Rota de Entrega', color: 'blue' },
    'EN TRANSITO': { label: 'Em Trânsito', color: 'blue' },
    'ENTREGADO': { label: 'Entregue', color: 'green' },
    'LISTO PARA ENTREGA': { label: 'Pronto Entrega', color: 'orange' },
    'LISTO PARA ENTREGAR': { label: 'Pronto Entrega', color: 'orange' },
    'NOVEDAD': { label: 'Novidade', color: 'yellow' },
    'NOVEDAD SOLUCIONADA': { label: 'Novidade OK', color: 'green' },
    'PARA DEVOLUCIÓN': { label: 'Para Devolução', color: 'red' },
    'PREPARANDO RUTA': { label: 'Preparando Rota', color: 'orange' },
    'RECOGIDO POR DROPI': { label: 'Coletado Dropi', color: 'orange' },
    'RECOLECCION ATENDIDA': { label: 'Coleta Atendida', color: 'green' },
    'TRANSBORDADA': { label: 'Transbordada', color: 'blue' },
    'VERIFICACION EN LAS INSTALACIONES': { label: 'Verificação', color: 'yellow' },
    'ENVÍO DOCUMENTADO RECOLECCIÓN': { label: 'Envio Documentado', color: 'orange' },
    'REENVIO EN DESTINO - TRANSFERENCIA A OFICINA DESTINO': { label: 'Reenvio Destino', color: 'yellow' }
};

function DropiPage() {
    // Estados principais
    const [analisesSalvas, setAnalisesSalvas] = useState([]);
    const [dadosResultado, setDadosResultado] = useState(null);
    const [secaoAtiva, setSecaoAtiva] = useState('gerar');
    
    
    // Estado do período (refatorado para seletor único)
    const [periodoSelecionado, setPeriodoSelecionado] = useState({from: undefined, to: undefined});
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
    
    // Estado para responsividade dos calendários (melhorado com detecção inicial)
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 768;
        }
        return false;
    });

    // Estados para filtros da tabela
    const [filtroStatus, setFiltroStatus] = useState('');
    const [filtroFornecedor, setFiltroFornecedor] = useState('');
    const [filtroNome, setFiltroNome] = useState('');

    // Estados para ordenação (igual EcomhubPage)
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');

    // Estado para mostrar exemplo de pedido
    const [mostrarExemplo, setMostrarExemplo] = useState(false);

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
        if (!periodoSelecionado?.from || !periodoSelecionado?.to || !paisSelecionado) {
            showNotification('error', 'Selecione o período completo e o país');
            return;
        }

        if (periodoSelecionado.from > periodoSelecionado.to) {
            showNotification('error', 'Data de início deve ser anterior à data fim');
            return;
        }

        setLoadingProcessar(true);
        setProgressoAtual({ etapa: 'Iniciando...', porcentagem: 0 });

        try {
            const response = await axios.post('/metricas/dropi/analises/extract_orders_new_api/', {
                data_inicio: periodoSelecionado.from.toISOString().split('T')[0],
                data_fim: periodoSelecionado.to.toISOString().split('T')[0],
                pais: paisSelecionado
            }, {
                headers: {
                    'X-CSRFToken': getCSRFToken()
                }
            });

            if (response.data.status === 'success') {
                // Corrigido: usar 'pedidos' ao invés de 'dados_processados'
                const pedidos = response.data.pedidos || [];
                
                console.log('[DEBUG] ===== DADOS COMPLETOS DA API DROPI =====');
                console.log('[DATA] Total de pedidos:', pedidos.length);
                console.log('[PAIS] País:', response.data.country || paisSelecionado);
                console.log('[PERIODO] Período:', response.data.period || `${periodoSelecionado.from.toLocaleDateString("pt-BR")} - ${periodoSelecionado.to.toLocaleDateString("pt-BR")}`);
                console.log('[VALOR] Valor total:', response.data.valor_total || 'N/A');
                console.log('[STATUS] Distribuição status:', response.data.status_distribution || {});
                console.log('');
                console.log('[EXEMPLO] ===== EXEMPLO DE PEDIDO (ESTRUTURA) =====');
                console.log('[PEDIDO] Primeiro pedido completo:', pedidos[0]);
                console.log('');
                console.log('[SUCESSO] Dados carregados na interface para análise visual!');
                
                setDadosResultado(pedidos);
                
                
                showNotification('success', `${pedidos.length} pedidos extraídos com sucesso!`);
                
                const paisNome = PAISES.find(p => p.value === paisSelecionado)?.label || 'País';
                const dataStr = `${periodoSelecionado.from.toLocaleDateString('pt-BR')} - ${periodoSelecionado.to.toLocaleDateString('pt-BR')}`;
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
                dados_pedidos: dadosResultado, // Agora está correto, é o array de pedidos
                data_inicio: periodoSelecionado.from.toISOString().split('T')[0],
                data_fim: periodoSelecionado.to.toISOString().split('T')[0],
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
        const nomeDisplay = nome.replace('[Dropi] ', '');
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

    // Função para verificar se é mobile (melhorada com debounce)
    const checkIfMobile = () => {
        const isMobileNow = window.innerWidth < 768;
        if (isMobileNow !== isMobile) {
            setIsMobile(isMobileNow);
        }
    };


    // Transformar dados de pedidos em tabela produtos x status
    const processarDadosParaTabela = (pedidos) => {
        if (!pedidos || !Array.isArray(pedidos) || pedidos.length === 0) return [];

        // Agrupar por produto
        const produtosPorStatus = {};
        const produtosPorImagem = {}; // Para mapear produtos e suas imagens

        pedidos.forEach(pedido => {
            // CORREÇÃO: Usar a localização correta da API conforme especificado
            const produto = pedido.orderdetails?.[0]?.product?.name || 'Produto Desconhecido';
            let imagemProduto = null;
            const status = pedido.status || 'UNKNOWN';

            // Buscar imagem do produto
            const product = pedido.orderdetails?.[0]?.product;
            if (product) {
                // Tentar diferentes campos de imagem
                const gallery0UrlS3 = product.gallery?.[0]?.urlS3;
                const gallery0Url = product.gallery?.[0]?.url;
                const productImage = product.image || product.img_url || product.thumbnail;
                
                // Escolher a primeira URL disponível
                imagemProduto = gallery0UrlS3 || gallery0Url || productImage;
                
                // Se não tem protocolo, adicionar base padrão
                if (imagemProduto && !imagemProduto.startsWith('http')) {
                    imagemProduto = imagemProduto.startsWith('/') ? 
                        `https://dropi.com${imagemProduto}` : 
                        `https://dropi.com/${imagemProduto}`;
                }
            }

            if (!produtosPorStatus[produto]) {
                produtosPorStatus[produto] = {};
                produtosPorImagem[produto] = imagemProduto; // Salvar imagem para o produto
            }

            if (!produtosPorStatus[produto][status]) {
                produtosPorStatus[produto][status] = 0;
            }

            produtosPorStatus[produto][status]++;
        });

        // Converter para formato de tabela
        const tabelaData = [];
        const todosStatus = [...new Set(pedidos.map(p => p.status || 'UNKNOWN'))];

        Object.entries(produtosPorStatus).forEach(([produto, statusCount]) => {
            const row = { 
                Imagem: produtosPorImagem[produto], // NOVA COLUNA: Imagem como primeira
                Produto: produto 
            };
            
            let totalProduto = 0;
            let entreguesProduto = 0;

            // Adicionar cada status como coluna
            todosStatus.forEach(status => {
                const count = statusCount[status] || 0;
                row[STATUS_DROPI[status]?.label || status] = count;
                totalProduto += count;

                // Contar entregues (ENTREGADO + ENTREGADO A TRANSPORTADORA)
                if (status === 'ENTREGADO' || status === 'ENTREGADO A TRANSPORTADORA') {
                    entreguesProduto += count;
                }
            });

            row.Total = totalProduto;
            row.Entregues = entreguesProduto;
            row.Efetividade = totalProduto > 0 ? `${((entreguesProduto / totalProduto) * 100).toFixed(1)}%` : '0%';

            tabelaData.push(row);
        });

        // Ordenar por total (maior primeiro)
        tabelaData.sort((a, b) => b.Total - a.Total);

        // Adicionar linha TOTAL
        const totalGeral = {
            Imagem: null, // Total não tem imagem
            Produto: 'TOTAL',
            Total: pedidos.length,
            Entregues: pedidos.filter(p => p.status === 'ENTREGADO' || p.status === 'ENTREGADO A TRANSPORTADORA').length
        };

        todosStatus.forEach(status => {
            const count = pedidos.filter(p => p.status === status).length;
            totalGeral[STATUS_DROPI[status]?.label || status] = count;
        });

        totalGeral.Efetividade = totalGeral.Total > 0 ? `${((totalGeral.Entregues / totalGeral.Total) * 100).toFixed(1)}%` : '0%';

        tabelaData.push(totalGeral);


        return tabelaData;
    };

    // Função para cores da efetividade (igual EcomhubPage)
    const getEfetividadeCor = (valor) => {
        if (!valor || typeof valor !== 'string') return '';
        
        const numero = parseFloat(valor.replace('%', ''));
        
        if (numero >= 60) return 'bg-green-600 text-white';
        if (numero >= 50) return 'bg-green-500 text-white';
        if (numero >= 40) return 'bg-yellow-500 text-black';
        return 'bg-red-500 text-white';
    };

    // Função de ordenação (igual EcomhubPage)
    const sortData = (data, sortBy, sortOrder) => {
        if (!sortBy) return data;
        
        return [...data].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            if (typeof aVal === 'string' && aVal.includes('%')) {
                aVal = parseFloat(aVal.replace('%', ''));
            }
            if (typeof bVal === 'string' && bVal.includes('%')) {
                bVal = parseFloat(bVal.replace('%', ''));
            }
            
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

    // Header responsivo
    const renderHeader = () => (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-primary" />
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Análise de Pedidos Dropi</h1>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModalInstrucoes(true)}
                    className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Instruções</span>
                    <span className="sm:hidden">Info</span>
                </Button>
                
                <Select value={paisSelecionado} onValueChange={setPaisSelecionado}>
                    <SelectTrigger className="w-full sm:w-52 border-border bg-background text-foreground">
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
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Título e descrição - sempre à esquerda */}
                    <div className="flex items-center gap-3">
                        <Filter className="h-5 w-5 text-primary" />
                        <div>
                            <CardTitle className="text-card-foreground">Configuração</CardTitle>
                            <CardDescription className="text-muted-foreground">Configure o período e execute</CardDescription>
                        </div>
                    </div>

                    {/* Controles - mobile: abaixo, desktop: à direita */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Seletor de período */}
                        <div className="min-w-0">
                            <Label className="mb-2 block text-foreground text-sm">Período</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={loadingProcessar}
                                        className="w-full sm:w-[280px] justify-start text-left font-normal border-border bg-background text-foreground hover:bg-accent"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">
                                            {periodoSelecionado?.from ? (
                                                periodoSelecionado.to ? (
                                                    `${periodoSelecionado.from.toLocaleDateString('pt-BR')} - ${periodoSelecionado.to.toLocaleDateString('pt-BR')}`
                                                ) : (
                                                    `${periodoSelecionado.from.toLocaleDateString('pt-BR')} - Selecione fim`
                                                )
                                            ) : (
                                                "Selecionar período"
                                            )}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent 
                                    className="p-0 w-auto max-w-none" 
                                    align="start"
                                    style={{
                                        width: isMobile ? 'auto' : '680px',
                                        maxWidth: 'none'
                                    }}
                                >
                                    <div className={isMobile ? '' : 'grid grid-cols-2 gap-4 p-4'}>
                                        {isMobile ? (
                                            <Calendar
                                                mode="range"
                                                selected={periodoSelecionado}
                                                onSelect={setPeriodoSelecionado}
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("2020-01-01")
                                                }
                                                initialFocus
                                                numberOfMonths={1}
                                                className="rounded-md border"
                                            />
                                        ) : (
                                            <>
                                                <Calendar
                                                    mode="range"
                                                    selected={periodoSelecionado}
                                                    onSelect={setPeriodoSelecionado}
                                                    disabled={(date) =>
                                                        date > new Date() || date < new Date("2020-01-01")
                                                    }
                                                    initialFocus
                                                    numberOfMonths={1}
                                                    defaultMonth={periodoSelecionado?.from || new Date()}
                                                    className="rounded-md border w-full"
                                                />
                                                <Calendar
                                                    mode="range"
                                                    selected={periodoSelecionado}
                                                    onSelect={setPeriodoSelecionado}
                                                    disabled={(date) =>
                                                        date > new Date() || date < new Date("2020-01-01")
                                                    }
                                                    numberOfMonths={1}
                                                    defaultMonth={
                                                        periodoSelecionado?.from 
                                                            ? new Date(periodoSelecionado.from.getFullYear(), periodoSelecionado.from.getMonth() + 1, 1)
                                                            : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
                                                    }
                                                    className="rounded-md border w-full"
                                                />
                                            </>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        
                        {/* Botão processar */}
                        <div className="sm:mt-6"> {/* Alinha com o input */}
                            <Button
                                onClick={processarDados}
                                disabled={!periodoSelecionado?.from || !periodoSelecionado?.to || !paisSelecionado || loadingProcessar}
                                size="lg"
                                className="w-full sm:w-auto px-8 bg-primary text-primary-foreground hover:bg-primary/90"
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
        
        // Somar ambos os tipos de entrega
        const entregues = (statusCount['ENTREGADO'] || 0) + (statusCount['ENTREGADO A TRANSPORTADORA'] || 0);
        const efetividade = totalPedidos > 0 ? ((entregues / totalPedidos) * 100).toFixed(1) : 0;
        
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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



    // Renderizar exemplo de pedido da API em JSON
    const renderExemploPedido = () => {
        if (!dadosResultado || !Array.isArray(dadosResultado) || dadosResultado.length === 0) return null;

        const exemplotPedido = dadosResultado[0]; // Primeiro pedido como exemplo

        return (
            <Card className="mb-6 border-border bg-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
                                <Eye className="h-5 w-5" />
                                Estrutura da API - Exemplo de Pedido
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">
                                Primeiro pedido dos dados extraídos (formato JSON bruto da API)
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMostrarExemplo(!mostrarExemplo)}
                            className="border-border bg-background text-foreground hover:bg-accent"
                        >
                            {mostrarExemplo ? "Ocultar" : "Mostrar"} Dados
                        </Button>
                    </div>
                </CardHeader>

                {mostrarExemplo && (
                    <CardContent>
                        <div className="bg-muted/20 border border-border rounded-lg p-4 overflow-x-auto">
                            <pre className="text-xs text-card-foreground whitespace-pre-wrap">
                                {JSON.stringify(exemplotPedido, null, 2)}
                            </pre>
                        </div>
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>[INFO] Para análises:</strong> Este é o formato dos dados que vêm da API. 
                                Cada pedido contém informações como status, produto, valor, datas, etc.
                            </p>
                        </div>
                    </CardContent>
                )}
            </Card>
        );
    };

    // Tabela produtos x status com melhorias de responsividade e imagem
    const renderResultados = () => {
        if (!dadosResultado || !Array.isArray(dadosResultado)) {
            return null;
        }

        // Transformar dados em tabela produtos x status
        const dadosTabela = processarDadosParaTabela(dadosResultado);
        if (!dadosTabela || dadosTabela.length === 0) return null;

        const colunas = Object.keys(dadosTabela[0] || {});
        const dadosOrdenados = sortData(dadosTabela, sortBy, sortOrder);

        return (
            <Card className="mb-6 border-border bg-card">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg text-card-foreground">Produtos por Status</CardTitle>
                            <CardDescription className="text-muted-foreground">{dadosTabela.length} produtos</CardDescription>
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
                    <div className="relative w-full">
                        <ScrollArea className="w-full whitespace-nowrap rounded-md overflow-x-auto">
                            <div className="flex w-max min-w-full">
                                <Table className="w-max min-w-full">
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 border-border">
                                            {colunas.map((col) => {
                                                const isImagem = col === 'Imagem';
                                                const isProduto = col === 'Produto';
                                                const isEfetividade = col === 'Efetividade';
                                                
                                                let classesSimples = 'whitespace-nowrap px-3 py-3 text-xs text-muted-foreground font-medium';
                                                
                                                if (isImagem) {
                                                    classesSimples += ' w-16 text-center';
                                                } else if (isProduto) {
                                                    classesSimples += ' min-w-[150px]';
                                                } else if (isEfetividade) {
                                                    classesSimples += ' min-w-[100px] text-center';
                                                } else {
                                                    classesSimples += ' min-w-[90px] text-center';
                                                }
                                                
                                                return (
                                                <TableHead 
                                                    key={col} 
                                                    className={classesSimples}
                                                >
                                                    {col === 'Imagem' ? (
                                                        <div className="flex items-center justify-center">
                                                            <ImageIcon className="h-3 w-3" />
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-auto p-0 font-medium text-xs text-muted-foreground hover:text-foreground"
                                                            onClick={() => handleSort(col)}
                                                        >
                                                            {col.replace('_', ' ')}
                                                            {sortBy === col ? (
                                                                sortOrder === 'asc' ? 
                                                                    <ArrowUp className="ml-1 h-3 w-3" /> : 
                                                                    <ArrowDown className="ml-1 h-3 w-3" />
                                                            ) : (
                                                                <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </TableHead>
                                                );
                                            })}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dadosOrdenados.map((row, idx) => (
                                            <TableRow key={idx} className={`border-border ${row.Produto === 'TOTAL' ? 'bg-muted/20 font-medium' : ''}`}>
                                                {colunas.map(col => {
                                                    const isImagem = col === 'Imagem';
                                                    const isProduto = col === 'Produto';
                                                    const isEfetividade = col === 'Efetividade';
                                                    
                                                    let classesCelula = 'px-3 py-3 text-xs text-card-foreground';
                                                    
                                                    if (isImagem) {
                                                        classesCelula += ' text-center';
                                                    } else if (isProduto) {
                                                        classesCelula += ' font-medium';
                                                    } else if (isEfetividade) {
                                                        classesCelula += ` font-bold ${getEfetividadeCor(row[col])} px-2 py-1 rounded text-center`;
                                                    } else {
                                                        classesCelula += ' text-center';
                                                    }
                                                    
                                                    return (
                                                    <TableCell
                                                        key={col}
                                                        className={classesCelula}
                                                    >
                                                        {/* Renderização da coluna Imagem */}
                                                        {col === 'Imagem' ? (
                                                            row[col] && row.Produto !== 'TOTAL' ? (
                                                                <ImagemProduto 
                                                                    url={row[col]}
                                                                    produto={row.Produto}
                                                                />
                                                            ) : (
                                                                row.Produto === 'TOTAL' ? (
                                                                    <div className="flex justify-center">
                                                                        <div className="w-8 h-8 bg-primary/10 border border-border rounded flex items-center justify-center">
                                                                            <BarChart3 className="h-3 w-3 text-primary" />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex justify-center">
                                                                        <div className="w-8 h-8 bg-muted border border-border rounded flex items-center justify-center">
                                                                            <ImageIcon className="h-3 w-3 text-muted-foreground" />
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )
                                                        ) : col === 'Produto' ? (
                                                            <div 
                                                                className="max-w-[180px] truncate cursor-help" 
                                                                title={row[col]}
                                                            >
                                                                {row[col]}
                                                            </div>
                                                        ) : (
                                                            typeof row[col] === 'number' ? row[col].toLocaleString() : row[col]
                                                        )}
                                                    </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <ScrollBar orientation="horizontal" className="h-3" />
                        </ScrollArea>
                    </div>
                    
                    {/* Nota sobre scroll da tabela - CORRIGIDA */}
                    <div className="px-4 pb-4 pt-2 overflow-hidden">
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-xs text-muted-foreground text-center">
                                💡 Role horizontalmente dentro da tabela para ver todos os status de pedidos
                            </p>
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
                                                {analise.nome.replace('[Dropi] ', '')}
                                            </h3>
                                            <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">Dropi</Badge>
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
        
        // Definir período padrão (última semana)
        const hoje = new Date();
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(hoje.getDate() - 7);
        
        setPeriodoSelecionado({
            from: seteDiasAtras,
            to: hoje
        });
        
        // Configurar responsividade dos calendários (melhorado)
        checkIfMobile(); // Detecção inicial
        const handleResize = () => checkIfMobile();
        window.addEventListener('resize', handleResize);
        
        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // ======================== RENDER PRINCIPAL ========================

    return (
        <div className="flex-1 space-y-4 p-3 sm:p-6 min-h-screen bg-background">
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
                    {renderExemploPedido()}
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
                        <DialogTitle className="text-orange-600">Manual de Instruções - Métricas Dropi</DialogTitle>
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
                                        <h5 className="font-semibold text-blue-600 text-sm">México</h5>
                                        <p className="text-xs text-muted-foreground">Extração de pedidos Dropi México</p>
                                    </CardContent>
                                </Card>
                                
                                <Card className="border-red-200 bg-card">
                                    <CardContent className="p-4">
                                        <h5 className="font-semibold text-red-600 text-sm">Chile</h5>
                                        <p className="text-xs text-muted-foreground">Extração de pedidos Dropi Chile</p>
                                    </CardContent>
                                </Card>
                                
                                <Card className="border-yellow-200 bg-card">
                                    <CardContent className="p-4">
                                        <h5 className="font-semibold text-yellow-600 text-sm">Colômbia</h5>
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

                        <Separator className="bg-border" />

                        <div>
                            <h4 className="text-lg font-semibold text-purple-600 mb-3">Como é Calculada a Efetividade?</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                A efetividade representa a porcentagem de pedidos que foram entregues com sucesso.
                            </p>
                            
                            <Card className="border-purple-200 bg-card mb-4">
                                <CardContent className="p-4">
                                    <div className="space-y-3">
                                        <div className="bg-muted/30 p-3 rounded-lg">
                                            <p className="font-semibold text-purple-600 mb-2">[FÓRMULA]</p>
                                            <code className="text-sm bg-background px-2 py-1 rounded border">
                                                (Pedidos Entregues / Total de Pedidos) * 100
                                            </code>
                                        </div>
                                        
                                        <div className="bg-muted/30 p-3 rounded-lg">
                                            <p className="font-semibold text-green-600 mb-2">✅ Status considerados "Entregues":</p>
                                            <div className="space-y-1">
                                                <Badge className="bg-green-100 text-green-800 mr-2">ENTREGADO</Badge>
                                                <Badge className="bg-green-100 text-green-800">ENTREGADO A TRANSPORTADORA</Badge>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-muted/30 p-3 rounded-lg">
                                            <p className="font-semibold text-blue-600 mb-2">[EXEMPLO]</p>
                                            <div className="text-sm space-y-1">
                                                <p>• Total: 100 pedidos</p>
                                                <p>• Entregues: 75 pedidos</p>
                                                <p>• <strong>Efetividade: 75%</strong></p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-muted/30 p-3 rounded-lg">
                                            <p className="font-semibold text-orange-600 mb-2">Cores da Efetividade:</p>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                                                    <span className="text-sm">Verde (&gt;=60%): Excelente</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                                                    <span className="text-sm">Amarelo (40-59%): Bom</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                                                    <span className="text-sm">Vermelho (&lt;40%): Precisa melhorar</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
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