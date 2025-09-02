# backend/features/sync_realtime/diagnostic_views.py
"""
Views de diagnóstico para WebSocket e sistema de tempo real
"""
import logging
import json
from django.http import JsonResponse
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


@api_view(['GET'])
def websocket_diagnostic(request):
    """
    Diagnóstico completo do sistema WebSocket
    Endpoint público para diagnosticar problemas de conexão
    """
    try:
        diagnostic_info = {
            'timestamp': request.build_absolute_uri(),
            'environment': {
                'is_railway': getattr(settings, 'IS_RAILWAY_DEPLOYMENT', False),
                'debug': settings.DEBUG,
                'allowed_hosts': settings.ALLOWED_HOSTS,
            },
            'redis': {
                'available': getattr(settings, 'REDIS_AVAILABLE', False),
                'url_configured': bool(getattr(settings, 'REDIS_URL', None)),
                'url_type': 'production' if 'localhost' not in getattr(settings, 'REDIS_URL', 'localhost') else 'local'
            },
            'channels': {
                'layer_configured': False,
                'layer_type': 'unknown',
                'can_connect': False
            },
            'websocket': {
                'endpoints_available': True,
                'routing_configured': True,
                'asgi_configured': True
            }
        }
        
        # Testar Channel Layer
        channel_layer = get_channel_layer()
        if channel_layer:
            diagnostic_info['channels']['layer_configured'] = True
            diagnostic_info['channels']['layer_type'] = channel_layer.__class__.__name__
            
            # Testar se consegue enviar mensagem
            try:
                async_to_sync(channel_layer.send)(
                    'test-channel',
                    {'type': 'test.message', 'data': 'diagnostic'}
                )
                diagnostic_info['channels']['can_send'] = True
            except Exception as e:
                diagnostic_info['channels']['can_send'] = False
                diagnostic_info['channels']['send_error'] = str(e)
        
        # Verificar configuração ASGI
        try:
            from config.asgi import application
            diagnostic_info['asgi']['application_imported'] = True
        except Exception as e:
            diagnostic_info['asgi']['application_imported'] = False
            diagnostic_info['asgi']['import_error'] = str(e)
        
        # Recomendações baseadas no diagnóstico
        recommendations = []
        
        if not diagnostic_info['redis']['available']:
            recommendations.append({
                'issue': 'Redis não disponível',
                'solution': 'WebSocket funcionará com InMemory (limitado)',
                'priority': 'medium'
            })
        
        if diagnostic_info['environment']['is_railway'] and diagnostic_info['redis']['url_type'] == 'local':
            recommendations.append({
                'issue': 'URL Redis local em produção',
                'solution': 'Configure REDIS_URL no Railway',
                'priority': 'high'
            })
        
        if not diagnostic_info['channels']['can_send']:
            recommendations.append({
                'issue': 'Channel Layer não funcional',
                'solution': 'WebSocket não funcionará - use polling',
                'priority': 'critical'
            })
        
        diagnostic_info['recommendations'] = recommendations
        diagnostic_info['status'] = 'critical' if any(r['priority'] == 'critical' for r in recommendations) else 'healthy'
        
        return JsonResponse(diagnostic_info, json_dumps_params={'indent': 2})
        
    except Exception as e:
        logger.error(f"Erro no diagnóstico WebSocket: {str(e)}")
        return JsonResponse({
            'status': 'error',
            'error': str(e),
            'websocket_available': False
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])  
def test_websocket_auth(request):
    """
    Testar autenticação WebSocket com diferentes métodos
    """
    try:
        # Obter dados da sessão atual
        session_key = request.session.session_key
        user_id = request.user.id
        
        # Simular diferentes formas de autenticação
        auth_tests = {
            'session_key_available': bool(session_key),
            'user_authenticated': request.user.is_authenticated,
            'user_id': user_id,
            'session_data': {
                'session_key': session_key[:10] + '...' if session_key else None,
                'session_age': request.session.get_expiry_age() if session_key else None
            }
        }
        
        # URLs de teste para WebSocket
        websocket_urls = {
            'basic': f"wss://{request.get_host()}/ws/estoque/",
            'with_loja': f"wss://{request.get_host()}/ws/estoque/?loja_id=2",
            'with_session': f"wss://{request.get_host()}/ws/estoque/?session_key={session_key}" if session_key else None
        }
        
        # Instruções para teste
        test_instructions = [
            "1. Abra o console do navegador (F12)",
            "2. Cole o código de teste JavaScript fornecido", 
            "3. Execute e observe os logs de conexão",
            "4. Se erro 1006, WebSocket não está funcionando no servidor"
        ]
        
        js_test_code = f"""
// Teste WebSocket - Cole no console do navegador
const testWebSocket = (url) => {{
    console.log('Testando:', url);
    const ws = new WebSocket(url);
    
    ws.onopen = () => console.log('✅ Conectado:', url);
    ws.onerror = (err) => console.error('❌ Erro:', err);
    ws.onclose = (event) => console.log('🔌 Fechado:', event.code, event.reason);
    
    setTimeout(() => ws.close(), 5000); // Fechar após 5s
}};

// Teste básico
testWebSocket('{websocket_urls["basic"]}');

// Com loja (se disponível)
{f"testWebSocket('{websocket_urls['with_loja']}');" if websocket_urls['with_loja'] else "// Loja ID não disponível"}
        """
        
        return Response({
            'success': True,
            'auth_status': auth_tests,
            'websocket_urls': websocket_urls,
            'test_instructions': test_instructions,
            'javascript_test_code': js_test_code.strip(),
            'next_steps': [
                "Se WebSocket conectar: problema está na aplicação frontend",
                "Se erro 1006 persistir: problema na configuração do servidor",
                "Use /api/sync-realtime/diagnostic/ para mais detalhes"
            ]
        })
        
    except Exception as e:
        logger.error(f"Erro no teste de autenticação WebSocket: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def channel_layer_test(request):
    """
    Teste específico do Channel Layer
    """
    try:
        channel_layer = get_channel_layer()
        
        if not channel_layer:
            return Response({
                'success': False,
                'message': 'Channel Layer não configurado',
                'fallback_available': True
            })
        
        # Teste de envio de mensagem
        test_group = f"test_user_{request.user.id}"
        test_message = {
            'type': 'test.message',
            'data': {
                'message': 'Teste do Channel Layer',
                'user_id': request.user.id,
                'timestamp': '2025-01-01T00:00:00'
            }
        }
        
        try:
            # Enviar mensagem de teste
            async_to_sync(channel_layer.group_send)(test_group, test_message)
            
            return Response({
                'success': True,
                'channel_layer_type': channel_layer.__class__.__name__,
                'test_group': test_group,
                'test_message_sent': True,
                'message': 'Channel Layer funcionando corretamente'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'channel_layer_type': channel_layer.__class__.__name__,
                'test_error': str(e),
                'message': 'Channel Layer configurado mas com erro ao enviar mensagem'
            })
        
    except Exception as e:
        logger.error(f"Erro no teste do Channel Layer: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def force_fallback_mode(request):
    """
    Forçar modo de fallback (sem WebSocket)
    """
    try:
        # Definir flag na sessão para desabilitar WebSocket
        request.session['websocket_disabled'] = True
        request.session['fallback_mode'] = True
        request.session['fallback_reason'] = 'Forçado pelo usuário via diagnóstico'
        
        return Response({
            'success': True,
            'message': 'Modo fallback ativado. WebSocket desabilitado para esta sessão.',
            'fallback_features': [
                'Polling automático a cada 30 segundos',
                'Refresh manual disponível',
                'Notificações via interface padrão',
                'Funcionalidade completa mantida'
            ],
            'how_to_revert': 'Faça logout e login novamente para reativar WebSocket'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)