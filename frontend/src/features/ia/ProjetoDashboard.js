// frontend/src/features/ia/ProjetoDashboard.js - MIGRADO PARA SHADCN/UI
import React, { useState, useEffect, useMemo, useCallback } from 'react';

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

import axios from 'axios';
import { toast } from 'sonner';

// === HOOKS CUSTOMIZADOS ===

// Hook useDebounce para delay de input
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    
    return debouncedValue;
}

// Sistema de toast usando sonner
const showNotification = ({ title, message, type = 'success' }) => {
    const content = title ? `${title}: ${message}` : message;
    
    if (type === 'success') {
        toast.success(content);
    } else if (type === 'error') {
        toast.error(content);
    } else {
        toast(content);
    }
};

// Componente CustomTimeline personalizado
const CustomTimeline = ({ children, className = '' }) => {
    return (
        <div className={`space-y-4 ${className}`}>
            {React.Children.map(children, (child, index) => (
                <div key={index} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-primary rounded-full border-2 border-white shadow-md" />
                        {index < React.Children.count(children) - 1 && (
                            <div className="w-0.5 h-8 bg-border mt-2" />
                        )}
                    </div>
                    <div className="flex-1 pb-4">
                        {child}
                    </div>
                </div>
            ))}
        </div>
    );
};

const TimelineItem = ({ children }) => {
    return <div className="space-y-1">{children}</div>;
};

CustomTimeline.Item = TimelineItem;

// === COMPONENTES AUXILIARES ===

