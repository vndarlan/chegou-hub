# backend/features/processamento/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json

from .models import ShopifyConfig, ProcessamentoLog
from .services.shopify_detector import ShopifyDuplicateOrderDetector

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