# backend/features/engajamento/admin.py
from django.contrib import admin
from .models import Engajamento, PedidoEngajamento, ItemPedido

@admin.register(Engajamento)
class EngajamentoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'engajamento_id', 'tipo', 'funcionando', 'ativo', 'data_criacao']
    list_filter = ['tipo', 'funcionando', 'ativo']
    search_fields = ['nome', 'engajamento_id']
    list_editable = ['funcionando', 'ativo']

@admin.register(PedidoEngajamento)
class PedidoEngajamentoAdmin(admin.ModelAdmin):
    list_display = ['id', 'criado_por', 'status', 'total_links', 'data_criacao']
    list_filter = ['status', 'data_criacao']
    readonly_fields = ['resultado_api']