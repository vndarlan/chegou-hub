# backend/features/estoque/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    ProdutoEstoque, MovimentacaoEstoque, AlertaEstoque,
    # Modelos de produtos compartilhados
    Produto, ProdutoSKU, ProdutoLoja,
    MovimentacaoEstoqueCompartilhado, AlertaEstoqueCompartilhado
)


@admin.register(ProdutoEstoque)
class ProdutoEstoqueAdmin(admin.ModelAdmin):
    list_display = [
        'sku', 'nome', 'fornecedor', 'loja_config', 'estoque_atual', 
        'estoque_minimo', 'status_estoque', 'sync_status', 
        'ultima_sincronizacao', 'ativo'
    ]
    list_filter = [
        'ativo', 'loja_config', 'fornecedor', 'sync_shopify_enabled', 
        'alerta_estoque_baixo', 'alerta_estoque_zero'
    ]
    search_fields = ['sku', 'nome', 'shopify_product_id']
    readonly_fields = [
        'data_criacao', 'data_atualizacao', 'valor_total_estoque',
        'ultima_sincronizacao', 'shopify_product_id', 'shopify_variant_id'
    ]
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('user', 'loja_config', 'sku', 'nome', 'fornecedor', 'ativo')
        }),
        ('Shopify', {
            'fields': ('shopify_product_id', 'shopify_variant_id', 'sync_shopify_enabled', 
                      'ultima_sincronizacao', 'erro_sincronizacao'),
            'classes': ('collapse',)
        }),
        ('Controle de Estoque', {
            'fields': ('estoque_inicial', 'estoque_atual', 'estoque_minimo', 
                      'estoque_maximo', 'valor_total_estoque')
        }),
        ('Alertas', {
            'fields': ('alerta_estoque_baixo', 'alerta_estoque_zero')
        }),
        ('Valores', {
            'fields': ('custo_unitario', 'preco_venda')
        }),
        ('Observações', {
            'fields': ('observacoes',),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('data_criacao', 'data_atualizacao'),
            'classes': ('collapse',)
        })
    )
    
    def status_estoque(self, obj):
        """Exibe o status visual do estoque"""
        if obj.estoque_atual == 0:
            color = 'red'
            status = 'ZERADO'
        elif obj.estoque_baixo:
            color = 'orange'
            status = 'BAIXO'
        elif obj.estoque_atual > obj.estoque_minimo * 2:
            color = 'green'
            status = 'OK'
        else:
            color = 'blue'
            status = 'NORMAL'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, status
        )
    status_estoque.short_description = 'Status'
    
    def sync_status(self, obj):
        """Exibe o status da sincronização"""
        if not obj.sync_shopify_enabled:
            return format_html('<span style="color: gray;">DESABILITADO</span>')
        elif obj.erro_sincronizacao:
            return format_html('<span style="color: red;">ERRO</span>')
        elif obj.ultima_sincronizacao:
            return format_html('<span style="color: green;">OK</span>')
        else:
            return format_html('<span style="color: orange;">PENDENTE</span>')
    sync_status.short_description = 'Sync'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'loja_config')
    
    actions = ['ativar_produtos', 'desativar_produtos', 'habilitar_sync', 'desabilitar_sync']
    
    def ativar_produtos(self, request, queryset):
        count = queryset.update(ativo=True)
        self.message_user(request, f'{count} produtos ativados com sucesso.')
    ativar_produtos.short_description = "Ativar produtos selecionados"
    
    def desativar_produtos(self, request, queryset):
        count = queryset.update(ativo=False)
        self.message_user(request, f'{count} produtos desativados com sucesso.')
    desativar_produtos.short_description = "Desativar produtos selecionados"
    
    def habilitar_sync(self, request, queryset):
        count = queryset.update(sync_shopify_enabled=True)
        self.message_user(request, f'Sincronização habilitada para {count} produtos.')
    habilitar_sync.short_description = "Habilitar sincronização Shopify"
    
    def desabilitar_sync(self, request, queryset):
        count = queryset.update(sync_shopify_enabled=False)
        self.message_user(request, f'Sincronização desabilitada para {count} produtos.')
    desabilitar_sync.short_description = "Desabilitar sincronização Shopify"


