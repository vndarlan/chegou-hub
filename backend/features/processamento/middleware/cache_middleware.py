# backend/features/processamento/middleware/cache_middleware.py
"""
Middleware para cache inteligente em respostas HTTP
Adiciona headers de cache e otimizações automáticas
"""

import time
import logging
from typing import Callable, Optional

from django.http import HttpRequest, HttpResponse
from django.utils.cache import add_never_cache_headers, patch_cache_control
from django.core.cache import cache

from ..cache_manager import get_cache_manager

logger = logging.getLogger(__name__)

class IPDetectionCacheMiddleware:
    """
    Middleware para otimização de cache em endpoints de detecção de IP
    Adiciona headers apropriados e monitora performance
    """
    
    # Atributo obrigatório para compatibilidade com Django
    async_mode = False
    
    def __init__(self, get_response: Callable):
        self.get_response = get_response
        self.cache_manager = get_cache_manager()
        
        # Endpoints que devem ter cache agressivo
        self.cacheable_endpoints = {
            '/api/processamento/buscar-ips-duplicados-cached/': 600,  # 10 min
            '/api/processamento/detalhar-ip-cached/': 300,           # 5 min
            '/api/processamento/cache/stats/': 60,                   # 1 min
            '/api/processamento/cache/health-check/': 30,            # 30 seg
        }
        
        # Endpoints que nunca devem ser cached
        self.no_cache_endpoints = {
            '/api/processamento/cache/clear-all/',
            '/api/processamento/cache/invalidate-store/',
            '/api/processamento/cache/warmup-store/',
        }
    
    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Marca início do processamento
        start_time = time.time()
        request._cache_start_time = start_time
        
        # Adiciona informações de cache ao request
        self._add_cache_info_to_request(request)
        
        # Processa a requisição
        response = self.get_response(request)
        
        # Adiciona headers de cache na resposta
        self._add_cache_headers(request, response)
        
        # Adiciona headers de performance
        self._add_performance_headers(request, response, start_time)
        
        # Log de performance se necessário
        self._log_performance(request, response, start_time)
        
        return response
    
    def _add_cache_info_to_request(self, request: HttpRequest):
        """Adiciona informações de cache ao request"""
        request.cache_stats = self.cache_manager.get_stats()
        request.redis_available = self.cache_manager.redis_available
    
    def _add_cache_headers(self, request: HttpRequest, response: HttpResponse):
        """Adiciona headers de cache apropriados"""
        path = request.path
        
        # Endpoints que nunca devem ser cached
        if path in self.no_cache_endpoints:
            add_never_cache_headers(response)
            response['X-Cache-Policy'] = 'no-cache'
            return
        
        # Endpoints com cache agressivo
        if path in self.cacheable_endpoints:
            max_age = self.cacheable_endpoints[path]
            patch_cache_control(response, max_age=max_age, public=True)
            response['X-Cache-Policy'] = f'cacheable-{max_age}s'
            return
        
        # Para outros endpoints de processamento, cache moderado
        if '/api/processamento/' in path:
            patch_cache_control(response, max_age=60, private=True)
            response['X-Cache-Policy'] = 'moderate-cache'
        
        # Adiciona info se resposta veio do cache
        if hasattr(response, 'cache_info'):
            response['X-Cache-Hit'] = 'true' if response.cache_info.get('from_cache') else 'false'
    
    def _add_performance_headers(self, request: HttpRequest, response: HttpResponse, start_time: float):
        """Adiciona headers de performance"""
        total_time = time.time() - start_time
        
        # Header de tempo de resposta
        response['X-Response-Time'] = f'{total_time:.3f}s'
        response['X-Response-Time-Ms'] = f'{int(total_time * 1000)}'
        
        # Headers de status do cache
        response['X-Redis-Available'] = 'true' if self.cache_manager.redis_available else 'false'
        
        if self.cache_manager.redis_available:
            stats = request.cache_stats
            response['X-Cache-Hit-Ratio'] = f"{stats['hit_ratio_percent']:.1f}%"
            response['X-Cache-Total-Ops'] = str(stats['total_operations'])
        
        # Header de warning se resposta muito lenta
        if total_time > 5.0:
            response['X-Performance-Warning'] = 'slow-response'
        elif total_time > 2.0:
            response['X-Performance-Warning'] = 'moderate-delay'
    
    def _log_performance(self, request: HttpRequest, response: HttpResponse, start_time: float):
        """Log de performance para requisições lentas"""
        total_time = time.time() - start_time
        
        # Log apenas para requisições que demoram mais que 1 segundo
        if total_time > 1.0:
            cache_hit = response.get('X-Cache-Hit') == 'true'
            
            logger.warning(
                f"🐌 Requisição lenta detectada: {request.path} | "
                f"Tempo: {total_time:.3f}s | "
                f"Cache Hit: {cache_hit} | "
                f"User: {getattr(request.user, 'username', 'anonymous')} | "
                f"Method: {request.method}"
            )
            
            # Para requisições muito lentas, adiciona detalhes extras
            if total_time > 5.0:
                logger.error(
                    f"🚨 Requisição MUITO lenta: {request.path} | "
                    f"Tempo: {total_time:.3f}s | "
                    f"Redis: {self.cache_manager.redis_available} | "
                    f"User-Agent: {request.META.get('HTTP_USER_AGENT', 'unknown')[:100]}"
                )

