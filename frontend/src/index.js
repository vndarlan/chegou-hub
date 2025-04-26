// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { setupCSRF, forceRefreshCSRFToken } from './utils/csrf';

// Configuração base do Axios
axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL || '/api';
console.log("API Base URL:", axios.defaults.baseURL);

// Configurar CSRF
setupCSRF();

// Inicializar a aplicação após verificar o CSRF
const initApp = async () => {
    try {
        // Tentar obter o token CSRF antes de iniciar a aplicação
        await forceRefreshCSRFToken();
    } catch (error) {
        console.error("Erro ao inicializar o token CSRF:", error);
    } finally {
        // Inicializar a aplicação de qualquer maneira
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
    }
};

initApp();

reportWebVitals();