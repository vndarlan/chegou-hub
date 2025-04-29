// src/pages/AgendaPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Title,
    Text,
    Tabs,
    Select,
    Checkbox,
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
    SimpleGrid,
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
    IconEye,
    IconEyeOff,
    IconRefresh,
    IconLink,
    IconExternalLink
} from '@tabler/icons-react';
import axios from 'axios';

// Função melhorada para extrair SRC do Iframe com flexibilidade para diferentes formatos
const extractSrcFromIframe = (iframeString) => {
    if (!iframeString || typeof iframeString !== 'string') return null;
    
    // Regex para capturar o src com tolerância para diferentes formatos de aspas e espaços
    const matchSrc = iframeString.match(/src\s*=\s*["']([^"']+)["']/i);
    
    if (matchSrc && matchSrc[1]) {
        // Se encontrou o src diretamente, retorna
        return matchSrc[1];
    }
    
    // Caso não encontre o padrão normal, procura por qualquer URL no código
    const urlMatch = iframeString.match(/(https?:\/\/[^\s"'<>]+)/i);
    return urlMatch ? urlMatch[1] : null;
};

// Função para gerar cores aleatórias com base no nome do calendário (consistentes)
const generateCalendarColor = (calendarName) => {
    if (!calendarName) return 'blue';
    
    // Lista de cores do Mantine que não são muito claras nem escuras
    const colors = ['blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'teal', 'green', 'cyan'];
    
    // Usar o nome para gerar um índice consistente
    let hash = 0;
    for (let i = 0; i < calendarName.length; i++) {
        hash = calendarName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Converte o hash para um índice na lista de cores
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
};

function AgendaPage() {
    // Estados principais
    const [activeTab, setActiveTab] = useState('visualizar');
    const [calendarios, setCalendarios] = useState([]);
    const [selectedDbId, setSelectedDbId] = useState(null);
    const [viewAll, setViewAll] = useState(false);
    const [visibleCalendars, setVisibleCalendars] = useState({});
    const [isLoadingCalendars, setIsLoadingCalendars] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [selectOptions, setSelectOptions] = useState([]); // Novo estado para as opções do select

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

    // Buscar calendários - CORRIGIDO: removido visibleCalendars das dependências
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
                if (!viewAll && calendarData.length > 0) {
                    setSelectedDbId(calendarData[0].id);
                } else {
                    setSelectedDbId(null);
                }
            } else {
                // Se não for para selecionar o primeiro, garante que a seleção atual ainda é válida
                if (selectedDbId && !calendarData.some(c => c.id === selectedDbId)) {
                    setSelectedDbId(calendarData.length > 0 ? calendarData[0].id : null);
                } else if (!selectedDbId && !viewAll && calendarData.length > 0) {
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
    }, [viewAll, selectedDbId]); // IMPORTANTE: Removido visibleCalendars das dependências para evitar loop infinito

    // Busca inicial
    useEffect(() => {
        fetchCalendars(true);
    }, [fetchCalendars]);
    
    // NOVO: Efeito separado para gerenciar visibilidade dos calendários
    useEffect(() => {
        // Inicializar estados de visibilidade para novos calendários
        if (calendarios.length > 0) {
            setVisibleCalendars(prev => {
                const newVisibleCalendars = {...prev};
                calendarios.forEach(cal => {
                    if (newVisibleCalendars[cal.id] === undefined) {
                        newVisibleCalendars[cal.id] = true;
                    }
                });
                return newVisibleCalendars;
            });
        }
    }, [calendarios]); // Este efeito depende apenas de calendarios

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

    // --- Lógica de Geração da URL do Iframe (melhorada) ---
    const iframeSrc = useMemo(() => {
        if (viewAll && calendarios.length > 0) {
            // Filtra apenas os calendários marcados como visíveis
            const visibleCals = calendarios.filter(cal => visibleCalendars[cal.id]);
            
            if (visibleCals.length === 0) {
                return null; // Nenhum calendário visível
            }
            
            // Extrai URLs válidas, codifica e junta
            const validSrcs = visibleCals
                .map(cal => {
                    const src = extractSrcFromIframe(cal.iframe_code);
                    if (!src) return null;
                    
                    // Tenta extrair apenas a query string 'src' da URL completa
                    try {
                        const url = new URL(src);
                        // Se for um URL do Google Calendar e tiver um parâmetro 'src'
                        if (url.hostname.includes('calendar.google.com') && url.searchParams.has('src')) {
                            return encodeURIComponent(url.searchParams.get('src'));
                        }
                        // Caso contrário, apenas codifica o URL inteiro
                        return encodeURIComponent(src);
                    } catch (e) {
                        console.warn("Não foi possível parsear URL do iframe:", src, e);
                        // Tenta usar o src diretamente se não conseguir parsear
                        return encodeURIComponent(src);
                    }
                })
                .filter(encodedSrc => encodedSrc !== null);

            if (validSrcs.length > 0) {
                // Monta a URL base + múltiplos parâmetros src=
                return `https://calendar.google.com/calendar/embed?src=${validSrcs.join('&src=')}&ctz=America%2FSao_Paulo`;
            }
        } else if (selectedDbId) {
            // Encontra o calendário selecionado pelo ID do banco
            const selectedCal = calendarios.find(cal => cal.id === selectedDbId);
            if (selectedCal) {
                // Extrai a URL src do código iframe dele
                const extractedSrc = extractSrcFromIframe(selectedCal.iframe_code);
                console.log(`SRC Extraído para ID ${selectedDbId}:`, extractedSrc);
                return extractedSrc;
            }
        }
        return null;
    }, [viewAll, selectedDbId, calendarios, visibleCalendars]);

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

    // Atualizar visibilidade de um calendário
    const toggleCalendarVisibility = (calId) => {
        setVisibleCalendars(prev => ({
            ...prev,
            [calId]: !prev[calId]
        }));
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

    // --- Componente para Calendar Card (na visualização de todos) ---
    const CalendarCard = ({ calendar }) => {
        if (!calendar || typeof calendar !== 'object') {
            return null; // Não renderiza nada se o calendário não for válido
        }
        
        const isVisible = calendar.id !== undefined ? visibleCalendars[calendar.id] : false;
        const calColor = generateCalendarColor(calendar.name || '');
        
        return (
            <Paper withBorder p="xs" radius="md" shadow="sm">
                <Group position="apart" mb="xs">
                    <Group spacing="xs">
                        <ColorSwatch color={`var(--mantine-color-${calColor}-6)`} size={16} />
                        <Text weight={500} size="sm" lineClamp={1}>
                            {calendar.name || 'Calendário sem nome'}
                        </Text>
                    </Group>
                    <Group spacing={8}>
                        <Tooltip label={isVisible ? "Ocultar calendário" : "Mostrar calendário"}>
                            <ActionIcon 
                                size="sm" 
                                color={isVisible ? "blue" : "gray"}
                                onClick={() => toggleCalendarVisibility(calendar.id)}
                            >
                                {isVisible ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Editar calendário">
                            <ActionIcon 
                                size="sm" 
                                color="orange"
                                onClick={() => handleOpenEditModal(calendar)}
                            >
                                <IconPencil size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Remover calendário">
                            <ActionIcon 
                                size="sm" 
                                color="red"
                                onClick={() => handleRemoveCalendario(calendar.id)}
                            >
                                <IconTrash size={16} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>
                <Text size="xs" color="dimmed" lineClamp={1}>
                    URL: {extractSrcFromIframe(calendar.iframe_code)?.substring(0,35) || '[URL inválida]'}...
                </Text>
            </Paper>
        );
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

                {/* --- Painel Aba Visualizar (Aprimorado) --- */}
                <Tabs.Panel value="visualizar" pt="lg">
                    {!isLoadingCalendars && !fetchError && (
                        <Stack gap="md">
                            {calendarios.length > 0 ? (
                                <>
                                    <Grid gutter="md">
                                        <Grid.Col span={{ base: 12, md: 8 }}>
                                            <Group position="apart" align="flex-end" mb="xs">
                                                <Select
                                                    label="Selecione um calendário para visualizar:"
                                                    placeholder="Escolha um calendário"
                                                    data={selectOptions}
                                                    value={selectedDbId ? selectedDbId.toString() : null}
                                                    onChange={(value) => setSelectedDbId(value ? parseInt(value, 10) : null)}
                                                    disabled={viewAll}
                                                    searchable
                                                    clearable
                                                    style={{ flexGrow: 1 }}
                                                    nothingFoundMessage="Nenhum calendário encontrado"
                                                />
                                                <Button 
                                                    leftIcon={<IconRefresh size={16} />}
                                                    variant="outline"
                                                    onClick={() => fetchCalendars(false)}
                                                    compact
                                                >
                                                    Atualizar
                                                </Button>
                                            </Group>
                                        </Grid.Col>
                                        <Grid.Col span={{ base: 12, md: 4 }}>
                                            <Checkbox
                                                label={<Text weight={500}>Visualizar todos os calendários juntos</Text>}
                                                description="Combine múltiplos calendários em uma única visualização"
                                                checked={viewAll}
                                                onChange={(event) => {
                                                    const isChecked = event.currentTarget.checked;
                                                    setViewAll(isChecked);
                                                    if (isChecked) {
                                                        setSelectedDbId(null);
                                                    } else if (calendarios.length > 0 && !selectedDbId) {
                                                        setSelectedDbId(calendarios[0].id);
                                                    }
                                                }}
                                                size="md"
                                            />
                                        </Grid.Col>
                                    </Grid>

                                    {/* Seção de visibilidade dos calendários (aparece apenas quando "Visualizar todos" está marcado) */}
                                    {viewAll && (
                                        <Paper shadow="xs" p="md" radius="md" withBorder>
                                            <Group position="apart" mb="sm">
                                                <Text weight={500} size="sm">Gerenciar visibilidade dos calendários</Text>
                                                <Badge 
                                                    color="blue" 
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    {Object.values(visibleCalendars).filter(v => v).length} 
                                                    {' '}
                                                    calendários visíveis
                                                </Badge>
                                            </Group>
                                            <SimpleGrid 
                                                cols={{ base: 1, sm: 2, md: 3 }}
                                                spacing="sm"
                                            >
                                                {calendarios.map(cal => (
                                                    <CalendarCard 
                                                        key={cal.id} 
                                                        calendar={cal} 
                                                    />
                                                ))}
                                            </SimpleGrid>
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
                                                    {viewAll && calendarios.length > 0
                                                        ? "Nenhum calendário visível selecionado. Ative pelo menos um calendário acima."
                                                        : "Selecione um calendário ou marque \"Visualizar todos\"."}
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

                {/* --- Painel Aba Gerenciar (Aprimorado) --- */}
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

                {/* --- Painel Aba Instruções (Atualizado com o processo correto) --- */}
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
                                <List.Item>Selecione a opção <b>"Configurações e compartilhamento"</b>.</List.Item>
                                <List.Item>Role a página até a seção "Compartilhado com pessoas e grupos" e clique em "Adicionar pessoas e grupos".</List.Item>
                                <List.Item>Adicione o e-mail: <Code>viniciuschegouoperacional@gmail.com.</Code></List.Item>
                                <List.Item>Em permissões, selecione <b>"Ver todos os detalhes do evento"</b>.</List.Item>
                                <List.Item>Clique em <b>"Enviar"</b> para concluir o compartilhamento.</List.Item>
                                <List.Item>Role um pouco mais a página até encontrar a seção <b>"Incorporar código"</b> e copie o código exibido.</List.Item>
                            </List>
                            
                            <Title order={5} mt="lg" mb="sm">Adicionando no Chegou Hub:</Title>
                            <List type="ordered" spacing="sm">
                                <List.Item>Vá para a aba "Gerenciar" aqui nesta página.</List.Item>
                                <List.Item>No formulário, digite seu nome no campo <b>"Nome (Identificação)"</b> para que os outros membros possam identificar de quem é a agenda.</List.Item>
                                <List.Item>Cole o código Iframe do Google Calendar.</List.Item>
                                <List.Item>Clique em <b>"Adicionar Calendário"</b>.</List.Item>
                            </List>
                                                        
                            <Text mt="md">Uma vez adicionada, sua agenda estará disponível na aba "Visualizar" e poderá ser vista pelos outros membros da equipe.</Text>
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