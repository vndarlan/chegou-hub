from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Pais, StatusPais
from .serializers import PaisSerializer, StatusPaisSerializer

class StatusPaisViewSet(viewsets.ModelViewSet):
    queryset = StatusPais.objects.all()
    serializer_class = StatusPaisSerializer

class PaisViewSet(viewsets.ModelViewSet):
    queryset = Pais.objects.filter(ativo=True)
    serializer_class = PaisSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def mapa_data(request):
    paises = Pais.objects.filter(ativo=True).select_related('status')
    
    data = {
        'paises': [],
        'status_colors': {}
    }
    
    for pais in paises:
        data['paises'].append({
            'nome_display': pais.nome_display,
            'nome_geojson': pais.nome_geojson,
            'status': pais.status.nome,
            'coordinates': [pais.latitude, pais.longitude]
        })
        
        data['status_colors'][pais.status.nome] = {
            'color': pais.status.cor_hex,
            'description': pais.status.descricao
        }
    
    return Response(data)