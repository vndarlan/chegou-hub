# backend/features/processamento/views_cached.py
"""
Views otimizadas com Cache Redis para Detecção de IP
Substituem as views originais com performance significativamente melhor
"""

import logging
import time
from typing import Dict, Any

from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .services.cached_ip_detection import get_cached_ip_service
from .cache_manager import get_cache_manager, get_rate_limit_manager

logger = logging.getLogger(__name__)

# === VIEWS PRINCIPAIS COM CACHE ===

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buscar_ips_duplicados_cached(request):
    """
    🚀 VERSÃO OTIMIZADA COM CACHE REDIS
    
    Busca pedidos agrupados pelo mesmo IP com cache inteligente
    Performance significativamente melhorada para consultas repetidas
    
    Cache TTL: 10 minutos para resultados de busca
    Rate Limit: 20 requisições por 5 minutos por usuário
    """
    try:
        cached_service = get_cached_ip_service()
        return cached_service.buscar_pedidos_mesmo_ip_cached(request)
    
    except Exception as e:
        logger.error(f"❌ Erro crítico em buscar_ips_duplicados_cached: {str(e)}", exc_info=True)
        return Response({
            'error': 'Erro interno do sistema',
            'details': 'Houve um erro inesperado. Nosso time foi notificado.',
            'request_id': str(time.time())
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def detalhar_ip_cached(request):
    """
    🚀 VERSÃO OTIMIZADA COM CACHE REDIS
    
    Retorna dados detalhados de um IP específico com cache agressivo
    Performance otimizada para consultas frequentes de mesmo IP
    
    Cache TTL: 5 minutos para detalhes de IP
    Rate Limit: 30 requisições por 5 minutos por usuário
    """
    try:
        cached_service = get_cached_ip_service()
        return cached_service.detalhar_pedidos_ip_cached(request)
    
    except Exception as e:
        logger.error(f"❌ Erro crítico em detalhar_ip_cached: {str(e)}", exc_info=True)
        return Response({
            'error': 'Erro interno do sistema',
            'details': 'Houve um erro inesperado. Nosso time foi notificado.',
            'request_id': str(time.time())
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# === VIEWS DE GESTÃO DE CACHE ===

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cache_stats(request):
    """
    📊 Estatísticas detalhadas do cache Redis
    
    Mostra performance, hit ratio, e estatísticas de uso
    Útil para monitoramento e debugging
    """
    try:
        cache_manager = get_cache_manager()
        rate_limiter = get_rate_limit_manager()
        
        # Estatísticas do cache
        cache_stats = cache_manager.get_stats()
        
        # Estatísticas de rate limiting do usuário
        user_rate_stats = {
            'ip_search': rate_limiter.get_rate_limit_status(request.user.id, 'ip_search'),
            'ip_details': rate_limiter.get_rate_limit_status(request.user.id, 'ip_details')
        }
        
        return Response({
            'success': True,
            'cache_stats': cache_stats,
            'user_rate_limits': user_rate_stats,
            'timestamp': time.time()
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Erro ao obter estatísticas do cache: {str(e)}")
        return Response({
            'error': 'Erro ao obter estatísticas',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invalidate_cache_by_store(request):
    """
    🗑️ Invalida cache específico de uma loja
    
    Remove todos os dados em cache relacionados a uma loja específica
    Útil após mudanças nas configurações da loja
    """
    try:
        loja_id = request.data.get('loja_id')
        if not loja_id:
            return Response({
                'error': 'ID da loja é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        loja_id = int(loja_id)
        
        cached_service = get_cached_ip_service()
        deleted_keys = cached_service.invalidate_store_cache(loja_id)
        
        logger.info(f"Cache invalidado para loja {loja_id} pelo usuário {request.user.username} - {deleted_keys} chaves removidas")
        
        return Response({
            'success': True,
            'message': f'Cache invalidado para loja {loja_id}',
            'deleted_keys': deleted_keys,
            'timestamp': time.time()
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Erro ao invalidar cache: {str(e)}")
        return Response({
            'error': 'Erro ao invalidar cache',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clear_all_cache(request):
    """
    ⚠️ LIMPA TODO O CACHE - USO ADMINISTRATIVO APENAS
    
    Remove todos os dados em cache do sistema
    CUIDADO: Esta operação afeta todos os usuários
    """
    # Verificação de permissão administrativa
    if not request.user.is_staff and not request.user.is_superuser:
        return Response({
            'error': 'Permissão negada',
            'details': 'Apenas administradores podem limpar todo o cache'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        confirmation = request.data.get('confirm')
        if confirmation != 'CLEAR_ALL_CACHE':
            return Response({
                'error': 'Confirmação necessária',
                'details': 'Envie "confirm": "CLEAR_ALL_CACHE" para confirmar a operação'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        cache_manager = get_cache_manager()
        success = cache_manager.clear_all()
        
        if success:
            logger.warning(f"🧹 TODO O CACHE FOI LIMPO pelo usuário {request.user.username}")
            return Response({
                'success': True,
                'message': 'Todo o cache foi limpo com sucesso',
                'warning': 'Esta operação afetou todos os usuários do sistema',
                'timestamp': time.time()
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Falha ao limpar cache',
                'details': 'Redis pode não estar disponível'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    except Exception as e:
        logger.error(f"Erro ao limpar todo o cache: {str(e)}")
        return Response({
            'error': 'Erro ao limpar cache',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# === VIEWS DE WARM-UP DE CACHE ===

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def warmup_cache_for_store(request):
    """
    🔥 Aquece cache para uma loja específica
    
    Pré-carrega dados frequentemente acessados no cache
    Melhora performance para próximas consultas
    """
    try:
        loja_id = request.data.get('loja_id')
        if not loja_id:
            return Response({
                'error': 'ID da loja é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        loja_id = int(loja_id)
        
        # Parâmetros padrão para warm-up
        warmup_configs = [
            {'days': 7, 'min_orders': 2},   # Última semana
            {'days': 30, 'min_orders': 2},  # Último mês
            {'days': 30, 'min_orders': 3},  # Último mês (mais restritivo)
        ]
        
        cached_service = get_cached_ip_service()
        warmed_up = []
        
        for config in warmup_configs:
            try:
                # Simula requisição para carregar cache
                fake_request = type('obj', (object,), {
                    'data': {
                        'loja_id': loja_id,
                        'days': config['days'],
                        'min_orders': config['min_orders']
                    },
                    'user': request.user,
                    'META': request.META
                })
                
                result = cached_service.buscar_pedidos_mesmo_ip_cached(fake_request)
                if result.status_code == 200:
                    warmed_up.append(f"{config['days']}d/{config['min_orders']}min")
                    
            except Exception as warmup_error:
                logger.warning(f"Erro no warm-up {config}: {str(warmup_error)}")
                continue
        
        logger.info(f"Cache warm-up realizado para loja {loja_id} - configs: {warmed_up}")
        
        return Response({
            'success': True,
            'message': f'Cache aquecido para loja {loja_id}',
            'warmed_configs': warmed_up,
            'timestamp': time.time()
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Erro no warm-up do cache: {str(e)}")
        return Response({
            'error': 'Erro no warm-up do cache',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# === VIEWS DE MONITORAMENTO ===

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cache_health_check(request):
    """
    🩺 Health check completo do sistema de cache
    
    Verifica conectividade Redis, performance básica, e status geral
    """
    try:
        cache_manager = get_cache_manager()
        start_time = time.time()
        
        # Teste básico de conectividade
        test_key = f"health_check_{request.user.id}_{int(time.time())}"
        test_data = {'test': True, 'timestamp': time.time()}
        
        # Teste de escrita
        write_success = cache_manager.set('health_check', test_data, 60, key=test_key)
        write_time = time.time() - start_time
        
        # Teste de leitura
        read_start = time.time()
        read_data = cache_manager.get('health_check', key=test_key)
        read_time = time.time() - read_start
        
        # Teste de exclusão
        delete_start = time.time()
        delete_success = cache_manager.delete('health_check', key=test_key)
        delete_time = time.time() - delete_start
        
        total_time = time.time() - start_time
        
        health_status = {
            'redis_available': cache_manager.redis_available,
            'write_test': {
                'success': write_success,
                'time_ms': round(write_time * 1000, 2)
            },
            'read_test': {
                'success': read_data is not None,
                'time_ms': round(read_time * 1000, 2),
                'data_match': read_data == test_data if read_data else False
            },
            'delete_test': {
                'success': delete_success,
                'time_ms': round(delete_time * 1000, 2)
            },
            'total_test_time_ms': round(total_time * 1000, 2),
            'cache_stats': cache_manager.get_stats(),
            'timestamp': time.time()
        }
        
        # Determina status geral
        overall_health = (
            health_status['redis_available'] and
            health_status['write_test']['success'] and
            health_status['read_test']['success'] and
            health_status['read_test']['data_match'] and
            total_time < 1.0  # Menos de 1 segundo para operações básicas
        )
        
        health_status['overall_health'] = 'healthy' if overall_health else 'degraded'
        
        return Response({
            'success': True,
            'health': health_status
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Erro no health check do cache: {str(e)}")
        return Response({
            'success': False,
            'health': {
                'overall_health': 'error',
                'error': str(e),
                'redis_available': False,
                'timestamp': time.time()
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# === VIEWS DE COMPATIBILIDADE (FALLBACK) ===

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buscar_pedidos_mesmo_ip_fallback(request):
    """
    🔄 Fallback para busca sem cache
    
    Executa busca tradicional se cache estiver indisponível
    Mantém compatibilidade com sistema anterior
    """
    try:
        cache_manager = get_cache_manager()
        
        if cache_manager.redis_available:
            # Redireciona para versão cached
            return buscar_ips_duplicados_cached(request)
        else:
            # Executa versão original sem cache
            logger.warning("Redis indisponível - executando busca sem cache")
            from .views import buscar_pedidos_mesmo_ip
            return buscar_pedidos_mesmo_ip(request)
    
    except Exception as e:
        logger.error(f"Erro no fallback de busca IP: {str(e)}")
        return Response({
            'error': 'Erro no sistema de busca',
            'details': 'Tanto cache quanto fallback falharam'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def detalhar_pedidos_ip_fallback(request):
    """
    🔄 Fallback para detalhamento sem cache
    
    Executa detalhamento tradicional se cache estiver indisponível
    Mantém compatibilidade com sistema anterior
    """
    try:
        cache_manager = get_cache_manager()
        
        if cache_manager.redis_available:
            # Redireciona para versão cached
            return detalhar_ip_cached(request)
        else:
            # Executa versão original sem cache
            logger.warning("Redis indisponível - executando detalhamento sem cache")
            from .views import detalhar_pedidos_ip
            return detalhar_pedidos_ip(request)
    
    except Exception as e:
        logger.error(f"Erro no fallback de detalhamento IP: {str(e)}")
        return Response({
            'error': 'Erro no sistema de detalhamento',
            'details': 'Tanto cache quanto fallback falharam'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)