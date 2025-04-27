// src/components/CSRFManager.js
import React, { useEffect } from 'react';
import axios from 'axios';

function CSRFManager({ children }) {
  useEffect(() => {
    const fetchCSRFToken = async () => {
      try {
        await axios.get('/ensure-csrf/');
        console.log('CSRF token obtido com sucesso');
      } catch (error) {
        console.error('Erro ao obter CSRF token:', error);
      }
    };
    
    fetchCSRFToken();
    
    // Configurar um timer para renovar o token periodicamente 
    const intervalId = setInterval(fetchCSRFToken, 30 * 60 * 1000); // a cada 30 minutos
    
    return () => clearInterval(intervalId);
  }, []);

  return <>{children}</>;
}

export default CSRFManager;