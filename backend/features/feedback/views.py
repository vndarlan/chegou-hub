from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Feedback
from .serializers import FeedbackCreateSerializer
import logging
import traceback

logger = logging.getLogger(__name__)


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