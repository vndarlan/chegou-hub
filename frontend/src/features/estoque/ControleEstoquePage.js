// frontend/src/features/estoque/ControleEstoquePage.js
import React, { useState, useEffect, useCallback } from 'react';
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
// Tabs components removed as they are not used
import { Textarea } from '../../components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { Toaster } from '../../components/ui/toaster';
import { Checkbox } from '../../components/ui/checkbox';
import {
    Package, AlertCircle, Check, X, RefreshCw, Trash2, 
    Info, History, Plus, Building, TrendingUp, TrendingDown,
    Edit, Search, Target, Loader2, PackageOpen,
    AlertTriangle, ChevronDown, ChevronUp, Zap, Sliders,
    Layers, Archive, ShoppingCart
} from 'lucide-react';
import { getCSRFToken } from '../../utils/csrf';

// WebSocket e componentes de tempo real
import useWebSocket from '../../hooks/useWebSocket';
import RealtimeNotifications from './components/RealtimeNotifications';
import { 
    useProductHighlight, 
    ProductHighlightBadge, 
    HighlightedTableRow
} from './components/ProductHighlight';

function ControleEstoquePage() {
    // Estados principais
    const [lojas, setLojas] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [produtosFiltrados, setProdutosFiltrados] = useState([]);
    const [searchingProdutos, setSearchingProdutos] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados modais/formulários
    const [showEditProduto, setShowEditProduto] = useState(false);
    const [showAjusteEstoque, setShowAjusteEstoque] = useState(false);
    const [showHistorico, setShowHistorico] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [selectedProduto, setSelectedProduto] = useState(null);
    const [editingSkus, setEditingSkus] = useState([]);
    const [loadingSkus, setLoadingSkus] = useState(false);
    
    // Estados para produtos compartilhados
    const [showAddProdutoCompartilhado, setShowAddProdutoCompartilhado] = useState(false);
    
    // Estados para filtros
    const [filtroLoja, setFiltroLoja] = useState('');
    
    // Formulário para produto compartilhado
    const [novoProdutoCompartilhado, setNovoProdutoCompartilhado] = useState({
        nome: '',
        descricao: '',
        fornecedor: 'N1 Itália',
        skus: [{ sku: '', descricao_variacao: '' }],
        lojas_selecionadas: [],
        estoque_compartilhado: 0,
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
    const [savingProdutoCompartilhado, setSavingProdutoCompartilhado] = useState(false);
    const [editingProduto, setEditingProduto] = useState(false);
    const [ajustandoEstoque, setAjustandoEstoque] = useState(false);
    const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);
    
    // WebSocket e tempo real - habilitado para receber notificações de cancelamento
    // Construir URL do WebSocket baseada na loja selecionada
    const websocketUrl = null; // WebSocket desabilitado no modo unificado
    
    const {
        connectionStatus,
        lastMessage,
        reconnectAttempts,
        maxReconnectAttempts,
        hasExceededMaxAttempts,
        sendMessage,
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

    // Definir funções com useCallback antes dos useEffect
    const loadLojas = useCallback(async () => {
        try {
            const response = await axios.get('/processamento/lojas/');
            setLojas(response.data.lojas || []);
        } catch (error) {
            console.error('Erro ao carregar lojas:', error);
            showNotification('Erro ao carregar lojas', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadProdutos = useCallback(async () => {
        setSearchingProdutos(true);
        try {
            // Usar nova API unificada - carrega TODOS os produtos
            const response = await axios.get('/estoque/produtos-unificados/');

            if (response.data && response.data.results) {
                setProdutos(response.data.results);
                showNotification(`${response.data.results.length || 0} produtos carregados`);
            } else {
                setProdutos([]);
                showNotification('Nenhum produto encontrado');
            }
            
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            showNotification('Erro ao carregar produtos', 'error');
            setProdutos([]);
        } finally {
            setSearchingProdutos(false);
        }
    }, []);

    const loadAlertas = useCallback(async () => {
        try {
            // Usar o novo endpoint que verifica alertas em tempo real - modo unificado
            const response = await axios.get('/estoque/alertas/verificar_alertas_tempo_real/', {
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            });
            
            if (response.data && response.data.alertas && Array.isArray(response.data.alertas)) {
                const alertasAtivos = response.data.alertas;
                const alertasCriados = response.data.alertas_criados_agora || [];
                
                // DEBUG: Log para investigar os alertas retornados
                console.log('🔍 DEBUG Alertas - Total recebidos:', alertasAtivos.length);
                console.log('🆕 Alertas criados agora:', alertasCriados.length);
                
                if (alertasCriados.length > 0) {
                    console.log('🆕 Novos alertas criados:', alertasCriados);
                    showNotification(
                        `${alertasCriados.length} novo(s) alerta(s) de estoque detectado(s)!`, 
                        'warning'
                    );
                }
                
                alertasAtivos.forEach((alerta, index) => {
                    console.log(`🔍 Alerta ${index + 1}:`, {
                        sku: alerta.produto_sku,
                        tipo: alerta.tipo_alerta,
                        estoque_atual: alerta.estoque_atual_produto,
                        estoque_minimo: alerta.estoque_minimo_produto,
                        status: alerta.status
                    });
                });
                
                console.log('✅ Alertas ativos finais:', alertasAtivos.length);
                setAlertas(alertasAtivos);
            } else {
                console.error('Erro ao carregar alertas:', response.data?.erro || 'Resposta inválida');
                setAlertas([]);
            }
        } catch (error) {
            console.error('Erro ao carregar alertas:', error);

            // Tratamento específico para erros de autenticação
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.error('⚠️ Erro de autenticação ao carregar alertas');
                showNotification('Erro de autenticação. Faça login novamente.', 'error');
                setAlertas([]);
                return;
            }

            // Fallback para o endpoint antigo caso o novo falhe
            console.log('⚠️ Tentando fallback para endpoint antigo de alertas...');
            try {
                const fallbackResponse = await axios.get('/estoque/alertas/', {
                    headers: {
                        'X-CSRFToken': getCSRFToken(),
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                });

                if (fallbackResponse.data && Array.isArray(fallbackResponse.data)) {
                    const alertasAtivos = fallbackResponse.data.filter(alerta => alerta.status === 'ativo');
                    console.log('✅ Fallback - Alertas carregados:', alertasAtivos.length);
                    setAlertas(alertasAtivos);
                } else {
                    setAlertas([]);
                }
            } catch (fallbackError) {
                console.error('Erro no fallback dos alertas:', fallbackError);

                // Tratamento específico para erro de autenticação no fallback
                if (fallbackError.response?.status === 401 || fallbackError.response?.status === 403) {
                    showNotification('Erro de autenticação. Faça login novamente.', 'error');
                } else {
                    showNotification('Erro ao carregar alertas de estoque', 'error');
                }
                setAlertas([]);
            }
        }
    }, []);

    useEffect(() => {
        loadLojas();
    }, [loadLojas]);

    useEffect(() => {
        loadProdutos();
        loadAlertas();
        // Limpar destaques no carregamento inicial
        clearAllHighlights();
    }, [clearAllHighlights, loadProdutos, loadAlertas]);
    
    // Sistema habilitado para receber atualizações em tempo real via WebSocket
    
    // WebSocket desabilitado no modo unificado
    // useEffect(() => {
    //     // WebSocket identification disabled for unified mode
    // }, []);
    
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
        // Filtrar produtos baseado no termo de busca e filtro de loja
        let filtered = produtos;
        
        // Filtro por texto
        if (searchTerm.trim()) {
            filtered = filtered.filter(produto =>
                produto.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                produto.todos_skus?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                produto.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                produto.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Filtro por loja conectada
        if (filtroLoja) {
            filtered = filtered.filter(produto => 
                produto.lojas_conectadas?.some(loja => 
                    loja.nome_loja?.toLowerCase().includes(filtroLoja.toLowerCase())
                )
            );
        }
        
        setProdutosFiltrados(filtered);
    }, [produtos, searchTerm, filtroLoja]);
    
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

    const loadMovimentacoes = async (produtoId = null) => {
        setLoadingMovimentacoes(true);
        try {
            const params = {};
            if (produtoId) params.produto_id = produtoId;

            // Determinar tipo do produto se temos um produto selecionado
            let endpoint = '/estoque/movimentacoes/';
            if (selectedProduto && selectedProduto.tipo_produto === 'compartilhado') {
                endpoint = '/estoque/movimentacoes-compartilhadas/';
            }

            console.log(`Carregando movimentações usando endpoint: ${endpoint}`);

            const response = await axios.get(endpoint, { params });

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

// debugConexao function removed as it was not being used

    // Funções para gerenciar SKUs no produto compartilhado
    const adicionarSKU = () => {
        setNovoProdutoCompartilhado(prev => ({
            ...prev,
            skus: [...prev.skus, { sku: '', descricao_variacao: '' }]
        }));
    };
    
    const removerSKU = (index) => {
        setNovoProdutoCompartilhado(prev => ({
            ...prev,
            skus: prev.skus.filter((_, i) => i !== index)
        }));
    };
    
    const atualizarSKU = (index, campo, valor) => {
        setNovoProdutoCompartilhado(prev => ({
            ...prev,
            skus: prev.skus.map((sku, i) => 
                i === index ? { ...sku, [campo]: valor } : sku
            )
        }));
    };
    
    const toggleLoja = (lojaId) => {
        setNovoProdutoCompartilhado(prev => ({
            ...prev,
            lojas_selecionadas: prev.lojas_selecionadas.includes(lojaId)
                ? prev.lojas_selecionadas.filter(id => id !== lojaId)
                : [...prev.lojas_selecionadas, lojaId]
        }));
    };
    
    const salvarProdutoCompartilhado = async () => {
        console.log('🚀 INICIANDO CRIAÇÃO DE PRODUTO COMPARTILHADO');
        console.log('📊 DEBUG INFO:');
        console.log('- BaseURL atual:', axios.defaults.baseURL);
        console.log('- CSRF Token:', getCSRFToken()?.substring(0, 10) + '...');
        console.log('- Cookies:', document.cookie.split(';').map(c => c.trim().split('=')[0]));
        console.log('- URL completa será:', axios.defaults.baseURL + '/estoque/produtos-compartilhados/');

        if (!novoProdutoCompartilhado.nome.trim()) {
            console.log('❌ ERRO: Nome do produto vazio');
            showNotification('Nome do produto é obrigatório', 'error');
            return;
        }
        
        if (novoProdutoCompartilhado.skus.length === 0) {
            showNotification('Adicione pelo menos um SKU', 'error');
            return;
        }
        
        // Validar SKUs
        const skusValidos = novoProdutoCompartilhado.skus.filter(sku => sku.sku.trim());
        const skusVazios = novoProdutoCompartilhado.skus.filter(sku => !sku.sku.trim());
        
        console.log('=== DEBUG VALIDAÇÃO SKUs ===');
        console.log('SKUs totais:', novoProdutoCompartilhado.skus.length);
        console.log('SKUs válidos:', skusValidos.length);
        console.log('SKUs vazios:', skusVazios.length);
        console.log('SKUs:', novoProdutoCompartilhado.skus);
        
        if (skusVazios.length > 0) {
            showNotification(`${skusVazios.length} SKU(s) estão vazios. Preencha todos os SKUs ou remova os campos vazios.`, 'error');
            return;
        }
        
        if (skusValidos.length === 0) {
            showNotification('Adicione pelo menos um SKU válido', 'error');
            return;
        }
        
        if (novoProdutoCompartilhado.lojas_selecionadas.length === 0) {
            showNotification('Selecione pelo menos uma loja', 'error');
            return;
        }

        // Validar se as lojas selecionadas existem na lista de lojas disponíveis
        const lojasDisponiveis = lojas.map(loja => loja.id);
        const lojasInvalidas = novoProdutoCompartilhado.lojas_selecionadas.filter(
            lojaId => !lojasDisponiveis.includes(lojaId)
        );

        console.log('=== DEBUG VALIDAÇÃO LOJAS ===');
        console.log('Lojas disponíveis:', lojasDisponiveis);
        console.log('Lojas selecionadas:', novoProdutoCompartilhado.lojas_selecionadas);
        console.log('Lojas inválidas:', lojasInvalidas);

        if (lojasInvalidas.length > 0) {
            showNotification(`Lojas selecionadas inválidas (IDs: ${lojasInvalidas.join(', ')}). Por favor, atualize a página.`, 'error');
            return;
        }

        // Usar apenas as lojas selecionadas no formulário
        const lojasParaAssociar = [...new Set(novoProdutoCompartilhado.lojas_selecionadas)];
        console.log('Lojas que serão associadas:', lojasParaAssociar);
        
        setSavingProdutoCompartilhado(true);
        try {
            const dados = {
                nome: novoProdutoCompartilhado.nome,
                descricao: novoProdutoCompartilhado.descricao || '',
                fornecedor: novoProdutoCompartilhado.fornecedor,
                estoque_compartilhado: parseInt(novoProdutoCompartilhado.estoque_compartilhado) || 0,
                estoque_minimo: parseInt(novoProdutoCompartilhado.estoque_minimo) || 5,
                skus_data: skusValidos.map(sku => ({
                    sku: sku.sku.trim(),
                    descricao_variacao: sku.descricao_variacao || ''
                })),
                lojas_ids: lojasParaAssociar
            };
            
            console.log('=== DEBUG CRIAÇÃO PRODUTO COMPARTILHADO ===');
            console.log('📤 Dados sendo enviados:', JSON.stringify(dados, null, 2));
            console.log('📍 URL de destino:', axios.defaults.baseURL + '/estoque/produtos-compartilhados/');
            console.log('🔒 Headers:', {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json'
            });

            console.log('⏱️ Fazendo requisição POST...');
            const startTime = Date.now();

            const response = await axios.post('/estoque/produtos-compartilhados/', dados, {
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                }
            });

            const endTime = Date.now();
            console.log(`✅ Resposta recebida em ${endTime - startTime}ms`);
            console.log('📥 Status:', response.status);
            console.log('📥 Headers da resposta:', response.headers);
            console.log('📥 Dados da resposta:', JSON.stringify(response.data, null, 2));
            
            // Sucesso baseado no status HTTP (200/201) OU presença de dados
            if (response.status === 200 || response.status === 201 || (response.data && (response.data.id || response.data.success))) {
                showNotification('Produto compartilhado criado com sucesso!');

                // Reset do formulário
                setNovoProdutoCompartilhado({
                    nome: '',
                    descricao: '',
                    fornecedor: 'N1 Itália',
                    skus: [{ sku: '', descricao_variacao: '' }],
                    lojas_selecionadas: [],
                    estoque_compartilhado: 0,
                    estoque_minimo: 5
                });

                setShowAddProdutoCompartilhado(false);
                console.log('🔄 Atualizando listagem de produtos...');
                await loadProdutos();
                await loadAlertas();
                console.log('✅ Listagem atualizada!');
            } else {
                console.log('❌ Condição de sucesso não atendida:', {
                    status: response.status,
                    data: response.data
                });
                showNotification(response.data?.error || 'Erro ao criar produto compartilhado', 'error');
            }
        } catch (error) {
            console.error('❌ ERRO AO CRIAR PRODUTO COMPARTILHADO:');
            console.error('🔍 Tipo do erro:', error.name);
            console.error('📄 Mensagem:', error.message);
            console.error('🌐 URL tentada:', error.config?.url);
            console.error('📡 Método:', error.config?.method);
            console.error('📤 Dados enviados:', error.config?.data);
            console.error('🔒 Headers enviados:', error.config?.headers);

            if (error.response) {
                console.error('📥 Status da resposta:', error.response.status);
                console.error('📥 Headers da resposta:', error.response.headers);
                console.error('📥 Dados da resposta:', error.response.data);
            } else if (error.request) {
                console.error('🚫 Sem resposta do servidor:', error.request);
            } else {
                console.error('⚙️ Erro de configuração:', error.message);
            }

            let mensagemErro = 'Erro ao criar produto compartilhado';
            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    mensagemErro = error.response.data;
                } else if (error.response.data.error) {
                    mensagemErro = error.response.data.error;
                } else if (error.response.data.detail) {
                    mensagemErro = error.response.data.detail;
                } else if (error.response.data.lojas_ids) {
                    // Erro específico de validação de lojas
                    if (Array.isArray(error.response.data.lojas_ids)) {
                        mensagemErro = `Erro nas lojas selecionadas: ${error.response.data.lojas_ids.join(', ')}`;
                    } else {
                        mensagemErro = `Erro nas lojas selecionadas: ${error.response.data.lojas_ids}`;
                    }
                } else if (error.response.data.non_field_errors) {
                    // Erros gerais do serializer
                    mensagemErro = Array.isArray(error.response.data.non_field_errors)
                        ? error.response.data.non_field_errors.join(', ')
                        : error.response.data.non_field_errors;
                } else {
                    // Tentar extrair qualquer mensagem de erro dos campos
                    const errorMessages = [];
                    for (const [field, messages] of Object.entries(error.response.data)) {
                        if (Array.isArray(messages)) {
                            errorMessages.push(`${field}: ${messages.join(', ')}`);
                        } else {
                            errorMessages.push(`${field}: ${messages}`);
                        }
                    }
                    if (errorMessages.length > 0) {
                        mensagemErro = errorMessages.join(' | ');
                    }
                }
                console.error('💬 Mensagem de erro final:', mensagemErro);
            }

            showNotification(mensagemErro, 'error');
        } finally {
            setSavingProdutoCompartilhado(false);
        }
    };


    // Função para carregar todos os SKUs de um produto
    const loadProdutoSKUs = async (produtoId) => {
        setLoadingSkus(true);
        try {
            const response = await axios.get(`/estoque/produtos-compartilhados/${produtoId}/`);
            if (response.data && response.data.skus) {
                setEditingSkus(response.data.skus.map(sku => ({
                    id: sku.id,
                    sku: sku.sku,
                    descricao_variacao: sku.descricao_variacao || ''
                })));
            }
        } catch (error) {
            console.error('Erro ao carregar SKUs:', error);
            showNotification('Erro ao carregar SKUs do produto', 'error');
        } finally {
            setLoadingSkus(false);
        }
    };

    // Funções para gerenciar SKUs na edição
    const adicionarSkuEdicao = () => {
        setEditingSkus(prev => [...prev, { sku: '', descricao_variacao: '' }]);
    };

    const removerSkuEdicao = (index) => {
        setEditingSkus(prev => prev.filter((_, i) => i !== index));
    };

    const atualizarSkuEdicao = (index, campo, valor) => {
        setEditingSkus(prev => prev.map((sku, i) =>
            i === index ? { ...sku, [campo]: valor } : sku
        ));
    };

    const editarProduto = async () => {
        if (!selectedProduto?.id) return;

        setEditingProduto(true);
        try {
            // Usar endpoint correto baseado no tipo do produto
            const isCompartilhado = selectedProduto.tipo_produto === 'compartilhado';
            
            let dados, endpoint;
            
            if (isCompartilhado) {
                // Validar SKUs para produtos compartilhados
                const skusValidos = editingSkus.filter(sku => sku.sku.trim());
                const skusVazios = editingSkus.filter(sku => !sku.sku.trim());

                if (skusVazios.length > 0) {
                    showNotification(`${skusVazios.length} SKU(s) estão vazios. Preencha todos os SKUs ou remova os campos vazios.`, 'error');
                    return;
                }

                if (skusValidos.length === 0) {
                    showNotification('Adicione pelo menos um SKU válido', 'error');
                    return;
                }

                // Para produtos compartilhados
                dados = {
                    nome: selectedProduto.nome,
                    fornecedor: selectedProduto.fornecedor,
                    estoque_minimo: parseInt(selectedProduto.estoque_minimo) || 5,
                    lojas_ids: selectedProduto.lojas_conectadas?.map(l => l.id) || [],
                    skus_data: skusValidos.map(sku => ({
                        id: sku.id || null,
                        sku: sku.sku.trim(),
                        descricao_variacao: sku.descricao_variacao || ''
                    }))
                };
                endpoint = `/estoque/produtos-compartilhados/${selectedProduto.id}/`;
            } else {
                // Para produtos individuais - validar SKU único
                if (editingSkus.length > 0 && !editingSkus[0].sku.trim()) {
                    showNotification('SKU é obrigatório', 'error');
                    return;
                }

                dados = {
                    sku: editingSkus[0]?.sku?.trim() || selectedProduto.sku,
                    nome: selectedProduto.nome,
                    fornecedor: selectedProduto.fornecedor,
                    estoque_minimo: parseInt(selectedProduto.estoque_minimo) || 5,
                    loja_config: selectedProduto.loja_config
                };
                endpoint = `/estoque/produtos/${selectedProduto.id}/`;
            }

            const response = await axios.put(endpoint, dados, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            if (response.data && response.data.id) {
                // Feedback específico baseado no tipo de produto
                let mensagem = 'Produto atualizado com sucesso!';
                if (isCompartilhado) {
                    const totalSkus = editingSkus.filter(sku => sku.sku.trim()).length;
                    mensagem += ` ${totalSkus} SKU${totalSkus !== 1 ? 's' : ''} salvo${totalSkus !== 1 ? 's' : ''}.`;
                }

                showNotification(mensagem);
                setShowEditProduto(false);
                setSelectedProduto(null);
                setEditingSkus([]);
                await loadProdutos();
                await loadAlertas();
            } else {
                showNotification(response.data.error || 'Erro ao atualizar produto', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            showNotification(error.response?.data?.error || 'Erro ao atualizar produto', 'error');
        } finally {
            setEditingProduto(false);
        }
    };

    const ajustarEstoque = async () => {
        // Validações robustas antes de enviar
        if (!selectedProduto?.id) {
            showNotification('Produto não selecionado ou inválido', 'error');
            return;
        }

        // Modo unificado não requer seleção de loja

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

            // Usar endpoint correto baseado no tipo de produto
            const endpoint = selectedProduto.tipo_produto === 'compartilhado'
                ? '/estoque/movimentacoes-compartilhadas/'
                : '/estoque/movimentacoes/';

            console.log(`Usando endpoint: ${endpoint} para produto tipo: ${selectedProduto.tipo_produto}`);

            const response = await axios.post(endpoint, dados, {
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                }
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
            // Usar endpoint correto baseado no tipo do produto
            const isCompartilhado = produto.tipo_produto === 'compartilhado';
            const endpoint = isCompartilhado 
                ? `/estoque/produtos-compartilhados/${produto.id}/`
                : `/estoque/produtos/${produto.id}/`;

            const response = await axios.delete(endpoint, {
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

    const openEditProduto = async (produto) => {
        setSelectedProduto({ ...produto });

        // Carregar SKUs completos se for produto compartilhado
        if (produto.tipo_produto === 'compartilhado') {
            await loadProdutoSKUs(produto.id);
        } else {
            // Para produtos individuais, usar SKU único
            setEditingSkus([{
                sku: produto.sku,
                descricao_variacao: produto.descricao_variacao || ''
            }]);
        }

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
        
        // Suporte para estoque negativo
        if (atual < 0) {
            const pedidosPendentes = Math.abs(atual);
            return { 
                status: `${pedidosPendentes} Pedidos Pendentes`, 
                variant: 'destructive', 
                icon: AlertTriangle,
                className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 animate-pulse'
            };
        } else if (atual === 0) {
            return { 
                status: 'Sem Estoque', 
                variant: 'destructive', 
                icon: AlertTriangle,
                className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
            };
        } else if (atual <= minimo) {
            return { 
                status: 'Estoque Baixo', 
                variant: 'secondary', 
                icon: AlertCircle,
                className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
            };
        } else if (atual <= minimo * 2) {
            return { 
                status: 'Estoque Médio', 
                variant: 'outline', 
                icon: Package,
                className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
            };
        } else {
            return { 
                status: 'Estoque Normal', 
                variant: 'default', 
                icon: Check,
                className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
            };
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
                    
                    <Button 
                        variant="default"
                        onClick={() => setShowAddProdutoCompartilhado(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Produto
                    </Button>
                    
                    {/* Modal de Produto Compartilhado */}
                    <Dialog open={showAddProdutoCompartilhado} onOpenChange={setShowAddProdutoCompartilhado}>
                        <DialogContent className="bg-background border-border max-w-[95vw] sm:max-w-2xl max-h-[95vh]">
                            <DialogHeader>
                                <DialogTitle className="text-foreground flex items-center gap-2">
                                    <Layers className="h-5 w-5 text-purple-600" />
                                    Novo Produto Compartilhado
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                    Crie um produto com múltiplos SKUs e estoque compartilhado entre lojas
                                </DialogDescription>
                            </DialogHeader>
                            
                            <ScrollArea className="max-h-[70vh] pr-4">
                                <div className="space-y-6">
                                    {/* Informações Básicas */}
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-foreground flex items-center gap-2">
                                            <Archive className="h-4 w-4" />
                                            Informações Básicas
                                        </h4>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="nome-compartilhado" className="text-foreground">Nome do Produto *</Label>
                                                <Input
                                                    id="nome-compartilhado"
                                                    placeholder="Ex: Relógio Smartwatch"
                                                    value={novoProdutoCompartilhado.nome}
                                                    onChange={(e) => setNovoProdutoCompartilhado(prev => ({ ...prev, nome: e.target.value }))}
                                                    className="bg-background border-input text-foreground"
                                                />
                                            </div>
                                            
                                            <div>
                                                <Label htmlFor="fornecedor-compartilhado" className="text-foreground">Fornecedor *</Label>
                                                <Select 
                                                    value={novoProdutoCompartilhado.fornecedor} 
                                                    onValueChange={(value) => setNovoProdutoCompartilhado(prev => ({ ...prev, fornecedor: value }))}
                                                >
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
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="descricao-compartilhado" className="text-foreground">Descrição</Label>
                                            <Textarea
                                                id="descricao-compartilhado"
                                                placeholder="Descrição detalhada do produto..."
                                                value={novoProdutoCompartilhado.descricao}
                                                onChange={(e) => setNovoProdutoCompartilhado(prev => ({ ...prev, descricao: e.target.value }))}
                                                className="bg-background border-input text-foreground"
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                    
                                    <Separator />
                                    
                                    {/* SKUs */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-medium text-foreground flex items-center gap-2">
                                                <Package className="h-4 w-4" />
                                                SKUs e Variações
                                            </h4>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm"
                                                onClick={adicionarSKU}
                                                className="text-xs"
                                            >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Adicionar SKU
                                            </Button>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {novoProdutoCompartilhado.skus.map((sku, index) => (
                                                <div key={index} className="flex gap-2 items-end p-3 border border-border rounded-lg bg-muted/20">
                                                    <div className="flex-1">
                                                        <Label htmlFor={`sku-${index}`} className="text-foreground text-xs">SKU * (obrigatório)</Label>
                                                        <Input
                                                            id={`sku-${index}`}
                                                            placeholder="Ex: SKU-REL-001"
                                                            value={sku.sku}
                                                            onChange={(e) => atualizarSKU(index, 'sku', e.target.value)}
                                                            className={`bg-background border-input text-foreground h-8 text-sm ${!sku.sku.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                                                            required
                                                        />
                                                        {!sku.sku.trim() && (
                                                            <p className="text-xs text-red-500 mt-1">SKU é obrigatório</p>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <Label htmlFor={`variacao-${index}`} className="text-foreground text-xs">Variação</Label>
                                                        <Input
                                                            id={`variacao-${index}`}
                                                            placeholder="Preto, Branco, etc."
                                                            value={sku.descricao_variacao}
                                                            onChange={(e) => atualizarSKU(index, 'descricao_variacao', e.target.value)}
                                                            className="bg-background border-input text-foreground h-8 text-sm"
                                                        />
                                                    </div>
                                                    {novoProdutoCompartilhado.skus.length > 1 && (
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => removerSKU(index)}
                                                            className="text-red-600 hover:bg-red-50 border-red-200 h-8 w-8 p-0"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <Separator />
                                    
                                    {/* Seleção de Lojas */}
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-foreground flex items-center gap-2">
                                            <Building className="h-4 w-4" />
                                            Lojas ({novoProdutoCompartilhado.lojas_selecionadas.length} selecionadas)
                                        </h4>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {lojas.map(loja => (
                                                <div key={loja.id} className="flex items-center space-x-2 p-2 border border-border rounded hover:bg-muted/50">
                                                    <Checkbox
                                                        id={`loja-${loja.id}`}
                                                        checked={novoProdutoCompartilhado.lojas_selecionadas.includes(loja.id)}
                                                        onCheckedChange={() => toggleLoja(loja.id)}
                                                    />
                                                    <Label 
                                                        htmlFor={`loja-${loja.id}`} 
                                                        className="text-sm text-foreground cursor-pointer flex-1"
                                                    >
                                                        {loja.nome_loja}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {novoProdutoCompartilhado.lojas_selecionadas.length === 0 && (
                                            <Alert className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                                <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                                                    Selecione pelo menos uma loja para o produto
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </div>
                                    
                                    <Separator />
                                    
                                    {/* Estoque Compartilhado */}
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-foreground flex items-center gap-2">
                                            <ShoppingCart className="h-4 w-4" />
                                            Estoque Compartilhado
                                        </h4>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="estoque-compartilhado" className="text-foreground">Quantidade Inicial</Label>
                                                <Input
                                                    id="estoque-compartilhado"
                                                    type="number"
                                                    min="0"
                                                    value={novoProdutoCompartilhado.estoque_compartilhado}
                                                    onChange={(e) => setNovoProdutoCompartilhado(prev => ({ ...prev, estoque_compartilhado: e.target.value }))}
                                                    className="bg-background border-input text-foreground"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="estoque-minimo-novo" className="text-foreground">Estoque Mínimo</Label>
                                                <Input
                                                    id="estoque-minimo-novo"
                                                    type="number"
                                                    min="0"
                                                    value={novoProdutoCompartilhado.estoque_minimo}
                                                    onChange={(e) => setNovoProdutoCompartilhado(prev => ({ ...prev, estoque_minimo: e.target.value }))}
                                                    className="bg-background border-input text-foreground"
                                                />
                                            </div>
                                        </div>
                                        
                                        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                                            <Package className="h-4 w-4 text-blue-600" />
                                            <AlertDescription className="text-blue-700 dark:text-blue-300">
                                                <strong>Estoque Compartilhado:</strong> O estoque será único e compartilhado entre todas as lojas selecionadas. Vendas em qualquer loja diminuirão o estoque total.
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                </div>
                            </ScrollArea>
                            
                            <div className="flex justify-end space-x-2 pt-4 border-t">
                                <Button variant="outline" onClick={() => setShowAddProdutoCompartilhado(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={salvarProdutoCompartilhado} disabled={savingProdutoCompartilhado}>
                                    {savingProdutoCompartilhado ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                    Criar Produto Compartilhado
                                </Button>
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
                                            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                <h4 className="font-semibold text-sm text-green-700 dark:text-green-400">✅ Sistema Unificado</h4>
                                                <p className="text-sm text-green-600 dark:text-green-300">Visualize todos os produtos (individuais e compartilhados) em uma única tabela</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">1. Criar Produtos</h4>
                                                <p className="text-sm text-muted-foreground">Cadastre produtos com múltiplos SKUs e conecte às lojas desejadas</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">2. Gerenciar Lojas</h4>
                                                <p className="text-sm text-muted-foreground">Conecte/desconecte produtos de diferentes lojas na edição</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">3. Ajustar Estoque</h4>
                                                <p className="text-sm text-muted-foreground">Modifique quantidades com motivos e observações detalhadas</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">4. Alertas Automáticos</h4>
                                                <p className="text-sm text-muted-foreground">Monitoramento inteligente do estoque mínimo</p>
                                            </div>
                                            <div className="p-3 bg-muted rounded-lg">
                                                <h4 className="font-semibold text-sm text-foreground">5. Filtros e Busca</h4>
                                                <p className="text-sm text-muted-foreground">Filtre por loja, nome, SKU e status de estoque</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card className="bg-card border-border">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-foreground flex items-center gap-2">
                                                <Layers className="h-4 w-4 text-purple-600" />
                                                Produtos Compartilhados
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                                                <h4 className="font-semibold text-sm text-purple-700 dark:text-purple-400">✨ Nova Funcionalidade</h4>
                                                <p className="text-sm text-purple-600 dark:text-purple-300">Crie produtos com estoque único compartilhado entre múltiplas lojas</p>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <h4 className="font-semibold text-sm text-foreground">Características:</h4>
                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    <p>• <strong>Múltiplos SKUs:</strong> Adicione quantos SKUs precisar para diferentes variações</p>
                                                    <p>• <strong>Seleção de Lojas:</strong> Escolha quais lojas terão acesso ao produto</p>
                                                    <p>• <strong>Estoque Único:</strong> Estoque compartilhado entre todas as lojas selecionadas</p>
                                                    <p>• <strong>Sincronização Automática:</strong> Vendas em qualquer loja atualizam o estoque total</p>
                                                </div>
                                            </div>
                                            
                                            <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded">
                                                <h5 className="font-medium text-green-700 dark:text-green-400 text-sm">Exemplo de Uso:</h5>
                                                <div className="text-sm text-green-600 dark:text-green-300 space-y-1">
                                                    <p><strong>Produto:</strong> Relógio Smartwatch</p>
                                                    <p><strong>SKUs:</strong> REL-001 (Preto), REL-002 (Branco)</p>
                                                    <p><strong>Lojas:</strong> Loja A, Loja B</p>
                                                    <p><strong>Estoque:</strong> 100 unidades (compartilhadas)</p>
                                                </div>
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
                                                            <li><strong>URL:</strong> <code className="bg-green-100 dark:bg-green-900/30 px-1 rounded">https://chegou-hubb-production.up.railway.app/api/estoque/webhook/shopify/</code></li>
                                                        </ul>
                                                    </div>

                                                    <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded">
                                                        <h5 className="font-medium text-orange-700 dark:text-orange-400">Webhook 2: Cancelamento de Pedido</h5>
                                                        <ul className="ml-4 list-disc space-y-1 text-orange-600 dark:text-orange-300">
                                                            <li><strong>Event:</strong> Order cancelled</li>
                                                            <li><strong>Format:</strong> JSON</li>
                                                            <li><strong>URL:</strong> <code className="bg-orange-100 dark:bg-orange-900/30 px-1 rounded">https://chegou-hubb-production.up.railway.app/api/estoque/webhook/shopify/</code></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card className="bg-card border-border">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-foreground">Status de Estoque</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="destructive" className="animate-pulse">Pedidos Pendentes</Badge>
                                                <span className="text-sm text-muted-foreground">Quantidade negativa - pedidos aguardando reposição</span>
                                            </div>
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
                                            id: alerta.produto, // O ID do produto para ajustes
                                            estoque_atual: alerta.estoque_atual_produto || 0,
                                            estoque_minimo: alerta.estoque_minimo_produto || 
                                                           alerta.produto?.estoque_minimo || 
                                                           alerta.estoque_minimo || 0,
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
                            <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filtrar por loja..."
                                    value={filtroLoja}
                                    onChange={(e) => setFiltroLoja(e.target.value)}
                                    className="w-48 h-8 bg-background border-input text-foreground"
                                />
                                {filtroLoja && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setFiltroLoja('')}
                                        className="h-8 px-2"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
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
                    {false && (
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
                            <div className="rounded-md border border-border" style={{ minWidth: '1200px' }}>
                                <Table className="w-full">
                                    <TableHeader>
                                        <TableRow className="border-border">
                                            <TableHead className="text-foreground">Produto</TableHead>
                                            <TableHead className="text-foreground text-center">Fornecedor</TableHead>
                                            <TableHead className="text-foreground text-center">Lojas Conectadas</TableHead>
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
                                                                <p className="text-xs text-muted-foreground font-mono">SKU: {produto.todos_skus || produto.sku}</p>
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
                                                        <div className="flex flex-wrap gap-1 justify-center max-w-[180px]">
                                                            {produto.lojas_conectadas && produto.lojas_conectadas.length > 0 ? (
                                                                produto.lojas_conectadas.map((loja, index) => (
                                                                    <Badge 
                                                                        key={index}
                                                                        variant="secondary" 
                                                                        className="text-xs px-2 py-1"
                                                                    >
                                                                        {loja.nome_loja}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">Nenhuma</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="space-y-1">
                                                            <Badge 
                                                                variant="outline" 
                                                                className={`font-mono ${produto.estoque_atual < 0 ? 'border-red-500 text-red-700 bg-red-50 dark:border-red-400 dark:text-red-300 dark:bg-red-950/20 animate-pulse' : ''}`}
                                                            >
                                                                {produto.estoque_atual || 0}
                                                                {produto.estoque_atual < 0 && (
                                                                    <span className="ml-1 text-xs">(pendentes)</span>
                                                                )}
                                                            </Badge>
                                                            <p className="text-xs text-muted-foreground">
                                                                Min: {produto.estoque_minimo || 0}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Badge 
                                                                variant={statusInfo.variant} 
                                                                className={`text-xs ${statusInfo.className || ''}`}
                                                            >
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
            <Dialog open={showEditProduto} onOpenChange={(open) => {
                setShowEditProduto(open);
                if (!open) {
                    // Limpar estados ao fechar modal
                    setSelectedProduto(null);
                    setEditingSkus([]);
                    setLoadingSkus(false);
                }
            }}>
                <DialogContent className="bg-background border-border max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Editar Produto</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Altere as informações do produto
                        </DialogDescription>
                    </DialogHeader>
                    {selectedProduto && (
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Seção de SKUs baseada no tipo do produto */}
                            {selectedProduto.tipo_produto === 'compartilhado' ? (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <Label className="text-foreground font-medium">SKUs do Produto</Label>
                                        <div className="flex items-center space-x-2">
                                            {loadingSkus && (
                                                <div className="flex items-center text-sm text-muted-foreground">
                                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                    Carregando...
                                                </div>
                                            )}
                                            <Badge variant="outline" className="text-xs">
                                                {editingSkus.length} SKU{editingSkus.length !== 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-3 max-h-40 overflow-y-auto">
                                        {editingSkus.map((sku, index) => (
                                            <div key={index} className="flex gap-2 items-end p-3 border border-border rounded-lg bg-muted/20">
                                                <div className="flex-1">
                                                    <Label htmlFor={`edit-sku-${index}`} className="text-foreground text-xs">SKU * (obrigatório)</Label>
                                                    <Input
                                                        id={`edit-sku-${index}`}
                                                        placeholder="Ex: ABC123"
                                                        value={sku.sku}
                                                        onChange={(e) => atualizarSkuEdicao(index, 'sku', e.target.value)}
                                                        className="bg-background border-input text-foreground h-8 text-sm"
                                                        required
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <Label htmlFor={`edit-variacao-${index}`} className="text-foreground text-xs">Variação</Label>
                                                    <Input
                                                        id={`edit-variacao-${index}`}
                                                        placeholder="Preto, Branco, etc."
                                                        value={sku.descricao_variacao}
                                                        onChange={(e) => atualizarSkuEdicao(index, 'descricao_variacao', e.target.value)}
                                                        className="bg-background border-input text-foreground h-8 text-sm"
                                                    />
                                                </div>
                                                {editingSkus.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => removerSkuEdicao(index)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={adicionarSkuEdicao}
                                        className="w-full mt-3"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Adicionar SKU
                                    </Button>
                                </div>
                            ) : (
                                // Para produtos individuais - SKU único
                                <div>
                                    <Label htmlFor="edit-sku-individual" className="text-foreground">SKU</Label>
                                    <Input
                                        id="edit-sku-individual"
                                        value={editingSkus[0]?.sku || selectedProduto.sku}
                                        onChange={(e) => atualizarSkuEdicao(0, 'sku', e.target.value)}
                                        className="bg-background border-input text-foreground"
                                        placeholder="Ex: ABC123"
                                    />
                                    <p className="text-xs text-muted-foreground">SKU pode ser editado conforme necessário</p>
                                </div>
                            )}

                            {/* Nome do Produto */}
                            <div>
                                <Label htmlFor="edit-nome" className="text-foreground">Nome do Produto</Label>
                                <Input
                                    id="edit-nome"
                                    value={selectedProduto.nome}
                                    onChange={(e) => setSelectedProduto(prev => ({ ...prev, nome: e.target.value }))}
                                    className="bg-background border-input text-foreground"
                                />
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
                            
                            {/* Edição de lojas para produtos compartilhados */}
                            {selectedProduto.tipo_produto === 'compartilhado' && (
                                <div>
                                    <Label className="text-foreground">Lojas Conectadas</Label>
                                    <div className="space-y-2 mt-2">
                                        {lojas.map(loja => (
                                            <div key={loja.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`edit-loja-${loja.id}`}
                                                    checked={selectedProduto.lojas_conectadas?.some(l => l.id === loja.id) || false}
                                                    onCheckedChange={(checked) => {
                                                        setSelectedProduto(prev => ({
                                                            ...prev,
                                                            lojas_conectadas: checked 
                                                                ? [...(prev.lojas_conectadas || []), loja]
                                                                : (prev.lojas_conectadas || []).filter(l => l.id !== loja.id)
                                                        }));
                                                    }}
                                                />
                                                <Label htmlFor={`edit-loja-${loja.id}`} className="text-sm">
                                                    {loja.nome_loja}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Resumo de alterações para produtos compartilhados */}
                            {selectedProduto.tipo_produto === 'compartilhado' && editingSkus.length > 0 && (
                                <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                                    <Info className="h-4 w-4" />
                                    <AlertDescription className="text-foreground text-sm">
                                        <strong>Resumo das alterações:</strong>
                                        <br />
                                        • Total de SKUs: <Badge variant="secondary" className="mx-1">{editingSkus.filter(s => s.sku.trim()).length}</Badge>
                                        <br />
                                        • SKUs válidos: {editingSkus.filter(s => s.sku.trim()).map(s => s.sku).join(', ') || 'Nenhum'}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Alert className="bg-muted/30 border-border">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-foreground text-sm">
                                    <strong>Estoque atual:</strong> {selectedProduto.estoque_atual || 0} unidades
                                    <br />
                                    Para alterar o estoque, use a função "Ajustar Estoque"
                                </AlertDescription>
                            </Alert>

                            <div className="flex justify-end space-x-2 pt-4">
                                <Button variant="outline" onClick={() => {
                                    setShowEditProduto(false);
                                    setSelectedProduto(null);
                                    setEditingSkus([]);
                                    setLoadingSkus(false);
                                }}>
                                    Cancelar
                                </Button>
                                <Button onClick={editarProduto} disabled={editingProduto}>
                                    {editingProduto ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
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
                                        {(() => {
                                            const resultado = ajusteEstoque.tipo === 'adicionar' 
                                                ? (selectedProduto.estoque_atual || 0) + parseInt(ajusteEstoque.quantidade || 0)
                                                : (selectedProduto.estoque_atual || 0) - parseInt(ajusteEstoque.quantidade || 0);
                                            
                                            if (resultado < 0) {
                                                return (
                                                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded border-l-4 border-red-500">
                                                        <strong className="text-red-700 dark:text-red-300">⚠️ Estoque Negativo:</strong>
                                                        <div className="text-red-600 dark:text-red-400 text-sm">
                                                            {Math.abs(resultado)} pedidos ficarão aguardando reposição
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
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