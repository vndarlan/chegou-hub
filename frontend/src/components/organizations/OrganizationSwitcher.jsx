import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/axios';
import { useOrgContext } from '../../contexts/OrganizationContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Building2, Check, ChevronsUpDown, Loader2 } from 'lucide-react';

/**
 * Componente de seleção de organização
 * Permite usuários trocarem entre suas organizações
 */
const OrganizationSwitcher = ({ variant = 'default', className = '' }) => {
    const { organization, loading: orgLoading } = useOrgContext();
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState(false);

    // Carregar todas as organizações do usuário
    useEffect(() => {
        carregarOrganizacoes();
    }, []);

    const carregarOrganizacoes = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/organizations/minhas_organizacoes/');
            setOrganizations(response.data);
        } catch (err) {
            console.error('Erro ao carregar organizações:', err);
        } finally {
            setLoading(false);
        }
    };

    // Trocar organização
    const handleSwitchOrganization = async (org) => {
        if (org.id === organization?.id) return; // Já está selecionada

        try {
            setSwitching(true);

            // Atualizar organização atual no backend
            await apiClient.post('/organizations/selecionar_organizacao/', {
                organization_id: org.id
            });

            // Recarregar página para atualizar todos os dados
            // (O middleware irá carregar a nova organização automaticamente)
            window.location.reload();

        } catch (err) {
            console.error('Erro ao trocar organização:', err);
            alert('Erro ao trocar organização. Tente novamente.');
        } finally {
            setSwitching(false);
        }
    };

    if (loading || orgLoading) {
        return (
            <Button variant={variant} className={className} disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
        );
    }

    if (!organization) {
        return null;
    }

    // Se só tem uma organização, mostra botão simples (sem dropdown)
    if (organizations.length <= 1) {
        return (
            <Button
                variant={variant}
                className={`${className} justify-start gap-2`}
                disabled
            >
                <Building2 className="h-4 w-4" />
                <span className="truncate">{organization.nome}</span>
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={variant}
                    className={`${className} justify-between gap-2`}
                    disabled={switching}
                >
                    <div className="flex items-center gap-2 truncate">
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{organization.nome}</span>
                    </div>
                    {switching ? (
                        <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                    ) : (
                        <ChevronsUpDown className="h-4 w-4 flex-shrink-0 opacity-50" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Minhas Organizações
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {organizations.map((org) => (
                    <DropdownMenuItem
                        key={org.id}
                        onClick={() => handleSwitchOrganization(org)}
                        className="flex items-center justify-between gap-2 cursor-pointer"
                    >
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{org.nome}</span>
                                {org.id === organization.id && (
                                    <Check className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs capitalize">
                                    {org.plano}
                                </Badge>
                                <span>• {org.role === 'owner' ? 'Dono' : org.role === 'admin' ? 'Admin' : 'Membro'}</span>
                            </div>
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default OrganizationSwitcher;
