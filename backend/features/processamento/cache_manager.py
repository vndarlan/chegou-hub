# backend/features/processamento/cache_manager.py
"""
Sistema de Cache Redis para Detecção de IP
Gerencia cache centralizado para melhorar performance significativamente
"""

import json
import logging
import hashlib
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from functools import wraps

from django.core.cache import cache
from django.conf import settings
from django.utils import timezone

import redis

logger = logging.getLogger(__name__)

class IPDetectionCacheManager:
    """
    Gerenciador central de cache para sistema de detecção de IP
    Implementa cache inteligente com fallback gracioso
    """
    
    # === CONFIGURAÇÕES DE TTL (em segundos) ===
    TTL_IP_SEARCH_RESULTS = 600    # 10 minutos - resultados de busca por IP
    TTL_IP_DETAILS = 300           # 5 minutos - detalhes específicos de IP
    TTL_STORE_LIST = 900           # 15 minutos - lista de lojas
    TTL_STORE_CONFIG = 1800        # 30 minutos - configurações da loja
    TTL_ORDER_COUNT = 600          # 10 minutos - contagem de pedidos
    TTL_SHOPIFY_AUTH = 3600        # 60 minutos - dados de auth Shopify
    TTL_PARTIAL_RESULTS = 1800     # 30 minutos - resultados parciais grandes
    TTL_STATISTICS = 1800          # 30 minutos - estatísticas de análise
    
    # === PREFIXOS DE CHAVE ===
    PREFIX_IP_SEARCH = "ip_search"
    PREFIX_IP_DETAILS = "ip_details"
    PREFIX_STORE_LIST = "store_list"
    PREFIX_STORE_CONFIG = "store_config"
    PREFIX_ORDER_COUNT = "order_count"
    PREFIX_SHOPIFY_AUTH = "shopify_auth"
    PREFIX_PARTIAL_RESULTS = "partial_results"
    PREFIX_STATISTICS = "statistics"
    PREFIX_RATE_LIMIT = "rate_limit"
    
    def __init__(self):
        self.redis_client = None
        self.redis_available = False
        self._init_redis()
        
        # Estatísticas de cache
        self.stats = {
            'hits': 0,
            'misses': 0,
            'errors': 0,
            'last_reset': timezone.now()
        }
    
    def _init_redis(self):
        """Inicializa conexão Redis com fallback gracioso"""
        try:
            # Verificar primeiro se Redis está disponível globalmente
            redis_global_available = getattr(settings, 'REDIS_AVAILABLE', False)
            if not redis_global_available:
                logger.info("Redis marcado como não disponível globalmente, usando fallback")
                self.redis_available = False
                self.redis_client = None
                return
            
            redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            
            # Testa conexão
            self.redis_client.ping()
            self.redis_available = True
            logger.info(f"Redis cache inicializado com sucesso: {redis_url}")
            
        except Exception as e:
            logger.warning(f"Redis não disponível, usando fallback: {str(e)}")
            self.redis_available = False
            self.redis_client = None
    
    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        """
        Gera chave de cache consistente baseada nos parâmetros
        
        Args:
            prefix: Prefixo da chave
            **kwargs: Parâmetros para hash
            
        Returns:
            str: Chave de cache única
        """
        # Cria string determinística dos parâmetros
        param_string = json.dumps(kwargs, sort_keys=True, default=str)
        param_hash = hashlib.md5(param_string.encode()).hexdigest()[:12]
        
        return f"chegou_hub:{prefix}:{param_hash}"
    
    def _serialize_data(self, data: Any) -> str:
        """Serializa dados para cache"""
        try:
            return json.dumps(data, default=str, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Erro ao serializar dados para cache: {str(e)}")
            return json.dumps({'error': 'serialization_failed'})
    
    def _deserialize_data(self, data_str: str) -> Any:
        """Deserializa dados do cache"""
        try:
            return json.loads(data_str)
        except Exception as e:
            logger.error(f"Erro ao deserializar dados do cache: {str(e)}")
            return None
    
    def get(self, prefix: str, ttl: int = None, **kwargs) -> Optional[Any]:
        """
        Recupera dados do cache
        
        Args:
            prefix: Prefixo da chave
            ttl: TTL para verificação de expiração
            **kwargs: Parâmetros para gerar chave
            
        Returns:
            Dados do cache ou None se não encontrado
        """
        if not self.redis_available:
            return None
        
        try:
            cache_key = self._generate_cache_key(prefix, **kwargs)
            cached_data = self.redis_client.get(cache_key)
            
            if cached_data:
                self.stats['hits'] += 1
                data = self._deserialize_data(cached_data)
                
                # Verifica timestamp se fornecido TTL
                if ttl and isinstance(data, dict) and 'timestamp' in data:
                    cache_time = datetime.fromisoformat(data['timestamp'])
                    if datetime.now() - cache_time > timedelta(seconds=ttl):
                        logger.debug(f"Cache expirado para chave: {cache_key}")
                        self.delete(prefix, **kwargs)
                        return None
                
                logger.debug(f"Cache HIT para chave: {cache_key}")
                return data
            else:
                self.stats['misses'] += 1
                logger.debug(f"Cache MISS para chave: {cache_key}")
                return None
                
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f"Erro ao recuperar do cache: {str(e)}")
            return None
    
    def set(self, prefix: str, data: Any, ttl: int, **kwargs) -> bool:
        """
        Armazena dados no cache
        
        Args:
            prefix: Prefixo da chave
            data: Dados para armazenar
            ttl: Tempo de vida em segundos
            **kwargs: Parâmetros para gerar chave
            
        Returns:
            bool: True se sucesso, False se erro
        """
        if not self.redis_available:
            return False
        
        try:
            cache_key = self._generate_cache_key(prefix, **kwargs)
            
            # Adiciona timestamp aos dados
            if isinstance(data, dict):
                data['timestamp'] = datetime.now().isoformat()
                data['ttl'] = ttl
            
            serialized_data = self._serialize_data(data)
            success = self.redis_client.setex(cache_key, ttl, serialized_data)
            
            if success:
                logger.debug(f"Cache SET para chave: {cache_key} (TTL: {ttl}s)")
            
            return bool(success)
            
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f"Erro ao armazenar no cache: {str(e)}")
            return False
    
    def delete(self, prefix: str, **kwargs) -> bool:
        """
        Remove dados do cache
        
        Args:
            prefix: Prefixo da chave
            **kwargs: Parâmetros para gerar chave
            
        Returns:
            bool: True se removido com sucesso
        """
        if not self.redis_available:
            return False
        
        try:
            cache_key = self._generate_cache_key(prefix, **kwargs)
            deleted = self.redis_client.delete(cache_key)
            
            if deleted:
                logger.debug(f"Cache DELETE para chave: {cache_key}")
            
            return bool(deleted)
            
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f"Erro ao deletar do cache: {str(e)}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """
        Remove múltiplas chaves baseado em padrão
        
        Args:
            pattern: Padrão para matching (ex: "chegou_hub:ip_search:*")
            
        Returns:
            int: Número de chaves removidas
        """
        if not self.redis_available:
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                deleted = self.redis_client.delete(*keys)
                logger.info(f"Cache DELETE pattern '{pattern}': {deleted} chaves removidas")
                return deleted
            return 0
            
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f"Erro ao deletar padrão do cache: {str(e)}")
            return 0
    
    def invalidate_store_cache(self, loja_id: int):
        """
        Invalida todo cache relacionado a uma loja específica
        
        Args:
            loja_id: ID da loja para invalidar
        """
        patterns = [
            f"chegou_hub:*:*loja_id*{loja_id}*",
            f"chegou_hub:store_config:*{loja_id}*",
            f"chegou_hub:ip_search:*{loja_id}*",
            f"chegou_hub:ip_details:*{loja_id}*"
        ]
        
        total_deleted = 0
        for pattern in patterns:
            deleted = self.delete_pattern(pattern)
            total_deleted += deleted
        
        logger.info(f"Cache invalidado para loja {loja_id}: {total_deleted} chaves removidas")
        return total_deleted
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Retorna estatísticas do cache
        
        Returns:
            dict: Estatísticas de uso do cache
        """
        total_operations = self.stats['hits'] + self.stats['misses']
        hit_ratio = (self.stats['hits'] / total_operations * 100) if total_operations > 0 else 0
        
        stats = {
            'redis_available': self.redis_available,
            'hits': self.stats['hits'],
            'misses': self.stats['misses'],
            'errors': self.stats['errors'],
            'hit_ratio_percent': round(hit_ratio, 2),
            'last_reset': self.stats['last_reset'].isoformat(),
            'total_operations': total_operations
        }
        
        # Adiciona info do Redis se disponível
        if self.redis_available:
            try:
                redis_info = self.redis_client.info('memory')
                stats['redis_memory_used'] = redis_info.get('used_memory_human', 'N/A')
                stats['redis_memory_peak'] = redis_info.get('used_memory_peak_human', 'N/A')
                stats['redis_keys'] = self.redis_client.dbsize()
            except Exception as e:
                logger.warning(f"Erro ao obter stats do Redis: {str(e)}")
        
        return stats
    
    def reset_stats(self):
        """Reset das estatísticas do cache"""
        self.stats = {
            'hits': 0,
            'misses': 0,
            'errors': 0,
            'last_reset': timezone.now()
        }
        logger.info("Estatísticas do cache resetadas")
    
    def clear_all(self) -> bool:
        """
        Limpa todo o cache do Chegou Hub
        CUIDADO: Remove todos os dados em cache!
        """
        if not self.redis_available:
            return False
        
        try:
            deleted = self.delete_pattern("chegou_hub:*")
            logger.warning(f"CACHE LIMPO COMPLETAMENTE: {deleted} chaves removidas")
            self.reset_stats()
            return True
            
        except Exception as e:
            logger.error(f"Erro ao limpar cache completamente: {str(e)}")
            return False
    
    # === MÉTODOS ESPECÍFICOS PARA IP DETECTION ===
    
    def cache_ip_search_results(self, loja_id: int, days: int, min_orders: int, results: Dict) -> bool:
        """Cache resultados de busca por IP duplicados"""
        return self.set(
            self.PREFIX_IP_SEARCH,
            results,
            self.TTL_IP_SEARCH_RESULTS,
            loja_id=loja_id,
            days=days,
            min_orders=min_orders
        )
    
    def get_ip_search_results(self, loja_id: int, days: int, min_orders: int) -> Optional[Dict]:
        """Recupera resultados de busca por IP do cache"""
        return self.get(
            self.PREFIX_IP_SEARCH,
            self.TTL_IP_SEARCH_RESULTS,
            loja_id=loja_id,
            days=days,
            min_orders=min_orders
        )
    
    def cache_ip_details(self, loja_id: int, ip: str, days: int, details: Dict) -> bool:
        """Cache detalhes específicos de um IP"""
        return self.set(
            self.PREFIX_IP_DETAILS,
            details,
            self.TTL_IP_DETAILS,
            loja_id=loja_id,
            ip=ip,
            days=days
        )
    
    def get_ip_details(self, loja_id: int, ip: str, days: int) -> Optional[Dict]:
        """Recupera detalhes de IP do cache"""
        return self.get(
            self.PREFIX_IP_DETAILS,
            self.TTL_IP_DETAILS,
            loja_id=loja_id,
            ip=ip,
            days=days
        )
    
    def cache_store_config(self, loja_id: int, config_data: Dict) -> bool:
        """Cache configuração da loja"""
        return self.set(
            self.PREFIX_STORE_CONFIG,
            config_data,
            self.TTL_STORE_CONFIG,
            loja_id=loja_id
        )
    
    def get_store_config(self, loja_id: int) -> Optional[Dict]:
        """Recupera configuração da loja do cache"""
        return self.get(
            self.PREFIX_STORE_CONFIG,
            self.TTL_STORE_CONFIG,
            loja_id=loja_id
        )
    
    def cache_shopify_auth(self, shop_url: str, auth_data: Dict) -> bool:
        """Cache dados de autenticação Shopify válidos"""
        return self.set(
            self.PREFIX_SHOPIFY_AUTH,
            auth_data,
            self.TTL_SHOPIFY_AUTH,
            shop_url=shop_url
        )
    
    def get_shopify_auth(self, shop_url: str) -> Optional[Dict]:
        """Recupera dados de auth Shopify do cache"""
        return self.get(
            self.PREFIX_SHOPIFY_AUTH,
            self.TTL_SHOPIFY_AUTH,
            shop_url=shop_url
        )

