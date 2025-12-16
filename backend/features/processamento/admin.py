# backend/features/processamento/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import (
    ShopifyConfig, ProcessamentoLog,
    IPDetectionStatistics, IPDetectionDebugLog, IPDetectionAlert,
    ResolvedIP, ObservedIP
)

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

# ===== ADMIN DOS NOVOS MODELOS DE LOGGING ESTRUTURADO =====

@admin.register(IPDetectionStatistics)
class IPDetectionStatisticsAdmin(admin.ModelAdmin):
    list_display = [
        'config', 'data_referencia', 'total_pedidos_processados',
        'pedidos_com_ip_detectado', 'taxa_sucesso_geral', 'tempo_medio_deteccao_ms',
        'metodo_mais_eficaz', 'criado_em'
    ]
    list_filter = [
        'data_referencia', 'config__nome_loja', 'versao_detector',
        'taxa_sucesso_geral', 'criado_em'
    ]
    search_fields = ['config__nome_loja', 'config__shop_url']
    readonly_fields = [
        'criado_em', 'atualizado_em', 'taxa_deteccao_percentual', 'metodo_mais_eficaz'
    ]
    date_hierarchy = 'data_referencia'
    ordering = ['-data_referencia', '-criado_em']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('config', 'data_referencia', 'versao_detector')
        }),
        ('Volumes de Processamento', {
            'fields': (
                'total_pedidos_processados', 'pedidos_com_ip_detectado',
                'pedidos_sem_ip', 'pedidos_ip_rejeitado'
            )
        }),
        ('Métodos de Detecção', {
            'fields': (
                'ips_via_client_details', 'ips_via_customer_address',
                'ips_via_shipping_address', 'ips_via_billing_address',
                'ips_via_metodos_alternativos'
            )
        }),
        ('Qualidade dos IPs', {
            'fields': (
                'ips_alta_confianca', 'ips_media_confianca',
                'ips_baixa_confianca', 'ips_suspeitos_detectados'
            )
        }),
        ('Performance', {
            'fields': (
                'tempo_medio_deteccao_ms', 'tempo_max_deteccao_ms',
                'api_calls_externas'
            )
        }),
        ('Taxas de Sucesso', {
            'fields': (
                'taxa_sucesso_hierarquia', 'taxa_sucesso_alternativo',
                'taxa_sucesso_geral'
            )
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em', 'dados_extras'),
            'classes': ['collapse']
        })
    )
    
    def has_add_permission(self, request):
        # Estatísticas são criadas automaticamente
        return False

@admin.register(IPDetectionDebugLog)
class IPDetectionDebugLogAdmin(admin.ModelAdmin):
    list_display = [
        'timestamp', 'config', 'nivel', 'categoria', 'titulo',
        'order_id', 'ip_detectado', 'metodo_deteccao', 
        'score_confianca', 'tempo_processamento_ms'
    ]
    list_filter = [
        'nivel', 'categoria', 'timestamp', 'config__nome_loja',
        'metodo_deteccao', 'versao_sistema'
    ]
    search_fields = [
        'config__nome_loja', 'order_id', 'session_id', 'titulo',
        'ip_detectado', 'metodo_deteccao'
    ]
    readonly_fields = ['timestamp', 'versao_sistema']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Identificação', {
            'fields': ('config', 'user', 'session_id', 'order_id', 'timestamp')
        }),
        ('Classificação', {
            'fields': ('nivel', 'categoria', 'subcategoria', 'titulo')
        }),
        ('Resultados da Detecção', {
            'fields': (
                'ip_detectado', 'metodo_deteccao', 'score_confianca',
                'tempo_processamento_ms'
            )
        }),
        ('Contexto', {
            'fields': ('user_agent', 'ip_requisicao'),
            'classes': ['collapse']
        }),
        ('Dados Estruturados', {
            'fields': ('detalhes_json',),
            'classes': ['collapse']
        }),
        ('Metadados', {
            'fields': ('versao_sistema',),
            'classes': ['collapse']
        })
    )
    
    def has_add_permission(self, request):
        # Logs são criados automaticamente
        return False
    
    def has_change_permission(self, request, obj=None):
        # Logs são read-only
        return False

