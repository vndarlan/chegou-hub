// frontend/src/pages/GerarImagemPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Text, Paper, Textarea, Button, LoadingOverlay, Alert, Image, Group, Stack,
    Select, NumberInput, FileInput, Tabs, Center, SimpleGrid,
    Slider, ActionIcon, Title, TextInput, Loader,
    ScrollArea
} from '@mantine/core';
import {
    IconAlertCircle, IconEdit, IconSparkles, IconDownload, IconPlus, IconTrash,
    IconPalette
} from '@tabler/icons-react';

// URL da API global para a página
const API_URL = 'https://chegou-hubb-production.up.railway.app/api';
console.log("API_URL configurada para:", API_URL);

// --- Funções Auxiliares (CSRF e Axios) ---
function getCSRFToken() {
    let csrftoken = null;
    if (document.cookie) {
        const cookies = document.cookie.split(';')
            .map(cookie => cookie.trim())
            .filter(cookie => cookie.startsWith('csrftoken='));
        if (cookies.length > 0) {
            csrftoken = cookies[0].split('=')[1];
        }
    }
    return csrftoken;
}

// Função melhorada para garantir o token CSRF
async function ensureCSRFTokenIsSet() {
    try {
        console.log('Verificando/Garantindo token CSRF...');
        
        const axiosInstance = axios.create({
            baseURL: API_URL,
            withCredentials: true
        });
        
        await axiosInstance.get('/ensure-csrf/');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const token = getCSRFToken();
        console.log(`Token CSRF ${token ? 'confirmado/obtido' : 'NÃO encontrado'} após ensure-csrf.`);
        
        return !!token;
    } catch (error) {
        console.error('Erro ao garantir token CSRF inicial:', error.response?.data || error.message);
        return false;
    }
}