# === DECORATORS PARA CACHE AUTOMÁTICO ===

def cache_result(prefix: str, ttl: int, key_params: List[str] = None):
    """
    Decorator para cache automático de resultados de função
    
    Args:
        prefix: Prefixo da chave de cache
        ttl: Tempo de vida em segundos
        key_params: Lista de parâmetros para usar na chave (default: todos)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_manager = get_cache_manager()
            
            # Extrai parâmetros para chave
            if key_params:
                cache_kwargs = {k: kwargs.get(k) for k in key_params if k in kwargs}
            else:
                cache_kwargs = kwargs
            
            # Tenta recuperar do cache
            cached_result = cache_manager.get(prefix, ttl, **cache_kwargs)
            if cached_result is not None:
                return cached_result
            
            # Executa função e cache o resultado
            result = func(*args, **kwargs)
            cache_manager.set(prefix, result, ttl, **cache_kwargs)
            
            return result
        return wrapper
    return decorator

def cache_ip_search(ttl: int = None):
    """Decorator específico para cache de busca por IP"""
    ttl = ttl or IPDetectionCacheManager.TTL_IP_SEARCH_RESULTS
    return cache_result('ip_search', ttl, ['loja_id', 'days', 'min_orders'])

def cache_ip_details(ttl: int = None):
    """Decorator específico para cache de detalhes de IP"""
    ttl = ttl or IPDetectionCacheManager.TTL_IP_DETAILS
    return cache_result('ip_details', ttl, ['loja_id', 'ip', 'days'])

# === INSTÂNCIA GLOBAL ===

_cache_manager_instance = None

def get_cache_manager() -> IPDetectionCacheManager:
    """
    Retorna instância singleton do cache manager
    
    Returns:
        IPDetectionCacheManager: Instância do gerenciador de cache
    """
    global _cache_manager_instance
    if _cache_manager_instance is None:
        _cache_manager_instance = IPDetectionCacheManager()
    return _cache_manager_instance

# === RATE LIMITING ===

class RateLimitManager:
    """Gerenciador de rate limiting usando Redis"""
    
    def __init__(self, cache_manager: IPDetectionCacheManager):
        self.cache_manager = cache_manager
    
    def is_rate_limited(self, user_id: int, action: str, limit: int, window: int) -> bool:
        """
        Verifica se usuário atingiu rate limit
        
        Args:
            user_id: ID do usuário
            action: Ação sendo executada
            limit: Número máximo de ações
            window: Janela de tempo em segundos
            
        Returns:
            bool: True se rate limited
        """
        if not self.cache_manager.redis_available:
            return False
        
        try:
            key = f"rate_limit:{user_id}:{action}"
            current = self.cache_manager.redis_client.get(key)
            
            if current is None:
                # Primeira requisição na janela
                self.cache_manager.redis_client.setex(key, window, 1)
                return False
            
            current_count = int(current)
            if current_count >= limit:
                return True
            
            # Incrementa contador
            self.cache_manager.redis_client.incr(key)
            return False
            
        except Exception as e:
            logger.error(f"Erro no rate limiting: {str(e)}")
            return False
    
    def get_rate_limit_status(self, user_id: int, action: str) -> Dict[str, Any]:
        """
        Retorna status atual do rate limit
        
        Args:
            user_id: ID do usuário
            action: Ação sendo executada
            
        Returns:
            dict: Status do rate limit
        """
        if not self.cache_manager.redis_available:
            return {'available': True, 'count': 0, 'ttl': 0}
        
        try:
            key = f"rate_limit:{user_id}:{action}"
            count = self.cache_manager.redis_client.get(key) or 0
            ttl = self.cache_manager.redis_client.ttl(key) or 0
            
            return {
                'count': int(count),
                'ttl': ttl,
                'available': ttl > 0
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter status rate limit: {str(e)}")
            return {'available': True, 'count': 0, 'ttl': 0}

def get_rate_limit_manager() -> RateLimitManager:
    """Retorna instância do rate limit manager"""
    return RateLimitManager(get_cache_manager())