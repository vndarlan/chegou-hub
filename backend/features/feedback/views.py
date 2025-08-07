from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from .models import Feedback
from .serializers import FeedbackCreateSerializer, FeedbackSerializer
import logging
import traceback

logger = logging.getLogger(__name__)


class FeedbackListView(generics.ListAPIView):
    """View para listar todos os feedbacks."""
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Feedback.objects.all().select_related('usuario')


class FeedbackPendingView(generics.ListAPIView):
    """View para listar feedbacks pendentes/não resolvidos - apenas para administradores."""
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Verificar se o usuário é administrador
        if not self.request.user.is_staff:
            logger.warning(f"Usuário não-admin {self.request.user.username} tentou acessar feedbacks pendentes")
            return Feedback.objects.none()
        
        # Retornar apenas feedbacks pendentes e em análise
        queryset = Feedback.objects.filter(
            status__in=['pendente', 'em_analise']
        ).select_related('usuario').order_by('-data_criacao')
        
        logger.info(f"Retornando {queryset.count()} feedbacks pendentes para admin {self.request.user.username}")
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Override para adicionar logs detalhados"""
        try:
            response = super().list(request, *args, **kwargs)
            logger.info(f"API /api/feedback/pending/ chamada por {request.user.username} - Retornados: {len(response.data)} feedbacks")
            return response
        except Exception as e:
            logger.error(f"Erro ao listar feedbacks pendentes: {str(e)}")
            raise


class FeedbackCreateView(generics.CreateAPIView):
    serializer_class = FeedbackCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        try:
            logger.info(f"Recebendo feedback de {request.user.username}")
            logger.info(f"Dados recebidos: {list(request.data.keys())}")
            
            # Log específico sobre a imagem
            if 'imagem' in request.data:
                image_file = request.data['imagem']
                logger.info(f"Imagem recebida: {image_file.name}, tamanho: {image_file.size} bytes")
            
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                logger.info("Serializer válido, salvando feedback...")
                feedback = serializer.save()
                logger.info(f"Feedback salvo com ID: {feedback.id}")
                return Response({
                    'message': 'Feedback enviado com sucesso!',
                    'id': feedback.id
                }, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"Erro de validação: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Erro interno ao criar feedback: {str(e)}")
            logger.error(f"Traceback completo: {traceback.format_exc()}")
            return Response({
                'error': 'Erro interno do servidor',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def feedback_pending_count(request):
    """Endpoint mais rápido para obter apenas a contagem de feedbacks pendentes."""
    try:
        # Verificar se o usuário é administrador
        if not request.user.is_staff:
            logger.warning(f"Usuário não-admin {request.user.username} tentou acessar contagem de feedbacks pendentes")
            return Response({'count': 0}, status=status.HTTP_200_OK)
        
        # Contar feedbacks pendentes e em análise
        count = Feedback.objects.filter(
            status__in=['pendente', 'em_analise']
        ).count()
        
        logger.info(f"Contagem de feedbacks pendentes para admin {request.user.username}: {count}")
        return Response({'count': count}, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Erro ao contar feedbacks pendentes: {str(e)}")
        return Response({
            'error': 'Erro interno do servidor',
            'count': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)