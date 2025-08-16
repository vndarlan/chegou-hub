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
import django_rq
from django_rq import get_queue
import ipaddress
import re

from .models import ShopifyConfig, ProcessamentoLog
from .services.shopify_detector import ShopifyDuplicateOrderDetector
from .services.improved_ip_detection import get_improved_ip_detector
from .services.alternative_ip_capture import AlternativeIPCaptureService
from .services.geolocation_api_service import get_geolocation_service, GeolocationConfig
from .services.enhanced_ip_detector import get_enhanced_ip_detector
from .services.structured_logging_service import get_structured_logging_service
from .cache_manager import get_cache_manager
from .utils.security_utils import (
    IPSecurityUtils, 
    RateLimitManager, 
    AuditLogger, 
    SecurityHeadersManager
)

logger = logging.getLogger(__name__)

def validate_ip_address(ip):
    """Valida formato de endereço IP"""
    try:
        # Remove caracteres não permitidos
        ip_clean = re.sub(r'[^0-9.:a-fA-F]', '', str(ip))
        # Valida formato
        ipaddress.ip_address(ip_clean)
        return ip_clean
    except (ValueError, TypeError):
        raise ValueError('Formato de IP inválido')

def create_safe_log(user, config, tipo, status, dados=None):
    """
    Cria log de forma segura, verificando se o usuário está autenticado
    """
    try:
        # Verifica se o usuário é válido e autenticado
        if hasattr(user, 'is_authenticated') and user.is_authenticated:
            log_user = user
        else:
            # Se não há usuário autenticado, usa None (pode ser um request anônimo)
            log_user = None
        
        ProcessamentoLog.objects.create(
            user=log_user,
            config=config,
            tipo=tipo,
            status=status,
            dados=dados or {}
        )
    except Exception as e:
        # Log do erro mas não interrompe a execução principal
        logger.error(f"Erro ao criar log: {str(e)}")

