import React, { useEffect } from 'react';
import axios from 'axios';

function CSRFManager({ children }) {
  useEffect(() => {
    // Configuração axios global
    const API_URL = 'https://chegou-hubb-production.up.railway.app/api';
    axios.defaults.withCredentials = true;
    axios.defaults.xsrfCookieName = 'csrftoken';
    axios.defaults.xsrfHeaderName = 'X-CSRFToken';
    
    const fetchCSRFToken = async (attemptNumber = 1) => {
      if (attemptNumber > 3) {
        console.log("Desistindo após 3 tentativas de obter CSRF token");
        return;
      }
      
      try {
        console.log(`Tentativa ${attemptNumber} de obter token CSRF...`);
        
        // Usar timestamp para evitar cache
        const timestamp = new Date().getTime();
        await axios.get(`${API_URL}/ensure-csrf/?_=${timestamp}`);
        
        // Esperar um momento para o cookie ser configurado
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Verificar se o cookie foi definido
        const csrfCookie = document.cookie
          .split(';')
          .find(cookie => cookie.trim().startsWith('csrftoken='));
          
        if (csrfCookie) {
          const token = csrfCookie.split('=')[1];
          console.log(`Token CSRF obtido: ${token.substring(0, 6)}...`);
          
          // Define o token para todas as requisições futuras do axios
          axios.defaults.headers.common['X-CSRFToken'] = token;
        } else {
          console.log('CSRF cookie não encontrado, tentando abordagem alternativa...');
          // Tentar novamente após um intervalo (com backoff exponencial)
          setTimeout(() => fetchCSRFToken(attemptNumber + 1), 1000 * attemptNumber);
        }
      } catch (error) {
        console.error('Erro ao obter CSRF token:', error);
        // Tentar novamente após um intervalo (com backoff exponencial)
        setTimeout(() => fetchCSRFToken(attemptNumber + 1), 1000 * attemptNumber);
      }
    };
    
    // Iniciar obtenção do token
    fetchCSRFToken();
    
    // Configurar interceptor mais simples
    const interceptorId = axios.interceptors.request.use(
      (config) => {
        if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
          // Obter o token CSRF mais atual dos cookies
          const cookies = document.cookie.split(';');
          const csrftoken = cookies
            .find(cookie => cookie.trim().startsWith('csrftoken='))
            ?.split('=')[1];
            
          if (csrftoken) {
            config.headers['X-CSRFToken'] = csrftoken;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Renovar o token a cada 30 minutos
    const intervalId = setInterval(fetchCSRFToken, 30 * 60 * 1000);
    
    return () => {
      clearInterval(intervalId);
      axios.interceptors.request.eject(interceptorId);
    };
  }, []);

  return <>{children}</>;
}

export default CSRFManager;