from rest_framework import viewsets, permissions
from .models import ManagedCalendar
from .serializers import ManagedCalendarSerializer

class ManagedCalendarViewSet(viewsets.ModelViewSet):
    """
    API endpoint para listar, criar e deletar Calendários Gerenciados.
    """
    queryset = ManagedCalendar.objects.all().order_by('name')
    serializer_class = ManagedCalendarSerializer
    permission_classes = [permissions.IsAuthenticated]