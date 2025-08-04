from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Feedback
from .serializers import FeedbackCreateSerializer


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