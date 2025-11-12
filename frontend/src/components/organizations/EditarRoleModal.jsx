import React, { useState } from 'react';
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
import { Label } from '../ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, UserCog, AlertTriangle } from 'lucide-react';
import { useToast } from '../ui/use-toast';

/**
 * Modal para alterar cargo/role de um membro (Admin ↔ Membro)
 * APENAS OWNER pode usar esta funcionalidade
 */
const EditarRoleModal = ({ open, onClose, membro, organizationId, onSuccess }) => {
    const [role, setRole] = useState(membro?.role || 'member');
    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (role === membro?.role) {
            toast({
                title: "Nenhuma alteração",
                description: "O cargo selecionado já é o atual do membro.",
                variant: "default",
            });
            return;
        }

        try {
            setSalvando(true);
            setError(null);

            await apiClient.post(
                `/organizations/${organizationId}/atualizar_role/`,
                {
                    membro_id: membro.id,
                    role: role,
                }
            );

            toast({
                title: "Cargo atualizado",
                description: `${membro.nome} agora é ${role === 'admin' ? 'Admin' : 'Membro'}`,
            });

            onSuccess?.();
            onClose();

        } catch (err) {
            console.error('Erro ao atualizar cargo:', err);
            const errorMessage = err.response?.data?.error ||
                err.response?.data?.detail ||
                'Não foi possível atualizar o cargo. Tente novamente.';

            setError(errorMessage);

            toast({
                title: "Erro ao atualizar cargo",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setSalvando(false);
        }
    };

    const handleClose = () => {
        if (!salvando) {
            setError(null);
            setRole(membro?.role || 'member');
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-orange-500" />
                        Alterar Cargo
                    </DialogTitle>
                    <DialogDescription>
                        Altere o cargo de <strong>{membro?.nome}</strong> na organização.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="role">Novo Cargo</Label>
                        <Select value={role} onValueChange={setRole} disabled={salvando}>
                            <SelectTrigger id="role">
                                <SelectValue placeholder="Selecione o cargo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">
                                    <div className="flex flex-col items-start">
                                        <span className="font-medium">Admin (Administrador)</span>
                                        <span className="text-xs text-muted-foreground">
                                            Acesso total + gerenciar membros
                                        </span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="member">
                                    <div className="flex flex-col items-start">
                                        <span className="font-medium">Membro</span>
                                        <span className="text-xs text-muted-foreground">
                                            Acesso limitado aos módulos permitidos
                                        </span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Informação sobre cargo atual */}
                    {membro && (
                        <div className="text-sm text-muted-foreground border-l-2 border-orange-200 pl-3 py-1 bg-orange-50 rounded">
                            <strong>Cargo atual:</strong> {membro.role === 'admin' ? 'Admin (Administrador)' : 'Membro'}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={salvando}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={salvando || role === membro?.role}
                        >
                            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alteração
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditarRoleModal;
