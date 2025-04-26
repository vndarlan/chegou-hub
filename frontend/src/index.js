// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
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