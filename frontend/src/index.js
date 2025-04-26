// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Função robusta para obter cookie
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
}

// Configuração base do Axios
axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL;
console.log("API Base URL:", axios.defaults.baseURL);

// Configuração CSRF aprimorada
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withCredentials = true;

// Função para obter explicitamente o token CSRF
async function fetchCSRFToken() {
  try {
      // ANTES:
      // const response = await axios.get('/current-state/');
      
      // DEPOIS (removendo a variável não utilizada):
      await axios.get('/current-state/');
      
      console.log("CSRF token obtido:", getCookie('csrftoken'));
      return getCookie('csrftoken');
  } catch (error) {
      console.error("Erro ao obter token CSRF:", error);
      return null;
  }
}

// Interceptor para garantir que o token CSRF esteja presente em todas as requisições
axios.interceptors.request.use(
    async config => {
        // Apenas para métodos que precisam de CSRF (não-GET)
        if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
            let csrfToken = getCookie('csrftoken');
            
            // Se não houver token, tenta obtê-lo
            if (!csrfToken) {
                console.log("Token CSRF não encontrado, obtendo do servidor...");
                csrfToken = await fetchCSRFToken();
            }
            
            if (csrfToken) {
                config.headers['X-CSRFToken'] = csrfToken;
                console.log(`Token CSRF (${csrfToken.substring(0, 10)}...) adicionado à requisição ${config.url}`);
            } else {
                console.warn("ATENÇÃO: Não foi possível obter o token CSRF!");
            }
        }
        return config;
    },
    error => Promise.reject(error)
);

// Inicializa a aplicação após garantir que o token CSRF está disponível
fetchCSRFToken().then(() => {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
});

reportWebVitals();