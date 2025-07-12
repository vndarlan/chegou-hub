// frontend/src/features/ia/ProjetoDashboard.js - VERSÃO CORRIGIDA COMPLETA
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import {
    Box, Grid, Title, Text, Button, Group, Stack, Card, Badge, 
    Modal, TextInput, Textarea, Select, MultiSelect, NumberInput,
    LoadingOverlay, Alert, Notification, ActionIcon, Tabs, 
    Progress, Timeline, Tooltip, Switch, Paper,
    Menu, Divider, ScrollArea, Table, RingProgress, BarChart,
    LineChart, PieChart, Flex, Container, SimpleGrid
} from '@mantine/core';
import {
    IconPlus, IconFilter, IconDownload, IconEdit, IconArchive,
    IconCopy, IconVersions, IconEye, IconChartBar, IconCoin,
    IconClock, IconUsers, IconTool, IconCheck, IconX, IconSearch,
    IconSortAscending, IconSortDescending, IconRefresh, IconSettings,
    IconChevronDown, IconActivity, IconTrendingUp, IconTarget,
    IconBuilding, IconPriority, IconComplexity, IconCalendar,
    IconFileText, IconLink, IconTag, IconBrain, IconRobot
} from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

// === COMPONENTES AUXILIARES ===

// Badge de Status com cores
const StatusBadge = ({ status }) => {
    const colors = {
        'ativo': 'green',
        'arquivado': 'gray',
        'manutencao': 'yellow'
    };
    
    const labels = {
        'ativo': 'Ativo',
        'arquivado': 'Arquivado',
        'manutencao': 'Manutenção'
    };
    
    return <Badge color={colors[status]} variant="filled">{labels[status]}</Badge>;
};

// Badge de Prioridade
const PrioridadeBadge = ({ prioridade }) => {
    const colors = {
        'alta': 'red',
        'media': 'yellow',
        'baixa': 'blue'
    };
    
    const labels = {
        'alta': 'Alta',
        'media': 'Média',
        'baixa': 'Baixa'
    };
    
    return <Badge color={colors[prioridade]} variant="light">{labels[prioridade]}</Badge>;
};

// Card de Projeto
const ProjetoCard = React.memo(({ projeto, onEdit, onView, onArchive, onDuplicate, onNewVersion, onChangeStatus, userPermissions }) => {
    const metricas = projeto.metricas_financeiras;
    const podeVerFinanceiro = userPermissions?.pode_ver_financeiro && !metricas?.acesso_restrito;
    
    return (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Card.Section withBorder inheritPadding py="xs">
                <Group justify="space-between">
                    <Text weight={500} size="lg">{projeto.nome}</Text>
                    <Group gap="xs">
                        <StatusBadge status={projeto.status} />
                        <PrioridadeBadge prioridade={projeto.prioridade} />
                    </Group>
                </Group>
            </Card.Section>

            {/* CORREÇÃO: Descrição com formatação preservada */}
            <Text 
                size="sm" 
                c="dimmed" 
                mt="sm" 
                lineClamp={2}
                style={{ whiteSpace: 'pre-wrap' }}
            >
                {projeto.descricao}
            </Text>

            <SimpleGrid cols={2} mt="md" spacing="xs">
                <Box>
                    <Text size="xs" c="dimmed">Tipo</Text>
                    <Text size="sm" weight={500}>{projeto.tipo_projeto}</Text>
                </Box>
                <Box>
                    <Text size="xs" c="dimmed">Departamentos</Text>
                    <Group gap="xs">
                        {projeto.departamentos_display?.length > 0 ? (
                            projeto.departamentos_display.slice(0, 2).map((dept, i) => (
                                <Badge key={i} size="xs">{dept}</Badge>
                            ))
                        ) : (
                            <Text size="sm" weight={500}>{projeto.departamento_atendido || 'N/A'}</Text>
                        )}
                        {projeto.departamentos_display?.length > 2 && (
                            <Badge size="xs">+{projeto.departamentos_display.length - 2}</Badge>
                        )}
                    </Group>
                </Box>
                <Box>
                    <Text size="xs" c="dimmed">Horas Investidas</Text>
                    <Text size="sm" weight={500}>{projeto.horas_totais}h</Text>
                </Box>
                <Box>
                    <Text size="xs" c="dimmed">Usuários Impactados</Text>
                    <Text size="sm" weight={500}>{projeto.usuarios_impactados}</Text>
                </Box>
            </SimpleGrid>

            {podeVerFinanceiro && (
                <Paper withBorder p="xs" mt="sm" bg="blue.0">
                    <Group justify="space-between">
                        <Box>
                            <Text size="xs" c="dimmed">ROI</Text>
                            <Text size="sm" weight={700} c={metricas.roi > 0 ? 'green' : 'red'}>
                                {metricas.roi}%
                            </Text>
                        </Box>
                        <Box>
                            <Text size="xs" c="dimmed">Economia/Mês</Text>
                            <Text size="sm" weight={500}>
                                R$ {metricas.economia_mensal?.toLocaleString('pt-BR')}
                            </Text>
                        </Box>
                    </Group>
                </Paper>
            )}

            <Group mt="md" gap="xs">
                <Text size="xs" c="dimmed">Criadores:</Text>
                {projeto.criadores_nomes.slice(0, 2).map((nome, i) => (
                    <Badge key={i} size="xs" variant="outline">{nome}</Badge>
                ))}
                {projeto.criadores_nomes.length > 2 && (
                    <Badge size="xs" variant="outline">+{projeto.criadores_nomes.length - 2}</Badge>
                )}
            </Group>

            <Group justify="space-between" mt="md">
                <Group gap="xs">
                    <Text size="xs" c="dimmed">v{projeto.versao_atual}</Text>
                    <Text size="xs" c="dimmed">•</Text>
                    <Text size="xs" c="dimmed">
                        {projeto.dias_sem_atualizacao} dias
                    </Text>
                </Group>
                
                <Menu shadow="md" width={220}>
                    <Menu.Target>
                        <ActionIcon variant="subtle">
                            <IconChevronDown size={16} />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item leftSection={<IconEye size={14} />} onClick={() => onView(projeto)}>
                            Visualizar
                        </Menu.Item>
                        <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onEdit(projeto)}>
                            Editar
                        </Menu.Item>
                        <Menu.Item leftSection={<IconVersions size={14} />} onClick={() => onNewVersion(projeto)}>
                            Nova Versão
                        </Menu.Item>
                        <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => onDuplicate(projeto)}>
                            Duplicar
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Label>Alterar Status</Menu.Label>
                        {projeto.status !== 'ativo' && (
                            <Menu.Item 
                                leftSection={<IconActivity size={14} />} 
                                onClick={() => onChangeStatus(projeto, 'ativo')}
                                color="green"
                            >
                                Ativar
                            </Menu.Item>
                        )}
                        {projeto.status !== 'manutencao' && (
                            <Menu.Item 
                                leftSection={<IconTool size={14} />} 
                                onClick={() => onChangeStatus(projeto, 'manutencao')}
                                color="yellow"
                            >
                                Em Manutenção
                            </Menu.Item>
                        )}
                        {projeto.status !== 'arquivado' && (
                            <Menu.Item 
                                leftSection={<IconArchive size={14} />} 
                                onClick={() => onChangeStatus(projeto, 'arquivado')}
                                color="orange"
                            >
                                Arquivar
                            </Menu.Item>
                        )}
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Card>
    );
});

