// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios'; // Importar axios
import './index.css';      // Estilos globais
import App from './App';      // Seu componente App principal
import reportWebVitals from './reportWebVitals';

axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL;
console.log("API Base URL:", axios.defaults.baseURL); // Para debug

// --- Configuração Padrão do Axios para CSRF e Credenciais ---
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withCredentials = true; // Enviar cookies em todas as requisições
// --- Fim da Configuração Axios ---

// Adicione um interceptor para examinar requests
axios.interceptors.request.use(request => {
  console.log('Request enviada:', request.url);
  console.log('Headers:', request.headers);
  return request;
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();