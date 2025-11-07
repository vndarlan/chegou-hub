import React, { useState, useEffect } from 'react';
import apiClient from '../utils/axios';
import { useOrgContext } from '../contexts/OrganizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { UserPlus, Settings, Users } from 'lucide-react';
import MembrosTable from '../components/organizations/MembrosTable';
import ConvitarMembroModal from '../components/organizations/ConvitarMembroModal';

/**
 * Página de Configurações da Organização
 * Permite gerenciar membros, convites e configurações
 */
const ConfiguracoesOrganizacao = () => {
    const { organization, role, isOwner, isAdmin, loading: orgLoading } = useOrgContext();
    const [membros, setMembros] = useState([]);
    const [loadingMembros, setLoadingMembros] = useState(true);
    const [showConviteModal, setShowConviteModal] = useState(false);
    const [error, setError] = useState(null);

    // Carregar membros da organização
    const carregarMembros = async () => {
        if (!organization) return;

        try {
            setLoadingMembros(true);
            setError(null);
            const response = await apiClient.get(`/organizations/${organization.id}/membros/`);
            setMembros(response.data);
        } catch (err) {
            console.error('Erro ao carregar membros:', err);
            setError('Erro ao carregar membros. Tente novamente.');
        } finally {
            setLoadingMembros(false);
        }
    };

    useEffect(() => {
        if (organization) {
            carregarMembros();
        }
    }, [organization]);

    // Verificar se o usuário tem permissão de acesso
    if (orgLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando...</p>
                </div>
            </div>
        );
    }

    if (!organization) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Sem Organização</CardTitle>
                        <CardDescription>
                            Você não pertence a nenhuma organização.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    // Apenas Owner e Admin podem acessar esta página
    if (!isAdmin && !isOwner) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Acesso Negado</CardTitle>
                        <CardDescription>
                            Apenas administradores podem acessar as configurações da organização.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Configurações da Organização</h1>
                <p className="text-muted-foreground">
                    Gerencie membros, convites e configurações da sua organização
                </p>
            </div>

            {/* Info da Organização */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{organization.nome}</CardTitle>
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="capitalize">
                                    {organization.plano}
                                </Badge>
                                <span>
                                    • {organization.total_membros || membros.length}/{organization.limite_membros} membros
                                </span>
                            </div>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                            {role === 'owner' ? 'Dono' : 'Administrador'}
                        </Badge>
                    </div>
                </CardHeader>
            </Card>

            {/* Erro */}
            {error && (
                <Card className="mb-6 border-destructive">
                    <CardContent className="pt-6">
                        <p className="text-destructive">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="membros" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="membros" className="gap-2">
                        <Users className="h-4 w-4" />
                        Membros
                    </TabsTrigger>
                    <TabsTrigger value="configuracoes" className="gap-2">
                        <Settings className="h-4 w-4" />
                        Configurações
                    </TabsTrigger>
                </TabsList>

                {/* Tab Membros */}
                <TabsContent value="membros" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Membros da Organização</CardTitle>
                                    <CardDescription>
                                        Gerencie quem tem acesso à sua organização
                                    </CardDescription>
                                </div>
                                <Button
                                    onClick={() => setShowConviteModal(true)}
                                    className="gap-2"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Convidar Membro
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <MembrosTable
                                membros={membros}
                                loading={loadingMembros}
                                isOwner={isOwner}
                                onRefresh={carregarMembros}
                                organizationId={organization.id}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab Configurações */}
                <TabsContent value="configuracoes" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações Gerais</CardTitle>
                            <CardDescription>
                                Configure as informações da sua organização
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Nome da Organização</label>
                                    <p className="text-muted-foreground">{organization.nome}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Plano Atual</label>
                                    <p className="text-muted-foreground capitalize">{organization.plano}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Limite de Membros</label>
                                    <p className="text-muted-foreground">
                                        {organization.total_membros || membros.length} de {organization.limite_membros} utilizados
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal de Convite */}
            {showConviteModal && (
                <ConvitarMembroModal
                    open={showConviteModal}
                    onClose={() => setShowConviteModal(false)}
                    organizationId={organization.id}
                    onSuccess={carregarMembros}
                />
            )}
        </div>
    );
};

export default ConfiguracoesOrganizacao;
