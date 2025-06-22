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