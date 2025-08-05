from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging

from .models import ChatMessage
from .serializers import ChatRequestSerializer, ChatResponseSerializer
from .services import ChatbotService
from .utils import RateLimiter

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ask_chatbot(request):
    """Endpoint para fazer perguntas ao chatbot"""
    
    # Verifica rate limiting
    rate_limiter = RateLimiter(max_requests=20, window_minutes=10)
    if not rate_limiter.is_allowed(request.user.id):
        return Response({
            'error': 'Muitas requisições. Tente novamente em alguns minutos.',
            'remaining_requests': rate_limiter.get_remaining_requests(request.user.id)
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    # Valida entrada
    serializer = ChatRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            'error': 'Dados inválidos',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user_message = serializer.validated_data['message']
    
    try:
        # Chama o serviço do chatbot
        chatbot_service = ChatbotService()
        result = chatbot_service.get_response(user_message, request.user.id)
        
        # Salva no banco
        chat_message = ChatMessage.objects.create(
            user=request.user,
            message=user_message,
            response=result['response'],
            response_time_ms=result['response_time_ms']
        )
        
        # Prepara resposta
        response_data = {
            'response': result['response'],
            'response_time_ms': result['response_time_ms'],
            'message_id': chat_message.id,
            'remaining_requests': rate_limiter.get_remaining_requests(request.user.id)
        }
        
        if not result['success']:
            response_data['warning'] = 'Resposta gerada com limitações devido a erro interno'
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Erro no endpoint ask_chatbot para usuário {request.user.id}: {str(e)}")
        
        return Response({
            'error': 'Erro interno do servidor. Tente novamente.',
            'details': str(e) if request.user.is_staff else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_history(request):
    """Retorna histórico de conversas do usuário"""
    
    try:
        limit = min(int(request.GET.get('limit', 20)), 100)  # Máximo 100
        
        messages = ChatMessage.objects.filter(
            user=request.user
        ).order_by('-created_at')[:limit]
        
        history = []
        for msg in messages:
            history.append({
                'id': msg.id,
                'message': msg.message,
                'response': msg.response,
                'created_at': msg.created_at.isoformat(),
                'response_time_ms': msg.response_time_ms
            })
        
        return Response({
            'history': history,
            'total_messages': ChatMessage.objects.filter(user=request.user).count()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Erro ao buscar histórico para usuário {request.user.id}: {str(e)}")
        
        return Response({
            'error': 'Erro ao buscar histórico'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clear_documents_cache(request):
    """Limpa cache de documentos (apenas para staff)"""
    
    if not request.user.is_staff:
        return Response({
            'error': 'Permissão negada'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        from .utils import DocumentReader
        document_reader = DocumentReader()
        document_reader.clear_cache()
        
        return Response({
            'message': 'Cache de documentos limpo com sucesso'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Erro ao limpar cache: {str(e)}")
        
        return Response({
            'error': 'Erro ao limpar cache'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)