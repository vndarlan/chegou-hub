// src/pages/LoginPage.js
import React, { useState, useCallback } from 'react';
import axios from 'axios';

// --- Componentes Mantine ---
import {
    TextInput,
    PasswordInput,
    Button,
    Paper,
    Title,
    Text,
    Container,
    Center,
    Stack,
    Box,
    Anchor, // Para o link de alternar modo
    Select, // Para Área de Atuação
    Notification, // Para exibir mensagens de sucesso/erro
    LoadingOverlay, // Para indicar carregamento
} from '@mantine/core';
import { IconX, IconCheck } from '@tabler/icons-react'; // Ícones para Notificação

// --- Partículas ---
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim"; // Carregar o pacote slim

// --- LISTA DE TIMES ---
// IMPORTANTE: Estes valores DEVEM corresponder EXATAMENTE aos nomes dos
// Grupos que você criou no Admin do Django!
const TIMES = [
    { value: 'Diretoria', label: 'Diretoria' },
    { value: 'IA & Automação', label: 'IA & Automação' },
    { value: 'Gestão', label: 'Gestão' },
    { value: 'Operacional', label: 'Operacional' },
    { value: 'Gestão de Tráfego', label: 'Gestão de Tráfego' },
    { value: 'Suporte', label: 'Suporte' },
    // Adicione outros times se necessário, lembrando de criar o Grupo no Admin
];

