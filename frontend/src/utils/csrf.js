// frontend/src/utils/csrf.js
import axios from 'axios';

// Função para obter o token CSRF dos cookies
export function getCSRFToken() {
    let csrftoken = null;
    if (document.cookie) {
        const cookies = document.cookie.split(';')
            .map(cookie => cookie.trim())
            .filter(cookie => cookie.startsWith('csrftoken='));
        
        if (cookies.length > 0) {
            csrftoken = cookies[0].split('=')[1];
        }
    }
    return csrftoken;
}

// Função para configurar o axios com o token CSRF
export function setupCSRF() {
    // Configuração básica
    axios.defaults.withCredentials = true;
    axios.defaults.xsrfHeaderName = 'X-CSRFToken';
    axios.defaults.xsrfCookieName = 'csrftoken';
    
    // Adiciona um interceptor para incluir o token em cada requisição
    axios.interceptors.request.use(
        async (config) => {
            // Apenas para métodos que precisam de proteção CSRF
            if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
                const token = getCSRFToken();
                
                if (token) {
                    console.log(`Usando token CSRF: ${token.substring(0, 10)}...`);
                    config.headers['X-CSRFToken'] = token;
                } else {
                    console.warn('Token CSRF não encontrado! Tentando obter do servidor...');
                    
                    try {
                        // Tenta obter o token antes de continuar usando URL absoluta
                        const baseURL = axios.defaults.baseURL || '';
                        await axios.get('/api/current-state/', {
                            withCredentials: true,
                            baseURL: baseURL
                        });
                        
                        // Tenta novamente obter o token
                        const newToken = getCSRFToken();
                        if (newToken) {
                            console.log(`Novo token CSRF obtido: ${newToken.substring(0, 10)}...`);
                            config.headers['X-CSRFToken'] = newToken;
                        } else {
                            console.error('Não foi possível obter o token CSRF mesmo após chamar current-state');
                            // Tentativa alternativa usando endpoint específico
                            try {
                                await axios.get('/api/ensure-csrf/', {
                                    withCredentials: true,
                                    baseURL: baseURL
                                });
                                const retryToken = getCSRFToken();
                                if (retryToken) {
                                    console.log(`Token CSRF obtido via ensure-csrf: ${retryToken.substring(0, 10)}...`);
                                    config.headers['X-CSRFToken'] = retryToken;
                                }
                            } catch (ensureError) {
                                console.error('Erro ao tentar ensure-csrf:', ensureError);
                            }
                        }
                    } catch (error) {
                        console.error('Erro ao tentar obter token CSRF:', error);
                    }
                }
            }
            return config;
        },
        (error) => Promise.reject(error)
    );
}

// Adiciona uma função que força a obtenção do token CSRF
export async function forceRefreshCSRFToken() {
    try {
        // Limpa o cookie CSRF existente (pode não funcionar devido a limitações de segurança)
        document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        
        console.log('Forçando refresh do token CSRF...');
        const response = await axios.get('/current-state/', { withCredentials: true });
        console.log('Resposta do servidor:', response.status);
        
        // Verifica se obteve o token
        const token = getCSRFToken();
        if (token) {
            console.log(`Token CSRF atualizado: ${token.substring(0, 10)}...`);
            return true;
        } else {
            console.error('Não foi possível obter o token CSRF do servidor.');
            return false;
        }
    } catch (error) {
        console.error('Erro ao forçar refresh do token CSRF:', error);
        return false;
    }
}

// Função para criar um cliente axios com CSRF
export function createCSRFAxios() {
    const instance = axios.create({
        withCredentials: true,
        xsrfHeaderName: 'X-CSRFToken',
        xsrfCookieName: 'csrftoken'
    });
    
    instance.interceptors.request.use(
        async (config) => {
            if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
                const token = getCSRFToken();
                if (token) {
                    config.headers['X-CSRFToken'] = token;
                }
            }
            return config;
        },
        (error) => Promise.reject(error)
    );
    
    return instance;
}