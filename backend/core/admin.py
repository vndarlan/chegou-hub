# core/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User, Group

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