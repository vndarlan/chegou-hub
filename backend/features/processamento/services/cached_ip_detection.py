# backend/features/processamento/services/cached_ip_detection.py
"""
Serviço de Detecção de IP com Cache Redis Integrado
Wrapper inteligente para melhorar significativamente a performance
"""

import logging
import time
from typing import Dict, Any, Optional, Union
from functools import wraps

from django.http import JsonResponse
from rest_framework import status
from rest_framework.response import Response

from ..cache_manager import get_cache_manager, get_rate_limit_manager
from ..models import ShopifyConfig, IPSecurityAuditLog

logger = logging.getLogger(__name__)

class CachedIPDetectionService:
    """
    Serviço principal para detecção de IP com cache integrado
    Implementa cache inteligente, rate limiting e fallback gracioso
    """
    
    def __init__(self):
        self.cache_manager = get_cache_manager()
        self.rate_limiter = get_rate_limit_manager()
    
    def buscar_pedidos_mesmo_ip_cached(self, request) -> Response:
        """
        Versão cached da busca de pedidos por IP
        Implementa cache inteligente com fallback
        """
        start_time = time.time()
        
        try:
            # === EXTRAÇÃO E VALIDAÇÃO DE PARÂMETROS ===
            loja_id = request.data.get('loja_id')
            days = request.data.get('days', 30)
            min_orders = request.data.get('min_orders', 2)
            
            logger.info(f"🔍 buscar_pedidos_mesmo_ip_cached - User: {request.user.username}, loja_id: {loja_id}, days: {days}")
            
            # Validações básicas
            if not loja_id:
                return Response({'error': 'ID da loja é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                loja_id = int(loja_id)
                days = int(days)
                min_orders = max(int(min_orders), 2)
            except (ValueError, TypeError) as param_error:
                logger.error(f"Erro de validação de parâmetros: {str(param_error)}")
                return Response({'error': 'Parâmetros inválidos'}, status=status.HTTP_400_BAD_REQUEST)
            
            # === RATE LIMITING ===
            if self.rate_limiter.is_rate_limited(request.user.id, 'ip_search', limit=20, window=300):  # 20 req/5min
                logger.warning(f"Rate limit atingido para usuário {request.user.username}")
                return Response({
                    'error': 'Rate limit excedido',
                    'details': 'Muitas requisições de busca por IP. Tente novamente em alguns minutos.',
                    'retry_after': 300
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            # === VERIFICAÇÃO DE CACHE ===
            cached_result = self.cache_manager.get_ip_search_results(loja_id, days, min_orders)
            if cached_result:
                cache_time = time.time() - start_time
                logger.info(f"✅ Cache HIT para busca IP - loja: {loja_id}, tempo: {cache_time:.3f}s")
                
                # Adiciona metadados de cache à resposta
                cached_result['cache_info'] = {
                    'from_cache': True,
                    'cache_timestamp': cached_result.get('timestamp'),
                    'cache_ttl': cached_result.get('ttl', 0),
                    'response_time_ms': round(cache_time * 1000, 2)
                }
                
                # Log de auditoria para cache hit
                self._log_cache_access(request, 'ip_search_cache_hit', {
                    'loja_id': loja_id,
                    'days': days,
                    'min_orders': min_orders,
                    'response_time_ms': round(cache_time * 1000, 2)
                })
                
                return Response(cached_result, status=status.HTTP_200_OK)
            
            # === CACHE MISS - BUSCA REAL ===
            logger.info(f"🔄 Cache MISS para busca IP - executando busca real")
            
            # Busca configuração da loja (com cache)
            config = self._get_store_config_cached(loja_id)
            if not config:
                return Response({
                    'error': 'Loja não encontrada ou inativa',
                    'details': 'Configure uma loja Shopify válida antes de usar esta funcionalidade',
                    'action_required': 'add_shopify_store'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Validação de limite dinâmico (com cache)
            max_days_allowed = self._get_dynamic_limit_cached(config, loja_id)
            if days > max_days_allowed:
                return Response({
                    'error': f'Período máximo permitido é {max_days_allowed} dias para a loja "{config.nome_loja}"',
                    'details': f'Limite baseado no volume de pedidos e capacidade de processamento da loja',
                    'suggested_period': min(days, max_days_allowed),
                    'current_limit': max_days_allowed,
                    'requested_period': days
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Testa conexão Shopify (com cache)
            auth_status = self._test_shopify_connection_cached(config)
            if not auth_status['success']:
                return Response({
                    'error': 'Erro de autenticação com Shopify',
                    'details': auth_status['message'],
                    'action_required': 'update_shopify_credentials',
                    'loja_nome': config.nome_loja
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # === EXECUÇÃO DA BUSCA REAL ===
            try:
                from .shopify_detector import ShopifyDuplicateOrderDetector
                
                detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
                
                # Aplica otimizações baseadas no período
                if days > 30:
                    logger.info(f"🚀 Aplicando otimizações para período longo: {days} dias")
                    ip_data = self._execute_optimized_search(detector, days, min_orders)
                else:
                    ip_data = detector.get_orders_by_ip(days=days, min_orders=min_orders)
                
                search_time = time.time() - start_time
                logger.info(f"✅ Busca IP concluída - IPs encontrados: {ip_data.get('total_ips_found', 0)}, tempo: {search_time:.3f}s")
                
                # === CACHE DO RESULTADO ===
                enhanced_result = {
                    **ip_data,
                    'cache_info': {
                        'from_cache': False,
                        'cached_at': time.time(),
                        'search_time_ms': round(search_time * 1000, 2)
                    },
                    'meta': {
                        'loja_nome': config.nome_loja,
                        'user': request.user.username,
                        'timestamp': time.time()
                    }
                }
                
                # Cache o resultado
                cache_success = self.cache_manager.cache_ip_search_results(loja_id, days, min_orders, enhanced_result)
                if cache_success:
                    logger.info(f"💾 Resultado cached com sucesso")
                
                # Log de auditoria
                self._log_cache_access(request, 'ip_search_fresh', {
                    'loja_id': loja_id,
                    'days': days,
                    'min_orders': min_orders,
                    'ips_found': ip_data.get('total_ips_found', 0),
                    'search_time_ms': round(search_time * 1000, 2),
                    'cached': cache_success
                })
                
                return Response(enhanced_result, status=status.HTTP_200_OK)
                
            except Exception as search_error:
                logger.error(f"❌ Erro na busca IP: {str(search_error)}", exc_info=True)
                return Response({
                    'error': 'Erro interno na busca por IP',
                    'details': 'Houve um problema ao executar a busca. Tente novamente.',
                    'debug_info': str(search_error) if logger.isEnabledFor(logging.DEBUG) else None
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except Exception as e:
            logger.error(f"❌ Erro geral em buscar_pedidos_mesmo_ip_cached: {str(e)}", exc_info=True)
            return Response({
                'error': 'Erro interno do sistema',
                'details': 'Houve um erro inesperado. Nosso time foi notificado.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def detalhar_pedidos_ip_cached(self, request) -> Response:
        """
        Versão cached do detalhamento de IP específico
        Implementa cache agressivo para detalhes de IP
        """
        start_time = time.time()
        
        try:
            # === EXTRAÇÃO E VALIDAÇÃO DE PARÂMETROS ===
            loja_id = request.data.get('loja_id')
            ip = request.data.get('ip')
            days = request.data.get('days', 30)
            
            logger.info(f"🔍 detalhar_pedidos_ip_cached - User: {request.user.username}, loja_id: {loja_id}, ip: {ip}")
            
            if not loja_id or not ip:
                return Response({'error': 'ID da loja e IP são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                loja_id = int(loja_id)
                days = min(int(days), 30)  # Máximo 30 dias para detalhes
            except (ValueError, TypeError) as param_error:
                logger.error(f"Erro de validação de parâmetros: {str(param_error)}")
                return Response({'error': 'Parâmetros inválidos'}, status=status.HTTP_400_BAD_REQUEST)
            
            # === RATE LIMITING MAIS RESTRITIVO PARA DETALHES ===
            if self.rate_limiter.is_rate_limited(request.user.id, 'ip_details', limit=30, window=300):  # 30 req/5min
                logger.warning(f"Rate limit atingido para detalhes IP - usuário {request.user.username}")
                return Response({
                    'error': 'Rate limit excedido para detalhamento',
                    'details': 'Muitas requisições de detalhamento. Tente novamente em alguns minutos.',
                    'retry_after': 300
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            # === VERIFICAÇÃO DE CACHE ===
            cached_details = self.cache_manager.get_ip_details(loja_id, ip, days)
            if cached_details:
                cache_time = time.time() - start_time
                logger.info(f"✅ Cache HIT para detalhes IP - ip: {ip}, tempo: {cache_time:.3f}s")
                
                cached_details['cache_info'] = {
                    'from_cache': True,
                    'cache_timestamp': cached_details.get('timestamp'),
                    'response_time_ms': round(cache_time * 1000, 2)
                }
                
                # Log de auditoria para cache hit
                self._log_cache_access(request, 'ip_details_cache_hit', {
                    'loja_id': loja_id,
                    'ip': ip,
                    'days': days,
                    'response_time_ms': round(cache_time * 1000, 2)
                })
                
                return Response(cached_details, status=status.HTTP_200_OK)
            
            # === CACHE MISS - BUSCA REAL ===
            logger.info(f"🔄 Cache MISS para detalhes IP - executando busca real")
            
            # Busca configuração da loja (com cache)
            config = self._get_store_config_cached(loja_id)
            if not config:
                return Response({
                    'error': 'Loja não encontrada ou inativa',
                    'details': 'Configure uma loja Shopify válida antes de usar esta funcionalidade',
                    'action_required': 'add_shopify_store'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Testa conexão Shopify (com cache)
            auth_status = self._test_shopify_connection_cached(config)
            if not auth_status['success']:
                return Response({
                    'error': 'Erro de autenticação com Shopify',
                    'details': auth_status['message'],
                    'action_required': 'update_shopify_credentials',
                    'loja_nome': config.nome_loja
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # === EXECUÇÃO DA BUSCA REAL ===
            try:
                from .shopify_detector import ShopifyDuplicateOrderDetector
                
                detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
                
                # Busca todos os pedidos por IP (usa cache da busca geral se disponível)
                ip_data = detector.get_orders_by_ip(days=days, min_orders=1)
                
                # Filtra apenas o IP específico
                target_ip_data = None
                ip_groups = ip_data.get('ip_groups', [])
                
                for ip_group in ip_groups:
                    if ip_group.get('ip') == ip:
                        target_ip_data = ip_group
                        break
                
                if not target_ip_data:
                    empty_result = {
                        'success': True,
                        'data': {
                            'ip': ip,
                            'total_orders': 0,
                            'client_details': [],
                            'active_orders': 0,
                            'cancelled_orders': 0
                        },
                        'loja_nome': config.nome_loja,
                        'message': f'Nenhum pedido encontrado para o IP {ip} nos últimos {days} dias'
                    }
                    
                    # Cache resultado vazio também
                    self.cache_manager.cache_ip_details(loja_id, ip, days, empty_result)
                    return Response(empty_result, status=status.HTTP_200_OK)
                
                # Processa detalhes do IP
                details_result = self._process_ip_details(target_ip_data, config, ip, days)
                
                search_time = time.time() - start_time
                logger.info(f"✅ Detalhamento IP concluído - IP: {ip}, pedidos: {details_result['data']['total_orders']}, tempo: {search_time:.3f}s")
                
                # Adiciona metadados
                details_result['cache_info'] = {
                    'from_cache': False,
                    'cached_at': time.time(),
                    'search_time_ms': round(search_time * 1000, 2)
                }
                
                # Cache o resultado
                cache_success = self.cache_manager.cache_ip_details(loja_id, ip, days, details_result)
                if cache_success:
                    logger.info(f"💾 Detalhes de IP cached com sucesso")
                
                # Log de auditoria
                self._log_cache_access(request, 'ip_details_fresh', {
                    'loja_id': loja_id,
                    'ip': ip,
                    'days': days,
                    'orders_found': details_result['data']['total_orders'],
                    'search_time_ms': round(search_time * 1000, 2),
                    'cached': cache_success
                })
                
                return Response(details_result, status=status.HTTP_200_OK)
                
            except Exception as search_error:
                logger.error(f"❌ Erro no detalhamento IP: {str(search_error)}", exc_info=True)
                return Response({
                    'error': 'Erro interno no detalhamento',
                    'details': 'Houve um problema ao buscar detalhes do IP. Tente novamente.',
                    'debug_info': str(search_error) if logger.isEnabledFor(logging.DEBUG) else None
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except Exception as e:
            logger.error(f"❌ Erro geral em detalhar_pedidos_ip_cached: {str(e)}", exc_info=True)
            return Response({
                'error': 'Erro interno do sistema',
                'details': 'Houve um erro inesperado. Nosso time foi notificado.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # === MÉTODOS AUXILIARES COM CACHE ===
    
    def _get_store_config_cached(self, loja_id: int) -> Optional[ShopifyConfig]:
        """Busca configuração da loja com cache"""
        cached_config = self.cache_manager.get_store_config(loja_id)
        if cached_config:
            # Reconstrói objeto ShopifyConfig a partir do cache
            try:
                config = ShopifyConfig(**cached_config)
                return config
            except Exception as e:
                logger.warning(f"Erro ao reconstruir config do cache: {str(e)}")
        
        # Cache miss - busca no banco
        try:
            config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
            if config:
                # Cache o resultado
                config_data = {
                    'id': config.id,
                    'nome_loja': config.nome_loja,
                    'shop_url': config.shop_url,
                    'access_token': config.access_token,
                    'api_version': config.api_version,
                    'ativo': config.ativo
                }
                self.cache_manager.cache_store_config(loja_id, config_data)
            return config
        except Exception as e:
            logger.error(f"Erro ao buscar config da loja: {str(e)}")
            return None
    
    def _get_dynamic_limit_cached(self, config: ShopifyConfig, loja_id: int) -> int:
        """Calcula limite dinâmico com cache"""
        cache_key = f"dynamic_limit_{loja_id}"
        cached_limit = self.cache_manager.get(
            self.cache_manager.PREFIX_ORDER_COUNT,
            self.cache_manager.TTL_ORDER_COUNT,
            key=cache_key
        )
        
        if cached_limit:
            return cached_limit.get('limit', 30)
        
        # Cache miss - calcula limite
        try:
            from .views import _calculate_dynamic_limit_for_store
            limit = _calculate_dynamic_limit_for_store(config)
            
            # Cache o resultado
            self.cache_manager.set(
                self.cache_manager.PREFIX_ORDER_COUNT,
                {'limit': limit},
                self.cache_manager.TTL_ORDER_COUNT,
                key=cache_key
            )
            
            return limit
        except Exception as e:
            logger.error(f"Erro ao calcular limite dinâmico: {str(e)}")
            return 30  # Fallback seguro
    
    def _test_shopify_connection_cached(self, config: ShopifyConfig) -> Dict[str, Any]:
        """Testa conexão Shopify com cache"""
        cached_auth = self.cache_manager.get_shopify_auth(config.shop_url)
        if cached_auth and cached_auth.get('valid', False):
            return {'success': True, 'message': 'Conexão válida (cached)'}
        
        # Cache miss - testa conexão
        try:
            from .shopify_detector import ShopifyDuplicateOrderDetector
            detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
            connection_ok, test_message = detector.test_connection()
            
            # Cache resultado válido
            if connection_ok:
                auth_data = {
                    'valid': True,
                    'shop_url': config.shop_url,
                    'last_test': time.time()
                }
                self.cache_manager.cache_shopify_auth(config.shop_url, auth_data)
            
            return {'success': connection_ok, 'message': test_message}
            
        except Exception as e:
            logger.error(f"Erro ao testar conexão Shopify: {str(e)}")
            return {'success': False, 'message': f'Erro de conectividade: {str(e)}'}
    
    def _execute_optimized_search(self, detector, days: int, min_orders: int) -> Dict[str, Any]:
        """Executa busca otimizada para períodos longos"""
        try:
            # Para períodos muito longos, implementa busca em batches
            if days > 90:
                logger.info(f"🔄 Executando busca em batches para {days} dias")
                return self._batch_search(detector, days, min_orders)
            else:
                return detector.get_orders_by_ip(days=days, min_orders=min_orders)
        except Exception as e:
            logger.error(f"Erro na busca otimizada: {str(e)}")
            # Fallback para busca normal
            return detector.get_orders_by_ip(days=days, min_orders=min_orders)
    
    def _batch_search(self, detector, days: int, min_orders: int) -> Dict[str, Any]:
        """Implementa busca em batches para períodos muito longos"""
        # Divide período em chunks de 30 dias
        chunk_size = 30
        chunks = []
        
        for i in range(0, days, chunk_size):
            chunk_days = min(chunk_size, days - i)
            chunks.append(chunk_days)
        
        all_ip_groups = []
        total_processed = 0
        
        for i, chunk_days in enumerate(chunks):
            try:
                logger.info(f"🔄 Processando chunk {i+1}/{len(chunks)} - {chunk_days} dias")
                chunk_result = detector.get_orders_by_ip(days=chunk_days, min_orders=1)
                
                if chunk_result.get('ip_groups'):
                    all_ip_groups.extend(chunk_result['ip_groups'])
                    total_processed += chunk_result.get('orders_processed', 0)
                
            except Exception as chunk_error:
                logger.error(f"Erro no chunk {i+1}: {str(chunk_error)}")
                continue
        
        # Consolida resultados
        consolidated = self._consolidate_ip_groups(all_ip_groups, min_orders)
        
        return {
            'ip_groups': consolidated,
            'total_ips_found': len(consolidated),
            'orders_processed': total_processed,
            'search_method': 'batch_optimized',
            'chunks_processed': len(chunks)
        }
    
    def _consolidate_ip_groups(self, ip_groups: list, min_orders: int) -> list:
        """Consolida grupos de IP de múltiplos chunks"""
        ip_map = {}
        
        for group in ip_groups:
            ip = group.get('ip')
            if not ip:
                continue
            
            if ip in ip_map:
                # Merge com grupo existente
                existing = ip_map[ip]
                existing['orders'].extend(group.get('orders', []))
                existing['order_count'] += group.get('order_count', 0)
            else:
                ip_map[ip] = group
        
        # Filtra por min_orders e ordena
        filtered_groups = [
            group for group in ip_map.values()
            if group.get('order_count', 0) >= min_orders
        ]
        
        return sorted(filtered_groups, key=lambda x: x.get('order_count', 0), reverse=True)
    
    def _process_ip_details(self, target_ip_data: Dict, config: ShopifyConfig, ip: str, days: int) -> Dict[str, Any]:
        """Processa detalhes específicos do IP"""
        client_details = []
        active_orders = 0
        cancelled_orders = 0
        
        orders_in_group = target_ip_data.get('orders', [])
        
        for order in orders_in_group:
            order_status = order.get('financial_status', 'unknown')
            if order_status in ['paid', 'partially_paid', 'pending']:
                active_orders += 1
            elif order_status in ['refunded', 'voided']:
                cancelled_orders += 1
            
            # Processa detalhes do cliente
            customer = order.get('customer', {})
            if customer:
                client_detail = {
                    'order_id': order.get('id'),
                    'order_name': order.get('name', ''),
                    'customer_id': customer.get('id'),
                    'customer_email': customer.get('email', ''),
                    'customer_name': f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip(),
                    'order_date': order.get('created_at', ''),
                    'total_price': order.get('total_price', '0.00'),
                    'financial_status': order_status,
                    'order_status': order.get('fulfillment_status', 'unfulfilled')
                }
                client_details.append(client_detail)
        
        return {
            'success': True,
            'data': {
                'ip': ip,
                'total_orders': len(orders_in_group),
                'client_details': client_details,
                'active_orders': active_orders,
                'cancelled_orders': cancelled_orders
            },
            'loja_nome': config.nome_loja,
            'search_period_days': days
        }
    
    def _log_cache_access(self, request, action: str, details: Dict[str, Any]):
        """Log de auditoria para acessos com cache"""
        try:
            user_ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            IPSecurityAuditLog.objects.create(
                user=request.user,
                action=action,
                user_ip=user_ip,
                user_agent=user_agent,
                details=details,
                risk_level='low'
            )
        except Exception as e:
            logger.warning(f"Erro ao criar log de auditoria: {str(e)}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas do cache para debug"""
        return self.cache_manager.get_stats()
    
    def invalidate_store_cache(self, loja_id: int) -> int:
        """Invalida cache de uma loja específica"""
        return self.cache_manager.invalidate_store_cache(loja_id)

# === INSTÂNCIA SINGLETON ===

_cached_service_instance = None

def get_cached_ip_service() -> CachedIPDetectionService:
    """Retorna instância singleton do serviço cached"""
    global _cached_service_instance
    if _cached_service_instance is None:
        _cached_service_instance = CachedIPDetectionService()
    return _cached_service_instance