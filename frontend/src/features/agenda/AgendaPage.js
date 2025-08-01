// src/features/agenda/AgendaPage.js - MIGRATED TO SHADCN/UI
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Calendar,
    Settings,
    Info,
    X,
    Check,
    Trash2,
    RefreshCw,
    ExternalLink,
    Pencil,
    Plus,
    AlertCircle,
    Loader2
} from 'lucide-react';
import axios from 'axios';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Separator } from '../../components/ui/separator';

// Função para extrair SRC do Iframe
const extractSrcFromIframe = (iframeString) => {
    if (!iframeString || typeof iframeString !== 'string') return null;
    
    const matchSrc = iframeString.match(/src\s*=\s*["']([^"']+)["']/i);
    
    if (matchSrc && matchSrc[1]) {
        return matchSrc[1];
    }
    
    const urlMatch = iframeString.match(/(https?:\/\/[^\s"'<>]+)/i);
    return urlMatch ? urlMatch[1] : null;
};

// Função para adicionar cor a calendário privado
const addColorToPrivateCalendar = (originalUrl, calendarName) => {
    if (!originalUrl) return null;
    
    try {
        const url = new URL(originalUrl);
        
        if (url.searchParams.has('color')) {
            return originalUrl;
        }
        
        const color = getColorForCalendar(calendarName);
        url.searchParams.set('color', encodeURIComponent(color));
        
        console.log(`🎨 Cor adicionada para "${calendarName}": ${color}`);
        return url.toString();
    } catch (e) {
        console.warn("Erro ao adicionar cor:", e);
        return originalUrl;
    }
};

// Cores do Google Calendar para calendários privados
const getColorForCalendar = (calendarName) => {
    const colors = [
        '#D50000', '#E67C73', '#F4511E', '#F6BF26', '#33B679', 
        '#0B8043', '#039BE5', '#3F51B5', '#7986CB', '#9C27B0'
    ];
    
    if (!calendarName) return colors[0];
    
    let hash = 0;
    for (let i = 0; i < calendarName.length; i++) {
        hash = calendarName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
};

function AgendaPage() {
    // Estados principais
    const [activeTab, setActiveTab] = useState('visualizar');
    const [calendarios, setCalendarios] = useState([]);
    const [selectedDbId, setSelectedDbId] = useState(null);
    const [isLoadingCalendars, setIsLoadingCalendars] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [selectOptions, setSelectOptions] = useState([]);

    // Estados para o formulário de adição
    const [novoNome, setNovoNome] = useState('');
    const [novoIframeCode, setNovoIframeCode] = useState('');
    const [addNotification, setAddNotification] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    
    // Estados para o formulário de edição
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingCalendar, setEditingCalendar] = useState(null);
    const [editName, setEditName] = useState('');
    const [editIframeCode, setEditIframeCode] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editNotification, setEditNotification] = useState(null);

    // Buscar calendários
    const fetchCalendars = useCallback(async (selectFirst = true) => {
        setIsLoadingCalendars(true);
        setFetchError(null);
        console.log("Buscando calendários (iframe) da API...");
        try {
            const response = await axios.get('/calendars/');
            console.log("Calendários (iframe) recebidos:", response.data);
            
            const calendarData = response.data;
            setCalendarios(calendarData);

            if (selectFirst) {
                if (calendarData.length > 0) {
                    setSelectedDbId(calendarData[0].id);
                } else {
                    setSelectedDbId(null);
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
    }, []);

    // Busca inicial
    useEffect(() => {
        const initialFetch = async () => {
            setIsLoadingCalendars(true);
            setFetchError(null);
            console.log("Buscando calendários (iframe) da API...");
            try {
                const response = await axios.get('/calendars/');
                console.log("Calendários (iframe) recebidos:", response.data);
                
                const calendarData = response.data;
                setCalendarios(calendarData);

                if (calendarData.length > 0) {
                    setSelectedDbId(calendarData[0].id);
                } else {
                    setSelectedDbId(null);
                }

            } catch (error) {
                console.error("Erro ao buscar calendários (iframe):", error.response?.data || error.message);
                setFetchError("Falha ao carregar a lista de calendários. Verifique a conexão ou tente recarregar.");
                setCalendarios([]);
                setSelectedDbId(null);
            } finally {
                setIsLoadingCalendars(false);
            }
        };
        
        initialFetch();
    }, []);

    // Atualiza as opções do select quando os calendários mudam
    useEffect(() => {
        if (Array.isArray(calendarios) && calendarios.length > 0) {
            try {
                const options = calendarios.map(cal => ({
                    value: cal.id.toString(),
                    label: cal.name || "Calendário sem nome",
                }));
                setSelectOptions(options);
            } catch (error) {
                console.error("Erro ao processar opções do select:", error);
                setSelectOptions([]);
            }
        } else {
            setSelectOptions([]);
        }
    }, [calendarios]);

    // Lógica de Geração da URL do Iframe
    const iframeSrc = useMemo(() => {
        if (selectedDbId) {
            const selectedCal = calendarios.find(cal => cal.id === selectedDbId);
            if (selectedCal) {
                const originalSrc = extractSrcFromIframe(selectedCal.iframe_code);
                const coloredSrc = addColorToPrivateCalendar(originalSrc, selectedCal.name);
                console.log(`📅 URL para "${selectedCal.name}":`, coloredSrc);
                return coloredSrc;
            }
        }
        return null;
    }, [selectedDbId, calendarios]);

    // Abrir modal de edição
    const handleOpenEditModal = (calendar) => {
        setEditingCalendar(calendar);
        setEditName(calendar.name);
        setEditIframeCode(calendar.iframe_code);
        setEditNotification(null);
        setEditModalOpen(true);
    };

    // Fechar modal de edição
    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setEditingCalendar(null);
        setEditName('');
        setEditIframeCode('');
        setEditNotification(null);
    };

    // Adicionar calendário
    const handleAddCalendario = async () => {
        setAddNotification(null);
        if (!novoNome || !novoIframeCode) {
            setAddNotification({ 
                type: 'error', 
                message: 'Por favor, preencha Nome e Código Iframe.' 
            });
            return;
        }
        
        if (!novoIframeCode.includes('<iframe') || !novoIframeCode.includes('src=')) {
            setAddNotification({ 
                type: 'error', 
                message: 'O código fornecido não parece um iframe válido. Certifique-se de copiar o código completo do calendário.' 
            });
            return;
        }

        setIsAdding(true);
        try {
            const response = await axios.post('/calendars/', {
                name: novoNome.trim(),
                iframe_code: novoIframeCode.trim()
            });
            
            setNovoNome('');
            setNovoIframeCode('');
            setAddNotification({ 
                type: 'success', 
                message: `Calendário "${response.data.name}" adicionado com sucesso!` 
            });
            
            await fetchCalendars(false);

        } catch (error) {
            console.error("Erro ao adicionar calendário:", error.response?.data || error.message);
            
            const backendError = error.response?.data;
            let errorMessage = "Erro desconhecido ao adicionar o calendário.";
            
            if (backendError) {
                if (backendError.iframe_code) {
                    errorMessage = `Código Iframe: ${backendError.iframe_code[0]}`;
                } else if (backendError.name) {
                    errorMessage = `Nome: ${backendError.name[0]}`;
                } else if (typeof backendError === 'string') {
                    errorMessage = backendError;
                } else if (backendError.detail) {
                    errorMessage = backendError.detail;
                }
            }
            
            setAddNotification({ 
                type: 'error', 
                message: errorMessage 
            });
        } finally {
            setIsAdding(false);
        }
    };

    // Editar calendário
    const handleEditCalendario = async () => {
        setEditNotification(null);
        if (!editName || !editIframeCode) {
            setEditNotification({ 
                type: 'error', 
                message: 'Por favor, preencha Nome e Código Iframe.' 
            });
            return;
        }
        
        if (!editIframeCode.includes('<iframe') || !editIframeCode.includes('src=')) {
            setEditNotification({ 
                type: 'error', 
                message: 'O código fornecido não parece um iframe válido.' 
            });
            return;
        }

        setIsEditing(true);
        try {
            await axios.put(`/calendars/${editingCalendar.id}/`, {
                name: editName.trim(),
                iframe_code: editIframeCode.trim()
            });
            
            setEditNotification({ 
                type: 'success', 
                message: `Calendário "${editName}" atualizado com sucesso!` 
            });
            
            await fetchCalendars(false);
            
            setTimeout(() => {
                handleCloseEditModal();
            }, 1500);

        } catch (error) {
            console.error("Erro ao editar calendário:", error.response?.data || error.message);
            
            const backendError = error.response?.data;
            let errorMessage = "Erro desconhecido ao atualizar o calendário.";
            
            if (backendError) {
                if (backendError.iframe_code) {
                    errorMessage = `Código Iframe: ${backendError.iframe_code[0]}`;
                } else if (backendError.name) {
                    errorMessage = `Nome: ${backendError.name[0]}`;
                } else if (typeof backendError === 'string') {
                    errorMessage = backendError;
                } else if (backendError.detail) {
                    errorMessage = backendError.detail;
                }
            }
            
            setEditNotification({ 
                type: 'error', 
                message: errorMessage 
            });
        } finally {
            setIsEditing(false);
        }
    };

    // Remover calendário
    const handleRemoveCalendario = async (idToRemove) => {
        const calToRemove = calendarios.find(c => c.id === idToRemove);
        if (!calToRemove) return;
        
        const calNameToRemove = calToRemove.name;
        
        if (!window.confirm(`Tem certeza que deseja remover "${calNameToRemove}"?`)) {
            return;
        }

        setAddNotification(null);
        try {
            await axios.delete(`/calendars/${idToRemove}/`);
            
            setAddNotification({ 
                type: 'info', 
                message: `Calendário "${calNameToRemove}" removido com sucesso.` 
            });
            
            await fetchCalendars(false);

        } catch (error) {
            console.error("Erro ao remover calendário:", error.response?.data || error.message);
            
            setAddNotification({ 
                type: 'error', 
                message: `Erro ao remover o calendário: ${error.response?.data?.detail || 'Falha na comunicação com o servidor.'}` 
            });
        }
    };

    // Função para verificar a URL do iframe
    const checkIframeUrl = (code) => {
        const src = extractSrcFromIframe(code);
        if (!src) return false;
        
        try {
            new URL(src);
            return true;
        } catch (e) {
            return false;
        }
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">

            {isLoadingCalendars && (
                <div className="flex h-32 items-center justify-center">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Carregando...</span>
                    </div>
                </div>
            )}
            
            {fetchError && !isLoadingCalendars && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="visualizar" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Visualizar
                    </TabsTrigger>
                    <TabsTrigger value="gerenciar" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Gerenciar
                    </TabsTrigger>
                    <TabsTrigger value="instrucoes" className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Instruções
                    </TabsTrigger>
                </TabsList>

                {/* Painel Visualizar */}
                <TabsContent value="visualizar" className="space-y-4">
                    {!isLoadingCalendars && !fetchError && (
                        <>
                            {calendarios.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="max-w-md space-y-2">
                                        <Label htmlFor="calendar-select" className="text-foreground">Selecione um calendário para visualizar:</Label>
                                        <Select 
                                            value={selectedDbId ? selectedDbId.toString() : ""} 
                                            onValueChange={(value) => {
                                                setSelectedDbId(value ? parseInt(value, 10) : null);
                                                setIframeLoaded(false);
                                            }}
                                        >
                                            <SelectTrigger id="calendar-select" className="bg-background border-border text-foreground">
                                                <SelectValue placeholder="Escolha um calendário" className="text-muted-foreground" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-background border-border">
                                                {selectOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value} className="text-foreground hover:bg-accent hover:text-accent-foreground">
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Container do iframe */}
                                    <Card className="relative overflow-hidden">
                                        {iframeSrc ? (
                                            <>
                                                {!iframeLoaded && (
                                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
                                                        <div className="flex items-center gap-2">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            <span className="text-sm text-muted-foreground">Carregando calendário...</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="aspect-video min-h-[600px]">
                                                    <iframe
                                                        key={iframeSrc}
                                                        src={iframeSrc}
                                                        className="w-full h-full border-0"
                                                        title="Google Calendar View"
                                                        onLoad={() => setIframeLoaded(true)}
                                                    />
                                                </div>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="absolute top-4 right-4 z-20"
                                                    asChild
                                                >
                                                    <a href={iframeSrc} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="flex h-96 items-center justify-center">
                                                <p className="text-muted-foreground">Selecione um calendário para visualizar.</p>
                                            </div>
                                        )}
                                    </Card>
                                </div>
                            ) : (
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        Nenhum calendário foi adicionado ainda. Use a aba "Gerenciar".
                                    </AlertDescription>
                                </Alert>
                            )}
                        </>
                    )}
                </TabsContent>

                {/* Painel Gerenciar */}
                <TabsContent value="gerenciar" className="space-y-4">
                    {!isLoadingCalendars && !fetchError && (
                        <div className="grid gap-6 md:grid-cols-5">
                            {/* Coluna Esquerda: Adicionar */}
                            <div className="md:col-span-3">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Adicionar Sua Agenda ao Chegou Hub</CardTitle>
                                        <CardDescription>
                                            Configure sua agenda para visualização pela equipe
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="novo-nome">Nome (Identificação)</Label>
                                            <Input
                                                id="novo-nome"
                                                placeholder="Ex: João Silva"
                                                value={novoNome}
                                                onChange={(e) => setNovoNome(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="novo-iframe">Código Iframe do Google Calendar</Label>
                                            <Textarea
                                                id="novo-iframe"
                                                placeholder="Cole aqui o código"
                                                value={novoIframeCode}
                                                onChange={(e) => setNovoIframeCode(e.target.value)}
                                                rows={3}
                                            />
                                        </div>
                                        
                                        {addNotification && (
                                            <Alert variant={addNotification.type === 'error' ? 'destructive' : 'default'}>
                                                {addNotification.type === 'success' ? (
                                                    <Check className="h-4 w-4" />
                                                ) : addNotification.type === 'info' ? (
                                                    <Info className="h-4 w-4" />
                                                ) : (
                                                    <X className="h-4 w-4" />
                                                )}
                                                <AlertDescription>{addNotification.message}</AlertDescription>
                                            </Alert>
                                        )}
                                        
                                        <Button
                                            onClick={handleAddCalendario}
                                            disabled={!novoNome || !novoIframeCode || isAdding}
                                            className="w-full"
                                        >
                                            {isAdding ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Calendar className="h-4 w-4 mr-2" />
                                            )}
                                            Conectar Minha Agenda
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Coluna Direita: Lista */}
                            <div className="md:col-span-2">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle>Calendários Cadastrados</CardTitle>
                                                <CardDescription>
                                                    {calendarios.length} {calendarios.length === 1 ? 'calendário' : 'calendários'}
                                                </CardDescription>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">
                                                {calendarios.length}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 max-h-80 overflow-y-auto">
                                            {calendarios.length === 0 ? (
                                                <p className="text-center text-muted-foreground text-sm">
                                                    Nenhum calendário cadastrado.
                                                </p>
                                            ) : (
                                                calendarios.map((cal) => {
                                                    const isUrlValid = checkIframeUrl(cal.iframe_code);
                                                    const urlPreview = extractSrcFromIframe(cal.iframe_code)?.substring(0, 35) || '[URL inválida]';
                                                    
                                                    return (
                                                        <Card key={cal.id} className="p-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <div 
                                                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                                                            style={{ backgroundColor: getColorForCalendar(cal.name) }}
                                                                        />
                                                                        <span className="font-medium text-sm truncate">
                                                                            {cal.name}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                                                        {urlPreview}...
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleOpenEditModal(cal)}
                                                                    >
                                                                        <Pencil className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleRemoveCalendario(cal.id)}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* Painel Instruções */}
                <TabsContent value="instrucoes" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Como Compartilhar sua Agenda no Chegou Hub</CardTitle>
                            <CardDescription>
                                Siga os passos abaixo para adicionar sua agenda ao sistema
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p>Para que sua agenda apareça no Chegou Hub, você precisa compartilhá-la diretamente pelo Google Calendar.</p>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold mb-2">Siga estes passos:</h4>
                                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                                    <li>Acesse o <a href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Calendar</a> no seu navegador.</li>
                                    <li>Na barra lateral esquerda, localize a agenda que deseja compartilhar com a equipe.</li>
                                    <li>Passe o mouse sobre o nome da agenda e clique nos três pontinhos (⋮) que aparecem ao lado.</li>
                                    <li>Selecione a opção <code className="bg-muted px-1 py-0.5 rounded text-xs">Configurações e compartilhamento</code>.</li>
                                    <li>Role a página até a seção <code className="bg-muted px-1 py-0.5 rounded text-xs">Compartilhado com pessoas e grupos</code> e clique em <code className="bg-muted px-1 py-0.5 rounded text-xs">Adicionar pessoas e grupos</code>.</li>
                                    <li>Adicione os e-mails: <code className="bg-muted px-1 py-0.5 rounded text-xs">viniciuschegouoperacional@gmail.com</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">felipechegouoperacional@gmail.com</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">joaobento@loja-chegou.com</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">marcoschegouoperacional@gmail.com</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">matheuschegouoperacional@gmail.com</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">murillochegouoperacional@gmail.com</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">nathaliarochachegou@gmail.com</code> e <code className="bg-muted px-1 py-0.5 rounded text-xs">ricardomachadochegou@gmail.com</code>.</li>
                                    <li>Em permissões, selecione <code className="bg-muted px-1 py-0.5 rounded text-xs">Mais detalhes de todos os eventos</code>.</li>
                                    <li>Clique em <code className="bg-muted px-1 py-0.5 rounded text-xs">Enviar</code> para concluir o compartilhamento.</li>
                                    <li>Role um pouco mais a página até encontrar a seção <code className="bg-muted px-1 py-0.5 rounded text-xs">Incorporar código</code> e copie o código exibido.</li>
                                </ol>
                            </div>
                            
                            <Separator />
                            
                            <div>
                                <h4 className="font-semibold mb-2">Adicionando no Chegou Hub:</h4>
                                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                                    <li>Vá para a aba <code className="bg-muted px-1 py-0.5 rounded text-xs">Gerenciar</code> aqui nesta página.</li>
                                    <li>No formulário, digite seu nome no campo <code className="bg-muted px-1 py-0.5 rounded text-xs">Nome (Identificação)</code> para que os outros membros possam identificar de quem é a agenda.</li>
                                    <li>Cole o código Iframe do Google Calendar.</li>
                                    <li>Clique em <code className="bg-muted px-1 py-0.5 rounded text-xs">Adicionar Calendário</code>.</li>
                                </ol>
                            </div>
                            
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <p className="text-sm">Uma vez adicionada, sua agenda estará disponível na aba <code className="bg-background px-1 py-0.5 rounded text-xs">Visualizar</code> e poderá ser vista pelos outros membros da equipe.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal de Edição */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Editar Calendário</DialogTitle>
                        <DialogDescription>
                            Faça alterações nos dados do calendário
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nome (Identificação)</Label>
                            <Input
                                id="edit-name"
                                placeholder="Ex: Marketing, Feriados Nacionais"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-iframe">Código Iframe do Google Calendar</Label>
                            <Textarea
                                id="edit-iframe"
                                placeholder='Cole o código <iframe src="..."></iframe> aqui'
                                value={editIframeCode}
                                onChange={(e) => setEditIframeCode(e.target.value)}
                                rows={4}
                            />
                            {editIframeCode && !checkIframeUrl(editIframeCode) && (
                                <p className="text-sm text-destructive">O código não parece conter um URL válido</p>
                            )}
                        </div>
                        
                        {editNotification && (
                            <Alert variant={editNotification.type === 'error' ? 'destructive' : 'default'}>
                                {editNotification.type === 'success' ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <X className="h-4 w-4" />
                                )}
                                <AlertDescription>{editNotification.message}</AlertDescription>
                            </Alert>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseEditModal}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleEditCalendario} 
                            disabled={!editName || !editIframeCode || isEditing}
                        >
                            {isEditing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default AgendaPage;