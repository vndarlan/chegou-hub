# backend/features/jira/admin.py
from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import JiraConfig


@admin.register(JiraConfig)
class JiraConfigAdmin(ModelAdmin):
    """Admin para configurações Jira"""

    list_display = [
        'id',
        'jira_url',
        'jira_email',
        'jira_project_key',
        'ativo',
        'ultima_sincronizacao',
        'criado_em',
    ]

    list_filter = [
        'ativo',
        'criado_em',
        'atualizado_em',
    ]

    search_fields = [
        'jira_email',
        'jira_project_key',
    ]

    readonly_fields = [
        'criado_em',
        'atualizado_em',
        'ultima_sincronizacao',
    ]

    fieldsets = (
        ('Configuração Jira', {
            'fields': (
                'jira_url',
                'jira_email',
                'jira_project_key',
                'api_token_encrypted',
            ),
            'description': 'Configure a integração com Jira Cloud',
        }),
        ('Status', {
            'fields': (
                'ativo',
                'ultima_sincronizacao',
            ),
        }),
        ('Metadados', {
            'fields': (
                'criado_em',
                'atualizado_em',
            ),
            'classes': ('collapse',),
        }),
    )

    def has_delete_permission(self, request, obj=None):
        """Permitir deletar configurações"""
        return True

    class Meta:
        verbose_name = "Configuração Jira"
        verbose_name_plural = "Configurações Jira"