// --- Componente Principal Refatorado ---
function GerarImagemPage() {
    // --- Estados Gerais ---
    const [isLoading, setIsLoading] = useState(false); // Loading para GERAÇÃO/EDIÇÃO (OpenAI)
    const [resultsLoading, setResultsLoading] = useState(false); // Loading overlay para área de resultados
    const [error, setError] = useState(null); // Erro GERAL ou de GERAÇÃO/EDIÇÃO
    const [activeTab, setActiveTab] = useState('generate'); // Aba principal: 'generate', 'edit'
    const [activeSubTab, setActiveSubTab] = useState('use'); // Sub-aba: 'use', 'manageStyles'

    // --- Estados de Geração ---
    const [prompt, setPrompt] = useState('');
    const [selectedSizeGen, setSelectedSizeGen] = useState('auto');
    const [selectedQualityGen, setSelectedQualityGen] = useState('auto');
    const [nImagesGen, setNImagesGen] = useState(1);
    const [selectedStyleId, setSelectedStyleId] = useState(null); // ID (string) do estilo para GERAÇÃO
    const [selectedBackground, setSelectedBackground] = useState('auto');
    const [selectedOutputFormat, setSelectedOutputFormat] = useState('png');
    const [selectedModeration, setSelectedModeration] = useState('auto');
    const [outputCompression, setOutputCompression] = useState(100);

    // --- Estados de Edição ---
    const [editPrompt, setEditPrompt] = useState('');
    const [baseImagesEdit, setBaseImagesEdit] = useState([]);
    const [maskImageEdit, setMaskImageEdit] = useState(null);
    const [selectedSizeEdit, setSelectedSizeEdit] = useState('auto');
    const [selectedQualityEdit, setSelectedQualityEdit] = useState('auto');
    const [nImagesEdit, setNImagesEdit] = useState(1);
    const [selectedStyleIdEdit, setSelectedStyleIdEdit] = useState(null); // ID (string) do estilo para EDIÇÃO

    // --- Estado do Resultado ---
    const [generatedImages, setGeneratedImages] = useState([]);

    // --- Estados de Gerenciamento de Estilos ---
    const [stylesList, setStylesList] = useState([]); // Lista de estilos vinda do backend
    const [stylesLoading, setStylesLoading] = useState(false); // Loading para buscar/modificar ESTILOS
    const [stylesError, setStylesError] = useState(null); // Erro específico dos ESTILOS
    const [newStyleName, setNewStyleName] = useState('');
    const [newStyleInstructions, setNewStyleInstructions] = useState('');
    const [showAddStyleForm, setShowAddStyleForm] = useState(false);

    // --- Funções de API para Estilos ---
    const fetchStyles = useCallback(async (showLoading = true) => {
        if (showLoading) setStylesLoading(true);
        setStylesError(null);
        
        const targetEndpoint = '/styles/';
        
        console.log("Buscando estilos - URL:", API_URL + targetEndpoint);
        
        try {
            // Criar uma instância personalizada do axios com as configurações corretas
            const axiosInstance = axios.create({
                baseURL: API_URL,
                withCredentials: true,
                headers: {
                    ...axios.defaults.headers.common,
                }
            });
            
            const response = await axiosInstance.get(targetEndpoint);
            console.log("Estilos recebidos:", response.data);
            const sortedStyles = response.data.sort((a, b) => a.name.localeCompare(b.name));
            setStylesList(sortedStyles || []);
        } catch (err) {
            console.error("Erro ao buscar estilos:", err.response?.data || err.message);
            let errorDetail = "Erro desconhecido";
            
            if (err.response?.data) {
                // Tentar extrair a mensagem HTML se for o caso (como no log)
                const match = typeof err.response.data === 'string' ? err.response.data.match(/<pre>(.*?)<\/pre>/) : null;
                errorDetail = match ? match[1] : (err.response.data.detail || JSON.stringify(err.response.data));
            } else if (err.message) {
                errorDetail = err.message;
            }
            
            setStylesError(`Falha ao carregar estilos: ${errorDetail}`);
            setStylesList([]);
        } finally {
            if (showLoading) setStylesLoading(false);
        }
    }, []); // Dependência vazia para evitar recriação

    // Corrigido useEffect para evitar loop infinito
    useEffect(() => {
        console.log("GerarImagemPage montado. Chamando fetchStyles...");
        
        // Evitando passar fetchStyles como dependência para prevenir loop infinito
        const loadStyles = async () => {
            try {
                // Primeiro garantir o token CSRF
                await ensureCSRFTokenIsSet(); 
                // Depois buscar os estilos
                fetchStyles();
            } catch (error) {
                console.error("Erro ao inicializar a página:", error);
                setStylesError("Erro de comunicação com o servidor.");
            }
        };
        
        loadStyles();
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAddStyle = async () => {
        if (!newStyleName.trim() || !newStyleInstructions.trim()) {
            setStylesError('Nome e instruções são obrigatórios.');
            return;
        }
        setStylesLoading(true);
        setStylesError(null);
        
        const payload = {
            name: newStyleName.trim(),
            instructions: newStyleInstructions.trim(),
        };
        
        const targetEndpoint = '/styles/';
        
        console.log("Adicionando novo estilo - URL:", API_URL + targetEndpoint, "Payload:", payload);
        
        try {
            // Criar uma instância personalizada do axios com as configurações corretas
            // Seguindo o padrão exato que funciona em AIProjectForm.js
            const axiosInstance = axios.create({
                baseURL: API_URL,
                withCredentials: true,
                // Copia os cabeçalhos padrão do axios global
                headers: {
                    ...axios.defaults.headers.common,
                }
            });
            
            // Buscar CSRF token fresco antes de enviar (PASSO CRUCIAL)
            await axiosInstance.get('/ensure-csrf/');
            
            // Agora faça a chamada POST com a configuração correta
            const response = await axiosInstance.post(targetEndpoint, 
                payload, 
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
            
            console.log("Estilo adicionado com sucesso:", response.data);
            setNewStyleName('');
            setNewStyleInstructions('');
            setShowAddStyleForm(false);
            // Usar o mesmo padrão para buscar os estilos sem mostrar loading
            await fetchStyles(false);
        } catch (err) {
            console.error("Erro ao adicionar estilo:", err.response?.data || err.message);
            let errorDetail = "Erro desconhecido";
            
            if (err.response?.data) {
                const fieldErrors = err.response.data;
                if (typeof fieldErrors === 'object' && fieldErrors !== null) {
                    if (fieldErrors.name) errorDetail = `Erro no nome: ${fieldErrors.name.join(', ')}`;
                    else if (fieldErrors.instructions) errorDetail = `Erro nas instruções: ${fieldErrors.instructions.join(', ')}`;
                    else if (fieldErrors.detail) errorDetail = fieldErrors.detail;
                    else errorDetail = JSON.stringify(fieldErrors);
                } else {
                    // Tentar extrair a mensagem HTML se for o caso
                    const match = typeof fieldErrors === 'string' ? fieldErrors.match(/<pre>(.*?)<\/pre>/) : null;
                    errorDetail = match ? match[1] : String(fieldErrors);
                }
            } else if (err.message) {
                errorDetail = err.message;
            }
            
            setStylesError(`Falha ao adicionar estilo: ${errorDetail}`);
        } finally {
            setStylesLoading(false);
        }
    };

    const handleDeleteStyle = async (styleId) => {
        const styleToDelete = stylesList.find(s => s.id === styleId);
        if (!window.confirm(`Tem certeza que deseja excluir o estilo "${styleToDelete?.name || styleId}"?`)) {
            return;
        }
        
        setStylesLoading(true);
        setStylesError(null);
        
        const targetEndpoint = `/styles/${styleId}/`;
        
        console.log("Deletando estilo - URL:", API_URL + targetEndpoint);
        
        try {
            // Criar uma instância personalizada do axios com as configurações corretas
            const axiosInstance = axios.create({
                baseURL: API_URL,
                withCredentials: true,
                headers: {
                    ...axios.defaults.headers.common,
                }
            });
            
            // Buscar CSRF token fresco antes de enviar (PASSO CRUCIAL)
            await axiosInstance.get('/ensure-csrf/');
            
            // Agora faça a chamada DELETE com a configuração correta
            await axiosInstance.delete(targetEndpoint);
            
            console.log("Estilo deletado com sucesso.");
            
            // Resetar os estados se o estilo excluído estava selecionado
            if (selectedStyleId === String(styleId)) setSelectedStyleId(null);
            if (selectedStyleIdEdit === String(styleId)) setSelectedStyleIdEdit(null);
            
            // Atualizar a lista sem mostrar loading
            await fetchStyles(false);
        } catch (err) {
            console.error("Erro ao deletar estilo:", err.response?.data || err.message);
            let errorDetail = "Erro desconhecido";
            
            if (err.response?.data) {
                const match = typeof err.response.data === 'string' ? err.response.data.match(/<pre>(.*?)<\/pre>/) : null;
                errorDetail = match ? match[1] : (err.response.data.detail || JSON.stringify(err.response.data));
            } else if (err.message) {
                errorDetail = err.message;
            }
            
            setStylesError(`Falha ao deletar estilo: ${errorDetail}`);
        } finally {
            setStylesLoading(false);
        }
    };

    // --- Funções de Geração e Edição (com API OpenAI via Backend) ---
    const handleGenerateImage = async () => {
        if (!prompt.trim()) {
            setError('Por favor, digite um prompt.');
            return;
        }
        const selectedStyle = stylesList.find(style => String(style.id) === selectedStyleId);
        let finalPrompt = prompt.trim();
        if (selectedStyle) {
            console.log(`Aplicando estilo (Geração): "${selectedStyle.name}"`);
            finalPrompt = `${selectedStyle.instructions}\n\n${prompt.trim()}`;
        } else {
            console.log("Gerando sem estilo adicional.");
        }

        const payload = {
            prompt: finalPrompt, size: selectedSizeGen, quality: selectedQualityGen,
            n: nImagesGen, background: selectedBackground, output_format: selectedOutputFormat,
            moderation: selectedModeration,
        };
        if (compressionEnabled) payload.output_compression = outputCompression;

        const targetEndpoint = '/operacional/generate-image/';
        await handleApiCall(targetEndpoint, payload, 'post');
    };

    const handleEditImage = async () => {
        if (!editPrompt.trim()) { setError('Prompt de edição é obrigatório.'); return; }
        if (baseImagesEdit.length === 0) { setError('Selecione ao menos uma imagem base.'); return; }

        const selectedStyle = stylesList.find(style => String(style.id) === selectedStyleIdEdit);
        let finalEditPrompt = editPrompt.trim();
        if (selectedStyle) {
            console.log(`Aplicando estilo (Edição): "${selectedStyle.name}"`);
            finalEditPrompt = `${selectedStyle.instructions}\n\n${editPrompt.trim()}`;
        } else {
            console.log("Editando sem estilo adicional.");
        }

        const formData = new FormData();
        formData.append('prompt', finalEditPrompt);
        formData.append('size', selectedSizeEdit);
        formData.append('quality', selectedQualityEdit);
        formData.append('n', nImagesEdit);
        baseImagesEdit.forEach((file) => formData.append('image', file, file.name));
        if (maskImageEdit) formData.append('mask', maskImageEdit, maskImageEdit.name);

        const targetEndpoint = '/operacional/edit-image/';
        await handleApiCall(targetEndpoint, formData, 'post', { headers: { 'Content-Type': 'multipart/form-data' } });
    };

    // --- Função Genérica para API Calls (Geração/Edição OpenAI) ---
    const handleApiCall = async (endpoint, payload, method = 'post', config = {}) => {
        setIsLoading(true);
        setResultsLoading(true);
        setError(null);
        setGeneratedImages([]);
    
        console.log(`Tentando ${method.toUpperCase()} para ${API_URL}${endpoint}...`);
        
        try {
            // 1. Primeiro, faremos logout e login para resetar a sessão completamente
            const sessionResetInstance = axios.create({
                baseURL: API_URL,
                withCredentials: true
            });
            
            // Chamar current-state para verificar a sessão atual
            const stateResp = await sessionResetInstance.get('/current-state/');
            console.log("Estado da sessão:", stateResp.data);
            
            // 2. Obter CSRF explicitamente
            const csrfResp = await sessionResetInstance.get('/ensure-csrf/');
            console.log("CSRF response status:", csrfResp.status);
            
            // 3. Esperar para garantir que o cookie foi definido
            await new Promise(r => setTimeout(r, 500));
            
            // 4. Obter o token CSRF usando a função mais robusta
            const getCsrfToken = () => {
                let csrfToken = null;
                // Método 1: Procurar diretamente no cookie
                const value = `; ${document.cookie}`;
                const parts = value.split(`; csrftoken=`);
                if (parts.length === 2) csrfToken = parts.pop().split(';').shift();
                
                console.log("CSRF Token encontrado nos cookies:", csrfToken);
                return csrfToken;
            };
            
            const csrfToken = getCsrfToken();
            
            if (!csrfToken) {
                throw new Error("CSRF Token não encontrado. Sessão pode estar inválida.");
            }
            
            // 5. Fazer a requisição principal com VÁRIAS opções de CSRF
            const response = await axios({
                method,
                url: `${API_URL}${endpoint}`,
                data: payload,
                withCredentials: true,
                // Incluir token em TODOS os lugares possíveis
                headers: {
                    ...axios.defaults.headers.common,
                    'X-CSRFToken': csrfToken,
                    'X-CSRF-Token': csrfToken,
                    'CSRF-Token': csrfToken,
                    'Content-Type': method.toLowerCase() === 'post' ? 'application/json' : undefined,
                    ...config.headers
                },
                // Importante: incluir o x-csrf nos parâmetros também
                params: {
                    // Incluir o token como parâmetro para caso o servidor esteja checando de outra forma
                    '_csrf': csrfToken,
                    ...config.params
                }
            });
            
            console.log(`Sucesso ${method.toUpperCase()} ${endpoint}:`, response.status);
            if (response.data?.images_b64?.length > 0) {
                setGeneratedImages(response.data.images_b64);
            }
        } catch (err) {
            console.error(`Erro ao chamar ${method.toUpperCase()} ${endpoint}:`, err);
            let errorMessage = 'Ocorreu um erro ao processar sua solicitação.';
            
            if (err.response) {
                const status = err.response.status;
                const data = err.response.data;
                console.error(`Status do erro (${method.toUpperCase()} ${endpoint}):`, status);
                console.error(`Dados do erro (${method.toUpperCase()} ${endpoint}):`, data);
                
                if (status === 403) {
                    errorMessage = `Erro de autenticação (403). Tente recarregar a página completamente (Ctrl+F5) e fazer login novamente.`;
                } else if (status === 401) {
                    errorMessage = `Sessão expirada (401). Por favor, faça login novamente.`;
                } else {
                    // Outros erros
                    errorMessage = `Erro do servidor (${status}): ${JSON.stringify(data)}`;
                }
            } else if (err.request) {
                errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
            } else {
                errorMessage = `Erro: ${err.message}`;
            }
            
            setError(errorMessage);
            setGeneratedImages([]);
        } finally {
            setIsLoading(false);
            setResultsLoading(false);
        }
    };

    // --- Outras Funções Auxiliares ---
    const handleDownloadImage = (base64Data, index) => {
        const link = document.createElement('a');
        let mimeType = 'image/png';
        const currentOutputFormat = activeTab === 'generate' ? selectedOutputFormat : 'png'; // Edição assume PNG
        if (currentOutputFormat === 'jpeg') mimeType = 'image/jpeg';
        else if (currentOutputFormat === 'webp') mimeType = 'image/webp';

        link.href = `data:${mimeType};base64,${base64Data}`;
        const filename = `chegouhub_${activeTab}_${index + 1}.${currentOutputFormat}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const compressionEnabled = selectedOutputFormat === 'jpeg' || selectedOutputFormat === 'webp';

    useEffect(() => {
        if (selectedBackground === 'transparent' && !['png', 'webp'].includes(selectedOutputFormat)) {
            setSelectedBackground('auto');
        }
    }, [selectedOutputFormat, selectedBackground]);

    // Limpar erro geral e resultados ao mudar aba PRINCIPAL
    useEffect(() => {
        setError(null);
        setGeneratedImages([]);
    }, [activeTab]);

    // Limpar erro de estilos ao mudar sub-aba
    useEffect(() => {
        setStylesError(null);
        setShowAddStyleForm(false); // Esconde form ao mudar de sub-aba
    }, [activeSubTab]);

    // --- Renderização ---
    return (
        <Box p="md" style={{ height: 'calc(100vh - var(--app-shell-header-height, 60px))', display: 'flex', flexDirection: 'column' }}>

            {/* 1. Abas Principais: Gerar e Editar */}
            <Tabs value={activeTab} onChange={setActiveTab} variant='pills' radius='md' mb="md">
                <Tabs.List grow>
                    <Tabs.Tab value="generate" leftSection={<IconSparkles size={16} />} disabled={isLoading}>Gerar Imagem</Tabs.Tab>
                    <Tabs.Tab value="edit" leftSection={<IconEdit size={16} />} disabled={isLoading}>Editar Imagem</Tabs.Tab>
                </Tabs.List>
            </Tabs>

            {/* 2. Container Principal Flexível (Colunas) */}
            <Box style={{ display: 'flex', flexGrow: 1, gap: 'var(--mantine-spacing-md)', overflow: 'hidden' }}>

                {/* 2.1 Coluna Esquerda: Controles + Gerenciamento de Estilos */}
                <Paper shadow="xs" p="lg" withBorder style={{ width: '400px', minWidth:'350px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Abas Secundárias */}
                    <Tabs value={activeSubTab} onChange={setActiveSubTab} variant='outline' radius='md' mb="lg">
                        <Tabs.List grow>
                            <Tabs.Tab value="use" disabled={isLoading}>Usar Ferramentas</Tabs.Tab>
                            <Tabs.Tab value="manageStyles" leftSection={<IconPalette size={16} />} disabled={isLoading || stylesLoading}>Gerenciar Estilos</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>

                    {/* Área de Rolagem para Conteúdo da Coluna Esquerda */}
                    <ScrollArea style={{ flexGrow: 1, overflowX: 'hidden' }} viewportProps={{ style: { paddingRight: '12px' } }}>
                        {/* Conteúdo da Aba "Usar Ferramentas" */}
                        {activeSubTab === 'use' && (
                            <Box>
                                {/* --- FORMULÁRIO GERAR --- */}
                                {activeTab === 'generate' && (
                                    <Stack gap="md">
                                        <Textarea label="Prompt Principal" placeholder="Ex: Um gato astronauta..." value={prompt} onChange={(e) => setPrompt(e.currentTarget.value)} minRows={3} autosize disabled={isLoading} required />
                                        <Select
                                            label="Aplicar Estilo (Opcional)"
                                            placeholder={stylesLoading ? "Carregando..." : (stylesList.length === 0 ? "Nenhum estilo" : "Selecione um estilo")}
                                            value={selectedStyleId} onChange={setSelectedStyleId} // Estado para Geração
                                            data={stylesList.map(style => ({ value: String(style.id), label: style.name }))} // IDs como String
                                            clearable searchable disabled={isLoading || stylesLoading || stylesList.length === 0}
                                            nothingFoundMessage={stylesLoading ? "Carregando..." : "Nenhum estilo encontrado"}
                                        />
                                        {/* Restante dos controles de Geração */}
                                        <Group grow>
                                            <Select label="Tamanho" value={selectedSizeGen} onChange={setSelectedSizeGen} data={['auto', '1024x1024', '1536x1024', '1024x1536']} disabled={isLoading} />
                                            <Select label="Qualidade" value={selectedQualityGen} onChange={setSelectedQualityGen} data={['auto', 'high', 'medium', 'low']} disabled={isLoading} />
                                        </Group>
                                        <Group grow>
                                            <Select label="Formato Saída" value={selectedOutputFormat} onChange={setSelectedOutputFormat} data={['png', 'webp', 'jpeg']} disabled={isLoading} />
                                            <Select label="Fundo" value={selectedBackground} onChange={setSelectedBackground} data={[{ value: 'auto', label: 'Auto' }, { value: 'transparent', label: 'Transparente', disabled: !['png', 'webp'].includes(selectedOutputFormat) }, { value: 'opaque', label: 'Opaco' }]} disabled={isLoading} />
                                        </Group>
                                        <Group grow>
                                            <NumberInput label="Nº Imagens" value={nImagesGen} onChange={setNImagesGen} min={1} max={10} step={1} disabled={isLoading} />
                                            <Select label="Moderação" value={selectedModeration} onChange={setSelectedModeration} data={['auto', 'low']} disabled={isLoading} />
                                        </Group>
                                        {compressionEnabled && (
                                            <Stack gap="xs">
                                                <Text size="sm" fw={500}>Compressão ({outputCompression}%)</Text>
                                                <Slider min={1} max={100} label={(v) => `${v}%`} value={outputCompression} onChange={setOutputCompression} disabled={isLoading} marks={[{ value: 25, label: '25%' }, { value: 50, label: '50%' }, { value: 75, label: '75%' }, { value: 100, label: '100%' }]} />
                                            </Stack>
                                        )}
                                        <Button onClick={handleGenerateImage} disabled={isLoading || !prompt.trim()} loading={isLoading} leftSection={<IconSparkles size={18} />} mt="md">Gerar</Button>
                                    </Stack>
                                )}
                                {/* --- FORMULÁRIO EDITAR --- */}
                                {activeTab === 'edit' && (
                                    <Stack gap="md">
                                        <FileInput label="Imagem(ns) Base" placeholder="Selecione (PNG, JPG, WebP)" value={baseImagesEdit} onChange={setBaseImagesEdit} multiple clearable accept="image/png,image/jpeg,image/webp" disabled={isLoading} description="Até 25MB cada" />
                                        <FileInput label="Máscara (Opcional - PNG)" placeholder="Selecione a máscara" value={maskImageEdit} onChange={setMaskImageEdit} clearable accept="image/png" disabled={isLoading} description="Áreas transparentes indicam onde editar" />
                                        <Textarea label="Prompt de Edição" placeholder="Descreva a edição..." value={editPrompt} onChange={(e) => setEditPrompt(e.currentTarget.value)} minRows={3} autosize disabled={isLoading} required />
                                        <Select
                                            label="Aplicar Estilo (Opcional)"
                                            placeholder={stylesLoading ? "Carregando..." : (stylesList.length === 0 ? "Nenhum estilo" : "Selecione um estilo")}
                                            value={selectedStyleIdEdit} onChange={setSelectedStyleIdEdit} // Estado para Edição
                                            data={stylesList.map(style => ({ value: String(style.id), label: style.name }))} // IDs como String
                                            clearable searchable disabled={isLoading || stylesLoading || stylesList.length === 0}
                                            nothingFoundMessage={stylesLoading ? "Carregando..." : "Nenhum estilo encontrado"}
                                        />
                                        {/* Restante dos controles de Edição */}
                                        <Group grow>
                                            <Select label="Tamanho" value={selectedSizeEdit} onChange={setSelectedSizeEdit} data={['auto', '1024x1024', '1536x1024', '1024x1536']} disabled={isLoading} />
                                            <Select label="Qualidade" value={selectedQualityEdit} onChange={setSelectedQualityEdit} data={['auto', 'high', 'medium', 'low']} disabled={isLoading} />
                                        </Group>
                                        <NumberInput label="Nº de Edições" value={nImagesEdit} onChange={setNImagesEdit} min={1} max={10} step={1} disabled={isLoading} />
                                        <Button onClick={handleEditImage} disabled={isLoading || !editPrompt.trim() || baseImagesEdit.length === 0} loading={isLoading} leftSection={<IconEdit size={18}/>} mt="md">Editar</Button>
                                    </Stack>
                                )}
                            </Box>
                        )}
                        {/* Conteúdo da Aba "Gerenciar Estilos" */}
                        {activeSubTab === 'manageStyles' && (
                            <Box>
                                <Group justify="space-between" mb="md">
                                    <Title order={5}>Meus Estilos</Title>
                                    <Button size="xs" variant='light' leftSection={<IconPlus size={14} />} onClick={() => setShowAddStyleForm(!showAddStyleForm)} disabled={stylesLoading}>
                                        {showAddStyleForm ? 'Cancelar' : 'Novo Estilo'}
                                    </Button>
                                </Group>
                                {/* Formulário Adicionar Estilo */}
                                {showAddStyleForm && (
                                    <Paper p="sm" withBorder mb="md" radius="md">
                                        <Stack>
                                            <TextInput label="Nome do Estilo" placeholder="Ex: Desenho Animado" value={newStyleName} onChange={(e) => setNewStyleName(e.currentTarget.value)} required disabled={stylesLoading} />
                                            <Textarea label="Instruções do Estilo" placeholder="Descreva o estilo..." value={newStyleInstructions} onChange={(e) => setNewStyleInstructions(e.currentTarget.value)} required minRows={3} autosize disabled={stylesLoading} />
                                            <Button onClick={handleAddStyle} loading={stylesLoading} disabled={!newStyleName.trim() || !newStyleInstructions.trim()}>Salvar Estilo</Button>
                                        </Stack>
                                    </Paper>
                                )}
                                {/* Loading e Erro de Estilos */}
                                {stylesLoading && <Center><Loader size="sm" /></Center>}
                                {stylesError && (
                                    <Alert icon={<IconAlertCircle size="1rem" />} title="Erro nos Estilos" color="red" withCloseButton onClose={() => setStylesError(null)} mb="md">{stylesError}</Alert>
                                )}
                                {/* Lista de Estilos */}
                                {!stylesLoading && stylesList.length === 0 && !stylesError && (<Text c="dimmed" ta="center" mt="lg">Nenhum estilo cadastrado.</Text>)}
                                {!stylesLoading && stylesList.length > 0 && (
                                    <Stack gap="xs">
                                        {stylesList.map(style => (
                                            <Paper key={style.id} withBorder p="xs" radius="sm">
                                                <Group justify="space-between" wrap="nowrap">
                                                    <Box style={{ overflow: 'hidden', flexGrow: 1 }}>
                                                        <Text fw={500} size="sm" truncate>{style.name}</Text>
                                                        <Text size="xs" c="dimmed" lineClamp={2}>{style.instructions}</Text>
                                                    </Box>
                                                    <ActionIcon color="red" variant="subtle" onClick={() => handleDeleteStyle(style.id)} disabled={stylesLoading} title={`Excluir "${style.name}"`}>
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                </Group>
                                            </Paper>
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        )}
                    </ScrollArea>
                </Paper>

                {/* 2.2 Coluna Direita: Resultados */}
                <Paper shadow="xs" p="lg" withBorder style={{ flexGrow: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                     <Title order={4} mb="md">Resultados</Title>
                     {/* Erro Geral/Geração/Edição */}
                     {error && (<Alert icon={<IconAlertCircle size="1rem" />} title="Erro!" color="red" withCloseButton onClose={() => setError(null)} mb="md">{error}</Alert>)}

                     {/* Área de Resultados com Loading e Scroll */}
                     <Box style={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
                        <LoadingOverlay visible={resultsLoading} overlayProps={{ radius: "sm", blur: 1 }} loaderProps={{ color: 'orange' }} />
                        <ScrollArea style={{ height: '100%' }} viewportProps={{ style: { padding: '4px' } }}>
                             {generatedImages.length > 0 && !isLoading && (
                                <SimpleGrid cols={{ base: 1, sm: 2, md: 2, lg: 3 }} spacing="md">
                                    {generatedImages.map((base64Data, index) => {
                                        let mimeType = 'image/png';
                                        const currentOutputFormat = activeTab === 'generate' ? selectedOutputFormat : 'png';
                                        if (currentOutputFormat === 'jpeg') mimeType = 'image/jpeg';
                                        else if (currentOutputFormat === 'webp') mimeType = 'image/webp';
                                        return (
                                            <Paper key={index} withBorder radius="md" p={4} style={{ overflow: 'hidden', position: 'relative' }}>
                                                <Image src={`data:${mimeType};base64,${base64Data}`} alt={`Resultado ${index + 1}`} style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 'var(--mantine-radius-sm)' }} />
                                                <ActionIcon variant="filled" color="blue" size="sm" onClick={() => handleDownloadImage(base64Data, index)} title="Baixar Imagem" style={{ position: 'absolute', top: 8, right: 8 }}>
                                                    <IconDownload size={14} />
                                                </ActionIcon>
                                            </Paper>
                                        );
                                    })}
                                </SimpleGrid>
                             )}
                            {/* Placeholder */}
                             {generatedImages.length === 0 && !resultsLoading && !error && (
                                <Center style={{ height: '100%', minHeight: '200px', border: '1px dashed var(--mantine-color-gray-3)', borderRadius: 'var(--mantine-radius-md)', backgroundColor: 'var(--mantine-color-gray-0)' }}>
                                    <Text c="dimmed" ta="center">Os resultados aparecerão aqui.</Text>
                                </Center>
                            )}
                        </ScrollArea>
                     </Box>
                </Paper>
            </Box>
        </Box>
    );
}

export default GerarImagemPage;