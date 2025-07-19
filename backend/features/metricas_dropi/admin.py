# backend/features/metricas_dropi/admin.py
from django.contrib import admin
from .models import AnaliseDropi

@admin.register(AnaliseDropi)
class AnaliseDropiAdmin(admin.ModelAdmin):
    list_display = ('nome', 'data_inicio', 'data_fim', 'total_pedidos', 'criado_por', 'criado_em')
    list_filter = ('data_inicio', 'data_fim', 'criado_em', 'criado_por')
    search_fields = ('nome', 'descricao')
    readonly_fields = ('criado_em', 'atualizado_em')
    ordering = ('-atualizado_em',)
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'descricao', 'tipo_metrica', 'criado_por')
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