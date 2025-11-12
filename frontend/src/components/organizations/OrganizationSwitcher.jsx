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
import { Building2, Check, ChevronsUpDown, Loader2, AlertTriangle, Plus } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import CriarOrganizacaoModal from './CriarOrganizacaoModal';

/**
 * Componente de seleção de organização
 * Permite usuários trocarem entre suas organizações
 */
const OrganizationSwitcher = ({ variant = 'default', className = '' }) => {
    const { organization, loading: orgLoading } = useOrgContext();
    const { toast } = useToast();
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState(false);
    const [showCriarModal, setShowCriarModal] = useState(false);

    // Logs de debug do context
    console.log('🏢 [OrganizationSwitcher] Organization from context:', organization);
    console.log('⏳ [OrganizationSwitcher] orgLoading:', orgLoading);
    console.log('📋 [OrganizationSwitcher] organizations state:', organizations);

    // Carregar todas as organizações do usuário
    useEffect(() => {
        carregarOrganizacoes();
    }, []);

    const carregarOrganizacoes = async () => {
        try {
            setLoading(true);
            console.log('🔍 [OrganizationSwitcher] Carregando organizações...');
            const response = await apiClient.get('/organizations/minhas_organizacoes/');
            console.log('✅ [OrganizationSwitcher] Organizações carregadas:', response.data);
            console.log('📊 [OrganizationSwitcher] Total de organizações:', response.data.length);
            setOrganizations(response.data);
        } catch (err) {
            console.error('❌ [OrganizationSwitcher] Erro ao carregar organizações:', err);
            console.error('❌ [OrganizationSwitcher] Status:', err.response?.status);
            console.error('❌ [OrganizationSwitcher] Data:', err.response?.data);
            console.error('❌ [OrganizationSwitcher] Message:', err.message);
            toast({
                title: "Erro ao carregar organizações",
                description: "Não foi possível carregar a lista de organizações. Tente recarregar a página.",
                variant: "destructive",
            });
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

            console.log(`✅ [OrganizationSwitcher] Organização trocada para: ${org.nome}`);

            // Recarregar lista para atualizar organização ativa
            await carregarOrganizacoes();

            // Navegar para workspace
            window.location.href = '/workspace';

        } catch (err) {
            console.error('❌ [OrganizationSwitcher] Erro ao trocar organização:', err);
            toast({
                title: "Erro ao trocar organização",
                description: "Não foi possível trocar de organização. Tente novamente.",
                variant: "destructive",
            });
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
        console.warn('⚠️ [OrganizationSwitcher] Nenhuma organização ativa no contexto');
        return (
            <div className="flex flex-col gap-1 p-2 border border-dashed border-amber-500 rounded-md bg-amber-50">
                <div className="flex items-center gap-2 text-xs text-amber-700">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="font-medium">Nenhuma organização ativa</span>
                </div>
                <p className="text-xs text-muted-foreground pl-5">
                    Entre em contato com o suporte
                </p>
            </div>
        );
    }

    // Se só tem uma organização, mostra botão simples (sem dropdown)
    if (organizations.length <= 1) {
        console.log('✨ [OrganizationSwitcher] Renderizando botão simples (1 organização)');
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

    console.log('✨ [OrganizationSwitcher] Renderizando seletor com', organizations.length, 'organizações');
    return (
        <>
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

                {/* Separador */}
                <DropdownMenuSeparator />

                {/* Botão Criar Nova Organização */}
                <DropdownMenuItem
                    onClick={() => setShowCriarModal(true)}
                    className="text-orange-600 focus:text-orange-700 focus:bg-orange-50"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="font-medium">Criar Nova Organização</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        {/* Modal de Criar Organização */}
        <CriarOrganizacaoModal
            open={showCriarModal}
            onClose={() => setShowCriarModal(false)}
            onSuccess={carregarOrganizacoes}
        />
        </>
    );
};

export default OrganizationSwitcher;
