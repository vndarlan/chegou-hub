// src/pages/AgendaPage.js
import React, { useState, useEffect } from 'react';
import {
    Box,
    Title,
    Text,
    Tabs,
    Select,
    Checkbox,
    TextInput,
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
    LoadingOverlay // Importado para feedback de carregamento
} from '@mantine/core';
import { IconX, IconCheck, IconTrash, IconCalendar, IconTools, IconInfoCircle, IconAlertCircle } from '@tabler/icons-react';
import axios from 'axios'; // Importado para chamadas API

// Não usamos mais CALENDARIOS_INICIAIS

function AgendaPage() {
    const [activeTab, setActiveTab] = useState('visualizar');
    // Estado para a lista de calendários vinda da API
    const [calendarios, setCalendarios] = useState([]);
    // Estado para o ID do calendário selecionado para visualização
    const [selectedCalendarId, setSelectedCalendarId] = useState(null); // Armazena o google_calendar_id
    const [viewAll, setViewAll] = useState(false);

    // Estados para feedback da API
    const [isLoadingCalendars, setIsLoadingCalendars] = useState(true); // Loading inicial
    const [fetchError, setFetchError] = useState(null); // Erro ao buscar lista

    // Estados para o formulário de Gerenciar
    const [novoNome, setNovoNome] = useState('');
    const [novoEmail, setNovoEmail] = useState(''); // Este será o google_calendar_id
    const [addNotification, setAddNotification] = useState(null); // Notificações add/remove/error
    const [isAdding, setIsAdding] = useState(false); // Loading do botão Adicionar

    // --- Funções da API ---

    // Função para buscar calendários do backend
    const fetchCalendars = async () => {
        setIsLoadingCalendars(true);
        setFetchError(null); // Limpa erro anterior
        console.log("Buscando calendários da API...");
        try {
            // Usa a instância padrão do axios (configurada no index.js)
            const response = await axios.get('/api/calendars/');
            console.log("Calendários recebidos:", response.data);
            setCalendarios(response.data); // Atualiza o estado com dados da API

            // Define a seleção inicial APENAS se não estiver no modo 'viewAll'
            if (!viewAll) {
                 setSelectedCalendarId(response.data.length > 0 ? response.data[0].google_calendar_id : null);
            } else {
                 setSelectedCalendarId(null); // Garante que nada está selecionado se viewAll for true
            }

        } catch (error) {
            console.error("Erro ao buscar calendários:", error.response?.data || error.message);
            setFetchError("Falha ao carregar a lista de calendários. Verifique a conexão ou tente recarregar.");
            setCalendarios([]); // Limpa a lista em caso de erro
            setSelectedCalendarId(null);
        } finally {
            setIsLoadingCalendars(false); // Termina o loading
        }
    };

    // Busca inicial ao montar o componente
    useEffect(() => {
        fetchCalendars();
        // A dependência vazia [] garante que rode apenas uma vez ao montar.
        // O ESLint pode reclamar, mas é o comportamento desejado aqui.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Opções para o Select, geradas a partir do estado 'calendarios'
    const selectOptions = calendarios.map(cal => ({
        value: cal.google_calendar_id, // O valor é o ID do google calendar
        label: cal.name                // O texto exibido é o nome
    }));

    // Função para gerar URL do iframe
    const getIframeSrc = () => {
        if (viewAll && calendarios.length > 0) {
            // Mapeia os IDs, codifica e junta com '&src='
            const todosEmailsEncoded = calendarios.map(cal => encodeURIComponent(cal.google_calendar_id)).join('&src=');
            // Adiciona o primeiro src= manualmente
            return `https://calendar.google.com/calendar/embed?src=${todosEmailsEncoded}&ctz=America%2FSao_Paulo`;
        } else if (selectedCalendarId) {
            // Codifica o ID selecionado
            const selectedEmailEncoded = encodeURIComponent(selectedCalendarId);
            return `https://calendar.google.com/calendar/embed?src=${selectedEmailEncoded}&ctz=America%2FSao_Paulo`;
        }
        // Retorna vazio se nenhuma condição for atendida
        return "";
    };

    // Função para ADICIONAR calendário via API
    const handleAddCalendario = async () => {
        setAddNotification(null); // Limpa notificação anterior
        if (!novoNome || !novoEmail) {
            setAddNotification({ type: 'error', message: 'Por favor, preencha Nome e ID (Email).' });
            return;
        }
        // Validação de duplicidade no frontend (API também valida com unique=True)
        if (calendarios.some(cal => cal.google_calendar_id === novoEmail)) {
            setAddNotification({ type: 'error', message: 'Este ID de calendário já está cadastrado.' });
            return;
        }

        setIsAdding(true); // Mostra loading no botão
        try {
            // Chama a API POST para criar o calendário no backend
            const response = await axios.post('/api/calendars/', {
                name: novoNome.trim(), // Envia nome sem espaços extras
                google_calendar_id: novoEmail.trim() // Envia ID sem espaços extras
            });
            // Sucesso!
            setNovoNome(''); // Limpa o formulário
            setNovoEmail('');
            setAddNotification({ type: 'success', message: `Calendário "${response.data.name}" adicionado!` });
            await fetchCalendars(); // Rebusca a lista para atualizar a UI com o novo item

        } catch (error) {
            console.error("Erro ao adicionar calendário:", error.response?.data || error.message);
            // Tenta extrair a mensagem de erro da API (ex: erro de validação)
            const backendError = error.response?.data;
            let errorMessage = "Erro desconhecido ao adicionar o calendário.";
            if (backendError) {
                if (backendError.google_calendar_id) errorMessage = `ID do Calendário: ${backendError.google_calendar_id[0]}`;
                else if (backendError.name) errorMessage = `Nome: ${backendError.name[0]}`;
                else if (typeof backendError === 'string') errorMessage = backendError;
                else if (backendError.detail) errorMessage = backendError.detail;
            }
            setAddNotification({ type: 'error', message: errorMessage });
        } finally {
            setIsAdding(false); // Esconde loading do botão
        }
    };

    // Função para REMOVER calendário via API
    const handleRemoveCalendario = async (idToRemove) => { // Recebe o ID do *banco de dados*
         // Opcional: Confirmação
         if (!window.confirm(`Tem certeza que deseja remover o calendário "${calendarios.find(c=>c.id === idToRemove)?.name}"?`)) {
              return;
         }

        setAddNotification(null); // Limpa notificações anteriores
        // Idealmente, mostrar um feedback visual que o item está sendo removido
        try {
            // Chama a API DELETE, passando o ID do banco
            await axios.delete(`/api/calendars/${idToRemove}/`);
            // Sucesso!
            setAddNotification({ type: 'info', message: `Calendário removido.` });
            await fetchCalendars(); // Rebusca a lista para atualizar a UI

        } catch (error) {
            console.error("Erro ao remover calendário:", error.response?.data || error.message);
            setAddNotification({ type: 'error', message: "Erro ao remover o calendário." });
        } finally {
            // Esconder feedback de remoção se houver
        }
    };

    const iframeSrc = getIframeSrc(); // Calcula a URL do iframe

    // --- Renderização do Componente ---
    return (
        <Box p="md">
            <Title order={2} mb="xl">📅 Agenda da Empresa</Title>

            {/* Feedback Global de Loading e Erro */}
            <LoadingOverlay visible={isLoadingCalendars} overlayProps={{ radius: "sm", blur: 2 }} />
            {fetchError && !isLoadingCalendars && (
                <Alert color="red" title="Erro de Carregamento" icon={<IconAlertCircle size="1.1rem" />} mb="md" withCloseButton onClose={() => setFetchError(null)}>
                    {fetchError}
                </Alert>
            )}

            {/* Estrutura das Abas */}
            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                    <Tabs.Tab value="visualizar" leftSection={<IconCalendar size={16} />}>
                        Visualizar
                    </Tabs.Tab>
                    <Tabs.Tab value="gerenciar" leftSection={<IconTools size={16} />}>
                        Gerenciar
                    </Tabs.Tab>
                    <Tabs.Tab value="instrucoes" leftSection={<IconInfoCircle size={16} />}>
                        Instruções
                    </Tabs.Tab>
                </Tabs.List>

                {/* --- Painel Aba Visualizar --- */}
                <Tabs.Panel value="visualizar" pt="lg">
                     {/* Só mostra controles se não estiver carregando e não houver erro */}
                     {!isLoadingCalendars && !fetchError && (
                        <Stack gap="md">
                            {calendarios.length > 0 ? (
                                <>
                                    <Select
                                        label="Selecione um calendário para visualizar:"
                                        placeholder="Escolha um calendário"
                                        data={selectOptions} // Usa as opções geradas
                                        value={selectedCalendarId} // Controlado pelo estado
                                        onChange={setSelectedCalendarId} // Atualiza o ID selecionado
                                        disabled={viewAll} // Desabilita se "ver todos" estiver marcado
                                        searchable
                                        clearable // Permite limpar a seleção
                                        nothingFoundMessage="Nenhum calendário encontrado"
                                    />
                                    <Checkbox
                                        label="Visualizar todos os calendários juntos"
                                        checked={viewAll}
                                        onChange={(event) => {
                                            const isChecked = event.currentTarget.checked;
                                            setViewAll(isChecked);
                                            // Se marcar "ver todos", limpa a seleção individual
                                            if (isChecked) {
                                                setSelectedCalendarId(null);
                                            } else if (calendarios.length > 0) {
                                                // Se desmarcar e houver calendários, seleciona o primeiro (ou mantém se já havia um)
                                                 setSelectedCalendarId(selectedCalendarId || calendarios[0].google_calendar_id);
                                            }
                                        }}
                                    />

                                    {iframeSrc ? (
                                        <Paper shadow="sm" radius="md" withBorder style={{ overflow: 'hidden', minHeight: '600px' }}>
                                            <iframe
                                                key={iframeSrc} // Adiciona key para forçar recarga do iframe se URL mudar
                                                src={iframeSrc}
                                                style={{ border: 0, display: 'block', width: '100%', height: '600px' }}
                                                frameBorder="0"
                                                scrolling="no"
                                                title={`Google Calendar ${viewAll ? 'Combinado' : (calendarios.find(c=>c.google_calendar_id === selectedCalendarId)?.name || '')}`}
                                            ></iframe>
                                        </Paper>
                                    ) : (
                                        // Mensagem se não há iframe (nenhum selecionado ou viewAll sem calendários)
                                        <Text c="dimmed" ta="center" mt="xl">
                                             {(viewAll && calendarios.length > 0) ? "Carregando visualização combinada..." : "Selecione um calendário ou marque \"Visualizar todos\"."}
                                        </Text>
                                    )}
                                </>
                            ) : (
                                // Mensagem se a lista de calendários está vazia (após busca)
                                <Notification title="Nenhum Calendário" color="blue" mt="md" icon={<IconInfoCircle size="1.1rem"/>}>
                                    Nenhum calendário foi adicionado ainda. Use a aba "Gerenciar".
                                </Notification>
                            )}
                        </Stack>
                     )}
                </Tabs.Panel>

                {/* --- Painel Aba Gerenciar --- */}
                <Tabs.Panel value="gerenciar" pt="lg">
                     {/* Só mostra conteúdo se não estiver carregando e não houver erro */}
                     {!isLoadingCalendars && !fetchError && (
                        <Grid>
                            {/* Coluna Esquerda: Adicionar */}
                            <Grid.Col span={{ base: 12, md: 7 }}>
                                <Paper shadow="xs" p="lg" withBorder>
                                    <Title order={4} mb="lg">Adicionar Novo Calendário</Title>
                                    <Stack gap="md">
                                        <TextInput
                                            label="Nome (Pessoa/Departamento)"
                                            placeholder="Ex: João Silva ou Marketing"
                                            value={novoNome}
                                            onChange={(event) => setNovoNome(event.currentTarget.value)}
                                            required
                                        />
                                        <TextInput
                                            label="ID do Calendário Google (Email)"
                                            placeholder="endereco.do.calendario@group.calendar.google.com"
                                            value={novoEmail}
                                            onChange={(event) => setNovoEmail(event.currentTarget.value)}
                                            type="email"
                                            required
                                        />
                                        {/* Área de Notificação para Adicionar/Remover */}
                                        {addNotification && (
                                            <Notification
                                                icon={addNotification.type === 'success' ? <IconCheck size="1.1rem" /> : addNotification.type === 'info' ? <IconInfoCircle size="1.1rem"/> : <IconX size="1.1rem" />}
                                                color={addNotification.type === 'success' ? 'teal' : addNotification.type === 'info' ? 'blue' : 'red'}
                                                title={addNotification.type === 'success' ? 'Sucesso' : addNotification.type === 'info' ? 'Info' : 'Erro'}
                                                onClose={() => setAddNotification(null)} // Permite fechar
                                                mt="xs"
                                                withCloseButton
                                            >
                                                {addNotification.message}
                                            </Notification>
                                        )}
                                        <Button
                                            onClick={handleAddCalendario}
                                            loading={isAdding} // Controla o loading do botão
                                            fullWidth
                                            mt="md"
                                            disabled={!novoNome || !novoEmail} // Desabilita se campos vazios
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
                                                    <Paper key={cal.id} p="xs" withBorder radius="sm"> {/* Usa cal.id (PK) como key */}
                                                        <Group justify="space-between">
                                                            <Box style={{ overflow: 'hidden' }}>
                                                                <Text fw={500} size="sm" truncate>{cal.name}</Text>
                                                                <Text c="dimmed" size="xs" truncate>{cal.google_calendar_id}</Text>
                                                            </Box>
                                                            <ActionIcon
                                                                variant="light"
                                                                color="red"
                                                                onClick={() => handleRemoveCalendario(cal.id)} // Passa o ID do banco
                                                                title={`Remover ${cal.name}`}
                                                            >
                                                                <IconTrash size={16} />
                                                            </ActionIcon>
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

                {/* --- Painel Aba Instruções (sem alterações) --- */}
                <Tabs.Panel value="instrucoes" pt="lg">
                     <Paper shadow="xs" p="lg" withBorder>
                        <Title order={4} mb="lg">Como Adicionar um Calendário Google</Title>
                        <Stack gap="md">
                            <Text>Para que um Google Calendar possa ser visualizado aqui, ele precisa ter as permissões de acesso corretas...</Text>
                             <Alert title="Atenção ao Compartilhamento Público" color="yellow" icon={<IconAlertCircle size="1.1rem" />} radius="md">Tornar um calendário público significa que...</Alert>
                            <Title order={5} mt="lg" mb="sm">Passos para Obter o ID (Email) e Compartilhar:</Title>
                             <List type="ordered" spacing="sm">
                                <List.Item>Acesse o <a href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer">Google Calendar</a>...</List.Item>
                                {/* ... Restante das instruções ... */}
                                <List.Item>Copie este <strong>ID da agenda (email)</strong> completo.</List.Item>
                             </List>
                             <Title order={5} mt="lg" mb="sm">Adicionando no Chegou Hub:</Title>
                             <List type="ordered" spacing="sm">
                                <List.Item>Vá para a aba "Gerenciar" aqui nesta página.</List.Item>
                                <List.Item>No formulário "Adicionar Novo Calendário", cole o ID que você copiou no campo <strong>"ID do Calendário Google (Email)"</strong>.</List.Item>
                                {/* ... Restante das instruções ... */}
                             </List>
                             <Text mt="lg">Após seguir estes passos...</Text>
                         </Stack>
                     </Paper>
                </Tabs.Panel>

            </Tabs>
        </Box>
    );
}

export default AgendaPage;