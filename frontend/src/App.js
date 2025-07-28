// src/App.js - MANTINE + SHADCN/UI THEME
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// shadcn/ui imports
import { ThemeProvider } from './components/theme-provider';
import { LoadingSpinner } from './components/ui';

// Mantine imports (para páginas que precisam)
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

// Importa CSS do shadcn/ui
import './globals.css';

// Importa o componente CSRFManager
import CSRFManager from './components/CSRFManager';

// Importa as páginas
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';

// Tema Mantine neutro (não interfere no shadcn)
const mantineTheme = createTheme({
  primaryColor: 'orange',
  fontFamily: 'inherit', // Usa a fonte do shadcn
  colors: {
    orange: [
      '#fff4e6',
      '#ffe8cc',
      '#ffd09e',
      '#ffb569',
      '#fe9c3e',
      '#fd7e14',
      '#e8590c',
      '#d63384',
      '#a02e4b',
      '#7c2d12'
    ]
  },
  other: {
    // Remove estilos que possam conflitar
    respectColorScheme: false
  }
});

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar status inicial de login
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

  if (isLoading) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="chegou-hub-theme">
        <MantineProvider theme={mantineTheme}>
          <div className="fixed inset-0 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center space-y-4">
              <LoadingSpinner className="h-8 w-8 text-primary" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          </div>
        </MantineProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="chegou-hub-theme">
      <MantineProvider theme={mantineTheme}>
        <CSRFManager>
          <Router>
            <Routes>
              <Route
                path="/login"
                element={!isLoggedIn ? <LoginPage setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/workspace/agenda" replace />}
              />
              <Route
                path="/workspace/*"
                element={isLoggedIn ? 
                  <WorkspacePage setIsLoggedIn={setIsLoggedIn} /> : 
                  <Navigate to="/login" replace />
                }
              />
              <Route
                path="/"
                element={isLoggedIn ? <Navigate to="/workspace/agenda" replace /> : <Navigate to="/login" replace />}
              />
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center bg-background">
                  <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold text-foreground">404</h1>
                    <p className="text-lg text-muted-foreground">Página não encontrada</p>
                    <a 
                      href={isLoggedIn ? "/workspace/agenda" : "/login"}
                      className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Voltar ao {isLoggedIn ? 'início' : 'login'}
                    </a>
                  </div>
                </div>
              } />
            </Routes>
          </Router>
        </CSRFManager>
      </MantineProvider>
    </ThemeProvider>
  );
}

export default App;