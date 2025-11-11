import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/axios';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Mail, UserPlus } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '../ui/use-toast';

/**
 * Modal para convidar novo membro
 */
const ConvitarMembroModal = ({ open, onClose, organizationId, onSuccess }) => {
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('member');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [modulos, setModulos] = useState([]);
    const [grupos, setGrupos] = useState({});
    const [modulosSelecionados, setModulosSelecionados] = useState([]);
    const [loadingModulos, setLoadingModulos] = useState(false);

    // Carregar módulos disponíveis quando o modal abre
    useEffect(() => {
        const carregarModulos = async () => {
            if (!open || !organizationId) return;

            try {
                setLoadingModulos(true);
                const response = await apiClient.get(
                    `/organizations/${organizationId}/modulos_disponiveis/`
                );
                setModulos(response.data.modulos || []);
                setGrupos(response.data.grupos || {});
            } catch (err) {
                console.error('Erro ao carregar módulos:', err);
                toast({
                    title: "Erro ao carregar módulos",
                    description: "Não foi possível carregar a lista de módulos disponíveis.",
                    variant: "destructive",
                });
            } finally {
                setLoadingModulos(false);
            }
        };

        carregarModulos();
    }, [open, organizationId, toast]);

    // Handler para toggle de módulo individual
    const handleToggleModulo = (moduleKey) => {
        setModulosSelecionados(prev => {
            if (prev.includes(moduleKey)) {
                return prev.filter(k => k !== moduleKey);
            } else {
                return [...prev, moduleKey];
            }
        });
    };

    // Handler para toggle de grupo inteiro
    const handleToggleGrupo = (nomeGrupo) => {
        const modulosDoGrupo = grupos[nomeGrupo].map(m => m.key);
        const todosSelecionados = modulosDoGrupo.every(k =>
            modulosSelecionados.includes(k)
        );

        if (todosSelecionados) {
            // Desmarcar todos
            setModulosSelecionados(prev =>
                prev.filter(k => !modulosDoGrupo.includes(k))
            );
        } else {
            // Marcar todos
            setModulosSelecionados(prev => {
                const novos = modulosDoGrupo.filter(k => !prev.includes(k));
                return [...prev, ...novos];
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        // Validações
        if (!email || !email.includes('@')) {
            setError('Por favor, insira um email válido');
            return;
        }

        try {
            setLoading(true);

            await apiClient.post(
                `/organizations/${organizationId}/convidar_membro/`,
                {
                    email: email.trim().toLowerCase(),
                    role: role,
                    modulos: role === 'member' ? modulosSelecionados : []
                }
            );

            setSuccess(true);
            toast({
                title: "Convite enviado!",
                description: role === 'member' && modulosSelecionados.length > 0
                    ? `Convite enviado para ${email} com acesso a ${modulosSelecionados.length} módulo(s).`
                    : `Convite enviado para ${email}.`,
            });
            setEmail('');
            setRole('member');
            setModulosSelecionados([]);

            // Fechar modal após 1 segundo
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);

        } catch (err) {
            console.error('Erro ao enviar convite:', err);
            const mensagem = err.response?.data?.error || 'Erro ao enviar convite. Tente novamente.';
            setError(mensagem);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setEmail('');
            setRole('member');
            setModulosSelecionados([]);
            setError(null);
            setSuccess(false);
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Convidar Novo Membro
                    </DialogTitle>
                    <DialogDescription>
                        Envie um convite por email para adicionar um novo membro à organização
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email">
                            Email do Convidado
                        </Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="email@exemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10"
                                disabled={loading}
                                required
                            />
                        </div>
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                        <Label htmlFor="role">
                            Função
                        </Label>
                        <Select
                            value={role}
                            onValueChange={(newRole) => {
                                setRole(newRole);
                                if (newRole === 'admin') {
                                    setModulosSelecionados([]);
                                }
                            }}
                            disabled={loading}
                        >
                            <SelectTrigger id="role">
                                <SelectValue placeholder="Selecione uma função" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">
                                    <div>
                                        <div className="font-medium">Admin</div>
                                        <div className="text-xs text-muted-foreground">
                                            Acesso total e pode gerenciar membros
                                        </div>
                                    </div>
                                </SelectItem>
                                <SelectItem value="member">
                                    <div>
                                        <div className="font-medium">Membro</div>
                                        <div className="text-xs text-muted-foreground">
                                            Acesso limitado aos módulos permitidos
                                        </div>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {role === 'admin'
                                ? 'Admins têm acesso a todos os módulos automaticamente'
                                : 'Selecione abaixo quais módulos este membro poderá acessar'}
                        </p>
                    </div>

                    {/* Seletor de Módulos - Apenas para Members */}
                    {role === 'member' && (
                        <div className="space-y-2">
                            <Label>Módulos Permitidos</Label>
                            <p className="text-xs text-muted-foreground">
                                Selecione quais páginas este membro poderá acessar. Você pode alterar isso depois.
                            </p>

                            {loadingModulos ? (
                                <div className="flex flex-col items-center justify-center py-8 space-y-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                                    <p className="text-sm text-muted-foreground">Carregando módulos...</p>
                                </div>
                            ) : (
                                <>
                                    <ScrollArea className="h-[280px] border rounded-md p-3">
                                        <div className="space-y-3">
                                            {Object.entries(grupos).map(([nomeGrupo, modulosDoGrupo]) => {
                                                const todosSelecionados = modulosDoGrupo.every(m =>
                                                    modulosSelecionados.includes(m.key)
                                                );
                                                const algunsSelecionados = modulosDoGrupo.some(m =>
                                                    modulosSelecionados.includes(m.key)
                                                ) && !todosSelecionados;

                                                return (
                                                    <div key={nomeGrupo} className="space-y-2">
                                                        {/* Checkbox do grupo */}
                                                        <div className="flex items-center gap-2 border-b pb-2">
                                                            <Checkbox
                                                                id={`grupo-${nomeGrupo}`}
                                                                checked={todosSelecionados}
                                                                ref={algunsSelecionados ? (el) => {
                                                                    if (el) el.indeterminate = true;
                                                                } : undefined}
                                                                onCheckedChange={() => handleToggleGrupo(nomeGrupo)}
                                                            />
                                                            <Label
                                                                htmlFor={`grupo-${nomeGrupo}`}
                                                                className="font-semibold cursor-pointer flex-1"
                                                            >
                                                                {nomeGrupo}
                                                            </Label>
                                                            <span className="text-xs text-muted-foreground">
                                                                {modulosDoGrupo.filter(m => modulosSelecionados.includes(m.key)).length}/{modulosDoGrupo.length}
                                                            </span>
                                                        </div>

                                                        {/* Checkboxes dos módulos */}
                                                        <div className="pl-6 space-y-1.5">
                                                            {modulosDoGrupo.map(modulo => (
                                                                <div key={modulo.key} className="flex items-center gap-2">
                                                                    <Checkbox
                                                                        id={`modulo-${modulo.key}`}
                                                                        checked={modulosSelecionados.includes(modulo.key)}
                                                                        onCheckedChange={() => handleToggleModulo(modulo.key)}
                                                                    />
                                                                    <Label
                                                                        htmlFor={`modulo-${modulo.key}`}
                                                                        className="text-sm cursor-pointer font-normal"
                                                                    >
                                                                        {modulo.name}
                                                                    </Label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>

                                    {/* Contador de módulos selecionados */}
                                    <div className="flex items-center justify-between text-xs bg-muted p-2 rounded">
                                        <span className="text-muted-foreground">
                                            <strong className="text-foreground">{modulosSelecionados.length}</strong> módulo(s) selecionado(s)
                                        </span>
                                        {modulosSelecionados.length === 0 && (
                                            <span className="text-amber-600">
                                                ⚠️ Membro não terá acesso a nenhuma página
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Erro */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Sucesso */}
                    {success && (
                        <Alert className="border-green-500 text-green-700">
                            <AlertDescription>
                                ✓ Convite enviado com sucesso!
                            </AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Enviando...' : 'Enviar Convite'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ConvitarMembroModal;
