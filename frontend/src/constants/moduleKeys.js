/**
 * Mapeamento de rotas para module_keys do sistema de permissões
 * Baseado em MODULES do backend (core/models.py)
 */

export const ROUTE_TO_MODULE = {
  // GESTÃO EMPRESARIAL
  '/gestao/agenda': 'agenda',
  '/gestao/jira': 'jira',

  // IA & PROJETOS
  '/interno/projetos': 'ia_projetos',
  '/interno/logs': 'ia_logs',
  '/interno/openai-analytics': 'ia_openai',

  // FORNECEDORES > EUROPA
  '/fornecedores/europa/ecomhub/efetividade': 'ecomhub_efetividade',
  '/fornecedores/europa/ecomhub/efetividade-v2': 'ecomhub_efetividade_v2',
  '/fornecedores/europa/ecomhub/status': 'ecomhub_status',
  '/fornecedores/europa/ecomhub/configuracoes': 'ecomhub_config',
  '/fornecedores/europa/n1/efetividade': 'n1_efetividade',
  '/fornecedores/europa/primecod/efetividade': 'primecod_efetividade',
  '/fornecedores/europa/primecod/catalogo': 'primecod_catalogo',
  '/fornecedores/europa/primecod/configuracoes': 'primecod_config',

  // FORNECEDORES > LATAM
  '/fornecedores/latam/dropi/efetividade': 'dropi_efetividade',
  '/fornecedores/latam/dropi/novelties': 'dropi_novelties',

  // SHOPIFY
  '/shopify/estoque': 'shopify_estoque',
  '/shopify/processamento': 'shopify_processamento',
  '/shopify/detector-ip': 'shopify_detector_ip',

  // IA & CHATBOTS
  '/ia/nicochat': 'nicochat',

  // PLATAFORMAS DE ANÚNCIO
  '/anuncios/facebook/engajamento': 'facebook_engajamento',

  // ROTAS PÚBLICAS (sem verificação de permissão)
  '/perfil': null,
  '/configuracoes/organizacao': null,
};

/**
 * Retorna o module_key para uma rota específica
 * @param {string} path - Caminho da rota
 * @returns {string|null} module_key ou null se rota pública
 */
export const getModuleKeyFromPath = (path) => {
  // Remove barra inicial se existir
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return ROUTE_TO_MODULE[normalizedPath] || null;
};

/**
 * Lista de todos os module_keys disponíveis no sistema
 */
export const MODULE_KEYS = Object.values(ROUTE_TO_MODULE).filter(Boolean);

/**
 * Verifica se uma rota é pública (não requer verificação de permissão)
 * @param {string} path - Caminho da rota
 * @returns {boolean}
 */
export const isPublicRoute = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return ROUTE_TO_MODULE[normalizedPath] === null;
};
