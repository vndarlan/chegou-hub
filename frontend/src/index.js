// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios'; // Esta importação estava faltando
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Configuração base do Axios - definindo URL completa explicitamente
const API_URL = 'https://chegou-hubb-production.up.railway.app/api';
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;
console.log("API Base URL FIXA:", axios.defaults.baseURL);

// Configuração CSRF simplificada
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

// Adicione um interceptor para garantir que o token é obtido antes de requisições
axios.interceptors.request.use(async (config) => {
  // Se for um método que modifica dados, garanta que temos um CSRF token
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    try {
      // Tente obter o token antes da requisição principal
      await axios.get(`${API_URL}/ensure-csrf/`);
    } catch (error) {
      console.warn('Falha ao obter CSRF token:', error);
    }
  }
  return config;
});

// Inicializar a aplicação sem tentar obter o CSRF token primeiro
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Opcional: Verificação de conexão com o backend
axios.get(`${API_URL}/ensure-csrf/`)
  .then(response => {
    console.log("Conexão com backend estabelecida:", response.status);
  })
  .catch(error => {
    console.error("Erro na conexão com backend:", error);
  });

reportWebVitals();