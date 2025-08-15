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
import json
import logging
import requests
from datetime import datetime, timedelta

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
    """Busca pedidos agrupados pelo mesmo IP com medidas de segurança"""
    try:
        # === VALIDAÇÕES DE SEGURANÇA ===
        loja_id = request.data.get('loja_id')
        days = request.data.get('days', 30)
        min_orders = request.data.get('min_orders', 2)
        
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
        
        detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
        ip_data = detector.get_orders_by_ip(days=days, min_orders=min_orders)
        
        # === AUDITORIA DE SEGURANÇA ===
        audit_details = {
            'ips_found': ip_data['total_ips_found'],
            'period_days': days,
            'min_orders': min_orders,
            'user_ip': AuditLogger._get_client_ip(request),
            'total_orders': ip_data['total_orders_analyzed']
        }
        
        # Verifica se é consulta massiva (suspeita)
        if ip_data['total_ips_found'] > 20:
            AuditLogger.log_ip_access(
                request.user,
                request,
                'massive_ip_search',
                audit_details
            )
        
        # Log padrão da busca
        ProcessamentoLog.objects.create(
            user=request.user,
            config=config,
            tipo='busca_ip',
            status='sucesso',
            pedidos_encontrados=ip_data['total_orders_analyzed'],
            detalhes=audit_details
        )
        
        # Log de auditoria
        AuditLogger.log_ip_access(
            request.user,
            request,
            'ip_search',
            audit_details
        )
        
        # === ADICIONANDO DADOS RAW DE EXEMPLO ===
        debug_sample_order = None
        ip_fields_found = []
        
        # Pega o primeiro pedido encontrado para usar como exemplo RAW
        if ip_data['ip_groups'] and len(ip_data['ip_groups']) > 0:
            first_group = ip_data['ip_groups'][0]
            if first_group['orders'] and len(first_group['orders']) > 0:
                first_order_summary = first_group['orders'][0]
                
                # Busca os dados RAW completos do primeiro pedido
                try:
                    raw_order_details = detector.get_order_details(first_order_summary['id'])
                    if raw_order_details:
                        # Sanitiza os dados RAW
                        sanitized_raw_data = _sanitize_raw_order_for_debug(raw_order_details)
                        
                        # Analisa campos de IP encontrados
                        ip_analysis = _extract_ip_field_paths(raw_order_details)
                        
                        debug_sample_order = {
                            'raw_order_data': sanitized_raw_data,
                            'ip_analysis': ip_analysis,
                            'sanitized': True,
                            'order_id': first_order_summary['id'],
                            'order_number': first_order_summary.get('order_number', 'N/A'),
                            'sample_from_ip': first_group['ip']
                        }
                except Exception as e:
                    logger.warning(f"Erro ao buscar dados RAW para debug: {str(e)}")
                    debug_sample_order = {
                        'error': 'Não foi possível obter dados RAW do pedido de exemplo',
                        'sanitized': True
                    }
        
        # Modifica ip_data para incluir o debug_sample_order
        enhanced_ip_data = ip_data.copy()
        enhanced_ip_data['debug_sample_order'] = debug_sample_order

        # Cria response com dados completos incluindo exemplo RAW
        response = Response({
            'success': True,
            'data': enhanced_ip_data,
            'loja_nome': config.nome_loja
        })
        
        # Adiciona headers de segurança
        return SecurityHeadersManager.add_security_headers(response)
        
    except Exception as e:
        # === LOG DE ERRO COM AUDITORIA ===
        error_details = {
            'days': days if 'days' in locals() else 30,
            'min_orders': min_orders if 'min_orders' in locals() else 2,
            'user_ip': AuditLogger._get_client_ip(request),
            'error': str(e)
        }
        
        # Log de auditoria do erro
        AuditLogger.log_ip_access(
            request.user,
            request,
            'ip_search_error',
            error_details
        )
        
        # Log padrão do erro
        if 'config' in locals():
            ProcessamentoLog.objects.create(
                user=request.user,
                config=config,
                tipo='busca_ip',
                status='erro',
                erro_mensagem=str(e),
                detalhes=error_details
            )
        
        logger.error(f"Erro na busca por IP - User: {request.user.username}, Error: {str(e)}")
        return Response({'error': 'Erro interno do servidor'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@never_cache
def detalhar_pedidos_ip(request):
    """Retorna detalhes completos dos pedidos de um IP específico com segurança"""
    try:
        # === VALIDAÇÕES DE SEGURANÇA RIGOROSAS ===
        loja_id = request.data.get('loja_id')
        ip = request.data.get('ip')
        days = request.data.get('days', 30)
        
        if not loja_id or not ip:
            return Response({'error': 'ID da loja e IP são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Sanitizar IP de entrada
        ip_sanitized = IPSecurityUtils.sanitize_ip_input(ip)
        
        if not ip_sanitized:
            return Response({'error': 'Formato de IP inválido'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validação de parâmetros
        try:
            loja_id = int(loja_id)
            days = min(int(days), 30)  # MÁXIMO 30 DIAS por segurança
        except (ValueError, TypeError):
            return Response({'error': 'Parâmetros inválidos'}, status=status.HTTP_400_BAD_REQUEST)
        
        if days > 30:
            days = 30
        
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
        if not config:
            return Response({'error': 'Loja não encontrada ou inativa'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verifica se a configuração tem dados válidos
        if not config.shop_url or not config.access_token:
            return Response({'error': 'Configuração da loja inválida'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Cria o detector dentro de um try-catch para capturar erros de inicialização
        try:
            detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
        except Exception as detector_error:
            logger.error(f"Erro ao criar detector Shopify - User: {request.user.username}, Error: {str(detector_error)}")
            return Response({'error': 'Erro na configuração do detector Shopify'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # === BUSCA DIRETA COM IP ===
        try:
            ip_data = detector.get_orders_by_ip(days=days, min_orders=1)
        except Exception as search_error:
            logger.error(f"Erro na busca por IP - User: {request.user.username}, IP: {ip_sanitized}, Error: {str(search_error)}")
            return Response({'error': 'Erro ao buscar dados de IP na loja'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Verifica se a busca retornou dados válidos
        if not ip_data or not isinstance(ip_data, dict):
            return Response({'error': 'Erro ao buscar dados de IP'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        if 'ip_groups' not in ip_data or not ip_data['ip_groups']:
            return Response({'error': 'Nenhum grupo de IP encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        # Encontra o grupo específico do IP
        target_group = None
        
        # Busca direta pelo IP
        for group in ip_data['ip_groups']:
            if group and 'ip' in group and group['ip'] == ip_sanitized:
                target_group = group
                break
        
        if not target_group:
            # Log detalhado para debug
            debug_info = {
                'requested_ip': ip,
                'sanitized_ip': ip_sanitized,
                'available_ips': [group['ip'] for group in ip_data['ip_groups'][:5]],  # Primeiros 5 para debug
                'days': days
            }
            
            logger.warning(f"IP não encontrado para detalhamento - User: {request.user.username}, Debug: {debug_info}")
            
            # Log tentativa de acesso a IP inexistente
            AuditLogger.log_ip_access(
                request.user,
                request,
                'ip_not_found',
                debug_info
            )
            
            return Response({
                'error': 'IP não encontrado nos dados. Tente atualizar a busca.',
                'debug_info': debug_info if request.user.is_staff else None
            }, status=status.HTTP_404_NOT_FOUND)
        
        # === AUDITORIA CRÍTICA - ACESSO A DETALHES ===
        audit_details = {
            'ip_accessed': target_group['ip'],
            'orders_count': len(target_group['orders']),
            'days': days,
            'user_ip': AuditLogger._get_client_ip(request)
        }
        
        AuditLogger.log_ip_access(
            request.user,
            request,
            'ip_detail_access',
            audit_details
        )
        
        # Verifica se acesso é suspeito (muitos pedidos)
        if len(target_group['orders']) > 20:
            AuditLogger.log_ip_access(
                request.user,
                request,
                'suspicious_ip_detail',
                audit_details
            )
        
        # === BUSCA DETALHES COM CONTROLE DE PERFORMANCE ===
        detailed_orders = []
        max_details = 50  # Limita detalhes para evitar sobrecarga
        
        for i, order_summary in enumerate(target_group['orders']):
            if i >= max_details:
                break
            
            # Verifica se order_summary é válido
            if not order_summary or not isinstance(order_summary, dict):
                continue
                
            if 'id' not in order_summary:
                continue
                
            try:
                order_details = detector.get_order_details(order_summary['id'])
                if order_details:
                    # Remove dados muito sensíveis dos detalhes
                    order_details = _sanitize_order_details(order_details)
                    order_summary['address_details'] = order_details
            except Exception as detail_error:
                logger.warning(f"Erro ao buscar detalhes do pedido {order_summary.get('id', 'unknown')}: {str(detail_error)}")
                order_summary['address_details'] = None
                
            detailed_orders.append(order_summary)
        
        # === MANTÉM IP ORIGINAL NO RETORNO ===
        # Verifica se target_group tem estrutura válida
        if not target_group or not isinstance(target_group, dict):
            return Response({'error': 'Dados do grupo de IP inválidos'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        if 'orders' not in target_group:
            target_group['orders'] = []
            
        target_group['orders'] = detailed_orders
        
        # Cria response com estrutura consistente com outros endpoints
        response = Response({
            'success': True,
            'data': {
                'ip': target_group.get('ip', ip_sanitized),
                'ip_group': target_group,
                'details_limited': len(detailed_orders) == max_details,
                'total_orders': len(detailed_orders),
                'max_details_applied': max_details
            },
            'loja_nome': config.nome_loja
        })
        
        # Adiciona headers de segurança
        return SecurityHeadersManager.add_security_headers(response)
        
    except Exception as e:
        # Log de erro com auditoria e contexto detalhado
        error_context = {
            'requested_ip': ip if 'ip' in locals() else 'unknown',
            'sanitized_ip': ip_sanitized if 'ip_sanitized' in locals() else 'unknown',
            'loja_id': loja_id if 'loja_id' in locals() else 'unknown',
            'days': days if 'days' in locals() else 'unknown',
            'error': str(e),
            'error_type': type(e).__name__,
            'user_ip': AuditLogger._get_client_ip(request),
            'config_found': 'config' in locals() and config is not None,
            'config_valid': 'config' in locals() and config is not None and hasattr(config, 'shop_url') and config.shop_url,
            'detector_created': 'detector' in locals() and detector is not None,
            'ip_data_fetched': 'ip_data' in locals() and ip_data is not None,
            'target_group_found': 'target_group' in locals() and target_group is not None
        }
        
        AuditLogger.log_ip_access(
            request.user,
            request,
            'ip_detail_error',
            error_context
        )
        
        logger.error(f"Erro no detalhamento IP - User: {request.user.username}, Error: {str(e)}, Context: {error_context}")
        return Response({
            'error': 'Erro interno do servidor',
            'debug_info': error_context if request.user.is_staff else None
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
@never_cache
def debug_shopify_data(request):
    """
    FERRAMENTA TEMPORÁRIA DE DEBUG
    
    Busca 1 pedido recente da API Shopify e retorna os dados RAW
    para análise dos campos de IP disponíveis.
    
    ATENÇÃO: Esta é uma ferramenta de debug temporária que deve ser 
    removida após a análise ser concluída.
    """
    try:
        # Validação de entrada
        loja_id = request.data.get('loja_id')
        if not loja_id:
            return Response({'error': 'ID da loja é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verifica loja
        config = ShopifyConfig.objects.filter(id=loja_id, ativo=True).first()
        if not config:
            return Response({'error': 'Loja não encontrada ou inativa'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Auditoria de acesso
        AuditLogger.log_ip_access(
            request.user,
            request,
            'debug_shopify_raw_data',
            {
                'loja_id': loja_id,
                'loja_nome': config.nome_loja,
                'user_ip': AuditLogger._get_client_ip(request),
                'action': 'Busca de dados RAW do Shopify para debug'
            }
        )
        
        # Busca 1 pedido recente da API Shopify
        url = f"https://{config.shop_url}/admin/api/{config.api_version}/orders.json"
        headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": config.access_token
        }
        params = {
            "limit": 1,
            "status": "any",
            "created_at_min": (datetime.now() - timedelta(days=7)).isoformat()  # Últimos 7 dias
        }
        
        response = requests.get(url, headers=headers, params=params, timeout=30)
        response.raise_for_status()
        
        orders_data = response.json()
        orders = orders_data.get("orders", [])
        
        if not orders:
            return Response({
                'error': 'Nenhum pedido encontrado nos últimos 7 dias',
                'debug_info': {
                    'loja': config.nome_loja,
                    'api_version': config.api_version,
                    'response_keys': list(orders_data.keys())
                }
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Pega o primeiro (mais recente) pedido
        raw_order = orders[0]
        
        # Remove dados muito sensíveis (mantém estrutura para debug)
        sanitized_order = _sanitize_debug_data(raw_order)
        
        # Log da busca de debug
        ProcessamentoLog.objects.create(
            user=request.user,
            config=config,
            tipo='debug',
            status='sucesso',
            pedidos_encontrados=1,
            detalhes={
                'action': 'debug_raw_data',
                'order_id': sanitized_order.get('id'),
                'order_number': sanitized_order.get('order_number'),
                'data_fields_found': list(sanitized_order.keys())
            }
        )
        
        # Analisa campos de IP disponíveis (usando lógica do detector)
        ip_analysis = _analyze_ip_fields_improved(raw_order)
        
        # Resposta com dados RAW sanitizados
        response = Response({
            'success': True,
            'debug_info': {
                'loja_nome': config.nome_loja,
                'api_version': config.api_version,
                'order_id': sanitized_order.get('id'),
                'order_number': sanitized_order.get('order_number'),
                'timestamp': datetime.now().isoformat()
            },
            'ip_analysis': ip_analysis,
            'raw_order_data': sanitized_order,
            'warning': 'Esta é uma ferramenta temporária de debug. Dados sensíveis foram removidos.'
        })
        
        return SecurityHeadersManager.add_security_headers(response)
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Erro ao conectar com API Shopify: {str(e)}"
        logger.error(f"Debug Shopify Data - Erro de conexão - User: {request.user.username}, Error: {error_msg}")
        
        # Log do erro
        if 'config' in locals():
            ProcessamentoLog.objects.create(
                user=request.user,
                config=config,
                tipo='debug',
                status='erro',
                erro_mensagem=error_msg
            )
        
        return Response({'error': error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        error_msg = f"Erro interno: {str(e)}"
        logger.error(f"Debug Shopify Data - Erro geral - User: {request.user.username}, Error: {error_msg}")
        
        # Auditoria do erro
        AuditLogger.log_ip_access(
            request.user,
            request,
            'debug_shopify_error',
            {
                'loja_id': loja_id if 'loja_id' in locals() else 'unknown',
                'error': error_msg,
                'user_ip': AuditLogger._get_client_ip(request)
            }
        )
        
        return Response({'error': 'Erro interno do servidor'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

def _sanitize_debug_data(raw_order):
    """
    Remove dados muito sensíveis dos dados RAW do pedido, mantendo estrutura para debug
    
    Args:
        raw_order: Dados brutos do pedido do Shopify
        
    Returns:
        dict: Dados sanitizados mas completos para debug de campos de IP
    """
    if not raw_order:
        return raw_order
    
    sanitized = raw_order.copy()
    
    # Remove tokens e chaves sensíveis
    sensitive_keys = [
        'payment_details', 'payment_gateway_names', 'gateway', 
        'transactions', 'discount_codes', 'refunds'
    ]
    
    for key in sensitive_keys:
        sanitized.pop(key, None)
    
    # Sanitiza dados do cliente (mantém estrutura mas remove dados muito específicos)
    if 'customer' in sanitized and sanitized['customer']:
        customer = sanitized['customer']
        
        # Mantém campos importantes para debug mas sanitiza alguns valores
        if 'email' in customer:
            email = customer['email']
            if '@' in email:
                local, domain = email.split('@', 1)
                customer['email'] = f"{local[:3]}***@{domain}"
        
        # Sanitiza telefone parcialmente
        if 'phone' in customer and customer['phone']:
            phone = str(customer['phone'])
            if len(phone) > 4:
                customer['phone'] = phone[:4] + '****' + phone[-2:] if len(phone) > 6 else phone[:4] + '****'
    
    # Sanitiza endereços (mantém estrutura para análise de IP)
    for address_key in ['shipping_address', 'billing_address']:
        if address_key in sanitized and sanitized[address_key]:
            address = sanitized[address_key]
            
            # Sanitiza nome mas mantém estrutura
            for name_field in ['first_name', 'last_name', 'name']:
                if name_field in address and address[name_field]:
                    name = str(address[name_field])
                    address[name_field] = name[:2] + '***' if len(name) > 2 else '***'
            
            # Sanitiza endereço físico mas mantém estrutura
            if 'address1' in address and address['address1']:
                addr = str(address['address1'])
                address['address1'] = addr[:5] + '***' if len(addr) > 5 else '***'
            
            # Sanitiza telefone
            if 'phone' in address and address['phone']:
                phone = str(address['phone'])
                address['phone'] = phone[:4] + '****' if len(phone) > 4 else '****'
    
    # IMPORTANTE: Mantém client_details completamente para análise de IP
    # (não remove nem sanitiza campos de IP aqui - essa é a parte importante para debug)
    
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

def _sanitize_raw_order_for_debug(raw_order):
    """
    Sanitiza dados RAW do pedido mantendo TODOS os campos essenciais para debug
    Especialmente campos de IP, IDs e estrutura completa
    
    Args:
        raw_order: Dados completos do pedido
        
    Returns:
        dict: Dados sanitizados mas com estrutura e IDs completos
    """
    if not raw_order:
        return raw_order
    
    # Cria cópia profunda para não alterar original
    import copy
    sanitized = copy.deepcopy(raw_order)
    
    # === SANITIZAÇÃO MÍNIMA APENAS DE DADOS EXTREMAMENTE SENSÍVEIS ===
    
    # Remove APENAS tokens e dados de pagamento sensíveis
    highly_sensitive_keys = [
        'payment_details', 'transactions', 'gateway', 'payment_gateway_names',
        'discount_codes', 'refunds', 'payment_terms', 'checkout_token', 'cart_token'
    ]
    
    for key in highly_sensitive_keys:
        sanitized.pop(key, None)
    
    # === MANTÉM TODOS OS IDs IMPORTANTES ===
    # ID do pedido, customer ID, address IDs são ESSENCIAIS para debug
    essential_id_fields = ['id', 'customer_id', 'user_id', 'checkout_id']
    # Estes IDs NÃO são removidos
    
    # === MANTÉM COMPLETAMENTE INTACTOS TODOS OS CAMPOS DE IP ===
    # TODOS os campos relacionados a IP devem ser preservados sem modificação:
    # - client_details (TODO o objeto)
    # - browser_ip, client_ip, customer_ip
    # - Qualquer campo que contenha "ip" no nome
    
    # === SANITIZAÇÃO PARCIAL APENAS DE DADOS PESSOAIS ===
    # Mascara apenas parcialmente para manter estrutura identificável
    
    if 'customer' in sanitized and sanitized['customer']:
        customer = sanitized['customer']
        
        # MANTÉM customer.id - ESSENCIAL
        
        # Mascara email mas mantém domínio para debug
        if 'email' in customer and customer['email']:
            email = str(customer['email'])
            if '@' in email:
                local, domain = email.split('@', 1)
                # Mantém mais caracteres para debug
                customer['email'] = f"{local[:4]}***@{domain}"
        
        # Mascara nome mas mantém iniciais para debug
        for name_field in ['first_name', 'last_name']:
            if name_field in customer and customer[name_field]:
                name = str(customer[name_field])
                customer[name_field] = f"{name[:3]}***{name[-1:]}" if len(name) > 4 else f"{name[:2]}***"
        
        # Mascara telefone mas mantém prefixo para debug  
        if 'phone' in customer and customer['phone']:
            phone = str(customer['phone'])
            customer['phone'] = f"{phone[:5]}****{phone[-2:]}" if len(phone) > 7 else f"{phone[:3]}***"
        
        # MANTÉM note se contiver informações de debug relevantes
        # Remove apenas se for muito longo (provavelmente dados sensíveis)
        if 'note' in customer and customer['note'] and len(str(customer['note'])) > 200:
            customer['note'] = f"[NOTA_LONGA_MASCARADA - {len(str(customer['note']))} caracteres]"
        
        # === MANTÉM default_address COM TODOS OS CAMPOS PARA DEBUG ===
        if 'default_address' in customer and customer['default_address']:
            default_addr = customer['default_address']
            
            # MANTÉM address.id - ESSENCIAL
            
            # Mascara nomes mas mantém estrutura
            for name_field in ['first_name', 'last_name', 'name']:
                if name_field in default_addr and default_addr[name_field]:
                    name = str(default_addr[name_field])
                    default_addr[name_field] = f"{name[:3]}***{name[-1:]}" if len(name) > 4 else f"{name[:2]}***"
            
            # Mascara endereço mas mantém número/início para debug
            if 'address1' in default_addr and default_addr['address1']:
                addr = str(default_addr['address1'])
                default_addr['address1'] = f"{addr[:8]}***{addr[-3:]}" if len(addr) > 11 else f"{addr[:5]}***"
            
            # MANTÉM TODOS os campos relacionados a IP sem modificação
            # MANTÉM city, province, country, zip parcialmente para debug de localização
            if 'zip' in default_addr and default_addr['zip']:
                zip_code = str(default_addr['zip'])
                # Mascara apenas parte do CEP
                default_addr['zip'] = f"{zip_code[:5]}***" if len(zip_code) > 5 else zip_code
            
            # IMPORTANTE: NÃO remove nem altera campos de IP
    
    # === SANITIZA endereços de shipping e billing MANTENDO estrutura ===
    for address_type in ['shipping_address', 'billing_address']:
        if address_type in sanitized and sanitized[address_type]:
            address = sanitized[address_type]
            
            # MANTÉM address.id - ESSENCIAL
            
            # Mascara dados pessoais mas mantém estrutura identificável
            for name_field in ['first_name', 'last_name', 'name']:
                if name_field in address and address[name_field]:
                    name = str(address[name_field])
                    address[name_field] = f"{name[:3]}***{name[-1:]}" if len(name) > 4 else f"{name[:2]}***"
            
            # Mascara endereço mas mantém início para debug
            if 'address1' in address and address['address1']:
                addr = str(address['address1'])
                address['address1'] = f"{addr[:8]}***{addr[-3:]}" if len(addr) > 11 else f"{addr[:5]}***"
            
            # Mascara telefone mas mantém estrutura
            if 'phone' in address and address['phone']:
                phone = str(address['phone'])
                address['phone'] = f"{phone[:4]}****{phone[-2:]}" if len(phone) > 6 else f"{phone[:3]}***"
            
            # MANTÉM coordenadas para debug de localização se existirem
            # latitude/longitude podem ser úteis para debug
            
            # IMPORTANTE: MANTÉM TODOS os campos relacionados a IP
    
    # === MANTÉM client_details COMPLETAMENTE INTACTO ===
    # Esta é a fonte PRINCIPAL de dados de IP - não pode ser alterada
    
    # === MANTÉM browser_ip e customer_ip se existirem ===
    # Estes campos são CRÍTICOS para debug
    
    # === MANTÉM TODOS os campos que contenham "ip" no nome ===
    def preserve_ip_fields(obj):
        """Preserva todos os campos relacionados a IP recursivamente"""
        if isinstance(obj, dict):
            for key, value in obj.items():
                if 'ip' in key.lower():
                    # Campo relacionado a IP - NÃO alterar
                    continue
                elif isinstance(value, dict):
                    preserve_ip_fields(value)
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            preserve_ip_fields(item)
    
    preserve_ip_fields(sanitized)
    
    # === MASCARA line_items minimamente ===
    if 'line_items' in sanitized and sanitized['line_items']:
        for item in sanitized['line_items']:
            if isinstance(item, dict):
                # MANTÉM IDs de produtos
                
                # Mascara apenas propriedades muito longas
                if 'properties' in item and item['properties']:
                    for prop in item['properties']:
                        if isinstance(prop, dict) and 'value' in prop:
                            value = str(prop['value'])
                            if len(value) > 50:  # Só mascara valores muito longos
                                prop['value'] = f"{value[:10]}***[{len(value)} chars]***{value[-5:]}"
    
    # === MANTÉM metadados importantes para debug ===
    # user_agent pode ser útil para debug
    # source_identifier pode ser útil
    # Só remove se extremamente sensível
    
    metadata_to_remove = [
        'session_hash'  # Remove apenas este que é muito sensível
    ]
    
    for key in metadata_to_remove:
        sanitized.pop(key, None)
    
    # === ADICIONA informações de debug ===
    sanitized['_debug_info'] = {
        'sanitized_at': datetime.now().isoformat(),
        'sanitization_level': 'minimal_for_debug',
        'fields_completely_removed': highly_sensitive_keys + metadata_to_remove,
        'ip_fields_preserved': 'ALL fields containing "ip" kept intact',
        'ids_preserved': 'ALL ID fields kept for debugging',
        'note': 'Sanitização mínima - mantém estrutura completa para debug de IP'
    }
    
    return sanitized

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
        
        # Adiciona informações de debug se usuário for staff
        if request.user.is_staff and enable_detailed_logging:
            performance_metadata = enhanced_result.get('performance_metadata', {})
            session_stats = performance_metadata.get('session_statistics', {})
            
            response_data['debug_info'] = {
                'session_statistics': session_stats,
                'performance_category': performance_metadata.get('performance_category', 'unknown'),
                'logs_generated': session_stats.get('total_processed', 0),
                'success_rate': session_stats.get('success_rate', 0)
            }
        
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
            tipo='debug',
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
                tipo='debug',
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