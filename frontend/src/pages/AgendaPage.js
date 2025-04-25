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
    ActionIcon, // Para botão de remover
    ScrollArea // Para a lista de calendários
} from '@mantine/core';
import { IconX, IconCheck, IconTrash, IconCalendar, IconTools } from '@tabler/icons-react'; // <--- ADICIONADO IconTools

// Dados iniciais (simulando modo local ou DB vazio inicial)
// O ID é importante para a remoção
const CALENDARIOS_INICIAIS = [
    { id: 1, nome: "Calendário Operacional", email: "viniciuschegouoperacional@gmail.com" }
];

function AgendaPage() {
    const [activeTab, setActiveTab] = useState('visualizar');
    const [calendarios, setCalendarios] = useState(CALENDARIOS_INICIAIS);
    const [selectedEmail, setSelectedEmail] = useState(calendarios.length > 0 ? calendarios[0].email : null); // Seleciona o primeiro por padrão
    const [viewAll, setViewAll] = useState(false);

    // Estados para o formulário de Gerenciar
    const [novoNome, setNovoNome] = useState('');
    const [novoEmail, setNovoEmail] = useState('');
    const [addNotification, setAddNotification] = useState(null); // { type, message }
    const [isAdding, setIsAdding] = useState(false); // Para estado de loading do botão

    // Opções para o Select de visualização
    const selectOptions = calendarios.map(cal => ({
        value: cal.email,
        label: cal.nome
    }));

    // Função para gerar URL do iframe
    const getIframeSrc = () => {
        if (viewAll) {
            const todosEmails = calendarios.map(cal => cal.email.replace("@", "%40")).join(',');
            return `https://calendar.google.com/calendar/embed?src=${todosEmails}&ctz=America%2FSao_Paulo`;
        } else if (selectedEmail) {
            return `https://calendar.google.com/calendar/embed?src=${selectedEmail.replace("@", "%40")}&ctz=America%2FSao_Paulo`;
        }
        return ""; // Retorna vazio se nada estiver selecionado
    };

    // Função para adicionar calendário
    const handleAddCalendario = () => {
        setAddNotification(null); // Limpa notificação anterior
        if (!novoNome || !novoEmail) {
            setAddNotification({ type: 'error', message: 'Por favor, preencha Nome e Email.' });
            return;
        }
        // Verifica email duplicado
        if (calendarios.some(cal => cal.email === novoEmail)) {
            setAddNotification({ type: 'error', message: 'Este email já está cadastrado.' });
            return;
        }

        setIsAdding(true); // Inicia loading (simulado)

        // Simula adição (no futuro, seria uma chamada API)
        const newId = Date.now(); // Gera ID simples baseado no tempo
        const novoCalendario = { id: newId, nome: novoNome, email: novoEmail };

        // Atualiza o estado
        setCalendarios([...calendarios, novoCalendario]);

        // Limpa o formulário
        setNovoNome('');
        setNovoEmail('');
        setAddNotification({ type: 'success', message: `Calendário de ${novoNome} adicionado!` });

        // Se for o primeiro calendário adicionado, seleciona-o
        if (calendarios.length === 0) {
            setSelectedEmail(novoEmail);
        }

        setIsAdding(false); // Termina loading
    };

    // Função para remover calendário
    const handleRemoveCalendario = (idToRemove) => {
        setCalendarios(calendarios.filter(cal => cal.id !== idToRemove));
        // Se o calendário removido era o selecionado, limpa a seleção (ou seleciona outro)
        if (selectedEmail === calendarios.find(cal => cal.id === idToRemove)?.email) {
            setSelectedEmail(calendarios.length > 1 ? calendarios.filter(cal => cal.id !== idToRemove)[0].email : null);
        }
        // Poderia adicionar notificação de remoção aqui
    };

    // Atualiza o email selecionado quando as opções mudam (ex: após remover)
    useEffect(() => {
        if (!selectedEmail && calendarios.length > 0) {
            setSelectedEmail(calendarios[0].email);
        } else if (selectedEmail && !calendarios.some(c => c.email === selectedEmail)) {
            // Se o selecionado foi removido, seleciona o primeiro (se houver)
            setSelectedEmail(calendarios.length > 0 ? calendarios[0].email : null);
        }
    }, [calendarios, selectedEmail]);


    const iframeSrc = getIframeSrc();

    return (
        <Box p="md">
            <Title order={2} mb="xl">📅 Agenda da Empresa</Title>

            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                    <Tabs.Tab value="visualizar" leftSection={<IconCalendar size={16} />}>
                        Visualizar
                    </Tabs.Tab>
                    <Tabs.Tab value="gerenciar" leftSection={<IconTools size={16} />}>
                        Gerenciar
                    </Tabs.Tab>
                </Tabs.List>

                {/* Aba Visualizar */}
                <Tabs.Panel value="visualizar" pt="lg">
                    <Stack gap="md">
                        {calendarios.length > 0 ? (
                            <>
                                <Select
                                    label="Selecione um calendário para visualizar:"
                                    placeholder="Escolha um calendário"
                                    data={selectOptions}
                                    value={selectedEmail}
                                    onChange={setSelectedEmail} // Atualiza o email selecionado
                                    disabled={viewAll} // Desabilita se "ver todos" estiver marcado
                                    searchable
                                    nothingFoundMessage="Nenhum calendário encontrado"
                                />
                                <Checkbox
                                    label="Visualizar todos os calendários juntos"
                                    checked={viewAll}
                                    onChange={(event) => setViewAll(event.currentTarget.checked)}
                                />

                                {iframeSrc ? (
                                    <Paper shadow="sm" radius="md" withBorder style={{ overflow: 'hidden' }}>
                                        {/* O iframe precisa de altura definida */}
                                        <iframe
                                            src={iframeSrc}
                                            style={{ border: 0, display: 'block' }} // display block remove espaço extra abaixo
                                            width="100%"
                                            height="600"
                                            frameBorder="0"
                                            scrolling="no"
                                            title={`Google Calendar ${viewAll ? 'Combinado' : selectedEmail}`}
                                        ></iframe>
                                    </Paper>
                                ) : (
                                    <Text c="dimmed" ta="center" mt="xl">Selecione um calendário ou marque "Visualizar todos".</Text>
                                )}
                            </>
                        ) : (
                            <Notification title="Aviso" color="yellow" mt="md">
                                Nenhum calendário cadastrado. Vá para a aba "Gerenciar" para adicionar.
                            </Notification>
                        )}
                    </Stack>
                </Tabs.Panel>

                {/* Aba Gerenciar */}
                <Tabs.Panel value="gerenciar" pt="lg">
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
                                    />
                                    <TextInput
                                        label="Email do Calendário Google"
                                        placeholder="endereco.do.calendario@group.calendar.google.com"
                                        value={novoEmail}
                                        onChange={(event) => setNovoEmail(event.currentTarget.value)}
                                        type="email"
                                    />
                                    {addNotification && (
                                        <Notification
                                            icon={addNotification.type === 'success' ? <IconCheck size="1.1rem" /> : <IconX size="1.1rem" />}
                                            color={addNotification.type === 'success' ? 'teal' : 'red'}
                                            title={addNotification.type === 'success' ? 'Sucesso' : 'Erro'}
                                            onClose={() => setAddNotification(null)}
                                            mt="xs"
                                        >
                                            {addNotification.message}
                                        </Notification>
                                    )}
                                    <Button
                                        onClick={handleAddCalendario}
                                        loading={isAdding}
                                        fullWidth
                                        mt="md"
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
                                <ScrollArea style={{ height: 350 }}> {/* Altura definida para scroll */}
                                    {calendarios.length === 0 ? (
                                        <Text c="dimmed" ta="center">Nenhum calendário.</Text>
                                    ) : (
                                        <Stack gap="sm">
                                            {calendarios.map((cal) => (
                                                <Paper key={cal.id} p="xs" withBorder radius="sm">
                                                    <Group justify="space-between">
                                                        <Box>
                                                            <Text fw={500} size="sm">{cal.nome}</Text>
                                                            <Text c="dimmed" size="xs">{cal.email}</Text>
                                                        </Box>
                                                        <ActionIcon
                                                            variant="light" // ou "subtle"
                                                            color="red"
                                                            onClick={() => handleRemoveCalendario(cal.id)}
                                                            title={`Remover ${cal.nome}`} // Tooltip para acessibilidade
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
                </Tabs.Panel>
            </Tabs>
        </Box>
    );
}

export default AgendaPage;