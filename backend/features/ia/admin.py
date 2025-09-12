# backend/features/ia/admin.py - VERSÃO ATUALIZADA COM PROJETOS
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    LogEntry, ProjetoIA, VersaoProjeto,
    # WhatsApp Business models
    WhatsAppBusinessAccount, BusinessManager, WhatsAppPhoneNumber, QualityHistory, QualityAlert
)

# ===== ADMIN DE LOGS (EXISTENTE) =====
@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    list_display = [
        'ferramenta', 'nivel', 'mensagem_resumida', 'pais', 
        'timestamp', 'resolvido', 'resolvido_por'
    ]
    list_filter = [
        'ferramenta', 'nivel', 'pais', 'resolvido', 'timestamp'
    ]
    search_fields = [
        'mensagem', 'usuario_conversa', 'id_conversa', 'ip_origem'
    ]
    list_editable = ['resolvido']
    readonly_fields = ['timestamp', 'ip_origem', 'user_agent']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('ferramenta', 'nivel', 'mensagem', 'detalhes')
        }),
        ('Nicochat', {
            'fields': ('pais', 'usuario_conversa', 'id_conversa'),
            'classes': ('collapse',)
        }),
        ('Técnico', {
            'fields': ('ip_origem', 'user_agent', 'timestamp'),
            'classes': ('collapse',)
        }),
        ('Resolução', {
            'fields': ('resolvido', 'resolvido_por', 'data_resolucao')
        })
    )
    
    def mensagem_resumida(self, obj):
        return obj.mensagem[:50] + "..." if len(obj.mensagem) > 50 else obj.mensagem
    mensagem_resumida.short_description = 'Mensagem'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('resolvido_por')

# ===== ADMIN DE PROJETOS DE IA =====

class VersaoProjetoInline(admin.TabularInline):
    model = VersaoProjeto
    extra = 0
    readonly_fields = ['data_lancamento']
    fields = ['versao', 'versao_anterior', 'motivo_mudanca', 'responsavel', 'data_lancamento']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('responsavel')

