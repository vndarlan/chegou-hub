import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../utils/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle2, XCircle, Loader2, Mail, Building2, Lock, UserPlus } from 'lucide-react';
import { useOrgContext } from '../contexts/OrganizationContext';

/**
 * Página para aceitar convites de organizações
 * Rota: /convites/aceitar/:codigo
 *
 * Fluxo:
 * 1. Verifica validade do convite e se email tem conta
 * 2. Se tem conta + logado → aceita direto
 * 3. Se tem conta + não logado → redireciona login
 * 4. Se NÃO tem conta → mostra formulário criar senha
 */
const AceitarConvitePage = () => {
    const { codigo } = useParams();
    const navigate = useNavigate();
    const { refetch } = useOrgContext();

    const [verificando, setVerificando] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [organization, setOrganization] = useState(null);

    // Dados do convite
    const [conviteData, setConviteData] = useState(null);
    const [emailTemConta, setEmailTemConta] = useState(null);

    // Form de criação de senha
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [contaCriada, setContaCriada] = useState(false);

    useEffect(() => {
        verificarConvite();
    }, [codigo]);

    // Verificar convite ao carregar página
    const verificarConvite = async () => {
        if (!codigo) {
            setError('Código de convite inválido');
            setVerificando(false);
            return;
        }

        try {
            setVerificando(true);
            setError(null);

            const response = await apiClient.get(`/invites/verificar_convite/?codigo=${codigo}`);

            if (!response.data.convite_valido) {
                setError('Convite inválido ou expirado');
                setVerificando(false);
                return;
            }

            setConviteData(response.data);
            setEmailTemConta(response.data.email_tem_conta);

            // Se email tem conta e usuário está logado → aceita direto
            const user = localStorage.getItem('user');
            if (response.data.email_tem_conta && user) {
                handleAccept();
            }
            // Se email tem conta mas NÃO está logado → redireciona login
            else if (response.data.email_tem_conta && !user) {
                setTimeout(() => {
                    navigate(`/login?redirect=/convites/aceitar/${codigo}`);
                }, 2000);
            }
            // Se email NÃO tem conta → mostra formulário
            else {
                setVerificando(false);
            }

        } catch (err) {
            console.error('Erro ao verificar convite:', err);
            setError(err.response?.data?.error || 'Erro ao verificar convite');
            setVerificando(false);
        }
    };

    const handleAccept = async (e) => {
        if (e) e.preventDefault();

        if (!codigo) {
            setError('Código de convite inválido');
            return;
        }

        // Se email não tem conta, validar senha
        if (!emailTemConta) {
            if (!senha || senha.length < 6) {
                setError('A senha deve ter no mínimo 6 caracteres');
                return;
            }
            if (senha !== confirmarSenha) {
                setError('As senhas não coincidem');
                return;
            }
        }

        try {
            setAccepting(true);
            setError(null);

            const payload = {
                codigo: codigo
            };

            // Se email não tem conta, enviar senha para criar
            if (!emailTemConta) {
                payload.senha = senha;
            }

            const response = await apiClient.post('/invites/aceitar_por_codigo/', payload);

            setSuccess(true);
            setOrganization(response.data.organization);
            setContaCriada(response.data.conta_criada || false);

            // Logs para debug
            console.log('✅ Convite aceito com sucesso!');
            console.log('📍 Organization ID:', response.data.organization?.id);
            console.log('📍 Organization Nome:', response.data.organization?.nome);

            // Aguardar um pouco para garantir que backend processou
            setTimeout(async () => {
                try {
                    // Refetch da organização SEM reload da página
                    await refetch();
                    console.log('✅ Organização atualizada após aceitar convite');
                    navigate('/');
                } catch (error) {
                    console.error('❌ Erro ao atualizar organização:', error);
                    // Em caso de erro, fazer reload como fallback
                    window.location.reload();
                }
            }, 1500); // Reduzir timeout para 1.5s (suficiente para backend processar)

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
                        <CardTitle className="text-2xl text-green-600">
                            {contaCriada ? 'Conta Criada e Convite Aceito!' : 'Convite Aceito!'}
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                            {contaCriada
                                ? 'Sua conta foi criada com sucesso e você já faz parte da organização'
                                : 'Você agora faz parte da organização'
                            }
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

                        {contaCriada && (
                            <Alert className="bg-green-50 border-green-200 mb-4">
                                <AlertDescription className="text-green-900 text-sm">
                                    <UserPlus className="h-4 w-4 inline mr-2" />
                                    Sua conta foi criada com o email <strong>{conviteData?.email}</strong>
                                </AlertDescription>
                            </Alert>
                        )}

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

    // Estado de verificação inicial
    if (verificando) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
                <Card className="max-w-md w-full shadow-xl">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <Loader2 className="h-16 w-16 text-orange-500 animate-spin" />
                        </div>
                        <CardTitle className="text-2xl">Verificando Convite</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Aguarde enquanto validamos seu convite...
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    // Estado de redirecionamento para login
    if (emailTemConta && !localStorage.getItem('user')) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
                <Card className="max-w-md w-full shadow-xl">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <Mail className="h-16 w-16 text-orange-500" />
                        </div>
                        <CardTitle className="text-2xl">Faça Login</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Você já possui uma conta. Faça login para aceitar o convite.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Alert className="bg-blue-50 border-blue-200 mb-4">
                            <AlertDescription className="text-blue-900 text-sm">
                                Redirecionando para a página de login...
                            </AlertDescription>
                        </Alert>
                        <div className="text-center text-sm text-muted-foreground">
                            Email: <strong>{conviteData?.email}</strong>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Formulário de criar senha (email NÃO tem conta)
    if (!emailTemConta && conviteData) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
                <Card className="max-w-md w-full shadow-xl">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <UserPlus className="h-16 w-16 text-orange-500" />
                        </div>
                        <CardTitle className="text-2xl">Criar Conta e Aceitar Convite</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Você foi convidado para <strong>{conviteData.organizacao}</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAccept} className="space-y-4">
                            {/* Info do convite */}
                            <Alert className="bg-orange-50 border-orange-200">
                                <AlertDescription className="text-orange-900 text-sm">
                                    <Mail className="h-4 w-4 inline mr-2" />
                                    Será criada uma conta com o email: <strong>{conviteData.email}</strong>
                                </AlertDescription>
                            </Alert>

                            {/* Campo de senha */}
                            <div className="space-y-2">
                                <Label htmlFor="senha">Criar Senha</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="senha"
                                        type="password"
                                        placeholder="Mínimo 6 caracteres"
                                        value={senha}
                                        onChange={(e) => setSenha(e.target.value)}
                                        className="pl-10"
                                        required
                                        minLength={6}
                                        disabled={accepting}
                                    />
                                </div>
                            </div>

                            {/* Campo de confirmar senha */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="confirmarSenha"
                                        type="password"
                                        placeholder="Digite a senha novamente"
                                        value={confirmarSenha}
                                        onChange={(e) => setConfirmarSenha(e.target.value)}
                                        className="pl-10"
                                        required
                                        minLength={6}
                                        disabled={accepting}
                                    />
                                </div>
                            </div>

                            {/* Info sobre o cargo */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-900">
                                    <strong>Cargo:</strong> {conviteData.role}
                                </p>
                            </div>

                            {/* Botões */}
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={accepting}
                            >
                                {accepting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Criando Conta...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Criar Conta e Aceitar Convite
                                    </>
                                )}
                            </Button>

                            <Button
                                type="button"
                                onClick={() => navigate('/')}
                                variant="outline"
                                className="w-full"
                                disabled={accepting}
                            >
                                Cancelar
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Estado padrão (processando com usuário logado)
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
            <Card className="max-w-md w-full shadow-xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <Loader2 className="h-16 w-16 text-orange-500 animate-spin" />
                    </div>
                    <CardTitle className="text-2xl">Processando Convite</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Aguarde enquanto processamos seu convite...
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
};

export default AceitarConvitePage;
