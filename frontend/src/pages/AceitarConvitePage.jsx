import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../utils/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle2, XCircle, Loader2, Mail, Building2 } from 'lucide-react';

/**
 * Página para aceitar convites de organizações
 * Rota: /convites/aceitar/:codigo
 */
const AceitarConvitePage = () => {
    const { codigo } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [organization, setOrganization] = useState(null);

    useEffect(() => {
        // Auto-aceitar se o usuário já estiver logado
        const user = localStorage.getItem('user');
        if (user && !success && !error) {
            handleAccept();
        }
    }, [codigo]);

    const handleAccept = async () => {
        if (!codigo) {
            setError('Código de convite inválido');
            return;
        }

        try {
            setAccepting(true);
            setError(null);

            const response = await apiClient.post('/invites/aceitar_por_codigo/', {
                codigo: codigo
            });

            setSuccess(true);
            setOrganization(response.data.organization);

            // Redirecionar para a página inicial após 3 segundos
            setTimeout(() => {
                navigate('/');
                window.location.reload(); // Recarregar para atualizar OrganizationContext
            }, 3000);

        } catch (err) {
            console.error('Erro ao aceitar convite:', err);

            const mensagemErro = err.response?.data?.error || 'Erro ao aceitar convite. Tente novamente.';
            setError(mensagemErro);

            // Se o erro for de autenticação, redirecionar para login
            if (err.response?.status === 401 || err.response?.status === 403) {
                setTimeout(() => {
                    navigate(`/login?redirect=/convites/aceitar/${codigo}`);
                }, 2000);
            }
        } finally {
            setAccepting(false);
        }
    };

    // Estado de sucesso
    if (success && organization) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
                <Card className="max-w-md w-full shadow-xl">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="h-16 w-16 text-green-500 animate-bounce" />
                        </div>
                        <CardTitle className="text-2xl text-green-600">Convite Aceito!</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Você agora faz parte da organização
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-3 mb-2">
                                <Building2 className="h-5 w-5 text-green-600" />
                                <span className="font-semibold text-green-900">{organization.nome}</span>
                            </div>
                            <p className="text-sm text-green-700 ml-8">
                                Plano: <span className="capitalize font-medium">{organization.plano}</span>
                            </p>
                        </div>

                        <Alert className="bg-blue-50 border-blue-200">
                            <AlertDescription className="text-blue-900 text-sm">
                                Você será redirecionado em instantes...
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Estado de erro
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4">
                <Card className="max-w-md w-full shadow-xl">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <XCircle className="h-16 w-16 text-red-500" />
                        </div>
                        <CardTitle className="text-2xl text-red-600">Erro ao Aceitar Convite</CardTitle>
                        <CardDescription className="text-base mt-2 text-red-700">
                            {error}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Alert className="bg-red-50 border-red-200 mb-4">
                            <AlertDescription className="text-red-900 text-sm">
                                {error.includes('email') && (
                                    <>Este convite foi enviado para outro endereço de email.
                                    Certifique-se de estar logado com a conta correta.</>
                                )}
                                {error.includes('expirou') && (
                                    <>Este convite expirou. Entre em contato com o administrador
                                    da organização para receber um novo convite.</>
                                )}
                                {error.includes('já é membro') && (
                                    <>Você já faz parte desta organização! Acesse a plataforma normalmente.</>
                                )}
                                {!error.includes('email') && !error.includes('expirou') && !error.includes('já é membro') && (
                                    <>Verifique se você está logado com a conta correta e tente novamente.</>
                                )}
                            </AlertDescription>
                        </Alert>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => navigate('/login')}
                                variant="outline"
                                className="flex-1"
                            >
                                Fazer Login
                            </Button>
                            <Button
                                onClick={() => window.location.href = '/'}
                                variant="default"
                                className="flex-1"
                            >
                                Ir para Início
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Estado de carregamento
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
            <Card className="max-w-md w-full shadow-xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <Mail className="h-16 w-16 text-orange-500" />
                    </div>
                    <CardTitle className="text-2xl">Convite de Organização</CardTitle>
                    <CardDescription className="text-base mt-2">
                        {accepting ? 'Processando seu convite...' : 'Você foi convidado para se juntar a uma organização'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {accepting ? (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
                            <p className="text-sm text-muted-foreground">
                                Aguarde enquanto processamos seu convite...
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Alert className="bg-orange-50 border-orange-200">
                                <AlertDescription className="text-orange-900 text-sm">
                                    Faça login para aceitar o convite e fazer parte da organização.
                                </AlertDescription>
                            </Alert>

                            <Button
                                onClick={handleAccept}
                                className="w-full"
                                disabled={accepting}
                            >
                                {accepting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Aceitando...
                                    </>
                                ) : (
                                    'Aceitar Convite'
                                )}
                            </Button>

                            <Button
                                onClick={() => navigate('/')}
                                variant="outline"
                                className="w-full"
                            >
                                Cancelar
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AceitarConvitePage;
