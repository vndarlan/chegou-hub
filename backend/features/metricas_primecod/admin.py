from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import (
    AnalisePrimeCOD,
    StatusMappingPrimeCOD,
    PrimeCODCatalogProduct,
    PrimeCODCatalogSnapshot,
    PrimeCODConfig,
    CatalogSyncLog
)

@admin.register(AnalisePrimeCOD)
class AnalisePrimeCODAdmin(ModelAdmin):
    list_display = ('nome', 'tipo', 'criado_por', 'criado_em', 'atualizado_em')
    list_filter = ('tipo', 'criado_em', 'criado_por')
    search_fields = ('nome', 'descricao')
    readonly_fields = ('criado_em', 'atualizado_em')
    ordering = ('-atualizado_em',)
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'tipo', 'descricao', 'criado_por')
        }),
        ('Dados da Análise', {
            'fields': ('dados_processados', 'dados_leads', 'dados_orders', 'dados_efetividade'),
            'classes': ('collapse',),
            'description': 'dados_processados é usado para compatibilidade frontend'
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        })
    )

@admin.register(StatusMappingPrimeCOD)
class StatusMappingPrimeCODAdmin(ModelAdmin):
    list_display = ('categoria', 'status_original', 'status_mapeado', 'ativo', 'criado_em')
    list_filter = ('categoria', 'ativo', 'criado_em')
    search_fields = ('status_original', 'status_mapeado')
    list_editable = ('status_mapeado', 'ativo')
    ordering = ('categoria', 'status_original')


@admin.register(PrimeCODCatalogProduct)
class PrimeCODCatalogProductAdmin(ModelAdmin):
    list_display = (
        'sku', 'name', 'quantity', 'stock_label',
        'price', 'cost', 'profit_margin_display',
        'total_units_sold', 'is_new', 'updated_at'
    )
    list_filter = ('is_new', 'stock_label', 'created_at', 'updated_at')
    search_fields = ('sku', 'name', 'primecod_id')
    readonly_fields = ('first_seen_at', 'created_at', 'updated_at', 'profit_margin', 'profit_per_unit')
    ordering = ('-updated_at',)

    fieldsets = (
        ('Identificação', {
            'fields': ('primecod_id', 'sku', 'name', 'description')
        }),
        ('Estoque e Vendas', {
            'fields': ('quantity', 'stock_label', 'total_units_sold', 'total_orders')
        }),
        ('Preços e Lucro', {
            'fields': ('price', 'cost', 'profit_margin', 'profit_per_unit')
        }),
        ('Dados Complementares', {
            'fields': ('countries', 'images'),
            'classes': ('collapse',)
        }),
        ('Controles', {
            'fields': ('is_new', 'first_seen_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def profit_margin_display(self, obj):
        """Exibe margem de lucro formatada"""
        return f"{obj.profit_margin:.2f}%"
    profit_margin_display.short_description = "Margem de Lucro"
    profit_margin_display.admin_order_field = 'price'


class PrimeCODCatalogSnapshotInline(TabularInline):
    model = PrimeCODCatalogSnapshot
    extra = 0
    readonly_fields = ('snapshot_date', 'quantity', 'total_units_sold', 'created_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(PrimeCODCatalogSnapshot)
class PrimeCODCatalogSnapshotAdmin(ModelAdmin):
    list_display = (
        'product', 'snapshot_date', 'quantity',
        'total_units_sold', 'quantity_delta', 'units_sold_delta'
    )
    list_filter = ('snapshot_date', 'created_at')
    search_fields = ('product__sku', 'product__name')
    readonly_fields = ('created_at', 'quantity_delta', 'units_sold_delta')
    ordering = ('-snapshot_date',)
    date_hierarchy = 'snapshot_date'

    fieldsets = (
        ('Produto', {
            'fields': ('product',)
        }),
        ('Dados do Snapshot', {
            'fields': ('snapshot_date', 'quantity', 'total_units_sold')
        }),
        ('Variações', {
            'fields': ('quantity_delta', 'units_sold_delta'),
            'description': 'Variações calculadas em relação ao snapshot anterior'
        }),
        ('Metadados', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )


@admin.register(PrimeCODConfig)
class PrimeCODConfigAdmin(ModelAdmin):
    list_display = ('id', 'is_active', 'updated_by', 'updated_at')
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Configuração', {
            'fields': ('api_token', 'is_active')
        }),
        ('Auditoria', {
            'fields': ('updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def has_add_permission(self, request):
        # Singleton - só permite um registro
        return not PrimeCODConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Não permitir deleção do singleton
        return False


@admin.register(CatalogSyncLog)
class CatalogSyncLogAdmin(ModelAdmin):
    list_display = (
        'id', 'started_at', 'status', 'duration_display',
        'products_created', 'products_updated', 'products_error', 'snapshots_created'
    )
    list_filter = ('status', 'started_at')
    search_fields = ('error_message',)
    readonly_fields = ('started_at', 'completed_at', 'duration')
    date_hierarchy = 'started_at'

    fieldsets = (
        ('Execução', {
            'fields': ('started_at', 'completed_at', 'duration', 'status')
        }),
        ('Resultados', {
            'fields': (
                'total_products_api', 'products_created',
                'products_updated', 'products_error', 'snapshots_created'
            )
        }),
        ('Erro', {
            'fields': ('error_type', 'error_message'),
            'classes': ('collapse',)
        }),
    )

    def duration_display(self, obj):
        """Formata duração em formato legível"""
        if obj.duration is None:
            return '-'
        if obj.duration < 60:
            return f"{obj.duration:.1f}s"
        else:
            minutes = int(obj.duration // 60)
            seconds = int(obj.duration % 60)
            return f"{minutes}m {seconds}s"
    duration_display.short_description = "Duração"
    duration_display.admin_order_field = 'duration'

    def has_add_permission(self, request):
        # Logs são criados automaticamente
        return False

    def has_delete_permission(self, request, obj=None):
        # Apenas superuser pode deletar
        return request.user.is_superuser
