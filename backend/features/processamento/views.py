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
                        ip_fields_found = _extract_ip_field_paths(raw_order_details)
                        
                        debug_sample_order = {
                            'raw_order_data': sanitized_raw_data,
                            'ip_fields_found': ip_fields_found,
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
        
        detector = ShopifyDuplicateOrderDetector(config.shop_url, config.access_token)
        
        # === BUSCA DIRETA COM IP ===
        ip_data = detector.get_orders_by_ip(days=days, min_orders=1)
        
        # Encontra o grupo específico do IP
        target_group = None
        
        # Busca direta pelo IP
        for group in ip_data['ip_groups']:
            if group['ip'] == ip_sanitized:
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
                
            order_details = detector.get_order_details(order_summary['id'])
            if order_details:
                # Remove dados muito sensíveis dos detalhes
                order_details = _sanitize_order_details(order_details)
                order_summary['address_details'] = order_details
            detailed_orders.append(order_summary)
        
        # === MANTÉM IP ORIGINAL NO RETORNO ===
        target_group['orders'] = detailed_orders
        
        # Cria response
        response = Response({
            'success': True,
            'ip': target_group['ip'],
            'data': target_group,
            'loja_nome': config.nome_loja,
            'details_limited': len(target_group['orders']) == max_details
        })
        
        # Adiciona headers de segurança
        return SecurityHeadersManager.add_security_headers(response)
        
    except Exception as e:
        # Log de erro com auditoria
        AuditLogger.log_ip_access(
            request.user,
            request,
            'ip_detail_error',
            {
                'requested_ip': ip if 'ip' in locals() else 'unknown',
                'error': str(e),
                'user_ip': AuditLogger._get_client_ip(request)
            }
        )
        
        logger.error(f"Erro no detalhamento IP - User: {request.user.username}, Error: {str(e)}")
        return Response({'error': 'Erro interno do servidor'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        
        # Analisa campos de IP disponíveis
        ip_analysis = _analyze_ip_fields(raw_order)
        
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
    
    # Função auxiliar para verificar se um valor parece ser IP
    def looks_like_ip(value):
        if not value or not isinstance(value, str):
            return False
        value = value.strip()
        # Verifica padrão básico de IP
        return ('.' in value and len(value.split('.')) == 4) or (':' in value and len(value) > 7)
    
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

def _sanitize_raw_order_for_debug(raw_order):
    """
    Sanitiza dados RAW do pedido removendo informações sensíveis mas mantendo estrutura completa
    para análise de campos de IP no debug
    
    Args:
        raw_order: Dados completos do pedido
        
    Returns:
        dict: Dados sanitizados mas estruturalmente completos
    """
    if not raw_order:
        return raw_order
    
    sanitized = raw_order.copy()
    
    # Remove campos completamente sensíveis
    highly_sensitive_keys = [
        'payment_details', 'payment_gateway_names', 'gateway', 
        'transactions', 'discount_codes', 'refunds', 'payment_terms',
        'checkout_id', 'checkout_token', 'cart_token', 'user_id'
    ]
    
    for key in highly_sensitive_keys:
        sanitized.pop(key, None)
    
    # Sanitiza dados do cliente (mantém estrutura mas mascara valores)
    if 'customer' in sanitized and sanitized['customer']:
        customer = sanitized['customer']
        
        # Mascara email
        if 'email' in customer and customer['email']:
            email = str(customer['email'])
            if '@' in email:
                local, domain = email.split('@', 1)
                customer['email'] = f"{local[:2]}***@{domain}"
        
        # Mascara nome
        for name_field in ['first_name', 'last_name']:
            if name_field in customer and customer[name_field]:
                name = str(customer[name_field])
                customer[name_field] = name[:2] + '*' * (len(name) - 2) if len(name) > 2 else '***'
        
        # Mascara telefone
        if 'phone' in customer and customer['phone']:
            phone = str(customer['phone'])
            customer['phone'] = phone[:3] + '****' + phone[-2:] if len(phone) > 5 else '***'
        
        # Remove notas e dados muito específicos
        customer.pop('note', None)
        customer.pop('multipass_identifier', None)
        customer.pop('tax_exempt', None)
        
        # Sanitiza default_address mas mantém TODOS os campos para análise de IP
        if 'default_address' in customer and customer['default_address']:
            default_addr = customer['default_address']
            
            # Mascara nome nos endereços
            for name_field in ['first_name', 'last_name', 'name']:
                if name_field in default_addr and default_addr[name_field]:
                    name = str(default_addr[name_field])
                    default_addr[name_field] = name[:2] + '***' if len(name) > 2 else '***'
            
            # Mascara endereço físico
            if 'address1' in default_addr and default_addr['address1']:
                addr = str(default_addr['address1'])
                default_addr['address1'] = addr[:5] + '***' if len(addr) > 5 else '***'
            
            if 'address2' in default_addr and default_addr['address2']:
                addr = str(default_addr['address2'])
                default_addr['address2'] = addr[:3] + '***' if len(addr) > 3 else '***'
            
            # Mascara telefone nos endereços
            if 'phone' in default_addr and default_addr['phone']:
                phone = str(default_addr['phone'])
                default_addr['phone'] = phone[:3] + '****' if len(phone) > 3 else '***'
            
            # IMPORTANTE: NÃO remove campos de IP - mantém para análise
    
    # Sanitiza endereços de shipping e billing (mantém estrutura completa)
    for address_type in ['shipping_address', 'billing_address']:
        if address_type in sanitized and sanitized[address_type]:
            address = sanitized[address_type]
            
            # Mascara dados pessoais mas mantém estrutura completa
            for name_field in ['first_name', 'last_name', 'name']:
                if name_field in address and address[name_field]:
                    name = str(address[name_field])
                    address[name_field] = name[:2] + '***' if len(name) > 2 else '***'
            
            # Mascara endereço físico
            if 'address1' in address and address['address1']:
                addr = str(address['address1'])
                address['address1'] = addr[:5] + '***' if len(addr) > 5 else '***'
            
            # Mascara telefone
            if 'phone' in address and address['phone']:
                phone = str(address['phone'])
                address['phone'] = phone[:3] + '****' if len(phone) > 3 else '***'
            
            # Remove coordenadas muito específicas (se existirem)
            address.pop('latitude', None)
            address.pop('longitude', None)
            
            # IMPORTANTE: NÃO remove campos de IP - mantém para análise
    
    # Mascara dados de linha de item (produtos) mas mantém estrutura
    if 'line_items' in sanitized and sanitized['line_items']:
        for item in sanitized['line_items']:
            if isinstance(item, dict):
                # Mascara propriedades customizadas que podem conter dados sensíveis
                if 'properties' in item and item['properties']:
                    for prop in item['properties']:
                        if isinstance(prop, dict) and 'value' in prop:
                            value = str(prop['value'])
                            if len(value) > 10:  # Só mascara valores longos
                                prop['value'] = value[:5] + '***'
    
    # IMPORTANTE: Mantém client_details COMPLETAMENTE intacto para análise de IP
    # Esta é a seção mais crítica para o debug dos campos de IP
    
    # Remove alguns metadados muito específicos
    metadata_to_remove = [
        'landing_site_ref', 'referring_site', 'source_identifier',
        'user_agent', 'session_hash', 'checkout_token'
    ]
    
    for key in metadata_to_remove:
        sanitized.pop(key, None)
    
    # Adiciona timestamp de sanitização para rastreamento
    sanitized['_sanitization_info'] = {
        'sanitized_at': datetime.now().isoformat(),
        'fields_removed': highly_sensitive_keys + metadata_to_remove,
        'note': 'Dados pessoais mascarados, campos de IP mantidos intactos para análise'
    }
    
    return sanitized

def _extract_ip_field_paths(raw_order):
    """
    Extrai todos os caminhos de campos que contêm IPs no pedido RAW
    
    Args:
        raw_order: Dados completos do pedido
        
    Returns:
        list: Lista de caminhos onde IPs foram encontrados
    """
    ip_paths = []
    
    def looks_like_ip(value):
        """Verifica se um valor parece ser um IP"""
        if not value or not isinstance(value, str):
            return False
        value = value.strip()
        # Verifica IPv4 básico
        if '.' in value and len(value.split('.')) == 4:
            try:
                parts = value.split('.')
                return all(0 <= int(part) <= 255 for part in parts if part.isdigit())
            except:
                return False
        # Verifica IPv6 básico
        return ':' in value and len(value) > 7 and len(value) < 40
    
    def scan_object(obj, path=""):
        """Escaneia recursivamente um objeto procurando por IPs"""
        if isinstance(obj, dict):
            for key, value in obj.items():
                current_path = f"{path}.{key}" if path else key
                
                if isinstance(value, (dict, list)):
                    scan_object(value, current_path)
                elif looks_like_ip(value):
                    ip_paths.append(current_path)
                elif 'ip' in key.lower():
                    # Adiciona mesmo se não parecer IP, pode ser útil para debug
                    ip_paths.append(current_path)
        
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                current_path = f"{path}[{i}]"
                scan_object(item, current_path)
    
    # Escaneia o pedido inteiro
    scan_object(raw_order)
    
    return ip_paths