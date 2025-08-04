from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from .models import Feedback
from .serializers import FeedbackSerializer, FeedbackCreateSerializer, FeedbackUpdateStatusSerializer


class FeedbackCreateView(generics.CreateAPIView):
    serializer_class = FeedbackCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            feedback = serializer.save()
            return Response({
                'message': 'Feedback enviado com sucesso!',
                'id': feedback.id
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FeedbackListView(generics.ListAPIView):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Verificar se usuário é staff
        if not self.request.user.is_staff:
            return Feedback.objects.none()
            
        queryset = Feedback.objects.all()
        categoria = self.request.query_params.get('categoria')
        status_param = self.request.query_params.get('status')
        prioridade = self.request.query_params.get('prioridade')
        
        if categoria:
            queryset = queryset.filter(categoria=categoria)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if prioridade:
            queryset = queryset.filter(prioridade=prioridade)
            
        return queryset


class FeedbackUpdateStatusView(generics.UpdateAPIView):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackUpdateStatusSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Apenas staff pode atualizar status
        if not self.request.user.is_staff:
            return Feedback.objects.none()
        return Feedback.objects.all()
    
    def update(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({'error': 'Acesso negado'}, status=status.HTTP_403_FORBIDDEN)
            
        response = super().update(request, *args, **kwargs)
        return Response({
            'message': 'Status atualizado com sucesso!',
            'data': response.data
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def feedback_stats(request):
    if not request.user.is_staff:
        return Response({'error': 'Acesso negado'}, status=status.HTTP_403_FORBIDDEN)
    
    stats = {
        'total': Feedback.objects.count(),
        'pendentes': Feedback.objects.filter(status='pendente').count(),
        'em_analise': Feedback.objects.filter(status='em_analise').count(),
        'resolvidos': Feedback.objects.filter(status='resolvido').count(),
        'por_categoria': {
            'bug': Feedback.objects.filter(categoria='bug').count(),
            'melhoria': Feedback.objects.filter(categoria='melhoria').count(),
            'usabilidade': Feedback.objects.filter(categoria='usabilidade').count(),
            'outro': Feedback.objects.filter(categoria='outro').count(),
        },
        'por_prioridade': {
            'alta': Feedback.objects.filter(prioridade='alta').count(),
            'media': Feedback.objects.filter(prioridade='media').count(),
            'baixa': Feedback.objects.filter(prioridade='baixa').count(),
        }
    }
    
    return Response(stats)