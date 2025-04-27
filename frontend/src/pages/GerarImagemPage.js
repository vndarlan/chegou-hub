// frontend/src/pages/GerarImagemPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box, Title, Text, Paper, Textarea, Button, LoadingOverlay, Alert, Image, Group, Stack,
    Select, NumberInput, FileInput, Tabs, Modal, List, ThemeIcon, ActionIcon, Divider, ScrollArea, Center, SimpleGrid,
    TextInput, Slider
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconAlertCircle, IconEdit, IconSparkles, IconPalette, IconPlus, IconTrash, IconPencil, IconDownload
} from '@tabler/icons-react';

// Função para obter o token CSRF
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

// Função para criar um cliente axios com CSRF
function createCSRFAxios() {
    const instance = axios.create({
        baseURL: 'https://chegou-hubb-production.up.railway.app/api', // Verifique se esta é a URL correta do seu backend
        withCredentials: true,
        xsrfHeaderName: 'X-CSRFToken',
        xsrfCookieName: 'csrftoken'
    });

    instance.interceptors.request.use(
        async (config) => {
            // Adiciona o token APENAS para métodos que precisam de proteção CSRF
            if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
                const token = getCSRFToken();
                if (token) {
                    // console.log(`DEBUG: Adicionando token CSRF: ${token.substring(0, 5)}... para ${config.url}`); // Log de Debug (opcional)
                    config.headers['X-CSRFToken'] = token;
                } else {
                    // Aviso importante se o token não for encontrado ANTES da requisição
                    console.warn(`AVISO: Token CSRF não encontrado nos cookies antes de enviar ${config.method.toUpperCase()} para ${config.url}`);
                }
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    return instance;
}

// Função para TENTAR obter/confirmar o token CSRF inicial
async function ensureCSRFTokenIsSet() {
    try {
        console.log('Verificando/Tentando setar token CSRF inicial...');
        // Usar /ensure-csrf/ ou /current-state/ - ambos devem funcionar se decorados
        const response = await axios.get('https://chegou-hubb-production.up.railway.app/api/ensure-csrf/', { withCredentials: true });
        console.log("Resposta do servidor (ensure-csrf):", response.status);

        // Pequena pausa para permitir que o cookie seja processado pelo navegador (pode não ser necessário)
        await new Promise(resolve => setTimeout(resolve, 100));

        const token = getCSRFToken();
        if (token) {
            console.log(`Token CSRF confirmado/obtido após chamada inicial: ${token.substring(0, 10)}...`);
            return true;
        } else {
            console.warn('Token CSRF NÃO encontrado nos cookies após chamada inicial.');
            return false;
        }
    } catch (error) {
        console.error('Erro ao tentar garantir token CSRF inicial:', error);
        return false;
    }
}

// <<< CORREÇÃO PRINCIPAL >>>
// Cria a instância Axios FORA da função do componente.
// Ela será criada apenas uma vez quando este módulo JS for carregado.
const csrfAxios = createCSRFAxios();

// Componente principal
function GerarImagemPage() {
    // --- Estados Gerais ---
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('generate');

    // --- Estados de Geração ---
    const [prompt, setPrompt] = useState('');
    const [selectedSizeGen, setSelectedSizeGen] = useState('auto');
    const [selectedQualityGen, setSelectedQualityGen] = useState('auto');
    const [nImagesGen, setNImagesGen] = useState(1);
    const [selectedStyleId, setSelectedStyleId] = useState(null);
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

    // --- Estado do Resultado ---
    const [generatedImages, setGeneratedImages] = useState([]);

    // --- Estados de Estilos ---
    const [stylesList, setStylesList] = useState([]);
    const [styleModalOpened, { open: openStyleModal, close: closeStyleModal }] = useDisclosure(false);
    const [currentStyle, setCurrentStyle] = useState(null);
    const [styleName, setStyleName] = useState('');
    const [styleInstructions, setStyleInstructions] = useState('');
    const [styleError, setStyleError] = useState('');

    // Tenta garantir que o cookie CSRF esteja presente na montagem
    useEffect(() => {
        ensureCSRFTokenIsSet(); // Chama a função para buscar o token inicial
    }, []); // Roda só uma vez na montagem

    // Atualiza se o output_compression deve estar ativo
    const compressionEnabled = ['webp', 'jpeg'].includes(selectedOutputFormat);

    // Atualiza se o background transparente pode ser selecionado
    useEffect(() => {
        if (selectedBackground === 'transparent' && !['png', 'webp'].includes(selectedOutputFormat)) {
            setSelectedBackground('auto');
        }
    }, [selectedOutputFormat, selectedBackground]);

    // Limpar erros e resultados ao mudar de aba
    useEffect(() => {
        setError(null);
        setGeneratedImages([]);
    }, [activeTab]);

    // Busca estilos
    useEffect(() => {
        let isMounted = true;
        console.log("Executando useEffect para buscar estilos...");
        const loadStyles = async () => {
            try {
                // Usa a instância csrfAxios que agora é estável (criada fora)
                const response = await csrfAxios.get('/styles/');
                if (isMounted) {
                    setStylesList(response.data || []);
                    console.log("Estilos carregados:", response.data?.length); // Log mais conciso
                }
            } catch (err) {
                console.error("Erro ao buscar estilos:", err);
                if (isMounted && err.response?.status !== 401 && err.response?.status !== 403) {
                    setError("Não foi possível carregar seus estilos salvos.");
                }
            }
        };

        loadStyles();
        return () => { isMounted = false; };
    // <<< CORREÇÃO AQUI >>>
    // Mude de volta para array vazio para rodar SÓ NA MONTAGEM
    // e ignorar o aviso do ESLint sobre dependência desnecessária.
    }, []);

    // Geração com GPT Image
    const handleGenerateImage = async () => {
        if (!prompt.trim()) {
            setError('Por favor, digite um prompt.');
            return;
        }
        const payload = {
            prompt: prompt.trim(),
            size: selectedSizeGen,
            quality: selectedQualityGen,
            n: nImagesGen,
            background: selectedBackground,
            output_format: selectedOutputFormat,
            moderation: selectedModeration,
        };
        if (compressionEnabled) {
            payload.output_compression = outputCompression;
        }
        if (selectedStyleId) {
            payload.style_id = selectedStyleId;
        }
        await handleApiCall('/operacional/generate-image/', payload, 'post');
    };

    // Edição
    const handleEditImage = async () => {
        if (!editPrompt.trim()) { setError('Prompt de edição é obrigatório.'); return; }
        if (baseImagesEdit.length === 0) { setError('Selecione ao menos uma imagem base.'); return; }
        const formData = new FormData();
        formData.append('prompt', editPrompt.trim());
        formData.append('size', selectedSizeEdit);
        formData.append('quality', selectedQualityEdit);
        formData.append('n', nImagesEdit);
        baseImagesEdit.forEach((file, index) => {
            formData.append('image', file, file.name);
        });
        if (maskImageEdit) {
            formData.append('mask', maskImageEdit, maskImageEdit.name);
        }
        await handleApiCall('/operacional/edit-image/', formData, 'post', { headers: { 'Content-Type': 'multipart/form-data' } });
    };

    // Função genérica para chamadas API state-changing (POST/PATCH/DELETE)
    const handleApiCall = async (url, payload, method = 'post', config = {}) => {
        setIsLoading(true);
        setError(null);
        // Limpar resultados apenas se for uma chamada de geração/edição
        if (url.includes('/operacional/')) {
             setGeneratedImages([]);
        }

        console.log(`Enviando ${method.toUpperCase()} para ${url}...`);
        const tokenCheck = getCSRFToken();
        console.log(`DEBUG: Token CSRF lido ANTES da chamada ${method.toUpperCase()} ${url}:`, tokenCheck ? tokenCheck.substring(0, 10) + '...' : null);

        try {
             // Usa a instância csrfAxios diretamente com o método correto
             const response = await csrfAxios({
                 method: method,
                 url: url,
                 data: payload,
                 ...config // Espalha configurações adicionais (como headers para FormData)
             });

             console.log(`Sucesso ${method.toUpperCase()} ${url}:`, response.status);

             // Tratamento específico para geração/edição de imagem
             if (url.includes('/operacional/') && response.data?.images_b64?.length > 0) {
                 console.log(`${response.data.images_b64.length} imagem(ns) recebida(s).`);
                 setGeneratedImages(response.data.images_b64);
             }
             // Poderia adicionar tratamento para outros endpoints se necessário

        } catch (err) {
            console.error(`Erro ao chamar ${method.toUpperCase()} ${url}:`, err);
            let errorMessage = 'Ocorreu um erro ao processar sua solicitação.';
            if (err.response) {
                console.error(`Status do erro (${method.toUpperCase()} ${url}):`, err.response.status);
                console.error(`Dados do erro (${method.toUpperCase()} ${url}):`, err.response.data);
                if (err.response.status === 403) {
                    errorMessage = `Erro de Segurança (403). Verifique se está logado e tente recarregar a página. Detalhe: ${err.response.data?.detail || 'CSRF ou Permissão'}`;
                } else if (err.response.status === 401) {
                    errorMessage = `Não autenticado (401). Faça login novamente.`;
                } else {
                    errorMessage = err.response.data?.error || err.response.data?.detail || `Erro do servidor: ${err.response.status}`;
                }
            } else if (err.request) {
                errorMessage = 'Não foi possível conectar ao servidor.';
            } else {
                errorMessage = `Erro ao preparar a requisição: ${err.message}`;
            }
            setError(errorMessage); // Exibe o erro para o usuário
            setGeneratedImages([]); // Limpa imagens em caso de erro na geração/edição
        } finally {
            setIsLoading(false);
        }
    };

    // --- Funções de Gerenciamento de Estilos ---
    const openCreateStyleModal = () => {
        setCurrentStyle(null);
        setStyleName('');
        setStyleInstructions('');
        setStyleError('');
        openStyleModal();
    };

    const openEditStyleModal = (style) => {
        setCurrentStyle(style);
        setStyleName(style.name);
        setStyleInstructions(style.instructions);
        setStyleError('');
        openStyleModal();
    };

    const handleSaveStyle = async () => {
        if (!styleName.trim() || !styleInstructions.trim()) {
            setStyleError("Nome e Instruções são obrigatórios.");
            return;
        }
        setStyleError('');
        setIsLoading(true); // Inicia o loading aqui para cobrir a chamada e a atualização

        const url = currentStyle ? `/styles/${currentStyle.id}/` : '/styles/';
        const method = currentStyle ? 'patch' : 'post';
        const payload = { name: styleName.trim(), instructions: styleInstructions.trim() };

        // Reutiliza handleApiCall
        await handleApiCall(url, payload, method);

        // Se a chamada API teve sucesso (sem erro no estado), fecha modal e atualiza lista
        // Usamos um timeout pequeno para garantir que o estado de erro seja atualizado antes de verificar
        setTimeout(async () => {
             if (!error) { // Verifica se não houve erro na chamada
                closeStyleModal();
                // Atualiza lista de estilos após sucesso
                 try {
                     const styleResponse = await csrfAxios.get('/styles/');
                     setStylesList(styleResponse.data || []);
                 } catch (e) {
                     console.error("Erro ao re-buscar estilos após salvar:", e);
                     setError("Estilo salvo, mas erro ao atualizar a lista."); // Informa sobre o problema secundário
                 }
             } else {
                 // Se houve erro na handleApiCall, exibe no modal
                 setStyleError(error);
                 setError(null); // Limpa o erro global para não mostrar duas vezes
             }
             setIsLoading(false); // Finaliza o loading aqui
        }, 100); // Pequeno delay
    };

    const handleDeleteStyle = async (styleId) => {
        if (!window.confirm("Tem certeza que deseja deletar este estilo?")) return;

        setIsLoading(true); // Inicia loading
        await handleApiCall(`/styles/${styleId}/`, null, 'delete'); // Usa handleApiCall para deletar

        // Se a chamada API teve sucesso, atualiza lista
        setTimeout(async () => {
            if (!error) {
                if (styleId === selectedStyleId) {
                    setSelectedStyleId(null);
                }
                // Atualiza lista de estilos após sucesso
                try {
                    const styleResponse = await csrfAxios.get('/styles/');
                    setStylesList(styleResponse.data || []);
                } catch (e) {
                    console.error("Erro ao re-buscar estilos após deletar:", e);
                    setError("Estilo deletado, mas erro ao atualizar a lista.");
                }
            }
            // O erro já foi setado por handleApiCall se houve falha
             setIsLoading(false); // Finaliza loading
        }, 100);
    };

    // --- Função de Download ---
    const handleDownloadImage = (base64Data, index) => {
        const link = document.createElement('a');
        // Determina o mime type correto baseado no formato selecionado
        let mimeType = 'image/png';
        if (selectedOutputFormat === 'jpeg') mimeType = 'image/jpeg';
        else if (selectedOutputFormat === 'webp') mimeType = 'image/webp';

        link.href = `data:${mimeType};base64,${base64Data}`;
        const filename = `gerada_${activeTab}_${index + 1}.${selectedOutputFormat}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Renderização ---
    return (
        <Box p="md" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <LoadingOverlay visible={isLoading} overlayProps={{ radius: "sm", blur: 2 }} loaderProps={{ color: 'orange' }} />

            {/* Gerenciamento de Estilos */}
            <Paper shadow="xs" p="lg" withBorder mb="md">
                <Group justify="space-between" align="center">
                    <Title order={4}>🎨 Meus Estilos</Title>
                    <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openCreateStyleModal}>
                        Novo Estilo
                    </Button>
                </Group>
                <ScrollArea h={150} mt="md">
                    {stylesList.length === 0 && !isLoading ? ( // Só mostra se não estiver carregando
                        <Text c="dimmed" ta="center" mt="md">Nenhum estilo criado ainda.</Text>
                    ) : (
                        <List spacing="xs" size="sm" center>
                            {stylesList.map((style) => (
                                <List.Item
                                    key={style.id}
                                    icon={
                                        <ThemeIcon color="orange" size={20} radius="xl">
                                            <IconPalette size="0.8rem" />
                                        </ThemeIcon>
                                    }
                                    styles={{ itemWrapper: { width: '100%' } }}
                                >
                                    <Group justify="space-between" w="100%">
                                        <Text>{style.name}</Text>
                                        <Group gap="xs">
                                            <ActionIcon variant="default" size="sm" onClick={() => openEditStyleModal(style)} title="Editar Estilo">
                                                <IconPencil size={14} />
                                            </ActionIcon>
                                            <ActionIcon variant="filled" color="red" size="sm" onClick={() => handleDeleteStyle(style.id)} title="Deletar Estilo">
                                                <IconTrash size={14} />
                                            </ActionIcon>
                                        </Group>
                                    </Group>
                                </List.Item>
                            ))}
                        </List>
                    )}
                </ScrollArea>
            </Paper>

            {/* Modal para Criar/Editar Estilo */}
            <Modal opened={styleModalOpened} onClose={closeStyleModal} title={currentStyle ? "Editar Estilo" : "Criar Novo Estilo"} centered>
                <Stack>
                    <TextInput
                        label="Nome do Estilo"
                        placeholder="Ex: Anúncio Facebook"
                        value={styleName}
                        onChange={(event) => setStyleName(event.currentTarget.value)}
                        error={styleError && styleError.includes("Nome") ? styleError : null} // Verifica se o erro é sobre o nome
                        required
                    />
                    <Textarea
                        label="Instruções / Prompt Base"
                        placeholder="Ex: Crie uma imagem vibrante e chamativa..."
                        value={styleInstructions}
                        onChange={(event) => setStyleInstructions(event.currentTarget.value)}
                        minRows={4}
                        autosize
                        error={styleError && styleError.includes("Instruções") ? styleError : null} // Verifica se o erro é sobre as instruções
                        required
                    />
                    {/* Mostra outros erros (como CSRF) aqui */}
                    {styleError && !styleError.includes("Nome") && !styleError.includes("Instruções") && (
                        <Alert color="red" title="Erro ao Salvar" icon={<IconAlertCircle size="1rem" />} mt="sm" mb="sm">
                           {styleError}
                        </Alert>
                    )}
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={closeStyleModal}>Cancelar</Button>
                        <Button onClick={handleSaveStyle} loading={isLoading}>Salvar Estilo</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Área Principal com Abas */}
            <Paper shadow="xs" p="lg" withBorder style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Tabs value={activeTab} onChange={setActiveTab} variant='pills' radius='md'>
                    <Tabs.List grow>
                        <Tabs.Tab value="generate" leftSection={<IconSparkles size={16} />}>Gerar Imagem</Tabs.Tab>
                        <Tabs.Tab value="edit" leftSection={<IconEdit size={16} />}>Editar Imagem</Tabs.Tab>
                    </Tabs.List>

                    {/* Conteúdo das Abas */}
                    <Box style={{ flexGrow: 1, overflowY: 'auto', paddingTop: 'var(--mantine-spacing-md)' }}>
                        {/* Painel Gerar */}
                        <Tabs.Panel value="generate" pt="xs">
                            <Stack gap="md">
                                <Textarea
                                    label="Prompt Principal"
                                    placeholder="Ex: Um robô simpático entregando flores em Marte..."
                                    value={prompt}
                                    onChange={(event) => setPrompt(event.currentTarget.value)}
                                    minRows={3} autosize disabled={isLoading} required
                                />
                                <Select
                                    label="Aplicar Estilo (Opcional)"
                                    placeholder="Selecione um estilo salvo"
                                    value={selectedStyleId ? String(selectedStyleId) : null}
                                    onChange={(value) => setSelectedStyleId(value ? Number(value) : null)}
                                    data={stylesList.map(style => ({ value: String(style.id), label: style.name }))}
                                    clearable
                                    searchable
                                    disabled={isLoading || stylesList.length === 0}
                                />
                                <Group grow>
                                    <Select
                                        label="Tamanho" value={selectedSizeGen} onChange={setSelectedSizeGen}
                                        data={[
                                            { value: 'auto', label: 'Auto (Recomendado)' }, { value: '1024x1024', label: '1024x1024' },
                                            { value: '1536x1024', label: '1536x1024' }, { value: '1024x1536', label: '1024x1536' }
                                        ]} disabled={isLoading}
                                    />
                                    <Select
                                        label="Qualidade" value={selectedQualityGen} onChange={setSelectedQualityGen}
                                        data={[
                                            { value: 'auto', label: 'Auto (Recomendado)' }, { value: 'high', label: 'Alta' },
                                            { value: 'medium', label: 'Média' }, { value: 'low', label: 'Baixa' }
                                        ]} disabled={isLoading}
                                    />
                                </Group>
                                <Group grow>
                                    <Select
                                        label="Formato Saída" value={selectedOutputFormat} onChange={setSelectedOutputFormat}
                                        data={[
                                            { value: 'png', label: 'PNG' }, { value: 'webp', label: 'WebP' }, { value: 'jpeg', label: 'JPEG' }
                                        ]} disabled={isLoading}
                                    />
                                    <Select
                                        label="Fundo" value={selectedBackground} onChange={setSelectedBackground}
                                        data={[
                                            { value: 'auto', label: 'Auto' },
                                            { value: 'transparent', label: 'Transparente', disabled: !['png', 'webp'].includes(selectedOutputFormat) },
                                            { value: 'opaque', label: 'Opaco' }
                                        ]} disabled={isLoading}
                                    />
                                </Group>
                                <Group grow>
                                    <NumberInput
                                        label="Nº Imagens" value={nImagesGen} onChange={setNImagesGen} min={1} max={10} step={1} disabled={isLoading}
                                    />
                                    <Select
                                        label="Moderação" value={selectedModeration} onChange={setSelectedModeration}
                                        data={[
                                            { value: 'auto', label: 'Auto' }, { value: 'low', label: 'Baixa' }
                                        ]} disabled={isLoading}
                                    />
                                </Group>
                                {compressionEnabled && (
                                    <Stack gap="xs">
                                        <Text size="sm" fw={500}>Compressão ({outputCompression}%)</Text>
                                        <Slider min={1} max={100} label={(value) => `${value}%`} value={outputCompression} onChange={setOutputCompression} disabled={isLoading}
                                            marks={[{ value: 25, label: '25%' }, { value: 50, label: '50%' }, { value: 75, label: '75%' }, { value: 100, label: '100%' }]} />
                                        <Text size="xs" c="dimmed">Menor valor = menor tamanho de arquivo</Text>
                                    </Stack>
                                )}
                                <Group justify="flex-end" mt="md">
                                    <Button onClick={handleGenerateImage} disabled={isLoading || !prompt.trim()} loading={isLoading} leftSection={<IconSparkles size={18} />}>
                                        Gerar com GPT Image
                                    </Button>
                                </Group>
                            </Stack>
                        </Tabs.Panel>

                        {/* Painel Editar */}
                        <Tabs.Panel value="edit" pt="xs">
                            <Stack gap="md">
                                <FileInput
                                    label="Imagem(ns) Base" placeholder="Selecione (PNG, JPG, WebP)" value={baseImagesEdit} onChange={setBaseImagesEdit}
                                    multiple clearable accept="image/png,image/jpeg,image/webp" disabled={isLoading}
                                    description="GPT Image permite múltiplas imagens (até 25MB cada)"
                                />
                                <FileInput
                                    label="Máscara (Opcional - PNG)" placeholder="Selecione a máscara" value={maskImageEdit} onChange={setMaskImageEdit}
                                    clearable accept="image/png" disabled={isLoading}
                                    description="Áreas transparentes indicam onde editar"
                                />
                                <Textarea
                                    label="Prompt de Edição" placeholder="Descreva a edição..." value={editPrompt} onChange={(event) => setEditPrompt(event.currentTarget.value)}
                                    minRows={3} autosize disabled={isLoading} required
                                />
                                <Group grow>
                                    <Select
                                        label="Tamanho" value={selectedSizeEdit} onChange={setSelectedSizeEdit}
                                        data={[
                                            { value: 'auto', label: 'Auto' }, { value: '1024x1024', label: '1024x1024' },
                                            { value: '1536x1024', label: '1536x1024' }, { value: '1024x1536', label: '1024x1536' }
                                        ]} disabled={isLoading}
                                    />
                                    <Select
                                        label="Qualidade" value={selectedQualityEdit} onChange={setSelectedQualityEdit}
                                        data={[
                                            { value: 'auto', label: 'Auto' }, { value: 'high', label: 'Alta' },
                                            { value: 'medium', label: 'Média' }, { value: 'low', label: 'Baixa' }
                                        ]} disabled={isLoading}
                                    />
                                </Group>
                                <NumberInput label="Nº de Edições" value={nImagesEdit} onChange={setNImagesEdit} min={1} max={10} step={1} disabled={isLoading} />
                                <Group justify="flex-end" mt="md">
                                    <Button onClick={handleEditImage} disabled={isLoading || !editPrompt.trim() || baseImagesEdit.length === 0} loading={isLoading} leftSection={<IconEdit size={18} />}>
                                        Editar com GPT Image
                                    </Button>
                                </Group>
                            </Stack>
                        </Tabs.Panel>
                    </Box>
                </Tabs>

                {/* Exibição de Erro Global */}
                {error && (
                    <Alert icon={<IconAlertCircle size="1rem" />} title="Erro!" color="red" withCloseButton onClose={() => setError(null)} mt="md">
                        {error}
                    </Alert>
                )}

                {/* Exibição dos Resultados */}
                {generatedImages.length > 0 && !isLoading && (
                    <Box mt="lg">
                        <Divider my="md" label="Resultados" labelPosition="center" />
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                            {generatedImages.map((base64Data, index) => {
                                let mimeType = 'image/png'; // Default
                                if (selectedOutputFormat === 'jpeg') mimeType = 'image/jpeg';
                                else if (selectedOutputFormat === 'webp') mimeType = 'image/webp';

                                return (
                                    <Paper key={index} withBorder radius="md" p="xs" style={{ overflow: 'hidden', position: 'relative' }}>
                                        <Image
                                            src={`data:${mimeType};base64,${base64Data}`}
                                            alt={`Resultado ${index + 1}`}
                                            style={{ display: 'block', width: '100%', height: 'auto' }}
                                        />
                                        <Group gap="xs" style={{ position: 'absolute', top: 5, right: 5 }}>
                                            <ActionIcon variant="filled" color="blue" size="sm" onClick={() => handleDownloadImage(base64Data, index)} title="Baixar">
                                                <IconDownload size={14} />
                                            </ActionIcon>
                                        </Group>
                                    </Paper>
                                );
                            })}
                        </SimpleGrid>
                    </Box>
                )}

                {/* Placeholder quando não há imagens e não está carregando */}
                {generatedImages.length === 0 && !isLoading && !error && (
                    <Center mt="xl" p="xl" style={{ border: '1px dashed #ced4da', minHeight: '200px', borderRadius: 'var(--mantine-radius-md)', backgroundColor: '#f8f9fa' }}>
                        <Text c="dimmed" ta="center">Os resultados aparecerão aqui.</Text>
                    </Center>
                )}
            </Paper>
        </Box>
    );
}

export default GerarImagemPage;