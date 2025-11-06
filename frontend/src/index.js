// src/index.js - ATUALIZADO PARA SHADCN/UI
import React from 'react';
import ReactDOM from 'react-dom/client';
import apiClient from './utils/axios';
import './globals.css'; // Novo CSS com Tailwind e variáveis do tema
import App from './App';
import reportWebVitals from './reportWebVitals';

// Configuração base do Axios - agora usando variável de ambiente
const API_URL = process.env.REACT_APP_API_BASE_URL || 'https://chegou-hubb-production.up.railway.app/api';

// Garantir que a URL sempre tenha protocolo https://
const normalizedURL = API_URL.startsWith('http') ? API_URL : `https://${API_URL}`;
apiClient.defaults.baseURL = normalizedURL;
console.log("API Base URL original:", API_URL);
console.log("API Base URL normalizada:", normalizedURL);
console.log("API Base URL configurada:", apiClient.defaults.baseURL);
console.log("REACT_APP_API_BASE_URL env var:", process.env.REACT_APP_API_BASE_URL);

const DEBUG_MODE = true; // TEMPORÁRIO: Habilitado para investigação

if (DEBUG_MODE) {
  apiClient.interceptors.request.use(config => {
    console.log(`[Request] ${config.method.toUpperCase()} ${config.url}`, config);
    return config;
  });

  apiClient.interceptors.response.use(
    response => {
      console.log(`[Response] ${response.status} ${response.config.url}`, response);
      return response;
    },
    error => {
      console.error(`[Response Error] ${error.config?.url || 'unknown'}`, error.response || error);
      return Promise.reject(error);
    }
  );
}

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 403 &&
        error.response.data?.detail?.includes('CSRF')) {
      console.error('Erro de CSRF detectado. Tentando recarregar o token...');
    }

    if (error.response && error.response.status === 401) {
      console.warn('Sessão expirada ou usuário não autenticado');
    }

    return Promise.reject(error);
  }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);

apiClient.get(`${API_URL}/ensure-csrf/`)
  .then(response => {
    console.log("Conexão com backend estabelecida:", response.status);

    const hasCsrfCookie = document.cookie
      .split(';')
      .some(cookie => cookie.trim().startsWith('csrftoken='));

    console.log("Cookie CSRF definido:", hasCsrfCookie);
  })
  .catch(error => {
    console.error("Erro na conexão com backend:", error);
  });

reportWebVitals();