class MovimentacaoEstoqueInline(admin.TabularInline):
    model = MovimentacaoEstoque
    extra = 0
    readonly_fields = ['data_movimentacao', 'estoque_anterior', 'estoque_posterior', 'valor_total']
    fields = [
        'tipo_movimento', 'quantidade', 'estoque_anterior', 'estoque_posterior',
        'observacoes', 'pedido_shopify_id', 'custo_unitario', 'valor_total', 'data_movimentacao'
    ]
    
    def has_add_permission(self, request, obj=None):
        return False  # Movimentações só via código


@admin.register(MovimentacaoEstoque)
class MovimentacaoEstoqueAdmin(admin.ModelAdmin):
    list_display = [
        'produto', 'tipo_movimento', 'quantidade', 'estoque_anterior',
        'estoque_posterior', 'data_movimentacao', 'usuario', 'pedido_shopify_id'
    ]
    list_filter = [
        'tipo_movimento', 'data_movimentacao', 'produto__loja_config',
        'origem_sync'
    ]
    search_fields = [
        'produto__sku', 'produto__nome', 'observacoes',
        'pedido_shopify_id'
    ]
    readonly_fields = [
        'produto', 'usuario', 'tipo_movimento', 'quantidade',
        'estoque_anterior', 'estoque_posterior', 'data_movimentacao',
        'valor_total'
    ]
    
    fieldsets = (
        ('Movimentação', {
            'fields': ('produto', 'tipo_movimento', 'quantidade', 'usuario')
        }),
        ('Estoque', {
            'fields': ('estoque_anterior', 'estoque_posterior')
        }),
        ('Valores', {
            'fields': ('custo_unitario', 'valor_total')
        }),
        ('Origem', {
            'fields': ('origem_sync', 'pedido_shopify_id', 'ip_origem')
        }),
        ('Detalhes', {
            'fields': ('observacoes', 'dados_sync', 'data_movimentacao'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('produto', 'usuario')
    
    def has_add_permission(self, request):
        return False  # Movimentações só via código
    
    def has_change_permission(self, request, obj=None):
        return False  # Movimentações são imutáveis
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser  # Só superusuário pode deletar


@admin.register(AlertaEstoque)
class AlertaEstoqueAdmin(admin.ModelAdmin):
    list_display = [
        'produto', 'tipo_alerta', 'prioridade', 'status',
        'valor_atual', 'valor_limite', 'contador_ocorrencias',
        'data_criacao', 'usuario_responsavel'
    ]
    list_filter = [
        'tipo_alerta', 'prioridade', 'status', 'data_criacao',
        'produto__loja_config', 'pode_resolver_automaticamente'
    ]
    search_fields = [
        'produto__sku', 'produto__nome', 'titulo', 'descricao'
    ]
    readonly_fields = [
        'produto', 'primeira_ocorrencia', 'ultima_ocorrencia',
        'contador_ocorrencias', 'data_criacao', 'data_leitura', 'data_resolucao'
    ]
    
    fieldsets = (
        ('Alerta', {
            'fields': ('produto', 'tipo_alerta', 'prioridade', 'status')
        }),
        ('Conteúdo', {
            'fields': ('titulo', 'descricao', 'acao_sugerida')
        }),
        ('Valores', {
            'fields': ('valor_atual', 'valor_limite', 'pode_resolver_automaticamente')
        }),
        ('Responsabilidade', {
            'fields': ('usuario_responsavel', 'usuario_resolucao')
        }),
        ('Tracking', {
            'fields': ('primeira_ocorrencia', 'ultima_ocorrencia', 'contador_ocorrencias',
                      'data_criacao', 'data_leitura', 'data_resolucao'),
            'classes': ('collapse',)
        }),
        ('Dados Contexto', {
            'fields': ('dados_contexto',),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'produto', 'usuario_responsavel', 'usuario_resolucao'
        )
    
    actions = ['marcar_como_lido', 'marcar_como_resolvido', 'marcar_como_ignorado']
    
    def marcar_como_lido(self, request, queryset):
        count = 0
        for alerta in queryset.filter(status='ativo'):
            alerta.marcar_como_lido(request.user)
            count += 1
        self.message_user(request, f'{count} alertas marcados como lidos.')
    marcar_como_lido.short_description = "Marcar como lido"
    
    def marcar_como_resolvido(self, request, queryset):
        count = 0
        for alerta in queryset.filter(status__in=['ativo', 'lido']):
            alerta.resolver(request.user, "Resolvido via admin")
            count += 1
        self.message_user(request, f'{count} alertas marcados como resolvidos.')
    marcar_como_resolvido.short_description = "Marcar como resolvido"
    
    def marcar_como_ignorado(self, request, queryset):
        count = queryset.update(status='ignorado')
        self.message_user(request, f'{count} alertas marcados como ignorados.')
    marcar_como_ignorado.short_description = "Marcar como ignorado"


# Adicionar inline de movimentações ao admin de produtos
ProdutoEstoqueAdmin.inlines = [MovimentacaoEstoqueInline]


# ======= ADMIN PARA PRODUTOS COMPARTILHADOS =======

class ProdutoSKUInline(admin.TabularInline):
    model = ProdutoSKU
    extra = 1
    fields = ['sku', 'descricao_variacao', 'ativo']


class ProdutoLojaInline(admin.TabularInline):
    model = ProdutoLoja
    extra = 0
    fields = ['loja', 'shopify_product_id', 'shopify_variant_id', 'preco_venda', 'sync_shopify_enabled', 'ativo']
    readonly_fields = ['shopify_product_id', 'shopify_variant_id', 'ultima_sincronizacao']


class MovimentacaoEstoqueCompartilhadoInline(admin.TabularInline):
    model = MovimentacaoEstoqueCompartilhado
    extra = 0
    readonly_fields = ['data_movimentacao', 'estoque_anterior', 'estoque_posterior', 'valor_total']
    fields = [
        'tipo_movimento', 'quantidade', 'estoque_anterior', 'estoque_posterior',
        'observacoes', 'loja_origem', 'pedido_shopify_id', 'data_movimentacao'
    ]

    def has_add_permission(self, request, obj=None):
        return False  # Movimentações só via código


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = [
        'nome', 'fornecedor', 'estoque_compartilhado', 'estoque_minimo',
        'status_estoque_compartilhado', 'total_skus', 'total_lojas_conectadas',
        'valor_total_estoque', 'ativo'
    ]
    list_filter = [
        'ativo', 'fornecedor', 'alerta_estoque_baixo', 'alerta_estoque_zero'
    ]
    search_fields = ['nome', 'skus__sku', 'descricao']
    readonly_fields = [
        'data_criacao', 'data_atualizacao', 'valor_total_estoque',
        'total_skus', 'total_lojas_conectadas'
    ]
    inlines = [ProdutoSKUInline, ProdutoLojaInline, MovimentacaoEstoqueCompartilhadoInline]

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('user', 'nome', 'descricao', 'fornecedor', 'ativo')
        }),
        ('Controle de Estoque Compartilhado', {
            'fields': ('estoque_compartilhado', 'estoque_minimo', 'estoque_maximo', 'valor_total_estoque')
        }),
        ('Alertas', {
            'fields': ('alerta_estoque_baixo', 'alerta_estoque_zero')
        }),
        ('Valores', {
            'fields': ('custo_unitario',)
        }),
        ('Estatísticas', {
            'fields': ('total_skus', 'total_lojas_conectadas'),
            'classes': ('collapse',)
        }),
        ('Observações', {
            'fields': ('observacoes',),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('data_criacao', 'data_atualizacao'),
            'classes': ('collapse',)
        })
    )

    def status_estoque_compartilhado(self, obj):
        """Exibe o status visual do estoque compartilhado"""
        if obj.estoque_compartilhado < 0:
            color = 'purple'
            status = f'NEGATIVO ({obj.pedidos_pendentes} pendentes)'
        elif obj.estoque_compartilhado == 0:
            color = 'red'
            status = 'ZERADO'
        elif obj.estoque_baixo:
            color = 'orange'
            status = 'BAIXO'
        elif obj.estoque_compartilhado > obj.estoque_minimo * 2:
            color = 'green'
            status = 'OK'
        else:
            color = 'blue'
            status = 'NORMAL'

        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, status
        )
    status_estoque_compartilhado.short_description = 'Status Estoque'

    def total_skus(self, obj):
        """Número total de SKUs do produto"""
        return obj.skus.filter(ativo=True).count()
    total_skus.short_description = 'SKUs Ativos'

    def total_lojas_conectadas(self, obj):
        """Número total de lojas conectadas"""
        return obj.produtoloja_set.filter(ativo=True).count()
    total_lojas_conectadas.short_description = 'Lojas Conectadas'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user').prefetch_related(
            'skus', 'produtoloja_set__loja'
        )

    actions = ['ativar_produtos', 'desativar_produtos']

    def ativar_produtos(self, request, queryset):
        count = queryset.update(ativo=True)
        self.message_user(request, f'{count} produtos compartilhados ativados com sucesso.')
    ativar_produtos.short_description = "Ativar produtos selecionados"

    def desativar_produtos(self, request, queryset):
        count = queryset.update(ativo=False)
        self.message_user(request, f'{count} produtos compartilhados desativados com sucesso.')
    desativar_produtos.short_description = "Desativar produtos selecionados"


@admin.register(ProdutoSKU)
class ProdutoSKUAdmin(admin.ModelAdmin):
    list_display = ['sku', 'produto', 'descricao_variacao', 'ativo', 'data_criacao']
    list_filter = ['ativo', 'produto__fornecedor', 'data_criacao']
    search_fields = ['sku', 'produto__nome', 'descricao_variacao']
    readonly_fields = ['data_criacao', 'data_atualizacao']

    fieldsets = (
        ('SKU', {
            'fields': ('produto', 'sku', 'descricao_variacao', 'ativo')
        }),
        ('Metadados', {
            'fields': ('data_criacao', 'data_atualizacao'),
            'classes': ('collapse',)
        })
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('produto')


@admin.register(ProdutoLoja)
class ProdutoLojaAdmin(admin.ModelAdmin):
    list_display = [
        'produto', 'loja', 'shopify_product_id', 'shopify_variant_id',
        'preco_venda', 'sync_status_compartilhado', 'ativo'
    ]
    list_filter = [
        'ativo', 'sync_shopify_enabled', 'loja', 'produto__fornecedor'
    ]
    search_fields = [
        'produto__nome', 'loja__nome_loja', 'shopify_product_id',
        'produto__skus__sku'
    ]
    readonly_fields = [
        'shopify_product_id', 'shopify_variant_id', 'ultima_sincronizacao',
        'data_criacao', 'data_atualizacao'
    ]

    fieldsets = (
        ('Associação', {
            'fields': ('produto', 'loja', 'ativo')
        }),
        ('Shopify', {
            'fields': ('shopify_product_id', 'shopify_variant_id', 'sync_shopify_enabled',
                      'ultima_sincronizacao', 'erro_sincronizacao'),
            'classes': ('collapse',)
        }),
        ('Pricing', {
            'fields': ('preco_venda',)
        }),
        ('Metadados', {
            'fields': ('data_criacao', 'data_atualizacao'),
            'classes': ('collapse',)
        })
    )

    def sync_status_compartilhado(self, obj):
        """Exibe o status da sincronização para produto compartilhado"""
        if not obj.sync_shopify_enabled:
            return format_html('<span style="color: gray;">DESABILITADO</span>')
        elif obj.erro_sincronizacao:
            return format_html('<span style="color: red;">ERRO</span>')
        elif obj.ultima_sincronizacao:
            return format_html('<span style="color: green;">OK</span>')
        else:
            return format_html('<span style="color: orange;">PENDENTE</span>')
    sync_status_compartilhado.short_description = 'Sync Status'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('produto', 'loja')


@admin.register(MovimentacaoEstoqueCompartilhado)
class MovimentacaoEstoqueCompartilhadoAdmin(admin.ModelAdmin):
    list_display = [
        'produto', 'tipo_movimento', 'quantidade', 'estoque_anterior',
        'estoque_posterior', 'loja_origem', 'data_movimentacao', 'usuario'
    ]
    list_filter = [
        'tipo_movimento', 'data_movimentacao', 'loja_origem',
        'origem_sync', 'produto__fornecedor'
    ]
    search_fields = [
        'produto__nome', 'produto__skus__sku', 'observacoes',
        'pedido_shopify_id', 'loja_origem__nome_loja'
    ]
    readonly_fields = [
        'produto', 'usuario', 'tipo_movimento', 'quantidade',
        'estoque_anterior', 'estoque_posterior', 'data_movimentacao',
        'valor_total'
    ]

    fieldsets = (
        ('Movimentação', {
            'fields': ('produto', 'tipo_movimento', 'quantidade', 'usuario', 'loja_origem')
        }),
        ('Estoque', {
            'fields': ('estoque_anterior', 'estoque_posterior')
        }),
        ('Valores', {
            'fields': ('custo_unitario', 'valor_total')
        }),
        ('Origem', {
            'fields': ('origem_sync', 'pedido_shopify_id', 'ip_origem')
        }),
        ('Detalhes', {
            'fields': ('observacoes', 'dados_sync', 'data_movimentacao'),
            'classes': ('collapse',)
        })
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'produto', 'usuario', 'loja_origem'
        )

    def has_add_permission(self, request):
        return False  # Movimentações só via código

    def has_change_permission(self, request, obj=None):
        return False  # Movimentações são imutáveis

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser  # Só superusuário pode deletar


@admin.register(AlertaEstoqueCompartilhado)
class AlertaEstoqueCompartilhadoAdmin(admin.ModelAdmin):
    list_display = [
        'produto', 'tipo_alerta', 'prioridade', 'status',
        'valor_atual', 'valor_limite', 'contador_ocorrencias',
        'data_criacao', 'usuario_responsavel'
    ]
    list_filter = [
        'tipo_alerta', 'prioridade', 'status', 'data_criacao',
        'produto__fornecedor', 'pode_resolver_automaticamente'
    ]
    search_fields = [
        'produto__nome', 'produto__skus__sku', 'titulo', 'descricao'
    ]
    readonly_fields = [
        'produto', 'primeira_ocorrencia', 'ultima_ocorrencia',
        'contador_ocorrencias', 'data_criacao', 'data_leitura', 'data_resolucao'
    ]

    fieldsets = (
        ('Alerta', {
            'fields': ('produto', 'tipo_alerta', 'prioridade', 'status')
        }),
        ('Conteúdo', {
            'fields': ('titulo', 'descricao', 'acao_sugerida')
        }),
        ('Valores', {
            'fields': ('valor_atual', 'valor_limite', 'pode_resolver_automaticamente')
        }),
        ('Responsabilidade', {
            'fields': ('usuario_responsavel', 'usuario_resolucao')
        }),
        ('Tracking', {
            'fields': ('primeira_ocorrencia', 'ultima_ocorrencia', 'contador_ocorrencias',
                      'data_criacao', 'data_leitura', 'data_resolucao'),
            'classes': ('collapse',)
        }),
        ('Dados Contexto', {
            'fields': ('dados_contexto',),
            'classes': ('collapse',)
        })
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'produto', 'usuario_responsavel', 'usuario_resolucao'
        )

    actions = ['marcar_como_lido', 'marcar_como_resolvido', 'marcar_como_ignorado']

    def marcar_como_lido(self, request, queryset):
        count = 0
        for alerta in queryset.filter(status='ativo'):
            alerta.marcar_como_lido(request.user)
            count += 1
        self.message_user(request, f'{count} alertas de produtos compartilhados marcados como lidos.')
    marcar_como_lido.short_description = "Marcar como lido"

    def marcar_como_resolvido(self, request, queryset):
        count = 0
        for alerta in queryset.filter(status__in=['ativo', 'lido']):
            alerta.resolver(request.user, "Resolvido via admin")
            count += 1
        self.message_user(request, f'{count} alertas de produtos compartilhados marcados como resolvidos.')
    marcar_como_resolvido.short_description = "Marcar como resolvido"

    def marcar_como_ignorado(self, request, queryset):
        count = queryset.update(status='ignorado')
        self.message_user(request, f'{count} alertas de produtos compartilhados marcados como ignorados.')
    marcar_como_ignorado.short_description = "Marcar como ignorado"