// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Mantine Imports - Na v7, useMantineColorScheme vem de @mantine/core
import { MantineProvider, createTheme, LoadingOverlay, useMantineColorScheme } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

// Importa o componente CSRFManager
import CSRFManager from './components/CSRFManager';

// Importa as páginas
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';

// Definição do Tema
const theme = createTheme({
  primaryColor: 'orange',
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

  // Função para alternar entre os temas
  const toggleColorScheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

  if (isLoading) {
    return (
      <MantineProvider 
        theme={theme} 
        defaultColorScheme={colorScheme}
      >
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
      defaultColorScheme={colorScheme}
    >
      <CSRFManager>
        <Router>
          {/* Passamos a função toggleColorScheme como prop para o WorkspacePage */}
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