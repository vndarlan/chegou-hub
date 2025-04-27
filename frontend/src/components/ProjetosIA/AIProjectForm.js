// src/components/ProjetosIA/AIProjectForm.js
import React, { useState } from 'react';
import axios from 'axios';
import { useForm } from '@mantine/form';
import { TextInput, Textarea, Select, Button, Box, Group, LoadingOverlay, Alert, MultiSelect } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import 'dayjs/locale/pt-br'; // Import locale for DatePicker
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';

// Use as mesmas opções do backend para Status
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


function AIProjectForm({ onProjectAdded }) {
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
            creator_names: [], // Inicializa como array vazio para MultiSelect
        },
        validate: {
            name: (value) => (value.trim().length > 0 ? null : 'Nome do projeto é obrigatório'),
            creation_date: (value) => (value ? null : 'Data de criação é obrigatória'),
            status: (value) => (value ? null : 'Status é obrigatório'),
             // Validação de URL simples
            project_link: (value) => (!value || /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(value) ? null : 'Link inválido'),
             // Validação de datas
            finalization_date: (value, values) => (value && values.creation_date && value < values.creation_date
                ? 'Data final não pode ser anterior à data de criação'
                : null
            ),
            // Validação opcional para criadores (se necessário)
            // creator_names: (value) => (value.length > 0 ? null : 'Selecione pelo menos um criador'),
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
            // 1. Obter token CSRF em uma operação separada
            const csrfResponse = await axios.get('https://chegou-hubb-production.up.railway.app/api/ensure-csrf/', {
                withCredentials: true
            });
            
            // 2. Extrair o token dos cookies após receber a resposta do ensure-csrf
            let csrfToken = '';
            // Procurar por todos os nomes possíveis do cookie CSRF
            const cookieNames = ['csrftoken', 'csrf_token', 'CSRF-TOKEN', 'XSRF-TOKEN'];
            for (const name of cookieNames) {
                const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
                if (match) {
                    csrfToken = match[2];
                    console.log(`Token CSRF encontrado em cookie ${name}: ${csrfToken.substring(0, 8)}...`);
                    break;
                }
            }
            
            // 3. Fazer a requisição POST com o token obtido
            const response = await axios.post('https://chegou-hubb-production.up.railway.app/api/aiprojects/', 
                formattedValues,
                {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
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
            const apiErrors = err.response?.data;
            
            // Adicionar mais debug para CSRF
            if (err.response?.data?.detail?.includes('CSRF')) {
                console.log('Erro de CSRF detectado. Cookies disponíveis:', document.cookie);
            }
            
            // Tenta obter a mensagem de erro HTML ou padrão
            let errorMessage = 'Falha ao adicionar o projeto.';
            if (typeof err.response?.data === 'string' && err.response.data.includes('<html')) {
                 errorMessage = `Erro do servidor (${err.response.status}): ${err.response.statusText}. Verifique a URL da API ou os logs do servidor.`;
            } else if (apiErrors) {
                 const errorMessages = Object.entries(apiErrors)
                    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                    .join(' | ');
                 if (errorMessages) errorMessage += ` Detalhes: ${errorMessages}`;

                 // Tenta mapear erros para campos do formulário (opcional)
                 Object.entries(apiErrors).forEach(([field, messages]) => {
                    if (form.values.hasOwnProperty(field) || field === 'creator_names') { // Inclui creator_names
                         form.setFieldError(field === 'creator_names' ? 'creator_names' : field, Array.isArray(messages) ? messages[0] : messages);
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
                <TextInput
                    label="Versão do Projeto"
                    placeholder="Ex: v1.0, v2.alpha"
                    {...form.getInputProps('project_version')}
                    mb="sm" // Adiciona margem inferior
                />
                <MultiSelect
                    label="Criador(es) do Projeto"
                    placeholder="Selecione um ou mais nomes"
                    data={creatorOptions}
                    searchable
                    clearable
                    {...form.getInputProps('creator_names')} // Usa o mesmo nome de campo do form
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