@admin.register(IPDetectionAlert)
class IPDetectionAlertAdmin(admin.ModelAdmin):
    list_display = [
        'config', 'tipo_alerta', 'severidade', 'status', 'titulo',
        'valor_detectado', 'threshold_configurado', 'primeira_ocorrencia',
        'contagem_ocorrencias', 'reconhecido_por'
    ]
    list_filter = [
        'tipo_alerta', 'severidade', 'status', 'config__nome_loja',
        'primeira_ocorrencia', 'pode_resolver_automaticamente'
    ]
    search_fields = [
        'config__nome_loja', 'titulo', 'descricao',
        'reconhecido_por__username'
    ]
    readonly_fields = [
        'primeira_ocorrencia', 'ultima_ocorrencia', 'contagem_ocorrencias',
        'criado_em', 'atualizado_em'
    ]
    date_hierarchy = 'primeira_ocorrencia'
    ordering = ['-severidade', '-primeira_ocorrencia']
    
    fieldsets = (
        ('Identificação', {
            'fields': ('config', 'tipo_alerta', 'severidade', 'status')
        }),
        ('Conteúdo', {
            'fields': ('titulo', 'descricao', 'sugestao_acao')
        }),
        ('Thresholds e Métricas', {
            'fields': (
                'valor_detectado', 'threshold_configurado', 'periodo_referencia'
            )
        }),
        ('Tracking de Ocorrências', {
            'fields': (
                'primeira_ocorrencia', 'ultima_ocorrencia', 'contagem_ocorrencias'
            )
        }),
        ('Gestão', {
            'fields': (
                'reconhecido_por', 'reconhecido_em', 'resolvido_em',
                'pode_resolver_automaticamente'
            )
        }),
        ('Dados de Contexto', {
            'fields': ('dados_contexto',),
            'classes': ['collapse']
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ['collapse']
        })
    )
    
    actions = ['marcar_como_reconhecido', 'marcar_como_resolvido']
    
    def marcar_como_reconhecido(self, request, queryset):
        count = 0
        for alert in queryset.filter(status='active'):
            alert.acknowledge(request.user)
            count += 1
        self.message_user(
            request, 
            f'{count} alerta(s) marcado(s) como reconhecido(s).'
        )
    marcar_como_reconhecido.short_description = 'Marcar alertas selecionados como reconhecidos'
    
    def marcar_como_resolvido(self, request, queryset):
        count = 0
        for alert in queryset.exclude(status='resolved'):
            alert.resolve()
            count += 1
        self.message_user(
            request, 
            f'{count} alerta(s) marcado(s) como resolvido(s).'
        )
    marcar_como_resolvido.short_description = 'Marcar alertas selecionados como resolvidos'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'config', 'reconhecido_por'
        )


# ===== ADMIN DOS MODELOS DE IPs RESOLVIDOS E EM OBSERVAÇÃO =====

@admin.register(ResolvedIP)
class ResolvedIPAdmin(admin.ModelAdmin):
    list_display = [
        'ip_address', 'config', 'resolved_by', 'resolved_at',
        'total_orders_at_resolution', 'unique_customers_at_resolution'
    ]
    list_filter = ['resolved_at', 'config__nome_loja', 'resolved_by']
    search_fields = ['ip_address', 'config__nome_loja', 'resolved_by__username', 'notes']
    readonly_fields = ['resolved_at']
    date_hierarchy = 'resolved_at'
    ordering = ['-resolved_at']

    fieldsets = (
        ('Informações do IP', {
            'fields': ('config', 'ip_address')
        }),
        ('Resolução', {
            'fields': ('resolved_by', 'resolved_at', 'notes')
        }),
        ('Estatísticas no Momento da Resolução', {
            'fields': (
                'total_orders_at_resolution',
                'unique_customers_at_resolution'
            )
        }),
        ('Dados dos Clientes', {
            'fields': ('client_data',),
            'classes': ['collapse'],
            'description': 'Dados completos dos clientes e pedidos salvos no momento da resolução'
        })
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('config', 'resolved_by')


@admin.register(ObservedIP)
class ObservedIPAdmin(admin.ModelAdmin):
    list_display = [
        'ip_address', 'config', 'observed_by', 'observed_at',
        'total_orders_at_observation', 'unique_customers_at_observation'
    ]
    list_filter = ['observed_at', 'config__nome_loja', 'observed_by']
    search_fields = ['ip_address', 'config__nome_loja', 'observed_by__username', 'notes']
    readonly_fields = ['observed_at']
    date_hierarchy = 'observed_at'
    ordering = ['-observed_at']

    fieldsets = (
        ('Informações do IP', {
            'fields': ('config', 'ip_address')
        }),
        ('Observação', {
            'fields': ('observed_by', 'observed_at', 'notes')
        }),
        ('Estatísticas no Momento da Observação', {
            'fields': (
                'total_orders_at_observation',
                'unique_customers_at_observation'
            )
        }),
        ('Dados dos Clientes', {
            'fields': ('client_data',),
            'classes': ['collapse'],
            'description': 'Dados completos dos clientes e pedidos salvos no momento da observação'
        })
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('config', 'observed_by')