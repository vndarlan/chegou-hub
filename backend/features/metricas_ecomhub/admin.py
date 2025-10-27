# backend/features/metricas_ecomhub/admin.py - COM SISTEMA COMPLETO DE TRACKING DE STATUS
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    AnaliseEcomhub, PedidoStatusAtual, HistoricoStatus,
    ConfiguracaoStatusTracking, EcomhubOrder, EcomhubStatusHistory, EcomhubAlertConfig
)


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


class HistoricoStatusInline(admin.TabularInline):
    """Inline para histórico de status dentro de PedidoStatusAtual"""
    model = HistoricoStatus
    extra = 0
    readonly_fields = ('status_anterior', 'status_novo', 'data_mudanca', 'tempo_no_status_anterior', 'created_at')
    ordering = ('-data_mudanca',)
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(PedidoStatusAtual)
class PedidoStatusAtualAdmin(admin.ModelAdmin):
    list_display = (
        'pedido_id', 'status_atual', 'customer_name', 'pais', 
        'tempo_no_status_dias', 'nivel_alerta_colorido', 'data_criacao', 'updated_at'
    )
    list_filter = (
        'nivel_alerta', 'status_atual', 'pais', 'data_criacao', 'updated_at'
    )
    search_fields = (
        'pedido_id', 'customer_name', 'customer_email', 'produto_nome', 'shopify_order_number'
    )
    readonly_fields = (
        'nivel_alerta', 'tempo_no_status_dias', 'created_at', 'updated_at'
    )
    ordering = ('-tempo_no_status_atual', '-updated_at')
    inlines = [HistoricoStatusInline]
    
    fieldsets = (
        ('Informações do Pedido', {
            'fields': (
                'pedido_id', 'shopify_order_number', 'status_atual', 
                'data_criacao', 'data_ultima_atualizacao'
            )
        }),
        ('Dados do Cliente', {
            'fields': ('customer_name', 'customer_email', 'customer_phone')
        }),
        ('Produto e Entrega', {
            'fields': ('produto_nome', 'pais', 'preco', 'tracking_url')
        }),
        ('Controle de Tempo e Alertas', {
            'fields': (
                'tempo_no_status_atual', 'tempo_no_status_dias', 'nivel_alerta'
            ),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def nivel_alerta_colorido(self, obj):
        """Exibe o nível de alerta com cores"""
        cores = {
            'normal': '#28a745',      # Verde
            'amarelo': '#ffc107',     # Amarelo
            'vermelho': '#dc3545',    # Vermelho
            'critico': '#6f42c1'      # Roxo
        }
        cor = cores.get(obj.nivel_alerta, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            cor,
            obj.get_nivel_alerta_display()
        )
    nivel_alerta_colorido.short_description = 'Nível de Alerta'
    nivel_alerta_colorido.admin_order_field = 'nivel_alerta'
    
    def tempo_no_status_dias(self, obj):
        """Exibe tempo em dias com formatação"""
        dias = obj.tempo_no_status_atual / 24 if obj.tempo_no_status_atual else 0
        if dias >= 21:
            cor = '#6f42c1'  # Roxo para crítico
        elif dias >= 14:
            cor = '#dc3545'  # Vermelho
        elif dias >= 7:
            cor = '#ffc107'  # Amarelo
        else:
            cor = '#28a745'  # Verde
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.1f} dias</span>',
            cor,
            dias
        )
    tempo_no_status_dias.short_description = 'Tempo no Status (dias)'
    tempo_no_status_dias.admin_order_field = 'tempo_no_status_atual'
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('historico')


@admin.register(HistoricoStatus)
class HistoricoStatusAdmin(admin.ModelAdmin):
    list_display = (
        'pedido_link', 'status_anterior', 'status_novo', 
        'data_mudanca', 'tempo_no_status_anterior_dias', 'created_at'
    )
    list_filter = (
        'status_anterior', 'status_novo', 'data_mudanca', 'created_at'
    )
    search_fields = (
        'pedido__pedido_id', 'pedido__customer_name', 'status_anterior', 'status_novo'
    )
    readonly_fields = (
        'pedido', 'status_anterior', 'status_novo', 'data_mudanca', 
        'tempo_no_status_anterior', 'created_at'
    )
    ordering = ('-data_mudanca',)
    
    def pedido_link(self, obj):
        """Link para o pedido relacionado"""
        url = reverse('admin:metricas_ecomhub_pedidostatusatual_change', args=[obj.pedido.pk])
        return format_html('<a href="{}">{}</a>', url, obj.pedido.pedido_id)
    pedido_link.short_description = 'Pedido ID'
    
    def tempo_no_status_anterior_dias(self, obj):
        """Tempo no status anterior em dias"""
        dias = obj.tempo_no_status_anterior / 24 if obj.tempo_no_status_anterior else 0
        return f"{dias:.1f} dias"
    tempo_no_status_anterior_dias.short_description = 'Tempo Anterior (dias)'
    tempo_no_status_anterior_dias.admin_order_field = 'tempo_no_status_anterior'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('pedido')


@admin.register(ConfiguracaoStatusTracking)
class ConfiguracaoStatusTrackingAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'limite_amarelo_padrao', 'limite_vermelho_padrao', 
        'limite_critico_padrao', 'intervalo_sincronizacao', 
        'ultima_sincronizacao', 'updated_at'
    )
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Limites de Alerta Padrão (horas)', {
            'fields': (
                'limite_amarelo_padrao', 'limite_vermelho_padrao', 'limite_critico_padrao'
            )
        }),
        ('Limites para Entrega (horas)', {
            'fields': (
                'limite_amarelo_entrega', 'limite_vermelho_entrega', 'limite_critico_entrega'
            )
        }),
        ('Configurações de Sincronização', {
            'fields': ('intervalo_sincronizacao', 'ultima_sincronizacao')
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def has_add_permission(self, request):
        # Permitir apenas uma configuração
        return not ConfiguracaoStatusTracking.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False


# Customizações no admin
admin.site.site_header = "ECOMHUB Status Tracking Admin"
admin.site.site_title = "ECOMHUB Admin"
admin.site.index_title = "Painel de Controle - Status Tracking"

# Admin para gerenciamento de lojas ECOMHUB
from .models import EcomhubStore


@admin.register(EcomhubStore)
class EcomhubStoreAdmin(admin.ModelAdmin):
    list_display = ['name', 'country_name', 'is_active', 'last_sync', 'created_at']
    list_filter = ['is_active', 'country_name']
    search_fields = ['name', 'token', 'store_id']
    readonly_fields = ['id', 'store_id', 'myshopify_domain', 'country_id',
                      'country_name', 'last_sync', 'created_at', 'updated_at']

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'is_active')
        }),
        ('Credenciais API', {
            'fields': ('token', 'secret'),
            'classes': ('collapse',)
        }),
        ('Dados Detectados', {
            'fields': ('store_id', 'myshopify_domain', 'country_id', 'country_name')
        }),
        ('Sincronização', {
            'fields': ('last_sync',)
        }),
        ('Metadados', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


# ===========================================
# SPRINT 1: ADMIN PARA TRACKING OTIMIZADO
# ===========================================

@admin.register(EcomhubOrder)
class EcomhubOrderAdmin(admin.ModelAdmin):
    list_display = ['order_id', 'store', 'country_name', 'status', 'customer_name',
                    'alert_level', 'time_in_status_hours', 'date']
    list_filter = ['status', 'alert_level', 'country_name', 'store']
    search_fields = ['order_id', 'customer_name', 'customer_email', 'product_name']
    readonly_fields = ['order_id', 'created_at', 'updated_at']
    date_hierarchy = 'date'

    fieldsets = (
        ('Identificação', {
            'fields': ('order_id', 'store', 'country_id', 'country_name')
        }),
        ('Dados do Pedido', {
            'fields': ('price', 'date', 'status', 'shipping_postal_code',
                      'customer_name', 'customer_email', 'product_name')
        }),
        ('Custos', {
            'fields': ('cost_commission', 'cost_commission_return', 'cost_courier',
                      'cost_courier_return', 'cost_payment_method',
                      'cost_warehouse', 'cost_warehouse_return'),
            'classes': ('collapse',)
        }),
        ('Tracking', {
            'fields': ('status_since', 'time_in_status_hours', 'previous_status', 'alert_level')
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(EcomhubStatusHistory)
class EcomhubStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ['order', 'status_from', 'status_to', 'changed_at', 'duration_in_previous_status_hours']
    list_filter = ['status_from', 'status_to', 'changed_at']
    search_fields = ['order__order_id', 'order__customer_name']
    readonly_fields = ['order', 'status_from', 'status_to', 'changed_at', 'duration_in_previous_status_hours']
    date_hierarchy = 'changed_at'


@admin.register(EcomhubAlertConfig)
class EcomhubAlertConfigAdmin(admin.ModelAdmin):
    list_display = ['status', 'yellow_threshold_hours', 'red_threshold_hours',
                    'critical_threshold_hours', 'updated_at']
    list_filter = ['status']

    fieldsets = (
        ('Status', {
            'fields': ('status',)
        }),
        ('Limites de Alerta (em horas)', {
            'fields': ('yellow_threshold_hours', 'red_threshold_hours', 'critical_threshold_hours'),
            'description': 'Configure os limites de tempo para cada nível de alerta. '
                          'Exemplo: 48h = 2 dias, 168h = 7 dias'
        }),
    )