@admin.register(ProjetoIA)
class ProjetoIAAdmin(admin.ModelAdmin):
    list_display = [
        'nome', 'status', 'tipo_projeto', 'departamento_atendido',
        'prioridade_badge', 'horas_breakdown', 'criado_por', 'versao_atual',
        'criado_em'
    ]
    list_filter = [
        'status', 'tipo_projeto', 'departamento_atendido', 'prioridade',
        'complexidade', 'frequencia_uso', 'ativo', 'criado_em'
    ]
    search_fields = [
        'nome', 'descricao', 'criado_por__first_name', 
        'criado_por__last_name', 'criadores__first_name', 'criadores__last_name'
    ]
    list_editable = ['status']
    
    # CORREÇÃO: Campos readonly fixos para evitar erros
    readonly_fields = [
        'criado_por', 'criado_em', 'atualizado_em'
    ]
    
    filter_horizontal = ['criadores', 'dependencias']
    
    # CORREÇÃO: Fieldsets simplificados
    fieldsets = [
        ('Informações Básicas', {
            'fields': (
                'nome', 'descricao', 'status', 'versao_atual',
                'link_projeto', 'criadores', 'dependencias'
            )
        }),
        ('Classificação', {
            'fields': (
                'tipo_projeto', 'departamento_atendido', 'prioridade', 'complexidade',
                'usuarios_impactados', 'frequencia_uso', 'ferramentas_tecnologias'
            )
        }),
        ('Investimento de Tempo', {
            'fields': (
                'horas_desenvolvimento', 'horas_testes',
                'horas_documentacao', 'horas_deploy', 'valor_hora'
            )
        }),
        ('Custos Recorrentes (Mensais)', {
            'fields': (
                'custo_ferramentas_mensais', 'custo_apis_mensais',
                'custo_infraestrutura_mensais', 'custo_manutencao_mensais'
            ),
            'classes': ('collapse',)
        }),
        ('Custos Únicos', {
            'fields': (
                'custo_treinamentos', 'custo_consultoria', 'custo_setup_inicial'
            ),
            'classes': ('collapse',)
        }),
        ('Economias/Retornos', {
            'fields': (
                'economia_horas_mensais', 'valor_hora_economizada',
                'reducao_erros_mensais', 'economia_outros_mensais'
            ),
            'classes': ('collapse',)
        }),
        ('Documentação', {
            'fields': (
                'documentacao_tecnica', 'licoes_aprendidas',
                'proximos_passos', 'data_revisao'
            ),
            'classes': ('collapse',)
        }),
        ('Controle', {
            'fields': ('ativo', 'criado_por', 'criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        }),
    ]
    
    def save_model(self, request, obj, form, change):
        if not change:  # Novo objeto
            obj.criado_por = request.user
        super().save_model(request, obj, form, change)
    
    def prioridade_badge(self, obj):
        colors = {
            'alta': '#dc3545',
            'media': '#ffc107',
            'baixa': '#007bff'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">{}</span>',
            colors.get(obj.prioridade, '#6c757d'),
            obj.get_prioridade_display()
        )
    prioridade_badge.short_description = 'Prioridade'
    prioridade_badge.admin_order_field = 'prioridade'
    
    def horas_breakdown(self, obj):
        """Exibe o breakdown de horas com total calculado"""
        try:
            total = float(obj.horas_totais)
            return format_html(
                '{:.1f}h total<br/><small>Dev: {:.1f} | Teste: {:.1f} | Doc: {:.1f} | Deploy: {:.1f}</small>',
                total,
                float(obj.horas_desenvolvimento or 0),
                float(obj.horas_testes or 0),
                float(obj.horas_documentacao or 0),
                float(obj.horas_deploy or 0)
            )
        except Exception:
            return "N/A"
    horas_breakdown.short_description = 'Horas (Total/Breakdown)'
    
    # CORREÇÃO: Remover métodos que causam erro
    # Removemos get_roi e get_metricas_financeiras_display por enquanto
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'criado_por'
        ).prefetch_related('criadores', 'dependencias')

@admin.register(VersaoProjeto)
class VersaoProjetoAdmin(admin.ModelAdmin):
    list_display = [
        'get_projeto_nome', 'versao', 'versao_anterior',
        'responsavel', 'data_lancamento'
    ]
    list_filter = ['data_lancamento', 'responsavel']
    search_fields = [
        'projeto__nome', 'versao', 'motivo_mudanca',
        'responsavel__first_name', 'responsavel__last_name'
    ]
    readonly_fields = ['data_lancamento']
    
    fieldsets = (
        ('Informações da Versão', {
            'fields': ('projeto', 'versao', 'versao_anterior')
        }),
        ('Detalhes', {
            'fields': ('motivo_mudanca', 'responsavel', 'data_lancamento')
        })
    )
    
    def get_projeto_nome(self, obj):
        return obj.projeto.nome
    get_projeto_nome.short_description = 'Projeto'
    get_projeto_nome.admin_order_field = 'projeto__nome'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'projeto', 'responsavel'
        )

# ===== ADMIN DE WHATSAPP BUSINESS =====

@admin.register(WhatsAppBusinessAccount)
class WhatsAppBusinessAccountAdmin(admin.ModelAdmin):
    list_display = [
        'nome', 'whatsapp_business_account_id', 'responsavel',
        'ativo', 'total_numeros', 'status_sincronizacao',
        'ultima_sincronizacao'
    ]
    list_filter = ['ativo', 'responsavel', 'ultima_sincronizacao']
    search_fields = ['nome', 'whatsapp_business_account_id', 'responsavel__first_name', 'responsavel__last_name']
    readonly_fields = ['ultima_sincronizacao', 'erro_ultima_sincronizacao', 'criado_em', 'atualizado_em']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'whatsapp_business_account_id', 'responsavel', 'ativo')
        }),
        ('Configuração API', {
            'fields': ('access_token_encrypted', 'webhook_verify_token'),
            'classes': ('collapse',)
        }),
        ('Status de Sincronização', {
            'fields': ('ultima_sincronizacao', 'erro_ultima_sincronizacao'),
            'classes': ('collapse',)
        }),
        ('Auditoria', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        })
    )
    
    def total_numeros(self, obj):
        """Conta total de números desta WABA"""
        count = obj.phone_numbers.count()
        monitorados = obj.phone_numbers.filter(monitoramento_ativo=True).count()
        return f"{count} ({monitorados} monitorados)"
    total_numeros.short_description = 'Números (Monitorados)'
    
    def status_sincronizacao(self, obj):
        """Exibe status visual da sincronização"""
        if not obj.ultima_sincronizacao:
            return format_html('<span style="color: orange;">Nunca sincronizado</span>')
        elif obj.erro_ultima_sincronizacao:
            return format_html('<span style="color: red;">Erro na última sync</span>')
        else:
            from django.utils import timezone
            from datetime import timedelta
            if timezone.now() - obj.ultima_sincronizacao > timedelta(hours=2):
                return format_html('<span style="color: orange;">Desatualizado</span>')
            return format_html('<span style="color: green;">OK</span>')
    status_sincronizacao.short_description = 'Status Sync'


