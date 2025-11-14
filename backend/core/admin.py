from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html
from .models import Organization, OrganizationMember, OrganizationInvite, UserModulePermission


# ============================================================================
# ORGANIZAÇÕES
# ============================================================================

class OrganizationMemberInline(admin.TabularInline):
    """Inline para membros da organização"""
    model = OrganizationMember
    extra = 0
    fields = ('user', 'role', 'joined_at', 'ativo')
    readonly_fields = ('joined_at',)
    autocomplete_fields = ('user',)


class OrganizationInviteInline(admin.TabularInline):
    """Inline para convites pendentes"""
    model = OrganizationInvite
    extra = 0
    fields = ('email', 'role', 'status', 'expira_em')
    readonly_fields = ('codigo', 'criado_em')

    def get_queryset(self, request):
        # Mostrar apenas convites pendentes
        return super().get_queryset(request).filter(status='pending')


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    """Admin para Organizações (Workspaces)"""
    list_display = ('nome', 'get_status_badge', 'plano', 'get_total_membros', 'limite_membros', 'get_limite_status', 'ativo', 'criado_em')
    list_filter = ('status', 'plano', 'ativo', 'criado_em')
    search_fields = ('nome', 'slug', 'descricao')
    prepopulated_fields = {'slug': ('nome',)}
    readonly_fields = ('criado_em', 'atualizado_em', 'get_total_membros', 'get_limite_atingido')

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'slug', 'descricao', 'status', 'ativo')
        }),
        ('Plano e Limites', {
            'fields': ('plano', 'limite_membros', 'get_total_membros', 'get_limite_atingido')
        }),
        ('Datas', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        }),
    )

    inlines = [OrganizationMemberInline, OrganizationInviteInline]

    def get_status_badge(self, obj):
        """Exibe badge colorido do status de aprovação"""
        colors = {
            'pending': '#f59e0b',    # amber
            'approved': '#10b981',   # green
            'rejected': '#ef4444'    # red
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    get_status_badge.short_description = 'Status de Aprovação'

    def get_total_membros(self, obj):
        return obj.total_membros
    get_total_membros.short_description = 'Total de Membros'

    def get_limite_status(self, obj):
        if obj.limite_atingido:
            return format_html('<span style="color: red;">⚠️ Limite atingido</span>')
        else:
            return format_html('<span style="color: green;">✓ OK</span>')
    get_limite_status.short_description = 'Status Limite'

    def get_limite_atingido(self, obj):
        return obj.limite_atingido
    get_limite_atingido.boolean = True
    get_limite_atingido.short_description = 'Limite Atingido?'


class UserModulePermissionInline(admin.TabularInline):
    """Inline para permissões de módulos"""
    model = UserModulePermission
    extra = 0
    fields = ('module_key', 'ativo')


@admin.register(OrganizationMember)
class OrganizationMemberAdmin(admin.ModelAdmin):
    """Admin para Membros da Organização"""
    list_display = ('user', 'organization', 'role', 'get_role_badge', 'ativo', 'joined_at')
    list_filter = ('role', 'ativo', 'organization')
    search_fields = ('user__email', 'user__name', 'organization__nome')
    autocomplete_fields = ('user', 'organization', 'convidado_por')
    readonly_fields = ('joined_at',)

    fieldsets = (
        ('Informações do Membro', {
            'fields': ('organization', 'user', 'role', 'ativo')
        }),
        ('Convite', {
            'fields': ('convidado_por', 'joined_at'),
            'classes': ('collapse',)
        }),
    )

    inlines = [UserModulePermissionInline]

    def get_role_badge(self, obj):
        colors = {
            'owner': '#dc2626',    # red-600
            'admin': '#9333ea',    # purple-600
            'member': '#2563eb'    # blue-600
        }
        color = colors.get(obj.role, '#6b7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_role_display()
        )
    get_role_badge.short_description = 'Função'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user', 'organization', 'convidado_por')


@admin.register(OrganizationInvite)
class OrganizationInviteAdmin(admin.ModelAdmin):
    """Admin para Convites de Organização"""
    list_display = ('email', 'organization', 'role', 'get_status_badge', 'expira_em', 'criado_em')
    list_filter = ('status', 'role', 'organization', 'criado_em')
    search_fields = ('email', 'organization__nome')
    readonly_fields = ('codigo', 'criado_em', 'aceito_em')
    autocomplete_fields = ('organization', 'aceito_por')

    fieldsets = (
        ('Convite', {
            'fields': ('organization', 'email', 'role', 'codigo')
        }),
        ('Status', {
            'fields': ('status', 'expira_em')
        }),
        ('Histórico', {
            'fields': ('criado_em', 'aceito_por', 'aceito_em'),
            'classes': ('collapse',)
        }),
    )

    def get_status_badge(self, obj):
        colors = {
            'pending': '#f59e0b',    # amber-500
            'accepted': '#10b981',   # green-500
            'cancelled': '#ef4444',  # red-500
            'expired': '#6b7280'     # gray-500
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    get_status_badge.short_description = 'Status'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('organization', 'aceito_por')

    def save_model(self, request, obj, form, change):
        """Preenche convidado_por automaticamente com o usuário logado ao criar convite"""
        if not obj.pk:  # Apenas ao criar (não ao editar)
            obj.convidado_por = request.user
        super().save_model(request, obj, form, change)


@admin.register(UserModulePermission)
class UserModulePermissionAdmin(admin.ModelAdmin):
    """Admin para Permissões de Módulos"""
    list_display = ('member', 'get_user', 'get_organization', 'module_key', 'get_module_name', 'ativo')
    list_filter = ('ativo', 'module_key', 'member__organization')
    search_fields = ('member__user__email', 'member__user__name', 'member__organization__nome')
    autocomplete_fields = ('member',)

    def get_user(self, obj):
        return obj.member.user.email
    get_user.short_description = 'Usuário'
    get_user.admin_order_field = 'member__user__email'

    def get_organization(self, obj):
        return obj.member.organization.nome
    get_organization.short_description = 'Organização'
    get_organization.admin_order_field = 'member__organization__nome'

    def get_module_name(self, obj):
        from .models import MODULES
        for module in MODULES:
            if module['key'] == obj.module_key:
                return module['name']
        return obj.module_key
    get_module_name.short_description = 'Nome do Módulo'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('member__user', 'member__organization')


# ============================================================================
# USUÁRIOS (Atualizado)
# ============================================================================

class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'get_organizations')
    list_filter = ('is_active', 'is_staff', 'is_superuser')
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering = ('username',)

    def get_organizations(self, obj):
        """Mostra organizações ao invés de grupos"""
        orgs = OrganizationMember.objects.filter(user=obj, ativo=True).select_related('organization')
        return ", ".join([f"{m.organization.nome} ({m.get_role_display()})" for m in orgs])
    get_organizations.short_description = 'Organizações (Workspaces)'

admin.site.unregister(User)
admin.site.register(User, UserAdmin)


# ============================================================================
# CUSTOMIZAÇÃO DO SITE ADMIN
# ============================================================================

admin.site.site_header = 'ChegouHub - Administração'
admin.site.site_title = 'ChegouHub Admin'
admin.site.index_title = 'Gerenciamento de Organizações e Usuários'