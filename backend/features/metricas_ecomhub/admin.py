from django.contrib import admin
from .models import AnaliseEcomhub, StatusMappingEcomhub

@admin.register(AnaliseEcomhub)
class AnaliseEcomhubAdmin(admin.ModelAdmin):
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
            'fields': ('dados_efetividade',),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        })
    )

@admin.register(StatusMappingEcomhub)
class StatusMappingEcomhubAdmin(admin.ModelAdmin):
    list_display = ('status_original', 'status_mapeado', 'ativo', 'criado_em')
    list_filter = ('ativo', 'criado_em')
    search_fields = ('status_original', 'status_mapeado')
    list_editable = ('status_mapeado', 'ativo')
    ordering = ('status_original',)