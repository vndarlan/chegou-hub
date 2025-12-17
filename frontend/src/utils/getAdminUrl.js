/**
 * Retorna a URL do painel de administração baseada no ambiente
 * @returns {string} URL completa do admin
 */
export const getAdminUrl = () => {
  const baseUrl = process.env.REACT_APP_API_BASE_URL?.replace('/api', '')
    || 'https://chegou-hubb-production.up.railway.app';
  return `${baseUrl}/admin/`;
};
