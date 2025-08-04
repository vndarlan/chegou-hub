// frontend/src/features/ia/ProjetoDashboard.js - MIGRADO PARA SHADCN/UI
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebouncedValue } from '@mantine/hooks';

// shadcn/ui imports
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Separator } from '../../components/ui/separator';

// lucide-react icons (replacement for @tabler/icons-react)
import {
    Plus, Filter, Download, Edit, Archive,
    Copy, GitBranch, Eye, BarChart, Coins,
    Clock, Users, Wrench, Check, X, Search,
    ArrowUp, ArrowDown, RefreshCw, Settings,
    ChevronDown, Activity, TrendingUp, Target,
    Building, AlertCircle, Calendar,
    FileText, Link, Tag, Brain, Bot
} from 'lucide-react';

// Keep some Mantine imports temporarily
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { RingProgress, BarChart as MantineBarChart, LineChart, PieChart } from '@mantine/core';
import axios from 'axios';

// === COMPONENTES AUXILIARES ===

// Badge de Status com cores - migrado para shadcn/ui
const StatusBadge = ({ status }) => {
    const variants = {
        'ativo': 'default',
        'arquivado': 'secondary',
        'manutencao': 'outline'
    };
    
    const colors = {
        'ativo': 'bg-green-500 text-white',
        'arquivado': 'bg-gray-500 text-white',
        'manutencao': 'bg-yellow-500 text-white'
    };
    
    const labels = {
        'ativo': 'Ativo',
        'arquivado': 'Arquivado',
        'manutencao': 'Manutenção'
    };
    
    return (
        <Badge variant={variants[status]} className={colors[status]}>
            {labels[status]}
        </Badge>
    );
};

