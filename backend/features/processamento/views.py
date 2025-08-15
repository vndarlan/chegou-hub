# backend/features/processamento/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.http import JsonResponse
from django.core.cache import cache
from django.utils import timezone
import json
import logging
import requests
from datetime import datetime, timedelta
from collections import defaultdict
from requests.exceptions import ConnectionError, Timeout, HTTPError, RequestException

from .models import ShopifyConfig, ProcessamentoLog
from .services.shopify_detector import ShopifyDuplicateOrderDetector
from .services.improved_ip_detection import get_improved_ip_detector
from .services.alternative_ip_capture import AlternativeIPCaptureService
from .services.geolocation_api_service import get_geolocation_service, GeolocationConfig
from .services.enhanced_ip_detector import get_enhanced_ip_detector
from .services.structured_logging_service import get_structured_logging_service
from .utils.security_utils import (
    IPSecurityUtils, 
    RateLimitManager, 
    AuditLogger, 
    SecurityHeadersManager
)

logger = logging.getLogger(__name__)

@csrf_exempt
@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def lojas_config(request):
    """Gerencia múltiplas configurações do Shopify"""
    if request.method == 'GET':
        try:
            configs = ShopifyConfig.objects.filter(ativo=True)
            lojas_data = []
            for config in configs:
                lojas_data.append({
                    'id': config.id,
                    'nome_loja': config.nome_loja,
                    'shop_url': config.shop_url,
                    'api_version': config.api_version,
                    'data_criacao': config.data_criacao.isoformat(),
                    'criador': config.user.username
                })
            return Response({'lojas': lojas_data})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        try:
            nome_loja = request.data.get('nome_loja', '').strip()
            shop_url = request.data.get('shop_url', '').strip()
            access_token = request.data.get('access_token', '').strip()
            
            if not nome_loja or not shop_url or not access_token:
                return Response({'error': 'Nome da loja, URL e token são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Remove protocolo da URL se presente
            shop_url = shop_url.replace('https://', '').replace('http://', '')
            
            # Verifica se já existe loja com mesma URL
            if ShopifyConfig.objects.filter(shop_url=shop_url, ativo=True).exists():
                return Response({'error': 'Já existe uma loja com esta URL'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Testa conexão
            detector = ShopifyDuplicateOrderDetector(shop_url, access_token)
            connection_ok, message = detector.test_connection()
            
            if not connection_ok:
                return Response({'error': f'Falha na conexão: {message}'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Cria nova configuração
            config = ShopifyConfig.objects.create(
                user=request.user,
                nome_loja=nome_loja,
                shop_url=shop_url,
                access_token=access_token
            )
            
            return Response({
                'message': f'Loja {nome_loja} adicionada com sucesso!',
                'loja': {
                    'id': config.id,
                    'nome_loja': config.nome_loja,
                    'shop_url': config.shop_url
                }
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'DELETE':
        try:
            loja_id = request.data.get('loja_id')
            if not loja_id:
                return Response({'error': 'ID da loja é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
            
            config = ShopifyConfig.objects.filter(id=loja_id).first()
            if not config:
                return Response({'error': 'Loja não encontrada'}, status=status.HTTP_404_NOT_FOUND)
            
            nome_loja = config.nome_loja
            config.delete()
            
            return Response({'message': f'Loja {nome_loja} removida com sucesso!'})
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_connection(request):
    """Testa conexão com Shopify"""
    try:
        shop_url = request.data.get('shop_url', '').strip()
        access_token = request.data.get('access_token', '').strip()
        
        if not shop_url or not access_token:
            return Response({'error': 'URL da loja e token são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
        
        shop_url = shop_url.replace('https://', '').replace('http://', '')
        
        detector = ShopifyDuplicateOrderDetector(shop_url, access_token)
        connection_ok, message = detector.test_connection()
        
        return Response({
            'success': connection_ok,
            'message': message
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buscar_duplicatas(request):
    """Busca pedidos duplicados de uma loja específica"""
    try:
        loja_id = request.data.get('loja_id')
        if not loja_id:
            return Response({'error': 'ID da loja é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
        if not config:
            return Response({'error': 'Loja não encontrada'}, status=status.HTTP_400_BAD_REQUEST)
        
        detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
        duplicates = detector.get_detailed_duplicates()
        
        # Log da busca
        ProcessamentoLog.objects.create(
            user=request.user,
            config=config,
            tipo='busca',
            status='sucesso',
            pedidos_encontrados=len(duplicates),
            detalhes={'duplicates_count': len(duplicates)}
        )
        
        return Response({
            'duplicates': duplicates,
            'count': len(duplicates),
            'loja_nome': config.nome_loja
        })
        
    except Exception as e:
        # Log do erro
        if 'config' in locals():
            ProcessamentoLog.objects.create(
                user=request.user,
                config=config,
                tipo='busca',
                status='erro',
                erro_mensagem=str(e)
            )
        
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancelar_pedido(request):
    """Cancela um pedido específico"""
    try:
        loja_id = request.data.get('loja_id')
        order_id = request.data.get('order_id')
        order_number = request.data.get('order_number', 'N/A')
        
        if not loja_id or not order_id:
            return Response({'error': 'ID da loja e do pedido são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
        if not config:
            return Response({'error': 'Loja não encontrada'}, status=status.HTTP_400_BAD_REQUEST)
        
        detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
        success, message = detector.cancel_order(order_id)
        
        # Log da operação
        log_status = 'sucesso' if success else 'erro'
        ProcessamentoLog.objects.create(
            user=request.user,
            config=config,
            tipo='cancelamento',
            status=log_status,
            pedidos_cancelados=1 if success else 0,
            detalhes={'order_id': order_id, 'order_number': order_number},
            erro_mensagem=message if not success else ''
        )
        
        return Response({
            'success': success,
            'message': message
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancelar_lote(request):
    """Cancela múltiplos pedidos"""
    try:
        loja_id = request.data.get('loja_id')
        order_ids = request.data.get('order_ids', [])
        
        if not loja_id or not order_ids:
            return Response({'error': 'ID da loja e lista de pedidos são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
        if not config:
            return Response({'error': 'Loja não encontrada'}, status=status.HTTP_400_BAD_REQUEST)
        
        detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
        
        results = []
        success_count = 0
        
        for order_id in order_ids:
            success, message = detector.cancel_order(order_id)
            results.append({
                'order_id': order_id,
                'success': success,
                'message': message
            })
            
            if success:
                success_count += 1
        
        # Log da operação em lote
        log_status = 'sucesso' if success_count == len(order_ids) else ('parcial' if success_count > 0 else 'erro')
        ProcessamentoLog.objects.create(
            user=request.user,
            config=config,
            tipo='cancelamento_lote',
            status=log_status,
            pedidos_encontrados=len(order_ids),
            pedidos_cancelados=success_count,
            detalhes={'results': results}
        )
        
        return Response({
            'results': results,
            'success_count': success_count,
            'total_count': len(order_ids)
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@never_cache
def buscar_pedidos_mesmo_ip(request):
    """Busca pedidos agrupados pelo mesmo IP com medidas de segurança - VERSÃO CORRIGIDA"""
    try:
        # === VALIDAÇÕES DE SEGURANÇA ===
        loja_id = request.data.get('loja_id')
        days = request.data.get('days', 30)
        min_orders = request.data.get('min_orders', 2)
        
        logger.info(f"buscar_pedidos_mesmo_ip chamado - User: {request.user.username}, loja_id: {loja_id}, days: {days}")
        
        # Validação obrigatória de parâmetros
        if not loja_id:
            return Response({'error': 'ID da loja é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Sanitização e validação de inputs
        try:
            loja_id = int(loja_id)
            days = int(days)  # Remove limite artificial
            min_orders = max(int(min_orders), 2)
        except (ValueError, TypeError) as param_error:
            logger.error(f"Erro de validação de parâmetros: {str(param_error)}")
            return Response({'error': 'Parâmetros inválidos'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Implementa limite dinâmico - será calculado após obter configuração da loja
        # Validação temporária para evitar abuso
        if days > 365:
            return Response({
                'error': 'Período máximo absoluto é 365 dias',
                'details': 'Use um período menor para melhor performance'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if days < 1:
            days = 1
        
        # Busca configuração da loja
        try:
            config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
            if not config:
                logger.warning(f"Loja {loja_id} não encontrada ou inativa")
                return Response({
                    'error': 'Loja não encontrada ou inativa',
                    'details': 'Configure uma loja Shopify válida antes de usar esta funcionalidade',
                    'action_required': 'add_shopify_store'
                }, status=status.HTTP_404_NOT_FOUND)
                
            # IMPLEMENTA LIMITE DINÂMICO baseado no volume da loja
            max_days_allowed = _calculate_dynamic_limit_for_store(config)
            if days > max_days_allowed:
                logger.warning(f"Período {days} dias excede limite dinâmico {max_days_allowed} para loja {config.nome_loja}")
                return Response({
                    'error': f'Período máximo permitido é {max_days_allowed} dias para a loja "{config.nome_loja}"',
                    'details': f'Limite baseado no volume de pedidos e capacidade de processamento da loja',
                    'suggested_period': min(days, max_days_allowed),
                    'loja_volume_category': _get_store_volume_category(config),
                    'current_limit': max_days_allowed,
                    'requested_period': days
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as db_error:
            logger.error(f"Erro de banco de dados ao buscar loja {loja_id}: {str(db_error)}")
            return Response({'error': 'Erro de banco de dados'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Testa conexão com Shopify antes de prosseguir
        try:
            detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
            logger.info(f"Testando conexão Shopify para loja {config.nome_loja}")
            
            connection_ok, test_message = detector.test_connection()
            if not connection_ok:
                logger.error(f"Falha na conexão Shopify para loja {config.nome_loja}: {test_message}")
                return Response({
                    'error': 'Erro de autenticação com Shopify',
                    'details': f'A conexão com a loja "{config.nome_loja}" falhou: {test_message}',
                    'action_required': 'update_shopify_credentials',
                    'loja_nome': config.nome_loja
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            logger.info(f"Conexão Shopify OK para loja {config.nome_loja}")
            
        except Exception as connection_error:
            logger.error(f"Erro ao testar conexão Shopify: {str(connection_error)}", exc_info=True)
            return Response({
                'error': 'Erro de conectividade com Shopify',
                'details': 'Não foi possível conectar com a API do Shopify. Verifique sua conexão de internet e configurações.',
                'action_required': 'check_connectivity'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # Buscar dados de IP com tratamento de erro melhorado e otimizações de timeout
        try:
            logger.info(f"Buscando pedidos por IP - days: {days}, min_orders: {min_orders}")
            
            # APLICA OTIMIZAÇÕES PARA PREVENÇÃO DE TIMEOUT
            if days > 30:
                logger.info(f"Aplicando otimizações de timeout para período de {days} dias")
                ip_data = _apply_timeout_prevention_optimizations(detector, days, min_orders)
            else:
                # Período pequeno - usa método normal
                ip_data = detector.get_orders_by_ip(days=days, min_orders=min_orders)
            
            logger.info(f"Busca por IP concluída - IPs encontrados: {ip_data.get('total_ips_found', 0)}")
            
        except HTTPError as http_error:
            # Log seguro com informações técnicas detalhadas
            logger.error(
                f"Erro HTTP na busca por IP - User: {request.user.username}, "
                f"Status: {getattr(http_error.response, 'status_code', 'N/A')}, "
                f"Error: {str(http_error)}",
                exc_info=True
            )
            
            # Tratamento específico por código HTTP MELHORADO
            if hasattr(http_error, 'response') and hasattr(http_error.response, 'status_code'):
                status_code = http_error.response.status_code
                
                if status_code == 401:
                    return Response({
                        'error': 'Erro de autenticação com Shopify. Verifique o token de acesso da loja.',
                        'details': 'Token de acesso inválido ou expirado',
                        'error_code': 'SHOPIFY_AUTH_ERROR'
                    }, status=status.HTTP_401_UNAUTHORIZED)
                elif status_code == 403:
                    return Response({
                        'error': 'Acesso negado pela API do Shopify. Verifique as permissões do token.',
                        'details': 'Token não possui permissões necessárias para acessar pedidos',
                        'error_code': 'SHOPIFY_PERMISSION_ERROR'
                    }, status=status.HTTP_403_FORBIDDEN)
                elif status_code == 429:
                    # Rate limit específico
                    return Response({
                        'error': 'Limite de requisições do Shopify atingido',
                        'details': 'Aguarde alguns minutos antes de tentar novamente',
                        'error_code': 'SHOPIFY_RATE_LIMIT',
                        'retry_after_seconds': 60
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)
                elif status_code == 504 or status_code == 502:
                    # Gateway timeout ou bad gateway
                    return Response({
                        'error': 'Timeout na API do Shopify',
                        'details': 'A requisição demorou muito para ser processada. Tente com um período menor.',
                        'error_code': 'SHOPIFY_TIMEOUT',
                        'suggested_action': 'reduce_period'
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            return Response({
                'error': 'Erro ao buscar dados de IP no Shopify',
                'details': 'Entre em contato com o suporte técnico',
                'error_code': 'SHOPIFY_API_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except (ConnectionError, Timeout) as conn_error:
            logger.error(f"Erro de conectividade na busca por IP: {str(conn_error)}", exc_info=True)
            
            # Determina se é timeout ou erro de conexão
            if 'timeout' in str(conn_error).lower() or isinstance(conn_error, Timeout):
                return Response({
                    'error': 'Timeout na busca por IPs',
                    'details': f'A busca por {days} dias demorou muito para ser processada. Tente com um período menor.',
                    'error_code': 'REQUEST_TIMEOUT',
                    'suggested_period': min(days // 2, 30),
                    'current_period': days
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            else:
                return Response({
                    'error': 'Problema de conectividade com Shopify',
                    'details': 'Verifique sua conexão de internet e tente novamente',
                    'error_code': 'CONNECTION_ERROR'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        except RequestException as req_error:
            logger.error(f"Erro de requisição na busca por IP: {str(req_error)}", exc_info=True)
            return Response({
                'error': 'Erro ao buscar dados de IP no Shopify',
                'details': 'Entre em contato com o suporte técnico'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except Exception as search_error:
            # Log de erro genérico com informações técnicas detalhadas
            logger.error(
                f"Erro inesperado na busca por IP - User: {request.user.username}, "
                f"Type: {type(search_error).__name__}, Error: {str(search_error)}",
                exc_info=True
            )
            return Response({
                'error': 'Erro interno no processamento',
                'details': f'Erro específico: {str(search_error)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # === AUDITORIA DE SEGURANÇA ===
        try:
            audit_details = {
                'ips_found': ip_data.get('total_ips_found', 0),
                'period_days': days,
                'min_orders': min_orders,
                'total_orders': ip_data.get('total_orders_analyzed', 0)
            }
            
            # Log padrão da busca
            ProcessamentoLog.objects.create(
                user=request.user,
                config=config,
                tipo='busca_ip',
                status='sucesso',
                pedidos_encontrados=ip_data.get('total_orders_analyzed', 0),
                detalhes=audit_details
            )
            
            logger.info(f"Busca por IP concluída com sucesso - User: {request.user.username}")
            
        except Exception as audit_error:
            logger.error(f"Erro na auditoria (não crítico): {str(audit_error)}")
        
        # Prepara dados de resposta
        response = Response({
            'success': True,
            'data': ip_data,
            'loja_nome': config.nome_loja
        })
        
        return response
        
    except Exception as e:
        # === LOG DE ERRO COM STACK TRACE COMPLETO ===
        logger.error(f"ERRO CRÍTICO em buscar_pedidos_mesmo_ip - User: {request.user.username if hasattr(request, 'user') else 'Unknown'}, Error: {str(e)}", exc_info=True)
        
        # Log padrão do erro
        try:
            if 'config' in locals():
                ProcessamentoLog.objects.create(
                    user=request.user,
                    config=config,
                    tipo='busca_ip',
                    status='erro',
                    erro_mensagem=str(e)
                )
        except Exception as log_error:
            logger.error(f"Erro ao salvar log de erro: {str(log_error)}")
        
        return Response({
            'error': 'Erro interno do servidor', 
            'details': f'Erro específico: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@never_cache
def detalhar_pedidos_ip(request):
    """Retorna dados detalhados dos clientes de um IP específico usando dados reais do Shopify - VERSÃO CORRIGIDA"""
    try:
        # === VALIDAÇÕES BÁSICAS ===
        loja_id = request.data.get('loja_id')
        ip = request.data.get('ip')
        days = request.data.get('days', 30)  # Permite configurar período
        
        logger.info(f"detalhar_pedidos_ip chamado - User: {request.user.username}, loja_id: {loja_id}, ip: {ip}, days: {days}")
        
        if not loja_id or not ip:
            return Response({'error': 'ID da loja e IP são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Sanitização de parâmetros
        try:
            loja_id = int(loja_id)
            days = min(int(days), 30)  # Máximo 30 dias
        except (ValueError, TypeError) as param_error:
            logger.error(f"Erro de validação de parâmetros: {str(param_error)}")
            return Response({'error': 'Parâmetros inválidos'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Busca configuração da loja
        try:
            config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
            if not config:
                logger.warning(f"Loja {loja_id} não encontrada ou inativa")
                return Response({
                    'error': 'Loja não encontrada ou inativa',
                    'details': 'Configure uma loja Shopify válida antes de usar esta funcionalidade',
                    'action_required': 'add_shopify_store'
                }, status=status.HTTP_404_NOT_FOUND)
        except Exception as db_error:
            logger.error(f"Erro de banco de dados ao buscar loja {loja_id}: {str(db_error)}")
            return Response({'error': 'Erro de banco de dados'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Testa conexão com Shopify antes de prosseguir
        try:
            detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
            logger.info(f"Testando conexão Shopify para loja {config.nome_loja}")
            
            connection_ok, test_message = detector.test_connection()
            if not connection_ok:
                logger.error(f"Falha na conexão Shopify para loja {config.nome_loja}: {test_message}")
                return Response({
                    'error': 'Erro de autenticação com Shopify',
                    'details': f'A conexão com a loja "{config.nome_loja}" falhou: {test_message}',
                    'action_required': 'update_shopify_credentials',
                    'loja_nome': config.nome_loja
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            logger.info(f"Conexão Shopify OK para loja {config.nome_loja}")
            
        except Exception as connection_error:
            logger.error(f"Erro ao testar conexão Shopify: {str(connection_error)}", exc_info=True)
            return Response({
                'error': 'Erro de conectividade com Shopify',
                'details': 'Não foi possível conectar com a API do Shopify. Verifique sua conexão de internet e configurações.',
                'action_required': 'check_connectivity'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # === BUSCA DADOS REAIS DO SHOPIFY ===
        try:
            logger.info(f"Buscando detalhes para IP {ip} - days: {days}")
            
            # Busca todos os pedidos agrupados por IP
            ip_data = detector.get_orders_by_ip(days=days, min_orders=1)  # min_orders=1 para pegar todos
            
            # Filtra apenas o IP específico solicitado
            target_ip_data = None
            ip_groups = ip_data.get('ip_groups', [])
            logger.info(f"Total de grupos de IP encontrados: {len(ip_groups)}")
            
            for ip_group in ip_groups:
                if ip_group.get('ip') == ip:
                    target_ip_data = ip_group
                    logger.info(f"Grupo encontrado para IP {ip} com {ip_group.get('order_count', 0)} pedidos")
                    break
            
            if not target_ip_data:
                logger.info(f"Nenhum pedido encontrado para IP {ip}")
                return Response({
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
                })
            
            # Processa os dados para o formato esperado pelo frontend
            client_details = []
            active_orders = 0
            cancelled_orders = 0
            
            orders_in_group = target_ip_data.get('orders', [])
            logger.info(f"Processando {len(orders_in_group)} pedidos do grupo")
            
            for order in orders_in_group:
                try:
                    # Extrai dados do cliente
                    customer = order.get('customer', {})
                    customer_name = f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip()
                    if not customer_name:
                        customer_name = 'Cliente não informado'
                    
                    # Busca detalhes de endereço do pedido (PROTEGIDO COM TRY/CATCH)
                    shipping_city = ''
                    shipping_state = ''
                    
                    try:
                        order_details = detector.get_order_details(order['id'])
                        if order_details:
                            shipping_address = order_details.get('shipping_address', {})
                            shipping_city = shipping_address.get('city', '')
                            shipping_state = shipping_address.get('province', '')
                    except Exception as order_detail_error:
                        logger.warning(f"Erro ao buscar detalhes do pedido {order['id']}: {str(order_detail_error)}")
                        # Continua sem os detalhes de endereço
                    
                    # Determina status do pedido (CORRIGIDO)
                    is_cancelled = order.get('is_cancelled', False)
                    status = 'cancelled' if is_cancelled else 'active'
                    
                    if is_cancelled:
                        cancelled_orders += 1
                    else:
                        active_orders += 1
                    
                    # Formata data de criação
                    created_at = order.get('created_at', '')
                    cancelled_at = order.get('cancelled_at')
                    
                    client_details.append({
                        'order_id': str(order['id']),
                        'order_number': order.get('order_number', ''),
                        'created_at': created_at,
                        'cancelled_at': cancelled_at,
                        'status': status,
                        'total_price': order.get('total_price', '0.00'),
                        'currency': order.get('currency', 'BRL'),
                        'customer_name': customer_name,
                        'customer_email': customer.get('email', ''),
                        'customer_phone': customer.get('phone', ''),
                        'shipping_city': shipping_city,
                        'shipping_state': shipping_state
                    })
                    
                except Exception as order_process_error:
                    logger.error(f"Erro ao processar pedido {order.get('id', 'unknown')}: {str(order_process_error)}")
                    # Continua processando outros pedidos
                    continue
            
            logger.info(f"Processamento concluído: {len(client_details)} pedidos processados, {active_orders} ativos, {cancelled_orders} cancelados")
            
            # Monta resposta com dados reais
            response_data = {
                'success': True,
                'data': {
                    'ip': ip,
                    'total_orders': target_ip_data.get('order_count', len(client_details)),
                    'client_details': client_details,
                    'active_orders': active_orders,
                    'cancelled_orders': cancelled_orders,
                    'unique_customers': target_ip_data.get('unique_customers', 1),
                    'total_sales': target_ip_data.get('total_sales', '0.00'),
                    'currency': target_ip_data.get('currency', 'BRL'),
                    'date_range': target_ip_data.get('date_range', {}),
                    'is_suspicious': target_ip_data.get('is_suspicious', False),
                    'ip_source': target_ip_data.get('orders', [{}])[0].get('ip_source', 'unknown') if target_ip_data.get('orders') else 'unknown'
                },
                'loja_nome': config.nome_loja,
                'period_days': days
            }
            
            # Log da busca bem-sucedida
            try:
                ProcessamentoLog.objects.create(
                    user=request.user,
                    config=config,
                    tipo='detalhamento_ip',
                    status='sucesso',
                    pedidos_encontrados=len(client_details),
                    detalhes={
                        'ip_consultado': ip,
                        'period_days': days,
                        'active_orders': active_orders,
                        'cancelled_orders': cancelled_orders
                    }
                )
                logger.info(f"Detalhamento IP concluído com sucesso - User: {request.user.username}")
            except Exception as log_error:
                logger.error(f"Erro ao salvar log (não crítico): {str(log_error)}")
            
            return Response(response_data)
            
        except HTTPError as http_error:
            # Log de erro HTTP específico
            logger.error(f"Erro HTTP na busca por detalhes do IP: {str(http_error)}", exc_info=True)
            return Response({
                'error': 'Erro ao acessar dados do Shopify',
                'details': 'Verifique a configuração da loja e token de acesso'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        except (ConnectionError, Timeout) as conn_error:
            # Log de erro de conexão
            logger.error(f"Erro de conectividade na busca por detalhes do IP: {str(conn_error)}", exc_info=True)
            return Response({
                'error': 'Problema de conectividade com o Shopify',
                'details': 'Tente novamente em alguns instantes'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        except Exception as shopify_error:
            # Log de erro genérico do Shopify
            logger.error(f"Erro genérico na busca do Shopify: {str(shopify_error)}", exc_info=True)
            return Response({
                'error': 'Erro ao processar dados do Shopify',
                'details': f'Erro específico: {str(shopify_error)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        # Log de erro genérico
        logger.error(f"ERRO CRÍTICO em detalhar_pedidos_ip - User: {request.user.username if hasattr(request, 'user') else 'Unknown'}, Error: {str(e)}", exc_info=True)
        
        # Log do erro no banco
        try:
            if 'config' in locals():
                ProcessamentoLog.objects.create(
                    user=request.user,
                    config=config,
                    tipo='detalhamento_ip',
                    status='erro',
                    erro_mensagem=str(e),
                    detalhes={
                        'ip_consultado': ip if 'ip' in locals() else 'unknown',
                        'error_type': type(e).__name__
                    }
                )
        except Exception as log_error:
            logger.error(f"Erro ao salvar log de erro: {str(log_error)}")
        
        return Response({
            'error': 'Erro interno do servidor',
            'details': f'Erro específico: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
def test_simple_endpoint(request):
    """Endpoint de teste super simples para verificar se o problema são as dependências"""
    try:
        return Response({
            'success': True,
            'message': 'Endpoint simples funcionando',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return Response({'error': f'Erro: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def debug_detector_ip(request):
    """Endpoint para debugar problemas no detector de IP"""
    try:
        loja_id = request.data.get('loja_id')
        if not loja_id:
            return Response({'error': 'ID da loja é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"DEBUG: Iniciando debug do detector para loja {loja_id}")
        
        # Busca configuração
        try:
            config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
            if not config:
                return Response({'error': 'Loja não encontrada'}, status=status.HTTP_404_NOT_FOUND)
            
            logger.info(f"DEBUG: Loja encontrada - {config.nome_loja}")
        except Exception as config_error:
            logger.error(f"DEBUG: Erro ao buscar configuração: {str(config_error)}")
            return Response({'error': f'Erro de configuração: {str(config_error)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Testa detector
        try:
            detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
            logger.info(f"DEBUG: Detector criado com sucesso")
            
            # Testa conexão
            connection_ok, test_message = detector.test_connection()
            logger.info(f"DEBUG: Teste de conexão - OK: {connection_ok}, Message: {test_message}")
            
            if not connection_ok:
                return Response({
                    'error': 'Falha na conexão',
                    'details': test_message
                }, status=status.HTTP_401_UNAUTHORIZED)
            
        except Exception as detector_error:
            logger.error(f"DEBUG: Erro ao criar/testar detector: {str(detector_error)}", exc_info=True)
            return Response({'error': f'Erro no detector: {str(detector_error)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Testa busca de IPs (versão minimalista)
        try:
            logger.info(f"DEBUG: Iniciando busca por IPs (1 dia, min 1 pedido)")
            ip_data = detector.get_orders_by_ip(days=1, min_orders=1)
            logger.info(f"DEBUG: Busca concluída - Total IPs: {ip_data.get('total_ips_found', 0)}")
            
            return Response({
                'success': True,
                'message': 'Debug concluído com sucesso',
                'loja_nome': config.nome_loja,
                'connection_status': 'OK',
                'ip_search_result': {
                    'total_ips_found': ip_data.get('total_ips_found', 0),
                    'total_orders': ip_data.get('total_orders_analyzed', 0),
                    'debug_stats': ip_data.get('debug_stats', {})
                },
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as search_error:
            logger.error(f"DEBUG: Erro na busca por IPs: {str(search_error)}", exc_info=True)
            return Response({
                'error': f'Erro na busca: {str(search_error)}',
                'loja_nome': config.nome_loja,
                'connection_status': 'OK',
                'search_status': 'FAILED'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"DEBUG: Erro geral no debug: {str(e)}", exc_info=True)
        return Response({'error': f'Erro geral: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@never_cache
def test_detalhar_ip(request):
    """Endpoint de teste simplificado para diagnosticar o erro 500"""
    try:
        loja_id = request.data.get('loja_id')
        ip = request.data.get('ip')
        
        return Response({
            'success': True,
            'message': 'Endpoint de teste funcionando',
            'data': {
                'ip': ip,
                'total_orders': 2,
                'active_orders': 1,
                'cancelled_orders': 1,
                'client_details': [
                    {
                        'order_id': 'test-123',
                        'order_number': 'TEST123',
                        'created_at': '2024-08-15T10:00:00Z',
                        'cancelled_at': None,
                        'status': 'active',
                        'total_price': '49.90',
                        'currency': 'BRL',
                        'customer_name': 'Cliente Teste',
                        'customer_email': 'teste@exemplo.com',
                        'customer_phone': None,
                        'shipping_city': 'São Paulo',
                        'shipping_state': 'SP'
                    }
                ]
            }
        })
    except Exception as e:
        logger.error(f"Erro no teste detalhar IP: {str(e)}")
        return Response({'error': f'Erro: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def status_lojas_shopify(request):
    """Retorna status de conectividade de todas as lojas Shopify configuradas"""
    try:
        configs = ShopifyConfig.objects.filter(ativo=True)
        
        if not configs.exists():
            return Response({
                'success': False,
                'message': 'Nenhuma loja Shopify configurada',
                'lojas_status': [],
                'action_required': 'add_shopify_store',
                'setup_guide': {
                    'title': 'Como configurar uma loja Shopify',
                    'steps': [
                        '1. Acesse o Admin da sua loja Shopify',
                        '2. Vá em Settings > Apps and sales channels',
                        '3. Clique em "Develop apps"',
                        '4. Crie um novo app privado',
                        '5. Configure permissões: read_orders, write_orders, read_customers',
                        '6. Instale o app e copie o Access Token',
                        '7. Use POST /api/processamento/lojas-config/ para adicionar'
                    ]
                }
            })
        
        lojas_status = []
        total_funcionais = 0
        
        for config in configs:
            detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
            
            try:
                connection_ok, message = detector.test_connection()
                
                status_info = {
                    'id': config.id,
                    'nome_loja': config.nome_loja,
                    'shop_url': config.shop_url,
                    'data_criacao': config.data_criacao.isoformat(),
                    'conectado': connection_ok,
                    'message': message,
                    'status': 'funcional' if connection_ok else 'erro',
                    'token_length': len(config.access_token) if config.access_token else 0,
                    'api_version': config.api_version
                }
                
                if connection_ok:
                    total_funcionais += 1
                
                lojas_status.append(status_info)
                
            except Exception as e:
                lojas_status.append({
                    'id': config.id,
                    'nome_loja': config.nome_loja,
                    'shop_url': config.shop_url,
                    'data_criacao': config.data_criacao.isoformat(),
                    'conectado': False,
                    'message': f'Erro de conexão: {str(e)}',
                    'status': 'erro_critico',
                    'token_length': len(config.access_token) if config.access_token else 0,
                    'api_version': config.api_version
                })
        
        # Determina status geral
        if total_funcionais == 0:
            status_geral = 'todas_com_erro'
            message_geral = 'Todas as lojas apresentam problemas de conectividade'
        elif total_funcionais == len(lojas_status):
            status_geral = 'todas_funcionais'
            message_geral = 'Todas as lojas estão funcionando corretamente'
        else:
            status_geral = 'parcialmente_funcional'
            message_geral = f'{total_funcionais} de {len(lojas_status)} lojas funcionais'
        
        return Response({
            'success': True,
            'status_geral': status_geral,
            'message': message_geral,
            'total_lojas': len(lojas_status),
            'lojas_funcionais': total_funcionais,
            'lojas_com_erro': len(lojas_status) - total_funcionais,
            'lojas_status': lojas_status,
            'timestamp': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Erro ao verificar status das lojas Shopify: {str(e)}")
        return Response({
            'error': 'Erro interno ao verificar status das lojas'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def historico_logs(request):
    """Retorna histórico de operações (opcionalmente filtrado por loja)"""
    try:
        loja_id = request.GET.get('loja_id')
        
        if loja_id:
            logs = ProcessamentoLog.objects.filter(
                user=request.user, 
                config_id=loja_id
            ).order_by('-data_execucao')[:50]
        else:
            logs = ProcessamentoLog.objects.filter(user=request.user).order_by('-data_execucao')[:50]
        
        logs_data = []
        for log in logs:
            logs_data.append({
                'id': log.id,
                'loja_nome': log.config.nome_loja,
                'tipo': log.get_tipo_display(),
                'status': log.get_status_display(),
                'pedidos_encontrados': log.pedidos_encontrados,
                'pedidos_cancelados': log.pedidos_cancelados,
                'data_execucao': log.data_execucao.isoformat(),
                'erro_mensagem': log.erro_mensagem,
                'detalhes': log.detalhes
            })
        
        return Response({'logs': logs_data})
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])

# === FUNÇÕES AUXILIARES ===

def _sanitize_order_details(order_details):
    """
    Remove dados muito sensíveis dos detalhes do pedido
    
    Args:
        order_details: Detalhes completos do pedido
        
    Returns:
        dict: Detalhes sanitizados
    """
    if not order_details:
        return order_details
    
    sanitized = order_details.copy()
    
    # Remove coordenadas exatas (muito específicas para localização)
    for address_type in ['shipping_address', 'billing_address']:
        if address_type in sanitized and sanitized[address_type]:
            address = sanitized[address_type]
            # Mantém dados gerais mas remove coordenadas exatas
            address.pop('latitude', None)
            address.pop('longitude', None)
            
            # Mascara parte do CEP para reduzir precisão da localização
            if 'zip' in address and address['zip']:
                zip_code = str(address['zip'])
                if len(zip_code) >= 5:
                    address['zip'] = zip_code[:3] + 'xxx'
    
    # Remove informações muito específicas do cliente
    if 'customer_info' in sanitized:
        customer = sanitized['customer_info']
        # Remove notas privadas que podem conter informações sensíveis
        customer.pop('note', None)
        customer.pop('multipass_identifier', None)
    
    return sanitized


def _analyze_ip_fields(raw_order):
    """
    Analisa todos os campos relacionados a IP no pedido RAW do Shopify
    
    Args:
        raw_order: Dados brutos do pedido do Shopify
        
    Returns:
        dict: Análise completa dos campos de IP encontrados
    """
    ip_analysis = {
        'ips_found': [],
        'ip_fields_structure': {},
        'potential_ip_sources': [],
        'client_details_analysis': {},
        'address_analysis': {},
        'customer_analysis': {},
        'order_level_analysis': {}
    }
    
    # Função auxiliar para verificar se um valor parece ser IP (CORRIGIDA)
    def looks_like_ip(value):
        if not value or not isinstance(value, str):
            return False
        value = value.strip()
        
        # Validação IPv4
        if '.' in value:
            parts = value.split('.')
            if len(parts) == 4:
                try:
                    for part in parts:
                        num = int(part)
                        if not (0 <= num <= 255):
                            return False
                    return True
                except ValueError:
                    return False
        
        # Validação IPv6 (simplificada)
        elif ':' in value and len(value) > 7:
            # IPv6 deve ter pelo menos 2 grupos separados por :
            return len(value.split(':')) >= 2
        
        return False
    
    # Função auxiliar para analisar objeto recursivamente
    def analyze_object(obj, path=""):
        for key, value in obj.items():
            current_path = f"{path}.{key}" if path else key
            
            if isinstance(value, dict):
                # Recursão em objetos
                analyze_object(value, current_path)
            elif looks_like_ip(value):
                # Encontrou possível IP
                ip_analysis['ips_found'].append({
                    'ip': value,
                    'source_path': current_path,
                    'source_description': current_path
                })
                ip_analysis['potential_ip_sources'].append(current_path)
            elif 'ip' in key.lower():
                # Campo relacionado a IP (mesmo que vazio)
                ip_analysis['ip_fields_structure'][current_path] = {
                    'value': value,
                    'type': type(value).__name__,
                    'is_ip_like': looks_like_ip(value)
                }
    
    # 1. ANÁLISE DO CLIENT_DETAILS (principal fonte atual)
    client_details = raw_order.get('client_details', {})
    if client_details:
        ip_analysis['client_details_analysis'] = {
            'exists': True,
            'all_fields': list(client_details.keys()),
            'ip_related_fields': {}
        }
        
        for key, value in client_details.items():
            if 'ip' in key.lower() or looks_like_ip(value):
                ip_analysis['client_details_analysis']['ip_related_fields'][key] = {
                    'value': value,
                    'looks_like_ip': looks_like_ip(value)
                }
        
        analyze_object(client_details, 'client_details')
    else:
        ip_analysis['client_details_analysis'] = {'exists': False}
    
    # 2. ANÁLISE DOS ENDEREÇOS
    for address_type in ['shipping_address', 'billing_address']:
        address = raw_order.get(address_type, {})
        if address:
            address_analysis = {
                'exists': True,
                'all_fields': list(address.keys()),
                'ip_related_fields': {}
            }
            
            for key, value in address.items():
                if 'ip' in key.lower() or looks_like_ip(value):
                    address_analysis['ip_related_fields'][key] = {
                        'value': value,
                        'looks_like_ip': looks_like_ip(value)
                    }
            
            ip_analysis['address_analysis'][address_type] = address_analysis
            analyze_object(address, address_type)
        else:
            ip_analysis['address_analysis'][address_type] = {'exists': False}
    
    # 3. ANÁLISE DO CUSTOMER
    customer = raw_order.get('customer', {})
    if customer:
        ip_analysis['customer_analysis'] = {
            'exists': True,
            'all_fields': list(customer.keys()),
            'ip_related_fields': {}
        }
        
        # Analisa customer principal
        for key, value in customer.items():
            if 'ip' in key.lower() or looks_like_ip(value):
                ip_analysis['customer_analysis']['ip_related_fields'][key] = {
                    'value': value,
                    'looks_like_ip': looks_like_ip(value)
                }
        
        # Analisa default_address do customer (fonte prioritária na nova lógica)
        default_address = customer.get('default_address', {})
        if default_address:
            ip_analysis['customer_analysis']['default_address'] = {
                'exists': True,
                'all_fields': list(default_address.keys()),
                'ip_related_fields': {}
            }
            
            for key, value in default_address.items():
                if 'ip' in key.lower() or looks_like_ip(value):
                    ip_analysis['customer_analysis']['default_address']['ip_related_fields'][key] = {
                        'value': value,
                        'looks_like_ip': looks_like_ip(value)
                    }
            
            analyze_object(default_address, 'customer.default_address')
        else:
            ip_analysis['customer_analysis']['default_address'] = {'exists': False}
        
        analyze_object(customer, 'customer')
    else:
        ip_analysis['customer_analysis'] = {'exists': False}
    
    # 4. ANÁLISE DO NÍVEL DO PEDIDO
    order_ip_fields = {}
    for key, value in raw_order.items():
        if 'ip' in key.lower() or looks_like_ip(value):
            order_ip_fields[key] = {
                'value': value,
                'looks_like_ip': looks_like_ip(value)
            }
    
    ip_analysis['order_level_analysis'] = {
        'ip_related_fields': order_ip_fields,
        'total_root_fields': len(raw_order.keys())
    }
    
    # 5. RESUMO FINAL
    ip_analysis['summary'] = {
        'total_ips_found': len(ip_analysis['ips_found']),
        'total_ip_fields': len(ip_analysis['ip_fields_structure']),
        'has_client_details': bool(client_details),
        'has_shipping_address': bool(raw_order.get('shipping_address')),
        'has_billing_address': bool(raw_order.get('billing_address')),
        'has_customer_data': bool(customer),
        'has_customer_default_address': bool(customer.get('default_address')) if customer else False
    }
    
    return ip_analysis

def _analyze_ip_fields_improved(raw_order):
    """
    Análise MELHORADA de IPs usando a lógica do detector principal
    Remove falsos positivos e usa hierarquia correta de busca
    """
    from .services.shopify_detector import ShopifyDuplicateOrderDetector
    
    # Cria instância temporária apenas para usar métodos de validação
    detector = ShopifyDuplicateOrderDetector("temp.myshopify.com", "temp_token")
    
    # Usa a função real do detector para encontrar o IP principal
    main_ip, ip_source = detector._extract_real_customer_ip(raw_order)
    
    # Verifica se IP é suspeito
    is_suspicious = False
    suspicious_pattern = None
    if main_ip:
        is_suspicious = detector._is_suspicious_ip(main_ip)
        if is_suspicious:
            suspicious_pattern = detector._get_suspicious_pattern(main_ip)
    
    # Análise estrutural detalhada
    analysis = {
        'primary_ip_found': bool(main_ip),
        'primary_ip': main_ip,
        'primary_ip_source': ip_source,
        'is_suspicious': is_suspicious,
        'suspicious_pattern': suspicious_pattern,
        'structure_analysis': {}
    }
    
    # Análise detalhada da estrutura disponível
    sections = {
        'client_details': raw_order.get('client_details', {}),
        'customer_default_address': raw_order.get('customer', {}).get('default_address', {}),
        'shipping_address': raw_order.get('shipping_address', {}),
        'billing_address': raw_order.get('billing_address', {}),
        'customer_root': raw_order.get('customer', {}),
        'order_root': raw_order
    }
    
    for section_name, section_data in sections.items():
        if not section_data:
            analysis['structure_analysis'][section_name] = {'exists': False}
            continue
            
        # Encontra campos relacionados a IP
        ip_fields = {}
        all_fields = []
        
        for key, value in section_data.items():
            all_fields.append(key)
            
            # Verifica se é campo relacionado a IP
            if 'ip' in key.lower() and isinstance(value, str) and value.strip():
                ip_fields[key] = {
                    'value': value,
                    'is_valid_ip': detector._is_valid_ip(value),
                    'is_suspicious': detector._is_suspicious_ip(value) if detector._is_valid_ip(value) else False
                }
        
        analysis['structure_analysis'][section_name] = {
            'exists': True,
            'total_fields': len(all_fields),
            'all_fields': all_fields,
            'ip_related_fields': ip_fields,
            'has_valid_ip': bool([f for f in ip_fields.values() if f['is_valid_ip']])
        }
    
    # Resumo executivo
    analysis['summary'] = {
        'ip_detection_successful': bool(main_ip),
        'ip_source_hierarchy_position': _get_hierarchy_position(ip_source) if ip_source else None,
        'sections_with_ips': len([s for s in analysis['structure_analysis'].values() if s.get('has_valid_ip', False)]),
        'total_sections_analyzed': len([s for s in analysis['structure_analysis'].values() if s.get('exists', False)]),
        'detection_method': 'shopify_detector_logic'
    }
    
    # Recomendações
    analysis['recommendations'] = []
    if not main_ip:
        analysis['recommendations'].append("PROBLEMA: Nenhum IP válido encontrado - verificar estrutura de dados")
        if analysis['structure_analysis']['client_details']['exists']:
            analysis['recommendations'].append("client_details existe mas não tem browser_ip válido")
    else:
        if is_suspicious:
            analysis['recommendations'].append(f"ATENÇÃO: IP detectado como suspeito ({suspicious_pattern})")
        analysis['recommendations'].append(f"SUCESSO: IP encontrado via {ip_source}")
    
    return analysis

def _get_hierarchy_position(ip_source):
    """Retorna posição na hierarquia de busca baseado na fonte do IP"""
    if not ip_source:
        return None
        
    hierarchy_map = {
        'client_details.browser_ip': 1,
        'customer.default_address': 2,
        'shipping_address': 3,
        'billing_address': 4,
        'customer': 5,
        'client_details': 6,
        'order': 7
    }
    
    # Encontra posição baseado no prefixo da fonte
    for prefix, position in hierarchy_map.items():
        if ip_source.startswith(prefix):
            return position
    
    return 99  # Desconhecido


def _extract_ip_field_paths(raw_order):
    """
    Extrai todos os caminhos de campos que contêm ou podem conter IPs no pedido RAW
    Inclui campos mesmo se estiverem vazios - útil para debug
    
    Args:
        raw_order: Dados completos do pedido
        
    Returns:
        list: Lista completa de caminhos relacionados a IP encontrados
    """
    ip_paths = []
    all_ip_related_paths = []
    
    def looks_like_ip(value):
        """Verifica se um valor parece ser um IP (IPv4 ou IPv6)"""
        if not value:
            return False
        
        value_str = str(value).strip()
        if not value_str:
            return False
            
        # IPv4 - mais rigoroso
        if '.' in value_str and len(value_str.split('.')) == 4:
            try:
                parts = value_str.split('.')
                # Verifica se todas as partes são números válidos de 0-255
                if all(part.isdigit() and 0 <= int(part) <= 255 for part in parts):
                    return True
            except:
                pass
        
        # IPv6 - básico
        if ':' in value_str and 7 <= len(value_str) <= 39:
            # Verifica padrão básico de IPv6
            if value_str.count(':') >= 2:
                return True
        
        return False
    
    def is_ip_related_field(field_name):
        """Verifica se o nome do campo indica que pode conter IP"""
        field_lower = field_name.lower()
        ip_indicators = [
            'ip', 'browser_ip', 'client_ip', 'customer_ip', 'remote_ip',
            'forwarded_ip', 'real_ip', 'origin_ip', 'proxy_ip', 'x_forwarded',
            'x_real_ip', 'cf_connecting_ip', 'true_client_ip'
        ]
        
        return any(indicator in field_lower for indicator in ip_indicators)
    
    def scan_object(obj, path=""):
        """Escaneia recursivamente um objeto procurando por IPs e campos relacionados"""
        if isinstance(obj, dict):
            for key, value in obj.items():
                current_path = f"{path}.{key}" if path else key
                
                # Verifica se é campo relacionado a IP (mesmo que vazio)
                if is_ip_related_field(key):
                    all_ip_related_paths.append({
                        'path': current_path,
                        'field_name': key,
                        'value': value,
                        'has_ip_value': looks_like_ip(value),
                        'is_empty': value is None or value == '',
                        'type': 'ip_field_name'
                    })
                
                # Verifica se o valor parece ser IP
                if looks_like_ip(value):
                    ip_paths.append({
                        'path': current_path,
                        'field_name': key,
                        'ip_value': value,
                        'type': 'ip_value_found'
                    })
                
                # Recursão para objetos aninhados
                if isinstance(value, (dict, list)):
                    scan_object(value, current_path)
                    
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                current_path = f"{path}[{i}]"
                scan_object(item, current_path)
    
    # === ANÁLISE ESPECIAL DE CAMPOS CONHECIDOS ===
    
    # 1. client_details - fonte principal
    if 'client_details' in raw_order:
        client_details = raw_order['client_details']
        if isinstance(client_details, dict):
            all_ip_related_paths.append({
                'path': 'client_details',
                'field_name': 'client_details',
                'value': client_details,
                'has_ip_value': False,
                'is_empty': not bool(client_details),
                'type': 'ip_container_object',
                'all_fields': list(client_details.keys()) if client_details else []
            })
    
    # 2. Campos diretos no pedido
    direct_ip_candidates = [
        'browser_ip', 'client_ip', 'customer_ip', 'remote_ip', 'ip_address'
    ]
    
    for field in direct_ip_candidates:
        if field in raw_order:
            all_ip_related_paths.append({
                'path': field,
                'field_name': field,
                'value': raw_order[field],
                'has_ip_value': looks_like_ip(raw_order[field]),
                'is_empty': raw_order[field] is None or raw_order[field] == '',
                'type': 'direct_ip_field'
            })
    
    # 3. Análise completa recursiva
    scan_object(raw_order)
    
    # === RESULTADO COMPLETO ===
    result = {
        'ip_values_found': ip_paths,
        'ip_related_fields': all_ip_related_paths,
        'summary': {
            'total_ip_values': len(ip_paths),
            'total_ip_fields': len(all_ip_related_paths),
            'has_client_details': 'client_details' in raw_order,
            'client_details_fields': list(raw_order.get('client_details', {}).keys()) if raw_order.get('client_details') else []
        }
    }
    
    return result

# ===== NOVOS ENDPOINTS PARA MÉTODOS ALTERNATIVOS DE CAPTURA DE IP =====

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@never_cache
def analyze_order_ip_alternative(request):
    """
    Analisa pedido usando métodos alternativos de captura de IP
    
    Usa os novos serviços implementados para casos onde Shopify não fornece IP
    """
    try:
        # Validações básicas
        loja_id = request.data.get('loja_id')
        order_id = request.data.get('order_id')
        use_external_apis = request.data.get('use_external_apis', False)
        
        if not loja_id or not order_id:
            return Response({
                'error': 'ID da loja e ID do pedido são obrigatórios'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verifica loja
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
        if not config:
            return Response({
                'error': 'Loja não encontrada ou inativa'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Rate limiting
        allowed, remaining = RateLimitManager.check_rate_limit(request.user, 'ip_search')
        if not allowed:
            return RateLimitManager.get_rate_limit_response('ip_search')
        
        # Busca dados do pedido
        detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
        order_data = detector.get_order_details(order_id)
        
        if not order_data:
            return Response({
                'error': 'Pedido não encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Busca pedidos similares para análise comportamental
        similar_orders = None
        try:
            # Busca outros pedidos do mesmo cliente
            customer_email = order_data.get('customer_info', {}).get('email')
            if customer_email:
                all_orders = detector.get_all_orders(days_back=30)
                similar_orders = [
                    order for order in all_orders 
                    if order.get('customer', {}).get('email') == customer_email
                    and order.get('id') != order_id
                ]
        except Exception as e:
            logger.warning(f"Erro ao buscar pedidos similares: {e}")
        
        # Usa detector melhorado
        improved_detector = get_improved_ip_detector()
        detection_result = improved_detector.detect_customer_ip(
            order_data, 
            similar_orders=similar_orders,
            use_external_apis=use_external_apis
        )
        
        # Auditoria
        audit_details = {
            'order_id': order_id,
            'loja_id': loja_id,
            'use_external_apis': use_external_apis,
            'method_used': detection_result.get('method_used'),
            'ip_found': bool(detection_result.get('customer_ip')),
            'confidence': detection_result.get('confidence_score', 0)
        }
        
        AuditLogger.log_ip_access(
            request.user,
            request,
            'alternative_ip_analysis',
            audit_details
        )
        
        # Log da operação
        ProcessamentoLog.objects.create(
            user=request.user,
            config=config,
            tipo='busca_ip',
            status='sucesso',
            pedidos_encontrados=1,
            detalhes=audit_details
        )
        
        response = Response({
            'success': True,
            'order_id': order_id,
            'loja_nome': config.nome_loja,
            'detection_result': detection_result,
            'analysis_timestamp': datetime.now().isoformat()
        })
        
        return SecurityHeadersManager.add_security_headers(response)
        
    except Exception as e:
        logger.error(f"Erro na análise alternativa de IP: {e}")
        
        # Log do erro
        if 'config' in locals():
            ProcessamentoLog.objects.create(
                user=request.user,
                config=config,
                tipo='busca_ip',
                status='erro',
                erro_mensagem=str(e),
                detalhes={'order_id': order_id if 'order_id' in locals() else 'unknown'}
            )
        
        return Response({
            'error': 'Erro interno do servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@never_cache
def batch_analyze_ips(request):
    """
    Analisa múltiplos pedidos em lote para detectar IPs
    """
    try:
        # Validações
        loja_id = request.data.get('loja_id')
        order_ids = request.data.get('order_ids', [])
        use_external_apis = request.data.get('use_external_apis', False)
        
        if not loja_id or not order_ids:
            return Response({
                'error': 'ID da loja e lista de pedidos são obrigatórios'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Limita quantidade para evitar sobrecarga
        if len(order_ids) > 20:
            return Response({
                'error': 'Máximo de 20 pedidos por lote'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verifica loja
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
        if not config:
            return Response({
                'error': 'Loja não encontrada ou inativa'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Rate limiting mais rigoroso para lotes
        allowed, remaining = RateLimitManager.check_rate_limit(request.user, 'ip_search')
        if not allowed:
            return RateLimitManager.get_rate_limit_response('ip_search')
        
        # Busca dados dos pedidos
        detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
        orders_data = []
        
        for order_id in order_ids:
            order_data = detector.get_order_details(order_id)
            if order_data:
                orders_data.append(order_data)
        
        if not orders_data:
            return Response({
                'error': 'Nenhum pedido válido encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Processa em lote
        improved_detector = get_improved_ip_detector()
        batch_results = improved_detector.batch_detect_ips(
            orders_data,
            use_external_apis=use_external_apis,
            max_concurrent=5
        )
        
        # Auditoria
        audit_details = {
            'loja_id': loja_id,
            'total_orders': len(order_ids),
            'successful_detections': batch_results.get('successful_detections', 0),
            'use_external_apis': use_external_apis,
            'processing_time': batch_results.get('processing_time', 0)
        }
        
        AuditLogger.log_ip_access(
            request.user,
            request,
            'batch_ip_analysis',
            audit_details
        )
        
        # Log da operação
        ProcessamentoLog.objects.create(
            user=request.user,
            config=config,
            tipo='busca_ip',
            status='sucesso',
            pedidos_encontrados=len(orders_data),
            detalhes=audit_details
        )
        
        response = Response({
            'success': True,
            'loja_nome': config.nome_loja,
            'batch_results': batch_results,
            'analysis_timestamp': datetime.now().isoformat()
        })
        
        return SecurityHeadersManager.add_security_headers(response)
        
    except Exception as e:
        logger.error(f"Erro na análise em lote de IPs: {e}")
        return Response({
            'error': 'Erro interno do servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@never_cache
def analyze_ip_quality(request):
    """
    Analisa qualidade e confiabilidade de um IP específico
    """
    try:
        # Validações
        ip_address = request.data.get('ip_address')
        order_id = request.data.get('order_id')  # Opcional
        loja_id = request.data.get('loja_id')    # Opcional
        
        if not ip_address:
            return Response({
                'error': 'Endereço IP é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Sanitiza IP
        ip_sanitized = IPSecurityUtils.sanitize_ip_input(ip_address)
        if not ip_sanitized:
            return Response({
                'error': 'Formato de IP inválido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Rate limiting
        allowed, remaining = RateLimitManager.check_rate_limit(request.user, 'ip_detail')
        if not allowed:
            return RateLimitManager.get_rate_limit_response('ip_detail')
        
        # Busca dados do pedido se fornecido
        order_data = None
        config = None
        
        if order_id and loja_id:
            config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
            if config:
                detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
                order_data = detector.get_order_details(order_id)
        
        # Analisa qualidade do IP
        improved_detector = get_improved_ip_detector()
        quality_analysis = improved_detector.analyze_ip_quality(ip_sanitized, order_data)
        
        # Auditoria
        audit_details = {
            'ip_analyzed': IPSecurityUtils.mask_ip(ip_sanitized),
            'order_id': order_id,
            'loja_id': loja_id,
            'quality_score': quality_analysis.get('quality_score', 0),
            'recommendation': quality_analysis.get('recommendation')
        }
        
        AuditLogger.log_ip_access(
            request.user,
            request,
            'ip_quality_analysis',
            audit_details
        )
        
        response = Response({
            'success': True,
            'ip_analysis': quality_analysis,
            'analysis_timestamp': datetime.now().isoformat()
        })
        
        return SecurityHeadersManager.add_security_headers(response)
        
    except Exception as e:
        logger.error(f"Erro na análise de qualidade do IP: {e}")
        return Response({
            'error': 'Erro interno do servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_geolocation_status(request):
    """
    Retorna status dos serviços de geolocalização configurados
    """
    try:
        # Verifica configurações
        config_validation = GeolocationConfig.validate_configuration()
        
        # Testa serviços
        geo_service = get_geolocation_service()
        service_validation = geo_service.validate_services()
        service_status = geo_service.get_service_status()
        
        # Estatísticas do detector melhorado
        improved_detector = get_improved_ip_detector()
        detection_stats = improved_detector.get_detection_statistics()
        
        response = Response({
            'success': True,
            'configuration': config_validation,
            'services_validation': service_validation,
            'services_status': service_status,
            'detection_statistics': detection_stats,
            'timestamp': datetime.now().isoformat()
        })
        
        return SecurityHeadersManager.add_security_headers(response)
        
    except Exception as e:
        logger.error(f"Erro ao obter status de geolocalização: {e}")
        return Response({
            'error': 'Erro interno do servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@never_cache
def test_geolocation_api(request):
    """
    Testa APIs de geolocalização com IP de exemplo
    """
    try:
        # IP de teste (Google DNS)
        test_ip = request.data.get('test_ip', '8.8.8.8')
        
        # Sanitiza IP
        ip_sanitized = IPSecurityUtils.sanitize_ip_input(test_ip)
        if not ip_sanitized:
            return Response({
                'error': 'Formato de IP inválido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Rate limiting
        allowed, remaining = RateLimitManager.check_rate_limit(request.user, 'ip_detail')
        if not allowed:
            return RateLimitManager.get_rate_limit_response('ip_detail')
        
        # Testa serviço de geolocalização
        geo_service = get_geolocation_service()
        location_result = geo_service.get_location_by_ip(ip_sanitized)
        
        # Auditoria
        audit_details = {
            'test_ip': IPSecurityUtils.mask_ip(ip_sanitized),
            'api_success': location_result.get('success', False),
            'api_source': location_result.get('source')
        }
        
        AuditLogger.log_ip_access(
            request.user,
            request,
            'geolocation_api_test',
            audit_details
        )
        
        response = Response({
            'success': True,
            'test_ip': ip_sanitized,
            'location_result': location_result,
            'test_timestamp': datetime.now().isoformat()
        })
        
        return SecurityHeadersManager.add_security_headers(response)
        
    except Exception as e:
        logger.error(f"Erro no teste de API de geolocalização: {e}")
        return Response({
            'error': 'Erro interno do servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ===== ENDPOINTS APRIMORADOS COM LOGGING ESTRUTURADO =====

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@never_cache
def buscar_pedidos_mesmo_ip_enhanced(request):
    """
    Versão aprimorada de buscar_pedidos_mesmo_ip com logging estruturado completo
    /api/processamento/buscar-ips-duplicados-enhanced/
    
    Funcionalidades adicionadas:
    - Logging estruturado em JSON para análise posterior
    - Estatísticas de performance detalhadas
    - Análise de hierarquia de campos de IP
    - Alertas automáticos baseados em thresholds
    - Diagnóstico automático de problemas
    """
    try:
        # === VALIDAÇÕES DE SEGURANÇA ===
        loja_id = request.data.get('loja_id')
        days = request.data.get('days', 30)
        min_orders = request.data.get('min_orders', 2)
        enable_detailed_logging = request.data.get('enable_detailed_logging', True)
        
        # Validação obrigatória de parâmetros
        if not loja_id:
            return Response({'error': 'ID da loja é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Sanitização e validação de inputs
        try:
            loja_id = int(loja_id)
            days = min(int(days), 30)  # REDUZIDO PARA 30 DIAS MÁXIMO por segurança
            min_orders = max(int(min_orders), 2)
        except (ValueError, TypeError):
            return Response({'error': 'Parâmetros inválidos'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validação de range de dias mais restritiva
        if days > 30:
            return Response({
                'error': 'Período máximo permitido é 30 dias por motivos de segurança'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if days < 1:
            days = 1
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
        if not config:
            return Response({'error': 'Loja não encontrada ou inativa'}, status=status.HTTP_400_BAD_REQUEST)
        
        # === USA DETECTOR APRIMORADO COM LOGGING ===
        enhanced_detector = get_enhanced_ip_detector(
            shop_url=config.shop_url,
            access_token=config.access_token,
            api_version=config.api_version
        )
        
        # Busca IPs com logging estruturado completo
        enhanced_result = enhanced_detector.get_orders_by_ip_enhanced(
            config=config,
            user=request.user,
            days=days,
            min_orders=min_orders
        )
        
        # === AUDITORIA DE SEGURANÇA APRIMORADA ===
        audit_details = {
            'ips_found': enhanced_result.get('total_ips_found', 0),
            'period_days': days,
            'min_orders': min_orders,
            'user_ip': AuditLogger._get_client_ip(request),
            'total_orders': enhanced_result.get('total_orders_analyzed', 0),
            'processing_time_ms': enhanced_result.get('performance_metadata', {}).get('total_processing_time_ms', 0),
            'enhancement_version': 'v2.0',
            'detailed_logging_enabled': enable_detailed_logging
        }
        
        # Log padrão da busca (mantém compatibilidade)
        ProcessamentoLog.objects.create(
            user=request.user,
            config=config,
            tipo='busca_ip',
            status='sucesso',
            pedidos_encontrados=enhanced_result.get('total_orders_analyzed', 0),
            detalhes=audit_details
        )
        
        # Log de auditoria (mantém compatibilidade)
        AuditLogger.log_ip_access(
            request.user,
            request,
            'ip_search_enhanced',
            audit_details
        )
        
        # === PREPARA RESPOSTA APRIMORADA ===
        response_data = {
            'success': True,
            'data': enhanced_result,
            'loja_nome': config.nome_loja,
            'enhancement_info': {
                'version': '2.0',
                'structured_logging_enabled': enable_detailed_logging,
                'features': [
                    'detailed_performance_metrics',
                    'ip_field_hierarchy_analysis',
                    'automatic_diagnostic',
                    'structured_json_logging',
                    'real_time_statistics'
                ]
            }
        }
        
        # Dados de resposta finalizados
        
        # Cria response com dados completos
        response = Response(response_data)
        
        # Adiciona headers de segurança
        return SecurityHeadersManager.add_security_headers(response)
        
    except Exception as e:
        # === LOG DE ERRO COM LOGGING ESTRUTURADO ===
        error_details = {
            'days': days if 'days' in locals() else 30,
            'min_orders': min_orders if 'min_orders' in locals() else 2,
            'user_ip': AuditLogger._get_client_ip(request),
            'error': str(e),
            'error_type': type(e).__name__,
            'enhancement_version': 'v2.0'
        }
        
        # Log de auditoria do erro
        AuditLogger.log_ip_access(
            request.user,
            request,
            'ip_search_enhanced_error',
            error_details
        )
        
        # Log padrão do erro (mantém compatibilidade)
        if 'config' in locals():
            ProcessamentoLog.objects.create(
                user=request.user,
                config=config,
                tipo='busca_ip',
                status='erro',
                erro_mensagem=str(e),
                detalhes=error_details
            )
        
        logger.error(f"Erro na busca aprimorada por IP - User: {request.user.username}, Error: {str(e)}")
        return Response({'error': 'Erro interno do servidor'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@never_cache
def analyze_single_order_ip_enhanced(request):
    """
    Análise detalhada de IP para um pedido específico com debugging completo
    /api/processamento/analyze-single-order-ip/
    
    Ideal para troubleshooting e análise granular de problemas de detecção
    """
    try:
        # Validações
        loja_id = request.data.get('loja_id')
        order_id = request.data.get('order_id')
        
        if not loja_id or not order_id:
            return Response({
                'error': 'ID da loja e ID do pedido são obrigatórios'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            loja_id = int(loja_id)
        except (ValueError, TypeError):
            return Response({'error': 'ID da loja inválido'}, status=status.HTTP_400_BAD_REQUEST)
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
        if not config:
            return Response({'error': 'Loja não encontrada ou inativa'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Rate limiting específico para análise detalhada
        allowed, remaining = RateLimitManager.check_rate_limit(request.user, 'ip_detail')
        if not allowed:
            return RateLimitManager.get_rate_limit_response('ip_detail')
        
        # === USA DETECTOR APRIMORADO ===
        enhanced_detector = get_enhanced_ip_detector(
            shop_url=config.shop_url,
            access_token=config.access_token,
            api_version=config.api_version
        )
        
        # Análise detalhada do pedido específico
        analysis_result = enhanced_detector.detect_single_order_ip_enhanced(
            config=config,
            user=request.user,
            order_id=str(order_id)
        )
        
        # Auditoria da análise detalhada
        audit_details = {
            'order_id': order_id,
            'loja_id': loja_id,
            'detection_successful': analysis_result.get('detection_successful', False),
            'detected_ip': IPSecurityUtils.mask_ip(analysis_result.get('detected_ip', '')) if analysis_result.get('detected_ip') else None,
            'detection_method': analysis_result.get('detection_method'),
            'confidence_score': analysis_result.get('confidence_score', 0),
            'processing_time_ms': analysis_result.get('processing_time_ms', 0),
            'analysis_type': 'single_order_detailed'
        }
        
        AuditLogger.log_ip_access(
            request.user,
            request,
            'single_order_analysis',
            audit_details
        )
        
        # Log da análise
        ProcessamentoLog.objects.create(
            user=request.user,
            config=config,
            tipo='analise_pedido',
            status='sucesso' if analysis_result.get('detection_successful') else 'erro',
            pedidos_encontrados=1,
            detalhes=audit_details
        )
        
        # Resposta estruturada
        response = Response({
            'success': True,
            'config_info': {
                'id': config.id,
                'nome_loja': config.nome_loja
            },
            'analysis_result': analysis_result,
            'analysis_type': 'single_order_enhanced',
            'timestamp': timezone.now().isoformat()
        })
        
        return SecurityHeadersManager.add_security_headers(response)
        
    except Exception as e:
        logger.error(f"Erro na análise detalhada de pedido: {e}")
        
        # Log estruturado do erro
        if 'config' in locals() and 'order_id' in locals():
            ProcessamentoLog.objects.create(
                user=request.user,
                config=config,
                tipo='analise_pedido',
                status='erro',
                erro_mensagem=str(e),
                detalhes={
                    'order_id': order_id,
                    'error_type': type(e).__name__,
                    'analysis_type': 'single_order_enhanced'
                }
            )
        
        return Response({
            'error': 'Erro interno do servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
@never_cache
def get_system_diagnostics(request):
    """
    Obtém diagnóstico completo do sistema de detecção de IP
    /api/processamento/system-diagnostics/
    
    Endpoint para monitoramento proativo e troubleshooting
    """
    try:
        loja_id = request.GET.get('loja_id')
        period_hours = int(request.GET.get('period_hours', 24))
        
        if not loja_id:
            return Response({
                'error': 'ID da loja é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
        if not config:
            return Response({
                'error': 'Loja não encontrada'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Limita período para evitar sobrecarga
        period_hours = min(period_hours, 168)  # Máximo 1 semana
        
        # === USA DETECTOR APRIMORADO PARA DIAGNÓSTICO ===
        enhanced_detector = get_enhanced_ip_detector(
            shop_url=config.shop_url,
            access_token=config.access_token,
            api_version=config.api_version
        )
        
        # Obtém diagnóstico completo
        diagnostic_result = enhanced_detector.get_detection_diagnostics(
            config=config,
            user=request.user,
            period_hours=period_hours
        )
        
        # Auditoria do acesso ao diagnóstico
        AuditLogger.log_ip_access(
            request.user,
            request,
            'system_diagnostic_access',
            {
                'loja_id': loja_id,
                'period_hours': period_hours,
                'diagnostic_type': 'comprehensive',
                'health_score': diagnostic_result.get('overall_health_score', {}).get('overall_score', 0)
            }
        )
        
        response = Response({
            'success': True,
            'diagnostic_result': diagnostic_result,
            'generated_at': timezone.now().isoformat()
        })
        
        return SecurityHeadersManager.add_security_headers(response)
        
    except Exception as e:
        logger.error(f"Erro no diagnóstico do sistema: {e}")
        return Response({
            'error': 'Erro interno do servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===== FUNÇÕES AUXILIARES PARA LIMITE DINÂMICO =====

def _calculate_dynamic_limit_for_store(config):
    """
    Calcula limite dinâmico de dias baseado no volume histórico da loja
    
    Args:
        config: Configuração da loja ShopifyConfig
        
    Returns:
        int: Número máximo de dias permitido para esta loja
    """
    if not config:
        return 30  # Fallback conservador
    
    try:
        # Tenta obter histórico de logs para estimar volume
        recent_logs = ProcessamentoLog.objects.filter(
            config=config,
            tipo__in=['busca_ip', 'busca'],
            status='sucesso'
        ).order_by('-data_execucao')[:10]
        
        if recent_logs.exists():
            avg_orders = sum(log.pedidos_encontrados or 0 for log in recent_logs) / len(recent_logs)
            
            # Categoriza volume da loja baseado em análise de performance
            if avg_orders >= 1000:
                return 7  # Loja de alto volume - limite baixo para performance
            elif avg_orders >= 500:
                return 14  # Loja de médio volume
            elif avg_orders >= 100:
                return 30  # Loja de volume moderado
            else:
                return 90  # Loja pequena - pode buscar mais dias
        else:
            # Sem histórico - usa limite conservador mas não artificial
            return 60  # Permite mais que 30 dias para lojas novas
            
    except Exception as e:
        logger.error(f"Erro ao calcular limite dinâmico: {e}")
        return 60  # Fallback mais generoso em caso de erro


def _get_store_volume_category(config):
    """
    Determina categoria de volume da loja
    
    Args:
        config: Configuração da loja ShopifyConfig
        
    Returns:
        str: Categoria de volume ('small', 'medium', 'large', 'enterprise')
    """
    if not config:
        return 'unknown'
    
    try:
        recent_logs = ProcessamentoLog.objects.filter(
            config=config,
            tipo__in=['busca_ip', 'busca'],
            status='sucesso'
        ).order_by('-data_execucao')[:10]
        
        if recent_logs.exists():
            avg_orders = sum(log.pedidos_encontrados or 0 for log in recent_logs) / len(recent_logs)
            
            if avg_orders >= 1000:
                return 'enterprise'
            elif avg_orders >= 500:
                return 'large'
            elif avg_orders >= 100:
                return 'medium'
            else:
                return 'small'
        else:
            return 'small'  # Default para lojas sem histórico
            
    except Exception:
        return 'unknown'


def _apply_timeout_prevention_optimizations(detector, days, min_orders):
    """
    Implementa otimizações para prevenir timeout baseado no período solicitado
    
    Args:
        detector: Instância do ShopifyDuplicateOrderDetector
        days: Número de dias solicitado
        min_orders: Mínimo de pedidos por IP
        
    Returns:
        dict: Resultado otimizado da busca por IP
    """
    try:
        logger.info(f"Aplicando otimizações para período de {days} dias")
        
        # Para períodos maiores que 30 dias, implementa estratégias específicas
        if days > 30:
            # Estratégia 1: Paginação em chunks menores
            return _process_large_period_with_chunking(detector, days, min_orders)
        else:
            # Período pequeno - usa método normal com timeout aumentado
            return detector.get_orders_by_ip(days=days, min_orders=min_orders)
            
    except Exception as e:
        logger.error(f"Erro na otimização com prevenção de timeout: {e}")
        # Fallback para método normal
        return detector.get_orders_by_ip(days=days, min_orders=min_orders)


def _process_large_period_with_chunking(detector, days, min_orders):
    """
    Processa períodos grandes usando estratégia de chunking para evitar timeout
    
    Args:
        detector: Instância do ShopifyDuplicateOrderDetector
        days: Número de dias solicitado
        min_orders: Mínimo de pedidos por IP
        
    Returns:
        dict: Resultado consolidado
    """
    try:
        chunk_size = 20  # Chunks de 20 dias para reduzir carga
        all_ip_groups = {}
        total_orders_analyzed = 0
        
        logger.info(f"Processando {days} dias em chunks de {chunk_size} dias")
        
        # Processa em chunks sequenciais
        for start_day in range(0, days, chunk_size):
            end_day = min(start_day + chunk_size, days)
            chunk_days = end_day - start_day
            
            logger.info(f"Processando chunk: dias {start_day}-{end_day} ({chunk_days} dias)")
            
            try:
                # Busca chunk com timeout menor e min_orders=1 para capturar tudo
                chunk_result = detector.get_orders_by_ip(days=chunk_days, min_orders=1)
                
                if chunk_result and chunk_result.get('ip_groups'):
                    # Consolida resultados do chunk
                    for ip_group in chunk_result['ip_groups']:
                        ip = ip_group.get('ip')
                        if ip:
                            if ip not in all_ip_groups:
                                all_ip_groups[ip] = {
                                    'ip': ip,
                                    'orders': [],
                                    'order_count': 0,
                                    'total_sales': 0.0,
                                    'unique_customers': set(),
                                    'cancelled_orders': 0,
                                    'active_orders': 0
                                }
                            
                            # Adiciona pedidos evitando duplicatas
                            existing_order_ids = {order.get('id') for order in all_ip_groups[ip]['orders']}
                            new_orders = [
                                order for order in ip_group.get('orders', [])
                                if order.get('id') not in existing_order_ids
                            ]
                            
                            all_ip_groups[ip]['orders'].extend(new_orders)
                
                if chunk_result:
                    total_orders_analyzed += chunk_result.get('total_orders_analyzed', 0)
                
                # Pequena pausa entre chunks para não sobrecarregar API
                import time
                time.sleep(0.3)
                
            except Exception as chunk_error:
                logger.error(f"Erro ao processar chunk {start_day}-{end_day}: {chunk_error}")
                continue  # Continua com próximo chunk
        
        # Filtra por min_orders e calcula estatísticas finais
        final_groups = []
        for ip, group_data in all_ip_groups.items():
            orders = group_data['orders']
            
            if len(orders) >= min_orders:
                # Recalcula estatísticas
                total_sales = sum(float(order.get('total_price', 0)) for order in orders)
                cancelled_count = sum(1 for order in orders if order.get('is_cancelled', False))
                active_count = len(orders) - cancelled_count
                
                # Conta clientes únicos
                unique_customers = set()
                for order in orders:
                    customer = order.get('customer', {})
                    email = customer.get('email')
                    if email:
                        unique_customers.add(email)
                
                final_groups.append({
                    'ip': ip,
                    'order_count': len(orders),
                    'cancelled_orders': cancelled_count,
                    'active_orders': active_count,
                    'unique_customers': len(unique_customers),
                    'total_sales': f"{total_sales:.2f}",
                    'currency': orders[0].get('currency', 'BRL') if orders else 'BRL',
                    'orders': orders,
                    'processed_with_chunking': True,
                    'date_range': {
                        'first': min(order.get('created_at', '') for order in orders) if orders else '',
                        'last': max(order.get('created_at', '') for order in orders) if orders else ''
                    }
                })
        
        # Ordena por quantidade de pedidos
        final_groups.sort(key=lambda x: x['order_count'], reverse=True)
        
        return {
            'ip_groups': final_groups,
            'total_ips_found': len(final_groups),
            'total_orders_analyzed': total_orders_analyzed,
            'period_days': days,
            'processing_method': 'chunked_for_large_period',
            'chunk_size_used': chunk_size,
            'debug_stats': {
                'chunked_processing': True,
                'total_chunks_processed': (days // chunk_size) + (1 if days % chunk_size else 0)
            }
        }
        
    except Exception as e:
        logger.error(f"Erro no processamento com chunking: {e}")
        # Fallback para método normal
        return detector.get_orders_by_ip(days=min(days, 30), min_orders=min_orders)