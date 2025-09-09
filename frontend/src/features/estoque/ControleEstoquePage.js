// frontend/src/features/estoque/ControleEstoquePage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { Toaster } from '../../components/ui/toaster';
import {
    Package, AlertCircle, Check, X, RefreshCw, Trash2, 
    Info, History, Plus, Building, TrendingUp, TrendingDown,
    Edit, Search, Target, Loader2, Eye, PackageOpen,
    BarChart3, AlertTriangle, ChevronDown, ChevronUp, Zap, Sliders
} from 'lucide-react';
import { getCSRFToken } from '../../utils/csrf';

// WebSocket e componentes de tempo real
import useWebSocket from '../../hooks/useWebSocket';
import RealtimeNotifications from './components/RealtimeNotifications';
import { 
    useProductHighlight, 
    ProductHighlightBadge, 
    HighlightedTableRow, 
    UpdateAnimation 
} from './components/ProductHighlight';

function ControleEstoquePage() {
    // Estados principais
    const [lojas, setLojas] = useState([]);
    const [lojaSelecionada, setLojaSelecionada] = useState(null);
    const [produtos, setProdutos] = useState([]);
    const [produtosFiltrados, setProdutosFiltrados] = useState([]);
    const [searchingProdutos, setSearchingProdutos] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados modais/formulários
    const [showAddProduto, setShowAddProduto] = useState(false);
    const [showEditProduto, setShowEditProduto] = useState(false);
    const [showAjusteEstoque, setShowAjusteEstoque] = useState(false);
    const [showHistorico, setShowHistorico] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [selectedProduto, setSelectedProduto] = useState(null);
    
    // Formulários
    const [novoProduto, setNovoProduto] = useState({ 
        sku: '', 
        nome: '', 
        fornecedor: 'N1 Itália',
        estoque_inicial: 0, 
        estoque_minimo: 5
    });
    const [ajusteEstoque, setAjusteEstoque] = useState({
        tipo: 'adicionar', // 'adicionar' ou 'remover'
        quantidade: 0,
        motivo: '',
        observacoes: ''
    });
    
    // Estados de dados
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [alertas, setAlertas] = useState([]);
    const [showAlertas, setShowAlertas] = useState(true);
    
    // Estados interface
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    const [savingProduto, setSavingProduto] = useState(false);
    const [ajustandoEstoque, setAjustandoEstoque] = useState(false);
    const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);
    
    // WebSocket e tempo real - habilitado para receber notificações de cancelamento
    // Construir URL do WebSocket baseada na loja selecionada
    const websocketUrl = lojaSelecionada ? `/ws/estoque/?loja_id=${lojaSelecionada}` : null;
    
    const {
        connectionStatus,
        lastMessage,
        messageHistory,
        reconnectAttempts,
        maxReconnectAttempts,
        hasExceededMaxAttempts,
        sendMessage,
        sendJsonMessage,
        connect: reconnectWebSocket,
        retryConnection,
        isReconnecting
    } = useWebSocket(websocketUrl, {
        shouldReconnect: true,
        reconnectInterval: 3000,
        maxReconnectAttempts: 5,
        onOpen: (event) => {
            // WebSocket conectado
        },
        onClose: (event) => {
            // WebSocket desconectado
        },
        onMessage: (message) => {
            handleWebSocketMessage(message);
        },
        onError: (error) => {
            // Circuit breaker ativado - mostrar notificação única e parar
            if (error.code === 'CIRCUIT_BREAKER') {
                showNotification('Sistema funcionando normalmente sem tempo real', 'info');
                return;
            }
            
            // Não mostrar notificações para erros temporários (1006, 1000)
            if (error.code === 1006 || error.code === 1000) {
                return;
            }
            
            // Só mostrar notificação para erros realmente problemáticos
            if (error.code && ![1006, 1000, 1001].includes(error.code)) {
                showNotification(`Erro de conexão: ${error.code}`, 'warning');
            }
        }
    });
    
    // Sistema de destaque de produtos
    const {
        highlightProduct,
        isHighlighted,
        getHighlight,
        clearAllHighlights
    } = useProductHighlight();

    useEffect(() => {
        loadLojas();
    }, []);

    useEffect(() => {
        if (lojaSelecionada) {
            loadProdutos();
            loadAlertas();
            // Limpar destaques quando trocar de loja
            clearAllHighlights();
        }
    }, [lojaSelecionada, clearAllHighlights]);
    
    // Sistema habilitado para receber atualizações em tempo real via WebSocket
    
    // Enviar identificação quando WebSocket conectar
    useEffect(() => {
        if (connectionStatus === 'Open' && sendJsonMessage && lojaSelecionada) {
            sendJsonMessage({
                type: 'identify',
                data: {
                    loja_id: lojaSelecionada,
                    user_agent: navigator.userAgent,
                    timestamp: Date.now(),
                    client_type: 'controle_estoque'
                }
            });
            
            // Notificar restauração de conexão apenas se houve reconexão
            if (reconnectAttempts > 0) {
                showNotification('✨ Conexão em tempo real restaurada!', 'success');
            }
        }
    }, [connectionStatus, sendJsonMessage, lojaSelecionada, reconnectAttempts]);
    
    // Mostrar progresso de reconexão e estado final
    useEffect(() => {
        if (isReconnecting && reconnectAttempts > 0 && connectionStatus !== 'Open') {
            // Só mostrar a partir da segunda tentativa para reduzir spam
            if (reconnectAttempts >= 2) {
                showNotification(
                    `Tentativa ${reconnectAttempts}/${maxReconnectAttempts} - Reconectando...`,
                    'info'
                );
            }
        } else if (hasExceededMaxAttempts && !isReconnecting) {
            // Notificar quando parar de tentar reconectar
            showNotification(
                'Conexão em tempo real indisponível. Funcionalidade básica mantida.',
                'warning'
            );
        }
    }, [isReconnecting, reconnectAttempts, maxReconnectAttempts, hasExceededMaxAttempts, connectionStatus]);

    useEffect(() => {
        // Filtrar produtos baseado no termo de busca
        if (searchTerm.trim() === '') {
            setProdutosFiltrados(produtos);
        } else {
            const filtered = produtos.filter(produto => 
                produto.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                produto.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                produto.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setProdutosFiltrados(filtered);
        }
    }, [produtos, searchTerm]);
    
    // Handlers para notificações em tempo real
    const handleStockUpdate = async (data) => {
        try {
            // Destacar produto atualizado com animação visual
            if (data.produto?.id) {
                const highlightType = data.estoque_atual > data.estoque_anterior ? 
                    'stock_increase' : 'stock_decrease';
                highlightProduct(data.produto.id, highlightType, 6000); // 6 segundos de destaque
            }
            
            // Recarregar dados para manter sincronização
            await Promise.all([loadProdutos(), loadAlertas()]);
            
            // Feedback visual adicional
            const diferenca = data.estoque_atual - data.estoque_anterior;
            const acao = diferenca > 0 ? 'aumentou' : 'diminuiu';
            showNotification(
                `Estoque ${acao}: ${data.produto?.nome || 'Produto'} (${Math.abs(diferenca)} unidades)`,
                diferenca > 0 ? 'success' : 'warning'
            );
            
        } catch (error) {
            console.error('Erro ao processar atualização de estoque:', error);
        }
    };
    
    const handleProductUpdate = async () => {
        try {
            await Promise.all([loadProdutos(), loadAlertas()]);
            showNotification('Produtos atualizados automaticamente', 'success');
        } catch (error) {
            console.error('Erro ao processar atualização de produtos:', error);
        }
    };
    
    
    // Handler adicional para mensagens WebSocket diretas
    const handleWebSocketMessage = (message) => {
        // Processar mensagens específicas que requerem ação imediata
        switch (message.type) {
            case 'ping':
                // Responder a pings para manter conexão
                if (sendMessage) {
                    sendMessage(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                }
                break;
            
            case 'connection_acknowledged':
                showNotification('Sincronização em tempo real ativada!', 'success');
                break;
                
            default:
                // Outras mensagens são tratadas pelo RealtimeNotifications
                break;
        }
    };

    const showNotification = (message, type = 'success') => {
        const typeConfig = {
            success: { duration: 4000 },
            warning: { duration: 5000 },
            error: { duration: 6000 },
            info: { duration: 4000 }
        };
        
        setNotification({ message, type });
        
        const duration = typeConfig[type]?.duration || 4000;
        setTimeout(() => setNotification(null), duration);
    };
    
    // Funções de notificação em tempo real via WebSocket habilitadas

    const loadLojas = async () => {
        try {
            const response = await axios.get('/processamento/lojas/');
            setLojas(response.data.lojas || []);
            if (response.data.lojas?.length > 0 && !lojaSelecionada) {
                setLojaSelecionada(response.data.lojas[0].id);
            }
        } catch (error) {
            console.error('Erro ao carregar lojas:', error);
            showNotification('Erro ao carregar lojas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadProdutos = async () => {
        if (!lojaSelecionada) return;
        
        setSearchingProdutos(true);
        try {
            const response = await axios.get('/estoque/produtos/', {
                params: { loja_id: lojaSelecionada }
            });
            
            if (response.data && Array.isArray(response.data)) {
                setProdutos(response.data);
                showNotification(`${response.data.length || 0} produtos carregados`);
            } else {
                showNotification(response.data.error || 'Erro ao carregar produtos', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            showNotification('Erro ao carregar produtos', 'error');
            setProdutos([]);
        } finally {
            setSearchingProdutos(false);
        }
    };

    const loadAlertas = async () => {
        if (!lojaSelecionada) return;
        
        try {
            const response = await axios.get('/estoque/alertas/', {
                params: { loja_id: lojaSelecionada }
            });
            
            if (response.data && Array.isArray(response.data)) {
                // Filtrar apenas alertas críticos (sem estoque ou estoque baixo)
                const alertasCriticos = response.data.filter(alerta => {
                    const atual = parseInt(alerta.estoque_atual_produto) || 0;
                    // Tentar múltiplas fontes para o estoque mínimo
                    const minimo = parseInt(alerta.produto?.estoque_minimo) || 
                                  parseInt(alerta.estoque_minimo) || 
                                  parseInt(alerta.produto_estoque_minimo) || 
                                  5;
                    
                    const semEstoque = atual <= 0;
                    const estoqueBaixo = atual > 0 && atual <= minimo;
                    return semEstoque || estoqueBaixo;
                });
                
                setAlertas(alertasCriticos);
            } else {
                console.error('Erro ao carregar alertas:', response.data.error);
                setAlertas([]);
            }
        } catch (error) {
            console.error('Erro ao carregar alertas:', error);
            setAlertas([]);
        }
    };

    const loadMovimentacoes = async (produtoId = null) => {
        if (!lojaSelecionada) return;
        
        setLoadingMovimentacoes(true);
        try {
            const params = { loja_id: lojaSelecionada };
            if (produtoId) params.produto_id = produtoId;
            
            const response = await axios.get('/estoque/movimentacoes/', { params });
            
            if (response.data && Array.isArray(response.data)) {
                setMovimentacoes(response.data);
            } else {
                showNotification(response.data.error || 'Erro ao carregar movimentações', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar movimentações:', error);
            showNotification('Erro ao carregar movimentações', 'error');
        } finally {
            setLoadingMovimentacoes(false);
        }
    };

    const debugConexao = async () => {
        try {
            console.log('=== TESTE DE DEBUG ===');
            const response = await axios.get('/estoque/produtos/debug_info/');
            console.log('Debug info:', response.data);
            showNotification('Debug executado - verificar console', 'success');
        } catch (error) {
            console.error('Erro no debug:', error);
            showNotification(`Erro no debug: ${error.response?.status} ${error.response?.statusText}`, 'error');
        }
    };

    const salvarProduto = async () => {
        if (!lojaSelecionada) {
            showNotification('Selecione uma loja primeiro', 'error');
            return;
        }

        if (!novoProduto.sku || !novoProduto.nome || !novoProduto.fornecedor) {
            showNotification('SKU, nome e fornecedor são obrigatórios', 'error');
            return;
        }

        // Validar se a loja selecionada existe na lista de lojas
        const lojaValida = lojas.find(loja => loja.id === lojaSelecionada);
        if (!lojaValida) {
            showNotification('Loja selecionada não é válida', 'error');
            return;
        }

        setSavingProduto(true);
        try {
            const dados = {
                ...novoProduto,
                loja_config: lojaSelecionada,
                estoque_inicial: parseInt(novoProduto.estoque_inicial) || 0,
                estoque_minimo: parseInt(novoProduto.estoque_minimo) || 5
            };

            console.log('=== DEBUG CRIAÇÃO PRODUTO ===');
            console.log('Dados enviados:', dados);
            console.log('Loja selecionada:', lojaValida);
            console.log('CSRF Token:', getCSRFToken()?.substring(0, 10) + '...');

            const response = await axios.post('/estoque/produtos/', dados, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            console.log('Resposta do servidor:', response.data);

            if (response.data && response.data.id) {
                showNotification('Produto adicionado com sucesso!');
                setNovoProduto({ 
                    sku: '', 
                    nome: '', 
                    fornecedor: 'N1 Itália',
                    estoque_inicial: 0, 
                    estoque_minimo: 5
                });
                setShowAddProduto(false);
                await loadProdutos();
                await loadAlertas();
            } else {
                console.error('Resposta inválida do servidor:', response.data);
                showNotification(response.data.error || 'Erro ao salvar produto', 'error');
            }
        } catch (error) {
            console.error('=== ERRO DETALHADO ===');
            console.error('Status:', error.response?.status);
            console.error('Status Text:', error.response?.statusText);
            console.error('Headers:', error.response?.headers);
            console.error('Data:', error.response?.data);
            console.error('Erro completo:', error);
            
            let mensagemErro = 'Erro ao salvar produto';
            
            if (error.response?.status === 400) {
                // Erro 400 - Bad Request
                if (error.response?.data) {
                    if (typeof error.response.data === 'string') {
                        mensagemErro = error.response.data;
                    } else if (error.response.data.error) {
                        mensagemErro = error.response.data.error;
                    } else if (error.response.data.detail) {
                        mensagemErro = error.response.data.detail;
                    } else {
                        // Mostrar erros de validação específicos
                        const erros = Object.entries(error.response.data)
                            .map(([campo, mensagens]) => {
                                if (Array.isArray(mensagens)) {
                                    return `${campo}: ${mensagens.join(', ')}`;
                                }
                                return `${campo}: ${mensagens}`;
                            }).join('; ');
                        mensagemErro = `Erro de validação: ${erros}`;
                    }
                }
            } else if (error.response?.status === 401) {
                mensagemErro = 'Não autorizado. Faça login novamente.';
            } else if (error.response?.status === 403) {
                mensagemErro = 'Acesso negado. Verificar permissões.';
            } else if (error.response?.status === 500) {
                mensagemErro = 'Erro interno do servidor. Tente novamente.';
            }
            
            showNotification(mensagemErro, 'error');
        } finally {
            setSavingProduto(false);
        }
    };

    const editarProduto = async () => {
        if (!selectedProduto?.id) return;

        setSavingProduto(true);
        try {
            const dados = {
                sku: selectedProduto.sku,
                nome: selectedProduto.nome,
                fornecedor: selectedProduto.fornecedor,
                estoque_minimo: parseInt(selectedProduto.estoque_minimo) || 5,
                loja_config: selectedProduto.loja_config || lojaSelecionada
            };

            const response = await axios.put(`/estoque/produtos/${selectedProduto.id}/`, dados, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            if (response.data && response.data.id) {
                showNotification('Produto atualizado com sucesso!');
                setShowEditProduto(false);
                setSelectedProduto(null);
                await loadProdutos();
                await loadAlertas();
            } else {
                showNotification(response.data.error || 'Erro ao atualizar produto', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            showNotification(error.response?.data?.error || 'Erro ao atualizar produto', 'error');
        } finally {
            setSavingProduto(false);
        }
    };

    const ajustarEstoque = async () => {
        // Validações robustas antes de enviar
        if (!selectedProduto?.id) {
            showNotification('Produto não selecionado ou inválido', 'error');
            return;
        }

        if (!lojaSelecionada) {
            showNotification('Loja não selecionada', 'error');
            return;
        }

        if (!ajusteEstoque.quantidade || parseInt(ajusteEstoque.quantidade) <= 0) {
            showNotification('Quantidade deve ser maior que zero', 'error');
            return;
        }

        if (!ajusteEstoque.motivo.trim()) {
            showNotification('Motivo é obrigatório', 'error');
            return;
        }

        setAjustandoEstoque(true);
        try {
            const dados = {
                produto_id: selectedProduto.id,
                tipo_movimento: ajusteEstoque.tipo === 'adicionar' ? 'entrada' : 'saida',
                quantidade: parseInt(ajusteEstoque.quantidade),
                observacoes: `${ajusteEstoque.motivo}${ajusteEstoque.observacoes ? ': ' + ajusteEstoque.observacoes : ''}`
            };

            const response = await axios.post('/estoque/movimentacoes/', dados, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            // ✅ CORREÇÃO: Status 200/201 = sucesso, independente da estrutura dos dados
            if (response.status === 200 || response.status === 201) {
                const acao = ajusteEstoque.tipo === 'adicionar' ? 'adicionado' : 'removido';
                showNotification(`Estoque ${acao} com sucesso!`);
                
                // Reset completo do formulário
                setAjusteEstoque({
                    tipo: 'adicionar',
                    quantidade: 0,
                    motivo: '',
                    observacoes: ''
                });
                setShowAjusteEstoque(false);
                setSelectedProduto(null);
                
                // Recarregar dados atualizados
                await Promise.all([loadProdutos(), loadAlertas()]);
            } else {
                showNotification(response.data?.error || 'Erro ao ajustar estoque', 'error');
            }
        } catch (error) {
            console.error('Erro detalhado ao ajustar estoque:', error);
            
            // Log detalhado do erro
            if (error.response) {
                console.error('Status do erro:', error.response.status);
                console.error('Dados do erro:', error.response.data);
                console.error('Headers do erro:', error.response.headers);
                
                // Exibir mensagem específica baseada no tipo de erro
                if (error.response.status === 400 && error.response.data) {
                    const errorData = error.response.data;
                    if (typeof errorData === 'object') {
                        // Se há campos específicos com erro
                        const errorMessages = [];
                        for (const [field, messages] of Object.entries(errorData)) {
                            if (Array.isArray(messages)) {
                                errorMessages.push(`${field}: ${messages.join(', ')}`);
                            } else {
                                errorMessages.push(`${field}: ${messages}`);
                            }
                        }
                        showNotification(`Erro de validação: ${errorMessages.join(' | ')}`, 'error');
                    } else {
                        showNotification(`Erro: ${errorData}`, 'error');
                    }
                } else {
                    showNotification(error.response?.data?.error || 'Erro ao ajustar estoque', 'error');
                }
            } else if (error.request) {
                console.error('Erro de rede - sem resposta do servidor:', error.request);
                showNotification('Erro de conexão com o servidor', 'error');
            } else {
                console.error('Erro na configuração da requisição:', error.message);
                showNotification('Erro interno', 'error');
            }
        } finally {
            setAjustandoEstoque(false);
        }
    };

    const deletarProduto = async (produto) => {
        if (!window.confirm(`Tem certeza que deseja deletar o produto "${produto.nome}"?`)) {
            return;
        }

        try {
            const response = await axios.delete(`/estoque/produtos/${produto.id}/`, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            if (response.status === 204) {
                showNotification('Produto deletado com sucesso!');
                await loadProdutos();
                await loadAlertas();
            } else {
                showNotification(response.data.error || 'Erro ao deletar produto', 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar produto:', error);
            showNotification(error.response?.data?.error || 'Erro ao deletar produto', 'error');
        }
    };

    const openEditProduto = (produto) => {
        setSelectedProduto({ ...produto });
        setShowEditProduto(true);
    };

    const openAjusteEstoque = (produto) => {
        setSelectedProduto(produto);
        setShowAjusteEstoque(true);
    };

    const openHistorico = (produto = null) => {
        setSelectedProduto(produto);
        setShowHistorico(true);
        loadMovimentacoes(produto?.id);
    };

    const getStatusEstoque = (produto) => {
        const atual = produto.estoque_atual || 0;
        const minimo = produto.estoque_minimo || 0;
        
        
        if (atual <= 0) {
            return { status: 'Sem Estoque', variant: 'destructive', icon: AlertTriangle };
        } else if (atual <= minimo) {
            return { status: 'Estoque Baixo', variant: 'secondary', icon: AlertCircle };
        } else if (atual <= minimo * 2) {
            return { status: 'Estoque Médio', variant: 'outline', icon: Package };
        } else {
            return { status: 'Estoque Normal', variant: 'default', icon: Check };
        }
    };


    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getFornecedorBadge = (fornecedor) => {
        const fornecedorMap = {
            'Dropi': { variant: 'default', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
            'PrimeCod': { variant: 'default', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
            'Ecomhub': { variant: 'default', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
            'N1 Itália': { variant: 'default', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
            'N1 Romênia': { variant: 'default', className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
            'N1 Polônia': { variant: 'default', className: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300' },
            // Backward compatibility
            'N1': { variant: 'default', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' }
        };
        return fornecedorMap[fornecedor] || { variant: 'outline', className: '' };
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
            {/* Notification */}
            {notification && (
                <Alert 
                    variant={
                        notification.type === 'error' ? 'destructive' : 
                        notification.type === 'warning' ? 'default' : 
                        'default'
                    } 
                    className={`mb-4 ${
                        notification.type === 'success' ? 'border-green-200 bg-green-50 dark:bg-green-950/20' :
                        notification.type === 'warning' ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20' :
                        notification.type === 'info' ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20' :
                        ''
                    }`}
                >
                    {notification.type === 'success' && <Check className="h-4 w-4 text-green-600" />}
                    {notification.type === 'warning' && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                    {notification.type === 'error' && <X className="h-4 w-4 text-red-600" />}
                    {notification.type === 'info' && <AlertCircle className="h-4 w-4 text-blue-600" />}
                    <AlertDescription className={
                        notification.type === 'success' ? 'text-green-700 dark:text-green-300' :
                        notification.type === 'warning' ? 'text-orange-700 dark:text-orange-300' :
                        notification.type === 'info' ? 'text-blue-700 dark:text-blue-300' :
                        ''
                    }>
                        {notification.message}
                    </AlertDescription>
                </Alert>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Package className="h-6 w-6 text-primary" />
                        Controle de Estoque
                    </h1>
                    <p className="text-muted-foreground">
                        Gestão completa do estoque de produtos
                        {hasExceededMaxAttempts && (
                            <span className="text-orange-600 dark:text-orange-400 ml-2">
                                • Funcionando sem atualizações automáticas
                            </span>
                        )}
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={lojaSelecionada?.toString()} onValueChange={(value) => setLojaSelecionada(parseInt(value))}>
                        <SelectTrigger className="w-full sm:w-48 bg-background border-input text-foreground">
                            <Building className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Selecionar loja" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                            {lojas.map(loja => (
                                <SelectItem key={loja.id} value={loja.id.toString()} className="text-foreground hover:bg-accent">
                                    {loja.nome_loja}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Dialog open={showAddProduto} onOpenChange={setShowAddProduto}>
                        <DialogTrigger asChild>
                            <Button variant="default">
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Produto
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-background border-border max-w-[95vw] sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">Adicionar Novo Produto</DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                    Cadastre um novo produto no estoque
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="sku" className="text-foreground">SKU *</Label>
                                        <Input
                                            id="sku"
                                            placeholder="Ex: PROD-001"
                                            value={novoProduto.sku}
                                            onChange={(e) => setNovoProduto(prev => ({ ...prev, sku: e.target.value }))}
                                            className="bg-background border-input text-foreground"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="nome" className="text-foreground">Nome do Produto *</Label>
                                        <Input
                                            id="nome"
                                            placeholder="Ex: Camiseta Branca"
                                            value={novoProduto.nome}
                                            onChange={(e) => setNovoProduto(prev => ({ ...prev, nome: e.target.value }))}
                                            className="bg-background border-input text-foreground"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <Label htmlFor="fornecedor" className="text-foreground">Fornecedor *</Label>
                                    <Select value={novoProduto.fornecedor} onValueChange={(value) => setNovoProduto(prev => ({ ...prev, fornecedor: value }))}>
                                        <SelectTrigger className="bg-background border-input text-foreground">
                                            <SelectValue placeholder="Selecione o fornecedor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Dropi">Dropi</SelectItem>
                                            <SelectItem value="PrimeCod">PrimeCod</SelectItem>
                                            <SelectItem value="Ecomhub">Ecomhub</SelectItem>
                                            <SelectItem value="N1 Itália">N1 Itália</SelectItem>
                                            <SelectItem value="N1 Romênia">N1 Romênia</SelectItem>
                                            <SelectItem value="N1 Polônia">N1 Polônia</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="estoque_inicial" className="text-foreground">Estoque Inicial</Label>
                                        <Input
                                            id="estoque_inicial"
                                            type="number"
                                            min="0"
                                            value={novoProduto.estoque_inicial}
                                            onChange={(e) => setNovoProduto(prev => ({ ...prev, estoque_inicial: e.target.value }))}
                                            className="bg-background border-input text-foreground"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="estoque_minimo" className="text-foreground">Estoque Mínimo</Label>
                                        <Input
                                            id="estoque_minimo"
                                            type="number"
                                            min="0"
                                            value={novoProduto.estoque_minimo}
                                            onChange={(e) => setNovoProduto(prev => ({ ...prev, estoque_minimo: e.target.value }))}
                                            className="bg-background border-input text-foreground"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-2 pt-4">
                                    <Button variant="outline" onClick={() => setShowAddProduto(false)}>
                                        Cancelar
                                    </Button>
                                    <Button onClick={salvarProduto} disabled={savingProduto}>
                                        {savingProduto ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                        Salvar Produto
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    
                    
                    <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Info className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] bg-background border-border">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">Instruções - Controle de Estoque</DialogTitle>
                                <DialogDescription className="text-muted-foreground">Como utilizar o sistema de controle de estoque</DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[70vh] pr-4">
                                <div className="space-y-6">
                                    <Card className="bg-card border-border">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-foreground">Funcionalidades Principais</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">1. Cadastro de Produtos</h4>
                                                <p className="text-sm text-muted-foreground">Adicione produtos com SKU, nome, estoque inicial e mínimo</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">2. Ajustes de Estoque</h4>
                                                <p className="text-sm text-muted-foreground">Adicione ou remova quantidades com motivos de movimentação</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">3. Alertas</h4>
                                                <p className="text-sm text-muted-foreground">Receba alertas quando produtos atingem estoque mínimo</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">4. Histórico Completo</h4>
                                                <p className="text-sm text-muted-foreground">Visualize todas as movimentações de estoque por produto</p>
                                            </div>
                                            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-400">5. Atualizações Manuais</h4>
                                                <p className="text-sm text-blue-600 dark:text-blue-300">Use o botão "Atualizar" para buscar os dados mais recentes do servidor</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card className="bg-card border-border">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-foreground">Configuração de Webhooks Shopify</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-400">⚡ Sincronização em Tempo Real</h4>
                                                <p className="text-sm text-blue-600 dark:text-blue-300">Configure webhooks para atualizar o estoque automaticamente quando houver pedidos na Shopify</p>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <h4 className="font-semibold text-sm text-foreground">Passo 1: No Shopify Admin</h4>
                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    <p>1. Vá em <strong>Settings → Notifications → Webhooks</strong></p>
                                                    <p>2. Configure <strong>DOIS webhooks</strong>:</p>
                                                    
                                                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded">
                                                        <h5 className="font-medium text-green-700 dark:text-green-400">Webhook 1: Criação de Pedido</h5>
                                                        <ul className="ml-4 list-disc space-y-1 text-green-600 dark:text-green-300">
                                                            <li><strong>Event:</strong> Order creation</li>
                                                            <li><strong>Format:</strong> JSON</li>
                                                            <li><strong>URL:</strong> <code className="bg-green-100 dark:bg-green-900/30 px-1 rounded">https://chegou-hubb-production.up.railway.app/estoque/webhook/shopify/</code></li>
                                                        </ul>
                                                    </div>

                                                    <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded">
                                                        <h5 className="font-medium text-orange-700 dark:text-orange-400">Webhook 2: Cancelamento de Pedido</h5>
                                                        <ul className="ml-4 list-disc space-y-1 text-orange-600 dark:text-orange-300">
                                                            <li><strong>Event:</strong> Order cancelled</li>
                                                            <li><strong>Format:</strong> JSON</li>
                                                            <li><strong>URL:</strong> <code className="bg-orange-100 dark:bg-orange-900/30 px-1 rounded">https://chegou-hubb-production.up.railway.app/estoque/webhook/shopify/</code></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="font-semibold text-sm text-foreground">Passo 2: SKUs Idênticos</h4>
                                                <p className="text-sm text-muted-foreground">Os produtos aqui devem ter exatamente o mesmo SKU dos produtos na Shopify</p>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="font-semibold text-sm text-foreground">Benefícios dos Webhooks</h4>
                                                <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-4">
                                                    <li>Redução automática de estoque quando pedidos são criados</li>
                                                    <li>Restauração automática de estoque quando pedidos são cancelados</li>
                                                    <li>Notificações em tempo real na interface</li>
                                                    <li>Alertas automáticos de estoque baixo</li>
                                                    <li>Sincronização sem necessidade de refresh manual</li>
                                                    <li>Controle preciso do estoque em tempo real</li>
                                                </ul>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card className="bg-card border-border">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-foreground">Status de Estoque</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="destructive">Sem Estoque</Badge>
                                                <span className="text-sm text-muted-foreground">Quantidade igual a 0</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="secondary">Estoque Baixo</Badge>
                                                <span className="text-sm text-muted-foreground">Quantidade menor ou igual ao mínimo</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline">Estoque Médio</Badge>
                                                <span className="text-sm text-muted-foreground">Quantidade até 2x o mínimo</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="default">Estoque Normal</Badge>
                                                <span className="text-sm text-muted-foreground">Quantidade acima de 2x o mínimo</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    
                </div>
            </div>

            {/* Notificações em Tempo Real */}
            <RealtimeNotifications 
                lastMessage={lastMessage}
                onStockUpdate={handleStockUpdate}
                onProductUpdate={handleProductUpdate}
            />


            {/* Alertas de Estoque Baixo */}
            {alertas && alertas.length > 0 && (
                <Collapsible open={showAlertas} onOpenChange={setShowAlertas}>
                    <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                        <CollapsibleTrigger className="w-full">
                            <CardHeader className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                        <CardTitle className="text-red-700 dark:text-red-300">
                                            Alertas de Estoque ({alertas.length})
                                        </CardTitle>
                                    </div>
                                    {showAlertas ? <ChevronUp className="h-4 w-4 text-red-600" /> : <ChevronDown className="h-4 w-4 text-red-600" />}
                                </div>
                                <CardDescription className="text-red-600 dark:text-red-400 text-left">
                                    Produtos com estoque baixo ou zerado
                                </CardDescription>
                            </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent className="pt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {alertas.map((alerta, index) => {
                                        // Normalizar dados do alerta para compatibilidade com getStatusEstoque
                                        const alertaNormalizado = {
                                            ...alerta,
                                            estoque_atual: alerta.estoque_atual_produto || 0,
                                            estoque_minimo: alerta.produto?.estoque_minimo || 0,
                                            nome: alerta.produto_nome || 'Produto sem nome',
                                            sku: alerta.produto_sku || 'N/A'
                                        };
                                        
                                        const statusInfo = getStatusEstoque(alertaNormalizado);
                                        
                                        
                                        return (
                                            <div key={`alerta-${alerta.id || index}`} 
                                                 className="p-3 bg-white dark:bg-red-950/10 rounded border border-red-200 dark:border-red-800">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-sm text-foreground">
                                                        {alertaNormalizado.nome}
                                                    </span>
                                                    <Badge variant={statusInfo.variant} className="text-xs">
                                                        {statusInfo.status}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground space-y-1">
                                                    <p>SKU: {alertaNormalizado.sku}</p>
                                                    <p>Atual: {alertaNormalizado.estoque_atual} | Mínimo: {alertaNormalizado.estoque_minimo}</p>
                                                </div>
                                                <div className="flex gap-1 mt-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => openAjusteEstoque(alertaNormalizado)}
                                                        className="text-xs h-6"
                                                    >
                                                        <TrendingUp className="h-3 w-3 mr-1" />
                                                        Ajustar
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>
            )}

            {/* Área Principal - Produtos */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-foreground">Produtos em Estoque</CardTitle>
                            <CardDescription className="text-muted-foreground">
                                {produtosFiltrados.length > 0 
                                    ? `${produtosFiltrados.length} produtos${searchTerm ? ' (filtrados)' : ''}`
                                    : 'Nenhum produto encontrado'
                                }
                            </CardDescription>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por SKU, nome ou fornecedor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-64 h-8 bg-background border-input text-foreground"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadProdutos}
                                disabled={searchingProdutos}
                            >
                                {searchingProdutos ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Atualizar
                            </Button>
                            
                            {/* Botão de reconexão manual quando WebSocket falha */}
                            {hasExceededMaxAttempts && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={retryConnection}
                                    className="bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
                                >
                                    <Zap className="h-4 w-4 mr-2" />
                                    Reconectar
                                </Button>
                            )}
                            
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent>
                    {!lojaSelecionada && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-foreground">Selecione uma loja no header para visualizar produtos</AlertDescription>
                        </Alert>
                    )}

                    {searchingProdutos && (
                        <div className="flex items-center justify-center py-8 space-y-3">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span className="text-muted-foreground">Carregando produtos...</span>
                            </div>
                        </div>
                    )}

                    {produtosFiltrados.length === 0 && !searchingProdutos ? (
                        <div className="text-center py-12">
                            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Nenhum produto encontrado</p>
                            <p className="text-sm text-muted-foreground">
                                {searchTerm ? 'Tente ajustar os filtros de busca' : 'Adicione produtos para começar'}
                            </p>
                        </div>
                    ) : produtosFiltrados.length > 0 ? (
                        <div className="w-full max-w-[calc(100vw-280px)] overflow-x-auto">
                            <div className="rounded-md border border-border" style={{ minWidth: '900px' }}>
                                <Table className="w-full">
                                    <TableHeader>
                                        <TableRow className="border-border">
                                            <TableHead className="text-foreground">Produto</TableHead>
                                            <TableHead className="text-foreground text-center">Fornecedor</TableHead>
                                            <TableHead className="text-foreground text-center">Estoque</TableHead>
                                            <TableHead className="text-foreground text-center">Status</TableHead>
                                            <TableHead className="text-right text-foreground">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {produtosFiltrados.map((produto, index) => {
                                            const statusInfo = getStatusEstoque(produto);
                                            const StatusIcon = statusInfo.icon;
                                            const highlight = isHighlighted(produto.id) ? getHighlight(produto.id) : null;
                                            
                                            return (
                                                <HighlightedTableRow 
                                                    key={produto.id || index} 
                                                    className="border-border hover:bg-muted/50"
                                                    highlight={highlight}
                                                >
                                                    <TableCell>
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                                                statusInfo.variant === 'destructive' ? 'bg-red-100 dark:bg-red-900/30' :
                                                                statusInfo.variant === 'secondary' ? 'bg-amber-100 dark:bg-amber-900/30' :
                                                                'bg-primary/10'
                                                            }`}>
                                                                <StatusIcon className={`h-4 w-4 ${
                                                                    statusInfo.variant === 'destructive' ? 'text-red-600 dark:text-red-400' :
                                                                    statusInfo.variant === 'secondary' ? 'text-amber-600 dark:text-amber-400' :
                                                                    'text-primary'
                                                                }`} />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm text-foreground">{produto.nome}</p>
                                                                <p className="text-xs text-muted-foreground font-mono">SKU: {produto.sku}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge 
                                                            variant={getFornecedorBadge(produto.fornecedor).variant}
                                                            className={`text-xs ${getFornecedorBadge(produto.fornecedor).className}`}
                                                        >
                                                            {produto.fornecedor || 'N/A'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="space-y-1">
                                                            <Badge variant="outline" className="font-mono">
                                                                {produto.estoque_atual || 0}
                                                            </Badge>
                                                            <p className="text-xs text-muted-foreground">
                                                                Min: {produto.estoque_minimo || 0}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Badge variant={statusInfo.variant} className="text-xs">
                                                                {statusInfo.status}
                                                            </Badge>
                                                            <ProductHighlightBadge 
                                                                productId={produto.id} 
                                                                highlight={highlight} 
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openHistorico(produto)}
                                                                className="text-xs"
                                                                title="Ver histórico de movimentações"
                                                            >
                                                                <History className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openEditProduto(produto)}
                                                                className="text-xs"
                                                            >
                                                                <Edit className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openAjusteEstoque(produto)}
                                                                className="text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                                                                title="Ajustar estoque"
                                                            >
                                                                <Sliders className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => deletarProduto(produto)}
                                                                className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </HighlightedTableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {/* Modal de Edição de Produto */}
            <Dialog open={showEditProduto} onOpenChange={setShowEditProduto}>
                <DialogContent className="bg-background border-border max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Editar Produto</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Altere as informações do produto
                        </DialogDescription>
                    </DialogHeader>
                    {selectedProduto && (
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="edit-sku" className="text-foreground">SKU</Label>
                                    <Input
                                        id="edit-sku"
                                        value={selectedProduto.sku}
                                        onChange={(e) => setSelectedProduto(prev => ({ ...prev, sku: e.target.value }))}
                                        className="bg-background border-input text-foreground"
                                        disabled
                                    />
                                    <p className="text-xs text-muted-foreground">SKU não pode ser alterado</p>
                                </div>
                                <div>
                                    <Label htmlFor="edit-nome" className="text-foreground">Nome do Produto</Label>
                                    <Input
                                        id="edit-nome"
                                        value={selectedProduto.nome}
                                        onChange={(e) => setSelectedProduto(prev => ({ ...prev, nome: e.target.value }))}
                                        className="bg-background border-input text-foreground"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <Label htmlFor="edit-fornecedor" className="text-foreground">Fornecedor</Label>
                                <Select value={selectedProduto.fornecedor} onValueChange={(value) => setSelectedProduto(prev => ({ ...prev, fornecedor: value }))}>
                                    <SelectTrigger className="bg-background border-input text-foreground">
                                        <SelectValue placeholder="Selecione o fornecedor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Dropi">Dropi</SelectItem>
                                        <SelectItem value="PrimeCod">PrimeCod</SelectItem>
                                        <SelectItem value="Ecomhub">Ecomhub</SelectItem>
                                        <SelectItem value="N1 Itália">N1 Itália</SelectItem>
                                        <SelectItem value="N1 Romênia">N1 Romênia</SelectItem>
                                        <SelectItem value="N1 Polônia">N1 Polônia</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div>
                                <Label htmlFor="edit-estoque-minimo" className="text-foreground">Estoque Mínimo</Label>
                                <Input
                                    id="edit-estoque-minimo"
                                    type="number"
                                    min="0"
                                    value={selectedProduto.estoque_minimo}
                                    onChange={(e) => setSelectedProduto(prev => ({ ...prev, estoque_minimo: e.target.value }))}
                                    className="bg-background border-input text-foreground"
                                />
                            </div>
                            
                            <Alert className="bg-muted/30 border-border">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-foreground text-sm">
                                    <strong>Estoque atual:</strong> {selectedProduto.estoque_atual || 0} unidades
                                    <br />
                                    Para alterar o estoque, use a função "Ajustar Estoque"
                                </AlertDescription>
                            </Alert>

                            <div className="flex justify-end space-x-2 pt-4">
                                <Button variant="outline" onClick={() => setShowEditProduto(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={editarProduto} disabled={savingProduto}>
                                    {savingProduto ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                    Salvar Alterações
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Ajuste de Estoque */}
            <Dialog open={showAjusteEstoque} onOpenChange={setShowAjusteEstoque}>
                <DialogContent className="bg-background border-border max-w-[95vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Ajustar Estoque</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            {selectedProduto && `${selectedProduto.nome} (SKU: ${selectedProduto.sku})`}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedProduto && (
                        <div className="space-y-4">
                            <Alert className="bg-muted/30 border-border">
                                <PackageOpen className="h-4 w-4" />
                                <AlertDescription className="text-foreground">
                                    <strong>Estoque atual:</strong> {selectedProduto.estoque_atual || 0} unidades
                                </AlertDescription>
                            </Alert>
                            
                            <div>
                                <Label className="text-foreground">Tipo de Movimentação</Label>
                                <Select value={ajusteEstoque.tipo} onValueChange={(value) => setAjusteEstoque(prev => ({ ...prev, tipo: value }))}>
                                    <SelectTrigger className="bg-background border-input text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="adicionar">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                                Adicionar ao Estoque
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="remover">
                                            <div className="flex items-center gap-2">
                                                <TrendingDown className="h-4 w-4 text-red-600" />
                                                Remover do Estoque
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div>
                                <Label htmlFor="quantidade" className="text-foreground">Quantidade *</Label>
                                <Input
                                    id="quantidade"
                                    type="number"
                                    min="1"
                                    value={ajusteEstoque.quantidade}
                                    onChange={(e) => setAjusteEstoque(prev => ({ ...prev, quantidade: e.target.value }))}
                                    className="bg-background border-input text-foreground"
                                />
                            </div>
                            
                            <div>
                                <Label htmlFor="motivo" className="text-foreground">Motivo *</Label>
                                <Select value={ajusteEstoque.motivo} onValueChange={(value) => setAjusteEstoque(prev => ({ ...prev, motivo: value }))}>
                                    <SelectTrigger className="bg-background border-input text-foreground">
                                        <SelectValue placeholder="Selecione o motivo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ajusteEstoque.tipo === 'adicionar' ? (
                                            <>
                                                <SelectItem value="Compra">Compra</SelectItem>
                                                <SelectItem value="Devolução">Devolução de Cliente</SelectItem>
                                                <SelectItem value="Ajuste de Inventário">Ajuste de Inventário</SelectItem>
                                                <SelectItem value="Outro">Outro</SelectItem>
                                            </>
                                        ) : (
                                            <>
                                                <SelectItem value="Venda">Venda</SelectItem>
                                                <SelectItem value="Ajuste de Inventário">Ajuste de Inventário</SelectItem>
                                                <SelectItem value="Outro">Outro</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div>
                                <Label htmlFor="observacoes" className="text-foreground">Observações</Label>
                                <Textarea
                                    id="observacoes"
                                    placeholder="Observações adicionais (opcional)"
                                    value={ajusteEstoque.observacoes}
                                    onChange={(e) => setAjusteEstoque(prev => ({ ...prev, observacoes: e.target.value }))}
                                    className="bg-background border-input text-foreground"
                                    rows={2}
                                />
                            </div>
                            
                            {ajusteEstoque.quantidade > 0 && ajusteEstoque.tipo && (
                                <Alert className={`${ajusteEstoque.tipo === 'adicionar' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
                                    <AlertDescription className="text-foreground">
                                        <strong>Resultado:</strong> {selectedProduto.estoque_atual || 0} {ajusteEstoque.tipo === 'adicionar' ? '+' : '-'} {ajusteEstoque.quantidade} = {
                                            ajusteEstoque.tipo === 'adicionar' 
                                                ? (selectedProduto.estoque_atual || 0) + parseInt(ajusteEstoque.quantidade || 0)
                                                : (selectedProduto.estoque_atual || 0) - parseInt(ajusteEstoque.quantidade || 0)
                                        } unidades
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="flex justify-end space-x-2 pt-4">
                                <Button variant="outline" onClick={() => setShowAjusteEstoque(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={ajustarEstoque} disabled={ajustandoEstoque}>
                                    {ajustandoEstoque ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 
                                     ajusteEstoque.tipo === 'adicionar' ? <TrendingUp className="h-4 w-4 mr-2" /> : <TrendingDown className="h-4 w-4 mr-2" />}
                                    {ajusteEstoque.tipo === 'adicionar' ? 'Adicionar' : 'Remover'} Estoque
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Histórico de Movimentações */}
            <Dialog open={showHistorico} onOpenChange={setShowHistorico}>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] bg-background border-border">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center space-x-2 text-foreground">
                                <History className="h-5 w-5" />
                                <span>Histórico de Movimentações</span>
                                {selectedProduto && <Badge variant="outline">{selectedProduto.nome}</Badge>}
                            </DialogTitle>
                            <Button variant="outline" size="sm" onClick={() => loadMovimentacoes(selectedProduto?.id)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Atualizar
                            </Button>
                        </div>
                    </DialogHeader>
                    <div>
                        {loadingMovimentacoes ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-foreground" />
                                <span className="ml-2 text-muted-foreground">Carregando movimentações...</span>
                            </div>
                        ) : movimentacoes.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">Nenhuma movimentação encontrada</p>
                        ) : (
                            <ScrollArea className="h-96">
                                <div className="space-y-3">
                                    {movimentacoes.map((mov) => (
                                        <div key={mov.id} className="p-3 border border-border rounded-lg bg-card">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    {/* Determinar tipo de movimentação baseado no contexto real */}
                                                    {(() => {
                                                        // Lógica melhorada para determinar o tipo de movimentação
                                                        const isIncreaseMovement = mov.tipo_movimento === 'entrada' || 
                                                                                   mov.tipo === 'adicionar' || 
                                                                                   mov.motivo?.includes('Devolução') ||
                                                                                   mov.motivo?.includes('Cancelamento') ||
                                                                                   (mov.estoque_posterior > mov.estoque_anterior);
                                                        
                                                        return isIncreaseMovement ? 
                                                            <TrendingUp className="h-4 w-4 text-green-600" /> : 
                                                            <TrendingDown className="h-4 w-4 text-red-600" />;
                                                    })()}
                                                    <span className="font-medium text-sm text-foreground">{mov.motivo}</span>
                                                    <Badge variant={(() => {
                                                        const isIncreaseMovement = mov.tipo_movimento === 'entrada' || 
                                                                                   mov.tipo === 'adicionar' || 
                                                                                   mov.motivo?.includes('Devolução') ||
                                                                                   mov.motivo?.includes('Cancelamento') ||
                                                                                   (mov.estoque_posterior > mov.estoque_anterior);
                                                        return isIncreaseMovement ? 'default' : 'secondary';
                                                    })()}>
                                                        {(() => {
                                                            const isIncreaseMovement = mov.tipo_movimento === 'entrada' || 
                                                                                       mov.tipo === 'adicionar' || 
                                                                                       mov.motivo?.includes('Devolução') ||
                                                                                       mov.motivo?.includes('Cancelamento') ||
                                                                                       (mov.estoque_posterior > mov.estoque_anterior);
                                                            return isIncreaseMovement ? '+' : '-';
                                                        })()}{mov.quantidade}
                                                    </Badge>
                                                    {mov.produto_nome && (
                                                        <span className="text-sm text-muted-foreground">• {mov.produto_nome}</span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDate(mov.data_movimentacao)}
                                                </span>
                                            </div>
                                            
                                            <div className="flex space-x-4 text-xs text-muted-foreground">
                                                {mov.estoque_anterior !== undefined && (
                                                    <span>Anterior: {mov.estoque_anterior}</span>
                                                )}
                                                {mov.estoque_posterior !== undefined && (
                                                    <span>Posterior: {mov.estoque_posterior}</span>
                                                )}
                                                {mov.observacoes && (
                                                    <span>Obs: {mov.observacoes}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Toaster para notificações em tempo real */}
            <Toaster />
        </div>
    );
}

export default ControleEstoquePage;