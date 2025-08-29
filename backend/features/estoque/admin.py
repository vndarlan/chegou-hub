# backend/features/estoque/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import ProdutoEstoque, MovimentacaoEstoque, AlertaEstoque


@admin.register(ProdutoEstoque)
class ProdutoEstoqueAdmin(admin.ModelAdmin):
    list_display = [
        'sku', 'nome', 'loja_config', 'estoque_atual', 
        'estoque_minimo', 'status_estoque', 'sync_status', 
        'ultima_sincronizacao', 'ativo'
    ]
    list_filter = [
        'ativo', 'loja_config', 'sync_shopify_enabled', 
        'alerta_estoque_baixo', 'alerta_estoque_zero'
    ]
    search_fields = ['sku', 'nome', 'shopify_product_id']
    readonly_fields = [
        'data_criacao', 'data_atualizacao', 'valor_total_estoque',
        'ultima_sincronizacao', 'shopify_product_id', 'shopify_variant_id'
    ]
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('user', 'loja_config', 'sku', 'nome', 'ativo')
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