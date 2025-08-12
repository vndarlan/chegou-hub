# backend/features/processamento/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.http import JsonResponse
import json
import logging
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
        
        # === APLICAR MASCARAMENTO DE IPs PARA SEGURANÇA ===
        secured_ip_data = _secure_ip_data(ip_data)
        
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
        
        # Cria response com dados mascarados
        response = Response({
            'success': True,
            'data': secured_ip_data,
            'loja_nome': config.nome_loja,
            'security_notice': 'IPs foram mascarados por segurança'
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
        
        # Sanitização e validação do IP
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
        
        # === BUSCA COM IP SANITIZADO ===
        ip_data = detector.get_orders_by_ip(days=days, min_orders=1)
        
        # Encontra o grupo específico do IP (usando IP original para busca)
        target_group = None
        original_ip = None
        for group in ip_data['ip_groups']:
            if group['ip'] == ip_sanitized:
                target_group = group
                original_ip = group['ip']
                break
        
        if not target_group:
            # Log tentativa de acesso a IP inexistente
            AuditLogger.log_ip_access(
                request.user,
                request,
                'ip_not_found',
                {'requested_ip': IPSecurityUtils.mask_ip(ip_sanitized), 'days': days}
            )
            return Response({'error': 'IP não encontrado nos dados'}, status=status.HTTP_404_NOT_FOUND)
        
        # === AUDITORIA CRÍTICA - ACESSO A DETALHES ===
        audit_details = {
            'ip_hash': IPSecurityUtils.hash_ip(original_ip),
            'ip_masked': IPSecurityUtils.mask_ip(original_ip),
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
        
        # === MÁSCARA O IP NO RETORNO ===
        target_group['orders'] = detailed_orders
        target_group['ip'] = IPSecurityUtils.mask_ip(original_ip)
        target_group['ip_hash'] = IPSecurityUtils.hash_ip(original_ip)
        
        # Cria response
        response = Response({
            'success': True,
            'ip': IPSecurityUtils.mask_ip(original_ip),
            'data': target_group,
            'loja_nome': config.nome_loja,
            'security_notice': 'IP foi mascarado por segurança',
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
                'requested_ip': IPSecurityUtils.mask_ip(ip) if 'ip' in locals() else 'unknown',
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

# === FUNÇÕES DE SEGURANÇA AUXILIARES ===

def _secure_ip_data(ip_data):
    """
    Aplica mascaramento de IPs em toda estrutura de dados
    
    Args:
        ip_data: Dados originais com IPs completos
        
    Returns:
        dict: Dados com IPs mascarados
    """
    secured_data = ip_data.copy()
    
    # Mascara IPs em cada grupo
    for group in secured_data.get('ip_groups', []):
        original_ip = group['ip']
        group['ip'] = IPSecurityUtils.mask_ip(original_ip)
        group['ip_hash'] = IPSecurityUtils.hash_ip(original_ip)
        
        # Remove informações muito específicas que podem identificar localização
        if 'location_info' in group:
            del group['location_info']
    
    return secured_data

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