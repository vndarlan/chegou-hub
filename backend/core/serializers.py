from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Organization, OrganizationMember, OrganizationInvite, UserModulePermission, MODULES


class UserSerializer(serializers.ModelSerializer):
    """Serializer para dados básicos do usuário"""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']
        read_only_fields = ['id', 'username']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer para organização"""
    total_membros = serializers.IntegerField(read_only=True)
    limite_atingido = serializers.BooleanField(read_only=True)

    class Meta:
        model = Organization
        fields = [
            'id', 'nome', 'slug', 'descricao', 'plano', 'limite_membros',
            'total_membros', 'limite_atingido', 'criado_em', 'atualizado_em', 'ativo'
        ]
        read_only_fields = ['id', 'criado_em', 'atualizado_em', 'total_membros', 'limite_atingido']


class OrganizationMemberSerializer(serializers.ModelSerializer):
    """Serializer para membros da organização com permissões"""
    user = UserSerializer(read_only=True)
    organization_name = serializers.CharField(source='organization.nome', read_only=True)
    permissoes = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    convidado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationMember
        fields = [
            'id', 'organization', 'organization_name', 'user', 'role', 'role_display',
            'convidado_por', 'convidado_por_nome', 'joined_at', 'ativo', 'permissoes'
        ]
        read_only_fields = ['id', 'joined_at', 'organization_name', 'role_display', 'permissoes']

    def get_permissoes(self, obj):
        """Retorna lista de módulos que o membro tem permissão de acessar"""
        if obj.role in ['owner', 'admin']:
            # Owner e Admin têm acesso a tudo
            return [m['key'] for m in MODULES]
        else:
            # Member tem acesso apenas aos módulos liberados
            return list(obj.permissoes_modulos.filter(ativo=True).values_list('module_key', flat=True))

    def get_convidado_por_nome(self, obj):
        if obj.convidado_por:
            return obj.convidado_por.get_full_name() or obj.convidado_por.username
        return None


class OrganizationInviteSerializer(serializers.ModelSerializer):
    """Serializer para convites de organização"""
    organization_name = serializers.CharField(source='organization.nome', read_only=True)
    convidado_por_nome = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    expirado = serializers.BooleanField(read_only=True)

    class Meta:
        model = OrganizationInvite
        fields = [
            'id', 'organization', 'organization_name', 'email', 'role', 'role_display',
            'codigo', 'convidado_por', 'convidado_por_nome', 'criado_em', 'expira_em',
            'aceito_em', 'aceito_por', 'status', 'status_display', 'expirado',
            'modulos_permitidos'
        ]
        read_only_fields = [
            'id', 'codigo', 'criado_em', 'expira_em', 'aceito_em', 'aceito_por',
            'organization_name', 'status_display', 'role_display', 'expirado'
        ]

    def get_convidado_por_nome(self, obj):
        if obj.convidado_por:
            return obj.convidado_por.get_full_name() or obj.convidado_por.username
        return None


class UserModulePermissionSerializer(serializers.ModelSerializer):
    """Serializer para permissões de módulo"""
    module_name = serializers.CharField(source='get_module_key_display', read_only=True)
    concedido_por_nome = serializers.SerializerMethodField()
    member_name = serializers.SerializerMethodField()

    class Meta:
        model = UserModulePermission
        fields = [
            'id', 'member', 'member_name', 'module_key', 'module_name',
            'concedido_por', 'concedido_por_nome', 'concedido_em', 'ativo'
        ]
        read_only_fields = ['id', 'concedido_em', 'module_name', 'member_name']

    def get_concedido_por_nome(self, obj):
        if obj.concedido_por:
            return obj.concedido_por.get_full_name() or obj.concedido_por.username
        return None

    def get_member_name(self, obj):
        return obj.member.user.get_full_name() or obj.member.user.username


class ModuleListSerializer(serializers.Serializer):
    """Serializer para listar módulos disponíveis agrupados"""
    key = serializers.CharField()
    name = serializers.CharField()
    group = serializers.CharField()
