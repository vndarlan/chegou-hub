// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Mantine Imports
import { MantineProvider, createTheme, LoadingOverlay, Global } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

// Importa o componente CSRFManager
import CSRFManager from './components/CSRFManager';

// Importa as páginas
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';

// Componente de estilos globais para melhorar a integração de temas
function GlobalStyles() {
  return (
    <Global
      styles={(theme) => ({
        '*, *::before, *::after': {
          boxSizing: 'border-box',
        },
        body: {
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
          color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
          lineHeight: theme.lineHeight,
        },
        '.mantine-AppShell-main': {
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
        },
        // Adiciona suporte para mapas e outros componentes de terceiros
        '.leaflet-container': {
          filter: theme.colorScheme === 'dark' ? 'invert(0.9) hue-rotate(180deg)' : 'none',
        },
        // Melhora contraste de texto em tema escuro
        '[data-mantine-color-scheme="dark"] .mantine-Text-root': {
          color: theme.colors.gray[3],
        },
        // Ajusta contraste de fundos em tema escuro
        '[data-mantine-color-scheme="dark"] .mantine-Paper-root': {
          backgroundColor: theme.colors.dark[6],
        }
      })}
    />
  );
}

// Definição do Tema com suporte melhorado para tema escuro
const theme = createTheme({
  primaryColor: 'orange',
  colors: {
    // Definir cores personalizadas para tema claro e escuro
    dark: [
      '#C1C2C5', // 0
      '#A6A7AB', // 1
      '#909296', // 2
      '#5C5F66', // 3
      '#373A40', // 4
      '#2C2E33', // 5
      '#25262B', // 6
      '#1A1B1E', // 7
      '#141517', // 8
      '#101113', // 9
    ],
  },
  // Configurações específicas para o tema escuro
  components: {
    Paper: {
      styles: (theme) => ({
        root: {
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.white,
        },
      }),
    },
  },
  // Habilitar o tema escuro adequadamente
  darkMode: true,
});

// Componente Principal App
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado para o esquema de cores com localStorage
  const [colorScheme, setColorScheme] = useLocalStorage({
    key: 'mantine-color-scheme',
    defaultValue: 'light'
  });

  // Função para alternar entre os temas com log para debug
  const toggleColorScheme = () => {
    console.log(`Alterando tema de ${colorScheme} para ${colorScheme === 'dark' ? 'light' : 'dark'}`);
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

  // Efeito para garantir que o tema seja aplicado ao DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-mantine-color-scheme', colorScheme);
    document.body.setAttribute('data-mantine-color-scheme', colorScheme);
    console.log("Atributo de tema definido no documento:", colorScheme);
  }, [colorScheme]);

  // Efeito para monitorar mudanças no tema (debug)
  useEffect(() => {
    console.log("Tema atual:", colorScheme);
  }, [colorScheme]);

  // Verifica o estado inicial de login no backend ao carregar o App
  useEffect(() => {
    const checkLoginStatus = async () => {
      console.log("Checando status inicial de login...");
      setIsLoading(true);
      try {
        const response = await axios.get('/current-state/', { withCredentials: true });
        if (response.status === 200 && response.data.logged_in) {
          console.log("Sessão backend válida encontrada.");
          setIsLoggedIn(true);
        } else {
          console.log("Nenhuma sessão backend válida encontrada.");
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Erro ao checar status inicial de login:", error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
        console.log("Checagem inicial de login finalizada.");
      }
    };

    checkLoginStatus();
  }, []);

  // Verificação do tema no localStorage (debug)
  useEffect(() => {
    const savedTheme = localStorage.getItem('mantine-color-scheme');
    console.log("Tema salvo no localStorage:", savedTheme);
  }, []);

  if (isLoading) {
    return (
      <MantineProvider 
        theme={theme} 
        colorScheme={colorScheme}
      >
        <GlobalStyles />
        <LoadingOverlay
          visible={true}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
          loaderProps={{ color: 'orange', type: 'bars' }}
        />
      </MantineProvider>
    );
  }

  return (
    <MantineProvider
      theme={theme}
      colorScheme={colorScheme}
    >
      <GlobalStyles />
      <CSRFManager>
        <Router>
          <Routes>
            <Route
              path="/login"
              element={!isLoggedIn ? <LoginPage setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/workspace" replace />}
            />
            <Route
              path="/workspace/*"
              element={isLoggedIn ? 
                <WorkspacePage 
                  setIsLoggedIn={setIsLoggedIn} 
                  colorScheme={colorScheme}
                  toggleColorScheme={toggleColorScheme}
                /> : 
                <Navigate to="/login" replace />
              }
            />
            <Route
              path="/"
              element={isLoggedIn ? <Navigate to="/workspace" replace /> : <Navigate to="/login" replace />}
            />
            <Route path="*" element={
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <h1>404 - Página não encontrada</h1>
                <p>A rota que você tentou acessar não existe.</p>
              </div>
            } />
          </Routes>
        </Router>
      </CSRFManager>
    </MantineProvider>
  );
}

export default App;