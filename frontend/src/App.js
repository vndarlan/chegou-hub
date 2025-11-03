// src/App.js - SHADCN/UI THEME
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// shadcn/ui imports
import { ThemeProvider } from './components/theme-provider';
import { LoadingSpinner } from './components/ui';
import { Toaster } from 'sonner';


// Importa CSS do shadcn/ui
import './globals.css';

// Importa o componente CSRFManager
import CSRFManager from './components/CSRFManager';
import AdminRoute from './components/AdminRoute';

// Importa as páginas
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';
import TutoriaisPage from './pages/TutoriaisPage';
import NicochatPage from './pages/NicochatPage';


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
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="chegou-hub-theme">
      <CSRFManager>
        <Toaster position="top-right" />
        <Router>
          <Routes>
            {/* Rotas específicas primeiro */}
            <Route
              path="/login"
              element={!isLoggedIn ? <LoginPage setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/gestao/agenda" replace />}
            />
            {/* Rota de tutoriais (apenas admin) */}
            <Route
              path="/tutoriais"
              element={<AdminRoute><TutoriaisPage /></AdminRoute>}
            />
            {/* Rota independente do Nicochat */}
            <Route
              path="/nicochat/*"
              element={isLoggedIn ? <NicochatPage /> : <Navigate to="/login" replace />}
            />
            {/* Redirect da rota raiz */}
            <Route
              path="/"
              element={isLoggedIn ? <Navigate to="/gestao/agenda" replace /> : <Navigate to="/login" replace />}
            />
            {/* Rotas do workspace - agora sem /workspace no path */}
            <Route
              path="/*"
              element={isLoggedIn ?
                <WorkspacePage setIsLoggedIn={setIsLoggedIn} /> :
                <Navigate to="/login" replace />
              }
            />
          </Routes>
        </Router>
      </CSRFManager>
    </ThemeProvider>
  );
}

export default App;