import React, { useState } from 'react';
import apiClient from '../../utils/axios';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
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
import { MoreVertical, Mail, X, Clock } from 'lucide-react';

/**
 * Tabela de convites pendentes da organização
 */
const ConvitesPendentesTable = ({ convites, loading, onRefresh, organizationId }) => {
    const [cancelandoConvite, setCancelandoConvite] = useState(null);
    const [showCancelarDialog, setShowCancelarDialog] = useState(false);
    const [reenviando, setReenviando] = useState(null);

    // Formatar data
    const formatarData = (dataString) => {
        if (!dataString) return 'N/A';
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Calcular dias restantes até expiração
    const getDiasRestantes = (dataExpiracao) => {
        const hoje = new Date();
        const expira = new Date(dataExpiracao);
        const diff = Math.ceil((expira - hoje) / (1000 * 60 * 60 * 24));
        return diff;
    };

    // Obter cor do badge baseado na role
    const getRoleBadge = (role) => {
        const badges = {
            admin: { label: 'Admin', variant: 'secondary', color: 'text-purple-600' },
            member: { label: 'Membro', variant: 'outline', color: 'text-blue-600' }
        };
        return badges[role] || badges.member;
    };

    // Reenviar convite
    const handleReenviarConvite = async (convite) => {
        setReenviando(convite.id);

        try {
            await apiClient.post(
                `/organizations/${organizationId}/reenviar_convite/`,
                { convite_id: convite.id }
            );

            alert('Email de convite reenviado com sucesso!');
        } catch (err) {
            console.error('Erro ao reenviar convite:', err);
            alert('Erro ao reenviar convite. Tente novamente.');
        } finally {
            setReenviando(null);
        }
    };

    // Cancelar convite
    const handleCancelarConvite = async () => {
        if (!cancelandoConvite) return;

        try {
            await apiClient.post(
                `/organizations/${organizationId}/cancelar_convite/`,
                { convite_id: cancelandoConvite.id }
            );

            setShowCancelarDialog(false);
            setCancelandoConvite(null);
            onRefresh();
        } catch (err) {
            console.error('Erro ao cancelar convite:', err);
            alert('Erro ao cancelar convite. Tente novamente.');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (convites.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Nenhum convite pendente
            </div>
        );
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Enviado em</TableHead>
                            <TableHead>Expira em</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {convites.map((convite) => {
                            const roleBadge = getRoleBadge(convite.role);
                            const diasRestantes = getDiasRestantes(convite.expira_em);
                            const expirado = diasRestantes <= 0;

                            return (
                                <TableRow key={convite.id}>
                                    <TableCell className="font-medium">
                                        {convite.email}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={roleBadge.variant}
                                            className={roleBadge.color}
                                        >
                                            {roleBadge.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {formatarData(convite.criado_em)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            <span className={`text-sm ${expirado ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                {expirado ? 'Expirado' : `${diasRestantes} dias`}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() => handleReenviarConvite(convite)}
                                                    disabled={reenviando === convite.id}
                                                >
                                                    <Mail className="mr-2 h-4 w-4" />
                                                    {reenviando === convite.id ? 'Enviando...' : 'Reenviar Email'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => {
                                                        setCancelandoConvite(convite);
                                                        setShowCancelarDialog(true);
                                                    }}
                                                >
                                                    <X className="mr-2 h-4 w-4" />
                                                    Cancelar Convite
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog de confirmação de cancelamento */}
            <AlertDialog open={showCancelarDialog} onOpenChange={setShowCancelarDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Convite?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja cancelar o convite para <strong>{cancelandoConvite?.email}</strong>?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelarConvite}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default ConvitesPendentesTable;
