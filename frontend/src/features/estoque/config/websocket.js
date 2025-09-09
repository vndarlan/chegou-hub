// WebSocket configuration for real-time stock synchronization

export const WEBSOCKET_CONFIG = {
    // Connection settings
    RECONNECT_INTERVAL: 3000,
    MAX_RECONNECT_ATTEMPTS: 5,
    MESSAGE_HISTORY_LIMIT: 100,
    
    // Notification durations (in milliseconds)
    NOTIFICATION_DURATIONS: {
        stock_update: 4000,
        shopify_order: 6000,
        inventory_sync: 3000,
        low_stock_alert: 8000,
        webhook_configured: 4000,
        sync_error: 10000
    },
    
    // Highlight durations
    HIGHLIGHT_DURATIONS: {
        stock_increase: 5000,
        stock_decrease: 5000,
        low_stock: 8000,
        update: 4000
    },
    
    // WebSocket endpoints
    ENDPOINTS: {
        estoque: (lojaId) => `/ws/estoque/${lojaId}/`,
        webhook_config: '/estoque/webhook/configure/'
    },
    
    // Message types
    MESSAGE_TYPES: {
        STOCK_UPDATE: 'stock_update',
        SHOPIFY_ORDER: 'shopify_order',
        INVENTORY_SYNC: 'inventory_sync',
        LOW_STOCK_ALERT: 'low_stock_alert',
        WEBHOOK_CONFIGURED: 'webhook_configured',
        SYNC_ERROR: 'sync_error'
    },
    
    // Highlight types
    HIGHLIGHT_TYPES: {
        STOCK_INCREASE: 'stock_increase',
        STOCK_DECREASE: 'stock_decrease',
        LOW_STOCK: 'low_stock',
        UPDATE: 'update'
    },
    
    // Connection states
    CONNECTION_STATES: {
        OPEN: 'Open',
        CONNECTING: 'Connecting',
        CLOSED: 'Closed',
        ERROR: 'Error'
    }
};

// Helper functions
export const getWebSocketUrl = (path) => {
    // Configuração específica para produção
    if (window.location.hostname === 'www.chegouhub.com.br' || window.location.hostname === 'chegouhub.com.br') {
        // Em produção, usar o backend Railway diretamente
        return `wss://chegou-hubb-production.up.railway.app${path}`;
    }
    
    // Para ambientes de teste e desenvolvimento
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;
    
    // Se estamos no frontend hospedado e não é produção final
    if (host.includes('railway.app') || process.env.REACT_APP_WS_URL) {
        const backendUrl = process.env.REACT_APP_API_BASE_URL || 'https://chegou-hubb-production.up.railway.app/api';
        const baseUrl = backendUrl.replace('/api', '').replace('https://', '').replace('http://', '');
        return `wss://${baseUrl}${path}`;
    }
    
    return `${protocol}//${host}${path}`;
};

export const shouldReconnect = (attempts, maxAttempts) => {
    return attempts < maxAttempts;
};

export const getReconnectDelay = (attempt) => {
    // Exponential backoff with jitter
    const baseDelay = WEBSOCKET_CONFIG.RECONNECT_INTERVAL;
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
};

export default WEBSOCKET_CONFIG;