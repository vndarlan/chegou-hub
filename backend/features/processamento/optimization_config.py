# backend/features/processamento/optimization_config.py
"""
Configurações das otimizações V2 para resolver erro 499
Centralizadas para fácil manutenção
"""

# ===== TIMEOUTS E LIMITES =====
class TimeoutConfig:
    """Configurações de timeout baseadas no período"""
    
    # Timeouts síncronos (em segundos)
    SYNC_TIMEOUT_SHORT = 15      # Para períodos ≤ 7 dias
    SYNC_TIMEOUT_MEDIUM = 20     # Para períodos 8-30 dias
    SYNC_TIMEOUT_LONG = 25       # Máximo para síncrono
    
    # Timeouts assíncronos (formato Django-RQ)
    ASYNC_TIMEOUT_SHORT = '15m'  # Para períodos ≤ 60 dias
    ASYNC_TIMEOUT_MEDIUM = '25m' # Para períodos 61-120 dias
    ASYNC_TIMEOUT_LONG = '30m'   # Máximo para assíncrono

class ProcessingLimits:
    """Limites de processamento"""
    
    # Limites de período
    SYNC_MAX_DAYS = 30           # Máximo para processamento síncrono
    ASYNC_MIN_DAYS = 31          # Mínimo para processamento assíncrono
    
    # Chunking
    CHUNK_SIZE_DAYS = 15         # Tamanho ideal do chunk
    CHUNK_DELAY_SECONDS = 2      # Delay entre chunks
    CHUNK_FAILURE_THRESHOLD = 0.5 # 50% de falhas para parar
    
    # API Shopify
    SHOPIFY_API_LIMIT = 250      # Máximo por request
    SHOPIFY_ESSENTIAL_FIELDS = 'id,order_number,created_at,browser_ip,client_details'
    
    # Resultados
    MAX_ORDERS_PER_IP = 50       # Limite de pedidos por IP no resultado

# ===== RATE LIMITING =====
class RateLimitConfig:
    """Configurações de rate limiting"""
    
    # Sync endpoints
    SYNC_REQUESTS_PER_HOUR = 10
    SYNC_WINDOW_SECONDS = 3600
    
    # Async endpoints  
    ASYNC_JOBS_PER_HOUR = 3
    ASYNC_WINDOW_SECONDS = 3600
    
    # Cache
    CACHE_REQUESTS_PER_MINUTE = 30
    CACHE_WINDOW_SECONDS = 60

# ===== CACHE =====
class CacheConfig:
    """Configurações de cache Redis"""
    
    # TTLs (em segundos)
    IP_SEARCH_RESULTS_TTL = 600    # 10 minutos
    IP_DETAILS_TTL = 300           # 5 minutos
    ASYNC_JOB_STATUS_TTL = 7200    # 2 horas
    ASYNC_JOB_RESULT_TTL = 3600    # 1 hora
    ERROR_CACHE_TTL = 1800         # 30 minutos
    
    # Prefixos
    PREFIX_IP_SEARCH = "ip_search_v2"
    PREFIX_ASYNC_STATUS = "async_job_status"
    PREFIX_ASYNC_RESULT = "async_job_result"

# ===== CIRCUIT BREAKER =====
class CircuitBreakerConfig:
    """Configurações do circuit breaker"""
    
    # Fallback strategies (em ordem de prioridade)
    FALLBACK_STRATEGIES = [
        {
            'name': 'reduce_period',
            'condition': 'days > 7',
            'action': 'set_days_to_7',
            'max_retries': 1
        },
        {
            'name': 'increase_min_orders',
            'condition': 'min_orders < 5',
            'action': 'set_min_orders_to_5',
            'max_retries': 1
        },
        {
            'name': 'use_cache',
            'condition': 'cache_available',
            'action': 'return_cached_data',
            'max_retries': 1
        }
    ]

# ===== MONITORAMENTO =====
class MonitoringConfig:
    """Configurações de monitoramento e logging"""
    
    # Níveis de log por contexto
    LOG_LEVELS = {
        'optimization_start': 'INFO',
        'cache_hit': 'DEBUG',
        'cache_miss': 'INFO',
        'chunking_start': 'INFO',
        'chunk_complete': 'DEBUG',
        'async_job_start': 'INFO',
        'async_job_progress': 'INFO',
        'async_job_complete': 'INFO',
        'fallback_triggered': 'WARNING',
        'circuit_breaker': 'ERROR',
        'rate_limit_hit': 'WARNING'
    }
    
    # Métricas para capturar
    PERFORMANCE_METRICS = [
        'processing_time_seconds',
        'total_ips_found',
        'total_orders_analyzed',
        'chunks_processed',
        'chunks_failed',
        'cache_hit_ratio',
        'api_calls_made',
        'fallbacks_triggered'
    ]

