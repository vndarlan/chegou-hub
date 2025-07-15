from django.contrib import admin
from .models import AnalisePrimeCOD, StatusMappingPrimeCOD

@admin.register(AnalisePrimeCOD)
class AnalisePrimeCODAdmin(admin.ModelAdmin):
    list_display = ('nome', 'criado_por', 'criado_em', 'atualizado_em')
    list_filter = ('criado_em', 'criado_por')
    search_fields = ('nome', 'descricao')
    readonly_fields = ('criado_em', 'atualizado_em')
    ordering = ('-atualizado_em',)
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'descricao', 'criado_por')
        }),
        ('Dados da Análise', {
            'fields': ('dados_leads', 'dados_orders', 'dados_efetividade'),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        })
    )

@admin.register(StatusMappingPrimeCOD)
class StatusMappingPrimeCODAdmin(admin.ModelAdmin):
    list_display = ('categoria', 'status_original', 'status_mapeado', 'ativo', 'criado_em')
    list_filter = ('categoria', 'ativo', 'criado_em')
    search_fields = ('status_original', 'status_mapeado')
    list_editable = ('status_mapeado', 'ativo')
    ordering = ('categoria', 'status_original')
