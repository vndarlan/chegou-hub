// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Mantine Imports
import { MantineProvider, createTheme, LoadingOverlay } from '@mantine/core';
import '@mantine/core/styles.css';

// Importa as páginas
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';
// import MapaPage from './pages/MapaPage'; // <--- IMPORT SEPARADO REMOVIDO

// Definição do Tema
const theme = createTheme({
  primaryColor: 'orange',
});

// Componente Principal App
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verifica o estado inicial de login no backend ao carregar o App
  useEffect(() => {
    const checkLoginStatus = async () => {
      console.log("Checando status inicial de login...");
      setIsLoading(true); // Garante que loading seja true no início
      try {
        // Chama a API /api/current-state/
        const response = await axios.get('/current-state/', { withCredentials: true });

        // Se a resposta for OK e a API disser que está logado...
        if (response.status === 200 && response.data.logged_in) {
          console.log("Sessão backend válida encontrada.");
          setIsLoggedIn(true); // Define como logado
        } else {
          console.log("Nenhuma sessão backend válida encontrada.");
          setIsLoggedIn(false); // Garante que está como não logado
        }
      } catch (error) {
        // Em caso de erro na API (ex: backend fora do ar), assume não logado
        console.error("Erro ao checar status inicial de login:", error);
        setIsLoggedIn(false);
      } finally {
        // Independentemente do resultado, marca que o carregamento inicial terminou
        setIsLoading(false);
        console.log("Checagem inicial de login finalizada.");
      }
    };

    checkLoginStatus();
  }, []); // O array vazio [] garante que isso rode apenas uma vez quando o App montar

  // Mostra uma tela de carregamento enquanto verifica o estado inicial
  if (isLoading) {
    return (
        <MantineProvider theme={theme}> {/* Provider necessário mesmo no loading */}
             <LoadingOverlay
                visible={true}
                zIndex={1000}
                overlayProps={{ radius: "sm", blur: 2 }}
                loaderProps={{ color: 'orange', type: 'bars' }}
             />
        </MantineProvider>
    );
  }

  // Após a verificação inicial, renderiza as rotas
  return (
    <MantineProvider theme={theme} defaultColorScheme="light"> {/* Ou 'dark' ou 'auto' */}
      <Router>
          <Routes>
            {/* Rota Login: Se tentar acessar logado, vai pro workspace */}
            <Route
              path="/login"
              element={!isLoggedIn ? <LoginPage setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/workspace" replace />}
            />

            {/* Rota Workspace (Captura TUDO dentro de /workspace) */}
            {/* O componente WorkspacePage agora gerencia as rotas internas (/mapa, /ads/overview, etc.) */}
            <Route
              path="/workspace/*" // Mantém o /*
              element={isLoggedIn ? <WorkspacePage setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/login" replace />}
            />

            {/* --- ROTA /mapa SEPARADA FOI REMOVIDA --- */}

            {/* Rota Raiz: Redireciona baseado no login */}
            <Route
              path="/"
              // Se logado, vai para o workspace como página principal, senão para login
              element={isLoggedIn ? <Navigate to="/workspace" replace /> : <Navigate to="/login" replace />}
            />

            {/* Rota Não Encontrada */}
            <Route path="*" element={
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h1>404 - Página não encontrada</h1>
                    <p>A rota que você tentou acessar não existe.</p>
                    {/* Pode adicionar um link para voltar ao login ou workspace */}
                </div>
            } />
          </Routes>
      </Router>
    </MantineProvider>
  );
}

export default App;