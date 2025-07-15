# backend/features/metricas_ecomhub/admin.py - VERSÃO ATUALIZADA COM SHOPIFY
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import AnaliseEcomhub, StatusMappingEcomhub, LojaShopify, CacheProdutoShopify

@admin.register(LojaShopify)
class LojaShopifyAdmin(admin.ModelAdmin):
    list_display = ('nome', 'shopify_domain', 'pais', 'status_conexao', 'ativo', 'criado_em')
    list_filter = ('ativo', 'pais', 'criado_em', 'testado_em')
    search_fields = ('nome', 'shopify_domain', 'descricao')
    readonly_fields = ('criado_em', 'atualizado_em', 'testado_em', 'ultimo_erro')
    list_editable = ('ativo',)
    ordering = ('nome',)
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'shopify_domain', 'descricao', 'ativo')
        }),
        ('Configurações API', {
            'fields': ('access_token', 'api_version'),
            'classes': ('collapse',)
        }),
        ('Localização', {
            'fields': ('pais', 'moeda'),
            'classes': ('collapse',)
        }),
        ('Status da Conexão', {
            'fields': ('testado_em', 'ultimo_erro'),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('criado_por', 'criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        })
    )
    
    def status_conexao(self, obj):
        if obj.ultimo_erro:
            return format_html(
                '<span style="color: red;">❌ Erro</span>'
            )
        elif obj.testado_em:
            return format_html(
                '<span style="color: green;">✅ Conectado</span>'
            )
        else:
            return format_html(
                '<span style="color: orange;">⚠️ Não testado</span>'
            )
    status_conexao.short_description = 'Status da Conexão'
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.criado_por = request.user
        super().save_model(request, obj, form, change)

@admin.register(AnaliseEcomhub)
class AnaliseEcomhubAdmin(admin.ModelAdmin):
    list_display = ('nome', 'tipo_metrica', 'loja_shopify_display', 'criado_por', 'criado_em', 'atualizado_em')
    list_filter = ('tipo_metrica', 'criado_em', 'criado_por', 'loja_shopify')
    search_fields = ('nome', 'descricao')
    readonly_fields = ('criado_em', 'atualizado_em')
    ordering = ('-atualizado_em',)
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'descricao', 'tipo_metrica', 'criado_por')
        }),
        ('Configuração Shopify', {
            'fields': ('loja_shopify',),
            'classes': ('collapse',)
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
    
    def loja_shopify_display(self, obj):
        if obj.loja_shopify:
            return format_html(
                '<a href="{}">{}</a>',
                reverse('admin:metricas_ecomhub_lojashopify_change', args=[obj.loja_shopify.pk]),
                obj.loja_shopify.nome
            )
        return '-'
    loja_shopify_display.short_description = 'Loja Shopify'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('loja_shopify', 'criado_por')

@admin.register(CacheProdutoShopify)
class CacheProdutoShopifyAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'loja_shopify', 'produto_nome', 'sku', 'criado_em')
    list_filter = ('loja_shopify', 'criado_em')
    search_fields = ('order_number', 'produto_nome', 'sku', 'produto_id')
    readonly_fields = ('criado_em', 'atualizado_em')
    ordering = ('-atualizado_em',)
    
    fieldsets = (
        ('Informações do Pedido', {
            'fields': ('loja_shopify', 'order_number')
        }),
        ('Informações do Produto', {
            'fields': ('produto_nome', 'produto_id', 'variant_id', 'sku')
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('loja_shopify')
    
    actions = ['limpar_cache_selecionados']
    
    def limpar_cache_selecionados(self, request, queryset):
        count = queryset.count()
        queryset.delete()
        self.message_user(request, f'{count} entradas de cache foram removidas.')
    limpar_cache_selecionados.short_description = 'Limpar cache selecionados'

@admin.register(StatusMappingEcomhub)
class StatusMappingEcomhubAdmin(admin.ModelAdmin):
    list_display = ('status_original', 'status_mapeado', 'ativo', 'criado_em')
    list_filter = ('ativo', 'criado_em')
    search_fields = ('status_original', 'status_mapeado')
    list_editable = ('status_mapeado', 'ativo')
    ordering = ('status_original',)
    
    fieldsets = (
        ('Mapeamento', {
            'fields': ('status_original', 'status_mapeado', 'ativo')
        }),
        ('Metadados', {
            'fields': ('criado_em',),
            'classes': ('collapse',)
        })
    )