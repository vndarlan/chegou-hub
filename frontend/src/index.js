// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL;
console.log("API Base URL:", axios.defaults.baseURL);

// --- Configuração CSRF corrigida ---
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withCredentials = true;

// Garantir que o token é obtido antes de qualquer requisição
axios.interceptors.request.use(
  config => {
    // Para debugging
    if (config.method !== 'get') {
      console.log('Enviando request com CSRF token:', document.cookie.match(/csrftoken=([^;]*)/)?.[1] || 'Token não encontrado');
    }
    return config;
  },
  error => Promise.reject(error)
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();