# ===== ESTIMATIVAS DE TEMPO =====
class TimeEstimation:
    """Estimativas de tempo de processamento"""
    
    ESTIMATES = {
        (0, 7): 1,      # 1 minuto para até 7 dias
        (8, 15): 2,     # 2 minutos para 8-15 dias
        (16, 30): 4,    # 4 minutos para 16-30 dias
        (31, 60): 8,    # 8 minutos para 31-60 dias
        (61, 120): 15,  # 15 minutos para 61-120 dias
        (121, 999): 25  # 25 minutos para mais de 120 dias
    }
    
    @classmethod
    def get_estimate(cls, days):
        """Retorna estimativa em minutos para um período"""
        for (min_days, max_days), minutes in cls.ESTIMATES.items():
            if min_days <= days <= max_days:
                return minutes
        return 25  # Default para períodos muito grandes

# ===== SHOPIFY API =====
class ShopifyAPIConfig:
    """Configurações específicas da API Shopify"""
    
    # Rate limiting da Shopify (respeitamos os limites deles)
    SHOPIFY_RATE_LIMIT_CALLS = 40  # Calls por segundo
    SHOPIFY_RATE_LIMIT_WINDOW = 1  # Janela em segundos
    
    # Configurações de retry
    MAX_RETRIES = 3
    RETRY_DELAY_SECONDS = 2
    BACKOFF_MULTIPLIER = 2
    
    # Health check
    CONNECTION_TIMEOUT = 5  # Segundos para teste de conexão
    
    # API Version
    DEFAULT_API_VERSION = '2023-10'

# ===== FUNCÕES HELPER =====

def get_timeout_for_period(days, is_async=False):
    """
    Retorna timeout apropriado para um período
    
    Args:
        days (int): Número de dias
        is_async (bool): Se é processamento assíncrono
        
    Returns:
        int or str: Timeout em segundos (sync) ou string (async)
    """
    if is_async:
        if days <= 60:
            return TimeoutConfig.ASYNC_TIMEOUT_SHORT
        elif days <= 120:
            return TimeoutConfig.ASYNC_TIMEOUT_MEDIUM
        else:
            return TimeoutConfig.ASYNC_TIMEOUT_LONG
    else:
        if days <= 7:
            return TimeoutConfig.SYNC_TIMEOUT_SHORT
        elif days <= 30:
            return TimeoutConfig.SYNC_TIMEOUT_MEDIUM
        else:
            return TimeoutConfig.SYNC_TIMEOUT_LONG

def should_use_async(days):
    """
    Determina se deve usar processamento assíncrono
    
    Args:
        days (int): Número de dias
        
    Returns:
        bool: True se deve usar assíncrono
    """
    return days > ProcessingLimits.SYNC_MAX_DAYS

def calculate_chunks(days):
    """
    Calcula chunks para um período
    
    Args:
        days (int): Número de dias total
        
    Returns:
        list: Lista de dicionários com info dos chunks
    """
    chunks = []
    chunk_size = ProcessingLimits.CHUNK_SIZE_DAYS
    
    current_day = 0
    while current_day < days:
        chunk_end = min(current_day + chunk_size, days)
        chunks.append({
            'start': current_day,
            'end': chunk_end,
            'days': chunk_end - current_day
        })
        current_day = chunk_end
    
    return chunks

# ===== VALIDAÇÃO =====

def validate_config():
    """Valida se todas as configurações estão consistentes"""
    errors = []
    
    # Verifica se timeouts são progressivos
    if not (TimeoutConfig.SYNC_TIMEOUT_SHORT <= 
            TimeoutConfig.SYNC_TIMEOUT_MEDIUM <= 
            TimeoutConfig.SYNC_TIMEOUT_LONG):
        errors.append("Timeouts síncronos não estão em ordem progressiva")
    
    # Verifica se limites de período fazem sentido
    if ProcessingLimits.SYNC_MAX_DAYS >= ProcessingLimits.ASYNC_MIN_DAYS:
        errors.append("Limite síncrono deve ser menor que mínimo assíncrono")
    
    # Verifica se chunk size é razoável
    if ProcessingLimits.CHUNK_SIZE_DAYS > ProcessingLimits.SYNC_MAX_DAYS:
        errors.append("Chunk size não pode ser maior que período síncrono máximo")
    
    return errors

# Valida configuração na importação
_config_errors = validate_config()
if _config_errors:
    import logging
    logger = logging.getLogger(__name__)
    for error in _config_errors:
        logger.error(f"⚠️ Erro na configuração: {error}")