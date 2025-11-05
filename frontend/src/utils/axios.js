import axios from 'axios';

/**
 * Helper para obter CSRF token do cookie
 * @returns {string} CSRF token
 */
const getCsrfToken = () => {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
};

/**
 * Cliente Axios configurado com CSRF token automático
 * Usa withCredentials e injeta X-CSRFToken em todos os requests
 */
export const apiClient = axios.create({
    withCredentials: true,
    headers: {
        'X-CSRFToken': getCsrfToken()
    }
});

/**
 * Interceptor para atualizar CSRF token em cada request
 * Garante que o token mais recente seja sempre usado
 */
apiClient.interceptors.request.use(config => {
    config.headers['X-CSRFToken'] = getCsrfToken();
    return config;
});

export default apiClient;