// Badge de Prioridade - migrado para shadcn/ui
const PrioridadeBadge = ({ prioridade }) => {
    const colors = {
        'alta': 'bg-red-100 text-red-800 border-red-200',
        'media': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'baixa': 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    const labels = {
        'alta': 'Alta',
        'media': 'Média',
        'baixa': 'Baixa'
    };
    
    return (
        <Badge variant="outline" className={colors[prioridade]}>
            {labels[prioridade]}
        </Badge>
    );
};

// Card de Projeto - migrado para shadcn/ui
const ProjetoCard = React.memo(({ projeto, onEdit, onView, onArchive, onDuplicate, onNewVersion, onChangeStatus, userPermissions }) => {
    const metricas = projeto.metricas_financeiras;
    const podeVerFinanceiro = userPermissions?.pode_ver_financeiro && !metricas?.acesso_restrito;
    
    return (
        <Card className="border shadow-sm">
            <CardHeader className="border-b pb-3">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-medium">{projeto.nome}</CardTitle>
                    <div className="flex gap-2">
                        <StatusBadge status={projeto.status} />
                        <PrioridadeBadge prioridade={projeto.prioridade} />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-4">
                {/* Descrição com formatação preservada */}
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-2">
                    {projeto.descricao}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Tipo</p>
                        <p className="text-sm font-medium">{projeto.tipo_projeto}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Departamentos</p>
                        <div className="flex gap-1 flex-wrap">
                            {projeto.departamentos_display?.length > 0 ? (
                                projeto.departamentos_display.slice(0, 2).map((dept, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                        {dept}
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-sm font-medium">{projeto.departamento_atendido || 'N/A'}</p>
                            )}
                            {projeto.departamentos_display?.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                    +{projeto.departamentos_display.length - 2}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Horas Investidas</p>
                        <p className="text-sm font-medium">{projeto.horas_totais}h</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Usuários Impactados</p>
                        <p className="text-sm font-medium">{projeto.usuarios_impactados}</p>
                    </div>
                </div>

                {podeVerFinanceiro && (
                    <div className="border rounded-lg p-3 mt-4 bg-blue-50">
                        <div className="flex justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">ROI</p>
                                <p className={`text-sm font-bold ${metricas.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {metricas.roi}%
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Economia/Mês</p>
                                <p className="text-sm font-medium">
                                    R$ {metricas.economia_mensal?.toLocaleString('pt-BR')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <span className="text-xs text-muted-foreground">Criadores:</span>
                    {projeto.criadores_nomes.slice(0, 2).map((nome, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                            {nome}
                        </Badge>
                    ))}
                    {projeto.criadores_nomes.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                            +{projeto.criadores_nomes.length - 2}
                        </Badge>
                    )}
                </div>

                <div className="flex justify-between items-center mt-4">
                    <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>v{projeto.versao_atual}</span>
                        <span>•</span>
                        <span>{projeto.dias_sem_atualizacao} dias</span>
                    </div>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuItem onClick={() => onView(projeto)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(projeto)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onNewVersion(projeto)}>
                                <GitBranch className="mr-2 h-4 w-4" />
                                Nova Versão
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDuplicate(projeto)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                            {projeto.status !== 'ativo' && (
                                <DropdownMenuItem 
                                    onClick={() => onChangeStatus(projeto, 'ativo')}
                                    className="text-green-600"
                                >
                                    <Activity className="mr-2 h-4 w-4" />
                                    Ativar
                                </DropdownMenuItem>
                            )}
                            {projeto.status !== 'manutencao' && (
                                <DropdownMenuItem 
                                    onClick={() => onChangeStatus(projeto, 'manutencao')}
                                    className="text-yellow-600"
                                >
                                    <Wrench className="mr-2 h-4 w-4" />
                                    Em Manutenção
                                </DropdownMenuItem>
                            )}
                            {projeto.status !== 'arquivado' && (
                                <DropdownMenuItem 
                                    onClick={() => onChangeStatus(projeto, 'arquivado')}
                                    className="text-orange-600"
                                >
                                    <Archive className="mr-2 h-4 w-4" />
                                    Arquivar
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    );
});

// Modal de Formulário de Projeto - COMPLETAMENTE CORRIGIDO
const ProjetoFormModal = ({ opened, onClose, projeto, onSave, opcoes, loading }) => {
    // HOOKS PRIMEIRO - SEMPRE NO TOPO
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

    useEffect(() => {
        if (projeto) {
            setFormData({
                ...projeto,
                criadores_ids: (projeto.criadores && Array.isArray(projeto.criadores)) 
                    ? projeto.criadores.map(c => (c?.id || '').toString()) 
                    : [],
                departamentos_atendidos: projeto.departamentos_atendidos || [],
                lista_ferramentas: projeto.lista_ferramentas || [],
                ferramentas_tecnologias: projeto.ferramentas_tecnologias || [],
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

    // VERIFICAÇÃO CONDICIONAL DEPOIS DOS HOOKS
    if (!opcoes) {
        return (
            <Modal opened={opened} onClose={onClose} title="Carregando...">
                <LoadingOverlay visible={true} />
            </Modal>
        );
    }

    // OPÇÕES SEGURAS - DEFINIDAS DEPOIS DA VERIFICAÇÃO
    const tipoOptions = opcoes?.tipo_projeto_choices || [];
    const deptOptions = opcoes?.departamento_choices || [];
    const prioridadeOptions = opcoes?.prioridade_choices || [];
    const complexidadeOptions = opcoes?.complexidade_choices || [];
    const frequenciaOptions = opcoes?.frequencia_choices || [];
    const userOptions = (opcoes?.usuarios_disponiveis && Array.isArray(opcoes.usuarios_disponiveis)) 
        ? opcoes.usuarios_disponiveis.map(u => ({
            value: (u?.id || '').toString(),
            label: u?.nome_completo || u?.username || 'Usuário'
        }))
        : [];

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Dialog open={opened} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{projeto ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <Tabs defaultValue="basico" className="mt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="basico" className="flex items-center gap-2">
                                <Brain className="h-4 w-4" />
                                Básico
                            </TabsTrigger>
                            <TabsTrigger value="detalhes" className="flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Detalhes
                            </TabsTrigger>
                            <TabsTrigger value="financeiro" className="flex items-center gap-2">
                                <Coins className="h-4 w-4" />
                                Financeiro
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="basico" className="space-y-4 mt-4">
                            <div>
                                <label className="text-sm font-medium">Nome do Projeto</label>
                                <Input
                                    placeholder="Ex: Chatbot de Atendimento"
                                    required
                                    value={formData.nome}
                                    onChange={(e) => {
                                        setFormData(prev => ({...prev, nome: e.target.value}));
                                    }}
                                />
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium">Descrição</label>
                                <Textarea
                                    placeholder="Descreva o que o projeto faz..."
                                    rows={3}
                                    required
                                    value={formData.descricao}
                                    onChange={(e) => setFormData(prev => ({...prev, descricao: e.target.value}))}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Tipo de Projeto</label>
                                    <Select 
                                        value={formData.tipo_projeto} 
                                        onValueChange={(value) => setFormData(prev => ({...prev, tipo_projeto: value}))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tipoOptions?.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Departamentos</label>
                                    <div className="text-sm text-gray-500 mb-2">
                                        {(formData.departamentos_atendidos || []).length > 0 
                                            ? `${formData.departamentos_atendidos.length} selecionados`
                                            : 'Nenhum selecionado'
                                        }
                                    </div>
                                    <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                                        {[
                                            { value: 'diretoria', label: 'Diretoria' },
                                            { value: 'gestao', label: 'Gestão' },
                                            { value: 'operacional', label: 'Operacional' },
                                            { value: 'ia_automacoes', label: 'IA & Automações' },
                                            { value: 'suporte', label: 'Suporte' },
                                            { value: 'trafego_pago', label: 'Tráfego Pago' }
                                        ].map((dept) => (
                                            <div key={dept.value} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`dept-${dept.value}`}
                                                    checked={(formData.departamentos_atendidos || []).includes(dept.value)}
                                                    onChange={(e) => {
                                                        const current = formData.departamentos_atendidos || [];
                                                        if (e.target.checked) {
                                                            setFormData(prev => ({
                                                                ...prev, 
                                                                departamentos_atendidos: [...current, dept.value]
                                                            }));
                                                        } else {
                                                            setFormData(prev => ({
                                                                ...prev, 
                                                                departamentos_atendidos: current.filter(d => d !== dept.value)
                                                            }));
                                                        }
                                                    }}
                                                />
                                                <label htmlFor={`dept-${dept.value}`} className="text-sm">{dept.label}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium">Criadores/Responsáveis</label>
                                <div className="text-sm text-gray-500 mb-2">
                                    {(formData.criadores_ids || []).length > 0 
                                        ? `${formData.criadores_ids.length} selecionados`
                                        : 'Nenhum selecionado'
                                    }
                                </div>
                                <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                                    {userOptions?.map((user) => (
                                        <div key={user.value} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={`user-${user.value}`}
                                                checked={(formData.criadores_ids || []).includes(user.value.toString())}
                                                onChange={(e) => {
                                                    const current = formData.criadores_ids || [];
                                                    if (e.target.checked) {
                                                        setFormData(prev => ({
                                                            ...prev, 
                                                            criadores_ids: [...current, user.value.toString()]
                                                        }));
                                                    } else {
                                                        setFormData(prev => ({
                                                            ...prev, 
                                                            criadores_ids: current.filter(d => d !== user.value.toString())
                                                        }));
                                                    }
                                                }}
                                            />
                                            <label htmlFor={`user-${user.value}`} className="text-sm">{user.label}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="detalhes" className="space-y-4 mt-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Horas Totais</label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        min={0}
                                        step={0.5}
                                        required
                                        value={formData.horas_totais}
                                        onChange={(e) => setFormData(prev => ({...prev, horas_totais: parseFloat(e.target.value) || 0}))}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Prioridade</label>
                                    <Select 
                                        value={formData.prioridade}
                                        onValueChange={(value) => setFormData(prev => ({...prev, prioridade: value}))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {prioridadeOptions?.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Complexidade</label>
                                    <Select 
                                        value={formData.complexidade}
                                        onValueChange={(value) => setFormData(prev => ({...prev, complexidade: value}))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {complexidadeOptions?.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium">Link do Projeto</label>
                                <Input
                                    placeholder="https://..."
                                    value={formData.link_projeto}
                                    onChange={(e) => setFormData(prev => ({...prev, link_projeto: e.target.value}))}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Usuários Impactados</label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        min={0}
                                        value={formData.usuarios_impactados}
                                        onChange={(e) => setFormData(prev => ({...prev, usuarios_impactados: parseInt(e.target.value) || 0}))}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Frequência de Uso</label>
                                    <Select 
                                        value={formData.frequencia_uso}
                                        onValueChange={(value) => setFormData(prev => ({...prev, frequencia_uso: value}))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {frequenciaOptions?.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium">Ferramentas/Tecnologias</label>
                                <p className="text-xs text-muted-foreground mb-1">Separadas por vírgula</p>
                                <Input
                                    placeholder="Ex: Python, OpenAI API, PostgreSQL"
                                    value={(formData.ferramentas_tecnologias || []).join(', ')}
                                    onChange={(e) => {
                                        const techs = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                                        setFormData(prev => ({...prev, ferramentas_tecnologias: techs}));
                                    }}
                                />
                            </div>
                            
                            <div className="mt-6">
                                <h3 className="text-base font-medium mb-4">📚 Documentação</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">Link da Documentação Técnica</label>
                                        <Input
                                            placeholder="https://..."
                                            value={formData.documentacao_tecnica}
                                            onChange={(e) => setFormData(prev => ({...prev, documentacao_tecnica: e.target.value}))}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="text-sm font-medium">Lições Aprendidas</label>
                                        <Textarea
                                            placeholder="O que funcionou bem e quais foram os desafios..."
                                            rows={3}
                                            value={formData.licoes_aprendidas}
                                            onChange={(e) => setFormData(prev => ({...prev, licoes_aprendidas: e.target.value}))}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="text-sm font-medium">Próximos Passos</label>
                                        <Textarea
                                            placeholder="Melhorias e funcionalidades planejadas..."
                                            rows={3}
                                            value={formData.proximos_passos}
                                            onChange={(e) => setFormData(prev => ({...prev, proximos_passos: e.target.value}))}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium">Data de Próxima Revisão (Opcional)</label>
                                <p className="text-xs text-muted-foreground mb-1">Ex: 2024-03-15</p>
                                <Input
                                    type="date"
                                    value={formData.data_revisao || ''}
                                    onChange={(e) => setFormData(prev => ({...prev, data_revisao: e.target.value || null}))}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="financeiro" className="space-y-4 mt-4">
                            <div>
                                <h3 className="text-base font-medium mb-4">💰 Custos</h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Custo/Hora da Empresa (R$)</label>
                                        <p className="text-xs text-muted-foreground mb-1">Quanto custa cada hora de trabalho</p>
                                        <Input
                                            type="number"
                                            placeholder="80"
                                            min={0}
                                            step={0.01}
                                            value={formData.custo_hora_empresa}
                                            onChange={(e) => setFormData(prev => ({...prev, custo_hora_empresa: parseFloat(e.target.value) || 0}))}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Custo APIs/Mês (R$)</label>
                                        <p className="text-xs text-muted-foreground mb-1">ChatGPT, Claude, etc.</p>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            min={0}
                                            step={0.01}
                                            value={formData.custo_apis_mensal}
                                            onChange={(e) => setFormData(prev => ({...prev, custo_apis_mensal: parseFloat(e.target.value) || 0}))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium mb-2">Ferramentas/Infraestrutura</h4>
                                <p className="text-xs text-muted-foreground mb-3">Adicione ferramentas e seus custos mensais</p>
                                
                                <div className="space-y-2">
                                    {(formData.lista_ferramentas || []).map((ferramenta, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                placeholder="Nome da ferramenta"
                                                value={ferramenta?.nome || ''}
                                                onChange={(e) => {
                                                    const novaLista = [...(formData.lista_ferramentas || [])];
                                                    novaLista[index] = { ...ferramenta, nome: e.target.value };
                                                    setFormData(prev => ({...prev, lista_ferramentas: novaLista}));
                                                }}
                                                className="flex-1"
                                            />
                                            <Input
                                                type="number"
                                                placeholder="R$ 0"
                                                min={0}
                                                step={0.01}
                                                value={ferramenta?.valor || 0}
                                                onChange={(e) => {
                                                    const novaLista = [...(formData.lista_ferramentas || [])];
                                                    novaLista[index] = { ...ferramenta, valor: parseFloat(e.target.value) || 0 };
                                                    setFormData(prev => ({...prev, lista_ferramentas: novaLista}));
                                                }}
                                                className="w-32"
                                            />
                                            <Button 
                                                variant="destructive" 
                                                size="sm"
                                                onClick={() => {
                                                    const novaLista = (formData.lista_ferramentas || []).filter((_, i) => i !== index);
                                                    setFormData(prev => ({...prev, lista_ferramentas: novaLista}));
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                        setFormData(prev => ({
                                            ...prev, 
                                            lista_ferramentas: [...(prev.lista_ferramentas || []), { nome: '', valor: 0 }]
                                        }));
                                    }}
                                    className="mt-2"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Adicionar Ferramenta
                                </Button>
                            </div>
                            
                            <Separator />
                            
                            <div>
                                <h3 className="text-base font-medium mb-4">📈 Retornos/Economias</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Horas Economizadas/Mês</label>
                                        <p className="text-xs text-muted-foreground mb-1">Quantas horas por mês o projeto economiza</p>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            min={0}
                                            step={0.5}
                                            value={formData.horas_economizadas_mes}
                                            onChange={(e) => setFormData(prev => ({...prev, horas_economizadas_mes: parseFloat(e.target.value) || 0}))}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Valor Monetário Economizado/Mês (R$)</label>
                                        <p className="text-xs text-muted-foreground mb-1">Outros ganhos em reais (opcional)</p>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            min={0}
                                            step={0.01}
                                            value={formData.valor_monetario_economizado_mes}
                                            onChange={(e) => setFormData(prev => ({...prev, valor_monetario_economizado_mes: parseFloat(e.target.value) || 0}))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />
                            
                            <div>
                                <h3 className="text-base font-medium mb-4">🎯 Controle</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Nível de Autonomia</label>
                                        <Select 
                                            value={formData.nivel_autonomia}
                                            onValueChange={(value) => setFormData(prev => ({...prev, nivel_autonomia: value}))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="total">Totalmente Autônomo</SelectItem>
                                                <SelectItem value="parcial">Requer Supervisão</SelectItem>
                                                <SelectItem value="manual">Processo Manual</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Data Break-Even (Opcional)</label>
                                        <p className="text-xs text-muted-foreground mb-1">Ex: 2024-03-15</p>
                                        <Input
                                            type="date"
                                            value={formData.data_break_even || ''}
                                            onChange={(e) => setFormData(prev => ({...prev, data_break_even: e.target.value || null}))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {formData.horas_totais > 0 && formData.custo_hora_empresa > 0 && (
                                <div className="border rounded-lg p-4 bg-blue-50 mt-4">
                                    <h4 className="text-sm font-medium mb-2">💡 Prévia dos Cálculos</h4>
                                    <p className="text-sm">
                                        Investimento em desenvolvimento: R$ {(formData.horas_totais * formData.custo_hora_empresa).toLocaleString('pt-BR')}
                                    </p>
                                    {formData.horas_economizadas_mes > 0 && (
                                        <p className="text-sm">
                                            Economia/mês: {formData.horas_economizadas_mes}h × R$ {formData.custo_hora_empresa} = R$ {(formData.horas_economizadas_mes * formData.custo_hora_empresa).toLocaleString('pt-BR')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Salvando...' : (projeto ? 'Salvar' : 'Criar Projeto')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
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
        <div className="max-w-7xl mx-auto p-6">
            {loading && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Bot className="h-8 w-8" />
                        <h1 className="text-2xl font-bold">🤖 Dashboard de IA & Automação</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Gerencie projetos de IA, automação e suas métricas financeiras
                    </p>
                </div>
                
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={carregarDadosIniciais}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                    <Button
                        onClick={() => {
                            setSelectedProjeto(null);
                            setFormModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Projeto
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-4">
                    <X className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Erro:</strong> {error}
                    </AlertDescription>
                </Alert>
            )}

            {/* Cards de Estatísticas */}
            {stats && (
                <div className={`grid gap-4 mb-8 ${userPermissions?.pode_ver_financeiro && stats.economia_mensal_total ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
                    <Card className="border bg-blue-50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Brain className="h-6 w-6 text-blue-600" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Total de Projetos</p>
                                    <p className="text-2xl font-bold">{stats.total_projetos}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="border bg-green-50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Activity className="h-6 w-6 text-green-600" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Projetos Ativos</p>
                                    <p className="text-2xl font-bold">{stats.projetos_ativos}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="border bg-orange-50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Clock className="h-6 w-6 text-orange-600" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Horas Investidas</p>
                                    <p className="text-2xl font-bold">{stats.horas_totais_investidas}h</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Só mostrar se tiver dados financeiros E permissão */}
                    {userPermissions?.pode_ver_financeiro && stats.economia_mensal_total && (
                        <Card className="border bg-teal-50">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="h-6 w-6 text-teal-600" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Economia/Mês</p>
                                        <p className="text-2xl font-bold">
                                            R$ {stats.economia_mensal_total?.toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
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
                                if (!opcoes) {
                                    notifications.show({
                                        title: 'Aviso',
                                        message: 'Aguarde o carregamento das opções',
                                        color: 'yellow'
                                    });
                                    return;
                                }
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
            {opcoes && (
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
            )}

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