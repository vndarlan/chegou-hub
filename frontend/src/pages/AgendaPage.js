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
    List, // Adicionado para instruções
    Code, // Adicionado para instruções
    Alert // Adicionado para instruções
} from '@mantine/core';
import { IconX, IconCheck, IconTrash, IconCalendar, IconTools, IconInfoCircle, IconAlertCircle } from '@tabler/icons-react'; // Adicionado IconInfoCircle, IconAlertCircle

// --- Dados iniciais VAZIOS ---
// Nenhum calendário pré-cadastrado por padrão
const CALENDARIOS_INICIAIS = [];

function AgendaPage() {
    const [activeTab, setActiveTab] = useState('visualizar'); // Começa em visualizar
    const [calendarios, setCalendarios] = useState(CALENDARIOS_INICIAIS);
    const [selectedEmail, setSelectedEmail] = useState(null); // Começa como null
    const [viewAll, setViewAll] = useState(false);

    // Estados para o formulário de Gerenciar
    const [novoNome, setNovoNome] = useState('');
    const [novoEmail, setNovoEmail] = useState('');
    const [addNotification, setAddNotification] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    // Opções para o Select de visualização (recalculado quando 'calendarios' muda)
    const selectOptions = calendarios.map(cal => ({
        value: cal.email,
        label: cal.nome
    }));

    // Função para gerar URL do iframe (sem alterações)
    const getIframeSrc = () => {
        if (viewAll) {
            const todosEmails = calendarios.map(cal => cal.email.replace("@", "%40")).join('&src='); // Corrigido para múltiplos src
             // Precisa adicionar o primeiro src= manualmente se houver algum email
            return calendarios.length > 0 ? `https://calendar.google.com/calendar/embed?src=${todosEmails}&ctz=America%2FSao_Paulo` : "";
        } else if (selectedEmail) {
            return `https://calendar.google.com/calendar/embed?src=${selectedEmail.replace("@", "%40")}&ctz=America%2FSao_Paulo`;
        }
        return "";
    };

    // Função para adicionar calendário (sem alterações)
    const handleAddCalendario = () => {
        setAddNotification(null);
        if (!novoNome || !novoEmail) {
            setAddNotification({ type: 'error', message: 'Por favor, preencha Nome e Email.' });
            return;
        }
        if (calendarios.some(cal => cal.email === novoEmail)) {
            setAddNotification({ type: 'error', message: 'Este email já está cadastrado.' });
            return;
        }
        setIsAdding(true);
        const newId = Date.now();
        const novoCalendario = { id: newId, nome: novoNome, email: novoEmail };
        const updatedCalendarios = [...calendarios, novoCalendario];
        setCalendarios(updatedCalendarios); // Atualiza a lista
        setNovoNome('');
        setNovoEmail('');
        setAddNotification({ type: 'success', message: `Calendário de ${novoNome} adicionado!` });

        // Se for o primeiro calendário adicionado ou nenhum estava selecionado, seleciona-o
        if (calendarios.length === 0 || !selectedEmail) {
            setSelectedEmail(novoEmail);
        }

        setIsAdding(false);
    };

    // Função para remover calendário (sem alterações)
    const handleRemoveCalendario = (idToRemove) => {
        const calendarioRemovido = calendarios.find(cal => cal.id === idToRemove);
        const updatedCalendarios = calendarios.filter(cal => cal.id !== idToRemove);
        setCalendarios(updatedCalendarios); // Atualiza a lista

        // Se o calendário removido era o selecionado, seleciona o primeiro da nova lista (se houver)
        if (selectedEmail === calendarioRemovido?.email) {
            setSelectedEmail(updatedCalendarios.length > 0 ? updatedCalendarios[0].email : null);
        }
    };

    // Efeito para garantir que um email esteja selecionado se houver calendários
    useEffect(() => {
        // Se não há email selecionado E existem calendários na lista
        if (!selectedEmail && calendarios.length > 0) {
            setSelectedEmail(calendarios[0].email); // Seleciona o primeiro
        }
        // Se há um email selecionado, mas ele NÃO existe mais na lista (foi removido)
        else if (selectedEmail && !calendarios.some(c => c.email === selectedEmail)) {
            setSelectedEmail(calendarios.length > 0 ? calendarios[0].email : null); // Seleciona o primeiro (se houver) ou null
        }
    }, [calendarios, selectedEmail]); // Roda quando 'calendarios' ou 'selectedEmail' mudam


    const iframeSrc = getIframeSrc();

    return (
        <Box p="md">
            <Title order={2} mb="xl">📅 Agenda da Empresa</Title>

            {/* --- Estrutura das Abas --- */}
            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                    <Tabs.Tab value="visualizar" leftSection={<IconCalendar size={16} />}>
                        Visualizar
                    </Tabs.Tab>
                    <Tabs.Tab value="gerenciar" leftSection={<IconTools size={16} />}>
                        Gerenciar
                    </Tabs.Tab>
                    {/* --- NOVA ABA --- */}
                    <Tabs.Tab value="instrucoes" leftSection={<IconInfoCircle size={16} />}>
                        Instruções
                    </Tabs.Tab>
                </Tabs.List>

                {/* --- Painel Aba Visualizar --- */}
                <Tabs.Panel value="visualizar" pt="lg">
                    <Stack gap="md">
                        {calendarios.length > 0 ? (
                            <>
                                <Select
                                    label="Selecione um calendário para visualizar:"
                                    placeholder="Escolha um calendário"
                                    data={selectOptions}
                                    value={selectedEmail}
                                    onChange={setSelectedEmail}
                                    disabled={viewAll || !selectedEmail} // Desabilita também se não houver seleção
                                    searchable
                                    nothingFoundMessage="Nenhum calendário encontrado"
                                />
                                <Checkbox
                                    label="Visualizar todos os calendários juntos"
                                    checked={viewAll}
                                    onChange={(event) => {
                                        setViewAll(event.currentTarget.checked);
                                        // Se marcar "ver todos", limpa a seleção individual para evitar confusão
                                        if (event.currentTarget.checked) {
                                            setSelectedEmail(null);
                                        } else if (calendarios.length > 0) {
                                            // Se desmarcar e houver calendários, seleciona o primeiro
                                            setSelectedEmail(calendarios[0].email);
                                        }
                                     }}
                                />

                                {iframeSrc ? (
                                    <Paper shadow="sm" radius="md" withBorder style={{ overflow: 'hidden', minHeight: '600px' /* Garante altura mínima */ }}>
                                        <iframe
                                            src={iframeSrc}
                                            style={{ border: 0, display: 'block', width: '100%', height: '600px' }}
                                            frameBorder="0"
                                            scrolling="no"
                                            title={`Google Calendar ${viewAll ? 'Combinado' : (calendarios.find(c=>c.email === selectedEmail)?.nome || '')}`}
                                        ></iframe>
                                    </Paper>
                                ) : (
                                     <Text c="dimmed" ta="center" mt="xl">
                                        {viewAll ? "Nenhum calendário cadastrado para visualização combinada." : "Selecione um calendário ou marque \"Visualizar todos\"."}
                                     </Text>
                                )}
                            </>
                        ) : (
                            <Notification title="Aviso" color="yellow" mt="md" icon={<IconAlertCircle size="1.1rem"/>}>
                                Nenhum calendário cadastrado. Vá para a aba "Gerenciar" para adicionar um, ou consulte a aba "Instruções".
                            </Notification>
                        )}
                    </Stack>
                </Tabs.Panel>

                {/* --- Painel Aba Gerenciar --- */}
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
                                        required
                                    />
                                    <TextInput
                                        label="Email do Calendário Google (ID)"
                                        placeholder="endereco.do.calendario@group.calendar.google.com"
                                        value={novoEmail}
                                        onChange={(event) => setNovoEmail(event.currentTarget.value)}
                                        type="email"
                                        required
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
                                        <Text c="dimmed" ta="center">Nenhum calendário.</Text>
                                    ) : (
                                        <Stack gap="sm">
                                            {calendarios.map((cal) => (
                                                <Paper key={cal.id} p="xs" withBorder radius="sm">
                                                    <Group justify="space-between">
                                                        <Box style={{ overflow: 'hidden' /* Evita overflow de texto longo */ }}>
                                                            <Text fw={500} size="sm" truncate>{cal.nome}</Text> {/* Truncate para nomes longos */}
                                                            <Text c="dimmed" size="xs" truncate>{cal.email}</Text> {/* Truncate para emails longos */}
                                                        </Box>
                                                        <ActionIcon
                                                            variant="light"
                                                            color="red"
                                                            onClick={() => handleRemoveCalendario(cal.id)}
                                                            title={`Remover ${cal.nome}`}
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

                {/* --- Painel Aba Instruções --- */}
                <Tabs.Panel value="instrucoes" pt="lg">
                     <Paper shadow="xs" p="lg" withBorder>
                        <Title order={4} mb="lg">Como Adicionar um Calendário Google</Title>
                        <Stack gap="md">
                            <Text>
                                Para que um Google Calendar possa ser visualizado aqui, ele precisa ter as permissões de acesso corretas.
                                A maneira mais comum para incorporação é torná-lo **público**.
                            </Text>
                            <Alert title="Atenção ao Compartilhamento Público" color="yellow" icon={<IconAlertCircle size="1.1rem" />} radius="md">
                                Tornar um calendário público significa que **qualquer pessoa na internet** poderá ver os detalhes dos eventos (a menos que você configure para mostrar apenas "livre/ocupado"). Use essa opção com cuidado, especialmente para calendários com informações sensíveis. Considere criar um calendário específico para divulgação, se necessário.
                            </Alert>

                            <Title order={5} mt="lg" mb="sm">Passos para Obter o ID (Email) e Compartilhar:</Title>
                            <List type="ordered" spacing="sm">
                                <List.Item>Acesse o <a href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer">Google Calendar</a> no seu navegador.</List.Item>
                                <List.Item>Na barra lateral esquerda, encontre o calendário que você deseja adicionar.</List.Item>
                                <List.Item>Passe o mouse sobre o nome do calendário e clique nos três pontos verticais (⋮) que aparecem.</List.Item>
                                <List.Item>No menu, selecione "Configurações e compartilhamento".</List.Item>
                                <List.Item>
                                    Na seção **"Permissões de acesso a eventos"**:
                                    <List withPadding listStyleType='disc' mt={5}>
                                        <List.Item>Marque a opção **"Disponibilizar ao público"**.</List.Item>
                                        <List.Item>Ao lado, geralmente é recomendado escolher **"Ver apenas informações de livre/ocupado (ocultar detalhes)"** para privacidade, mas se precisar mostrar os detalhes do evento aqui, selecione "Ver todos os detalhes do evento".</List.Item>
                                    </List>
                                </List.Item>
                                <List.Item>Role a página um pouco mais para baixo até a seção **"Integrar agenda"**.</List.Item>
                                <List.Item>
                                    Procure pelo campo **"ID da agenda"**. Este ID geralmente se parece com um endereço de email.
                                    <Code block mt={5}>email_pessoal@gmail.com</Code>
                                    <Text size='sm'>Ou, para calendários secundários/compartilhados:</Text>
                                    <Code block mt={5}>sequencia_longa_de_letras_numeros@group.calendar.google.com</Code>
                                </List.Item>
                                <List.Item>Copie este **ID da agenda (email)** completo.</List.Item>
                            </List>

                            <Title order={5} mt="lg" mb="sm">Adicionando no Chegou Hub:</Title>
                            <List type="ordered" spacing="sm">
                                <List.Item>Vá para a aba "Gerenciar" aqui nesta página.</List.Item>
                                <List.Item>No formulário "Adicionar Novo Calendário", cole o ID que você copiou no campo **"Email do Calendário Google (ID)"**.</List.Item>
                                <List.Item>Digite um nome fácil de identificar no campo **"Nome (Pessoa/Departamento)"** (Ex: "Marketing", "Feriados Empresa").</List.Item>
                                <List.Item>Clique no botão **"Adicionar Calendário"**.</List.Item>
                            </List>

                            <Text mt="lg">
                                Após seguir estes passos, o calendário deverá aparecer na lista em "Gerenciar" e poderá ser selecionado na aba "Visualizar". Pode levar alguns instantes para o Google atualizar as permissões.
                            </Text>
                        </Stack>
                    </Paper>
                </Tabs.Panel>

            </Tabs>
        </Box>
    );
}

export default AgendaPage;