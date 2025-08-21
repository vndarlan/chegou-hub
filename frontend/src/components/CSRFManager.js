import React, { useEffect } from 'react';
import axios from 'axios';

function CSRFManager({ children }) {
  useEffect(() => {
    // Configuração axios global
    axios.defaults.withCredentials = true;
    
    let csrfToken = null;
    
    const fetchCSRFToken = async () => {
      try {
        console.log("🔐 Obtendo token CSRF...");
        const response = await axios.get('/api/current-state/');
        
        // Obter token do JSON response (não do cookie)
        if (response.data && response.data.csrf_token) {
          csrfToken = response.data.csrf_token;
          console.log(`✅ Token CSRF obtido: ${csrfToken.substring(0, 8)}...`);
          
          // Definir nos headers padrão
          axios.defaults.headers.common['X-CSRFToken'] = csrfToken;
          
          // Armazenar temporariamente
          sessionStorage.setItem('csrf_token', csrfToken);
        } else {
          console.error('❌ Token CSRF não encontrado na resposta');
        }
      } catch (error) {
        console.error('❌ Erro ao obter CSRF token:', error);
      }
    };
    
    // Interceptor para incluir CSRF token em todas as requisições
    const interceptorId = axios.interceptors.request.use(
      (config) => {
        if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
          // Usar token armazenado ou tentar obter do sessionStorage
          let token = csrfToken || sessionStorage.getItem('csrf_token');
          
          // Se não tem token, tentar obter do cookie como fallback
          if (!token) {
            const cookies = document.cookie.split(';');
            const csrfCookie = cookies
              .find(cookie => cookie.trim().startsWith('csrftoken='))
              ?.split('=')[1];
            if (csrfCookie) {
              token = csrfCookie;
            }
          }
          
          if (token) {
            config.headers['X-CSRFToken'] = token;
            console.log(`🔒 CSRF token adicionado ao ${config.method.toUpperCase()} ${config.url}`);
          } else {
            console.warn('⚠️ CSRF token não encontrado!');
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Interceptor para response - renovar token se necessário
    const responseInterceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Se erro 403 relacionado a CSRF, tentar renovar token
        if (error.response?.status === 403) {
          console.warn('⚠️ Erro 403 detectado, tentando renovar CSRF token...');
          try {
            await fetchCSRFToken();
            // Tentar requisição novamente com novo token
            const originalRequest = error.config;
            if (csrfToken) {
              originalRequest.headers['X-CSRFToken'] = csrfToken;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            console.error('❌ Erro ao renovar CSRF token:', refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
    
    // Obter token inicial
    fetchCSRFToken();
    
    // Limpar interceptors quando componente for desmontado
    return () => {
      axios.interceptors.request.eject(interceptorId);
      axios.interceptors.response.eject(responseInterceptorId);
    };
  }, []);

  return <>{children}</>;
}

export default CSRFManager;