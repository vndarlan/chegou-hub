import React, { useEffect } from 'react';
import axios from 'axios';

function CSRFManager({ children }) {
  useEffect(() => {
    // Configuração axios global
    axios.defaults.withCredentials = true;
    axios.defaults.xsrfCookieName = 'csrftoken';
    axios.defaults.xsrfHeaderName = 'X-CSRFToken';
    
    const fetchCSRFToken = async () => {
      try {
        console.log("Obtendo token CSRF...");
        await axios.get('/current-state/');
        
        // Verificar se o cookie foi definido
        const csrfCookie = document.cookie
          .split(';')
          .find(cookie => cookie.trim().startsWith('csrftoken='));
          
        if (csrfCookie) {
          const token = csrfCookie.split('=')[1];
          console.log(`Token CSRF obtido: ${token.substring(0, 6)}...`);
          axios.defaults.headers.common['X-CSRFToken'] = token;
        }
      } catch (error) {
        console.error('Erro ao obter CSRF token:', error);
      }
    };
    
    // Interceptor para incluir CSRF token em todas as requisições
    const interceptorId = axios.interceptors.request.use(
      (config) => {
        if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
          const cookies = document.cookie.split(';');
          const csrftoken = cookies
            .find(cookie => cookie.trim().startsWith('csrftoken='))
            ?.split('=')[1];
            
          if (csrftoken) {
            config.headers['X-CSRFToken'] = csrftoken;
          } else {
            console.warn('CSRF token não encontrado!');
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Obter token inicial
    fetchCSRFToken();
    
    return () => {
      axios.interceptors.request.eject(interceptorId);
    };
  }, []);

  return <>{children}</>;
}

export default CSRFManager;