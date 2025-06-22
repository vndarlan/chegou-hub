from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import Group
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
import json
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

@csrf_exempt
@api_view(['POST'])
def add_pais_simple(request):
    """View simplificada para adicionar país sem CSRF"""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Não autenticado'}, status=401)
    
    # Simplificar permissões - permitir qualquer usuário logado por enquanto
    try:
        data = json.loads(request.body)
        
        # Criar país
        pais = Pais.objects.create(
            nome_display=data['nome_display'],
            nome_geojson=data['nome_geojson'],
            status_id=data['status'],
            latitude=data['latitude'],
            longitude=data['longitude'],
            ativo=data.get('ativo', True)
        )
        
        return JsonResponse({
            'id': pais.id,
            'nome_display': pais.nome_display,
            'message': 'País adicionado com sucesso!'
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_user_info(request):
    """Debug das informações do usuário"""
    return Response({
        'user': request.user.username,
        'is_authenticated': request.user.is_authenticated,
        'is_superuser': request.user.is_superuser,
        'groups': list(request.user.groups.values_list('name', flat=True)),
        'all_groups': list(Group.objects.values_list('name', flat=True))
    })

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
    """Lista completa de países do mundo"""
    countries = [
        {'nome_geojson': 'Afghanistan', 'nome_display': 'Afeganistão'},
        {'nome_geojson': 'Albania', 'nome_display': 'Albânia'},
        {'nome_geojson': 'Algeria', 'nome_display': 'Argélia'},
        {'nome_geojson': 'Argentina', 'nome_display': 'Argentina'},
        {'nome_geojson': 'Armenia', 'nome_display': 'Armênia'},
        {'nome_geojson': 'Australia', 'nome_display': 'Austrália'},
        {'nome_geojson': 'Austria', 'nome_display': 'Áustria'},
        {'nome_geojson': 'Azerbaijan', 'nome_display': 'Azerbaijão'},
        {'nome_geojson': 'Bangladesh', 'nome_display': 'Bangladesh'},
        {'nome_geojson': 'Belarus', 'nome_display': 'Belarus'},
        {'nome_geojson': 'Belgium', 'nome_display': 'Bélgica'},
        {'nome_geojson': 'Bolivia', 'nome_display': 'Bolívia'},
        {'nome_geojson': 'Brazil', 'nome_display': 'Brasil'},
        {'nome_geojson': 'Bulgaria', 'nome_display': 'Bulgária'},
        {'nome_geojson': 'Cambodia', 'nome_display': 'Camboja'},
        {'nome_geojson': 'Cameroon', 'nome_display': 'Camarões'},
        {'nome_geojson': 'Canada', 'nome_display': 'Canadá'},
        {'nome_geojson': 'Chile', 'nome_display': 'Chile'},
        {'nome_geojson': 'China', 'nome_display': 'China'},
        {'nome_geojson': 'Colombia', 'nome_display': 'Colômbia'},
        {'nome_geojson': 'Croatia', 'nome_display': 'Croácia'},
        {'nome_geojson': 'Cuba', 'nome_display': 'Cuba'},
        {'nome_geojson': 'Czech Republic', 'nome_display': 'República Tcheca'},
        {'nome_geojson': 'Denmark', 'nome_display': 'Dinamarca'},
        {'nome_geojson': 'Ecuador', 'nome_display': 'Equador'},
        {'nome_geojson': 'Egypt', 'nome_display': 'Egito'},
        {'nome_geojson': 'Estonia', 'nome_display': 'Estônia'},
        {'nome_geojson': 'Finland', 'nome_display': 'Finlândia'},
        {'nome_geojson': 'France', 'nome_display': 'França'},
        {'nome_geojson': 'Germany', 'nome_display': 'Alemanha'},
        {'nome_geojson': 'Ghana', 'nome_display': 'Gana'},
        {'nome_geojson': 'Greece', 'nome_display': 'Grécia'},
        {'nome_geojson': 'Hungary', 'nome_display': 'Hungria'},
        {'nome_geojson': 'Iceland', 'nome_display': 'Islândia'},
        {'nome_geojson': 'India', 'nome_display': 'Índia'},
        {'nome_geojson': 'Indonesia', 'nome_display': 'Indonésia'},
        {'nome_geojson': 'Iran', 'nome_display': 'Irã'},
        {'nome_geojson': 'Iraq', 'nome_display': 'Iraque'},
        {'nome_geojson': 'Ireland', 'nome_display': 'Irlanda'},
        {'nome_geojson': 'Israel', 'nome_display': 'Israel'},
        {'nome_geojson': 'Italy', 'nome_display': 'Itália'},
        {'nome_geojson': 'Japan', 'nome_display': 'Japão'},
        {'nome_geojson': 'Kazakhstan', 'nome_display': 'Cazaquistão'},
        {'nome_geojson': 'Kenya', 'nome_display': 'Quênia'},
        {'nome_geojson': 'Latvia', 'nome_display': 'Letônia'},
        {'nome_geojson': 'Lithuania', 'nome_display': 'Lituânia'},
        {'nome_geojson': 'Malaysia', 'nome_display': 'Malásia'},
        {'nome_geojson': 'Mexico', 'nome_display': 'México'},
        {'nome_geojson': 'Morocco', 'nome_display': 'Marrocos'},
        {'nome_geojson': 'Netherlands', 'nome_display': 'Holanda'},
        {'nome_geojson': 'New Zealand', 'nome_display': 'Nova Zelândia'},
        {'nome_geojson': 'Nigeria', 'nome_display': 'Nigéria'},
        {'nome_geojson': 'Norway', 'nome_display': 'Noruega'},
        {'nome_geojson': 'Pakistan', 'nome_display': 'Paquistão'},
        {'nome_geojson': 'Paraguay', 'nome_display': 'Paraguai'},
        {'nome_geojson': 'Peru', 'nome_display': 'Peru'},
        {'nome_geojson': 'Philippines', 'nome_display': 'Filipinas'},
        {'nome_geojson': 'Poland', 'nome_display': 'Polônia'},
        {'nome_geojson': 'Portugal', 'nome_display': 'Portugal'},
        {'nome_geojson': 'Romania', 'nome_display': 'Romênia'},
        {'nome_geojson': 'Russia', 'nome_display': 'Rússia'},
        {'nome_geojson': 'Saudi Arabia', 'nome_display': 'Arábia Saudita'},
        {'nome_geojson': 'South Africa', 'nome_display': 'África do Sul'},
        {'nome_geojson': 'South Korea', 'nome_display': 'Coreia do Sul'},
        {'nome_geojson': 'Spain', 'nome_display': 'Espanha'},
        {'nome_geojson': 'Sweden', 'nome_display': 'Suécia'},
        {'nome_geojson': 'Switzerland', 'nome_display': 'Suíça'},
        {'nome_geojson': 'Thailand', 'nome_display': 'Tailândia'},
        {'nome_geojson': 'Turkey', 'nome_display': 'Turquia'},
        {'nome_geojson': 'Ukraine', 'nome_display': 'Ucrânia'},
        {'nome_geojson': 'United Arab Emirates', 'nome_display': 'Emirados Árabes Unidos'},
        {'nome_geojson': 'United Kingdom', 'nome_display': 'Reino Unido'},
        {'nome_geojson': 'United States of America', 'nome_display': 'Estados Unidos'},
        {'nome_geojson': 'Uruguay', 'nome_display': 'Uruguai'},
        {'nome_geojson': 'Venezuela', 'nome_display': 'Venezuela'},
        {'nome_geojson': 'Vietnam', 'nome_display': 'Vietnã'},
    ]
    
    # Filtrar países que já estão no banco
    existing_countries = set(Pais.objects.values_list('nome_geojson', flat=True))
    available = [c for c in countries if c['nome_geojson'] not in existing_countries]
    
    return Response(available)