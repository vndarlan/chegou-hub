# core/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User, Group

# Importar o novo modelo
from .models import ImageStyle

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

# --- Registrar ImageStyle ---
@admin.register(ImageStyle)
class ImageStyleAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'created_at', 'updated_at')
    list_filter = ('user',) # Filtrar por usuário
    search_fields = ('name', 'instructions', 'user__username', 'user__email') # Buscar no nome, instruções e dados do usuário
    list_per_page = 20
    # Define campos que aparecem no formulário de edição/criação
    fields = ('user', 'name', 'instructions')
    # Se quiser que o usuário seja preenchido automaticamente no admin:
    # def get_form(self, request, obj=None, **kwargs):
    #     form = super().get_form(request, obj, **kwargs)
    #     if not obj: # Apenas na criação
    #         form.base_fields['user'].initial = request.user
    #     return form