class QualityAlertInline(admin.TabularInline):
    model = QualityAlert
    extra = 0
    readonly_fields = ['criado_em', 'usuario_que_visualizou', 'data_visualizacao']
    fields = ['alert_type', 'priority', 'titulo', 'resolvido', 'usuario_que_resolveu', 'criado_em']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'usuario_que_visualizou', 'usuario_que_resolveu'
        )


@admin.register(WhatsAppPhoneNumber)
class WhatsAppPhoneNumberAdmin(admin.ModelAdmin):
    list_display = [
        'display_phone_number', 'verified_name', 'whatsapp_business_account',
        'quality_badge', 'limit_badge', 'status_badge',
        'monitoramento_ativo', 'alertas_pendentes', 'ultima_verificacao'
    ]
    list_filter = [
        'whatsapp_business_account', 'quality_rating', 'messaging_limit_tier',
        'status', 'monitoramento_ativo', 'ultima_verificacao'
    ]
    search_fields = ['display_phone_number', 'verified_name', 'phone_number_id', 'bm_nome_customizado', 'pais_nome_customizado', 'perfil']
    list_editable = ['monitoramento_ativo']
    readonly_fields = ['phone_number_id', 'criado_em', 'atualizado_em', 'ultima_verificacao']
    
    fieldsets = (
        ('Informações do Número', {
            'fields': ('phone_number_id', 'display_phone_number', 'verified_name', 'whatsapp_business_account')
        }),
        ('Status Atual', {
            'fields': ('quality_rating', 'messaging_limit_tier', 'status')
        }),
        ('Campos Customizados', {
            'fields': ('bm_nome_customizado', 'pais_nome_customizado', 'perfil', 'token_expira_em'),
            'description': 'Campos personalizáveis pelo usuário para melhor identificação'
        }),
        ('Monitoramento', {
            'fields': ('monitoramento_ativo', 'frequencia_verificacao_minutos')
        }),
        ('Dados Técnicos', {
            'fields': ('detalhes_api', 'ultima_verificacao'),
            'classes': ('collapse',)
        }),
        ('Auditoria', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        })
    )
    
    inlines = [QualityAlertInline]
    
    def quality_badge(self, obj):
        """Badge colorido para qualidade"""
        colors = {
            'GREEN': '#28a745',
            'YELLOW': '#ffc107', 
            'RED': '#dc3545',
            'NA': '#6c757d'
        }
        icons = {
            'GREEN': '🟢',
            'YELLOW': '🟡',
            'RED': '🔴',
            'NA': '⚫'
        }
        return format_html(
            '{} <span style="background-color: {}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">{}</span>',
            icons.get(obj.quality_rating, '⚫'),
            colors.get(obj.quality_rating, '#6c757d'),
            obj.get_quality_rating_display()
        )
    quality_badge.short_description = 'Qualidade'
    quality_badge.admin_order_field = 'quality_rating'
    
    def limit_badge(self, obj):
        """Badge para limite de mensagens"""
        return obj.get_messaging_limit_tier_display()
    limit_badge.short_description = 'Limite Msgs'
    limit_badge.admin_order_field = 'messaging_limit_tier'
    
    def status_badge(self, obj):
        """Badge colorido para status"""
        colors = {
            'CONNECTED': '#28a745',
            'DISCONNECTED': '#dc3545',
            'FLAGGED': '#ffc107',
            'RESTRICTED': '#dc3545'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">{}</span>',
            colors.get(obj.status, '#6c757d'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def alertas_pendentes(self, obj):
        """Conta alertas não resolvidos"""
        count = obj.alerts.filter(resolvido=False).count()
        if count > 0:
            return format_html('<span style="color: red; font-weight: bold;">{}</span>', count)
        return '0'
    alertas_pendentes.short_description = 'Alertas'


@admin.register(QualityHistory)
class QualityHistoryAdmin(admin.ModelAdmin):
    list_display = [
        'phone_number_display', 'quality_rating', 'messaging_limit_tier', 
        'status', 'mudancas_icons', 'capturado_em'
    ]
    list_filter = [
        'quality_rating', 'messaging_limit_tier', 'status',
        'houve_mudanca_qualidade', 'houve_mudanca_limite', 'houve_mudanca_status',
        'capturado_em'
    ]
    search_fields = ['phone_number__display_phone_number', 'phone_number__verified_name']
    readonly_fields = ['capturado_em']
    date_hierarchy = 'capturado_em'
    
    fieldsets = (
        ('Número', {
            'fields': ('phone_number',)
        }),
        ('Estado Atual', {
            'fields': ('quality_rating', 'messaging_limit_tier', 'status')
        }),
        ('Estado Anterior', {
            'fields': ('quality_rating_anterior', 'messaging_limit_tier_anterior', 'status_anterior')
        }),
        ('Indicadores de Mudança', {
            'fields': ('houve_mudanca_qualidade', 'houve_mudanca_limite', 'houve_mudanca_status')
        }),
        ('Dados Técnicos', {
            'fields': ('dados_api_completos', 'capturado_em'),
            'classes': ('collapse',)
        })
    )
    
    def phone_number_display(self, obj):
        return obj.phone_number.display_phone_number
    phone_number_display.short_description = 'Número'
    phone_number_display.admin_order_field = 'phone_number__display_phone_number'
    
    def mudancas_icons(self, obj):
        """Ícones para indicar que tipo de mudança houve"""
        icons = []
        if obj.houve_mudanca_qualidade:
            icons.append('📊')
        if obj.houve_mudanca_limite:
            icons.append('📈')
        if obj.houve_mudanca_status:
            icons.append('🔄')
        return ''.join(icons) if icons else '📝'
    mudancas_icons.short_description = 'Mudanças'


@admin.register(QualityAlert)
class QualityAlertAdmin(admin.ModelAdmin):
    list_display = [
        'titulo', 'phone_number_display', 'alert_type', 'priority_badge',
        'visualizado', 'resolvido', 'criado_em'
    ]
    list_filter = [
        'alert_type', 'priority', 'visualizado', 'resolvido',
        'phone_number__whatsapp_business_account', 'criado_em'
    ]
    search_fields = [
        'titulo', 'descricao', 'phone_number__display_phone_number',
        'phone_number__verified_name'
    ]
    list_editable = ['visualizado', 'resolvido']
    readonly_fields = ['criado_em', 'data_visualizacao', 'data_resolucao']
    date_hierarchy = 'criado_em'
    
    fieldsets = (
        ('Informações do Alerta', {
            'fields': ('phone_number', 'quality_history', 'alert_type', 'priority')
        }),
        ('Conteúdo', {
            'fields': ('titulo', 'descricao', 'valor_anterior', 'valor_atual')
        }),
        ('Status', {
            'fields': ('visualizado', 'resolvido', 'notificacao_enviada')
        }),
        ('Ações de Visualização', {
            'fields': ('usuario_que_visualizou', 'data_visualizacao'),
            'classes': ('collapse',)
        }),
        ('Ações de Resolução', {
            'fields': ('usuario_que_resolveu', 'data_resolucao', 'comentario_resolucao'),
            'classes': ('collapse',)
        }),
        ('Auditoria', {
            'fields': ('criado_em',),
            'classes': ('collapse',)
        })
    )
    
    def phone_number_display(self, obj):
        return obj.phone_number.display_phone_number
    phone_number_display.short_description = 'Número'
    phone_number_display.admin_order_field = 'phone_number__display_phone_number'
    
    def priority_badge(self, obj):
        """Badge colorido para prioridade"""
        colors = {
            'low': '#007bff',
            'medium': '#ffc107',
            'high': '#fd7e14',
            'critical': '#dc3545'
        }
        icons = {
            'low': '🟢',
            'medium': '🟡',
            'high': '🟠',
            'critical': '🔴'
        }
        return format_html(
            '{} <span style="background-color: {}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">{}</span>',
            icons.get(obj.priority, '⚫'),
            colors.get(obj.priority, '#6c757d'),
            obj.get_priority_display()
        )
    priority_badge.short_description = 'Prioridade'
    priority_badge.admin_order_field = 'priority'


# ===== CONFIGURAÇÕES GERAIS DO ADMIN =====

# Customizar o título do admin
admin.site.site_header = 'Administração - IA & Automação'
admin.site.site_title = 'Admin IA'
admin.site.index_title = 'Painel de Controle - IA & Automação'