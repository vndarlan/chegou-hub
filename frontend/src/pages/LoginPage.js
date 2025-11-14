// src/pages/LoginPage.js - TOTALMENTE MIGRADO PARA SHADCN/UI
import React, { useState, useCallback, useEffect } from 'react';
import apiClient from '../utils/axios';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription, LoadingSpinner } from '../components/ui';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useTheme } from '../components/theme-provider';

// Partículas
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

function LoginPage({ setIsLoggedIn }) {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [notification, setNotification] = useState(null);
    const [loading, setLoading] = useState(false);

    // Força tema light na página de login
    const { setTheme } = useTheme();

    useEffect(() => {
        // Sempre força o tema light ao carregar a página de login
        setTheme('light');
    }, [setTheme]);

    const particlesInit = useCallback(async (engine) => {
        await loadSlim(engine);
    }, []);

    const particlesLoaded = useCallback(async (container) => {
        console.log("Partículas carregadas:", container);
    }, []);

    const particleOptions = {
        background: { color: { value: "#E9E9E9" } },
        fpsLimit: 60,
        interactivity: {
            events: {
                onHover: { enable: true, mode: "repulse" },
            },
            modes: { repulse: { distance: 100, duration: 0.4 } },
        },
        particles: {
            color: { value: "#FD7E14" },
            links: {
                color: "#FD7E14",
                distance: 150,
                enable: true,
                opacity: 0.1,
                width: 1,
            },
            move: {
                direction: "none",
                enable: true,
                outModes: { default: "bounce" },
                random: false,
                speed: 1,
                straight: false,
            },
            number: {
                density: { enable: true, area: 1500 },
                value: 150,
            },
            opacity: { value: 0.5 },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 3 } },
        },
        detectRetina: true,
    };

    const clearForm = () => {
        setEmail('');
        setPassword('');
        setName('');
        setNotification(null);
    };

    const handleModeChange = (newMode) => {
        setMode(newMode);
        clearForm();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setNotification(null);
        setLoading(true);

        if (mode === 'login') {
            try {
                await apiClient.get('/current-state/');
                const response = await apiClient.post('/login/', {
                    email: email, 
                    password: password
                });

                if (response.status === 200) {
                    console.log("Login bem-sucedido!");
                    setIsLoggedIn(true);
                }
            } catch (err) {
                console.error("Erro no login:", err.response || err.message);
                let errorMessage = 'Erro ao tentar conectar ao servidor.';
                if (err.response && err.response.status === 401) {
                    errorMessage = err.response.data?.error || 'Credenciais inválidas ou conta inativa.';
                }
                setNotification({ type: 'error', message: errorMessage });
                setIsLoggedIn(false);
            } finally {
                setLoading(false);
            }
        } else {
            if (!name || !email || !password) {
                setNotification({ type: 'error', message: 'Todos os campos são obrigatórios para o registro.' });
                setLoading(false);
                return;
            }
            try {
                const response = await apiClient.post('/register/', {
                    name: name,
                    email: email,
                    password: password
                });

                if (response.status === 201) {
                    setNotification({
                        type: 'success',
                        message: 'Conta criada! Em breve vamos confirmar seu acesso na plataforma.'
                    });
                    setPassword('');
                }
            } catch (err) {
                console.error("Erro no registro:", err.response || err.message);
                let errorMessage = 'Erro ao tentar criar a conta.';
                if (err.response && err.response.data?.error) {
                    errorMessage = err.response.data.error;
                }
                setNotification({ type: 'error', message: errorMessage });
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-gray-100">
            <Particles
                id="tsparticles"
                init={particlesInit}
                loaded={particlesLoaded}
                options={particleOptions}
                className="fixed inset-0 -z-10"
            />

            <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
                <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-lg">
                    {loading && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50 rounded-lg">
                            <LoadingSpinner className="h-6 w-6 text-primary" />
                        </div>
                    )}

                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">
                            {mode === 'login' ? 'Login - Chegou Hub' : 'Criar Conta - Chegou Hub'}
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {notification && (
                            <Alert variant={notification.type === 'error' ? 'destructive' : 'default'}>
                                {notification.type === 'success' ? 
                                    <IconCheck className="h-4 w-4" /> : 
                                    <IconX className="h-4 w-4" />
                                }
                                <AlertDescription>
                                    {notification.message}
                                </AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {mode === 'register' && (
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1">
                                        Nome Completo
                                    </label>
                                    <Input
                                        placeholder="Seu nome completo"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required={mode === 'register'}
                                        disabled={loading}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-medium text-foreground block mb-1">
                                    Email
                                </label>
                                <Input
                                    placeholder="seu@email.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground block mb-1">
                                    Senha
                                </label>
                                <Input
                                    placeholder="Sua senha"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {mode === 'login' ? 'Entrar' : 'Criar Conta'}
                            </Button>
                        </form>

                        {!loading && (
                            <div className="text-center text-sm">
                                {mode === 'login' ? (
                                    <>
                                        Não tem uma conta?{' '}
                                        <button
                                            type="button"
                                            onClick={() => handleModeChange('register')}
                                            className="text-primary hover:underline font-medium"
                                        >
                                            Crie uma aqui
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        Já tem uma conta?{' '}
                                        <button
                                            type="button"
                                            onClick={() => handleModeChange('login')}
                                            className="text-primary hover:underline font-medium"
                                        >
                                            Faça login
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default LoginPage;