// src/components/ProjetosIA/AIProjectForm.js
import React, { useState } from 'react';
import axios from 'axios';
import { useForm } from '@mantine/form';
import { TextInput, Textarea, Select, Button, Box, Group, LoadingOverlay, Alert } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import 'dayjs/locale/pt-br'; // Import locale for DatePicker
import { notifications } from '@mantine/notifications'; // Assuming you have notifications setup
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';

// Use as mesmas opções do backend
const statusOptions = [
    'Ativo',
    'Em Manutenção',
    'Arquivado',
    'Backlog',
    'Em Construção',
    'Período de Validação',
];

// Se buscar usuários, use o prop 'users', senão, deixe vazio por enquanto
function AIProjectForm({ onProjectAdded, users = [] }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const form = useForm({
        initialValues: {
            name: '',
            creation_date: new Date(), // Default to today
            finalization_date: null,
            description: '',
            status: 'Em Construção', // Default status
            project_link: '',
            tools_used: '',
            project_version: 'v1', // Default version
            creator_names: '', // Campo de texto para nomes
            // creator: users.length > 0 ? users[0].value : '', // Se usar select de usuários
        },
        validate: {
            name: (value) => (value.trim().length > 0 ? null : 'Nome do projeto é obrigatório'),
            creation_date: (value) => (value ? null : 'Data de criação é obrigatória'),
            status: (value) => (value ? null : 'Status é obrigatório'),
             // Validação de URL simples
            project_link: (value) => (!value || /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(value) ? null : 'Link inválido'),
             // Validação de datas (opcional, mas bom ter)
            finalization_date: (value, values) => (value && values.creation_date && value < values.creation_date
                ? 'Data final não pode ser anterior à data de criação'
                : null
            ),
        },
    });

    const handleSubmit = async (values) => {
        setIsSubmitting(true);
        setSubmitError('');

        // Formata datas para YYYY-MM-DD se necessário pela API
        const formattedValues = {
            ...values,
            creation_date: values.creation_date ? values.creation_date.toISOString().split('T')[0] : null,
            finalization_date: values.finalization_date ? values.finalization_date.toISOString().split('T')[0] : null,
        };

        try {
            const response = await axios.post('/api/aiprojects/', formattedValues);
            notifications.show({
                title: 'Sucesso!',
                message: `Projeto "${response.data.name}" adicionado com sucesso.`,
                color: 'green',
                icon: <IconCheck size={18} />,
            });
            form.reset(); // Limpa o formulário
            if (onProjectAdded) {
                onProjectAdded(response.data); // Informa o componente pai
            }
        } catch (err) {
            console.error("Erro ao adicionar projeto:", err.response?.data || err.message);
            const apiErrors = err.response?.data;
            let errorMessage = 'Falha ao adicionar o projeto.';

            // Tenta extrair erros específicos da API
            if (apiErrors) {
                 const errorMessages = Object.entries(apiErrors)
                    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                    .join(' | ');
                 if (errorMessages) errorMessage += ` Detalhes: ${errorMessages}`;

                 // Tenta mapear erros para campos do formulário (opcional)
                 Object.entries(apiErrors).forEach(([field, messages]) => {
                    if (form.values.hasOwnProperty(field)) {
                        form.setFieldError(field, Array.isArray(messages) ? messages[0] : messages);
                    }
                 });
            }

            setSubmitError(errorMessage);
             notifications.show({
                 title: 'Erro!',
                 message: errorMessage.split(' Detalhes:')[0], // Mensagem mais curta para notificação
                 color: 'red',
                 icon: <IconAlertCircle size={18} />,
             });

        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box pos="relative">
            <LoadingOverlay visible={isSubmitting} overlayProps={{ radius: "sm", blur: 2 }} />
            <form onSubmit={form.onSubmit(handleSubmit)}>
                {submitError && (
                    <Alert icon={<IconAlertCircle size="1rem" />} title="Erro no Envio" color="red" mb="md" withCloseButton onClose={() => setSubmitError('')}>
                        {submitError}
                    </Alert>
                )}

                <TextInput
                    label="Nome do Projeto"
                    placeholder="Ex: Sistema de Recomendação V2"
                    withAsterisk
                    {...form.getInputProps('name')}
                    mb="sm"
                />
                <Group grow mb="sm">
                    <DatePickerInput
                        label="Data de Criação"
                        placeholder="Selecione a data"
                        locale="pt-br"
                        valueFormat="DD/MM/YYYY"
                        withAsterisk
                        {...form.getInputProps('creation_date')}
                    />
                    <DatePickerInput
                        label="Data de Finalização (Opcional)"
                        placeholder="Selecione a data"
                        locale="pt-br"
                        valueFormat="DD/MM/YYYY"
                        clearable
                        {...form.getInputProps('finalization_date')}
                    />
                </Group>
                <Textarea
                    label="Descrição Curta"
                    placeholder="Objetivo principal do projeto, tecnologias chave..."
                    {...form.getInputProps('description')}
                    mb="sm"
                    autosize
                    minRows={2}
                />
                 <Select
                    label="Status"
                    placeholder="Selecione o status atual"
                    data={statusOptions}
                    withAsterisk
                    allowDeselect={false}
                    {...form.getInputProps('status')}
                    mb="sm"
                />
                 <TextInput
                    label="Link do Projeto (Opcional)"
                    placeholder="https://github.com/seu-repo ou https://projeto.dominio.com"
                    {...form.getInputProps('project_link')}
                    mb="sm"
                />
                 <TextInput
                    label="Ferramentas Utilizadas"
                    placeholder="Ex: Python, TensorFlow, React, Docker"
                    {...form.getInputProps('tools_used')}
                    mb="sm"
                />
                <Group grow mb="sm">
                    <TextInput
                        label="Versão do Projeto"
                        placeholder="Ex: v1.0, v2.alpha"
                        {...form.getInputProps('project_version')}
                    />
                    {/* Opção 1: Campo de Texto para nomes */}
                     <TextInput
                         label="Criador(es) do Projeto (Nomes)"
                         placeholder="Ex: João Silva, Maria Souza"
                         {...form.getInputProps('creator_names')}
                     />
                    {/* Opção 2: Select (precisa buscar 'users' e endpoint /api/users/) */}
                    {/* <Select
                        label="Criador Principal"
                        placeholder="Selecione o usuário"
                        data={users}
                        disabled={users.length === 0}
                        searchable
                        {...form.getInputProps('creator')}
                    /> */}
                 </Group>

                <Button type="submit" mt="md" fullWidth loading={isSubmitting}>
                    Adicionar Projeto
                </Button>
            </form>
        </Box>
    );
}

export default AIProjectForm;