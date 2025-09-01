# backend/features/sync_realtime/views.py
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.http import JsonResponse

from .shopify_webhook_manager import ShopifyWebhookManager, WebhookBulkManager
from features.processamento.models import ShopifyConfig

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def configure_webhooks_bulk(request):
    """
    Configura webhooks automaticamente para todas as lojas do usuário
    """
    try:
        # Obter domínio base para webhooks
        base_domain = request.data.get('base_domain')
        if not base_domain:
            # Tentar obter do settings ou da requisição
            if hasattr(settings, 'WEBHOOK_BASE_DOMAIN'):
                base_domain = settings.WEBHOOK_BASE_DOMAIN
            else:
                # Construir a partir da requisição atual
                scheme = 'https' if request.is_secure() else 'http'
                host = request.get_host()
                base_domain = f"{scheme}://{host}"
        
        # Gerar URL do webhook
        webhook_url = WebhookBulkManager.generate_webhook_endpoint_url(base_domain)
        
        # Configurar webhooks em lote
        result = WebhookBulkManager.configure_webhooks_for_user(
            user=request.user,
            webhook_endpoint_url=webhook_url
        )
        
        return Response({
            'success': result['success'],
            'message': f"Configuração concluída: {result['stores_configured']} lojas configuradas, {result['stores_failed']} falharam",
            'webhook_url': webhook_url,
            'summary': {
                'total_stores': result['total_stores'],
                'stores_configured': result['stores_configured'],
                'stores_failed': result['stores_failed']
            },
            'details': result['details']
        }, status=status.HTTP_200_OK if result['success'] else status.HTTP_206_PARTIAL_CONTENT)
        
    except Exception as e:
        logger.error(f"Erro na configuração em lote de webhooks: {str(e)}")
        return Response({
            'success': False,
            'message': f'Erro interno: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def configure_webhooks_single(request):
    """
    Configura webhooks para uma loja específica
    """
    try:
        loja_id = request.data.get('loja_id')
        if not loja_id:
            return Response({
                'success': False,
                'message': 'ID da loja é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar se a loja pertence ao usuário
        try:
            loja_config = ShopifyConfig.objects.get(id=loja_id, user=request.user, ativo=True)
        except ShopifyConfig.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Loja não encontrada ou sem permissão'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Obter domínio base
        base_domain = request.data.get('base_domain')
        if not base_domain:
            scheme = 'https' if request.is_secure() else 'http'
            host = request.get_host()
            base_domain = f"{scheme}://{host}"
        
        webhook_url = WebhookBulkManager.generate_webhook_endpoint_url(base_domain)
        
        # Configurar webhooks para a loja
        manager = ShopifyWebhookManager(loja_config)
        
        # Testar conectividade primeiro
        connectivity_test = manager.test_webhook_connectivity()
        if not connectivity_test['success']:
            return Response({
                'success': False,
                'message': f"Erro de conectividade com Shopify: {connectivity_test['error']}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Configurar webhooks
        result = manager.configure_all_webhooks(webhook_url)
        
        return Response({
            'success': result['success'],
            'message': f"Webhooks configurados: {result['total_configured']} sucessos, {result['total_failed']} falhas",
            'webhook_url': webhook_url,
            'loja_nome': loja_config.nome_loja,
            'connectivity_info': connectivity_test,
            'webhooks_configured': result['webhooks_configured'],
            'webhooks_failed': result['webhooks_failed'],
            'messages': result['messages']
        }, status=status.HTTP_200_OK if result['success'] else status.HTTP_206_PARTIAL_CONTENT)
        
    except Exception as e:
        logger.error(f"Erro na configuração de webhook individual: {str(e)}")
        return Response({
            'success': False,
            'message': f'Erro interno: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_webhooks_status(request):
    """
    Lista o status dos webhooks para todas as lojas do usuário
    """
    try:
        lojas = ShopifyConfig.objects.filter(user=request.user, ativo=True)
        
        lojas_status = []
        
        for loja in lojas:
            try:
                manager = ShopifyWebhookManager(loja)
                
                # Testar conectividade
                connectivity = manager.test_webhook_connectivity()
                
                # Listar webhooks existentes
                webhooks = []
                if connectivity['success']:
                    existing_webhooks = manager.list_existing_webhooks()
                    
                    # Filtrar apenas webhooks relevantes
                    relevant_topics = [w['topic'] for w in ShopifyWebhookManager.REQUIRED_WEBHOOKS]
                    
                    for webhook in existing_webhooks:
                        if webhook.get('topic') in relevant_topics:
                            webhooks.append({
                                'id': webhook['id'],
                                'topic': webhook['topic'],
                                'address': webhook['address'],
                                'created_at': webhook.get('created_at'),
                                'updated_at': webhook.get('updated_at')
                            })
                
                lojas_status.append({
                    'loja_id': loja.id,
                    'loja_nome': loja.nome_loja,
                    'shop_url': loja.shop_url,
                    'connectivity': connectivity,
                    'webhooks': webhooks,
                    'webhook_count': len(webhooks),
                    'required_webhooks': len(ShopifyWebhookManager.REQUIRED_WEBHOOKS),
                    'fully_configured': len(webhooks) >= len(ShopifyWebhookManager.REQUIRED_WEBHOOKS)
                })
                
            except Exception as e:
                lojas_status.append({
                    'loja_id': loja.id,
                    'loja_nome': loja.nome_loja,
                    'shop_url': loja.shop_url,
                    'error': str(e),
                    'connectivity': {'success': False, 'error': str(e)},
                    'webhooks': [],
                    'webhook_count': 0,
                    'fully_configured': False
                })
        
        # Estatísticas gerais
        total_lojas = len(lojas_status)
        lojas_configuradas = sum(1 for loja in lojas_status if loja.get('fully_configured', False))
        lojas_com_erro = sum(1 for loja in lojas_status if 'error' in loja)
        
        return Response({
            'success': True,
            'summary': {
                'total_lojas': total_lojas,
                'lojas_configuradas': lojas_configuradas,
                'lojas_pendentes': total_lojas - lojas_configuradas,
                'lojas_com_erro': lojas_com_erro
            },
            'lojas': lojas_status,
            'required_webhooks': ShopifyWebhookManager.REQUIRED_WEBHOOKS
        })
        
    except Exception as e:
        logger.error(f"Erro ao listar status dos webhooks: {str(e)}")
        return Response({
            'success': False,
            'message': f'Erro interno: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cleanup_old_webhooks(request):
    """
    Remove webhooks antigos do ChegouHub das lojas do usuário
    """
    try:
        # Obter base domain para identificar webhooks antigos
        base_domain = request.data.get('base_domain')
        if not base_domain:
            scheme = 'https' if request.is_secure() else 'http'
            host = request.get_host()
            base_domain = f"{scheme}://{host}"
        
        lojas = ShopifyConfig.objects.filter(user=request.user, ativo=True)
        cleanup_results = []
        
        total_removed = 0
        
        for loja in lojas:
            try:
                manager = ShopifyWebhookManager(loja)
                result = manager.cleanup_old_webhooks(base_domain)
                
                cleanup_results.append({
                    'loja_id': loja.id,
                    'loja_nome': loja.nome_loja,
                    'success': result['success'],
                    'webhooks_removed': result['total_removed'],
                    'messages': result['messages']
                })
                
                total_removed += result['total_removed']
                
            except Exception as e:
                cleanup_results.append({
                    'loja_id': loja.id,
                    'loja_nome': loja.nome_loja,
                    'success': False,
                    'error': str(e)
                })
        
        return Response({
            'success': True,
            'message': f"Limpeza concluída: {total_removed} webhooks removidos",
            'total_removed': total_removed,
            'results': cleanup_results
        })
        
    except Exception as e:
        logger.error(f"Erro na limpeza de webhooks antigos: {str(e)}")
        return Response({
            'success': False,
            'message': f'Erro interno: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def webhook_connectivity_test(request):
    """
    Testa a conectividade com as APIs Shopify de todas as lojas
    """
    try:
        loja_id = request.query_params.get('loja_id')
        
        if loja_id:
            # Testar uma loja específica
            try:
                loja_config = ShopifyConfig.objects.get(id=loja_id, user=request.user, ativo=True)
                manager = ShopifyWebhookManager(loja_config)
                test_result = manager.test_webhook_connectivity()
                
                return Response({
                    'success': test_result['success'],
                    'loja_id': loja_config.id,
                    'loja_nome': loja_config.nome_loja,
                    'connectivity_result': test_result
                })
                
            except ShopifyConfig.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Loja não encontrada'
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            # Testar todas as lojas
            lojas = ShopifyConfig.objects.filter(user=request.user, ativo=True)
            test_results = []
            
            for loja in lojas:
                try:
                    manager = ShopifyWebhookManager(loja)
                    test_result = manager.test_webhook_connectivity()
                    
                    test_results.append({
                        'loja_id': loja.id,
                        'loja_nome': loja.nome_loja,
                        'shop_url': loja.shop_url,
                        'connectivity_result': test_result
                    })
                    
                except Exception as e:
                    test_results.append({
                        'loja_id': loja.id,
                        'loja_nome': loja.nome_loja,
                        'shop_url': loja.shop_url,
                        'connectivity_result': {
                            'success': False,
                            'error': str(e)
                        }
                    })
            
            # Estatísticas
            total_lojas = len(test_results)
            lojas_online = sum(1 for result in test_results if result['connectivity_result']['success'])
            
            return Response({
                'success': True,
                'summary': {
                    'total_lojas': total_lojas,
                    'lojas_online': lojas_online,
                    'lojas_offline': total_lojas - lojas_online
                },
                'test_results': test_results
            })
        
    except Exception as e:
        logger.error(f"Erro no teste de conectividade: {str(e)}")
        return Response({
            'success': False,
            'message': f'Erro interno: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def realtime_status(request):
    """
    Endpoint público para verificar status do sistema de tempo real
    """
    try:
        from .services import realtime_service
        
        # Verificar se WebSockets estão disponíveis
        websockets_available = realtime_service.is_available()
        
        # Estatísticas básicas (sem dados sensíveis)
        status_info = {
            'websockets_available': websockets_available,
            'features': {
                'stock_notifications': True,
                'shopify_webhook_processing': True,
                'real_time_alerts': websockets_available,
                'bulk_webhook_configuration': True
            },
            'endpoints': {
                'websocket_stock': '/ws/estoque/',
                'websocket_notifications': '/ws/notifications/',
                'webhook_configure': '/api/sync-realtime/configure-webhooks/',
                'webhook_status': '/api/sync-realtime/webhooks-status/'
            },
            'timestamp': request.timestamp if hasattr(request, 'timestamp') else None
        }
        
        # Se WebSockets não disponíveis, explicar alternativas
        if not websockets_available:
            status_info['fallback_mode'] = {
                'enabled': True,
                'description': 'Sistema funcionará via polling e refresh manual',
                'polling_endpoint': '/api/estoque/produtos/resumo_geral/'
            }
        
        return JsonResponse(status_info)
        
    except Exception as e:
        logger.error(f"Erro no status do sistema de tempo real: {str(e)}")
        return JsonResponse({
            'websockets_available': False,
            'error': 'Sistema temporariamente indisponível',
            'timestamp': None
        }, status=500)