// Modal de Formulário de Projeto - COMPLETAMENTE CORRIGIDO
const ProjetoFormModal = ({ opened, onClose, projeto, onSave, opcoes, loading }) => {
    const [formData, setFormData] = useState({
        // === CAMPOS BÁSICOS ===
        nome: '',
        descricao: '',
        tipo_projeto: '',
        departamentos_atendidos: [],
        criadores_ids: [],
        ferramentas_tecnologias: [],
        link_projeto: '',
        usuarios_impactados: 0,
        frequencia_uso: 'diario',
        
        // === CAMPOS DE DETALHES ===
        horas_totais: 0,
        prioridade: 'media',
        complexidade: 'media',
        
        // === NOVOS CAMPOS FINANCEIROS ===
        custo_hora_empresa: 80,
        custo_apis_mensal: 0,
        lista_ferramentas: [],
        horas_economizadas_mes: 0,
        valor_monetario_economizado_mes: 0,
        data_break_even: null,
        nivel_autonomia: 'total',
        
        // === CAMPOS LEGADOS ===
        valor_hora: 150,
        custo_ferramentas_mensais: 0,
        custo_apis_mensais: 0,
        custo_infraestrutura_mensais: 0,
        custo_manutencao_mensais: 0,
        economia_horas_mensais: 0,
        valor_hora_economizada: 50,
        reducao_erros_mensais: 0,
        economia_outros_mensais: 0,
        
        // === DOCUMENTAÇÃO ===
        documentacao_tecnica: '',
        licoes_aprendidas: '',
        proximos_passos: '',
        data_revisao: null
    });

    // CORREÇÃO: useEffect para carregar TODOS os campos do projeto
    useEffect(() => {
        if (projeto) {
            setFormData({
                ...projeto,
                criadores_ids: projeto.criadores?.map(c => c.id?.toString()) || [],
                departamentos_atendidos: projeto.departamentos_atendidos || [],
                horas_totais: Number(projeto.horas_totais) || 0,
                custo_hora_empresa: Number(projeto.custo_hora_empresa) || 80
            });
        } else {
            setFormData({
                nome: '', descricao: '', tipo_projeto: '', departamentos_atendidos: [],
                criadores_ids: [], horas_totais: 0, prioridade: 'media', complexidade: 'media',
                custo_hora_empresa: 80, custo_apis_mensal: 0, lista_ferramentas: [],
                horas_economizadas_mes: 0, valor_monetario_economizado_mes: 0,
                nivel_autonomia: 'total', frequencia_uso: 'diario',
                ferramentas_tecnologias: [], usuarios_impactados: 0,
                documentacao_tecnica: '', licoes_aprendidas: '', proximos_passos: '',
                horas_desenvolvimento: 0, horas_testes: 0, horas_documentacao: 0, horas_deploy: 0
            });
        }
    }, [projeto]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    // CORREÇÃO: Verificações de segurança para prevenir erro de map
    const tipoOptions = opcoes?.tipo_projeto_choices || [];
    const deptOptions = opcoes?.departamento_choices || [];
    const prioridadeOptions = opcoes?.prioridade_choices || [];
    const complexidadeOptions = opcoes?.complexidade_choices || [];
    const frequenciaOptions = opcoes?.frequencia_choices || [];
    const userOptions = (opcoes?.usuarios_disponiveis || []).map(u => ({
        value: u.id.toString(),
        label: u.nome_completo
    }));

    // CORREÇÃO: Verificar se opcoes existe antes de renderizar o modal
    if (!opcoes) {
        return (
            <Modal opened={opened} onClose={onClose} title="Carregando...">
                <LoadingOverlay visible={true} />
            </Modal>
        );
    }

    return (
        <Modal 
            opened={opened} 
            onClose={onClose}
            title={projeto ? "Editar Projeto" : "Novo Projeto"}
            size="xl"
            zIndex={1000}
        >
            <form onSubmit={handleSubmit}>
                <Tabs defaultValue="basico">
                    <Tabs.List>
                        <Tabs.Tab value="basico" leftSection={<IconBrain size={16} />}>
                            Básico
                        </Tabs.Tab>
                        <Tabs.Tab value="detalhes" leftSection={<IconSettings size={16} />}>
                            Detalhes
                        </Tabs.Tab>
                        <Tabs.Tab value="financeiro" leftSection={<IconCoin size={16} />}>
                            Financeiro
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="basico" pt="md">
                        <Stack gap="md">
                            <TextInput
                                label="Nome do Projeto"
                                placeholder="Ex: Chatbot de Atendimento"
                                required
                                value={formData.nome}
                                onChange={useCallback((e) => {
                                    const value = e.target?.value ?? e;
                                    setFormData(prev => ({...prev, nome: value}));
                                }, [])}
                            />
                            
                            {/* CORREÇÃO 3: Textarea com autosize */}
                            <Textarea
                                label="Descrição"
                                placeholder="Descreva o que o projeto faz..."
                                rows={3}
                                required
                                autosize
                                minRows={3}
                                maxRows={10}
                                value={formData.descricao}
                                onChange={(e) => setFormData(prev => ({...prev, descricao: e.target.value}))}
                            />
                            
                            <Grid>
                                <Grid.Col span={6}>
                                    <Select
                                        label="Tipo de Projeto"
                                        placeholder="Selecione o tipo"
                                        data={tipoOptions}
                                        required
                                        searchable
                                        value={formData.tipo_projeto}
                                        onChange={(value) => setFormData(prev => ({...prev, tipo_projeto: value}))}
                                        comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <MultiSelect
                                        label="Departamentos"
                                        placeholder="Selecione os departamentos"
                                        data={[
                                            { value: 'diretoria', label: 'Diretoria' },
                                            { value: 'gestao', label: 'Gestão' },
                                            { value: 'operacional', label: 'Operacional' },
                                            { value: 'ia_automacoes', label: 'IA & Automações' },
                                            { value: 'suporte', label: 'Suporte' },
                                            { value: 'trafego_pago', label: 'Tráfego Pago' }
                                        ]}
                                        required
                                        searchable
                                        value={formData.departamentos_atendidos}
                                        onChange={(value) => setFormData(prev => ({...prev, departamentos_atendidos: value}))}
                                        comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                                    />
                                </Grid.Col>
                            </Grid>
                            
                            <MultiSelect
                                label="Criadores/Responsáveis"
                                placeholder="Selecione os responsáveis"
                                data={userOptions}
                                searchable
                                value={formData.criadores_ids}
                                onChange={(value) => {
                                    setFormData(prev => ({...prev, criadores_ids: value}));
                                }}
                                comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                            />
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="detalhes" pt="md">
                        <Stack gap="md">
                            <Grid>
                                <Grid.Col span={4}>
                                    <NumberInput
                                        label="Horas Totais"
                                        placeholder="0"
                                        min={0}
                                        step={0.5}
                                        required
                                        value={formData.horas_totais}
                                        onChange={(value) => setFormData(prev => ({...prev, horas_totais: value}))}
                                    />
                                </Grid.Col>
                                <Grid.Col span={4}>
                                    <Select
                                        label="Prioridade"
                                        data={prioridadeOptions}
                                        value={formData.prioridade}
                                        onChange={(value) => setFormData(prev => ({...prev, prioridade: value}))}
                                    />
                                </Grid.Col>
                                <Grid.Col span={4}>
                                    <Select
                                        label="Complexidade"
                                        data={complexidadeOptions}
                                        value={formData.complexidade}
                                        onChange={(value) => setFormData(prev => ({...prev, complexidade: value}))}
                                    />
                                </Grid.Col>
                            </Grid>
                            
                            <TextInput
                                label="Link do Projeto"
                                placeholder="https://..."
                                value={formData.link_projeto}
                                onChange={(e) => setFormData(prev => ({...prev, link_projeto: e.target.value}))}
                            />
                            
                            <Grid>
                                <Grid.Col span={6}>
                                    <NumberInput
                                        label="Usuários Impactados"
                                        placeholder="0"
                                        min={0}
                                        value={formData.usuarios_impactados}
                                        onChange={(value) => setFormData(prev => ({...prev, usuarios_impactados: value}))}
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <Select
                                        label="Frequência de Uso"
                                        data={frequenciaOptions}
                                        value={formData.frequencia_uso}
                                        onChange={(value) => setFormData(prev => ({...prev, frequencia_uso: value}))}
                                    />
                                </Grid.Col>
                            </Grid>
                            
                            <TextInput
                                label="Ferramentas/Tecnologias"
                                placeholder="Ex: Python, OpenAI API, PostgreSQL"
                                description="Separadas por vírgula"
                                value={formData.ferramentas_tecnologias?.join(', ') || ''}
                                onChange={(e) => {
                                    const techs = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                                    setFormData(prev => ({...prev, ferramentas_tecnologias: techs}));
                                }}
                            />
                            
                            {/* DOCUMENTAÇÃO */}
                            <Title order={5}>📚 Documentação</Title>
                            <TextInput
                                label="Link da Documentação Técnica"
                                placeholder="https://..."
                                value={formData.documentacao_tecnica}
                                onChange={(e) => setFormData(prev => ({...prev, documentacao_tecnica: e.target.value}))}
                            />
                            
                            {/* CORREÇÃO 3: Textarea com autosize para lições aprendidas */}
                            <Textarea
                                label="Lições Aprendidas"
                                placeholder="O que funcionou bem e quais foram os desafios..."
                                rows={3}
                                autosize
                                minRows={3}
                                maxRows={8}
                                value={formData.licoes_aprendidas}
                                onChange={(e) => setFormData(prev => ({...prev, licoes_aprendidas: e.target.value}))}
                            />
                            
                            {/* CORREÇÃO 3: Textarea com autosize para próximos passos */}
                            <Textarea
                                label="Próximos Passos"
                                placeholder="Melhorias e funcionalidades planejadas..."
                                rows={3}
                                autosize
                                minRows={3}
                                maxRows={8}
                                value={formData.proximos_passos}
                                onChange={(e) => setFormData(prev => ({...prev, proximos_passos: e.target.value}))}
                            />
                            
                            <TextInput
                                label="Data de Próxima Revisão (Opcional)"
                                placeholder="YYYY-MM-DD"
                                description="Ex: 2024-03-15"
                                value={formData.data_revisao || ''}
                                onChange={(e) => setFormData(prev => ({...prev, data_revisao: e.target.value || null}))}
                            />
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="financeiro" pt="md">
                        <Stack gap="md">
                            <Title order={5}>💰 Custos</Title>
                            
                            <Grid>
                                <Grid.Col span={6}>
                                    <NumberInput
                                        label="Custo/Hora da Empresa (R$)"
                                        placeholder="80"
                                        min={0}
                                        step={0.01}
                                        description="Quanto custa cada hora de trabalho"
                                        value={formData.custo_hora_empresa}
                                        onChange={(value) => setFormData(prev => ({...prev, custo_hora_empresa: value}))}
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <NumberInput
                                        label="Custo APIs/Mês (R$)"
                                        placeholder="0"
                                        min={0}
                                        step={0.01}
                                        description="ChatGPT, Claude, etc."
                                        value={formData.custo_apis_mensal}
                                        onChange={(value) => setFormData(prev => ({...prev, custo_apis_mensal: value}))}
                                    />
                                </Grid.Col>
                            </Grid>

                            <Box>
                                <Text size="sm" weight={500} mb="xs">Ferramentas/Infraestrutura</Text>
                                <Text size="xs" c="dimmed" mb="md">Adicione ferramentas e seus custos mensais</Text>
                                
                                {formData.lista_ferramentas.map((ferramenta, index) => (
                                    <Group key={index} gap="xs" mb="xs">
                                        <TextInput
                                            placeholder="Nome da ferramenta"
                                            value={ferramenta.nome || ''}
                                            onChange={(e) => {
                                                const novaLista = [...formData.lista_ferramentas];
                                                novaLista[index] = { ...ferramenta, nome: e.target.value };
                                                setFormData(prev => ({...prev, lista_ferramentas: novaLista}));
                                            }}
                                            style={{ flex: 1 }}
                                        />
                                        <NumberInput
                                            placeholder="R$ 0"
                                            min={0}
                                            step={0.01}
                                            value={ferramenta.valor || 0}
                                            onChange={(value) => {
                                                const novaLista = [...formData.lista_ferramentas];
                                                novaLista[index] = { ...ferramenta, valor: value };
                                                setFormData(prev => ({...prev, lista_ferramentas: novaLista}));
                                            }}
                                            style={{ width: 120 }}
                                        />
                                        <ActionIcon 
                                            color="red" 
                                            onClick={() => {
                                                const novaLista = formData.lista_ferramentas.filter((_, i) => i !== index);
                                                setFormData(prev => ({...prev, lista_ferramentas: novaLista}));
                                            }}
                                        >
                                            <IconX size={16} />
                                        </ActionIcon>
                                    </Group>
                                ))}
                                
                                <Button 
                                    variant="light" 
                                    size="sm"
                                    leftSection={<IconPlus size={16} />}
                                    onClick={() => {
                                        setFormData(prev => ({
                                            ...prev, 
                                            lista_ferramentas: [...prev.lista_ferramentas, { nome: '', valor: 0 }]
                                        }));
                                    }}
                                >
                                    Adicionar Ferramenta
                                </Button>
                            </Box>
                            
                            <Divider my="md" />
                            
                            <Title order={5}>📈 Retornos/Economias</Title>
                            <Grid>
                                <Grid.Col span={6}>
                                    <NumberInput
                                        label="Horas Economizadas/Mês"
                                        placeholder="0"
                                        min={0}
                                        step={0.5}
                                        description="Quantas horas por mês o projeto economiza"
                                        value={formData.horas_economizadas_mes}
                                        onChange={(value) => setFormData(prev => ({...prev, horas_economizadas_mes: value}))}
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <NumberInput
                                        label="Valor Monetário Economizado/Mês (R$)"
                                        placeholder="0"
                                        min={0}
                                        step={0.01}
                                        description="Outros ganhos em reais (opcional)"
                                        value={formData.valor_monetario_economizado_mes}
                                        onChange={(value) => setFormData(prev => ({...prev, valor_monetario_economizado_mes: value}))}
                                    />
                                </Grid.Col>
                            </Grid>

                            <Divider my="md" />
                            
                            <Title order={5}>🎯 Controle</Title>
                            <Grid>
                                <Grid.Col span={6}>
                                    <Select
                                        label="Nível de Autonomia"
                                        data={[
                                            { value: 'total', label: 'Totalmente Autônomo' },
                                            { value: 'parcial', label: 'Requer Supervisão' },
                                            { value: 'manual', label: 'Processo Manual' }
                                        ]}
                                        value={formData.nivel_autonomia}
                                        onChange={(value) => setFormData(prev => ({...prev, nivel_autonomia: value}))}
                                        comboboxProps={{ withinPortal: true, zIndex: 1001 }}
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <TextInput
                                        label="Data Break-Even (Opcional)"
                                        placeholder="YYYY-MM-DD"
                                        description="Ex: 2024-03-15"
                                        value={formData.data_break_even || ''}
                                        onChange={(e) => setFormData(prev => ({...prev, data_break_even: e.target.value || null}))}
                                    />
                                </Grid.Col>
                            </Grid>

                            {/* Prévia dos cálculos */}
                            {formData.horas_totais > 0 && formData.custo_hora_empresa > 0 && (
                                <Paper withBorder p="md" bg="blue.0" mt="md">
                                    <Text size="sm" weight={500} mb="xs">💡 Prévia dos Cálculos</Text>
                                    <Text size="sm">
                                        Investimento em desenvolvimento: R$ {(formData.horas_totais * formData.custo_hora_empresa).toLocaleString('pt-BR')}
                                    </Text>
                                    {formData.horas_economizadas_mes > 0 && (
                                        <Text size="sm">
                                            Economia/mês: {formData.horas_economizadas_mes}h × R$ {formData.custo_hora_empresa} = R$ {(formData.horas_economizadas_mes * formData.custo_hora_empresa).toLocaleString('pt-BR')}
                                        </Text>
                                    )}
                                </Paper>
                            )}
                        </Stack>
                    </Tabs.Panel>
                </Tabs>

                <Group justify="flex-end" mt="xl">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={loading}>
                        {projeto ? 'Salvar' : 'Criar Projeto'}
                    </Button>
                </Group>
            </form>
        </Modal>
    );
};

// Modal de Detalhes do Projeto - TOTALMENTE CORRIGIDO
const ProjetoDetailModal = ({ opened, onClose, projeto, userPermissions }) => {
    if (!projeto) return null;
    
    const podeVerFinanceiro = userPermissions?.pode_ver_financeiro;
    const metricas = projeto.metricas_financeiras;

    return (
        <Modal 
            opened={opened} 
            onClose={onClose}
            title={projeto.nome}
            size="xl"
            zIndex={1000}
        >
            <Tabs defaultValue="info">
                <Tabs.List>
                    <Tabs.Tab value="info" leftSection={<IconFileText size={16} />}>
                        Informações
                    </Tabs.Tab>
                    {podeVerFinanceiro && (
                        <Tabs.Tab value="financeiro" leftSection={<IconCoin size={16} />}>
                            Financeiro
                        </Tabs.Tab>
                    )}
                    <Tabs.Tab value="historico" leftSection={<IconVersions size={16} />}>
                        Histórico
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="info" pt="md">
                    <Stack gap="md">
                        {/* CORREÇÃO 2: Descrição com formatação preservada */}
                        <Paper withBorder p="md">
                            <Text size="sm" c="dimmed" mb="xs">Descrição</Text>
                            <Text style={{ whiteSpace: 'pre-wrap' }}>{projeto.descricao}</Text>
                        </Paper>
                        
                        <SimpleGrid cols={3} spacing="md">
                            <Paper withBorder p="sm">
                                <Text size="xs" c="dimmed">Status</Text>
                                <StatusBadge status={projeto.status} />
                            </Paper>
                            <Paper withBorder p="sm">
                                <Text size="xs" c="dimmed">Tipo</Text>
                                <Text size="sm" weight={500}>{projeto.tipo_projeto}</Text>
                            </Paper>
                            <Paper withBorder p="sm">
                                <Text size="xs" c="dimmed">Departamentos</Text>
                                <Group gap="xs">
                                    {projeto.departamentos_display?.length > 0 ? (
                                        projeto.departamentos_display.map((dept, i) => (
                                            <Badge key={i} size="xs">{dept}</Badge>
                                        ))
                                    ) : (
                                        <Text size="sm">{projeto.departamento_atendido || 'N/A'}</Text>
                                    )}
                                </Group>
                            </Paper>
                        </SimpleGrid>

                        <SimpleGrid cols={2} spacing="md">
                            <Paper withBorder p="sm">
                                <Text size="xs" c="dimmed">Prioridade</Text>
                                <PrioridadeBadge prioridade={projeto.prioridade} />
                            </Paper>
                            <Paper withBorder p="sm">
                                <Text size="xs" c="dimmed">Complexidade</Text>
                                <Badge color="blue" variant="light">{projeto.complexidade}</Badge>
                            </Paper>
                        </SimpleGrid>

                        {/* BREAKDOWN DE HORAS */}
                        <Paper withBorder p="md">
                            <Title order={5} mb="md">⏱️ Breakdown de Horas</Title>
                            <SimpleGrid cols={5} spacing="md">
                                <Box>
                                    <Text size="xs" c="dimmed">Total</Text>
                                    <Text size="lg" weight={700}>{projeto.horas_totais}h</Text>
                                </Box>
                                <Box>
                                    <Text size="xs" c="dimmed">Desenvolvimento</Text>
                                    <Text size="sm">{projeto.horas_desenvolvimento || 0}h</Text>
                                </Box>
                                <Box>
                                    <Text size="xs" c="dimmed">Testes</Text>
                                    <Text size="sm">{projeto.horas_testes || 0}h</Text>
                                </Box>
                                <Box>
                                    <Text size="xs" c="dimmed">Documentação</Text>
                                    <Text size="sm">{projeto.horas_documentacao || 0}h</Text>
                                </Box>
                                <Box>
                                    <Text size="xs" c="dimmed">Deploy</Text>
                                    <Text size="sm">{projeto.horas_deploy || 0}h</Text>
                                </Box>
                            </SimpleGrid>
                        </Paper>

                        {/* INFORMAÇÕES ADICIONAIS */}
                        <SimpleGrid cols={2} spacing="md">
                            <Paper withBorder p="sm">
                                <Text size="xs" c="dimmed">Usuários Impactados</Text>
                                <Text size="sm" weight={500}>{projeto.usuarios_impactados}</Text>
                            </Paper>
                            <Paper withBorder p="sm">
                                <Text size="xs" c="dimmed">Frequência de Uso</Text>
                                <Text size="sm" weight={500}>{projeto.frequencia_uso}</Text>
                            </Paper>
                        </SimpleGrid>

                        {/* FERRAMENTAS */}
                        {projeto.ferramentas_tecnologias?.length > 0 && (
                            <Paper withBorder p="md">
                                <Text size="sm" c="dimmed" mb="xs">Ferramentas/Tecnologias</Text>
                                <Group gap="xs">
                                    {projeto.ferramentas_tecnologias.map((tech, i) => (
                                        <Badge key={i} variant="outline">{tech}</Badge>
                                    ))}
                                </Group>
                            </Paper>
                        )}

                        {/* CORREÇÃO 2: Documentação com formatação preservada */}
                        {(projeto.documentacao_tecnica || projeto.licoes_aprendidas || projeto.proximos_passos) && (
                            <Paper withBorder p="md">
                                <Title order={5} mb="md">📚 Documentação</Title>
                                <Stack gap="md">
                                    {projeto.documentacao_tecnica && (
                                        <Box>
                                            <Text size="sm" c="dimmed" mb="xs">Documentação Técnica</Text>
                                            <Text 
                                                component="a" 
                                                href={projeto.documentacao_tecnica} 
                                                target="_blank"
                                                c="blue"
                                                size="sm"
                                            >
                                                {projeto.documentacao_tecnica}
                                            </Text>
                                        </Box>
                                    )}
                                    
                                    {projeto.licoes_aprendidas && (
                                        <Box>
                                            <Text size="sm" c="dimmed" mb="xs">Lições Aprendidas</Text>
                                            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                                                {projeto.licoes_aprendidas}
                                            </Text>
                                        </Box>
                                    )}
                                    
                                    {projeto.proximos_passos && (
                                        <Box>
                                            <Text size="sm" c="dimmed" mb="xs">Próximos Passos</Text>
                                            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                                                {projeto.proximos_passos}
                                            </Text>
                                        </Box>
                                    )}
                                </Stack>
                            </Paper>
                        )}

                        {/* LINK DO PROJETO */}
                        {projeto.link_projeto && (
                            <Paper withBorder p="md">
                                <Text size="sm" c="dimmed" mb="xs">Link do Projeto</Text>
                                <Text 
                                    component="a" 
                                    href={projeto.link_projeto} 
                                    target="_blank"
                                    c="blue"
                                >
                                    {projeto.link_projeto}
                                </Text>
                            </Paper>
                        )}

                        {/* CRIADORES */}
                        <Paper withBorder p="md">
                            <Text size="sm" c="dimmed" mb="xs">Criadores/Responsáveis</Text>
                            <Group gap="xs">
                                {projeto.criadores?.length > 0 ? (
                                    projeto.criadores.map((criador, i) => (
                                        <Badge key={i} variant="outline">{criador.nome_completo || criador.username}</Badge>
                                    ))
                                ) : (
                                    <Text size="sm">Nenhum criador definido</Text>
                                )}
                            </Group>
                        </Paper>
                    </Stack>
                </Tabs.Panel>

                {/* ABA FINANCEIRO */}
                {podeVerFinanceiro && !metricas?.acesso_restrito && (
                    <Tabs.Panel value="financeiro" pt="md">
                        <Stack gap="md">
                            {/* CUSTOS */}
                            <Paper withBorder p="md">
                                <Title order={5} mb="md">💰 Custos</Title>
                                <SimpleGrid cols={2} spacing="md">
                                    <Box>
                                        <Text size="xs" c="dimmed">Custo/Hora Empresa</Text>
                                        <Text size="sm" weight={500}>R$ {projeto.custo_hora_empresa || 0}</Text>
                                    </Box>
                                    <Box>
                                        <Text size="xs" c="dimmed">APIs/Mês</Text>
                                        <Text size="sm" weight={500}>R$ {projeto.custo_apis_mensal || 0}</Text>
                                    </Box>
                                </SimpleGrid>
                                
                                {/* LISTA DE FERRAMENTAS */}
                                {projeto.lista_ferramentas?.length > 0 && (
                                    <Box mt="md">
                                        <Text size="sm" c="dimmed" mb="xs">Ferramentas/Infraestrutura</Text>
                                        <Stack gap="xs">
                                            {projeto.lista_ferramentas.map((ferramenta, i) => (
                                                <Group key={i} justify="space-between">
                                                    <Text size="sm">{ferramenta.nome}</Text>
                                                    <Text size="sm" weight={500}>R$ {ferramenta.valor}</Text>
                                                </Group>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}
                            </Paper>

                            {/* RETORNOS */}
                            <Paper withBorder p="md">
                                <Title order={5} mb="md">📈 Retornos</Title>
                                <SimpleGrid cols={2} spacing="md">
                                    <Box>
                                        <Text size="xs" c="dimmed">Horas Economizadas/Mês</Text>
                                        <Text size="sm" weight={500}>{projeto.horas_economizadas_mes || 0}h</Text>
                                    </Box>
                                    <Box>
                                        <Text size="xs" c="dimmed">Valor Monetário/Mês</Text>
                                        <Text size="sm" weight={500}>R$ {projeto.valor_monetario_economizado_mes || 0}</Text>
                                    </Box>
                                </SimpleGrid>
                            </Paper>

                            {/* MÉTRICAS CALCULADAS */}
                            {metricas && (
                                <Paper withBorder p="md" bg="blue.0">
                                    <Title order={5} mb="md">📊 Métricas Calculadas</Title>
                                    <SimpleGrid cols={3} spacing="md">
                                        <Box>
                                            <Text size="xs" c="dimmed">ROI</Text>
                                            <Text size="lg" weight={700} c={metricas.roi > 0 ? 'green' : 'red'}>
                                                {metricas.roi}%
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text size="xs" c="dimmed">Economia/Mês</Text>
                                            <Text size="lg" weight={700}>
                                                R$ {metricas.economia_mensal?.toLocaleString('pt-BR')}
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text size="xs" c="dimmed">Payback (meses)</Text>
                                            <Text size="lg" weight={700}>
                                                {metricas.payback_meses}
                                            </Text>
                                        </Box>
                                    </SimpleGrid>
                                </Paper>
                            )}
                        </Stack>
                    </Tabs.Panel>
                )}

                <Tabs.Panel value="historico" pt="md">
                    <Stack gap="md">
                        <Paper withBorder p="md">
                            <Title order={5} mb="md">📋 Informações do Sistema</Title>
                            <SimpleGrid cols={2} spacing="md">
                                <Box>
                                    <Text size="xs" c="dimmed">Criado em</Text>
                                    <Text size="sm">{new Date(projeto.criado_em).toLocaleDateString('pt-BR')}</Text>
                                </Box>
                                <Box>
                                    <Text size="xs" c="dimmed">Última atualização</Text>
                                    <Text size="sm">{new Date(projeto.atualizado_em).toLocaleDateString('pt-BR')}</Text>
                                </Box>
                                <Box>
                                    <Text size="xs" c="dimmed">Criado por</Text>
                                    <Text size="sm">{projeto.criado_por_nome}</Text>
                                </Box>
                                <Box>
                                    <Text size="xs" c="dimmed">Versão atual</Text>
                                    <Text size="sm">{projeto.versao_atual}</Text>
                                </Box>
                            </SimpleGrid>
                        </Paper>

                        {/* HISTÓRICO DE VERSÕES */}
                        {projeto.versoes?.length > 0 && (
                            <Paper withBorder p="md">
                                <Title order={5} mb="md">📝 Histórico de Versões</Title>
                                <Timeline active={projeto.versoes.length}>
                                    {projeto.versoes.map((versao, i) => (
                                        <Timeline.Item key={i}>
                                            <Text size="sm" weight={500}>v{versao.versao}</Text>
                                            <Text size="xs" c="dimmed">{versao.responsavel_nome}</Text>
                                            <Text size="xs" c="dimmed">
                                                {new Date(versao.data_lancamento).toLocaleDateString('pt-BR')}
                                            </Text>
                                            <Text size="sm">{versao.motivo_mudanca}</Text>
                                        </Timeline.Item>
                                    ))}
                                </Timeline>
                            </Paper>
                        )}
                    </Stack>
                </Tabs.Panel>
            </Tabs>
        </Modal>
    );
};

// Componente Principal - PRINCIPAIS CORRIGIDOS
function ProjetoDashboard() {
    // === ESTADOS ===
    const [projetos, setProjetos] = useState([]);
    const [stats, setStats] = useState(null);
    const [opcoes, setOpcoes] = useState(null);
    const [userPermissions, setUserPermissions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Estados dos modais
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [versionModalOpen, setVersionModalOpen] = useState(false);
    const [selectedProjeto, setSelectedProjeto] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    
    // Estados de filtros
    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch] = useDebouncedValue(searchValue, 500);
    const [filtros, setFiltros] = useState({
        busca: '',
        status: [],
        tipo_projeto: [],
        departamento: [],
        prioridade: [],
        complexidade: []
    });
    const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'tabela'
    const [sortBy, setSortBy] = useState('criado_em');
    const [sortOrder, setSortOrder] = useState('desc');

    // === EFEITOS ===
    useEffect(() => {
        carregarDadosIniciais();
    }, []);

    useEffect(() => {
        setFiltros(prev => ({ ...prev, busca: debouncedSearch }));
    }, [debouncedSearch]);

    useEffect(() => {
        if (opcoes) {
            carregarProjetos();
        }
    }, [filtros, sortBy, sortOrder, opcoes]);

    // === FUNÇÕES ===
    const carregarDadosIniciais = async () => {
        try {
            setLoading(true);
            
            // Testar cada API individualmente
            let statsData = null, opcoesData = null, permissoesData = null;
            
            try {
                const statsRes = await axios.get('/ia/dashboard-stats/');
                statsData = statsRes.data;
            } catch (statsErr) {
                console.error('❌ Erro stats:', statsErr.response?.data || statsErr.message);
                statsData = { total_projetos: 0, projetos_ativos: 0, horas_totais_investidas: 0 };
            }
            
            try {
                const opcoesRes = await axios.get('/ia/opcoes-formulario/');
                opcoesData = opcoesRes.data;
            } catch (opcoesErr) {
                console.error('❌ Erro opções:', opcoesErr.response?.data || opcoesErr.message);
                opcoesData = {
                    status_choices: [],
                    tipo_projeto_choices: [],
                    departamento_choices: [],
                    prioridade_choices: [],
                    complexidade_choices: [],
                    frequencia_choices: [],
                    usuarios_disponiveis: []
                };
            }
            
            try {
                const permissoesRes = await axios.get('/ia/verificar-permissoes/');
                permissoesData = permissoesRes.data;
            } catch (permErr) {
                console.error('❌ Erro permissões:', permErr.response?.data || permErr.message);
                permissoesData = { pode_ver_financeiro: false, pode_criar_projetos: true };
            }
            
            setStats(statsData);
            setOpcoes(opcoesData);
            setUserPermissions(permissoesData);
            
            
        } catch (err) {
            console.error('💥 Erro geral:', err);
            setError(`Erro ao carregar: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const carregarProjetos = async () => {
        try {
            const params = new URLSearchParams();
            
            Object.entries(filtros).forEach(([key, value]) => {
                if (Array.isArray(value) && value.length > 0) {
                    value.forEach(v => params.append(key, v));
                } else if (value && !Array.isArray(value)) {
                    params.append(key, value);
                }
            });
            
            params.append('ordering', sortOrder === 'desc' ? `-${sortBy}` : sortBy);
            
            const response = await axios.get(`/ia/projetos/?${params}`);
            setProjetos(response.data.results || response.data);
        } catch (err) {
            console.error('Erro ao carregar projetos:', err);
            notifications.show({
                title: 'Erro',
                message: 'Erro ao carregar projetos',
                color: 'red'
            });
        }
    };

    const handleSaveProjeto = async (data) => {
        try {
            setFormLoading(true);
            
            // Obter CSRF token
            let csrfToken;
            try {
                const csrfResponse = await axios.get('/current-state/');
                csrfToken = csrfResponse.data.csrf_token;
            } catch (csrfErr) {
                console.error('❌ Erro CSRF:', csrfErr);
                throw new Error('Erro ao obter token de segurança');
            }
            
            // PREPARAR DADOS COMPLETOS - TODOS OS CAMPOS
            const projetoData = {
                // === CAMPOS BÁSICOS ===
                nome: data.nome?.trim(),
                descricao: data.descricao?.trim(),
                tipo_projeto: data.tipo_projeto,
                departamentos_atendidos: Array.isArray(data.departamentos_atendidos) ? data.departamentos_atendidos : [],
                prioridade: data.prioridade || 'media',
                complexidade: data.complexidade || 'media',
                horas_totais: Number(data.horas_totais) || 0,
                criadores_ids: Array.isArray(data.criadores_ids) ? data.criadores_ids : [],
                ferramentas_tecnologias: Array.isArray(data.ferramentas_tecnologias) ? data.ferramentas_tecnologias : [],
                link_projeto: data.link_projeto?.trim() || '',
                usuarios_impactados: Number(data.usuarios_impactados) || 0,
                frequencia_uso: data.frequencia_uso || 'diario',
                
                // === BREAKDOWN DE HORAS ===
                horas_desenvolvimento: Number(data.horas_desenvolvimento) || 0,
                horas_testes: Number(data.horas_testes) || 0,
                horas_documentacao: Number(data.horas_documentacao) || 0,
                horas_deploy: Number(data.horas_deploy) || 0,
                
                // === NOVOS CAMPOS FINANCEIROS ===
                custo_hora_empresa: Number(data.custo_hora_empresa) || 0,
                custo_apis_mensal: Number(data.custo_apis_mensal) || 0,
                lista_ferramentas: Array.isArray(data.lista_ferramentas) ? data.lista_ferramentas : [],
                custo_treinamentos: Number(data.custo_treinamentos) || 0,
                custo_setup_inicial: Number(data.custo_setup_inicial) || 0,
                custo_consultoria: Number(data.custo_consultoria) || 0,
                horas_economizadas_mes: Number(data.horas_economizadas_mes) || 0,
                valor_monetario_economizado_mes: Number(data.valor_monetario_economizado_mes) || 0,
                data_break_even: data.data_break_even || null,
                nivel_autonomia: data.nivel_autonomia || 'total',
                
                // === CAMPOS LEGADOS ===
                valor_hora: Number(data.valor_hora) || 150,
                custo_ferramentas_mensais: Number(data.custo_ferramentas_mensais) || 0,
                custo_apis_mensais: Number(data.custo_apis_mensais) || 0,
                custo_infraestrutura_mensais: Number(data.custo_infraestrutura_mensais) || 0,
                custo_manutencao_mensais: Number(data.custo_manutencao_mensais) || 0,
                economia_horas_mensais: Number(data.economia_horas_mensais) || 0,
                valor_hora_economizada: Number(data.valor_hora_economizada) || 50,
                reducao_erros_mensais: Number(data.reducao_erros_mensais) || 0,
                economia_outros_mensais: Number(data.economia_outros_mensais) || 0,
                
                // === DOCUMENTAÇÃO ===
                documentacao_tecnica: data.documentacao_tecnica?.trim() || '',
                licoes_aprendidas: data.licoes_aprendidas?.trim() || '',
                proximos_passos: data.proximos_passos?.trim() || '',
                data_revisao: data.data_revisao || null
            };
                        
            // Validar dados obrigatórios
            if (!projetoData.nome) throw new Error('Nome é obrigatório');
            if (!projetoData.descricao) throw new Error('Descrição é obrigatória');
            if (!projetoData.tipo_projeto) throw new Error('Tipo de projeto é obrigatório');
            if (!projetoData.departamentos_atendidos.length) throw new Error('Pelo menos um departamento é obrigatório');
            if (projetoData.horas_totais <= 0) throw new Error('Horas totais deve ser maior que 0');
            
            const config = {
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                }
            };
            
            let response;
            if (selectedProjeto) {
                response = await axios.patch(`/ia/projetos/${selectedProjeto.id}/`, projetoData, config);
            } else {
                response = await axios.post('/ia/projetos/', projetoData, config);
            }
            
            notifications.show({
                title: 'Sucesso',
                message: selectedProjeto ? 'Projeto atualizado!' : 'Projeto criado!',
                color: 'green'
            });
            
            setFormModalOpen(false);
            setSelectedProjeto(null);
            carregarProjetos();
            carregarDadosIniciais();
            
        } catch (err) {
            console.error('💥 ERRO COMPLETO:', err);
            console.error('📋 Response data:', err.response?.data);
            console.error('📋 Response status:', err.response?.status);
            
            let errorMessage = 'Erro ao salvar projeto';
            
            if (err.response?.status === 400) {
                const errors = err.response.data;
                if (typeof errors === 'object') {
                    const errorList = Object.entries(errors).map(([field, msgs]) => 
                        `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`
                    );
                    errorMessage = errorList.join(' | ');
                } else {
                    errorMessage = errors.detail || errors.error || 'Dados inválidos';
                }
            } else if (err.response?.status === 403) {
                errorMessage = 'Sem permissão para esta ação';
            } else if (err.response?.status === 500) {
                errorMessage = 'Erro interno do servidor';
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            notifications.show({
                title: 'Erro',
                message: errorMessage,
                color: 'red'
            });
        } finally {
            setFormLoading(false);
        }
    };

    const handleViewProjeto = async (projeto) => {
        try {
            const response = await axios.get(`/ia/projetos/${projeto.id}/`);
            setSelectedProjeto(response.data);
            setDetailModalOpen(true);
        } catch (err) {
            console.error('❌ Erro ao carregar detalhes:', err);
            notifications.show({
                title: 'Erro',
                message: 'Erro ao carregar detalhes do projeto',
                color: 'red'
            });
        }
    };

    const handleEditProjeto = async (projeto) => {
        try {            
            // Carregar dados completos para edição
            const response = await axios.get(`/ia/projetos/${projeto.id}/`);            
            setSelectedProjeto(response.data);
            setFormModalOpen(true);
        } catch (err) {
            console.error('❌ Erro ao carregar projeto para edição:', err);
            notifications.show({
                title: 'Erro',
                message: 'Erro ao carregar projeto para edição',
                color: 'red'
            });
        }
    };

    // CORREÇÃO: Nova função para mudança de status
    const handleChangeStatus = async (projeto, novoStatus) => {
        try {
            const csrfResponse = await axios.get('/current-state/');
            const csrfToken = csrfResponse.data.csrf_token;
            
            const config = {
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                }
            };
            
            await axios.patch(`/ia/projetos/${projeto.id}/`, { status: novoStatus }, config);
            
            const statusLabels = {
                'ativo': 'ativado',
                'arquivado': 'arquivado', 
                'manutencao': 'em manutenção'
            };
            
            notifications.show({
                title: 'Sucesso',
                message: `Projeto ${statusLabels[novoStatus]} com sucesso`,
                color: 'green'
            });
            
            carregarProjetos();
            carregarDadosIniciais();
        } catch (err) {
            console.error('Erro ao alterar status:', err);
            notifications.show({
                title: 'Erro',
                message: 'Erro ao alterar status do projeto',
                color: 'red'
            });
        }
    };

    const handleArchiveProjeto = async (projeto) => {
        try {
            await axios.post(`/ia/projetos/${projeto.id}/arquivar/`);
            notifications.show({
                title: 'Sucesso',
                message: `Projeto ${projeto.status === 'arquivado' ? 'reativado' : 'arquivado'}`,
                color: 'green'
            });
            carregarProjetos();
            carregarDadosIniciais();
        } catch (err) {
            console.error('Erro ao arquivar projeto:', err);
            notifications.show({
                title: 'Erro',
                message: 'Erro ao arquivar projeto',
                color: 'red'
            });
        }
    };

    const handleDuplicateProjeto = async (projeto) => {
        try {
            await axios.post(`/ia/projetos/${projeto.id}/duplicar/`);
            notifications.show({
                title: 'Sucesso',
                message: 'Projeto duplicado com sucesso',
                color: 'green'
            });
            carregarProjetos();
        } catch (err) {
            console.error('Erro ao duplicar projeto:', err);
            notifications.show({
                title: 'Erro',
                message: 'Erro ao duplicar projeto',
                color: 'red'
            });
        }
    };

    // Projetos filtrados e ordenados
    const projetosFiltrados = useMemo(() => {
        return projetos;
    }, [projetos]);

    return (
        <Container size="xl" p="md">
            <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />

            {/* Header */}
            <Group justify="space-between" mb="xl">
                <Box>
                    <Title order={2} mb="xs">
                        <Group gap="sm">
                            <IconRobot size={32} />
                            🤖 Dashboard de IA & Automação
                        </Group>
                    </Title>
                    <Text c="dimmed">
                        Gerencie projetos de IA, automação e suas métricas financeiras
                    </Text>
                </Box>
                
                <Group gap="md">
                    <Button
                        leftSection={<IconRefresh size={16} />}
                        variant="light"
                        onClick={carregarDadosIniciais}
                    >
                        Atualizar
                    </Button>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={() => {
                            setSelectedProjeto(null);
                            setFormModalOpen(true);
                        }}
                    >
                        Novo Projeto
                    </Button>
                </Group>
            </Group>

            {error && (
                <Alert 
                    icon={<IconX size="1rem" />} 
                    title="Erro" 
                    color="red" 
                    mb="md"
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {/* Cards de Estatísticas - CORREÇÃO: Só mostrar 4º card se tiver dados financeiros */}
            {stats && (
                <SimpleGrid cols={userPermissions?.pode_ver_financeiro && stats.economia_mensal_total ? 4 : 3} spacing="md" mb="xl">
                    <Paper withBorder p="md" bg="blue.0">
                        <Group gap="sm">
                            <IconBrain size={24} />
                            <Box>
                                <Text size="sm" c="dimmed">Total de Projetos</Text>
                                <Text size="xl" weight={700}>{stats.total_projetos}</Text>
                            </Box>
                        </Group>
                    </Paper>
                    
                    <Paper withBorder p="md" bg="green.0">
                        <Group gap="sm">
                            <IconActivity size={24} />
                            <Box>
                                <Text size="sm" c="dimmed">Projetos Ativos</Text>
                                <Text size="xl" weight={700}>{stats.projetos_ativos}</Text>
                            </Box>
                        </Group>
                    </Paper>
                    
                    <Paper withBorder p="md" bg="orange.0">
                        <Group gap="sm">
                            <IconClock size={24} />
                            <Box>
                                <Text size="sm" c="dimmed">Horas Investidas</Text>
                                <Text size="xl" weight={700}>{stats.horas_totais_investidas}h</Text>
                            </Box>
                        </Group>
                    </Paper>
                    
                    {/* CORREÇÃO: Só mostrar se tiver dados financeiros E permissão */}
                    {userPermissions?.pode_ver_financeiro && stats.economia_mensal_total && (
                        <Paper withBorder p="md" bg="teal.0">
                            <Group gap="sm">
                                <IconTrendingUp size={24} />
                                <Box>
                                    <Text size="sm" c="dimmed">Economia/Mês</Text>
                                    <Text size="xl" weight={700}>
                                        R$ {stats.economia_mensal_total?.toLocaleString('pt-BR')}
                                    </Text>
                                </Box>
                            </Group>
                        </Paper>
                    )}
                </SimpleGrid>
            )}

            {/* Filtros */}
            <Paper withBorder p="md" mb="md">
                <Grid>
                    <Grid.Col span={4}>
                        <TextInput
                            placeholder="Buscar projetos..."
                            leftSection={<IconSearch size={16} />}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                    </Grid.Col>
                    <Grid.Col span={2}>
                        <MultiSelect
                            placeholder="Status"
                            data={opcoes?.status_choices || []}
                            value={filtros.status}
                            onChange={(value) => setFiltros(prev => ({ ...prev, status: value }))}
                        />
                    </Grid.Col>
                    <Grid.Col span={2}>
                        <MultiSelect
                            placeholder="Tipo"
                            data={opcoes?.tipo_projeto_choices || []}
                            value={filtros.tipo_projeto}
                            onChange={(value) => setFiltros(prev => ({ ...prev, tipo_projeto: value }))}
                        />
                    </Grid.Col>
                    <Grid.Col span={2}>
                        <MultiSelect
                            placeholder="Departamento"
                            data={opcoes?.departamento_choices || []}
                            value={filtros.departamento}
                            onChange={(value) => setFiltros(prev => ({ ...prev, departamento: value }))}
                        />
                    </Grid.Col>
                    <Grid.Col span={2}>
                        <Group gap="xs">
                            <ActionIcon
                                variant={viewMode === 'cards' ? 'filled' : 'outline'}
                                onClick={() => setViewMode('cards')}
                            >
                                <IconTarget size={16} />
                            </ActionIcon>
                            <ActionIcon
                                variant={viewMode === 'tabela' ? 'filled' : 'outline'}
                                onClick={() => setViewMode('tabela')}
                            >
                                <IconFileText size={16} />
                            </ActionIcon>
                        </Group>
                    </Grid.Col>
                </Grid>
            </Paper>

            {/* Lista de Projetos */}
            {viewMode === 'cards' ? (
                <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
                    {projetosFiltrados.slice(0, 20).map((projeto) => (
                        <ProjetoCard
                            key={projeto.id}
                            projeto={projeto}
                            onEdit={handleEditProjeto}
                            onView={handleViewProjeto}
                            onArchive={handleArchiveProjeto}
                            onDuplicate={handleDuplicateProjeto}
                            onNewVersion={(p) => {
                                setSelectedProjeto(p);
                                setVersionModalOpen(true);
                            }}
                            onChangeStatus={handleChangeStatus}
                            userPermissions={userPermissions}
                        />
                    ))}
                </SimpleGrid>
            ) : (
                <Paper withBorder>
                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Nome</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Tipo</Table.Th>
                                <Table.Th>Horas</Table.Th>
                                {userPermissions?.pode_ver_financeiro && <Table.Th>ROI</Table.Th>}
                                <Table.Th>Ações</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {projetosFiltrados.map((projeto) => (
                                <Table.Tr key={projeto.id}>
                                    <Table.Td>
                                        <Text weight={500}>{projeto.nome}</Text>
                                        <Text size="xs" c="dimmed">{projeto.criadores_nomes.join(', ')}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <StatusBadge status={projeto.status} />
                                    </Table.Td>
                                    <Table.Td>{projeto.tipo_projeto}</Table.Td>
                                    <Table.Td>{projeto.horas_totais}h</Table.Td>
                                    {userPermissions?.pode_ver_financeiro && (
                                        <Table.Td>
                                            {projeto.metricas_financeiras?.acesso_restrito ? (
                                                <Text size="xs" c="dimmed">Restrito</Text>
                                            ) : (
                                                <Text weight={500} c={projeto.metricas_financeiras?.roi > 0 ? 'green' : 'red'}>
                                                    {projeto.metricas_financeiras?.roi}%
                                                </Text>
                                            )}
                                        </Table.Td>
                                    )}
                                    <Table.Td>
                                        <Group gap="xs">
                                            <ActionIcon size="sm" onClick={() => handleViewProjeto(projeto)}>
                                                <IconEye size={14} />
                                            </ActionIcon>
                                            <ActionIcon size="sm" onClick={() => handleEditProjeto(projeto)}>
                                                <IconEdit size={14} />
                                            </ActionIcon>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Paper>
            )}

            {/* Modais */}
            <ProjetoFormModal
                opened={formModalOpen}
                onClose={() => {
                    setFormModalOpen(false);
                    setSelectedProjeto(null);
                }}
                projeto={selectedProjeto}
                onSave={handleSaveProjeto}
                opcoes={opcoes}
                loading={formLoading}
            />

            <ProjetoDetailModal
                opened={detailModalOpen}
                onClose={() => {
                    setDetailModalOpen(false);
                    setSelectedProjeto(null);
                }}
                projeto={selectedProjeto}
                userPermissions={userPermissions}
            />

            <NovaVersaoModal
                opened={versionModalOpen}
                onClose={() => {
                    setVersionModalOpen(false);
                    setSelectedProjeto(null);
                }}
                projeto={selectedProjeto}
                onSave={carregarProjetos}
            />
        </Container>
    );
}

// Modal de Nova Versão
const NovaVersaoModal = ({ opened, onClose, projeto, onSave }) => {
    const [loading, setLoading] = useState(false);
    
    const form = useForm({
        initialValues: {
            versao: '',
            motivo_mudanca: ''
        },
        validate: {
            versao: (value) => !value ? 'Versão é obrigatória' : null,
            motivo_mudanca: (value) => !value ? 'Motivo da mudança é obrigatório' : null
        }
    });

    const handleSubmit = async (values) => {
        if (!projeto) return;
        
        try {
            setLoading(true);
            await axios.post(`/ia/projetos/${projeto.id}/nova_versao/`, values);
            
            notifications.show({
                title: 'Sucesso',
                message: `Nova versão ${values.versao} criada com sucesso`,
                color: 'green'
            });
            
            onClose();
            onSave();
        } catch (err) {
            console.error('Erro ao criar nova versão:', err);
            notifications.show({
                title: 'Erro',
                message: err.response?.data?.detail || 'Erro ao criar nova versão',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    if (!projeto) return null;

    return (
        <Modal 
            opened={opened} 
            onClose={onClose}
            title={`Nova Versão - ${projeto.nome}`}
            size="md"
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    <Alert color="blue" icon={<IconVersions size={16} />}>
                        Versão atual: <strong>{projeto.versao_atual}</strong>
                    </Alert>
                    
                    <TextInput
                        label="Nova Versão"
                        placeholder="Ex: 1.2.0"
                        required
                        {...form.getInputProps('versao')}
                    />
                    
                    <Textarea
                        label="Motivo da Mudança"
                        placeholder="Descreva as alterações realizadas..."
                        rows={4}
                        required
                        {...form.getInputProps('motivo_mudanca')}
                    />
                    
                    <Group justify="flex-end">
                        <Button variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" loading={loading}>
                            Criar Versão
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
};

export default ProjetoDashboard;