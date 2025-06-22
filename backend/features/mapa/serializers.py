# backend/features/mapa/models.py
from django.db import models

class StatusPais(models.Model):
    nome = models.CharField(max_length=50, unique=True)
    descricao = models.CharField(max_length=100)
    cor_hex = models.CharField(max_length=7, default="#4CAF50")  # ex: #4CAF50
    ordem = models.IntegerField(default=0)
    
    class Meta:
        verbose_name = "Status do País"
        verbose_name_plural = "Status dos Países"
        ordering = ['ordem']
    
    def __str__(self):
        return self.nome

class Pais(models.Model):
    nome_display = models.CharField(max_length=100)  # "Polônia"
    nome_geojson = models.CharField(max_length=100)  # "Poland" 
    status = models.ForeignKey(StatusPais, on_delete=models.CASCADE)
    latitude = models.FloatField()
    longitude = models.FloatField()
    ativo = models.BooleanField(default=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "País"
        verbose_name_plural = "Países"
        ordering = ['nome_display']
    
    def __str__(self):
        return f"{self.nome_display} - {self.status.nome}"

# backend/features/mapa/serializers.py
from rest_framework import serializers
from .models import Pais, StatusPais

class StatusPaisSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusPais
        fields = '__all__'

class PaisSerializer(serializers.ModelSerializer):
    status_info = StatusPaisSerializer(source='status', read_only=True)
    
    class Meta:
        model = Pais
        fields = '__all__'

# backend/features/mapa/views.py
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
def mapa_data(request):
    """Endpoint otimizado para o mapa"""
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
        
        # Adiciona cor do status
        data['status_colors'][pais.status.nome] = {
            'color': pais.status.cor_hex,
            'description': pais.status.descricao
        }
    
    return Response(data)

# backend/features/mapa/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'status', views.StatusPaisViewSet)
router.register(r'paises', views.PaisViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/mapa-data/', views.mapa_data, name='mapa-data'),
]

# backend/features/mapa/admin.py
from django.contrib import admin
from .models import Pais, StatusPais

@admin.register(StatusPais)
class StatusPaisAdmin(admin.ModelAdmin):
    list_display = ['nome', 'descricao', 'cor_hex', 'ordem']
    list_editable = ['ordem', 'cor_hex']

@admin.register(Pais)
class PaisAdmin(admin.ModelAdmin):
    list_display = ['nome_display', 'nome_geojson', 'status', 'ativo']
    list_filter = ['status', 'ativo']
    search_fields = ['nome_display', 'nome_geojson']
    list_editable = ['ativo']