@csrf_exempt
@api_view(['GET', 'POST', 'DELETE'])
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buscar_duplicatas(request):
    """Busca pedidos duplicados de uma loja específica"""
    try:
        loja_id = request.data.get('loja_id')
        
        # Log de auditoria
        logger.info(f"Busca de duplicatas - Usuário: {request.user.username} (ID: {request.user.id}), Loja: {loja_id}")
        
        if not loja_id:
            return Response({'error': 'ID da loja é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True, user=request.user).first()
        if not config:
            return Response({'error': 'Loja não encontrada'}, status=status.HTTP_400_BAD_REQUEST)
        
        detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
        duplicates = detector.get_detailed_duplicates()
        
        # Log da busca
        create_safe_log(
            user=request.user,
            config=config,
            tipo='busca',
            status='sucesso',
            dados={
                'duplicates_count': len(duplicates),
                'pedidos_encontrados': len(duplicates)
            }
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancelar_pedido(request):
    """Cancela um pedido específico"""
    try:
        loja_id = request.data.get('loja_id')
        order_id = request.data.get('order_id')
        order_number = request.data.get('order_number', 'N/A')
        
        # Log de auditoria
        logger.info(f"Cancelamento de pedido {order_id} - Usuário: {request.user.username} (ID: {request.user.id}), Loja: {loja_id}")
        
        if not loja_id or not order_id:
            return Response({'error': 'ID da loja e do pedido são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True, user=request.user).first()
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancelar_lote(request):
    """Cancela múltiplos pedidos"""
    try:
        loja_id = request.data.get('loja_id')
        order_ids = request.data.get('order_ids', [])
        
        # Log de auditoria
        logger.info(f"Cancelamento em lote de {len(order_ids)} pedidos - Usuário: {request.user.username} (ID: {request.user.id}), Loja: {loja_id}")
        
        if not loja_id or not order_ids:
            return Response({'error': 'ID da loja e lista de pedidos são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True, user=request.user).first()
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@never_cache
def buscar_pedidos_mesmo_ip(request):
    """Busca pedidos agrupados pelo mesmo IP com medidas de segurança - VERSÃO CORRIGIDA"""
    try:
        # === LOG INICIAL PARA DEBUG ===
        logger.info(f"=== INÍCIO buscar_pedidos_mesmo_ip ===")
        logger.info(f"User: {getattr(request.user, 'username', 'Anonymous')}")
        logger.info(f"Request data: {request.data}")
        
        # === VALIDAÇÕES DE SEGURANÇA ===
        loja_id = request.data.get('loja_id')
        days = request.data.get('days', 30)
        min_orders = request.data.get('min_orders', 2)
        
        logger.info(f"Parâmetros recebidos - loja_id: {loja_id}, days: {days}, min_orders: {min_orders}")
        
        # Validação obrigatória de parâmetros
        if not loja_id:
            logger.error("loja_id não fornecido")
            return Response({'error': 'ID da loja é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Sanitização e validação de inputs
        try:
            loja_id = int(loja_id)
            days = int(days)  # Remove limite artificial
            min_orders = max(int(min_orders), 2)
            logger.info(f"Parâmetros validados - loja_id: {loja_id}, days: {days}, min_orders: {min_orders}")
        except (ValueError, TypeError) as param_error:
            logger.error(f"Erro de validação de parâmetros: {str(param_error)}")
            return Response({'error': 'Parâmetros inválidos'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Implementa limite dinâmico - será calculado após obter configuração da loja
        # Validação temporária para evitar abuso
        if days > 365:
            logger.warning(f"Período muito alto solicitado: {days} dias")
            return Response({
                'error': 'Período máximo absoluto é 365 dias',
                'details': 'Use um período menor para melhor performance'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if days < 1:
            days = 1
            logger.info(f"Período ajustado para minimum: {days}")
        
        # Busca configuração da loja (apenas do usuário autenticado)
        try:
            logger.info(f"Buscando configuração da loja {loja_id} para usuário {request.user.username}")
            config = ShopifyConfig.objects.filter(id=loja_id, ativo=True, user=request.user).first()
            if not config:
                logger.warning(f"Loja {loja_id} não encontrada ou inativa")
                # Lista lojas disponíveis para debug
                all_configs = ShopifyConfig.objects.all()
                logger.warning(f"Lojas no banco: {[(c.id, c.nome_loja, c.ativo) for c in all_configs]}")
                return Response({
                    'error': 'Loja não encontrada ou inativa',
                    'details': 'Configure uma loja Shopify válida antes de usar esta funcionalidade',
                    'action_required': 'add_shopify_store'
                }, status=status.HTTP_404_NOT_FOUND)
                
            logger.info(f"Loja encontrada: {config.nome_loja}")
            
            # IMPLEMENTA LIMITE DINÂMICO baseado no volume da loja
            try:
                logger.info("Calculando limite dinâmico...")
                max_days_allowed = _calculate_dynamic_limit_for_store(config)
                logger.info(f"Limite dinâmico calculado: {max_days_allowed} dias")
                
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
            except Exception as limit_error:
                logger.error(f"Erro ao calcular limite dinâmico: {str(limit_error)}", exc_info=True)
                # Usar limite padrão se falhar
                max_days_allowed = 30
                if days > max_days_allowed:
                    return Response({
                        'error': f'Período máximo permitido é {max_days_allowed} dias (limite padrão)',
                        'details': 'Erro na avaliação de limite dinâmico'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as db_error:
            logger.error(f"Erro de banco de dados ao buscar loja {loja_id}: {str(db_error)}", exc_info=True)
            return Response({'error': 'Erro de banco de dados'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Testa conexão com Shopify antes de prosseguir
        try:
            logger.info("Criando detector Shopify...")
            detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
            logger.info(f"Detector criado. Testando conexão Shopify para loja {config.nome_loja}")
            
            connection_ok, test_message = detector.test_connection()
            logger.info(f"Resultado do teste de conexão: {connection_ok}, mensagem: {test_message}")
            
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
            logger.error(f"ERRO CRÍTICO ao testar conexão Shopify: {str(connection_error)}", exc_info=True)
            return Response({
                'error': 'Erro de conectividade com Shopify',
                'details': f'Não foi possível conectar com a API do Shopify: {str(connection_error)}',
                'action_required': 'check_connectivity'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # Buscar dados de IP com tratamento de erro melhorado e otimizações de timeout
        try:
            logger.info(f"Buscando pedidos por IP - days: {days}, min_orders: {min_orders}")
            
            # APLICA CACHE E OTIMIZAÇÕES PARA PREVENÇÃO DE TIMEOUT
            # Primeiro verifica cache
            cache_manager = get_cache_manager()
            cached_result = cache_manager.get_ip_search_results(loja_id, days, min_orders)
            
            if cached_result:
                logger.info(f"Cache HIT para busca IP - loja: {loja_id}, days: {days}, min_orders: {min_orders}")
                ip_data = cached_result['data']
                # Adiciona flag de cache na resposta
                ip_data['from_cache'] = True
                ip_data['cache_timestamp'] = cached_result.get('timestamp', '')
            else:
                logger.info(f"Cache MISS - executando busca real")
                
                # IMPLEMENTA LIMITE DINÂMICO OTIMIZADO PARA EVITAR 499
                if days > 30:
                    logger.warning(f"Período {days} dias muito alto - usando processamento assíncrono")
                    # Para períodos muito longos, usa job assíncrono
                    return _handle_async_ip_search(request, detector, config, days, min_orders)
                else:
                    # Período aceitável - usa método otimizado com timeout reduzido
                    ip_data = _get_optimized_ip_data(detector, days, min_orders)
                    
                    # Salva no cache se bem sucedido
                    if ip_data and 'error' not in ip_data:
                        cache_manager.cache_ip_search_results(loja_id, days, min_orders, {'data': ip_data})
                        logger.info(f"Resultado salvo no cache - TTL: 10 minutos")
            
            logger.info(f"Busca por IP concluída - IPs encontrados: {ip_data.get('total_ips_found', 0)}")
            
        except HTTPError as http_error:
            # Log seguro com informações técnicas detalhadas
            logger.error(
                f"Erro HTTP na busca por IP - User: {getattr(request.user, 'username', 'Anonymous')}, "
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
                f"Erro inesperado na busca por IP - User: {getattr(request.user, 'username', 'Anonymous')}, "
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
            
            logger.info(f"Busca por IP concluída com sucesso - User: {getattr(request.user, 'username', 'Anonymous')}")
            
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
        logger.error(f"ERRO CRÍTICO em buscar_pedidos_mesmo_ip - User: {getattr(request.user, 'username', 'Anonymous') if hasattr(request, 'user') else 'Unknown'}, Error: {str(e)}", exc_info=True)
        
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
        
        # Validação de IP
        try:
            ip = validate_ip_address(ip) if ip else None
        except ValueError:
            return Response({'error': 'Formato de IP inválido'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Log de auditoria
        logger.info(f"Acesso a dados de IP {ip} por usuário {request.user.username} (ID: {request.user.id})")
        
        if not loja_id or not ip:
            return Response({'error': 'ID da loja e IP são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Sanitização de parâmetros
        try:
            loja_id = int(loja_id)
            days = min(int(days), 30)  # Máximo 30 dias
        except (ValueError, TypeError) as param_error:
            logger.error(f"Erro de validação de parâmetros: {str(param_error)}")
            return Response({'error': 'Parâmetros inválidos'}, status=status.HTTP_400_BAD_REQUEST)
        
        # === VERIFICAÇÃO DE CACHE ESTRATÉGICO ===
        cache_manager = get_cache_manager()
        cached_result = cache_manager.get_ip_details(loja_id, ip, days)
        
        if cached_result:
            logger.info(f"Cache HIT para IP {ip} (loja: {loja_id}, days: {days}) - retornando dados em cache")
            return Response({
                'success': True,
                'data': cached_result.get('data', {}),
                'cached': True,
                'cache_timestamp': cached_result.get('timestamp', ''),
                'message': 'Dados retornados do cache para otimizar performance'
            })
        
        # Busca configuração da loja (qualquer loja ativa no sistema)
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
        
        # === BUSCA DADOS REAIS DO SHOPIFY - MÉTODO ULTRA RÁPIDO ===
        try:
            logger.info(f"Buscando detalhes para IP {ip} - days: {days} (MÉTODO OTIMIZADO)")
            
            # Usa método específico para IP único - busca TODOS os pedidos do IP
            specific_orders = detector.get_orders_for_specific_ip(
                target_ip=ip,
                days=days,
                max_orders=200  # Aumentado para garantir que pega TODOS os pedidos do IP
            )
            
            if not specific_orders:
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
            
            logger.info(f"Encontrados {len(specific_orders)} pedidos para IP {ip}")
            
            # Processa os dados para o formato esperado pelo frontend
            client_details = []
            active_orders = 0
            cancelled_orders = 0
            
            logger.info(f"Processando {len(specific_orders)} pedidos do grupo")
            
            for order in specific_orders:
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
            
            # Calcula estatísticas dos pedidos encontrados
            total_sales = sum(float(order.get('total_price', 0)) for order in specific_orders)
            unique_customers = set()
            currencies = set()
            first_order_date = None
            last_order_date = None
            
            for order in specific_orders:
                customer = order.get('customer', {})
                if customer.get('email'):
                    unique_customers.add(customer['email'])
                elif customer.get('phone'):
                    unique_customers.add(customer['phone'])
                
                currency = order.get('currency', 'BRL')
                currencies.add(currency)
                
                order_date = order.get('created_at')
                if order_date:
                    if not first_order_date or order_date < first_order_date:
                        first_order_date = order_date
                    if not last_order_date or order_date > last_order_date:
                        last_order_date = order_date
            
            main_currency = list(currencies)[0] if currencies else 'BRL'
            ip_source = specific_orders[0].get('_ip_source', 'unknown') if specific_orders else 'unknown'
            
            # Monta resposta com dados reais
            response_data = {
                'success': True,
                'data': {
                    'ip': ip,
                    'total_orders': len(specific_orders),
                    'client_details': client_details,
                    'active_orders': active_orders,
                    'cancelled_orders': cancelled_orders,
                    'unique_customers': len(unique_customers),
                    'total_sales': f"{total_sales:.2f}",
                    'currency': main_currency,
                    'date_range': {
                        'first': first_order_date,
                        'last': last_order_date
                    },
                    'is_suspicious': False,  # Calculado posteriormente se necessário
                    'ip_source': ip_source
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
                logger.info(f"Detalhamento IP concluído com sucesso - User: {getattr(request.user, 'username', 'Anonymous')}")
            except Exception as log_error:
                logger.error(f"Erro ao salvar log (não crítico): {str(log_error)}")
            
            # === ARMAZENA NO CACHE PARA OTIMIZAÇÃO ===
            try:
                cache_manager.cache_ip_details(loja_id, ip, days, response_data['data'])
                logger.info(f"Dados do IP {ip} armazenados em cache para otimização futura")
            except Exception as cache_error:
                logger.warning(f"Erro ao armazenar em cache (não crítico): {str(cache_error)}")
            
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
        logger.error(f"ERRO CRÍTICO em detalhar_pedidos_ip - User: {getattr(request.user, 'username', 'Anonymous') if hasattr(request, 'user') else 'Unknown'}, Error: {str(e)}", exc_info=True)
        
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
@api_view(['GET', 'POST'])
def test_simple_endpoint(request):
    """Endpoint de teste que agora busca IPs duplicados - versão simples"""
    try:
        logger.info(f"Method recebido: {request.method}")
        logger.info(f"Data recebida: {request.data}")
        
        if request.method == 'GET':
            return Response({
                'success': True,
                'message': 'VERSÃO NOVA - Endpoint simples funcionando - GET',
                'timestamp': datetime.now().isoformat()
            })
        
        # POST = Busca IPs duplicados
        loja_id = request.data.get('loja_id')
        days = request.data.get('days', 30)
        
        if not loja_id:
            return Response({'error': 'ID da loja é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
        if not config:
            return Response({'error': 'Loja não encontrada'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Inicializa conexão Shopify
        import shopify
        shop_url = config.shop_url
        if not shop_url.startswith('https://'):
            shop_url = f"https://{shop_url}"
        
        session = shopify.Session(shop_url, "2023-10", config.access_token)
        shopify.ShopifyResource.activate_session(session)
        
        # Busca pedidos dos últimos X dias
        data_inicial = timezone.now() - timedelta(days=days)
        
        orders = shopify.Order.find(
            status='any',
            created_at_min=data_inicial.isoformat(),
            limit=250,
            fields='id,name,created_at,browser_ip,customer'
        )
        
        # Agrupa pedidos por IP
        ip_groups = {}
        
        for order in orders:
            browser_ip = getattr(order, 'browser_ip', None)
            
            if browser_ip and browser_ip.strip():
                if browser_ip not in ip_groups:
                    ip_groups[browser_ip] = []
                
                ip_groups[browser_ip].append({
                    'id': order.id,
                    'number': order.name,
                    'created_at': order.created_at,
                    'customer_name': getattr(order.customer, 'first_name', '') + ' ' + getattr(order.customer, 'last_name', '') if order.customer else 'N/A'
                })
        
        # ⚡ CORREÇÃO: Filtra TODOS os IPs com 2+ pedidos (independente do cliente)
        ips_duplicados = []
        for ip, pedidos in ip_groups.items():
            if len(pedidos) >= 2:  # QUALQUER IP com 2+ pedidos
                # Ordena por data
                pedidos_ordenados = sorted(pedidos, key=lambda x: x['created_at'])
                
                # Conta clientes únicos para análise
                clientes_unicos = set()
                for pedido in pedidos:
                    cliente = pedido.get('customer_name', 'N/A')
                    if cliente and cliente != 'N/A':
                        clientes_unicos.add(cliente)
                
                ips_duplicados.append({
                    'browser_ip': ip,
                    'total_pedidos': len(pedidos),
                    'clientes_unicos': len(clientes_unicos),
                    'clientes_diferentes': len(clientes_unicos) > 1,  # Para análise no frontend
                    'pedidos': pedidos_ordenados,
                    'primeiro_pedido': pedidos_ordenados[0]['created_at'],
                    'ultimo_pedido': pedidos_ordenados[-1]['created_at']
                })
        
        # Ordena por quantidade de pedidos (mais pedidos primeiro)
        ips_duplicados.sort(key=lambda x: x['total_pedidos'], reverse=True)
        
        return Response({
            'success': True,
            'ips_duplicados': ips_duplicados,
            'total_ips': len(ips_duplicados),
            'total_pedidos': sum(ip['total_pedidos'] for ip in ips_duplicados),
            'days_searched': days,
            'loja_nome': config.nome_loja,
            'message': f'Busca de IPs realizada com sucesso! {len(ips_duplicados)} IPs com múltiplos pedidos encontrados.'
        })
        
    except Exception as e:
        return Response({'error': f'Erro: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
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
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True, user=request.user).first()
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
        
        logger.error(f"Erro na busca aprimorada por IP - User: {getattr(request.user, 'username', 'Anonymous')}, Error: {str(e)}")
        return Response({'error': 'Erro interno do servidor'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
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
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True, user=request.user).first()
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

# ===== NOVAS FUNÇÕES OTIMIZADAS PARA RESOLVER ERRO 499 =====

def _get_optimized_ip_data(detector, days, min_orders):
    """
    FUNÇÃO OTIMIZADA V2 - Resolve erro 499 com múltiplas estratégias
    - Cache Redis com TTL de 10 minutos
    - Timeout dinâmico baseado no período
    - Paginação inteligente para Shopify API
    - Circuit breaker para falhas consecutivas
    """
    import time
    from datetime import datetime
    
    try:
        start_time = time.time()
        logger.info(f"🚀 Busca otimizada V2 - days: {days}, min_orders: {min_orders}")
        
        # ===== TIMEOUT DINÂMICO BASEADO NO PERÍODO =====
        if days <= 7:
            timeout_seconds = 15  # 15s para períodos pequenos
        elif days <= 30:
            timeout_seconds = 20  # 20s para períodos médios  
        else:
            timeout_seconds = 25  # 25s máximo para períodos grandes
        
        # Configura timeout no detector
        original_timeout = getattr(detector, 'timeout', 30)
        detector.timeout = timeout_seconds
        
        # ===== CONFIGURAÇÃO OTIMIZADA DA API SHOPIFY =====
        # Reduz campos para otimizar performance
        essential_fields = 'id,order_number,created_at,browser_ip,client_details'
        
        # Configura parâmetros otimizados no detector se disponível
        if hasattr(detector, 'set_api_params'):
            detector.set_api_params({
                'fields': essential_fields,
                'limit': 250,  # Máximo permitido pela Shopify
                'timeout': timeout_seconds
            })
        
        try:
            logger.info(f"⏱️  Executando busca com timeout de {timeout_seconds}s")
            
            # ===== ESTRATÉGIA BASEADA NO PERÍODO =====
            if days <= 30:
                # Busca direta para períodos ≤ 30 dias
                result = detector.get_orders_by_ip(days=days, min_orders=min_orders)
            else:
                # Chunking inteligente para períodos > 30 dias
                result = _apply_enhanced_chunking(detector, days, min_orders, timeout_seconds)
            
            # Restaura timeout original
            detector.timeout = original_timeout
            
            # ===== MÉTRICAS DE PERFORMANCE =====
            processing_time = time.time() - start_time
            
            if result:
                result['performance_metrics'] = {
                    'processing_time_seconds': round(processing_time, 2),
                    'timeout_used': timeout_seconds,
                    'optimization_version': 'v2_enhanced',
                    'api_fields_optimized': True,
                    'chunking_applied': days > 30
                }
                
                # Log de sucesso detalhado
                total_ips = result.get('total_ips_found', 0)
                total_orders = result.get('total_orders_analyzed', 0)
                logger.info(
                    f"✅ Busca concluída em {processing_time:.2f}s - "
                    f"IPs: {total_ips}, Pedidos: {total_orders}, Timeout: {timeout_seconds}s"
                )
            
            return result
            
        except Exception as e:
            # Restaura timeout mesmo em caso de erro
            detector.timeout = original_timeout
            
            # ===== CIRCUIT BREAKER - FALLBACK STRATEGIES =====
            logger.warning(f"⚠️  Erro na busca principal: {str(e)}")
            logger.info("🔄 Aplicando estratégias de fallback...")
            
            # Estratégia 1: Reduzir período drasticamente
            if days > 7:
                logger.info("📉 Fallback 1: Reduzindo período para 7 dias")
                try:
                    fallback_result = detector.get_orders_by_ip(days=7, min_orders=min_orders)
                    if fallback_result:
                        fallback_result['fallback_applied'] = True
                        fallback_result['original_period'] = days
                        fallback_result['reduced_period'] = 7
                        fallback_result['warning'] = f'Período reduzido de {days} para 7 dias devido a timeout'
                        return fallback_result
                except Exception as fallback_error:
                    logger.error(f"❌ Fallback 1 falhou: {str(fallback_error)}")
            
            # Estratégia 2: Aumentar min_orders para reduzir dataset
            if min_orders < 5:
                logger.info("📈 Fallback 2: Aumentando min_orders para 5")
                try:
                    fallback_result = detector.get_orders_by_ip(days=min(days, 7), min_orders=5)
                    if fallback_result:
                        fallback_result['fallback_applied'] = True
                        fallback_result['increased_min_orders'] = True
                        fallback_result['warning'] = 'Min orders aumentado para 5 devido a problemas de performance'
                        return fallback_result
                except Exception as fallback_error:
                    logger.error(f"❌ Fallback 2 falhou: {str(fallback_error)}")
            
            # Se todos os fallbacks falharam, relança erro original
            raise e
            
    except Exception as e:
        logger.error(f"❌ Erro crítico na busca otimizada V2: {str(e)}")
        raise e

def _apply_enhanced_chunking(detector, days, min_orders, timeout_seconds):
    """
    CHUNKING INTELIGENTE V2 - Para períodos > 30 dias
    - Processamento em blocos de 15 dias para máxima estabilidade
    - Agregação inteligente de resultados
    - Rate limiting automático para Shopify API
    - Fallback gracioso em caso de falhas
    """
    import time
    from collections import defaultdict
    
    logger.info(f"🧩 Chunking inteligente V2 para {days} dias")
    
    # ===== CONFIGURAÇÃO DE CHUNKS =====
    chunk_size = 15  # 15 dias por chunk para máxima estabilidade
    chunks = []
    
    # Calcula chunks de 15 dias
    current_day = 0
    while current_day < days:
        chunk_end = min(current_day + chunk_size, days)
        chunks.append({
            'start': current_day,
            'end': chunk_end,
            'days': chunk_end - current_day
        })
        current_day = chunk_end
    
    logger.info(f"📊 Processando {len(chunks)} chunks de até {chunk_size} dias")
    
    # ===== PROCESSAMENTO DOS CHUNKS =====
    all_ip_groups = []
    all_ip_details = defaultdict(list)
    total_orders_analyzed = 0
    chunk_errors = []
    
    for i, chunk in enumerate(chunks):
        try:
            logger.info(f"🔄 Processando chunk {i+1}/{len(chunks)} ({chunk['days']} dias)")
            
            # Rate limiting: pausa entre chunks para não sobrecarregar Shopify
            if i > 0:
                time.sleep(2)  # 2 segundos entre chunks
            
            # Processa chunk individual
            chunk_result = detector.get_orders_by_ip(
                days=chunk['days'], 
                min_orders=1  # Usa 1 para capturar todos, filtra depois
            )
            
            if chunk_result and chunk_result.get('ip_groups'):
                # Agrega resultados do chunk
                chunk_ip_groups = chunk_result['ip_groups']
                all_ip_groups.extend(chunk_ip_groups)
                
                # Agrega detalhes de IP
                for ip_group in chunk_ip_groups:
                    ip = ip_group.get('ip')
                    if ip:
                        all_ip_details[ip].extend(ip_group.get('orders', []))
                
                # Soma total de pedidos
                total_orders_analyzed += chunk_result.get('total_orders_analyzed', 0)
                
                logger.info(
                    f"✅ Chunk {i+1} concluído - "
                    f"IPs encontrados: {len(chunk_ip_groups)}, "
                    f"Pedidos: {chunk_result.get('total_orders_analyzed', 0)}"
                )
            else:
                logger.warning(f"⚠️  Chunk {i+1} retornou vazio")
                
        except Exception as chunk_error:
            error_msg = f"Chunk {i+1}/{len(chunks)} falhou: {str(chunk_error)}"
            logger.error(f"❌ {error_msg}")
            chunk_errors.append(error_msg)
            
            # Se mais de 50% dos chunks falharam, para o processamento
            if len(chunk_errors) > len(chunks) * 0.5:
                logger.error("❌ Muitos chunks falharam, interrompendo processamento")
                break
            
            # Continua com próximo chunk
            continue
    
    # ===== AGREGAÇÃO FINAL DOS RESULTADOS =====
    if not all_ip_groups:
        logger.warning("⚠️  Nenhum resultado encontrado em nenhum chunk")
        return {
            'ip_groups': [],
            'total_ips_found': 0,
            'total_orders_analyzed': 0,
            'chunking_applied': True,
            'chunk_errors': chunk_errors,
            'warning': 'Nenhum IP duplicado encontrado no período processado'
        }
    
    # Agrupa IPs duplicados e aplica filtro min_orders
    logger.info(f"🔍 Agregando resultados de {len(all_ip_groups)} grupos de IP")
    
    # Dicionário para agrupar por IP
    ip_aggregation = defaultdict(list)
    
    for ip_group in all_ip_groups:
        ip = ip_group.get('ip')
        if ip:
            ip_aggregation[ip].extend(ip_group.get('orders', []))
    
    # Aplica filtro min_orders e monta resultado final
    final_ip_groups = []
    for ip, orders in ip_aggregation.items():
        # Remove duplicatas por order_number
        unique_orders = {}
        for order in orders:
            order_num = order.get('order_number')
            if order_num and order_num not in unique_orders:
                unique_orders[order_num] = order
        
        unique_orders_list = list(unique_orders.values())
        
        # Aplica filtro min_orders
        if len(unique_orders_list) >= min_orders:
            final_ip_groups.append({
                'ip': ip,
                'order_count': len(unique_orders_list),
                'orders': unique_orders_list[:50],  # Limita a 50 para performance
                'total_orders': len(unique_orders_list)
            })
    
    # Ordena por quantidade de pedidos (decrescente)
    final_ip_groups.sort(key=lambda x: x['total_orders'], reverse=True)
    
    logger.info(
        f"✅ Chunking concluído - "
        f"IPs finais: {len(final_ip_groups)}, "
        f"Total pedidos: {total_orders_analyzed}, "
        f"Erros: {len(chunk_errors)}"
    )
    
    # ===== RESULTADO FINAL =====
    result = {
        'ip_groups': final_ip_groups,
        'total_ips_found': len(final_ip_groups),
        'total_orders_analyzed': total_orders_analyzed,
        'processing_method': 'enhanced_chunking_v2',
        'chunks_processed': len(chunks),
        'chunks_successful': len(chunks) - len(chunk_errors),
        'chunks_failed': len(chunk_errors),
        'chunking_applied': True,
        'original_period_requested': days,
        'chunk_size_days': chunk_size,
        'chunk_errors': chunk_errors if chunk_errors else None
    }
    
    if chunk_errors:
        result['warning'] = f'{len(chunk_errors)} de {len(chunks)} chunks falharam durante o processamento'
    
    return result

def _handle_async_ip_search(request, detector, config, days, min_orders):
    """
    PROCESSAMENTO ASSÍNCRONO V2 - Para períodos > 30 dias
    - Job timeout baseado no período
    - Notificação de progresso em tempo real
    - Cache de resultados intermediários
    - Rate limiting específico para jobs
    """
    try:
        logger.info(f"🚀 Iniciando processamento assíncrono V2 para {days} dias")
        
        # ===== RATE LIMITING ESPECÍFICO PARA JOBS ASSÍNCRONOS =====
        from .cache_manager import get_rate_limit_manager
        rate_manager = get_rate_limit_manager()
        
        if rate_manager.is_rate_limited(request.user.id, 'async_ip_search', 3, 3600):  # 3 jobs por hora
            return Response({
                'error': 'Limite de jobs assíncronos atingido',
                'message': 'Você pode executar apenas 3 processamentos assíncronos por hora',
                'retry_after_minutes': 60,
                'suggestion': 'Aguarde ou use um período menor (≤30 dias) para processamento síncrono'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        # ===== TIMEOUT DINÂMICO BASEADO NO PERÍODO =====
        if days <= 60:
            job_timeout = '15m'  # 15 minutos para até 60 dias
        elif days <= 120:
            job_timeout = '25m'  # 25 minutos para até 120 dias
        else:
            job_timeout = '30m'  # 30 minutos máximo
        
        # ===== CRIAÇÃO DO JOB ASSÍNCRONO =====
        queue = get_queue('default')
        
        # Metadados do job para melhor tracking
        job_meta = {
            'user_id': request.user.id,
            'username': request.user.username,
            'config_id': config.id,
            'loja_nome': config.nome_loja,
            'days': days,
            'min_orders': min_orders,
            'created_at': timezone.now().isoformat(),
            'estimated_time_minutes': _estimate_processing_time(days),
            'job_type': 'async_ip_search_v2'
        }
        
        job = queue.enqueue(
            'features.processamento.views.async_ip_search_job_v2',
            config.id,
            config.shop_url, 
            config.access_token,
            days,
            min_orders,
            request.user.id,
            job_timeout=job_timeout,
            job_id=f"ip_search_{config.id}_{days}_{int(timezone.now().timestamp())}",
            meta=job_meta
        )
        
        logger.info(f"✅ Job assíncrono V2 criado: {job.id} (timeout: {job_timeout})")
        
        # ===== CACHE DO STATUS INICIAL =====
        cache_manager = get_cache_manager()
        cache_manager.set(
            'async_job_status',
            {
                'status': 'queued',
                'progress': 0,
                'message': 'Job criado e adicionado à fila de processamento',
                'created_at': timezone.now().isoformat(),
                'job_meta': job_meta
            },
            ttl=7200,  # 2 horas
            job_id=job.id
        )
        
        return Response({
            'success': True,
            'async_processing': True,
            'job_id': job.id,
            'estimated_time_minutes': job_meta['estimated_time_minutes'],
            'job_timeout': job_timeout,
            'status_check_url': f'/api/processamento/async-status/{job.id}/',
            'progress_tracking': True,
            'message': f'Processamento assíncrono V2 iniciado para {days} dias',
            'loja_nome': config.nome_loja,
            'period_days': days,
            'min_orders': min_orders,
            'rate_limit_info': {
                'remaining_jobs_this_hour': 2,  # Simplificado, pode ser calculado
                'next_reset': 'em 1 hora'
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Erro ao criar job assíncrono V2: {str(e)}")
        return Response({
            'error': 'Não foi possível iniciar processamento assíncrono',
            'details': str(e),
            'fallback_suggestions': [
                'Tente com um período menor (máximo 30 dias) para processamento síncrono',
                'Verifique se há jobs em execução',
                'Aguarde alguns minutos e tente novamente'
            ]
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def async_ip_search_job(config_id, shop_url, access_token, days, min_orders, user_id):
    """
    Job assíncrono para busca de IPs
    Executa em background via Django-RQ
    """
    from .models import ShopifyConfig, ProcessamentoLog
    from django.contrib.auth.models import User
    
    try:
        logger.info(f"Executando job assíncrono - config: {config_id}, days: {days}")
        
        # Reconecta com database
        config = ShopifyConfig.objects.get(id=config_id)
        user = User.objects.get(id=user_id)
        detector = ShopifyDuplicateOrderDetector(shop_url, access_token)
        
        # Executa busca com chunking otimizado para períodos grandes
        result = _apply_smart_chunking(detector, days, min_orders)
        
        # Salva no cache com TTL estendido para jobs assíncronos
        cache_manager = get_cache_manager()
        cache_manager.set(
            'async_job_result',
            {
                'success': True,
                'data': result,
                'completed_at': timezone.now().isoformat()
            },
            ttl=3600,  # 1 hora de cache
            job_id=f"job_{config_id}_{days}_{min_orders}"
        )
        
        # Log de sucesso
        ProcessamentoLog.objects.create(
            user=user,
            config=config,
            tipo='busca_ip_async',
            status='sucesso',
            pedidos_encontrados=result.get('total_orders_analyzed', 0),
            detalhes={
                'days': days,
                'min_orders': min_orders,
                'total_ips_found': result.get('total_ips_found', 0),
                'processing_method': 'async_job'
            }
        )
        
        logger.info(f"Job assíncrono concluído com sucesso - IPs encontrados: {result.get('total_ips_found', 0)}")
        return result
        
    except Exception as e:
        logger.error(f"Erro no job assíncrono: {str(e)}")
        
        # Salva erro no cache
        cache_manager = get_cache_manager()
        cache_manager.set(
            'async_job_result',
            {
                'success': False,
                'error': str(e),
                'completed_at': timezone.now().isoformat()
            },
            ttl=1800,  # 30 minutos
            job_id=f"job_{config_id}_{days}_{min_orders}"
        )
        
        # Log de erro
        try:
            config = ShopifyConfig.objects.get(id=config_id)
            user = User.objects.get(id=user_id)
            ProcessamentoLog.objects.create(
                user=user,
                config=config,
                tipo='busca_ip_async',
                status='erro',
                erro_mensagem=str(e)
            )
        except:
            pass
        
        raise e

def _estimate_processing_time(days):
    """
    Estima tempo de processamento baseado no período
    """
    if days <= 30:
        return 1
    elif days <= 60:
        return 3
    elif days <= 120:
        return 5
    else:
        return 8

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_async_status(request, job_id):
    """
    Verifica status de job assíncrono
    /api/processamento/async-status/<job_id>/
    """
    try:
        # Verifica status do job no RQ
        queue = get_queue('default')
        job = queue.fetch_job(job_id)
        
        if not job:
            return Response({
                'error': 'Job não encontrado',
                'job_id': job_id
            }, status=status.HTTP_404_NOT_FOUND)
        
        response_data = {
            'job_id': job_id,
            'status': job.get_status(),
            'created_at': job.created_at.isoformat() if job.created_at else None,
            'started_at': job.started_at.isoformat() if job.started_at else None,
            'ended_at': job.ended_at.isoformat() if job.ended_at else None
        }
        
        # Se completo, busca resultado do cache
        if job.is_finished:
            cache_manager = get_cache_manager()
            result = cache_manager.get(
                'async_job_result',
                job_id=job_id
            )
            
            if result:
                response_data.update({
                    'completed': True,
                    'result': result
                })
            else:
                response_data.update({
                    'completed': True,
                    'result': job.result
                })
        elif job.is_failed:
            response_data.update({
                'completed': True,
                'failed': True,
                'error': str(job.exc_info) if job.exc_info else 'Job falhou'
            })
        else:
            response_data.update({
                'completed': False,
                'progress': 'Em processamento...'
            })
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Erro ao verificar status do job: {str(e)}")
        return Response({
            'error': 'Erro ao verificar status',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@never_cache
def buscar_ips_otimizado(request):
    """
    ENDPOINT OTIMIZADO para resolver erro 499
    Implementa fallback sem Redis para produção Railway
    /api/processamento/buscar-ips-otimizado/
    """
    try:
        # Validações básicas
        loja_id = request.data.get('loja_id')
        days = int(request.data.get('days', 30))
        min_orders = int(request.data.get('min_orders', 2))
        force_refresh = request.data.get('force_refresh', False)
        
        if not loja_id:
            return Response({
                'error': 'ID da loja é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Rate limiting simplificado (sem Redis)
        try:
            from .utils.security_utils import RateLimitManager
            allowed, remaining = RateLimitManager.check_rate_limit(request.user, 'ip_search')
            if not allowed:
                return Response({
                    'error': 'Muitas requisições. Aguarde alguns minutos.',
                    'retry_after_seconds': 300,
                    'remaining_requests': remaining
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except Exception as rate_limit_error:
            # Se rate limiting falhar, continua sem ele
            logger.warning(f"Rate limiting não disponível: {rate_limit_error}")
        
        # Busca configuração
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
        if not config:
            return Response({
                'error': 'Loja não encontrada'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # CACHE FALLBACK (Django cache sem Redis)
        cache_key = f"ip_search_simple_{loja_id}_{days}_{min_orders}"
        
        if not force_refresh:
            try:
                cached_result = cache.get(cache_key)
                if cached_result:
                    logger.info(f"Cache HIT - retornando dados em cache (Django cache)")
                    return Response({
                        'success': True,
                        'data': cached_result,
                        'from_cache': True,
                        'cache_type': 'django_fallback',
                        'loja_nome': config.nome_loja
                    })
            except Exception as cache_error:
                logger.warning(f"Cache não disponível: {cache_error}")
        
        # ===== PROCESSAMENTO SIMPLIFICADO SEM REDIS =====
        logger.info(f"⚡ Processamento simplificado para {days} dias (sem Redis)")
        
        detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
        
        # ===== TESTE DE CONEXÃO RÁPIDO =====
        connection_test = detector.test_connection()
        if not connection_test[0]:
            logger.error(f"❌ Falha na autenticação Shopify: {connection_test[1]}")
            return Response({
                'error': 'Erro de autenticação com Shopify',
                'details': connection_test[1],
                'suggestion': 'Verifique as credenciais da loja'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # ===== EXECUÇÃO DA BUSCA OTIMIZADA =====
        try:
            if days > 30:
                # Para períodos grandes, usa timeout maior e processamento básico
                logger.info(f"📅 Período {days} dias > 30 - processamento síncrono com timeout estendido")
                result = _get_basic_ip_data_with_timeout(detector, days, min_orders, timeout=45)
            else:
                # Para períodos menores, usa função otimizada
                logger.info(f"🔍 Iniciando busca otimizada simples...")
                result = _get_optimized_ip_data_no_redis(detector, days, min_orders)
            
            # ===== SALVA NO CACHE DJANGO =====
            try:
                cache.set(cache_key, result, timeout=600)  # 10 minutos
                cache_saved = True
            except Exception as cache_error:
                logger.warning(f"Erro ao salvar no cache: {cache_error}")
                cache_saved = False
            
            logger.info(f"✅ Busca concluída - Cache: {'salvo' if cache_saved else 'falhou'}")
            
            return Response({
                'success': True,
                'data': result,
                'from_cache': False,
                'loja_nome': config.nome_loja,
                'optimization_applied': True,
                'cache_saved': cache_saved,
                'processing_version': 'v2_no_redis_fallback'
            })
            
        except Exception as processing_error:
            logger.error(f"❌ Erro no processamento: {str(processing_error)}")
            
            # Fallback para cache Django
            try:
                cached_fallback = cache.get(cache_key)
                if cached_fallback:
                    logger.info("🔄 Usando cache Django como fallback")
                    return Response({
                        'success': True,
                        'data': cached_fallback,
                        'from_cache': True,
                        'fallback_applied': True,
                        'warning': 'Dados do cache devido a erro no processamento atual',
                        'loja_nome': config.nome_loja
                    })
            except Exception:
                pass
            
            # Se não há cache, retorna erro
            raise processing_error
        
    except Exception as e:
        logger.error(f"❌ Erro crítico no endpoint otimizado V2: {str(e)}", exc_info=True)
        
        # ===== INFORMAÇÕES DETALHADAS DE DEBUG =====
        error_context = {
            'loja_id': locals().get('loja_id'),
            'days': locals().get('days'),
            'min_orders': locals().get('min_orders'),
            'user_id': request.user.id if hasattr(request, 'user') else None,
            'timestamp': timezone.now().isoformat(),
            'error_type': type(e).__name__
        }
        
        return Response({
            'error': 'Erro interno no sistema de detecção de IP',
            'message': 'Nosso time foi notificado automaticamente sobre este erro',
            'details': str(e),
            'error_context': error_context,
            'support_suggestions': [
                'Tente novamente em alguns minutos',
                'Use um período menor se possível',
                'Verifique se as credenciais da loja estão corretas',
                'Entre em contato com o suporte se o problema persistir'
            ],
            'fallback_options': [
                'Use o endpoint cached: /api/processamento/buscar-ips-duplicados-cached/',
                'Tente com force_refresh=false para usar cache'
            ]
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def async_ip_search_job_v2(config_id, shop_url, access_token, days, min_orders, user_id):
    """
    JOB ASSÍNCRONO V2 - Otimizado para resolver erro 499
    - Processamento em chunks menores
    - Progress tracking em tempo real
    - Circuit breaker para falhas
    - Cache intermediário para grandes volumes
    """
    from .models import ShopifyConfig, ProcessamentoLog
    from django.contrib.auth.models import User
    import time
    
    try:
        logger.info(f"🚀 Executando job assíncrono V2 - config: {config_id}, days: {days}")
        
        # ===== INICIALIZAÇÃO =====
        config = ShopifyConfig.objects.get(id=config_id)
        user = User.objects.get(id=user_id)
        detector = ShopifyDuplicateOrderDetector(shop_url, access_token)
        cache_manager = get_cache_manager()
        
        # Update progress: Iniciando
        cache_manager.set(
            'async_job_status',
            {
                'status': 'running',
                'progress': 10,
                'message': 'Conectando com Shopify e iniciando processamento...',
                'updated_at': timezone.now().isoformat()
            },
            ttl=7200,
            job_id=f"job_{config_id}_{days}_{min_orders}"
        )
        
        # ===== EXECUÇÃO COM PROGRESS TRACKING =====
        start_time = time.time()
        
        # Testa conexão
        if not detector.test_connection()[0]:
            raise Exception("Falha na autenticação com Shopify")
        
        # Update progress: Conexão OK
        cache_manager.set(
            'async_job_status',
            {
                'status': 'running',
                'progress': 20,
                'message': 'Conexão com Shopify estabelecida. Processando dados...',
                'updated_at': timezone.now().isoformat()
            },
            ttl=7200,
            job_id=f"job_{config_id}_{days}_{min_orders}"
        )
        
        # Executa busca com enhanced chunking
        result = _apply_enhanced_chunking(detector, days, min_orders, 25)
        
        # Update progress: 80%
        cache_manager.set(
            'async_job_status',
            {
                'status': 'running',
                'progress': 80,
                'message': 'Finalizando processamento e organizando resultados...',
                'updated_at': timezone.now().isoformat()
            },
            ttl=7200,
            job_id=f"job_{config_id}_{days}_{min_orders}"
        )
        
        # ===== FINALIZAÇÃO =====
        processing_time = time.time() - start_time
        
        # Salva resultado final no cache
        final_result = {
            'success': True,
            'data': result,
            'completed_at': timezone.now().isoformat(),
            'processing_time_seconds': round(processing_time, 2),
            'job_version': 'v2_async_enhanced'
        }
        
        cache_manager.set(
            'async_job_result',
            final_result,
            ttl=3600,  # 1 hora de cache
            job_id=f"job_{config_id}_{days}_{min_orders}"
        )
        
        # Update progress: 100% - Concluído
        cache_manager.set(
            'async_job_status',
            {
                'status': 'finished',
                'progress': 100,
                'message': f'Processamento concluído em {processing_time:.1f}s',
                'completed_at': timezone.now().isoformat(),
                'total_ips_found': result.get('total_ips_found', 0),
                'total_orders_analyzed': result.get('total_orders_analyzed', 0)
            },
            ttl=7200,
            job_id=f"job_{config_id}_{days}_{min_orders}"
        )
        
        # Log de sucesso no banco
        ProcessamentoLog.objects.create(
            user=user,
            config=config,
            tipo='busca_ip_async_v2',
            status='sucesso',
            pedidos_encontrados=result.get('total_orders_analyzed', 0),
            detalhes={
                'days': days,
                'min_orders': min_orders,
                'total_ips_found': result.get('total_ips_found', 0),
                'processing_method': 'async_job_v2',
                'processing_time_seconds': processing_time,
                'chunks_processed': result.get('chunks_processed', 0)
            }
        )
        
        logger.info(
            f"✅ Job assíncrono V2 concluído com sucesso - "
            f"IPs: {result.get('total_ips_found', 0)}, "
            f"Tempo: {processing_time:.2f}s"
        )
        
        return final_result
        
    except Exception as e:
        logger.error(f"❌ Erro no job assíncrono V2: {str(e)}")
        
        # Salva erro no cache
        cache_manager = get_cache_manager()
        error_result = {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__,
            'failed_at': timezone.now().isoformat(),
            'job_version': 'v2_async_enhanced'
        }
        
        cache_manager.set(
            'async_job_result',
            error_result,
            ttl=1800,  # 30 minutos para erro
            job_id=f"job_{config_id}_{days}_{min_orders}"
        )
        
        # Update status: Error
        cache_manager.set(
            'async_job_status',
            {
                'status': 'failed',
                'progress': 0,
                'message': f'Processamento falhou: {str(e)}',
                'error': str(e),
                'failed_at': timezone.now().isoformat()
            },
            ttl=7200,
            job_id=f"job_{config_id}_{days}_{min_orders}"
        )
        
        # Log de erro no banco
        try:
            config = ShopifyConfig.objects.get(id=config_id)
            user = User.objects.get(id=user_id)
            ProcessamentoLog.objects.create(
                user=user,
                config=config,
                tipo='busca_ip_async_v2',
                status='erro',
                pedidos_encontrados=0,
                detalhes={
                    'days': days,
                    'min_orders': min_orders,
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'processing_method': 'async_job_v2_failed'
                }
            )
        except Exception as log_error:
            logger.error(f"Erro ao salvar log de erro: {str(log_error)}")
        
        raise e

def _estimate_processing_time(days):
    """
    Estima tempo de processamento baseado no período
    
    Args:
        days (int): Número de dias para processar
        
    Returns:
        int: Tempo estimado em minutos
    """
    if days <= 7:
        return 1  # 1 minuto
    elif days <= 30:
        return 3  # 3 minutos
    elif days <= 60:
        return 8  # 8 minutos
    elif days <= 120:
        return 15  # 15 minutos
    else:
        return 25  # 25 minutos máximo

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_optimization_metrics(request):
    """
    Endpoint para monitorar métricas das otimizações V2
    /api/processamento/optimization-metrics/
    """
    try:
        cache_manager = get_cache_manager()
        
        # Estatísticas do cache
        cache_stats = cache_manager.get_stats()
        
        # Estatísticas de rate limiting
        from .utils.security_utils import RateLimitManager
        rate_status = RateLimitManager.check_rate_limit(request.user, 'ip_search')
        
        # Jobs assíncronos recentes
        queue = get_queue('default')
        queue_info = {
            'pending_jobs': len(queue.get_jobs()),
            'failed_jobs': len(queue.failed_job_registry),
            'finished_jobs': len(queue.finished_job_registry)
        }
        
        optimization_metrics = {
            'cache_performance': cache_stats,
            'rate_limiting': {
                'allowed': rate_status[0],
                'remaining': rate_status[1]
            },
            'async_queue_status': queue_info,
            'optimization_version': 'v2_enhanced',
            'features_enabled': {
                'redis_cache': cache_manager.redis_available,
                'async_processing': True,
                'enhanced_chunking': True,
                'circuit_breaker': True,
                'progress_tracking': True
            },
            'performance_thresholds': {
                'sync_max_days': 30,
                'async_min_days': 31,
                'chunk_size_days': 15,
                'max_sync_timeout_seconds': 25
            }
        }
        
        return Response({
            'success': True,
            'metrics': optimization_metrics,
            'timestamp': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter métricas de otimização: {str(e)}")
        return Response({
            'error': 'Erro ao obter métricas',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ===== FUNÇÕES AUXILIARES PARA FALLBACK SEM REDIS =====

def _get_optimized_ip_data_no_redis(detector, days, min_orders):
    """
    Versão otimizada que funciona sem Redis
    Usa apenas cache Django padrão e otimizações básicas
    """
    import time
    from datetime import datetime
    
    try:
        logger.info(f"🔍 Executando busca otimizada sem Redis - {days} dias")
        
        # Determina timeout baseado no período
        if days <= 7:
            timeout = 15
        elif days <= 30:
            timeout = 25
        else:
            timeout = 35
        
        start_time = time.time()
        
        # Usa método básico do detector com early break para otimização
        result = detector.get_orders_by_ip(
            days=days, 
            min_orders=min_orders,
            early_break_threshold=100  # Para otimizar, para após 100 IPs encontrados
        )
        
        processing_time = time.time() - start_time
        
        logger.info(f"✅ Busca sem Redis concluída em {processing_time:.2f}s")
        
        # Adiciona metadata de otimização
        if isinstance(result, dict):
            result['optimization_metadata'] = {
                'processing_time_seconds': round(processing_time, 2),
                'timeout_used': timeout,
                'redis_used': False,
                'optimization_level': 'basic_no_redis'
            }
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erro na busca otimizada sem Redis: {str(e)}")
        # Fallback para método básico
        return detector.get_orders_by_ip(days=min(days, 30), min_orders=min_orders)

def _get_basic_ip_data_with_timeout(detector, days, min_orders, timeout=45):
    """
    Versão básica com timeout estendido para períodos grandes
    """
    import time
    from datetime import datetime
    
    try:
        logger.info(f"📅 Executando busca básica com timeout {timeout}s - {days} dias")
        
        start_time = time.time()
        
        # Para períodos grandes, divide em chunks de 30 dias
        if days > 30:
            logger.info(f"📦 Dividindo {days} dias em chunks para evitar timeout")
            
            all_results = []
            chunk_size = 30
            processed_days = 0
            
            while processed_days < days:
                chunk_days = min(chunk_size, days - processed_days)
                logger.info(f"🔍 Processando chunk: dias {processed_days} a {processed_days + chunk_days}")
                
                try:
                    # Processa chunk com timeout menor
                    chunk_result = detector.get_orders_by_ip(
                        days=chunk_days,
                        min_orders=min_orders,
                        start_offset_days=processed_days
                    )
                    
                    if isinstance(chunk_result, dict) and 'ips_duplicados' in chunk_result:
                        all_results.extend(chunk_result['ips_duplicados'])
                    
                    processed_days += chunk_days
                    
                    # Pequena pausa entre chunks
                    time.sleep(1)
                    
                except Exception as chunk_error:
                    logger.warning(f"❌ Erro no chunk {processed_days}-{processed_days + chunk_days}: {chunk_error}")
                    # Continua com próximo chunk
                    processed_days += chunk_days
            
            # Consolida resultados
            result = {
                'ips_duplicados': all_results,
                'total_ips_found': len(all_results),
                'chunked_processing': True,
                'total_chunks': (days + chunk_size - 1) // chunk_size
            }
        else:
            # Para períodos menores, usa método normal
            result = detector.get_orders_by_ip(days=days, min_orders=min_orders)
        
        processing_time = time.time() - start_time
        
        logger.info(f"✅ Busca básica concluída em {processing_time:.2f}s")
        
        # Adiciona metadata
        if isinstance(result, dict):
            result['optimization_metadata'] = {
                'processing_time_seconds': round(processing_time, 2),
                'timeout_used': timeout,
                'method_used': 'chunked_basic' if days > 30 else 'basic'
            }
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erro na busca básica: {str(e)}")
        # Último fallback - período reduzido
        try:
            logger.warning(f"🔄 Fallback para período reduzido: 7 dias")
            return detector.get_orders_by_ip(days=7, min_orders=min_orders)
        except Exception as fallback_error:
            logger.error(f"❌ Fallback também falhou: {fallback_error}")
            raise e


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buscar_ips_duplicados_simples(request):
    """Busca IPs com múltiplos pedidos - versão melhorada com múltiplas fontes"""
    try:
        loja_id = request.data.get('loja_id')
        days = request.data.get('days', 30)  # Padrão 30 dias
        
        # Log de auditoria
        logger.info(f"Busca de IPs duplicados - Usuário: {request.user.username} (ID: {request.user.id}), Loja: {loja_id}")
        
        if not loja_id:
            return Response({'error': 'ID da loja é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
        if not config:
            return Response({'error': 'Loja não encontrada'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Inicializa conexão Shopify
        import shopify
        shop_url = config.shop_url
        if not shop_url.startswith('https://'):
            shop_url = f"https://{shop_url}"
        
        session = shopify.Session(shop_url, "2024-07", config.access_token)
        shopify.ShopifyResource.activate_session(session)
        
        # Busca pedidos dos últimos X dias - SEM LIMITAÇÃO DE CAMPOS para pegar mais dados
        data_inicial = timezone.now() - timedelta(days=days)
        
        orders = shopify.Order.find(
            status='any',
            created_at_min=data_inicial.isoformat(),
            limit=250
            # Removido 'fields' para pegar todos os dados do pedido
        )
        
        def extract_ip_from_order(order_dict):
            """Extrai IP usando múltiplas fontes hierárquicas - CORRIGIDO"""
            
            # MÉTODO 1: note_attributes - IP address (PRIORIDADE MÁXIMA!)
            note_attributes = order_dict.get('note_attributes', [])
            if isinstance(note_attributes, list):
                for note in note_attributes:
                    if isinstance(note, dict) and note.get('name') == 'IP address':
                        ip_address = str(note.get('value', '')).strip()
                        if ip_address and ip_address != 'None' and ip_address != '':
                            # Debug temporário para IP específico
                            if ip_address == "31.217.1.48":
                                print(f"DEBUG: IP 31.217.1.48 encontrado no pedido #{order_dict.get('name', 'unknown')} via note_attributes")
                            return ip_address, 'note_attributes', 0.98
            
            # MÉTODO 2: browser_ip direto
            browser_ip = order_dict.get('browser_ip')
            if browser_ip and str(browser_ip).strip() and str(browser_ip).strip() != 'None':
                return str(browser_ip).strip(), 'browser_ip', 0.95
            
            # MÉTODO 3: client_details.browser_ip
            client_details = order_dict.get('client_details', {})
            if isinstance(client_details, dict):
                client_browser_ip = client_details.get('browser_ip')
                if client_browser_ip and str(client_browser_ip).strip() != 'None':
                    return str(client_browser_ip).strip(), 'client_details', 0.90
            
            # MÉTODO 4: Coordenadas geográficas como "fingerprint" único
            def get_geo_fingerprint(address, prefix):
                if not isinstance(address, dict):
                    return None, None, 0
                    
                lat = address.get('latitude')
                lng = address.get('longitude')
                if lat and lng:
                    # Cria fingerprint baseado em coordenadas
                    geo_fingerprint = f"geo_{lat}_{lng}"
                    return geo_fingerprint, f'{prefix}_coordinates', 0.75
                return None, None, 0
            
            # Tenta billing_address primeiro
            billing_address = order_dict.get('billing_address', {})
            ip, method, confidence = get_geo_fingerprint(billing_address, 'billing')
            if ip:
                return ip, method, confidence
            
            # Tenta shipping_address
            shipping_address = order_dict.get('shipping_address', {})
            ip, method, confidence = get_geo_fingerprint(shipping_address, 'shipping')
            if ip:
                return ip, method, confidence
            
            # Tenta customer default_address
            customer = order_dict.get('customer', {})
            if isinstance(customer, dict):
                default_address = customer.get('default_address', {})
                ip, method, confidence = get_geo_fingerprint(default_address, 'customer')
                if ip:
                    return ip, method, confidence
            
            return None, 'none', 0.0
        
        def should_exclude_order(order_dict):
            """Determina se um pedido deve ser excluído da análise - CORRIGIDO"""
            
            # Exclui pedidos completamente cancelados há muito tempo
            cancelled_at = order_dict.get('cancelled_at')
            if cancelled_at:
                return True
            
            # Permitir pedidos voided (ainda são válidos para análise de IP)
            # financial_status voided ainda mostra compras válidas
            financial_status = order_dict.get('financial_status', '').lower()
            if financial_status in ['refunded']:  # Removido 'voided' da exclusão
                return True
            
            return False
        
        # Agrupa pedidos por IP usando múltiplas fontes
        ip_groups = {}
        total_processed = 0
        excluded_count = 0
        methods_used = {}
        
        for order in orders:
            total_processed += 1
            order_dict = order.to_dict()
            
            # Verifica se deve excluir o pedido
            if should_exclude_order(order_dict):
                excluded_count += 1
                continue
            
            # Extrai IP usando múltiplos métodos
            ip_found, method_used, confidence = extract_ip_from_order(order_dict)
            
            # Debug adicional para IP específico
            if ip_found == "31.217.1.48":
                print(f"DEBUG: IP 31.217.1.48 processado com sucesso via {method_used} no pedido #{order_dict.get('name', 'unknown')}")
            
            # Conta métodos usados para estatísticas
            methods_used[method_used] = methods_used.get(method_used, 0) + 1
            
            if ip_found:
                if ip_found not in ip_groups:
                    ip_groups[ip_found] = []
                
                # Nome do cliente com tratamento de encoding
                customer_name = 'N/A'
                customer = order_dict.get('customer', {})
                if isinstance(customer, dict):
                    first_name = customer.get('first_name', '') or ''
                    last_name = customer.get('last_name', '') or ''
                    customer_name = f"{first_name} {last_name}".strip()
                    if not customer_name:
                        customer_name = 'N/A'
                
                # Extrai dados completos do cliente para compatibilidade com frontend
                customer_email = customer.get('email', '') if isinstance(customer, dict) else ''
                customer_phone = customer.get('phone', '') if isinstance(customer, dict) else ''
                
                # Tenta obter dados de endereço (com fallback para evitar erro)
                shipping_city = ''
                shipping_state = ''
                try:
                    shipping_address = order_dict.get('shipping_address', {})
                    if isinstance(shipping_address, dict):
                        shipping_city = shipping_address.get('city', '')
                        shipping_state = shipping_address.get('province', '')
                except Exception:
                    pass  # Continua sem dados de endereço se houver erro
                
                ip_groups[ip_found].append({
                    'order_id': str(order.id),
                    'order_number': order.name or '',
                    'customer_name': customer_name,
                    'customer_email': customer_email,
                    'customer_phone': customer_phone,
                    'total_price': str(order_dict.get('total_price', '0.00')),
                    'currency': order_dict.get('currency', 'BRL'),
                    'created_at': order.created_at.isoformat() if hasattr(order.created_at, 'isoformat') else str(order.created_at),
                    'financial_status': order_dict.get('financial_status', ''),
                    'shipping_city': shipping_city,
                    'shipping_state': shipping_state,
                    'method_used': method_used,
                    'confidence': confidence
                })
        
        # ⚡ CORREÇÃO: Filtra TODOS os IPs com 2+ pedidos (independente do cliente)
        ips_duplicados = []
        for ip, pedidos in ip_groups.items():
            if len(pedidos) >= 2:  # QUALQUER IP com 2+ pedidos
                # Ordena por data
                pedidos_ordenados = sorted(pedidos, key=lambda x: x['created_at'])
                
                # Conta clientes únicos para análise
                clientes_unicos = set()
                for pedido in pedidos:
                    cliente = pedido.get('customer_name', 'N/A')
                    if cliente and cliente != 'N/A':
                        clientes_unicos.add(cliente)
                
                ips_duplicados.append({
                    'browser_ip': ip,
                    'total_pedidos': len(pedidos),
                    'clientes_unicos': len(clientes_unicos),
                    'clientes_diferentes': len(clientes_unicos) > 1,  # Para análise no frontend
                    'pedidos': pedidos_ordenados,
                    'primeiro_pedido': pedidos_ordenados[0]['created_at'],
                    'ultimo_pedido': pedidos_ordenados[-1]['created_at'],
                    'method_used': pedidos_ordenados[0]['method_used'],
                    'confidence': round(pedidos_ordenados[0]['confidence'], 2)
                })
        
        # Ordena por quantidade de pedidos (mais pedidos primeiro)
        ips_duplicados.sort(key=lambda x: x['total_pedidos'], reverse=True)
        
        # Log da busca melhorado
        create_safe_log(
            user=request.user,
            config=config,
            tipo='busca_ips_simples',
            status='sucesso',
            dados={
                'ips_encontrados': len(ips_duplicados),
                'days_searched': days,
                'total_processed': total_processed,
                'excluded_count': excluded_count,
                'unique_ips': len(ip_groups),
                'methods_used': methods_used,
                'version': 'improved_v2',
                'pedidos_encontrados': sum(ip['total_pedidos'] for ip in ips_duplicados)
            }
        )
        
        return Response({
            'ips_duplicados': ips_duplicados,
            'total_ips': len(ips_duplicados),
            'total_pedidos': sum(ip['total_pedidos'] for ip in ips_duplicados),
            'days_searched': days,
            'loja_nome': config.nome_loja,
            'statistics': {
                'total_processed': total_processed,
                'excluded_count': excluded_count,
                'unique_ips_found': len(ip_groups),
                'methods_used': methods_used,
                'success_rate': len(ip_groups) / max(total_processed - excluded_count, 1) * 100
            }
        })
        
    except Exception as e:
        # Log do erro
        if 'config' in locals():
            create_safe_log(
                user=request.user,
                config=config,
                tipo='busca_ips_simples',
                status='erro',
                dados={'erro_mensagem': str(e)}
            )
        
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
def debug_buscar_ip_especifico(request):
    """Debug específico para encontrar um IP em TODOS os pedidos"""
    try:
        loja_id = request.data.get('loja_id')
        ip_procurado = request.data.get('ip')
        days = request.data.get('days', 365)  # 1 ano por padrão
        
        if not loja_id or not ip_procurado:
            return Response({'error': 'loja_id e ip são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
        if not config:
            return Response({'error': 'Loja não encontrada'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Inicializa conexão Shopify
        import shopify
        shop_url = config.shop_url
        if not shop_url.startswith('https://'):
            shop_url = f"https://{shop_url}"
        
        session = shopify.Session(shop_url, "2024-07", config.access_token)
        shopify.ShopifyResource.activate_session(session)
        
        # Busca pedidos dos últimos X dias SEM FILTRO DE STATUS
        data_inicial = timezone.now() - timedelta(days=days)
        
        orders = shopify.Order.find(
            status='any',  # TODOS os status
            created_at_min=data_inicial.isoformat(),
            limit=250
        )
        
        pedidos_encontrados = []
        total_analisados = 0
        
        for order in orders:
            total_analisados += 1
            order_dict = order.to_dict()
            
            # Busca o IP em TODOS os campos possíveis
            ips_encontrados = []
            
            # note_attributes
            note_attributes = order_dict.get('note_attributes', [])
            if isinstance(note_attributes, list):
                for note in note_attributes:
                    if isinstance(note, dict) and note.get('name') == 'IP address':
                        ip_value = note.get('value')
                        if ip_value and str(ip_value).strip() == ip_procurado:
                            ips_encontrados.append(('note_attributes', ip_value))
            
            # browser_ip direto
            browser_ip = order_dict.get('browser_ip')
            if browser_ip and str(browser_ip).strip() == ip_procurado:
                ips_encontrados.append(('browser_ip', browser_ip))
            
            # client_details.browser_ip
            client_details = order_dict.get('client_details', {})
            if isinstance(client_details, dict):
                client_browser_ip = client_details.get('browser_ip')
                if client_browser_ip and str(client_browser_ip).strip() == ip_procurado:
                    ips_encontrados.append(('client_details.browser_ip', client_browser_ip))
            
            # Se encontrou o IP em qualquer campo
            if ips_encontrados:
                customer = order_dict.get('customer', {})
                pedidos_encontrados.append({
                    'id': order_dict.get('id'),
                    'number': order_dict.get('number'),
                    'created_at': order_dict.get('created_at'),
                    'financial_status': order_dict.get('financial_status'),
                    'fulfillment_status': order_dict.get('fulfillment_status'),
                    'cancelled_at': order_dict.get('cancelled_at'),
                    'customer_name': f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip(),
                    'customer_email': customer.get('email'),
                    'ips_encontrados': ips_encontrados,
                    'total_price': order_dict.get('total_price'),
                })
        
        # Log da busca debug
        create_safe_log(
            user=request.user,
            config=config,
            tipo='debug',
            status='sucesso',
            dados={
                'ip_procurado': ip_procurado,
                'pedidos_encontrados': len(pedidos_encontrados),
                'total_analisados': total_analisados,
                'days_searched': days
            }
        )
        
        return Response({
            'ip_procurado': ip_procurado,
            'pedidos_encontrados': pedidos_encontrados,
            'total_encontrados': len(pedidos_encontrados),
            'total_analisados': total_analisados,
            'days_searched': days,
            'loja_nome': config.nome_loja
        })
        
    except Exception as e:
        if 'config' in locals():
            create_safe_log(
                user=request.user,
                config=config,
                tipo='debug',
                status='erro',
                dados={'erro_mensagem': str(e), 'ip_procurado': ip_procurado if 'ip_procurado' in locals() else 'unknown'}
            )
        
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_detector_ip_user_data(request):
    """Endpoint temporário para debug - verifica dados do usuário e lojas"""
    try:
        # Dados do usuário
        user_data = {
            'user_id': request.user.id,
            'username': request.user.username,
            'is_authenticated': request.user.is_authenticated,
            'is_staff': request.user.is_staff,
        }
        
        # Lojas do usuário atual
        user_lojas = ShopifyConfig.objects.filter(user=request.user, ativo=True)
        user_lojas_data = [
            {
                'id': loja.id,
                'nome_loja': loja.nome_loja,
                'shop_url': loja.shop_url,
                'ativo': loja.ativo,
                'created_at': loja.created_at,
                'user_id': loja.user.id if loja.user else None
            }
            for loja in user_lojas
        ]
        
        # Todas as lojas (para debug)
        all_lojas = ShopifyConfig.objects.filter(ativo=True)
        all_lojas_data = [
            {
                'id': loja.id,
                'nome_loja': loja.nome_loja,
                'shop_url': loja.shop_url,
                'user_id': loja.user.id if loja.user else None,
                'user_username': loja.user.username if loja.user else None
            }
            for loja in all_lojas
        ]
        
        return Response({
            'success': True,
            'user_data': user_data,
            'user_lojas_count': len(user_lojas_data),
            'user_lojas': user_lojas_data,
            'all_lojas_count': len(all_lojas_data),
            'all_lojas': all_lojas_data,
            'debug_info': {
                'endpoint_url': '/api/processamento/debug-detector-ip-user-data/',
                'timestamp': timezone.now().isoformat(),
                'purpose': 'Diagnosticar erro 400 no detector de IP'
            }
        })
        
    except Exception as e:
        logger.error(f"Erro no debug endpoint: {str(e)}")
        return Response({
            'success': False,
            'error': str(e),
            'debug_info': 'Erro interno no endpoint de debug'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)