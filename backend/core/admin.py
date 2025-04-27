# core/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User, Group
from .models import AIProject # Importe o novo modelo


# Importar o novo modelo
from .models import ManagedCalendar

# --- Configuração User Admin (existente) ---
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'get_groups') # Adiciona is_active e grupos
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'groups') # Permite filtrar por ativo e grupos
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering = ('username',)

    def get_groups(self, obj):
        return ", ".join([g.name for g in obj.groups.all()])
    get_groups.short_description = 'Áreas de Atuação'

admin.site.unregister(User)
admin.site.register(User, UserAdmin)
# admin.site.register(Group) # Geralmente já registrado

@admin.register(ManagedCalendar)
class ManagedCalendarAdmin(admin.ModelAdmin):
    # Opção 1: Mostrar o campo novo e a função de preview
    list_display = ('name', 'get_iframe_preview', 'added_at')

    # Opção 2 (Alternativa): Mostrar o campo iframe_code diretamente (pode ser longo)
    # list_display = ('name', 'iframe_code', 'added_at')

    search_fields = ('name', 'iframe_code') # <<< CORRIGIDO: Buscar no iframe_code
    list_filter = ('added_at',)

    # Função auxiliar para mostrar só o começo no admin (se usar Opção 1 no list_display)
    def get_iframe_preview(self, obj):
        if obj.iframe_code:
             return obj.iframe_code[:100] + '...' if len(obj.iframe_code) > 100 else obj.iframe_code
        return "N/A" # Caso esteja vazio
    get_iframe_preview.short_description = 'Preview do Iframe'

@admin.register(AIProject)
class AIProjectAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'status',
        'creation_date',
        'finalization_date',
        'project_version',
        'creator_names', # Mostrar o campo de nomes
        'creator', # Mostrar quem registrou (usuário logado)
        'added_at',
    )
    list_filter = ('status', 'creation_date', 'creator')
    search_fields = ('name', 'description', 'tools_used', 'creator_names')
    date_hierarchy = 'creation_date'
    readonly_fields = ('added_at',)
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'status', 'project_link')
        }),
        ('Datas', {
            'fields': ('creation_date', 'finalization_date')
        }),
        ('Detalhes Técnicos', {
            'fields': ('tools_used', 'project_version')
        }),
        ('Responsáveis', {
            'fields': ('creator_names', 'creator') # Creator será preenchido via API, aqui é mais para visualização/edição admin
        }),
        ('Datas do Sistema', {
            'fields': ('added_at',),
            'classes': ('collapse',) # Oculta por padrão
        }),
    )

    # Para preencher o criador automaticamente se criado pelo admin
    def save_model(self, request, obj, form, change):
        if not obj.pk: # Apenas na criação
             if not obj.creator: # Se não foi definido manualmente
                 obj.creator = request.user
        super().save_model(request, obj, form, change)