// src/components/CSRFManager.js
import React, { useEffect } from 'react';
import axios from 'axios';

function CSRFManager({ children }) {
  // Removida a variável isCSRFReady que não estava sendo usada
  
  useEffect(() => {
    // Configuração axios global para CSRF
    const API_URL = 'https://chegou-hubb-production.up.railway.app/api';
    axios.defaults.withCredentials = true;
    axios.defaults.xsrfCookieName = 'csrftoken';
    axios.defaults.xsrfHeaderName = 'X-CSRFToken';
    
    const fetchCSRFToken = async () => {
      try {
        const response = await axios.get(`${API_URL}/ensure-csrf/`, {
          withCredentials: true
        });
        console.log('CSRF token obtido com sucesso', response.status);
        // Removida a chamada setIsCSRFReady(true)
      } catch (error) {
        console.error('Erro ao obter CSRF token:', error);
        setTimeout(fetchCSRFToken, 3000); // Tentar novamente após 3 segundos
      }
    };
    
    fetchCSRFToken();
    
    // Configurar um timer para renovar o token periodicamente
    const intervalId = setInterval(fetchCSRFToken, 15 * 60 * 1000); // a cada 15 minutos
    
    return () => clearInterval(intervalId);
  }, []);

  return <>{children}</>;
}

export default CSRFManager;