// frontend/src/pages/GerarImagemPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Title, Text, Paper, Textarea, Button, LoadingOverlay, Alert, Image, Group, Stack,
    Select, NumberInput, FileInput, Tabs, Modal, List, ThemeIcon, ActionIcon, Divider, ScrollArea, Center, SimpleGrid,
    TextInput // <<< ADICIONE ESTA LINHA AQUI
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
// Ícones (vamos remover os não usados para limpar os warnings)
import {
    IconAlertCircle, IconPhoto, IconEdit, IconSparkles, IconPalette, IconPlus, IconTrash, IconPencil, /* IconX, */ IconDownload /*, IconCopy */
} from '@tabler/icons-react';

// Função para pegar o valor de um cookie pelo nome (mantida)
function getCookie(name) {
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
    const [activeTab, setActiveTab] = useState('generate'); // generate, edit, variations

    // --- Estados de Geração ---
    const [prompt, setPrompt] = useState('');
    const [selectedModelGen, setSelectedModelGen] = useState('dall-e-3');
    const [selectedSizeGen, setSelectedSizeGen] = useState('1024x1024');
    const [selectedQualityGen, setSelectedQualityGen] = useState('standard');
    const [nImagesGen, setNImagesGen] = useState(1);
    const [selectedStyleId, setSelectedStyleId] = useState(null); // ID do estilo selecionado

    // --- Estados de Edição ---
    const [editPrompt, setEditPrompt] = useState('');
    const [baseImagesEdit, setBaseImagesEdit] = useState([]); // Array de File objects
    const [maskImageEdit, setMaskImageEdit] = useState(null); // File object
    const [selectedModelEdit, setSelectedModelEdit] = useState('dall-e-2'); // DALL-E 2 bom para mask
    const [selectedSizeEdit, setSelectedSizeEdit] = useState('1024x1024');
    const [nImagesEdit, setNImagesEdit] = useState(1);

    // --- Estados de Variação ---
    const [baseImageVar, setBaseImageVar] = useState(null); // File object
    const [selectedSizeVar, setSelectedSizeVar] = useState('1024x1024');
    const [nImagesVar, setNImagesVar] = useState(1);

    // --- Estado do Resultado ---
    const [generatedImages, setGeneratedImages] = useState([]); // Array de strings base64

    // --- Estados de Estilos ---
    const [stylesList, setStylesList] = useState([]);
    const [styleModalOpened, { open: openStyleModal, close: closeStyleModal }] = useDisclosure(false);
    const [currentStyle, setCurrentStyle] = useState(null); // Para edição/criação no modal
    const [styleName, setStyleName] = useState('');
    const [styleInstructions, setStyleInstructions] = useState('');
    const [styleError, setStyleError] = useState('');


    // --- Funções Auxiliares ---
    const fetchStyles = useCallback(async () => {
        console.log("Buscando estilos...");
        try {
            const csrfToken = getCookie('csrftoken');
            const response = await axios.get('http://localhost:8000/api/styles/', {
                headers: { 'X-CSRFToken': csrfToken }
            });
            setStylesList(response.data || []);
            console.log("Estilos carregados:", response.data);
        } catch (err) {
            console.error("Erro ao buscar estilos:", err.response || err.message);
            setError("Não foi possível carregar seus estilos salvos.");
        }
    }, []); // useCallback para evitar recriação desnecessária

    // Busca estilos ao montar o componente
    useEffect(() => {
        fetchStyles();
    }, [fetchStyles]);

    // Limpar erros e resultados ao mudar de aba
    useEffect(() => {
        setError(null);
        setGeneratedImages([]);
    }, [activeTab]);


    // --- Funções de Chamada API ---

    const handleApiCall = async (url, payload, config = {}, useFormData = false) => {
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]); // Limpa imagens anteriores
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
                    // Content-Type será definido pelo Axios para FormData ou como application/json
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

    // Geração
    const handleGenerateImage = () => {
        if (!prompt.trim()) {
            setError('Por favor, digite um prompt.');
            return;
        }

        const payload = {
            prompt: prompt.trim(),
            model: selectedModelGen,
            size: selectedSizeGen,
            quality: selectedQualityGen,
            n: nImagesGen,
        };

        // Adiciona instruções do estilo se selecionado
        if (selectedStyleId) {
            const selectedStyle = stylesList.find(s => s.id === selectedStyleId);
            if (selectedStyle && selectedStyle.instructions) {
                // O backend agora faz a concatenação se receber style_id
                payload.style_id = selectedStyleId;
                // Alternativa: fazer no frontend (menos seguro se instruções mudarem)
                // payload.prompt = `${selectedStyle.instructions}\n\n${prompt.trim()}`;
                console.log(`Usando estilo: ${selectedStyle.name}`);
            }
        }

        handleApiCall('http://localhost:8000/api/operacional/generate-image/', payload);
    };

    // Edição
    const handleEditImage = () => {
        if (!editPrompt.trim()) { setError('Prompt de edição é obrigatório.'); return; }
        if (baseImagesEdit.length === 0) { setError('Selecione ao menos uma imagem base.'); return; }

        const formData = new FormData();
        formData.append('prompt', editPrompt.trim());
        formData.append('model', selectedModelEdit);
        formData.append('size', selectedSizeEdit);
        formData.append('n', nImagesEdit);

        baseImagesEdit.forEach((file, index) => {
            formData.append('image', file, file.name); // Adiciona cada imagem base
        });

        if (maskImageEdit) {
            formData.append('mask', maskImageEdit, maskImageEdit.name);
        }

        handleApiCall('http://localhost:8000/api/operacional/edit-image/', formData, {
             headers: { 'Content-Type': 'multipart/form-data' }
        }, true); // Indica que é FormData
    };

    // Variação
    const handleCreateVariation = () => {
        if (!baseImageVar) { setError('Selecione a imagem base para variações.'); return; }

        const formData = new FormData();
        formData.append('size', selectedSizeVar);
        formData.append('n', nImagesVar);
        formData.append('image', baseImageVar, baseImageVar.name);

        handleApiCall('http://localhost:8000/api/operacional/create-variation/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }, true); // Indica que é FormData
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
        setIsLoading(true); // Usar loading geral ou um específico para o modal

        const csrfToken = getCookie('csrftoken');
        const url = currentStyle ? `http://localhost:8000/api/styles/${currentStyle.id}/` : 'http://localhost:8000/api/styles/';
        const method = currentStyle ? 'patch' : 'post'; // Usar PATCH para atualização parcial

        try {
            const response = await axios({
                method: method,
                url: url,
                data: { name: styleName.trim(), instructions: styleInstructions.trim() },
                headers: { 'X-CSRFToken': csrfToken }
            });
            console.log("Estilo salvo:", response.data);
            closeStyleModal();
            fetchStyles(); // Recarrega a lista de estilos
            // Limpar seleção se o estilo editado era o selecionado?
            if (currentStyle && currentStyle.id === selectedStyleId) {
                 // Talvez não fazer nada ou re-selecionar? Por ora, deixa como está.
            }
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
            await axios.delete(`http://localhost:8000/api/styles/${styleId}/`, {
                headers: { 'X-CSRFToken': csrfToken }
            });
            console.log("Estilo deletado:", styleId);
            fetchStyles(); // Recarrega a lista
            // Desselecionar se o estilo deletado era o ativo
            if (styleId === selectedStyleId) {
                setSelectedStyleId(null);
            }
        } catch (err) {
            console.error("Erro ao deletar estilo:", err.response || err.message);
            setError("Não foi possível deletar o estilo."); // Mostra erro principal
        } finally {
            setIsLoading(false);
        }
    };

    // --- Funções de Download e Cópia ---
    const handleDownloadImage = (base64Data, index) => {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${base64Data}`;
        const filename = `gerada_${activeTab}_${index + 1}.png`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopyPrompt = (promptToCopy) => {
         navigator.clipboard.writeText(promptToCopy)
             .then(() => console.log("Prompt copiado!")) // Idealmente mostrar uma notificação Mantine
             .catch(err => console.error("Erro ao copiar prompt:", err));
    };

    // --- Renderização ---
    return (
        <Box p="md" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <LoadingOverlay visible={isLoading} overlayProps={{ radius: "sm", blur: 2 }} loaderProps={{ color: 'orange' }} />

            {/* Gerenciamento de Estilos (pode ser um Drawer ou Accordion também) */}
            <Paper shadow="xs" p="lg" withBorder mb="md">
                 <Group justify="space-between" align="center">
                     <Title order={4}>🎨 Meus Estilos</Title>
                     <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openCreateStyleModal}>
                         Novo Estilo
                     </Button>
                 </Group>
                 <ScrollArea h={150} mt="md"> {/* Altura limitada com scroll */}
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
                                     styles={{ itemWrapper: { width: '100%' } }} // Para o grupo ir até o fim
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
                        error={styleError && styleError.includes("nome") ? styleError : null} // Mostra erro específico se houver
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
                        <Text c="red" size="sm">{styleError}</Text> // Erro geral do modal
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
                        <Tabs.Tab value="variations" leftSection={<IconPhoto size={16} />}>Criar Variações</Tabs.Tab>
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
                                     value={selectedStyleId ? String(selectedStyleId) : null} // Precisa ser string para o Select
                                     onChange={(value) => setSelectedStyleId(value ? Number(value) : null)}
                                     data={stylesList.map(style => ({ value: String(style.id), label: style.name }))}
                                     clearable
                                     disabled={isLoading}
                                />
                                <Group grow>
                                     <Select label="Modelo" value={selectedModelGen} onChange={setSelectedModelGen} data={[{ value: 'dall-e-3', label: 'DALL-E 3' }, { value: 'dall-e-2', label: 'DALL-E 2' }]} disabled={isLoading} />
                                     <Select label="Tamanho" value={selectedSizeGen} onChange={setSelectedSizeGen} data={['1024x1024', '1024x1792', '1792x1024']} disabled={isLoading} /> {/* DALL-E 3 sizes */}
                                </Group>
                                <Group grow>
                                     <Select label="Qualidade" value={selectedQualityGen} onChange={setSelectedQualityGen} data={[{ value: 'standard', label: 'Standard' }, { value: 'hd', label: 'HD' }]} disabled={isLoading || selectedModelGen !== 'dall-e-3'} /> {/* HD só DALL-E 3 */}
                                     <NumberInput label="Nº de Imagens" value={nImagesGen} onChange={setNImagesGen} min={1} max={10} step={1} disabled={isLoading} />
                                </Group>
                                {/* <Switch label="Fundo Transparente" checked={transparentBg} onChange={(event) => setTransparentBg(event.currentTarget.checked)} disabled={isLoading} /> */}
                                <Group justify="flex-end" mt="md">
                                     <Button onClick={handleGenerateImage} disabled={isLoading || !prompt.trim()} loading={isLoading} leftSection={<IconSparkles size={18}/>}>Gerar</Button>
                                </Group>
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="edit" pt="xs">
                             <Stack gap="md">
                                 <FileInput
                                     label="Imagem(ns) Base"
                                     placeholder="Selecione uma ou mais imagens"
                                     value={baseImagesEdit}
                                     onChange={setBaseImagesEdit}
                                     multiple // Permite múltiplos arquivos
                                     clearable
                                     accept="image/png,image/jpeg" // Aceita PNG e JPEG
                                     disabled={isLoading}
                                 />
                                 <FileInput
                                     label="Máscara (Opcional - PNG com transparência)"
                                     placeholder="Selecione a máscara para inpainting"
                                     value={maskImageEdit}
                                     onChange={setMaskImageEdit}
                                     clearable
                                     accept="image/png" // Máscara deve ser PNG
                                     disabled={isLoading}
                                 />
                                <Textarea
                                    label="Prompt de Edição"
                                    placeholder="Descreva a edição desejada ou a imagem final"
                                    value={editPrompt}
                                    onChange={(event) => setEditPrompt(event.currentTarget.value)}
                                    minRows={3} autosize disabled={isLoading} required
                                />
                                <Group grow>
                                    <Select label="Modelo" value={selectedModelEdit} onChange={setSelectedModelEdit} data={[{ value: 'dall-e-2', label: 'DALL-E 2' }/* , { value: 'gpt-image-1', label: 'GPT Image' } */]} disabled={isLoading} /> {/* Edição DALL-E 2 */}
                                    <Select label="Tamanho Saída" value={selectedSizeEdit} onChange={setSelectedSizeEdit} data={['1024x1024', '512x512', '256x256']} disabled={isLoading} /> {/* DALL-E 2 sizes */}
                                </Group>
                                <NumberInput label="Nº de Edições" value={nImagesEdit} onChange={setNImagesEdit} min={1} max={10} step={1} disabled={isLoading} />
                                <Group justify="flex-end" mt="md">
                                     <Button onClick={handleEditImage} disabled={isLoading || !editPrompt.trim() || baseImagesEdit.length === 0} loading={isLoading} leftSection={<IconEdit size={18}/>}>Editar</Button>
                                </Group>
                             </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="variations" pt="xs">
                             <Stack gap="md">
                                  <FileInput
                                     label="Imagem Base"
                                     placeholder="Selecione a imagem para criar variações"
                                     value={baseImageVar}
                                     onChange={setBaseImageVar}
                                     clearable
                                     accept="image/png,image/jpeg"
                                     disabled={isLoading}
                                     required
                                 />
                                  <Group grow>
                                     <Select label="Tamanho Saída" value={selectedSizeVar} onChange={setSelectedSizeVar} data={['1024x1024', '512x512', '256x256']} disabled={isLoading} /> {/* DALL-E 2 sizes */}
                                     <NumberInput label="Nº de Variações" value={nImagesVar} onChange={setNImagesVar} min={1} max={10} step={1} disabled={isLoading} />
                                 </Group>
                                <Text c="dimmed" size="sm">Nota: Variações usam o modelo DALL-E 2.</Text>
                                 <Group justify="flex-end" mt="md">
                                     <Button onClick={handleCreateVariation} disabled={isLoading || !baseImageVar} loading={isLoading} leftSection={<IconPhoto size={18}/>}>Criar Variações</Button>
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
                          {/* Grade para exibir múltiplas imagens */}
                         <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                             {generatedImages.map((base64Data, index) => (
                                 <Paper key={index} withBorder radius="md" p="xs" style={{ overflow: 'hidden', position: 'relative' }}>
                                     <Image
                                         src={`data:image/png;base64,${base64Data}`}
                                         alt={`Resultado ${index + 1}`}
                                         style={{ display: 'block', width: '100%', height: 'auto' }}
                                     />
                                     {/* Overlay com botões (aparece no hover talvez?) */}
                                     <Group gap="xs" style={{ position: 'absolute', top: 5, right: 5 }}>
                                        <ActionIcon variant="filled" color="blue" size="sm" onClick={() => handleDownloadImage(base64Data, index)} title="Baixar">
                                            <IconDownload size={14} />
                                        </ActionIcon>
                                         {/* Botão de copiar prompt poderia ficar aqui, mas qual prompt copiar? O original? */}
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