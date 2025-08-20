// src/index.js - ATUALIZADO PARA SHADCN/UI
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './globals.css'; // Novo CSS com Tailwind e variáveis do tema
import App from './App';
import reportWebVitals from './reportWebVitals';

// Configuração base do Axios (mantém igual)
const API_URL = 'https://chegou-hubb-production.up.railway.app/api';
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;
console.log("API Base URL configurada:", axios.defaults.baseURL);

axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

const DEBUG_MODE = false;

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

axios.interceptors.response.use(
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

axios.get(`${API_URL}/ensure-csrf/`)
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