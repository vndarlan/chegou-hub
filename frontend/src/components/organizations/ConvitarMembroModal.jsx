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

/**
 * Modal para convidar novo membro
 */
const ConvitarMembroModal = ({ open, onClose, organizationId, onSuccess }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('member');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

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
                `/api/organizations/${organizationId}/convidar_membro/`,
                {
                    email: email.trim().toLowerCase(),
                    role: role,
                    modulos: [] // Permissões serão configuradas depois
                }
            );

            setSuccess(true);
            setEmail('');
            setRole('member');

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
            setError(null);
            setSuccess(false);
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
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
                        <Select value={role} onValueChange={setRole} disabled={loading}>
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
                                : 'As permissões de módulos podem ser configuradas depois'}
                        </p>
                    </div>

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