class CacheMetricsMiddleware:
    """
    Middleware leve para coleta de métricas de cache
    Armazena estatísticas agregadas de uso
    """
    
    def __init__(self, get_response: Callable):
        self.get_response = get_response
        self.cache_manager = get_cache_manager()
    
    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Processa requisição
        response = self.get_response(request)
        
        # Coleta métricas se for endpoint de processamento
        if '/api/processamento/' in request.path and self.cache_manager.redis_available:
            self._collect_metrics(request, response)
        
        return response
    
    def _collect_metrics(self, request: HttpRequest, response: HttpResponse):
        """Coleta métricas básicas de uso"""
        try:
            cache_hit = response.get('X-Cache-Hit') == 'true'
            endpoint = self._normalize_endpoint(request.path)
            
            # Incrementa contadores Redis
            date_key = time.strftime('%Y-%m-%d')
            hour_key = time.strftime('%Y-%m-%d-%H')
            
            metrics_key = f"metrics:{date_key}:{endpoint}"
            hourly_key = f"metrics_hourly:{hour_key}:{endpoint}"
            
            # Incrementa contadores com TTL de 7 dias
            if self.cache_manager.redis_client:
                pipe = self.cache_manager.redis_client.pipeline()
                
                # Métricas diárias
                pipe.hincrby(metrics_key, 'total_requests', 1)
                if cache_hit:
                    pipe.hincrby(metrics_key, 'cache_hits', 1)
                else:
                    pipe.hincrby(metrics_key, 'cache_misses', 1)
                pipe.expire(metrics_key, 7 * 24 * 3600)  # 7 dias
                
                # Métricas horárias
                pipe.hincrby(hourly_key, 'total_requests', 1)
                if cache_hit:
                    pipe.hincrby(hourly_key, 'cache_hits', 1)
                else:
                    pipe.hincrby(hourly_key, 'cache_misses', 1)
                pipe.expire(hourly_key, 24 * 3600)  # 24 horas
                
                pipe.execute()
                
        except Exception as e:
            # Não falha a requisição por erro de métricas
            logger.warning(f"Erro ao coletar métricas de cache: {str(e)}")
    
    def _normalize_endpoint(self, path: str) -> str:
        """Normaliza endpoint para métricas"""
        if 'buscar-ips-duplicados' in path:
            return 'ip_search'
        elif 'detalhar-ip' in path:
            return 'ip_details'
        elif 'cache/stats' in path:
            return 'cache_stats'
        elif 'cache/health' in path:
            return 'cache_health'
        else:
            return 'other'