// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Configuração base do Axios
const API_URL = 'https://chegou-hubb-production.up.railway.app/api';
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;
console.log("API Base URL configurada:", axios.defaults.baseURL);

// Configuração CSRF
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

// Debug para desenvolvimento
const DEBUG_MODE = false; // Altere para true quando precisar debugar

// Adicione interceptor para logging em desenvolvimento
if (DEBUG_MODE) {
  axios.interceptors.request.use(config => {
    console.log(`[Request] ${config.method.toUpperCase()} ${config.url}`, config);
    return config;
  });
  
  axios.interceptors.response.use(
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

// Interceptor para lidar com erros comuns
axios.interceptors.response.use(
  response => response,
  error => {
    // Tratar erros específicos aqui
    if (error.response && error.response.status === 403 && 
        error.response.data?.detail?.includes('CSRF')) {
      console.error('Erro de CSRF detectado. Tentando recarregar o token...');
      // Você pode implementar uma lógica de retry aqui
    }
    
    if (error.response && error.response.status === 401) {
      console.warn('Sessão expirada ou usuário não autenticado');
      // Redirecionar para login se necessário
    }
    
    return Promise.reject(error);
  }
);

// Inicializar a aplicação
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Verificação inicial da API - útil para debugging
axios.get(`${API_URL}/ensure-csrf/`)
  .then(response => {
    console.log("Conexão com backend estabelecida:", response.status);
    
    // Verificar se o cookie foi definido
    const hasCsrfCookie = document.cookie
      .split(';')
      .some(cookie => cookie.trim().startsWith('csrftoken='));
      
    console.log("Cookie CSRF definido:", hasCsrfCookie);
  })
  .catch(error => {
    console.error("Erro na conexão com backend:", error);
  });

// Métricas
reportWebVitals();