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
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog';
import { Loader2, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '../ui/use-toast';

/**
 * Modal para editar permissões de módulos de um membro
 */
const EditarPermissoesModal = ({ open, onClose, membro, organizationId, onSuccess }) => {
    const [modulos, setModulos] = useState([]);
    const [grupos, setGrupos] = useState({});
    const [modulosSelecionados, setModulosSelecionados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const { toast } = useToast();

    // Carregar módulos disponíveis e permissões atuais
    useEffect(() => {
        const carregarDados = async () => {
            try {
                setLoading(true);
                setError(null);

                // Carregar módulos disponíveis
                const modulosResponse = await apiClient.get(
                    `/api/organizations/${organizationId}/modulos_disponiveis/`
                );

                setModulos(modulosResponse.data.modulos || []);
                setGrupos(modulosResponse.data.grupos || {});

                // Definir módulos já selecionados
                setModulosSelecionados(membro.permissoes || []);

            } catch (err) {
                console.error('Erro ao carregar módulos:', err);
                const errorMessage = err.response?.data?.error ||
                    err.response?.data?.detail ||
                    'Erro ao carregar módulos disponíveis. Verifique sua conexão e tente novamente.';

                setError(errorMessage);

                toast({
                    title: "Erro ao carregar dados",
                    description: errorMessage,
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        if (open) {
            carregarDados();
        }
    }, [open, organizationId, membro, toast]);

    // Toggle módulo
    const handleToggleModulo = (moduleKey) => {
        setModulosSelecionados(prev => {
            if (prev.includes(moduleKey)) {
                return prev.filter(k => k !== moduleKey);
            } else {
                return [...prev, moduleKey];
            }
        });
    };

    // Selecionar/Desselecionar todos de um grupo
    const handleToggleGrupo = (grupo) => {
        const modulosDoGrupo = grupos[grupo].map(m => m.key);
        const todosSelecionados = modulosDoGrupo.every(k => modulosSelecionados.includes(k));

        if (todosSelecionados) {
            // Remover todos do grupo
            setModulosSelecionados(prev => prev.filter(k => !modulosDoGrupo.includes(k)));
        } else {
            // Adicionar todos do grupo
            setModulosSelecionados(prev => {
                const novos = modulosDoGrupo.filter(k => !prev.includes(k));
                return [...prev, ...novos];
            });
        }
    };

    // Validar e iniciar salvamento
    const handleIniciarSalvamento = () => {
        // Validação: verificar se há pelo menos um módulo selecionado
        if (modulosSelecionados.length === 0) {
            setShowConfirmDialog(true);
            return;
        }

        handleSalvar();
    };

    // Salvar permissões
    const handleSalvar = async () => {
        try {
            setSalvando(true);
            setError(null);

            await apiClient.post(
                `/api/organizations/${organizationId}/atualizar_permissoes/`,
                {
                    membro_id: membro.id,
                    modulos: modulosSelecionados
                }
            );

            // Mostrar toast de sucesso
            toast({
                title: "Permissões atualizadas",
                description: `As permissões de ${membro.user.full_name} foram atualizadas com sucesso!`,
                variant: "default",
            });

            // Chamar callback de sucesso e fechar modal
            onSuccess();
            onClose();

        } catch (err) {
            console.error('Erro ao salvar permissões:', err);
            const errorMessage = err.response?.data?.error ||
                err.response?.data?.detail ||
                'Erro ao salvar permissões. Tente novamente.';

            setError(errorMessage);

            toast({
                title: "Erro ao salvar",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setSalvando(false);
        }
    };

    const handleClose = () => {
        if (!salvando) {
            setModulosSelecionados([]);
            setError(null);
            onClose();
        }
    };

    // Verificar se é admin ou owner (não precisa configurar permissões)
    const isAdminOuOwner = membro.role === 'admin' || membro.role === 'owner';

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Editar Permissões de {membro.user.full_name}
                    </DialogTitle>
                    <DialogDescription>
                        {isAdminOuOwner ? (
                            <span className="text-orange-600 font-medium">
                                {membro.role === 'owner' ? 'Owners' : 'Admins'} têm acesso a todos os módulos automaticamente
                            </span>
                        ) : (
                            'Selecione quais módulos este membro pode acessar'
                        )}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                        <p className="text-sm text-muted-foreground">Carregando módulos disponíveis...</p>
                    </div>
                ) : error ? (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            {error}
                        </AlertDescription>
                    </Alert>
                ) : isAdminOuOwner ? (
                    <Alert>
                        <AlertDescription>
                            Não é necessário configurar permissões para {membro.role === 'owner' ? 'Owners' : 'Admins'}.
                            Eles já possuem acesso total a todos os módulos.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <ScrollArea className="max-h-[400px] pr-4">
                        <div className="space-y-6">
                            {Object.entries(grupos).map(([nomeGrupo, modulosDoGrupo]) => {
                                const todosSelecionados = modulosDoGrupo.every(m =>
                                    modulosSelecionados.includes(m.key)
                                );
                                const algunsSelecionados = modulosDoGrupo.some(m =>
                                    modulosSelecionados.includes(m.key)
                                );

                                return (
                                    <div key={nomeGrupo} className="space-y-3">
                                        {/* Header do Grupo */}
                                        <div className="flex items-center gap-2 pb-2 border-b">
                                            <Checkbox
                                                id={`grupo-${nomeGrupo}`}
                                                checked={todosSelecionados}
                                                onCheckedChange={() => handleToggleGrupo(nomeGrupo)}
                                                className={algunsSelecionados && !todosSelecionados ? 'opacity-50' : ''}
                                            />
                                            <Label
                                                htmlFor={`grupo-${nomeGrupo}`}
                                                className="text-sm font-semibold cursor-pointer"
                                            >
                                                {nomeGrupo}
                                            </Label>
                                            <span className="text-xs text-muted-foreground ml-auto">
                                                {modulosDoGrupo.filter(m => modulosSelecionados.includes(m.key)).length} / {modulosDoGrupo.length}
                                            </span>
                                        </div>

                                        {/* Módulos do Grupo */}
                                        <div className="space-y-2 pl-6">
                                            {modulosDoGrupo.map(modulo => (
                                                <div key={modulo.key} className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={modulo.key}
                                                        checked={modulosSelecionados.includes(modulo.key)}
                                                        onCheckedChange={() => handleToggleModulo(modulo.key)}
                                                    />
                                                    <Label
                                                        htmlFor={modulo.key}
                                                        className="text-sm cursor-pointer"
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
                )}

                {!isAdminOuOwner && !loading && !error && (
                    <div className="flex items-center justify-between text-sm bg-muted p-3 rounded-md">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-orange-500" />
                            <span className="text-muted-foreground">
                                <strong className="text-foreground">{modulosSelecionados.length}</strong> módulo(s) selecionado(s)
                            </span>
                        </div>
                        {modulosSelecionados.length === 0 && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Nenhum módulo selecionado
                            </span>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={salvando || loading}
                    >
                        {isAdminOuOwner ? 'Fechar' : 'Cancelar'}
                    </Button>
                    {!isAdminOuOwner && (
                        <Button
                            onClick={handleIniciarSalvamento}
                            disabled={salvando || loading || error}
                        >
                            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {salvando ? 'Salvando...' : 'Salvar Permissões'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>

            {/* Dialog de confirmação quando nenhum módulo está selecionado */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            Confirmar ação
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a remover <strong>todas as permissões</strong> de{' '}
                            <strong>{membro.user.full_name}</strong>.
                            <br /><br />
                            Isso significa que este membro não terá acesso a nenhum módulo da organização.
                            <br /><br />
                            Deseja continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setShowConfirmDialog(false);
                                handleSalvar();
                            }}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            Sim, remover todas
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
};

export default EditarPermissoesModal;
