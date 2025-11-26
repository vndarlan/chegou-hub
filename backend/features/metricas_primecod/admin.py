from django.contrib import admin
from .models import (
    AnalisePrimeCOD,
    StatusMappingPrimeCOD,
    PrimeCODCatalogProduct,
    PrimeCODCatalogSnapshot
)

@admin.register(AnalisePrimeCOD)
class AnalisePrimeCODAdmin(admin.ModelAdmin):
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
class StatusMappingPrimeCODAdmin(admin.ModelAdmin):
    list_display = ('categoria', 'status_original', 'status_mapeado', 'ativo', 'criado_em')
    list_filter = ('categoria', 'ativo', 'criado_em')
    search_fields = ('status_original', 'status_mapeado')
    list_editable = ('status_mapeado', 'ativo')
    ordering = ('categoria', 'status_original')


@admin.register(PrimeCODCatalogProduct)
class PrimeCODCatalogProductAdmin(admin.ModelAdmin):
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


class PrimeCODCatalogSnapshotInline(admin.TabularInline):
    model = PrimeCODCatalogSnapshot
    extra = 0
    readonly_fields = ('snapshot_date', 'quantity', 'total_units_sold', 'created_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(PrimeCODCatalogSnapshot)
class PrimeCODCatalogSnapshotAdmin(admin.ModelAdmin):
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
