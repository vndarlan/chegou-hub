import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrgContext } from '../contexts/OrganizationContext';
import { Alert, AlertDescription } from './ui/alert';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

/**
 * Componente que protege rotas baseado em permissões de módulos
 *
 * @param {string} moduleKey - Chave do módulo necessário para acessar
 * @param {React.ReactNode} children - Componente filho a ser renderizado se tiver permissão
 */
export const ProtectedRoute = ({ moduleKey, children }) => {
    const navigate = useNavigate();
    const { hasModuleAccess, loadingModules, organization } = useOrgContext();

    // Aguardar carregamento de módulos
    if (loadingModules) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
                    <p className="text-sm text-muted-foreground">Verificando permissões...</p>
                </div>
            </div>
        );
    }

    // Verificar se tem acesso
    const hasAccess = hasModuleAccess(moduleKey);

    if (!hasAccess) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4 bg-slate-50">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <ShieldAlert className="h-16 w-16 text-red-500" />
                            </div>

                            <Alert variant="destructive">
                                <AlertDescription>
                                    <div className="space-y-2">
                                        <div className="font-semibold text-base">Acesso Negado</div>
                                        <p className="text-sm">
                                            Você não tem permissão para acessar esta página na organização{' '}
                                            <strong>{organization?.nome}</strong>.
                                        </p>
                                        <p className="text-sm mt-2">
                                            Entre em contato com um administrador para solicitar acesso a este módulo.
                                        </p>
                                    </div>
                                </AlertDescription>
                            </Alert>

                            <div className="bg-slate-100 p-3 rounded-md">
                                <p className="text-xs text-slate-600">
                                    <strong>Sistema de Permissões:</strong> O acesso a páginas é controlado
                                    por módulo. Administradores e proprietários têm acesso total.
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={() => navigate(-1)}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Voltar
                                </Button>
                                <Button
                                    onClick={() => navigate('/workspace')}
                                    className="flex-1"
                                >
                                    Ir para Página Inicial
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Tem acesso: renderizar children
    return <>{children}</>;
};
