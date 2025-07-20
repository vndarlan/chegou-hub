# backend/features/metricas_dropi/admin.py
from django.contrib import admin
from .models import AnaliseDropi, DropiToken

@admin.register(DropiToken)
class DropiTokenAdmin(admin.ModelAdmin):
    list_display = ('pais', 'is_valid', 'expires_at', 'updated_at')
    list_filter = ('pais', 'expires_at')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-updated_at',)
    
    def is_valid(self, obj):
        return obj.is_valid
    is_valid.boolean = True
    is_valid.short_description = 'Token Válido'

@admin.register(AnaliseDropi)
class AnaliseDropiAdmin(admin.ModelAdmin):
    list_display = ('nome', 'pais', 'data_inicio', 'data_fim', 'total_pedidos', 'criado_por', 'criado_em')
    list_filter = ('pais', 'data_inicio', 'data_fim', 'criado_em', 'criado_por')
    search_fields = ('nome', 'descricao')
    readonly_fields = ('criado_em', 'atualizado_em')
    ordering = ('-atualizado_em',)
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'descricao', 'tipo_metrica', 'pais', 'criado_por')
        }),
        ('Filtros da Análise', {
            'fields': ('data_inicio', 'data_fim', 'user_id_dropi', 'total_pedidos')
        }),
        ('Dados', {
            'fields': ('dados_pedidos',),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        })
    )