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
import { MoreVertical, Shield, User, Trash2, Edit } from 'lucide-react';
import EditarPermissoesModal from './EditarPermissoesModal';

/**
 * Tabela de membros da organização
 */
const MembrosTable = ({ membros, loading, isOwner, onRefresh, organizationId }) => {
    const [removendoMembro, setRemovendoMembro] = useState(null);
    const [showRemoverDialog, setShowRemoverDialog] = useState(false);
    const [editandoPermissoes, setEditandoPermissoes] = useState(null);
    const [showPermissoesModal, setShowPermissoesModal] = useState(false);

    // Formatar data
    const formatarData = (dataString) => {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Obter cor do badge baseado na role
    const getRoleBadge = (role) => {
        const badges = {
            owner: { label: 'Owner', variant: 'default', color: 'text-gray-500' },
            admin: { label: 'Admin', variant: 'secondary', color: 'text-purple-600' },
            member: { label: 'Membro', variant: 'outline', color: 'text-blue-600' }
        };
        return badges[role] || badges.member;
    };

    // Remover membro
    const handleRemoverMembro = async () => {
        if (!removendoMembro) return;

        try {
            await apiClient.post(
                `/organizations/${organizationId}/remover_membro/`,
                { membro_id: removendoMembro.id }
            );

            setShowRemoverDialog(false);
            setRemovendoMembro(null);
            onRefresh();
        } catch (err) {
            console.error('Erro ao remover membro:', err);
            alert('Erro ao remover membro. Tente novamente.');
        }
    };

    // Abrir modal de editar permissões
    const handleEditarPermissoes = (membro) => {
        setEditandoPermissoes(membro);
        setShowPermissoesModal(true);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (membros.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Nenhum membro encontrado
            </div>
        );
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Último Login</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {membros.map((membro) => {
                            const roleBadge = getRoleBadge(membro.role);
                            const isOwnerMember = membro.role === 'owner';

                            return (
                                <TableRow key={membro.id}>
                                    <TableCell className="font-medium">
                                        {membro.user.full_name || membro.user.username}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {membro.user.email}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {formatarData(membro.joined_at)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={roleBadge.variant}
                                            className={roleBadge.color}
                                        >
                                            {roleBadge.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!isOwnerMember && isOwner && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => handleEditarPermissoes(membro)}
                                                    >
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Editar Permissões
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => {
                                                            setRemovendoMembro(membro);
                                                            setShowRemoverDialog(true);
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Remover
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                        {isOwnerMember && (
                                            <span className="text-xs text-muted-foreground">
                                                —
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog de confirmação de remoção */}
            <AlertDialog open={showRemoverDialog} onOpenChange={setShowRemoverDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover Membro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover <strong>{removendoMembro?.user.full_name}</strong> da organização?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoverMembro}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de editar permissões */}
            {showPermissoesModal && editandoPermissoes && (
                <EditarPermissoesModal
                    open={showPermissoesModal}
                    onClose={() => {
                        setShowPermissoesModal(false);
                        setEditandoPermissoes(null);
                    }}
                    membro={editandoPermissoes}
                    organizationId={organizationId}
                    onSuccess={onRefresh}
                />
            )}
        </>
    );
};

export default MembrosTable;
