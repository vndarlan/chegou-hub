// src/components/CSRFManager.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function CSRFManager({ children }) {
  const [isCSRFReady, setIsCSRFReady] = useState(false);
  
  useEffect(() => {
    // Configuração axios global
    const API_URL = 'https://chegou-hubb-production.up.railway.app/api';
    axios.defaults.withCredentials = true;
    axios.defaults.xsrfCookieName = 'csrftoken';
    axios.defaults.xsrfHeaderName = 'X-CSRFToken';
    
    const fetchCSRFToken = async () => {
      try {
        console.log('Tentando obter token CSRF...');
        const response = await axios.get(`${API_URL}/ensure-csrf/`, {
          withCredentials: true
        });
        
        // Obtenção bem-sucedida
        if (response.status === 200) {
          // Verifica se o cookie foi definido
          const csrfCookie = document.cookie
            .split(';')
            .find(cookie => cookie.trim().startsWith('csrftoken='));
            
          if (csrfCookie) {
            const token = csrfCookie.split('=')[1];
            console.log(`Token CSRF obtido: ${token.substring(0, 6)}...`);
            
            // Define o token para todas as requisições futuras do axios
            axios.defaults.headers.common['X-CSRFToken'] = token;
            setIsCSRFReady(true);
          } else {
            console.error('CSRF cookie não encontrado após resposta do servidor');
            setTimeout(fetchCSRFToken, 3000);
          }
        }
      } catch (error) {
        console.error('Erro ao obter CSRF token:', error);
        setTimeout(fetchCSRFToken, 3000); // Tentar novamente após 3 segundos
      }
    };
    
    fetchCSRFToken();
    
    // Configura interceptor para todas as requisições POST/PUT/PATCH/DELETE
    const interceptorId = axios.interceptors.request.use(
      (config) => {
        // Para métodos que requerem proteção CSRF
        if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
          // Obtém o token CSRF mais atual dos cookies
          const cookies = document.cookie.split(';');
          const csrftoken = cookies
            .find(cookie => cookie.trim().startsWith('csrftoken='))
            ?.split('=')[1];
            
          if (csrftoken) {
            // Define o cabeçalho para esta requisição
            config.headers['X-CSRFToken'] = csrftoken;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Renovar o token a cada 15 minutos
    const intervalId = setInterval(fetchCSRFToken, 15 * 60 * 1000);
    
    return () => {
      clearInterval(intervalId);
      axios.interceptors.request.eject(interceptorId);
    };
  }, []);

  return <>{children}</>;
}

export default CSRFManager;