function LoginPage({ setIsLoggedIn }) {
    // --- Estados ---
    const [mode, setMode] = useState('login'); // 'login' ou 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [timeSelecionado, setTimeSelecionado] = useState(null);
    const [notification, setNotification] = useState(null);
    const [loading, setLoading] = useState(false);

    // --- Funções das Partículas ---
    const particlesInit = useCallback(async (engine) => {
        console.log("Iniciando tsParticles engine");
        await loadSlim(engine);
    }, []);

    const particlesLoaded = useCallback(async (container) => {
        console.log("tsParticles container carregado:", container);
    }, []);

    // Configuração COMPLETA das partículas
    const particleOptions = {
        background: {
          color: {
            value: "#E9E9E9", // Fundo claro
          },
        },
        fpsLimit: 60,
        interactivity: {
          events: {
            // Habilita interatividade ao passar o mouse
            onHover: {
              enable: true,
              mode: "repulse", // Repele partículas
            },
            // onClick: { // Interatividade ao clicar (opcional)
            //   enable: true,
            //   mode: "push", // Adiciona partículas
            // },
          },
          modes: {
            repulse: {
              distance: 100, // Distância da repulsão
              duration: 0.4,
            },
            // push: { // Configuração para o modo push (se habilitado)
            //   quantity: 4,
            // },
          },
        },
        particles: {
          color: {
            value: "#FD7E14", // Cor laranja das partículas
          },
          links: { // Linhas conectando as partículas
            color: "#FD7E14", // Cor laranja das linhas
            distance: 150,
            enable: true, // Habilita as linhas
            opacity: 0.1, // Opacidade baixa para sutileza
            width: 1,
          },
          move: {
            direction: "none",
            enable: true, // Habilita o movimento
            outModes: {
              default: "bounce", // Faz as partículas quicarem nas bordas
            },
            random: false,
            speed: 1, // Velocidade baixa para um efeito sutil
            straight: false,
          },
          number: {
            density: {
              enable: true,
              area: 1500, // Densidade das partículas (ajuste conforme necessário)
            },
            value: 150, // Número de partículas na tela (ajuste conforme necessário)
          },
          opacity: {
            value: 0.5, // Opacidade das partículas
          },
          shape: {
            type: "circle", // Formato das partículas
          },
          size: {
            value: { min: 1, max: 3 }, // Tamanho aleatório das partículas
          },
        },
        detectRetina: true, // Melhora a qualidade em telas retina
      };
    // --- Fim Partículas ---

    const clearForm = () => {
        setEmail('');
        setPassword('');
        setName('');
        setTimeSelecionado(null);
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
            // --- Lógica de LOGIN ---
            try {
                const response = axios.post('/login/', {
                    email: email, password: password
                }, { withCredentials: true });

                if (response.status === 200) {
                    console.log("Login bem-sucedido!", response.data);
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
            // --- Lógica de REGISTRO ---
            if (!name || !email || !timeSelecionado || !password) {
                 setNotification({ type: 'error', message: 'Todos os campos são obrigatórios para o registro.' });
                 setLoading(false);
                 return;
            }
            try {
                // Envia 'timeSelecionado' como 'area' para o backend
                const response = await axios.post('/register/', {
                    name: name,
                    email: email,
                    area: timeSelecionado,
                    password: password
                });

                if (response.status === 201) {
                    console.log("Registro bem-sucedido!", response.data);
                    // 1. Define a notificação para ser exibida
                    setNotification({
                        type: 'success',
                        message: 'Conta criada! Em breve vamos confirmar seu acesso na plataforma.'
                    });

                    // 2. REMOVA a linha abaixo:
                    // handleModeChange('login');

                    // 3. (Opcional, mas recomendado) Limpe apenas a senha após o sucesso
                    setPassword('');

                    // O formulário de registro continuará visível, mas com a
                    // mensagem de sucesso acima e a senha limpa. O usuário
                    // poderá então clicar no link "Faça login".
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
        <Box style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
            {/* Componente Particles como fundo */}
            <Particles
                id="tsparticles"
                init={particlesInit}
                loaded={particlesLoaded}
                options={particleOptions}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: -1 // Coloca atrás de todo o conteúdo
                }}
            />

            {/* Centraliza o conteúdo do formulário ACIMA das partículas */}
            <Center style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}> {/* zIndex: 1 garante que fique na frente */}
                <Container size="xs" style={{ width: '100%' }}>
                    <Paper withBorder shadow="md" p="xl" radius="md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', position: 'relative' }}>
                         {/* Loading Overlay */}
                         <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} loaderProps={{ color: 'orange', type: 'bars' }}/>
                        <Stack gap="lg">
                            <Title order={2} ta="center">
                                {mode === 'login' ? 'Login - Grupo Chegou' : 'Criar Conta - Grupo Chegou'}
                            </Title>

                            {/* Exibe Notificação */}
                            {notification && (
                                <Notification
                                    icon={notification.type === 'success' ? <IconCheck size="1.1rem" /> : <IconX size="1.1rem" />}
                                    color={notification.type === 'success' ? 'teal' : 'red'}
                                    title={notification.type === 'success' ? 'Sucesso!' : 'Erro!'}
                                    onClose={() => setNotification(null)} // Permite fechar a notificação
                                    style={{ zIndex: 10 }} // Garante que fique acima do overlay
                                >
                                    {notification.message}
                                </Notification>
                            )}

                            {/* Formulário */}
                            <form onSubmit={handleSubmit}>
                                <Stack gap="md">
                                    {/* Campo Nome (Só no modo Registro) */}
                                    {mode === 'register' && (
                                        <TextInput
                                            label="Nome Completo"
                                            placeholder="Seu nome completo"
                                            value={name}
                                            onChange={(event) => setName(event.currentTarget.value)}
                                            required={mode === 'register'}
                                            disabled={loading}
                                        />
                                    )}

                                    {/* Campo Email (Comum aos dois modos) */}
                                    <TextInput
                                        label="Email"
                                        placeholder="seu@email.com"
                                        value={email}
                                        onChange={(event) => setEmail(event.currentTarget.value)}
                                        required
                                        disabled={loading}
                                    />

                                     {/* Campo Time (Só no modo Registro) */}
                                     {mode === 'register' && (
                                        <Select
                                            label="Time" // Label atualizado
                                            placeholder="Selecione seu time"
                                            data={TIMES} // Usa a constante renomeada
                                            value={timeSelecionado} // Usa o estado renomeado
                                            onChange={setTimeSelecionado} // Atualiza o estado renomeado
                                            required={mode === 'register'}
                                            searchable
                                            nothingFoundMessage="Time não encontrado"
                                            disabled={loading}
                                            comboboxProps={{ zIndex: 10 }} // Garante que dropdown fique visível
                                        />
                                    )}

                                    {/* Campo Senha (Comum aos dois modos) */}
                                    <PasswordInput
                                        label="Senha"
                                        placeholder="Sua senha"
                                        value={password}
                                        onChange={(event) => setPassword(event.currentTarget.value)}
                                        required
                                        disabled={loading}
                                    />

                                    {/* Botão de Submit */}
                                    <Button type="submit" fullWidth mt="md" color="orange" disabled={loading}>
                                        {mode === 'login' ? 'Entrar' : 'Criar Conta'}
                                    </Button>
                                </Stack>
                            </form>

                            {/* Link para alternar modo */}
                            {!loading && ( // Esconde link durante o loading
                                <Text ta="center" mt="md">
                                    {mode === 'login' ? (
                                        <>
                                            Não tem uma conta?{' '}
                                            <Anchor component="button" type="button" onClick={() => handleModeChange('register')}>
                                                Crie uma aqui
                                            </Anchor>
                                        </>
                                    ) : (
                                        <>
                                            Já tem uma conta?{' '}
                                            <Anchor component="button" type="button" onClick={() => handleModeChange('login')}>
                                                Faça login
                                            </Anchor>
                                        </>
                                    )}
                                </Text>
                            )}
                        </Stack>
                    </Paper>
                </Container>
            </Center>
        </Box>
    );
}

export default LoginPage;