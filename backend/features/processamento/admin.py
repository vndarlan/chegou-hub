# backend/features/processamento/admin.py
from django.contrib import admin
from .models import ShopifyConfig, ProcessamentoLog

@admin.register(ShopifyConfig)
class ShopifyConfigAdmin(admin.ModelAdmin):
    list_display = ['nome_loja', 'shop_url', 'user', 'ativo', 'data_criacao']
    list_filter = ['ativo', 'data_criacao']
    search_fields = ['nome_loja', 'shop_url', 'user__username']
    readonly_fields = ['data_criacao', 'data_atualizacao']

@admin.register(ProcessamentoLog)
class ProcessamentoLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'config__nome_loja', 'tipo', 'status', 'pedidos_encontrados', 'pedidos_cancelados', 'data_execucao']
    list_filter = ['tipo', 'status', 'data_execucao', 'config__nome_loja']
    search_fields = ['user__username', 'config__nome_loja']
    readonly_fields = ['data_execucao']
    
    def has_add_permission(self, request):
        return False