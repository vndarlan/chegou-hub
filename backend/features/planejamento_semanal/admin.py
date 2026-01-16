# backend/features/planejamento_semanal/admin.py
from django.contrib import admin
from .models import SemanaReferencia, PlanejamentoSemanal, ItemPlanejamento, ConfiguracaoApresentacao


class ItemPlanejamentoInline(admin.TabularInline):
    """Inline para itens de planejamento"""
    model = ItemPlanejamento
    extra = 0
    fields = ['issue_key', 'issue_summary', 'issue_status', 'prioridade', 'concluido', 'ordem']
    readonly_fields = ['criado_em', 'atualizado_em']
    ordering = ['ordem', 'issue_key']


class PlanejamentoSemanalInline(admin.TabularInline):
    """Inline para planejamentos em uma semana"""
    model = PlanejamentoSemanal
    extra = 0
    fields = ['usuario', 'jira_display_name', 'jira_account_id']
    readonly_fields = ['criado_em', 'atualizado_em']
    show_change_link = True


@admin.register(SemanaReferencia)
class SemanaReferenciaAdmin(admin.ModelAdmin):
    """Admin para semanas de referencia"""
    list_display = ['id', 'data_inicio', 'data_fim', 'is_current_week', 'total_planejamentos', 'criado_em']
    list_filter = ['data_inicio']
    search_fields = ['data_inicio', 'data_fim']
    ordering = ['-data_inicio']
    readonly_fields = ['criado_em']
    inlines = [PlanejamentoSemanalInline]

    def total_planejamentos(self, obj):
        return obj.planejamentos.count()
    total_planejamentos.short_description = "Total Planejamentos"

    def is_current_week(self, obj):
        return obj.is_current_week
    is_current_week.boolean = True
    is_current_week.short_description = "Semana Atual"


@admin.register(PlanejamentoSemanal)
class PlanejamentoSemanalAdmin(admin.ModelAdmin):
    """Admin para planejamentos semanais"""
    list_display = [
        'id',
        'jira_display_name',
        'usuario',
        'semana',
        'total_itens',
        'itens_concluidos',
        'percentual_conclusao',
        'atualizado_em'
    ]
    list_filter = ['semana', 'usuario', 'jira_display_name']
    search_fields = ['jira_display_name', 'jira_account_id', 'usuario__username']
    ordering = ['-semana__data_inicio', 'jira_display_name']
    readonly_fields = ['criado_em', 'atualizado_em', 'total_itens', 'itens_concluidos', 'percentual_conclusao']
    raw_id_fields = ['usuario', 'semana']
    inlines = [ItemPlanejamentoInline]

    fieldsets = (
        ('Identificacao', {
            'fields': ('usuario', 'semana', 'jira_account_id', 'jira_display_name')
        }),
        ('Metricas', {
            'fields': ('total_itens', 'itens_concluidos', 'percentual_conclusao'),
            'classes': ('collapse',)
        }),
        ('Datas', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        }),
    )

    def total_itens(self, obj):
        return obj.total_itens
    total_itens.short_description = "Total Itens"

    def itens_concluidos(self, obj):
        return obj.itens_concluidos
    itens_concluidos.short_description = "Concluidos"

    def percentual_conclusao(self, obj):
        return f"{obj.percentual_conclusao}%"
    percentual_conclusao.short_description = "% Conclusao"


@admin.register(ItemPlanejamento)
class ItemPlanejamentoAdmin(admin.ModelAdmin):
    """Admin para itens de planejamento"""
    list_display = [
        'id',
        'issue_key',
        'issue_summary_truncated',
        'issue_status',
        'prioridade',
        'concluido',
        'planejamento_info',
        'atualizado_em'
    ]
    list_filter = ['concluido', 'prioridade', 'issue_status', 'planejamento__semana']
    search_fields = ['issue_key', 'issue_summary', 'planejamento__jira_display_name']
    ordering = ['planejamento', 'ordem', 'issue_key']
    readonly_fields = ['criado_em', 'atualizado_em']
    raw_id_fields = ['planejamento']
    list_editable = ['concluido', 'prioridade']

    def issue_summary_truncated(self, obj):
        if len(obj.issue_summary) > 50:
            return f"{obj.issue_summary[:50]}..."
        return obj.issue_summary
    issue_summary_truncated.short_description = "Resumo"

    def planejamento_info(self, obj):
        return f"{obj.planejamento.jira_display_name} - {obj.planejamento.semana}"
    planejamento_info.short_description = "Planejamento"


@admin.register(ConfiguracaoApresentacao)
class ConfiguracaoApresentacaoAdmin(admin.ModelAdmin):
    """Admin para configuracao da apresentacao"""
    list_display = ['id', 'titulo_welcome', 'atualizado_por', 'atualizado_em']
    readonly_fields = ['atualizado_em', 'atualizado_por']

    def has_add_permission(self, request):
        # So permite um registro (singleton)
        return not ConfiguracaoApresentacao.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Nao permite deletar
        return False
