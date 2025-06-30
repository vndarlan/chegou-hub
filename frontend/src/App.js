// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Mantine Imports
import { MantineProvider, createTheme, LoadingOverlay } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

// Importa o componente CSRFManager
import CSRFManager from './components/CSRFManager';

// Importa as páginas
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';

// Definição do Tema com suporte melhorado para tema escuro
const theme = createTheme({
  primaryColor: 'orange', // Cor primária do aplicativo
  colors: {
    // Paleta de cores escuras personalizadas para o tema escuro
    dark: [
      '#FFFFFF', // 0 - Texto principal no tema escuro (alterado para branco)
      '#A6A7AB', // 1
      '#909296', // 2
      '#5C5F66', // 3
      '#373A40', // 4 
      '#2C2E33', // 5
      '#25262B', // 6 - Fundos de cards/papers no tema escuro
      '#1A1B1E', // 7 - Fundo principal no tema escuro
      '#141517', // 8
      '#101113', // 9
    ],
    // Você pode adicionar outras paletas aqui
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
    
    // Aplicar estilos de tema diretamente no corpo do documento
    if (colorScheme === 'dark') {
      document.body.style.backgroundColor = '#1A1B1E'; // Cor de fundo do corpo no tema escuro
      document.body.style.color = '#FFFFFF'; // Cor do texto alterada para branco
    } else {
      document.body.style.backgroundColor = '#fff'; // Cor de fundo do corpo no tema claro
      document.body.style.color = '#000'; // Cor do texto no tema claro
    }
    
    console.log("Atributo de tema definido no documento:", colorScheme);
  }, [colorScheme]);

  // Efeito para adicionar estilos CSS diretamente
  useEffect(() => {
    const styleElement = document.createElement('style');
    
    styleElement.textContent = `
      /* Tema escuro refinado */
      [data-mantine-color-scheme="dark"] body,
      [data-mantine-color-scheme="dark"] .mantine-AppShell-main {
        background-color: #1A1B1E;
      }
      
      [data-mantine-color-scheme="dark"] .mantine-Paper-root,
      [data-mantine-color-scheme="dark"] .mantine-Card-root {
        background-color: #25262B;
      }
      
      [data-mantine-color-scheme="dark"] .mantine-TextInput-input,
      [data-mantine-color-scheme="dark"] .mantine-Textarea-input,
      [data-mantine-color-scheme="dark"] .mantine-Select-input {
        background-color: #2C2E33;
        border-color: #383A40;
        color: #E0E0E0;
      }
      
      [data-mantine-color-scheme="dark"] .mantine-Text-root {
        color: #E0E0E0;
      }
      
      [data-mantine-color-scheme="dark"] .mantine-Text-root[color="dimmed"] {
        color: #A0A0A0;
      }
      
      /* Área de resultados (atualmente branca na sua captura) */
      [data-mantine-color-scheme="dark"] .resultArea {
        background-color: #2A2B30;
        color: #E0E0E0;
      }
      
      /* Barra lateral no tema escuro */
      [data-mantine-color-scheme="dark"] .navbar {
        background-color: #1A1B1E;
        border-right-color: #383A40;
      }
      
      /* Botões no tema escuro */
      [data-mantine-color-scheme="dark"] .mantine-Button-root:not(.mantine-Button-filled) {
        border-color: #383A40;
      }
      
      /* Dropdowns/selects no tema escuro */
      [data-mantine-color-scheme="dark"] .mantine-Select-dropdown,
      [data-mantine-color-scheme="dark"] .mantine-Menu-dropdown {
        background-color: #25262B;
        border-color: #383A40;
      }
    `;
    
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

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
                <WorkspacePage 
                  setIsLoggedIn={setIsLoggedIn} 
                  colorScheme={colorScheme}
                  toggleColorScheme={toggleColorScheme}
                /> : 
                <Navigate to="/login" replace />
              }
            />
            {/* Rota raiz redireciona direto para agenda se logado, senão para login */}
            <Route
              path="/"
              element={isLoggedIn ? <Navigate to="/workspace/agenda" replace /> : <Navigate to="/login" replace />}
            />
            <Route path="*" element={
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <h1>404 - Página não encontrada</h1>
                <p>A rota que você tentou acessar não existe.</p>
                {/* Link para voltar à página principal */}
                <a href={isLoggedIn ? "/workspace/agenda" : "/login"}>
                  Voltar ao {isLoggedIn ? 'início' : 'login'}
                </a>
              </div>
            } />
          </Routes>
        </Router>
      </CSRFManager>
    </MantineProvider>
  );
}

export default App;