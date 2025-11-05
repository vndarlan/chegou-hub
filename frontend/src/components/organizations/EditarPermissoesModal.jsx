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
import { Loader2, Shield } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

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
    const [success, setSuccess] = useState(false);

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
                setError('Erro ao carregar dados. Tente novamente.');
            } finally {
                setLoading(false);
            }
        };

        if (open) {
            carregarDados();
        }
    }, [open, organizationId, membro]);

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

    // Salvar permissões
    const handleSalvar = async () => {
        try {
            setSalvando(true);
            setError(null);
            setSuccess(false);

            await apiClient.post(
                `/api/organizations/${organizationId}/atualizar_permissoes/`,
                {
                    membro_id: membro.id,
                    modulos: modulosSelecionados
                }
            );

            setSuccess(true);

            // Fechar modal após 1 segundo
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);

        } catch (err) {
            console.error('Erro ao salvar permissões:', err);
            const mensagem = err.response?.data?.error || 'Erro ao salvar permissões. Tente novamente.';
            setError(mensagem);
        } finally {
            setSalvando(false);
        }
    };

    const handleClose = () => {
        if (!salvando) {
            setModulosSelecionados([]);
            setError(null);
            setSuccess(false);
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
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    </div>
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
                            ✓ Permissões atualizadas com sucesso!
                        </AlertDescription>
                    </Alert>
                )}

                {!isAdminOuOwner && (
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        <strong>{modulosSelecionados.length}</strong> módulo(s) selecionado(s)
                    </div>
                )}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={salvando}
                    >
                        {isAdminOuOwner ? 'Fechar' : 'Cancelar'}
                    </Button>
                    {!isAdminOuOwner && (
                        <Button onClick={handleSalvar} disabled={salvando}>
                            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {salvando ? 'Salvando...' : 'Salvar Permissões'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditarPermissoesModal;
