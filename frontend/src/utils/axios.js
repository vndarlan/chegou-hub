import axios from 'axios';

/**
 * Cliente Axios configurado para o Chegou Hub
 *
 * NOTA: O gerenciamento de CSRF token é feito pelo CSRFManager.js
 * que obtém o token do endpoint /current-state/ e injeta automaticamente
 * em todas as requisições POST/PUT/PATCH/DELETE
 */
export const apiClient = axios.create({
    withCredentials: true
});

export default apiClient;
