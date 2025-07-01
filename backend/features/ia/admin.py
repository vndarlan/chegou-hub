from django.contrib import admin
from .models import LogEntry

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