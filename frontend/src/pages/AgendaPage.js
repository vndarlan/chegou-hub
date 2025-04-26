// src/pages/AgendaPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Adicionado useCallback, useMemo
import {
    Box,
    Title,
    Text,
    Tabs,
    Select,
    Checkbox,
    TextInput,
    Textarea, // <<<<<< IMPORTADO Textarea
    Button,
    Grid,
    Stack,
    Paper,
    Notification,
    Group,
    ActionIcon,
    ScrollArea,
    List,
    Code, // Mantido caso queira usar nas instruções
    Alert,
    LoadingOverlay
} from '@mantine/core';
import { IconX, IconCheck, IconTrash, IconCalendar, IconTools, IconInfoCircle, IconAlertCircle } from '@tabler/icons-react';
import axios from 'axios';

// Função auxiliar para extrair SRC do Iframe
const extractSrcFromIframe = (iframeString) => {
    if (!iframeString || typeof iframeString !== 'string') return null;
    // Regex para encontrar src="..." de forma mais segura
    const match = iframeString.match(/<iframe.*?src="([^"]+)"/i);
    // Retorna a URL capturada (grupo 1) ou null se não encontrar
    return match ? match[1] : null;
};


function AgendaPage() {
    const [activeTab, setActiveTab] = useState('visualizar');
    const [calendarios, setCalendarios] = useState([]); // Armazena { id, name, iframe_code }

    // Armazena o ID do banco de dados do calendário selecionado
    const [selectedDbId, setSelectedDbId] = useState(null);
    const [viewAll, setViewAll] = useState(false);

    const [isLoadingCalendars, setIsLoadingCalendars] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // Estados para o formulário
    const [novoNome, setNovoNome] = useState('');
    const [novoIframeCode, setNovoIframeCode] = useState(''); // <<<<<< NOVO ESTADO para o textarea
    const [addNotification, setAddNotification] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    // --- Funções da API ---

    // Usando useCallback para memoizar a função e evitar recriações desnecessárias
    const fetchCalendars = useCallback(async (selectFirst = true) => {
        setIsLoadingCalendars(true);
        setFetchError(null);
        console.log("Buscando calendários (iframe) da API...");
        try {
            const response = await axios.get('/calendars/'); // URL relativa correta
            console.log("Calendários (iframe) recebidos:", response.data);
            setCalendarios(response.data);

            // Define seleção inicial baseado no ID do banco se selectFirst for true
            if (selectFirst) {
                if (!viewAll && response.data.length > 0) {
                    setSelectedDbId(response.data[0].id);
                } else {
                    setSelectedDbId(null);
                }
            } else {
                 // Se não for para selecionar o primeiro, garante que a seleção atual ainda é válida
                 if (selectedDbId && !response.data.some(c => c.id === selectedDbId)) {
                      setSelectedDbId(response.data.length > 0 ? response.data[0].id : null); // Seleciona primeiro se o anterior sumiu
                 } else if (!selectedDbId && !viewAll && response.data.length > 0) {
                     setSelectedDbId(response.data[0].id); // Seleciona o primeiro se nada estava selecionado
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
    }, [viewAll, selectedDbId]); // Adicionadas dependências relevantes para useCallback

    // Busca inicial
    useEffect(() => {
        fetchCalendars(true); // Busca e seleciona o primeiro
    }, [fetchCalendars]); // Depende da função memoizada

    // Opções para o Select (usando ID do banco como valor)
    const selectOptions = useMemo(() => calendarios.map(cal => ({
        value: cal.id.toString(), // Valor é o ID do banco (convertido para string)
        label: cal.name
    })), [calendarios]); // Recalcula apenas se 'calendarios' mudar

    // --- Lógica de Geração da URL do Iframe ---
    const iframeSrc = useMemo(() => {
        if (viewAll && calendarios.length > 0) {
            // Extrai URLs válidas, codifica e junta
            const validSrcs = calendarios
                .map(cal => extractSrcFromIframe(cal.iframe_code)) // Extrai src de cada um
                .filter(src => src !== null) // Remove os que falharam
                .map(src => {
                     // Tenta extrair apenas a query string 'src' da URL completa
                     try {
                          const url = new URL(src);
                          const googleSrc = url.searchParams.get('src');
                          return googleSrc ? encodeURIComponent(googleSrc) : null; // Retorna só o valor do parâmetro src
                     } catch (e) {
                          console.warn("Não foi possível parsear URL do iframe:", src, e);
                          return null; // Ignora se não for URL válida
                     }
                })
                .filter(encodedSrc => encodedSrc !== null); // Remove os que falharam no parse

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
                return extractedSrc; // Usa a URL extraída diretamente
            }
        }
        return null; // Retorna null se não houver src para mostrar
    }, [viewAll, selectedDbId, calendarios]); // Depende desses estados

    // --- Funções de Manipulação (Adicionar/Remover) ---

    const handleAddCalendario = async () => {
        setAddNotification(null);
        if (!novoNome || !novoIframeCode) {
            setAddNotification({ type: 'error', message: 'Por favor, preencha Nome e Código Iframe.' });
            return;
        }
        // Validação básica no frontend
        if (!novoIframeCode.includes('<iframe') || !novoIframeCode.includes('src=')) {
            setAddNotification({ type: 'error', message: 'O código fornecido não parece um iframe válido.' });
            return;
        }

        setIsAdding(true);
        try {
            const response = await axios.post('/calendars/', { // URL relativa correta
                name: novoNome.trim(),
                iframe_code: novoIframeCode.trim() // Envia o código iframe
            });
            setNovoNome('');
            setNovoIframeCode(''); // Limpa textarea
            setAddNotification({ type: 'success', message: `Calendário "${response.data.name}" adicionado!` });
            await fetchCalendars(false); // Rebusca a lista sem resetar a seleção se possível

        } catch (error) {
            console.error("Erro ao adicionar calendário (iframe):", error.response?.data || error.message);
            const backendError = error.response?.data;
            let errorMessage = "Erro desconhecido ao adicionar o calendário.";
             if (backendError) {
                 if (backendError.iframe_code) errorMessage = `Código Iframe: ${backendError.iframe_code[0]}`; // Erro específico do campo
                 else if (backendError.name) errorMessage = `Nome: ${backendError.name[0]}`;
                 else if (typeof backendError === 'string') errorMessage = backendError;
                 else if (backendError.detail) errorMessage = backendError.detail;
             }
            setAddNotification({ type: 'error', message: errorMessage });
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveCalendario = async (idToRemove) => {
        const calNameToRemove = calendarios.find(c => c.id === idToRemove)?.name || 'este calendário';
        if (!window.confirm(`Tem certeza que deseja remover "${calNameToRemove}"?`)) {
             return;
        }

        setAddNotification(null);
        try {
            await axios.delete(`/calendars/${idToRemove}/`); // URL relativa correta
            setAddNotification({ type: 'info', message: `Calendário removido.` });
            await fetchCalendars(false); // Rebusca a lista sem resetar a seleção se possível

        } catch (error) {
            console.error("Erro ao remover calendário (iframe):", error.response?.data || error.message);
            setAddNotification({ type: 'error', message: "Erro ao remover o calendário." });
        }
    };

    // --- Renderização ---
    return (
        <Box p="md">
            <Title order={2} mb="xl">📅 Agenda da Empresa</Title>

            <LoadingOverlay visible={isLoadingCalendars} overlayProps={{ radius: "sm", blur: 2 }} />
            {fetchError && !isLoadingCalendars && (
                <Alert color="red" title="Erro de Carregamento" icon={<IconAlertCircle size="1.1rem" />} mb="md" withCloseButton onClose={() => setFetchError(null)}>
                    {fetchError}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                    <Tabs.Tab value="visualizar" leftSection={<IconCalendar size={16} />}>Visualizar</Tabs.Tab>
                    <Tabs.Tab value="gerenciar" leftSection={<IconTools size={16} />}>Gerenciar</Tabs.Tab>
                    <Tabs.Tab value="instrucoes" leftSection={<IconInfoCircle size={16} />}>Instruções</Tabs.Tab>
                </Tabs.List>

                {/* --- Painel Aba Visualizar --- */}
                <Tabs.Panel value="visualizar" pt="lg">
                    {!isLoadingCalendars && !fetchError && (
                        <Stack gap="md">
                            {calendarios.length > 0 ? (
                                <>
                                    <Select
                                        label="Selecione um calendário para visualizar:"
                                        placeholder="Escolha um calendário"
                                        data={selectOptions}
                                        // Converte ID para string para compatibilidade com value do Select
                                        value={selectedDbId ? selectedDbId.toString() : null}
                                        // Converte o valor recebido (string) de volta para número (ID)
                                        onChange={(value) => setSelectedDbId(value ? parseInt(value, 10) : null)}
                                        disabled={viewAll}
                                        searchable
                                        clearable
                                        nothingFoundMessage="Nenhum calendário encontrado"
                                    />
                                    <Checkbox
                                        label="Visualizar todos os calendários juntos"
                                        checked={viewAll}
                                        onChange={(event) => {
                                            const isChecked = event.currentTarget.checked;
                                            setViewAll(isChecked);
                                            if (isChecked) {
                                                setSelectedDbId(null); // Limpa seleção individual
                                            } else if (calendarios.length > 0 && !selectedDbId) {
                                                 // Se desmarcar e nada estava selecionado, seleciona o primeiro
                                                setSelectedDbId(calendarios[0].id);
                                            }
                                        }}
                                    />

                                    {iframeSrc ? ( // Verifica se temos uma URL válida para mostrar
                                        <Paper shadow="sm" radius="md" withBorder style={{ overflow: 'hidden', minHeight: '600px' }}>
                                            <iframe
                                                key={iframeSrc} // Força recarga se URL mudar
                                                src={iframeSrc} // Usa a URL extraída/construída
                                                style={{ border: 0, display: 'block', width: '100%', height: '600px' }}
                                                frameBorder="0"
                                                scrolling="no"
                                                title={`Google Calendar View`} // Título genérico
                                            ></iframe>
                                        </Paper>
                                    ) : (
                                        <Text c="dimmed" ta="center" mt="xl">
                                            {isLoadingCalendars ? "Carregando..." : (viewAll && calendarios.length > 0) ? "Nenhum código iframe válido encontrado para visualização combinada." : "Selecione um calendário ou marque \"Visualizar todos\"."}
                                        </Text>
                                    )}
                                </>
                            ) : (
                                <Notification title="Nenhum Calendário" color="blue" mt="md" icon={<IconInfoCircle size="1.1rem"/>}>
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
                                    <Title order={4} mb="lg">Adicionar Novo Calendário (via Iframe)</Title>
                                    <Stack gap="md">
                                        <TextInput
                                            label="Nome (Identificação)"
                                            placeholder="Ex: Marketing, Feriados Nacionais"
                                            value={novoNome}
                                            onChange={(event) => setNovoNome(event.currentTarget.value)}
                                            required
                                        />
                                        {/* <<<<<< CAMPO TEXTAREA PARA IFRAME >>>>>> */}
                                        <Textarea
                                            label="Código Iframe do Google Calendar"
                                            placeholder='Cole o código <iframe src="..."></iframe> aqui'
                                            value={novoIframeCode}
                                            onChange={(event) => setNovoIframeCode(event.currentTarget.value)}
                                            required
                                            minRows={4} // Altura mínima
                                            autosize // Ajusta altura automaticamente
                                        />
                                        {/* Área de Notificação */}
                                        {addNotification && (
                                            <Notification /* ... (código da notificação igual ao anterior) ... */
                                               icon={addNotification.type === 'success' ? <IconCheck size="1.1rem" /> : addNotification.type === 'info' ? <IconInfoCircle size="1.1rem"/> : <IconX size="1.1rem" />}
                                               color={addNotification.type === 'success' ? 'teal' : addNotification.type === 'info' ? 'blue' : 'red'}
                                               title={addNotification.type === 'success' ? 'Sucesso' : addNotification.type === 'info' ? 'Info' : 'Erro'}
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
                                            disabled={!novoNome || !novoIframeCode} // Desabilita se campos vazios
                                        >
                                            Adicionar Calendário
                                        </Button>
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Coluna Direita: Lista */}
                            <Grid.Col span={{ base: 12, md: 5 }}>
                                <Paper shadow="xs" p="lg" withBorder>
                                    <Title order={4} mb="lg">Calendários Cadastrados</Title>
                                    <ScrollArea style={{ height: 350 }}>
                                        {calendarios.length === 0 ? (
                                            <Text c="dimmed" ta="center">Nenhum calendário cadastrado.</Text>
                                        ) : (
                                            <Stack gap="sm">
                                                {calendarios.map((cal) => (
                                                    <Paper key={cal.id} p="xs" withBorder radius="sm">
                                                        <Group justify="space-between">
                                                            <Box style={{ overflow: 'hidden', maxWidth: '80%' }}>
                                                                <Text fw={500} size="sm" truncate>{cal.name}</Text>
                                                                {/* Mostra preview do src extraído */}
                                                                <Text c="dimmed" size="xs" truncate>
                                                                    Src: {extractSrcFromIframe(cal.iframe_code)?.substring(0,50) || '[inválido]'}...
                                                                </Text>
                                                            </Box>
                                                            <ActionIcon
                                                                variant="light" color="red"
                                                                onClick={() => handleRemoveCalendario(cal.id)}
                                                                title={`Remover ${cal.name}`}
                                                            > <IconTrash size={16} /> </ActionIcon>
                                                        </Group>
                                                    </Paper>
                                                ))}
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
                        <Title order={4} mb="lg">Como Adicionar um Calendário Google (via Iframe)</Title>
                        <Stack gap="md">
                            <Text>Para que um Google Calendar possa ser visualizado aqui, ele precisa ter as permissões de acesso corretas definidas por você no Google.</Text>
                            <Alert title="Permissões de Acesso" color="yellow" icon={<IconAlertCircle size="1.1rem" />} radius="md">
                                O conteúdo exibido dependerá das permissões que você definiu para o calendário no Google (Público, Compartilhado, etc.). Certifique-se de que as permissões permitem a visualização desejada.
                            </Alert>
                            <Title order={5} mt="lg" mb="sm">Passos para Obter o Código Iframe:</Title>
                             <List type="ordered" spacing="sm">
                                <List.Item>Acesse o <a href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer">Google Calendar</a> no seu navegador.</List.Item>
                                <List.Item>Na barra lateral esquerda, encontre o calendário desejado.</List.Item>
                                <List.Item>Passe o mouse sobre ele, clique nos três pontos (⋮) e escolha "Configurações e compartilhamento".</List.Item>
                                <List.Item>Role a página até a seção **"Integrar agenda"**.</List.Item>
                                <List.Item>Localize a caixa de texto com o título **"Incorporar agenda"**. Ela conterá um código começando com <Code>{'<iframe src=...'}</Code>.</List.Item>
                                <List.Item>Clique dentro dessa caixa e copie **todo o código HTML** presente nela (Ctrl+C ou Cmd+C).</List.Item>
                            </List>
                             <Title order={5} mt="lg" mb="sm">Adicionando no Chegou Hub:</Title>
                             <List type="ordered" spacing="sm">
                                <List.Item>Vá para a aba "Gerenciar" aqui nesta página.</List.Item>
                                <List.Item>No formulário, cole o código HTML completo que você copiou no campo **"Código Iframe do Google Calendar"**.</List.Item>
                                <List.Item>Digite um nome fácil de identificar no campo **"Nome (Identificação)"**.</List.Item>
                                <List.Item>Clique no botão **"Adicionar Calendário"**.</List.Item>
                             </List>
                             <Text mt="lg">O calendário deverá aparecer na lista e poderá ser selecionado na aba "Visualizar".</Text>
                         </Stack>
                     </Paper>
                </Tabs.Panel>

            </Tabs>
        </Box>
    );
}

export default AgendaPage;