// src/pages/AgendaPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Title,
    Text,
    Tabs,
    Select,
    TextInput,
    Textarea,
    Button,
    Grid,
    Stack,
    Paper,
    Notification,
    Group,
    ActionIcon,
    ScrollArea,
    List,
    Code,
    Alert,
    LoadingOverlay,
    Modal,
    ColorSwatch,
    Badge,
    AspectRatio,
    Skeleton,
    Tooltip
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
    IconX,
    IconCheck,
    IconTrash,
    IconCalendar,
    IconTools,
    IconInfoCircle,
    IconAlertCircle,
    IconPencil,
    IconRefresh,
    IconLink,
    IconExternalLink
} from '@tabler/icons-react';
import axios from 'axios';

// Função para extrair SRC do Iframe
const extractSrcFromIframe = (iframeString) => {
    if (!iframeString || typeof iframeString !== 'string') return null;
    
    const matchSrc = iframeString.match(/src\s*=\s*["']([^"']+)["']/i);
    
    if (matchSrc && matchSrc[1]) {
        return matchSrc[1];
    }
    
    const urlMatch = iframeString.match(/(https?:\/\/[^\s"'<>]+)/i);
    return urlMatch ? urlMatch[1] : null;
};

// Função para adicionar cor a calendário privado
const addColorToPrivateCalendar = (originalUrl, calendarName) => {
    if (!originalUrl) return null;
    
    try {
        const url = new URL(originalUrl);
        
        // Se já tem cor, retorna como está
        if (url.searchParams.has('color')) {
            return originalUrl;
        }
        
        // Adiciona cor baseada no nome
        const color = getColorForCalendar(calendarName);
        url.searchParams.set('color', encodeURIComponent(color));
        
        console.log(`🎨 Cor adicionada para "${calendarName}": ${color}`);
        return url.toString();
    } catch (e) {
        console.warn("Erro ao adicionar cor:", e);
        return originalUrl;
    }
};

// Cores do Google Calendar para calendários privados
const getColorForCalendar = (calendarName) => {
    const colors = [
        '#D50000', '#E67C73', '#F4511E', '#F6BF26', '#33B679', 
        '#0B8043', '#039BE5', '#3F51B5', '#7986CB', '#9C27B0'
    ];
    
    if (!calendarName) return colors[0];
    
    let hash = 0;
    for (let i = 0; i < calendarName.length; i++) {
        hash = calendarName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
};

// Função para gerar cores Mantine (para UI)
const generateCalendarColor = (calendarName) => {
    if (!calendarName) return 'blue';
    
    const colors = ['blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'teal', 'green', 'cyan'];
    
    let hash = 0;
    for (let i = 0; i < calendarName.length; i++) {
        hash = calendarName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
};

function AgendaPage() {
    // Estados principais
    const [activeTab, setActiveTab] = useState('visualizar');
    const [calendarios, setCalendarios] = useState([]);
    const [selectedDbId, setSelectedDbId] = useState(null);
    const [isLoadingCalendars, setIsLoadingCalendars] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [selectOptions, setSelectOptions] = useState([]);

    // Estados para o formulário de adição
    const [novoNome, setNovoNome] = useState('');
    const [novoIframeCode, setNovoIframeCode] = useState('');
    const [addNotification, setAddNotification] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    
    // Estados para o formulário de edição
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingCalendar, setEditingCalendar] = useState(null);
    const [editName, setEditName] = useState('');
    const [editIframeCode, setEditIframeCode] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editNotification, setEditNotification] = useState(null);
    
    // Estados para dimensões responsivas
    const isMobile = useMediaQuery('(max-width: 768px)');
    const iframeHeight = useMemo(() => isMobile ? 400 : 600, [isMobile]);

    // --- Funções da API ---

    // Buscar calendários
    const fetchCalendars = useCallback(async (selectFirst = true) => {
        setIsLoadingCalendars(true);
        setFetchError(null);
        console.log("Buscando calendários (iframe) da API...");
        try {
            const response = await axios.get('/calendars/');
            console.log("Calendários (iframe) recebidos:", response.data);
            
            const calendarData = response.data;
            setCalendarios(calendarData);

            // Define seleção inicial baseado no ID do banco se selectFirst for true
            if (selectFirst) {
                if (calendarData.length > 0) {
                    setSelectedDbId(calendarData[0].id);
                } else {
                    setSelectedDbId(null);
                }
            } else {
                // Se não for para selecionar o primeiro, garante que a seleção atual ainda é válida
                if (selectedDbId && !calendarData.some(c => c.id === selectedDbId)) {
                    setSelectedDbId(calendarData.length > 0 ? calendarData[0].id : null);
                } else if (!selectedDbId && calendarData.length > 0) {
                    setSelectedDbId(calendarData[0].id);
                }
            }

        } catch (error) {
            console.error("Erro ao buscar calendários (iframe):", error.response?.data || error.message);
            setFetchError("Falha ao carregar a lista de calendários. Verifique a conexão ou tente recarregar.");
            setCalendarios([]);
            setSelectedDbId(null);
        } finally {
            setIsLoadingCalendars(false);
        }
    }, [selectedDbId]);

    // Busca inicial
    useEffect(() => {
        fetchCalendars(true);
    }, [fetchCalendars]);

    // Atualiza as opções do select quando os calendários mudam
    useEffect(() => {
        if (Array.isArray(calendarios) && calendarios.length > 0) {
            try {
                const options = calendarios.map(cal => ({
                    value: cal.id.toString(),
                    label: cal.name || "Calendário sem nome",
                }));
                setSelectOptions(options);
            } catch (error) {
                console.error("Erro ao processar opções do select:", error);
                setSelectOptions([]);
            }
        } else {
            setSelectOptions([]);
        }
    }, [calendarios]);

    // --- Lógica de Geração da URL do Iframe (com tentativa de cor) ---
    const iframeSrc = useMemo(() => {
        if (selectedDbId) {
            const selectedCal = calendarios.find(cal => cal.id === selectedDbId);
            if (selectedCal) {
                // Tenta adicionar cor mesmo para calendários privados
                const originalSrc = extractSrcFromIframe(selectedCal.iframe_code);
                const coloredSrc = addColorToPrivateCalendar(originalSrc, selectedCal.name);
                console.log(`📅 URL para "${selectedCal.name}":`, coloredSrc);
                return coloredSrc;
            }
        }
        return null;
    }, [selectedDbId, calendarios]);

    // --- Funções de Manipulação (Adicionar/Remover/Editar) ---

    // Abrir modal de edição
    const handleOpenEditModal = (calendar) => {
        setEditingCalendar(calendar);
        setEditName(calendar.name);
        setEditIframeCode(calendar.iframe_code);
        setEditNotification(null);
        setEditModalOpen(true);
    };

    // Fechar modal de edição
    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setEditingCalendar(null);
        setEditName('');
        setEditIframeCode('');
        setEditNotification(null);
    };

    // Adicionar calendário
    const handleAddCalendario = async () => {
        setAddNotification(null);
        if (!novoNome || !novoIframeCode) {
            setAddNotification({ 
                type: 'error', 
                message: 'Por favor, preencha Nome e Código Iframe.' 
            });
            return;
        }
        
        // Validação aprimorada
        if (!novoIframeCode.includes('<iframe') || !novoIframeCode.includes('src=')) {
            setAddNotification({ 
                type: 'error', 
                message: 'O código fornecido não parece um iframe válido. Certifique-se de copiar o código completo do calendário.' 
            });
            return;
        }

        setIsAdding(true);
        try {
            const response = await axios.post('/calendars/', {
                name: novoNome.trim(),
                iframe_code: novoIframeCode.trim()
            });
            
            setNovoNome('');
            setNovoIframeCode('');
            setAddNotification({ 
                type: 'success', 
                message: `Calendário "${response.data.name}" adicionado com sucesso!` 
            });
            
            // Atualiza a lista de calendários
            await fetchCalendars(false);

        } catch (error) {
            console.error("Erro ao adicionar calendário:", error.response?.data || error.message);
            
            // Tratamento de erro aprimorado
            const backendError = error.response?.data;
            let errorMessage = "Erro desconhecido ao adicionar o calendário.";
            
            if (backendError) {
                if (backendError.iframe_code) {
                    errorMessage = `Código Iframe: ${backendError.iframe_code[0]}`;
                } else if (backendError.name) {
                    errorMessage = `Nome: ${backendError.name[0]}`;
                } else if (typeof backendError === 'string') {
                    errorMessage = backendError;
                } else if (backendError.detail) {
                    errorMessage = backendError.detail;
                }
            }
            
            setAddNotification({ 
                type: 'error', 
                message: errorMessage 
            });
        } finally {
            setIsAdding(false);
        }
    };

    // Editar calendário
    const handleEditCalendario = async () => {
        setEditNotification(null);
        if (!editName || !editIframeCode) {
            setEditNotification({ 
                type: 'error', 
                message: 'Por favor, preencha Nome e Código Iframe.' 
            });
            return;
        }
        
        // Validação aprimorada
        if (!editIframeCode.includes('<iframe') || !editIframeCode.includes('src=')) {
            setEditNotification({ 
                type: 'error', 
                message: 'O código fornecido não parece um iframe válido.' 
            });
            return;
        }

        setIsEditing(true);
        try {
            await axios.put(`/calendars/${editingCalendar.id}/`, {
                name: editName.trim(),
                iframe_code: editIframeCode.trim()
            });
            
            setEditNotification({ 
                type: 'success', 
                message: `Calendário "${editName}" atualizado com sucesso!` 
            });
            
            // Atualiza a lista de calendários
            await fetchCalendars(false);
            
            // Fecha o modal após um breve delay para que o usuário veja a mensagem de sucesso
            setTimeout(() => {
                handleCloseEditModal();
            }, 1500);

        } catch (error) {
            console.error("Erro ao editar calendário:", error.response?.data || error.message);
            
            // Tratamento de erro aprimorado
            const backendError = error.response?.data;
            let errorMessage = "Erro desconhecido ao atualizar o calendário.";
            
            if (backendError) {
                if (backendError.iframe_code) {
                    errorMessage = `Código Iframe: ${backendError.iframe_code[0]}`;
                } else if (backendError.name) {
                    errorMessage = `Nome: ${backendError.name[0]}`;
                } else if (typeof backendError === 'string') {
                    errorMessage = backendError;
                } else if (backendError.detail) {
                    errorMessage = backendError.detail;
                }
            }
            
            setEditNotification({ 
                type: 'error', 
                message: errorMessage 
            });
        } finally {
            setIsEditing(false);
        }
    };

    // Remover calendário
    const handleRemoveCalendario = async (idToRemove) => {
        const calToRemove = calendarios.find(c => c.id === idToRemove);
        if (!calToRemove) return;
        
        const calNameToRemove = calToRemove.name;
        
        if (!window.confirm(`Tem certeza que deseja remover "${calNameToRemove}"?`)) {
            return;
        }

        setAddNotification(null);
        try {
            await axios.delete(`/calendars/${idToRemove}/`);
            
            setAddNotification({ 
                type: 'info', 
                message: `Calendário "${calNameToRemove}" removido com sucesso.` 
            });
            
            // Atualiza a lista de calendários
            await fetchCalendars(false);

        } catch (error) {
            console.error("Erro ao remover calendário:", error.response?.data || error.message);
            
            setAddNotification({ 
                type: 'error', 
                message: `Erro ao remover o calendário: ${error.response?.data?.detail || 'Falha na comunicação com o servidor.'}` 
            });
        }
    };

    // Função para verificar a URL do iframe
    const checkIframeUrl = (code) => {
        const src = extractSrcFromIframe(code);
        if (!src) return false;
        
        try {
            new URL(src);
            return true;
        } catch (e) {
            return false;
        }
    };

    // --- Renderização ---
    return (
        <Box p="md">
            <Title order={2} mb="xl">📅 Agenda da Empresa</Title>

            <LoadingOverlay 
                visible={isLoadingCalendars} 
                overlayProps={{ radius: "sm", blur: 2 }} 
            />
            
            {fetchError && !isLoadingCalendars && (
                <Alert 
                    color="red" 
                    title="Erro de Carregamento" 
                    icon={<IconAlertCircle size="1.1rem" />} 
                    mb="md" 
                    withCloseButton 
                    onClose={() => setFetchError(null)}
                >
                    {fetchError}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                    <Tabs.Tab 
                        value="visualizar" 
                        leftSection={<IconCalendar size={16} />}
                    >
                        Visualizar
                    </Tabs.Tab>
                    <Tabs.Tab 
                        value="gerenciar" 
                        leftSection={<IconTools size={16} />}
                    >
                        Gerenciar
                    </Tabs.Tab>
                    <Tabs.Tab 
                        value="instrucoes" 
                        leftSection={<IconInfoCircle size={16} />}
                    >
                        Instruções
                    </Tabs.Tab>
                </Tabs.List>

                {/* --- Painel Aba Visualizar --- */}
                <Tabs.Panel value="visualizar" pt="lg">
                    {!isLoadingCalendars && !fetchError && (
                        <Stack gap="md">
                            {calendarios.length > 0 ? (
                                <>
                                    <Grid gutter="md">
                                        <Grid.Col span={{ base: 12, md: 10 }}>
                                            <Select
                                                label="Selecione um calendário para visualizar:"
                                                placeholder="Escolha um calendário"
                                                data={selectOptions}
                                                value={selectedDbId ? selectedDbId.toString() : null}
                                                onChange={(value) => {
                                                    setSelectedDbId(value ? parseInt(value, 10) : null);
                                                    setIframeLoaded(false); // Reset loading state
                                                }}
                                                searchable
                                                clearable
                                                style={{ flexGrow: 1 }}
                                                nothingFoundMessage="Nenhum calendário encontrado"
                                            />
                                        </Grid.Col>
                                        <Grid.Col span={{ base: 12, md: 2 }}>
                                            <Box mt={isMobile ? 0 : 25}>
                                                <Button 
                                                    leftIcon={<IconRefresh size={16} />}
                                                    variant="outline"
                                                    onClick={() => fetchCalendars(false)}
                                                    fullWidth
                                                >
                                                    Atualizar
                                                </Button>
                                            </Box>
                                        </Grid.Col>
                                    </Grid>

                                    {/* Indicador do calendário selecionado */}
                                    {selectedDbId && (
                                        <Paper p="xs" withBorder radius="md" style={{ backgroundColor: '#f8f9fa' }}>
                                            <Group spacing="xs">
                                                <Text size="sm" color="dimmed">Visualizando:</Text>
                                                <Text size="sm" weight={500}>
                                                    {calendarios.find(c => c.id === selectedDbId)?.name}
                                                </Text>
                                            </Group>
                                        </Paper>
                                    )}

                                    {/* Container do iframe com skeleton loader */}
                                    <Paper 
                                        shadow="sm" 
                                        radius="md" 
                                        withBorder 
                                        style={{ overflow: 'hidden', position: 'relative' }}
                                    >
                                        {iframeSrc ? (
                                            <>
                                                {!iframeLoaded && (
                                                    <Box
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            zIndex: 1
                                                        }}
                                                    >
                                                        <Skeleton height={iframeHeight} width="100%" />
                                                    </Box>
                                                )}
                                                <AspectRatio ratio={isMobile ? 4/3 : 16/9} style={{ minHeight: iframeHeight }}>
                                                    <iframe
                                                        key={iframeSrc} // Força recarga se URL mudar
                                                        src={iframeSrc}
                                                        style={{ 
                                                            border: 0, 
                                                            display: 'block', 
                                                            width: '100%', 
                                                            height: '100%'
                                                        }}
                                                        frameBorder="0"
                                                        scrolling="no"
                                                        title={`Google Calendar View`}
                                                        onLoad={() => setIframeLoaded(true)}
                                                    ></iframe>
                                                </AspectRatio>
                                                {/* Botão para abrir em nova guia */}
                                                <Box 
                                                    style={{ 
                                                        position: 'absolute', 
                                                        top: 10, 
                                                        right: 10, 
                                                        zIndex: 10 
                                                    }}
                                                >
                                                    <Tooltip label="Abrir em nova janela">
                                                        <ActionIcon 
                                                            component="a" 
                                                            href={iframeSrc} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            variant="filled"
                                                            color="gray"
                                                            size="md"
                                                        >
                                                            <IconExternalLink size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Box>
                                            </>
                                        ) : (
                                            <Box p="xl" style={{ height: iframeHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Text c="dimmed" ta="center">
                                                    Selecione um calendário para visualizar.
                                                </Text>
                                            </Box>
                                        )}
                                    </Paper>
                                </>
                            ) : (
                                <Notification 
                                    title="Nenhum Calendário" 
                                    color="blue" 
                                    mt="md" 
                                    icon={<IconInfoCircle size="1.1rem"/>}
                                >
                                    Nenhum calendário foi adicionado ainda. Use a aba "Gerenciar".
                                </Notification>
                            )}
                        </Stack>
                    )}
                </Tabs.Panel>

                {/* --- Painel Aba Gerenciar --- */}
                <Tabs.Panel value="gerenciar" pt="lg">
                    {!isLoadingCalendars && !fetchError && (
                        <Grid>
                            {/* Coluna Esquerda: Adicionar */}
                            <Grid.Col span={{ base: 12, md: 7 }}>
                                <Paper shadow="xs" p="lg" withBorder>
                                    <Title order={4} mb="lg">Adicionar Sua Agenda ao Chegou Hub</Title>
                                    <Stack gap="md">
                                        <TextInput
                                            label="Nome (Identificação)"
                                            placeholder="Ex: João Silva"
                                            value={novoNome}
                                            onChange={(event) => setNovoNome(event.currentTarget.value)}
                                            required
                                        />
                                        <Textarea
                                            label="Código Iframe do Google Calendar"
                                            placeholder="Cole aqui o código"
                                            value={novoIframeCode}
                                            onChange={(event) => setNovoIframeCode(event.currentTarget.value)}
                                            required
                                            minRows={3}
                                            autosize
                                        />
                                        {/* Área de Notificação */}
                                        {addNotification && (
                                            <Notification
                                                icon={addNotification.type === 'success' 
                                                    ? <IconCheck size="1.1rem" /> 
                                                    : addNotification.type === 'info' 
                                                        ? <IconInfoCircle size="1.1rem"/> 
                                                        : <IconX size="1.1rem" />
                                                }
                                                color={addNotification.type === 'success' 
                                                    ? 'teal' 
                                                    : addNotification.type === 'info' 
                                                        ? 'blue' 
                                                        : 'red'
                                                }
                                                title={addNotification.type === 'success' 
                                                    ? 'Sucesso' 
                                                    : addNotification.type === 'info' 
                                                        ? 'Info' 
                                                        : 'Erro'
                                                }
                                                onClose={() => setAddNotification(null)}
                                                mt="xs"
                                                withCloseButton
                                            >
                                                {addNotification.message}
                                            </Notification>
                                        )}
                                        <Button
                                            onClick={handleAddCalendario}
                                            loading={isAdding}
                                            fullWidth
                                            mt="md"
                                            leftIcon={<IconCalendar size={16} />}
                                            disabled={!novoNome || !novoIframeCode}
                                        >
                                            Conectar Minha Agenda
                                        </Button>
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Coluna Direita: Lista */}
                            <Grid.Col span={{ base: 12, md: 5 }}>
                                <Paper shadow="xs" p="lg" withBorder>
                                    <Group position="apart" mb="lg">
                                        <Title order={4}>Calendários Cadastrados</Title>
                                        <Badge color="blue" size="lg">{calendarios.length}</Badge>
                                    </Group>
                                    <ScrollArea style={{ height: 350 }}>
                                        {calendarios.length === 0 ? (
                                            <Text c="dimmed" ta="center">Nenhum calendário cadastrado.</Text>
                                        ) : (
                                            <Stack gap="sm">
                                                {calendarios.map((cal) => {
                                                    const calColor = generateCalendarColor(cal.name);
                                                    const isUrlValid = checkIframeUrl(cal.iframe_code);
                                                    
                                                    return (
                                                        <Paper key={cal.id} p="xs" withBorder radius="sm">
                                                            <Group position="apart" noWrap>
                                                                <Box style={{ overflow: 'hidden', flexGrow: 1 }}>
                                                                    <Group spacing="xs">
                                                                        <ColorSwatch color={`var(--mantine-color-${calColor}-6)`} size={16} />
                                                                        <Text fw={500} size="sm" truncate>
                                                                            {cal.name}
                                                                        </Text>
                                                                    </Group>
                                                                    <Group spacing="xs" mt={4}>
                                                                        <IconLink size={12} color={isUrlValid ? "green" : "red"} />
                                                                        <Text c="dimmed" size="xs" truncate style={{ maxWidth: '180px' }}>
                                                                            {extractSrcFromIframe(cal.iframe_code)?.substring(0,35) || '[URL inválida]'}...
                                                                        </Text>
                                                                    </Group>
                                                                </Box>
                                                                <Group spacing={8} noWrap>
                                                                    <Tooltip label="Editar calendário">
                                                                        <ActionIcon
                                                                            variant="light"
                                                                            color="blue"
                                                                            onClick={() => handleOpenEditModal(cal)}
                                                                            size="sm"
                                                                        >
                                                                            <IconPencil size={16} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                    <Tooltip label="Remover calendário">
                                                                        <ActionIcon
                                                                            variant="light"
                                                                            color="red"
                                                                            onClick={() => handleRemoveCalendario(cal.id)}
                                                                            size="sm"
                                                                        >
                                                                            <IconTrash size={16} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                </Group>
                                                            </Group>
                                                        </Paper>
                                                    );
                                                })}
                                            </Stack>
                                        )}
                                    </ScrollArea>
                                </Paper>
                            </Grid.Col>
                        </Grid>
                    )}
                </Tabs.Panel>

                {/* --- Painel Aba Instruções --- */}
                <Tabs.Panel value="instrucoes" pt="lg">
                    <Paper shadow="xs" p="lg" withBorder>
                        <Title order={4} mb="lg">Como Compartilhar sua Agenda no Chegou Hub</Title>
                        <Stack gap="md">
                            <Text>Para que sua agenda apareça no Chegou Hub, você precisa compartilhá-la diretamente pelo Google Calendar com nossa conta de integração.</Text>
                            
                            <Title order={5} mt="lg" mb="sm">Siga estes passos simples:</Title>
                            <List type="ordered" spacing="sm">
                                <List.Item>Acesse o <a href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer">Google Calendar</a> no seu navegador.</List.Item>
                                <List.Item>Na barra lateral esquerda, localize a agenda que deseja compartilhar com a equipe.</List.Item>
                                <List.Item>Passe o mouse sobre o nome da agenda e clique nos três pontinhos (⋮) que aparecem ao lado.</List.Item>
                                <List.Item>Selecione a opção <Code>Configurações e compartilhamento</Code>.</List.Item>
                                <List.Item>Role a página até a seção <Code>Compartilhado com pessoas e grupos</Code> e clique em <Code>Adicionar pessoas e grupos</Code>.</List.Item>
                                <List.Item>Adicione o e-mail: <Code>viniciuschegouoperacional@gmail.com.</Code></List.Item>
                                <List.Item>Em permissões, selecione <Code>Mais detalhes de todos os eventos</Code>.</List.Item>
                                <List.Item>Clique em <Code>Enviar</Code> para concluir o compartilhamento.</List.Item>
                                <List.Item>Role um pouco mais a página até encontrar a seção <Code>Incorporar código</Code> e copie o código exibido.</List.Item>
                            </List>
                            
                            <Title order={5} mt="lg" mb="sm">Adicionando no Chegou Hub:</Title>
                            <List type="ordered" spacing="sm">
                                <List.Item>Vá para a aba <Code>Gerenciar</Code> aqui nesta página.</List.Item>
                                <List.Item>No formulário, digite seu nome no campo <Code>Nome (Identificação)</Code> para que os outros membros possam identificar de quem é a agenda.</List.Item>
                                <List.Item>Cole o código Iframe do Google Calendar.</List.Item>
                                <List.Item>Clique em <Code>Adicionar Calendário</Code>.</List.Item>
                            </List>
                            
                            <Text mt="md">Uma vez adicionada, sua agenda estará disponível na aba <Code>Visualizar</Code> e poderá ser vista pelos outros membros da equipe com as cores configuradas no Google Calendar.</Text>
                        </Stack>
                    </Paper>
                </Tabs.Panel>
            </Tabs>

            {/* Modal de Edição */}
            <Modal 
                opened={editModalOpen} 
                onClose={handleCloseEditModal}
                title={<Text size="lg" weight={700}>Editar Calendário</Text>}
                size="lg"
            >
                <Stack gap="md">
                    <TextInput
                        label="Nome (Identificação)"
                        placeholder="Ex: Marketing, Feriados Nacionais"
                        value={editName}
                        onChange={(event) => setEditName(event.currentTarget.value)}
                        required
                    />
                    <Textarea
                        label="Código Iframe do Google Calendar"
                        placeholder='Cole o código <iframe src="..."></iframe> aqui'
                        value={editIframeCode}
                        onChange={(event) => setEditIframeCode(event.currentTarget.value)}
                        required
                        minRows={4}
                        autosize
                        error={editIframeCode && !checkIframeUrl(editIframeCode) ? "O código não parece conter um URL válido" : null}
                    />
                    {/* Área de Notificação */}
                    {editNotification && (
                        <Notification
                            icon={editNotification.type === 'success' 
                                ? <IconCheck size="1.1rem" /> 
                                : <IconX size="1.1rem" />
                            }
                            color={editNotification.type === 'success' ? 'teal' : 'red'}
                            title={editNotification.type === 'success' ? 'Sucesso' : 'Erro'}
                            onClose={() => setEditNotification(null)}
                            mt="xs"
                            withCloseButton
                        >
                            {editNotification.message}
                        </Notification>
                    )}
                    <Group position="right" mt="md">
                        <Button variant="outline" onClick={handleCloseEditModal}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleEditCalendario} 
                            loading={isEditing}
                            disabled={!editName || !editIframeCode}
                        >
                            Salvar Alterações
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}

export default AgendaPage;