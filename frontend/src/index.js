// frontend/src/index.js - Mantenha seu baseURL original mas ajuste as configurações CSRF

// Mantenha esta parte
const API_URL = 'https://chegou-hubb-production.up.railway.app/api';
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

// Adicione esta configuração explícita para CSRF
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

// Adicione um interceptor para garantir que o token é obtido antes de requisições
axios.interceptors.request.use(async (config) => {
  // Se for um método que modifica dados, garanta que temos um CSRF token
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    try {
      // Tente obter o token antes da requisição principal
      await axios.get(`${API_URL}/ensure-csrf/`);
    } catch (error) {
      console.warn('Falha ao obter CSRF token:', error);
    }
  }
  return config;
});