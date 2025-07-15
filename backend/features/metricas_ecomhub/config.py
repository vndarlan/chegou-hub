# backend/features/metricas_ecomhub/config.py
"""
Configurações específicas para integração Shopify
Arquivo separado para manter settings.py limpo
"""
import os
from pathlib import Path
import logging

# Diretório base da feature
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ======================== CONFIGURAÇÕES SHOPIFY ========================

# Timeout para requisições Shopify (em segundos)
SHOPIFY_REQUEST_TIMEOUT = int(os.getenv('SHOPIFY_TIMEOUT', '30'))

# Versão padrão da API Shopify
SHOPIFY_DEFAULT_API_VERSION = os.getenv('SHOPIFY_API_VERSION', '2024-01')

# Limite de requisições por minuto (para respeitar rate limit da Shopify)
SHOPIFY_RATE_LIMIT = int(os.getenv('SHOPIFY_RATE_LIMIT', '40'))

# Tamanho do batch para consultas em lote
SHOPIFY_BATCH_SIZE = int(os.getenv('SHOPIFY_BATCH_SIZE', '50'))

# Cache timeout para produtos Shopify (em segundos)
SHOPIFY_CACHE_TIMEOUT = int(os.getenv('SHOPIFY_CACHE_TIMEOUT', '86400'))  # 24 horas

# ======================== CONFIGURAÇÕES DE LOGGING ========================

# Criar diretório de logs específico se não existir
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

# Configuração de logging específica para Shopify
SHOPIFY_LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'shopify': {
            'format': '[SHOPIFY] {levelname} {asctime} - {message}',
            'style': '{',
        },
        'ecomhub': {
            'format': '[ECOMHUB] {levelname} {asctime} - {message}',
            'style': '{',
        },
    },
    'handlers': {
        'shopify_file': {
            'class': 'logging.FileHandler',
            'filename': LOG_DIR / 'shopify.log',
            'formatter': 'shopify',
            'level': 'DEBUG',
        },
        'ecomhub_file': {
            'class': 'logging.FileHandler',
            'filename': LOG_DIR / 'ecomhub.log',
            'formatter': 'ecomhub',
            'level': 'DEBUG',
        },
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'ecomhub',
            'level': 'INFO',
        },
    },
    'loggers': {
        'features.metricas_ecomhub.shopify_client': {
            'handlers': ['shopify_file', 'console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'features.metricas_ecomhub.utils': {
            'handlers': ['ecomhub_file', 'console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'features.metricas_ecomhub.views': {
            'handlers': ['ecomhub_file', 'console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# ======================== INICIALIZAÇÃO ========================

def setup_shopify_logging():
    """Configura logging específico para Shopify"""
    import logging.config
    logging.config.dictConfig(SHOPIFY_LOGGING_CONFIG)

def get_shopify_config():
    """Retorna dicionário com todas as configurações Shopify"""
    return {
        'timeout': SHOPIFY_REQUEST_TIMEOUT,
        'api_version': SHOPIFY_DEFAULT_API_VERSION,
        'rate_limit': SHOPIFY_RATE_LIMIT,
        'batch_size': SHOPIFY_BATCH_SIZE,
        'cache_timeout': SHOPIFY_CACHE_TIMEOUT,
        'log_dir': LOG_DIR,
    }

# Auto-configurar logging ao importar
setup_shopify_logging()