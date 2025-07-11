# backend/features/ia/admin.py - VERSÃO ATUALIZADA COM PROJETOS
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import LogEntry, ProjetoIA, VersaoProjeto

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
        'prioridade_badge', 'horas_totais', 'criado_por', 'versao_atual',
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
                'horas_totais', 'horas_desenvolvimento', 'horas_testes',
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

# ===== CONFIGURAÇÕES GERAIS DO ADMIN =====

# Customizar o título do admin
admin.site.site_header = 'Administração - IA & Automação'
admin.site.site_title = 'Admin IA'
admin.site.index_title = 'Painel de Controle - IA & Automação'