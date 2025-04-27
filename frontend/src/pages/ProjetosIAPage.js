// src/components/ProjetosIA/AIProjectForm.js
import React, { useState } from 'react';
import axios from 'axios';
import { useForm } from '@mantine/form';
import { TextInput, Textarea, Select, Button, Box, Group, LoadingOverlay, Alert, MultiSelect } from '@mantine/core';
// Corrigido a importação do DatePickerInput
import { DatePickerInput } from '@mantine/dates';
import 'dayjs/locale/pt-br';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';

// Opções de status do backend
const statusOptions = [
    'Ativo',
    'Em Manutenção',
    'Arquivado',
    'Backlog',
    'Em Construção',
    'Período de Validação',
];

// Lista fixa de nomes para o MultiSelect de Criadores
const creatorOptions = [
    'Vinícius Darlan', 'Murillo Ribeiro', 'Diretoría', 'Matheus Silva',
    'João Bento', 'Marcos Belisario', 'Felipe Said', 'Natalia Rocha',
    'Ricardo Machado', 'Rafael', 'Sávio Mendes'
];

// URL da API
const API_URL = 'https://chegou-hubb-production.up.railway.app/api';

function AIProjectForm({ onProjectAdded }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const form = useForm({
        initialValues: {
            name: '',
            creation_date: new Date(),
            finalization_date: null,
            description: '',
            status: 'Em Construção',
            project_link: '',
            tools_used: '',
            project_version: 'v1',
            creator_names: [],
        },
        validate: {
            name: (value) => (value.trim().length > 0 ? null : 'Nome do projeto é obrigatório'),
            creation_date: (value) => (value ? null : 'Data de criação é obrigatória'),
            status: (value) => (value ? null : 'Status é obrigatório'),
            project_link: (value) => (!value || /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(value) ? null : 'Link inválido'),
            finalization_date: (value, values) => (value && values.creation_date && value < values.creation_date
                ? 'Data final não pode ser anterior à data de criação'
                : null
            ),
        },
    });

    const handleSubmit = async (values) => {
        setIsSubmitting(true);
        setSubmitError('');

        // Converte array de nomes para string separada por vírgula
        const namesString = Array.isArray(values.creator_names)
                       ? values.creator_names.join(', ')
                       : '';

        const formattedValues = {
            ...values,
            creator_names: namesString,
            creation_date: values.creation_date ? values.creation_date.toISOString().split('T')[0] : null,
            finalization_date: values.finalization_date ? values.finalization_date.toISOString().split('T')[0] : null,
        };

        try {
            // Criar uma instância personalizada do axios com as configurações corretas
            const axiosInstance = axios.create({
                baseURL: API_URL,
                withCredentials: true,
                // Copia os cabeçalhos padrão do axios global
                headers: {
                    ...axios.defaults.headers.common,
                }
            });
            
            // Buscar CSRF token fresco antes de enviar
            await axiosInstance.get('/ensure-csrf/');
            
            // Agora faça a chamada POST com a configuração correta
            const response = await axiosInstance.post('/aiprojects/', 
                formattedValues, 
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
            
            notifications.show({
                title: 'Sucesso!',
                message: `Projeto "${response.data.name}" adicionado com sucesso.`,
                color: 'green',
                icon: <IconCheck size={18} />,
            });
            
            form.reset();
            if (onProjectAdded) {
                onProjectAdded(response.data);
            }
        } catch (err) {
            console.error("Erro ao adicionar projeto:", err.response?.data || err.message);
            
            // Mensagem de erro mais amigável
            let errorMessage = 'Falha ao adicionar o projeto.';
            
            if (err.response?.data?.detail?.includes('CSRF')) {
                errorMessage = 'Erro de autenticação CSRF. Por favor, recarregue a página e tente novamente.';
            } else if (typeof err.response?.data === 'string' && err.response.data.includes('<html')) {
                errorMessage = `Erro do servidor (${err.response.status}): ${err.response.statusText}.`;
            } else if (err.response?.data) {
                const errorMessages = Object.entries(err.response.data)
                    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                    .join(' | ');
                if (errorMessages) errorMessage += ` Detalhes: ${errorMessages}`;

                // Mapear erros para campos do formulário
                Object.entries(err.response.data).forEach(([field, messages]) => {
                    if (form.values.hasOwnProperty(field) || field === 'creator_names') {
                        form.setFieldError(field === 'creator_names' ? 'creator_names' : field, Array.isArray(messages) ? messages[0] : messages);
                    }
                });
            }

            setSubmitError(errorMessage);
            notifications.show({
                title: 'Erro!',
                message: errorMessage.split(' Detalhes:')[0],
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
                <TextInput
                    label="Versão do Projeto"
                    placeholder="Ex: v1.0, v2.alpha"
                    {...form.getInputProps('project_version')}
                    mb="sm"
                />
                <MultiSelect
                    label="Criador(es) do Projeto"
                    placeholder="Selecione um ou mais nomes"
                    data={creatorOptions}
                    searchable
                    clearable
                    {...form.getInputProps('creator_names')}
                    mb="sm"
                />

                <Button type="submit" mt="md" fullWidth loading={isSubmitting}>
                    Adicionar Projeto
                </Button>
            </form>
        </Box>
    );
}

export default AIProjectForm;