// frontend/src/components/CSRFManager.js
import { useEffect, useState } from 'react';
import axios from 'axios';

function CSRFManager({ children }) {
    const [csrfReady, setCsrfReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function setupCSRF() {
            try {
                // Configuração CSRF 
                axios.defaults.xsrfCookieName = 'csrftoken';
                axios.defaults.xsrfHeaderName = 'X-CSRFToken';
                
                // Faz uma chamada ao endpoint de CSRF para obter o token
                console.log("Obtendo token CSRF...");
                const response = await axios.get('/current-state/');
                console.log("Resposta do servidor recebida:", response.status);
                
                // Configura o interceptor para todas as chamadas não-GET
                axios.interceptors.request.use(config => {
                    if (config.method !== 'get') {
                        // Obtém o token diretamente do cookie a cada requisição
                        const token = document.cookie
                            .split('; ')
                            .find(row => row.startsWith('csrftoken='))
                            ?.split('=')[1];
                            
                        if (token) {
                            config.headers['X-CSRFToken'] = token;
                            console.log(`CSRF token adicionado: ${token.substring(0, 5)}...`);
                        } else {
                            console.warn("CSRF token não encontrado nos cookies!");
                        }
                    }
                    return config;
                });
                
                setCsrfReady(true);
            } catch (error) {
                console.error("Erro ao configurar CSRF:", error);
                // Mesmo com erro, tentamos prosseguir
                setCsrfReady(true);
            } finally {
                setIsLoading(false);
            }
        }
        
        setupCSRF();
    }, []);

    if (isLoading) {
        return <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontSize: '18px'
        }}>Carregando configurações de segurança...</div>;
    }

    return children;
}

export default CSRFManager;