# backend/features/metricas_ecomhub/admin.py - VERSÃO SIMPLIFICADA
from django.contrib import admin
from .models import AnaliseEcomhub

@admin.register(AnaliseEcomhub)
class AnaliseEcomhubAdmin(admin.ModelAdmin):
    list_display = ('nome', 'tipo_metrica', 'criado_por', 'criado_em', 'atualizado_em')
    list_filter = ('tipo_metrica', 'criado_em', 'criado_por')
    search_fields = ('nome', 'descricao')
    readonly_fields = ('criado_em', 'atualizado_em')
    ordering = ('-atualizado_em',)
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'descricao', 'tipo_metrica', 'criado_por')
        }),
        ('Dados da Análise', {
            'fields': ('dados_efetividade',),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('criado_por')