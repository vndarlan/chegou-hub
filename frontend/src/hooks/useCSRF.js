import { useState, useEffect } from 'react';
import { getCSRFToken } from '../utils/csrf';

/**
 * Hook para gerenciar o token CSRF
 */
export const useCSRF = () => {
  const [csrfToken, setCsrfToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCSRFToken = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Tenta obter do cookie primeiro
      let token = getCSRFToken();
      
      if (!token) {
        // Se não tem no cookie, tenta obter do sessionStorage
        token = sessionStorage.getItem('csrf_token');
      }

      if (!token) {
        // Se ainda não tem, faz requisição para current-state
        console.log('Buscando token CSRF do servidor...');
        const response = await fetch('/current-state/', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.csrf_token) {
            token = data.csrf_token;
            sessionStorage.setItem('csrf_token', token);
          }
        }
      }

      setCsrfToken(token);
      return token;
    } catch (err) {
      console.error('Erro ao obter token CSRF:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCSRFToken();
  }, []);

  return {
    csrfToken,
    isLoading,
    error,
    refreshToken: fetchCSRFToken,
  };
};