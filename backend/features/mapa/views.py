from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import Group
from .models import Pais, StatusPais
from .serializers import PaisSerializer, StatusPaisSerializer

# Permissão customizada para gerenciamento do mapa
class CanManageMapaPermission:
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Superuser sempre pode
        if request.user.is_superuser:
            return True
        
        # Verificar se está em grupos específicos que podem gerenciar mapa
        allowed_groups = ['Diretoria', 'Operacional', 'Gestão']
        user_groups = request.user.groups.values_list('name', flat=True)
        
        return any(group in allowed_groups for group in user_groups)

class StatusPaisViewSet(viewsets.ModelViewSet):
    queryset = StatusPais.objects.all()
    serializer_class = StatusPaisSerializer
    permission_classes = [IsAuthenticated, CanManageMapaPermission]

class PaisViewSet(viewsets.ModelViewSet):
    queryset = Pais.objects.filter(ativo=True)
    serializer_class = PaisSerializer
    permission_classes = [IsAuthenticated, CanManageMapaPermission]

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_mapa_permissions(request):
    """Verifica se o usuário pode gerenciar o mapa"""
    permission = CanManageMapaPermission()
    can_manage = permission.has_permission(request, None)
    
    return Response({
        'can_manage': can_manage,
        'user_groups': list(request.user.groups.values_list('name', flat=True))
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def available_countries(request):
    """Lista de países disponíveis para seleção"""
    # Lista básica de países comuns - pode expandir conforme necessário
    countries = [
        {'nome_geojson': 'Brazil', 'nome_display': 'Brasil'},
        {'nome_geojson': 'United States of America', 'nome_display': 'Estados Unidos'},
        {'nome_geojson': 'Argentina', 'nome_display': 'Argentina'},
        {'nome_geojson': 'Chile', 'nome_display': 'Chile'},
        {'nome_geojson': 'Colombia', 'nome_display': 'Colômbia'},
        {'nome_geojson': 'Mexico', 'nome_display': 'México'},
        {'nome_geojson': 'Peru', 'nome_display': 'Peru'},
        {'nome_geojson': 'Uruguay', 'nome_display': 'Uruguai'},
        {'nome_geojson': 'Paraguay', 'nome_display': 'Paraguai'},
        {'nome_geojson': 'Ecuador', 'nome_display': 'Equador'},
        {'nome_geojson': 'Bolivia', 'nome_display': 'Bolívia'},
        {'nome_geojson': 'Venezuela', 'nome_display': 'Venezuela'},
        {'nome_geojson': 'Portugal', 'nome_display': 'Portugal'},
        {'nome_geojson': 'Spain', 'nome_display': 'Espanha'},
        {'nome_geojson': 'France', 'nome_display': 'França'},
        {'nome_geojson': 'Italy', 'nome_display': 'Itália'},
        {'nome_geojson': 'Germany', 'nome_display': 'Alemanha'},
        {'nome_geojson': 'United Kingdom', 'nome_display': 'Reino Unido'},
    ]
    
    # Filtrar países que já estão no banco
    existing_countries = set(Pais.objects.values_list('nome_geojson', flat=True))
    available = [c for c in countries if c['nome_geojson'] not in existing_countries]
    
    return Response(available)