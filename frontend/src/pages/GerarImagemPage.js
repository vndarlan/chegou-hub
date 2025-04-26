// frontend/src/pages/GerarImagemPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Title, Text, Paper, Textarea, Button, LoadingOverlay, Alert, Image, Group, Stack,
    Select, NumberInput, FileInput, Tabs, Modal, List, ThemeIcon, ActionIcon, Divider, ScrollArea, Center, SimpleGrid,
    TextInput, Slider, Switch
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconAlertCircle, IconPhoto, IconEdit, IconSparkles, IconPalette, IconPlus, IconTrash, IconPencil, IconDownload
} from '@tabler/icons-react';

// Função para pegar o valor de um cookie pelo nome (mantida)
function getCookie(name) {
    // [função original mantida]
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Componente principal
function GerarImagemPage() {
    // --- Estados Gerais ---
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('generate'); // agora apenas generate e edit

    // --- Estados de Geração (apenas GPT-Image-1) ---
    const [prompt, setPrompt] = useState('');
    const [selectedSizeGen, setSelectedSizeGen] = useState('auto');
    const [selectedQualityGen, setSelectedQualityGen] = useState('auto');
    const [nImagesGen, setNImagesGen] = useState(1);
    const [selectedStyleId, setSelectedStyleId] = useState(null);

    // Novos parâmetros específicos do gpt-image-1
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


    // --- Funções Auxiliares ---
    const fetchStyles = useCallback(async () => {
        console.log("Buscando estilos...");
        try {
            const csrfToken = getCookie('csrftoken');
            const response = await axios.get('/styles/', {
                headers: { 'X-CSRFToken': csrfToken }
            });
            setStylesList(response.data || []);
            console.log("Estilos carregados:", response.data);
        } catch (err) {
            console.error("Erro ao buscar estilos:", err.response || err.message);
            setError("Não foi possível carregar seus estilos salvos.");
        }
    }, []);

    // Busca estilos ao montar o componente
    useEffect(() => {
        fetchStyles();
    }, [fetchStyles]);

    // Limpar erros e resultados ao mudar de aba
    useEffect(() => {
        setError(null);
        setGeneratedImages([]);
    }, [activeTab]);

    // Atualiza se o output_compression deve estar ativo
    const compressionEnabled = ['webp', 'jpeg'].includes(selectedOutputFormat);
    
    // Atualiza se o background transparente pode ser selecionado
    useEffect(() => {
        if (selectedBackground === 'transparent' && !['png', 'webp'].includes(selectedOutputFormat)) {
            setSelectedBackground('auto');
        }
    }, [selectedOutputFormat, selectedBackground]);


    // --- Funções de Chamada API ---
    const handleApiCall = async (url, payload, config = {}, useFormData = false) => {
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        const csrfToken = getCookie('csrftoken');

        if (!csrfToken) {
            setError('Erro de segurança: Token CSRF não encontrado. Recarregue a página.');
            setIsLoading(false);
            return;
        }

        try {
            console.log(`Enviando para ${url}... Payload/FormData keys:`, useFormData ? Array.from(payload.keys()) : Object.keys(payload));

            const finalConfig = {
                ...config,
                headers: {
                    ...(config.headers || {}),
                    'X-CSRFToken': csrfToken,
                },
            };

            const response = await axios.post(url, payload, finalConfig);

            if (response.data && response.data.images_b64 && Array.isArray(response.data.images_b64)) {
                console.log(`${response.data.images_b64.length} imagem(ns) recebida(s).`);
                setGeneratedImages(response.data.images_b64);
            } else {
                console.error('Resposta da API inválida ou sem imagens:', response.data);
                setError('Ocorreu um erro inesperado ao receber as imagens.');
            }

        } catch (err) {
            console.error(`Erro ao chamar ${url}:`, err);
            let errorMessage = 'Ocorreu um erro ao processar sua solicitação.';
            if (err.response) {
                console.error("Erro - Status:", err.response.status);
                console.error("Erro - Dados:", err.response.data);
                errorMessage = err.response.data?.error || err.response.data?.detail || `Erro do servidor: ${err.response.status}`;
            } else if (err.request) {
                errorMessage = 'Não foi possível conectar ao servidor.';
            } else {
                errorMessage = 'Ocorreu um erro ao preparar a requisição.';
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Geração com GPT Image
    const handleGenerateImage = () => {
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

        // Adiciona compressão apenas para webp e jpeg
        if (compressionEnabled) {
            payload.output_compression = outputCompression;
        }

        // Adiciona instruções do estilo se selecionado
        if (selectedStyleId) {
            payload.style_id = selectedStyleId;
        }

        handleApiCall('/operacional/generate-image/', payload);
    };

    // Edição
    const handleEditImage = () => {
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

        handleApiCall('/operacional/edit-image/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }, true);
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
        setIsLoading(true);

        const csrfToken = getCookie('csrftoken');
        const url = currentStyle ? `/styles/${currentStyle.id}/` : '/styles/';
        const method = currentStyle ? 'patch' : 'post';

        try {
            const response = await axios({
                method: method,
                url: url,
                data: { name: styleName.trim(), instructions: styleInstructions.trim() },
                headers: { 'X-CSRFToken': csrfToken }
            });
            console.log("Estilo salvo:", response.data);
            closeStyleModal();
            fetchStyles();
        } catch (err) {
            console.error("Erro ao salvar estilo:", err.response || err.message);
            setStyleError(err.response?.data?.detail || err.response?.data?.name?.[0] || err.response?.data?.instructions?.[0] || "Erro ao salvar estilo.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteStyle = async (styleId) => {
        if (!window.confirm("Tem certeza que deseja deletar este estilo?")) return;

        setIsLoading(true);
        const csrfToken = getCookie('csrftoken');
        try {
            await axios.delete(`/styles/${styleId}/`, {
                headers: { 'X-CSRFToken': csrfToken }
            });
            console.log("Estilo deletado:", styleId);
            fetchStyles();
            if (styleId === selectedStyleId) {
                setSelectedStyleId(null);
            }
        } catch (err) {
            console.error("Erro ao deletar estilo:", err.response || err.message);
            setError("Não foi possível deletar o estilo.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Funções de Download ---
    const handleDownloadImage = (base64Data, index) => {
        const link = document.createElement('a');
        link.href = `data:image/${selectedOutputFormat === 'jpeg' ? 'jpeg' : selectedOutputFormat};base64,${base64Data}`;
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
                     {stylesList.length === 0 ? (
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
                        error={styleError && styleError.includes("nome") ? styleError : null}
                        required
                    />
                    <Textarea
                        label="Instruções / Prompt Base"
                        placeholder="Ex: Crie uma imagem vibrante e chamativa para um anúncio no Facebook, foco em..."
                        value={styleInstructions}
                        onChange={(event) => setStyleInstructions(event.currentTarget.value)}
                        minRows={4}
                        autosize
                        error={styleError && styleError.includes("Instruções") ? styleError : null}
                        required
                    />
                    {styleError && !styleError.includes("nome") && !styleError.includes("Instruções") && (
                        <Text c="red" size="sm">{styleError}</Text>
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
                        <Tabs.Panel value="generate" pt="xs">
                            <Stack gap="md">
                                <Textarea
                                    label="Prompt Principal"
                                    placeholder="Ex: Um robô simpático entregando flores em Marte, estilo aquarela."
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
                                     disabled={isLoading}
                                />
                                
                                {/* Parâmetros do gpt-image-1 */}
                                <Group grow>
                                    <Select 
                                        label="Tamanho" 
                                        value={selectedSizeGen} 
                                        onChange={setSelectedSizeGen} 
                                        data={[
                                            { value: 'auto', label: 'Auto (Recomendado)' },
                                            { value: '1024x1024', label: '1024x1024 (Quadrado)' },
                                            { value: '1536x1024', label: '1536x1024 (Paisagem)' },
                                            { value: '1024x1536', label: '1024x1536 (Retrato)' }
                                        ]} 
                                        disabled={isLoading} 
                                    />
                                    <Select 
                                        label="Qualidade" 
                                        value={selectedQualityGen} 
                                        onChange={setSelectedQualityGen} 
                                        data={[
                                            { value: 'auto', label: 'Auto (Recomendado)' },
                                            { value: 'high', label: 'Alta' },
                                            { value: 'medium', label: 'Média' },
                                            { value: 'low', label: 'Baixa' }
                                        ]} 
                                        disabled={isLoading} 
                                    />
                                </Group>
                                
                                <Group grow>
                                    <Select 
                                        label="Formato de Saída" 
                                        value={selectedOutputFormat} 
                                        onChange={setSelectedOutputFormat} 
                                        data={[
                                            { value: 'png', label: 'PNG (Com transparência)' },
                                            { value: 'webp', label: 'WebP (Melhor compressão)' },
                                            { value: 'jpeg', label: 'JPEG (Sem transparência)' }
                                        ]} 
                                        disabled={isLoading} 
                                    />
                                    <Select 
                                        label="Fundo" 
                                        value={selectedBackground} 
                                        onChange={setSelectedBackground} 
                                        data={[
                                            { value: 'auto', label: 'Auto (Recomendado)' },
                                            { value: 'transparent', label: 'Transparente', disabled: !['png', 'webp'].includes(selectedOutputFormat) },
                                            { value: 'opaque', label: 'Opaco' }
                                        ]} 
                                        disabled={isLoading} 
                                    />
                                </Group>
                                
                                <Group grow>
                                    <NumberInput 
                                        label="Nº de Imagens" 
                                        value={nImagesGen} 
                                        onChange={setNImagesGen} 
                                        min={1} 
                                        max={10} 
                                        step={1} 
                                        disabled={isLoading} 
                                    />
                                    <Select 
                                        label="Moderação" 
                                        value={selectedModeration} 
                                        onChange={setSelectedModeration} 
                                        data={[
                                            { value: 'auto', label: 'Auto (Padrão)' },
                                            { value: 'low', label: 'Baixa (Menos restrito)' }
                                        ]} 
                                        disabled={isLoading} 
                                    />
                                </Group>
                                
                                {/* Slider de compressão para WebP e JPEG */}
                                {compressionEnabled && (
                                    <Stack gap="xs">
                                        <Text size="sm" fw={500}>Compressão ({outputCompression}%)</Text>
                                        <Slider
                                            min={1}
                                            max={100}
                                            label={(value) => `${value}%`}
                                            value={outputCompression}
                                            onChange={setOutputCompression}
                                            disabled={isLoading}
                                            marks={[
                                                { value: 25, label: '25%' },
                                                { value: 50, label: '50%' },
                                                { value: 75, label: '75%' },
                                                { value: 100, label: '100%' }
                                            ]}
                                        />
                                        <Text size="xs" c="dimmed">Menor valor = menor tamanho de arquivo, qualidade inferior</Text>
                                    </Stack>
                                )}
                                
                                <Group justify="flex-end" mt="md">
                                     <Button onClick={handleGenerateImage} disabled={isLoading || !prompt.trim()} loading={isLoading} leftSection={<IconSparkles size={18}/>}>
                                         Gerar com GPT Image
                                     </Button>
                                </Group>
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="edit" pt="xs">
                             <Stack gap="md">
                                 <FileInput
                                     label="Imagem(ns) Base"
                                     placeholder="Selecione uma ou mais imagens (PNG, JPG, WebP)"
                                     value={baseImagesEdit}
                                     onChange={setBaseImagesEdit}
                                     multiple
                                     clearable
                                     accept="image/png,image/jpeg,image/webp"
                                     disabled={isLoading}
                                     description="GPT Image permite múltiplas imagens de referência (até 25MB cada)"
                                 />
                                 <FileInput
                                     label="Máscara (Opcional - PNG com transparência)"
                                     placeholder="Selecione a máscara para inpainting"
                                     value={maskImageEdit}
                                     onChange={setMaskImageEdit}
                                     clearable
                                     accept="image/png"
                                     disabled={isLoading}
                                     description="Áreas transparentes indicam onde a imagem será editada"
                                 />
                                <Textarea
                                    label="Prompt de Edição"
                                    placeholder="Descreva a edição desejada ou a imagem final"
                                    value={editPrompt}
                                    onChange={(event) => setEditPrompt(event.currentTarget.value)}
                                    minRows={3} autosize disabled={isLoading} required
                                />
                                <Group grow>
                                    <Select 
                                        label="Tamanho" 
                                        value={selectedSizeEdit} 
                                        onChange={setSelectedSizeEdit}
                                        data={[
                                            { value: 'auto', label: 'Auto (Recomendado)' },
                                            { value: '1024x1024', label: '1024x1024 (Quadrado)' },
                                            { value: '1536x1024', label: '1536x1024 (Paisagem)' },
                                            { value: '1024x1536', label: '1024x1536 (Retrato)' }
                                        ]} 
                                        disabled={isLoading} 
                                    />
                                    <Select 
                                        label="Qualidade" 
                                        value={selectedQualityEdit} 
                                        onChange={setSelectedQualityEdit}
                                        data={[
                                            { value: 'auto', label: 'Auto (Recomendado)' },
                                            { value: 'high', label: 'Alta' },
                                            { value: 'medium', label: 'Média' },
                                            { value: 'low', label: 'Baixa' }
                                        ]} 
                                        disabled={isLoading} 
                                    />
                                </Group>
                                <NumberInput label="Nº de Edições" value={nImagesEdit} onChange={setNImagesEdit} min={1} max={10} step={1} disabled={isLoading} />
                                <Group justify="flex-end" mt="md">
                                     <Button onClick={handleEditImage} disabled={isLoading || !editPrompt.trim() || baseImagesEdit.length === 0} loading={isLoading} leftSection={<IconEdit size={18}/>}>
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
                             {generatedImages.map((base64Data, index) => (
                                 <Paper key={index} withBorder radius="md" p="xs" style={{ overflow: 'hidden', position: 'relative' }}>
                                     <Image
                                         src={`data:image/${selectedOutputFormat === 'jpeg' ? 'jpeg' : selectedOutputFormat};base64,${base64Data}`}
                                         alt={`Resultado ${index + 1}`}
                                         style={{ display: 'block', width: '100%', height: 'auto' }}
                                     />
                                     <Group gap="xs" style={{ position: 'absolute', top: 5, right: 5 }}>
                                        <ActionIcon variant="filled" color="blue" size="sm" onClick={() => handleDownloadImage(base64Data, index)} title="Baixar">
                                            <IconDownload size={14} />
                                        </ActionIcon>
                                    </Group>
                                 </Paper>
                             ))}
                         </SimpleGrid>
                     </Box>
                 )}

                 {/* Placeholder quando não há imagens */}
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