// Badge de Status com cores - migrado para shadcn/ui
const StatusBadge = ({ status }) => {
    const variants = {
        'ativo': 'default',
        'arquivado': 'secondary',
        'manutencao': 'outline'
    };
    
    const colors = {
        'ativo': 'bg-green-500 text-white dark:bg-green-600 dark:text-green-50',
        'arquivado': 'bg-gray-500 text-white dark:bg-gray-600 dark:text-gray-50',
        'manutencao': 'bg-yellow-500 text-white dark:bg-yellow-600 dark:text-yellow-50'
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
        'alta': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
        'media': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
        'baixa': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
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
            <Dialog open={opened} onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Carregando...</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </DialogContent>
            </Dialog>
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-800">
                <DialogHeader>
                    <DialogTitle className="dark:text-gray-100">{projeto ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
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
                                <label className="text-sm font-medium dark:text-gray-200">Nome do Projeto</label>
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
                                <label className="text-sm font-medium dark:text-gray-200">Descrição</label>
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
                                <label className="text-sm font-medium dark:text-gray-200">Data de Próxima Revisão (Opcional)</label>
                                <p className="text-xs text-muted-foreground dark:text-gray-400 mb-1">Ex: 2024-03-15</p>
                                <Input
                                    type="date"
                                    value={formData.data_revisao || ''}
                                    onChange={(e) => setFormData(prev => ({...prev, data_revisao: e.target.value || null}))}
                                    className="dark:bg-gray-800 dark:border-gray-600"
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
                                        <label className="text-sm font-medium dark:text-gray-200">Data Break-Even (Opcional)</label>
                                        <p className="text-xs text-muted-foreground dark:text-gray-400 mb-1">Ex: 2024-03-15</p>
                                        <Input
                                            type="date"
                                            value={formData.data_break_even || ''}
                                            onChange={(e) => setFormData(prev => ({...prev, data_break_even: e.target.value || null}))}
                                            className="dark:bg-gray-800 dark:border-gray-600"
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
        <Dialog open={opened} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-800">
                <DialogHeader>
                    <DialogTitle className="dark:text-gray-100">{projeto.nome}</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="info" className="mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="info" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Informações
                        </TabsTrigger>
                        {podeVerFinanceiro && (
                            <TabsTrigger value="financeiro" className="flex items-center gap-2">
                                <Coins className="h-4 w-4" />
                                Financeiro
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="historico" className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            Histórico
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4 mt-4">
                        {/* Descrição com formatação preservada */}
                        <Card className="dark:bg-gray-800/50 dark:border-gray-700">
                            <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">Descrição</p>
                                <p className="whitespace-pre-wrap dark:text-gray-200">{projeto.descricao}</p>
                            </CardContent>
                        </Card>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="dark:bg-gray-800/50 dark:border-gray-700">
                                <CardContent className="p-3">
                                    <p className="text-xs text-muted-foreground dark:text-gray-400">Status</p>
                                    <StatusBadge status={projeto.status} />
                                </CardContent>
                            </Card>
                            <Card className="dark:bg-gray-800/50 dark:border-gray-700">
                                <CardContent className="p-3">
                                    <p className="text-xs text-muted-foreground dark:text-gray-400">Tipo</p>
                                    <p className="text-sm font-medium dark:text-gray-200">{projeto.tipo_projeto}</p>
                                </CardContent>
                            </Card>
                            <Card className="dark:bg-gray-800/50 dark:border-gray-700">
                                <CardContent className="p-3">
                                    <p className="text-xs text-muted-foreground dark:text-gray-400">Departamentos</p>
                                    <div className="flex gap-1 flex-wrap">
                                        {projeto.departamentos_display?.length > 0 ? (
                                            projeto.departamentos_display.map((dept, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs">{dept}</Badge>
                                            ))
                                        ) : (
                                            <span className="text-sm">{projeto.departamento_atendido || 'N/A'}</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardContent className="p-3">
                                    <p className="text-xs text-muted-foreground">Prioridade</p>
                                    <PrioridadeBadge prioridade={projeto.prioridade} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-3">
                                    <p className="text-xs text-muted-foreground">Complexidade</p>
                                    <Badge variant="outline" className="bg-blue-100 text-blue-800">{projeto.complexidade}</Badge>
                                </CardContent>
                            </Card>
                        </div>

                        {/* BREAKDOWN DE HORAS */}
                        <Card>
                            <CardContent className="p-4">
                                <h3 className="text-base font-medium mb-4">⏱️ Breakdown de Horas</h3>
                                <div className="grid grid-cols-5 gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Total</p>
                                        <p className="text-lg font-bold">{projeto.horas_totais}h</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Desenvolvimento</p>
                                        <p className="text-sm">{projeto.horas_desenvolvimento || 0}h</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Testes</p>
                                        <p className="text-sm">{projeto.horas_testes || 0}h</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Documentação</p>
                                        <p className="text-sm">{projeto.horas_documentacao || 0}h</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Deploy</p>
                                        <p className="text-sm">{projeto.horas_deploy || 0}h</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* INFORMAÇÕES ADICIONAIS */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardContent className="p-3">
                                    <p className="text-xs text-muted-foreground">Usuários Impactados</p>
                                    <p className="text-sm font-medium">{projeto.usuarios_impactados}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-3">
                                    <p className="text-xs text-muted-foreground">Frequência de Uso</p>
                                    <p className="text-sm font-medium">{projeto.frequencia_uso}</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* FERRAMENTAS */}
                        {projeto.ferramentas_tecnologias?.length > 0 && (
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-sm text-muted-foreground mb-2">Ferramentas/Tecnologias</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {projeto.ferramentas_tecnologias.map((tech, i) => (
                                            <Badge key={i} variant="outline">{tech}</Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Documentação com formatação preservada */}
                        {(projeto.documentacao_tecnica || projeto.licoes_aprendidas || projeto.proximos_passos) && (
                            <Card>
                                <CardContent className="p-4">
                                    <h3 className="text-base font-medium mb-4">📚 Documentação</h3>
                                    <div className="space-y-4">
                                        {projeto.documentacao_tecnica && (
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Documentação Técnica</p>
                                                <a 
                                                    href={projeto.documentacao_tecnica} 
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-blue-600 hover:underline"
                                                >
                                                    {projeto.documentacao_tecnica}
                                                </a>
                                            </div>
                                        )}
                                        
                                        {projeto.licoes_aprendidas && (
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Lições Aprendidas</p>
                                                <p className="text-sm whitespace-pre-wrap">
                                                    {projeto.licoes_aprendidas}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {projeto.proximos_passos && (
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-1">Próximos Passos</p>
                                                <p className="text-sm whitespace-pre-wrap">
                                                    {projeto.proximos_passos}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* LINK DO PROJETO */}
                        {projeto.link_projeto && (
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-sm text-muted-foreground mb-1">Link do Projeto</p>
                                    <a 
                                        href={projeto.link_projeto} 
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        {projeto.link_projeto}
                                    </a>
                                </CardContent>
                            </Card>
                        )}

                        {/* CRIADORES */}
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground mb-2">Criadores/Responsáveis</p>
                                <div className="flex gap-2 flex-wrap">
                                    {projeto.criadores?.length > 0 ? (
                                        projeto.criadores.map((criador, i) => (
                                            <Badge key={i} variant="outline">{criador.nome_completo || criador.username}</Badge>
                                        ))
                                    ) : (
                                        <span className="text-sm">Nenhum criador definido</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                {/* ABA FINANCEIRO */}
                {podeVerFinanceiro && !metricas?.acesso_restrito && (
                    <TabsContent value="financeiro" className="space-y-4 mt-4">
                        <div className="space-y-4">
                            {/* CUSTOS */}
                            <Card>
                                <CardContent className="p-4">
                                    <h3 className="text-base font-medium mb-4">💰 Custos</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Custo/Hora Empresa</p>
                                            <p className="text-sm font-medium">R$ {projeto.custo_hora_empresa || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">APIs/Mês</p>
                                            <p className="text-sm font-medium">R$ {projeto.custo_apis_mensal || 0}</p>
                                        </div>
                                    </div>
                                    
                                    {/* LISTA DE FERRAMENTAS */}
                                    {projeto.lista_ferramentas?.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-sm text-muted-foreground mb-2">Ferramentas/Infraestrutura</p>
                                            <div className="space-y-2">
                                                {projeto.lista_ferramentas.map((ferramenta, i) => (
                                                    <div key={i} className="flex justify-between items-center">
                                                        <span className="text-sm">{ferramenta.nome}</span>
                                                        <span className="text-sm font-medium">R$ {ferramenta.valor}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* RETORNOS */}
                            <Card>
                                <CardContent className="p-4">
                                    <h3 className="text-base font-medium mb-4">📈 Retornos</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Horas Economizadas/Mês</p>
                                            <p className="text-sm font-medium">{projeto.horas_economizadas_mes || 0}h</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Valor Monetário/Mês</p>
                                            <p className="text-sm font-medium">R$ {projeto.valor_monetario_economizado_mes || 0}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* MÉTRICAS CALCULADAS */}
                            {metricas && (
                                <Card className="bg-blue-50">
                                    <CardContent className="p-4">
                                        <h3 className="text-base font-medium mb-4">📊 Métricas Calculadas</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground">ROI</p>
                                                <p className={`text-lg font-bold ${metricas.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {metricas.roi}%
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Economia/Mês</p>
                                                <p className="text-lg font-bold">
                                                    R$ {metricas.economia_mensal?.toLocaleString('pt-BR')}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Payback (meses)</p>
                                                <p className="text-lg font-bold">
                                                    {metricas.payback_meses}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>
                )}

                <TabsContent value="historico" className="space-y-4 mt-4">
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="p-4">
                                <h3 className="text-lg font-semibold mb-4">📋 Informações do Sistema</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Criado em</p>
                                        <p className="text-sm">{new Date(projeto.criado_em).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Última atualização</p>
                                        <p className="text-sm">{new Date(projeto.atualizado_em).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Criado por</p>
                                        <p className="text-sm">{projeto.criado_por_nome}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Versão atual</p>
                                        <p className="text-sm">{projeto.versao_atual}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* HISTÓRICO DE VERSÕES */}
                        {projeto.versoes?.length > 0 && (
                            <Card>
                                <CardContent className="p-4">
                                    <h3 className="text-lg font-semibold mb-4">📝 Histórico de Versões</h3>
                                    <CustomTimeline>
                                        {projeto.versoes.map((versao, i) => (
                                            <CustomTimeline.Item key={i}>
                                                <p className="text-sm font-medium dark:text-gray-200">v{versao.versao}</p>
                                                <p className="text-xs text-muted-foreground dark:text-gray-400">{versao.responsavel_nome}</p>
                                                <p className="text-xs text-muted-foreground dark:text-gray-400">
                                                    {new Date(versao.data_lancamento).toLocaleDateString('pt-BR')}
                                                </p>
                                                <p className="text-sm dark:text-gray-300">{versao.motivo_mudanca}</p>
                                            </CustomTimeline.Item>
                                        ))}
                                    </CustomTimeline>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
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
    const debouncedSearch = useDebounce(searchValue, 500);
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
            showNotification({
                title: 'Erro',
                message: 'Erro ao carregar projetos',
                type: 'error'
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
            
            showNotification({
                title: 'Sucesso',
                message: selectedProjeto ? 'Projeto atualizado!' : 'Projeto criado!',
                type: 'success'
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
            
            showNotification({
                title: 'Erro',
                message: errorMessage,
                type: 'error'
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
            showNotification({
                title: 'Erro',
                message: 'Erro ao carregar detalhes do projeto',
                type: 'error'
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
            showNotification({
                title: 'Erro',
                message: 'Erro ao carregar projeto para edição',
                type: 'error'
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
            
            showNotification({
                title: 'Sucesso',
                message: `Projeto ${statusLabels[novoStatus]} com sucesso`,
                type: 'success'
            });
            
            carregarProjetos();
            carregarDadosIniciais();
        } catch (err) {
            console.error('Erro ao alterar status:', err);
            showNotification({
                title: 'Erro',
                message: 'Erro ao alterar status do projeto',
                type: 'error'
            });
        }
    };

    const handleArchiveProjeto = async (projeto) => {
        try {
            await axios.post(`/ia/projetos/${projeto.id}/arquivar/`);
            showNotification({
                title: 'Sucesso',
                message: `Projeto ${projeto.status === 'arquivado' ? 'reativado' : 'arquivado'}`,
                type: 'success'
            });
            carregarProjetos();
            carregarDadosIniciais();
        } catch (err) {
            console.error('Erro ao arquivar projeto:', err);
            showNotification({
                title: 'Erro',
                message: 'Erro ao arquivar projeto',
                type: 'error'
            });
        }
    };

    const handleDuplicateProjeto = async (projeto) => {
        try {
            await axios.post(`/ia/projetos/${projeto.id}/duplicar/`);
            showNotification({
                title: 'Sucesso',
                message: 'Projeto duplicado com sucesso',
                type: 'success'
            });
            carregarProjetos();
        } catch (err) {
            console.error('Erro ao duplicar projeto:', err);
            showNotification({
                title: 'Erro',
                message: 'Erro ao duplicar projeto',
                type: 'error'
            });
        }
    };

    // Projetos filtrados e ordenados
    const projetosFiltrados = useMemo(() => {
        return projetos;
    }, [projetos]);

    return (
        <div className="max-w-7xl mx-auto p-6 dark:bg-gray-950 min-h-screen">
            {loading && (
                <div className="fixed inset-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Bot className="h-8 w-8 dark:text-blue-400" />
                        <h1 className="text-2xl font-bold dark:text-gray-100">🤖 Dashboard de IA & Automação</h1>
                    </div>
                    <p className="text-muted-foreground dark:text-gray-400">
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
                    <Card className="border bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                <div>
                                    <p className="text-sm text-muted-foreground dark:text-gray-400">Total de Projetos</p>
                                    <p className="text-2xl font-bold dark:text-gray-100">{stats.total_projetos}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="border bg-green-50 dark:bg-green-950/30 dark:border-green-800">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                                <div>
                                    <p className="text-sm text-muted-foreground dark:text-gray-400">Projetos Ativos</p>
                                    <p className="text-2xl font-bold dark:text-gray-100">{stats.projetos_ativos}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="border bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                <div>
                                    <p className="text-sm text-muted-foreground dark:text-gray-400">Horas Investidas</p>
                                    <p className="text-2xl font-bold dark:text-gray-100">{stats.horas_totais_investidas}h</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Só mostrar se tiver dados financeiros E permissão */}
                    {userPermissions?.pode_ver_financeiro && stats.economia_mensal_total && (
                        <Card className="border bg-teal-50 dark:bg-teal-950/30 dark:border-teal-800">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                                    <div>
                                        <p className="text-sm text-muted-foreground dark:text-gray-400">Economia/Mês</p>
                                        <p className="text-2xl font-bold dark:text-gray-100">
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
            <Card className="mb-4 dark:bg-gray-900/50 dark:border-gray-800">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar projetos..."
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 mb-1">
                                Status: {(filtros.status || []).length > 0 ? `${filtros.status.length} selecionados` : 'Todos'}
                            </div>
                            <div className="space-y-1 max-h-24 overflow-y-auto border rounded p-2 text-xs">
                                {(opcoes?.status_choices || []).map((status) => (
                                    <div key={status.value} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`status-${status.value}`}
                                            checked={(filtros.status || []).includes(status.value)}
                                            onChange={(e) => {
                                                const current = filtros.status || [];
                                                if (e.target.checked) {
                                                    setFiltros(prev => ({...prev, status: [...current, status.value]}));
                                                } else {
                                                    setFiltros(prev => ({...prev, status: current.filter(s => s !== status.value)}));
                                                }
                                            }}
                                        />
                                        <label htmlFor={`status-${status.value}`} className="text-xs">{status.label}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 mb-1">
                                Tipo: {(filtros.tipo_projeto || []).length > 0 ? `${filtros.tipo_projeto.length} selecionados` : 'Todos'}
                            </div>
                            <div className="space-y-1 max-h-24 overflow-y-auto border rounded p-2 text-xs">
                                {(opcoes?.tipo_projeto_choices || []).map((tipo) => (
                                    <div key={tipo.value} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`tipo-${tipo.value}`}
                                            checked={(filtros.tipo_projeto || []).includes(tipo.value)}
                                            onChange={(e) => {
                                                const current = filtros.tipo_projeto || [];
                                                if (e.target.checked) {
                                                    setFiltros(prev => ({...prev, tipo_projeto: [...current, tipo.value]}));
                                                } else {
                                                    setFiltros(prev => ({...prev, tipo_projeto: current.filter(t => t !== tipo.value)}));
                                                }
                                            }}
                                        />
                                        <label htmlFor={`tipo-${tipo.value}`} className="text-xs">{tipo.label}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 mb-1">
                                Depto: {(filtros.departamento || []).length > 0 ? `${filtros.departamento.length} selecionados` : 'Todos'}
                            </div>
                            <div className="space-y-1 max-h-24 overflow-y-auto border rounded p-2 text-xs">
                                {(opcoes?.departamento_choices || []).map((dept) => (
                                    <div key={dept.value} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`dept-${dept.value}`}
                                            checked={(filtros.departamento || []).includes(dept.value)}
                                            onChange={(e) => {
                                                const current = filtros.departamento || [];
                                                if (e.target.checked) {
                                                    setFiltros(prev => ({...prev, departamento: [...current, dept.value]}));
                                                } else {
                                                    setFiltros(prev => ({...prev, departamento: current.filter(d => d !== dept.value)}));
                                                }
                                            }}
                                        />
                                        <label htmlFor={`dept-${dept.value}`} className="text-xs">{dept.label}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={viewMode === 'cards' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('cards')}
                            >
                                <Target className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'tabela' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('tabela')}
                            >
                                <FileText className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de Projetos */}
            {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                    showNotification({
                                        title: 'Aviso',
                                        message: 'Aguarde o carregamento das opções',
                                        type: 'default'
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
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden dark:border-gray-800">
                    <Table className="dark:bg-gray-900/50">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Horas</TableHead>
                                {userPermissions?.pode_ver_financeiro && <TableHead>ROI</TableHead>}
                                <TableHead>Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projetosFiltrados.map((projeto) => (
                                <TableRow key={projeto.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{projeto.nome}</p>
                                            <p className="text-xs text-muted-foreground">{projeto.criadores_nomes.join(', ')}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={projeto.status} />
                                    </TableCell>
                                    <TableCell>{projeto.tipo_projeto}</TableCell>
                                    <TableCell>{projeto.horas_totais}h</TableCell>
                                    {userPermissions?.pode_ver_financeiro && (
                                        <TableCell>
                                            {projeto.metricas_financeiras?.acesso_restrito ? (
                                                <span className="text-xs text-muted-foreground">Restrito</span>
                                            ) : (
                                                <span className={`font-medium ${projeto.metricas_financeiras?.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {projeto.metricas_financeiras?.roi}%
                                                </span>
                                            )}
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => handleViewProjeto(projeto)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleEditProjeto(projeto)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
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
        </div>
    );
}

// Modal de Nova Versão
const NovaVersaoModal = ({ opened, onClose, projeto, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        versao: '',
        motivo_mudanca: ''
    });
    const [errors, setErrors] = useState({});

    // Reset form when modal opens
    useEffect(() => {
        if (opened) {
            setFormData({
                versao: '',
                motivo_mudanca: ''
            });
            setErrors({});
        }
    }, [opened]);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.versao.trim()) {
            newErrors.versao = 'Versão é obrigatória';
        }
        if (!formData.motivo_mudanca.trim()) {
            newErrors.motivo_mudanca = 'Motivo da mudança é obrigatório';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!projeto || !validateForm()) return;
        
        try {
            setLoading(true);
            await axios.post(`/ia/projetos/${projeto.id}/nova_versao/`, formData);
            
            showNotification({
                title: 'Sucesso',
                message: `Nova versão ${formData.versao} criada com sucesso`,
                type: 'success'
            });
            
            onClose();
            onSave();
        } catch (err) {
            console.error('Erro ao criar nova versão:', err);
            showNotification({
                title: 'Erro',
                message: err.response?.data?.detail || 'Erro ao criar nova versão',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    if (!projeto) return null;

    return (
        <Dialog open={opened} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Nova Versão - {projeto.nome}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                        <GitBranch className="h-4 w-4" />
                        <AlertDescription className="dark:text-blue-200">
                            Versão atual: <strong>{projeto.versao_atual}</strong>
                        </AlertDescription>
                    </Alert>
                    
                    <div>
                        <label className="text-sm font-medium dark:text-gray-200">Nova Versão</label>
                        <Input
                            placeholder="Ex: 1.2.0"
                            required
                            value={formData.versao}
                            onChange={(e) => setFormData(prev => ({ ...prev, versao: e.target.value }))}
                            className={errors.versao ? 'border-red-500' : ''}
                        />
                        {errors.versao && (
                            <p className="text-sm text-red-500 mt-1">{errors.versao}</p>
                        )}
                    </div>
                    
                    <div>
                        <label className="text-sm font-medium dark:text-gray-200">Motivo da Mudança</label>
                        <Textarea
                            placeholder="Descreva as alterações realizadas..."
                            rows={4}
                            required
                            value={formData.motivo_mudanca}
                            onChange={(e) => setFormData(prev => ({ ...prev, motivo_mudanca: e.target.value }))}
                            className={errors.motivo_mudanca ? 'border-red-500' : ''}
                        />
                        {errors.motivo_mudanca && (
                            <p className="text-sm text-red-500 mt-1">{errors.motivo_mudanca}</p>
                        )}
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Criando...' : 'Criar Versão'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ProjetoDashboard;