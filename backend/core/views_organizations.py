from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

from .models import Organization, OrganizationMember, OrganizationInvite, UserModulePermission, MODULES
from .serializers import (
    OrganizationSerializer,
    OrganizationMemberSerializer,
    OrganizationInviteSerializer,
    UserModulePermissionSerializer,
    ModuleListSerializer
)


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de organizações

    Endpoints:
    - list: Lista organizações do usuário
    - retrieve: Detalhes de uma organização
    - create: Cria nova organização
    - update/partial_update: Atualiza organização
    - delete: Desativa organização
    - membros: Lista membros da organização
    - convidar_membro: Envia convite para novo membro
    - remover_membro: Remove um membro
    - atualizar_permissoes: Atualiza permissões de um membro
    - modulos_disponiveis: Lista todos os módulos
    """
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Retorna apenas organizações que o usuário é membro"""
        return Organization.objects.filter(
            membros__user=self.request.user,
            membros__ativo=True
        ).distinct()

    def perform_destroy(self, instance):
        """Desativa ao invés de deletar"""
        instance.ativo = False
        instance.save()

    @action(detail=True, methods=['get'])
    def membros(self, request, pk=None):
        """
        Lista todos os membros da organização
        GET /api/organizations/{id}/membros/
        """
        org = self.get_object()
        membros = org.membros.filter(ativo=True).select_related('user', 'convidado_por').order_by('role', 'joined_at')
        serializer = OrganizationMemberSerializer(membros, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def convidar_membro(self, request, pk=None):
        """
        Envia convite para novo membro
        POST /api/organizations/{id}/convidar_membro/
        Body: {
            "email": "email@example.com",
            "role": "member" ou "admin",
            "modulos": ["agenda", "mapa"] (apenas se role=member)
        }
        """
        org = self.get_object()
        member = org.membros.get(user=request.user, ativo=True)

        # Apenas owner e admin podem convidar
        if member.role not in ['owner', 'admin']:
            return Response(
                {'error': 'Apenas Owner e Admin podem convidar membros'},
                status=status.HTTP_403_FORBIDDEN
            )

        email = request.data.get('email', '').strip().lower()
        role = request.data.get('role', 'member')
        modulos = request.data.get('modulos', [])

        # Validar email
        if not email:
            return Response({'error': 'Email é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_email(email)
        except DjangoValidationError:
            return Response({'error': 'Email inválido'}, status=status.HTTP_400_BAD_REQUEST)

        # Validar role
        if role not in ['admin', 'member']:
            return Response({'error': 'Role deve ser "admin" ou "member"'}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar se já é membro
        if org.membros.filter(user__email=email, ativo=True).exists():
            return Response({'error': 'Este usuário já é membro da organização'}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar limite de membros
        if org.limite_atingido:
            return Response(
                {'error': f'Limite de {org.limite_membros} membros atingido. Upgrade de plano necessário.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar se já existe convite pendente
        convite_existente = org.convites.filter(email=email, status='pending').first()
        if convite_existente:
            return Response(
                {'error': 'Já existe um convite pendente para este email'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Criar convite
        convite = OrganizationInvite.objects.create(
            organization=org,
            email=email,
            role=role,
            convidado_por=request.user
        )

        # TODO: Enviar email de convite aqui
        # send_invite_email(convite)

        serializer = OrganizationInviteSerializer(convite)
        return Response({
            'message': 'Convite enviado com sucesso',
            'convite': serializer.data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def remover_membro(self, request, pk=None):
        """
        Remove um membro da organização
        POST /api/organizations/{id}/remover_membro/
        Body: {"membro_id": 123}
        """
        org = self.get_object()
        member = org.membros.get(user=request.user, ativo=True)

        # Apenas owner e admin podem remover
        if member.role not in ['owner', 'admin']:
            return Response(
                {'error': 'Apenas Owner e Admin podem remover membros'},
                status=status.HTTP_403_FORBIDDEN
            )

        membro_id = request.data.get('membro_id')
        if not membro_id:
            return Response({'error': 'membro_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        membro_a_remover = get_object_or_404(OrganizationMember, id=membro_id, organization=org, ativo=True)

        # Não pode remover owner
        if membro_a_remover.role == 'owner':
            return Response(
                {'error': 'Não é possível remover o Owner da organização'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Admin não pode remover outro admin (apenas owner pode)
        if member.role == 'admin' and membro_a_remover.role == 'admin':
            return Response(
                {'error': 'Apenas Owner pode remover outros Admins'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Remover membro (soft delete)
        membro_a_remover.ativo = False
        membro_a_remover.save()

        return Response({'message': 'Membro removido com sucesso'})

    @action(detail=True, methods=['post'])
    def atualizar_role(self, request, pk=None):
        """
        Atualiza a role de um membro
        POST /api/organizations/{id}/atualizar_role/
        Body: {"membro_id": 123, "role": "admin" ou "member"}
        """
        org = self.get_object()
        member = org.membros.get(user=request.user, ativo=True)

        # Apenas owner pode alterar roles
        if member.role != 'owner':
            return Response(
                {'error': 'Apenas Owner pode alterar roles'},
                status=status.HTTP_403_FORBIDDEN
            )

        membro_id = request.data.get('membro_id')
        new_role = request.data.get('role')

        if not membro_id or not new_role:
            return Response({'error': 'membro_id e role são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)

        if new_role not in ['admin', 'member']:
            return Response({'error': 'Role deve ser "admin" ou "member"'}, status=status.HTTP_400_BAD_REQUEST)

        membro = get_object_or_404(OrganizationMember, id=membro_id, organization=org, ativo=True)

        # Não pode alterar role do owner
        if membro.role == 'owner':
            return Response(
                {'error': 'Não é possível alterar a role do Owner'},
                status=status.HTTP_400_BAD_REQUEST
            )

        membro.role = new_role
        membro.save()

        return Response({'message': 'Role atualizada com sucesso'})

    @action(detail=True, methods=['post'])
    def atualizar_permissoes(self, request, pk=None):
        """
        Atualiza permissões de módulos de um membro
        POST /api/organizations/{id}/atualizar_permissoes/
        Body: {"membro_id": 123, "modulos": ["agenda", "mapa", "ia_projetos"]}
        """
        org = self.get_object()
        member = org.membros.get(user=request.user, ativo=True)

        # Apenas owner e admin podem alterar permissões
        if member.role not in ['owner', 'admin']:
            return Response(
                {'error': 'Apenas Owner e Admin podem alterar permissões'},
                status=status.HTTP_403_FORBIDDEN
            )

        membro_id = request.data.get('membro_id')
        modulos = request.data.get('modulos', [])

        if not membro_id:
            return Response({'error': 'membro_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        membro = get_object_or_404(OrganizationMember, id=membro_id, organization=org, ativo=True)

        # Owner e Admin sempre têm acesso a tudo (não precisa configurar permissões)
        if membro.role in ['owner', 'admin']:
            return Response(
                {'message': 'Owner e Admin têm acesso a todos os módulos automaticamente'},
                status=status.HTTP_200_OK
            )

        # Validar módulos
        modulos_validos = [m['key'] for m in MODULES]
        modulos_invalidos = [m for m in modulos if m not in modulos_validos]
        if modulos_invalidos:
            return Response(
                {'error': f'Módulos inválidos: {", ".join(modulos_invalidos)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Desativar todas as permissões atuais
        membro.permissoes_modulos.update(ativo=False)

        # Criar/ativar permissões para os módulos selecionados
        for module_key in modulos:
            UserModulePermission.objects.update_or_create(
                member=membro,
                module_key=module_key,
                defaults={
                    'ativo': True,
                    'concedido_por': request.user
                }
            )

        return Response({
            'message': 'Permissões atualizadas com sucesso',
            'modulos': modulos
        })

    @action(detail=True, methods=['get'])
    def modulos_disponiveis(self, request, pk=None):
        """
        Lista todos os módulos disponíveis agrupados por categoria
        GET /api/organizations/{id}/modulos_disponiveis/
        """
        # Agrupar módulos por categoria
        grupos = {}
        for modulo in MODULES:
            grupo = modulo['group']
            if grupo not in grupos:
                grupos[grupo] = []
            grupos[grupo].append(modulo)

        return Response({
            'modulos': MODULES,
            'grupos': grupos
        })

    @action(detail=True, methods=['get'])
    def meus_modulos(self, request, pk=None):
        """
        Lista módulos que o usuário atual tem acesso
        GET /api/organizations/{id}/meus_modulos/
        """
        org = self.get_object()
        try:
            member = org.membros.get(user=request.user, ativo=True)

            if member.role in ['owner', 'admin']:
                # Owner e Admin têm acesso a tudo
                modulos_acesso = [m['key'] for m in MODULES]
            else:
                # Member tem acesso apenas aos módulos liberados
                modulos_acesso = list(
                    member.permissoes_modulos.filter(ativo=True).values_list('module_key', flat=True)
                )

            return Response({
                'role': member.role,
                'modulos': modulos_acesso
            })
        except OrganizationMember.DoesNotExist:
            return Response(
                {'error': 'Você não é membro desta organização'},
                status=status.HTTP_403_FORBIDDEN
            )


class InviteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para gerenciamento de convites

    Endpoints:
    - list: Lista convites do usuário
    - retrieve: Detalhes de um convite
    - aceitar: Aceita um convite
    - rejeitar: Rejeita um convite
    """
    serializer_class = OrganizationInviteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Retorna convites para o email do usuário"""
        return OrganizationInvite.objects.filter(
            email=self.request.user.email,
            status='pending'
        ).select_related('organization', 'convidado_por')

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def aceitar(self, request, pk=None):
        """
        Aceita um convite
        POST /api/invites/{id}/aceitar/

        IMPORTANTE: Usa transaction.atomic para garantir consistência dos dados
        """
        convite = self.get_object()

        # Verificar se expirou
        if convite.expirado:
            convite.status = 'expired'
            convite.save()
            return Response(
                {'error': 'Este convite expirou'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar se já é membro
        if convite.organization.membros.filter(user=request.user, ativo=True).exists():
            return Response(
                {'error': 'Você já é membro desta organização'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Criar membro
        OrganizationMember.objects.create(
            organization=convite.organization,
            user=request.user,
            role=convite.role,
            convidado_por=convite.convidado_por
        )

        # Atualizar convite
        convite.status = 'accepted'
        convite.aceito_em = timezone.now()
        convite.aceito_por = request.user
        convite.save()

        return Response({
            'message': 'Convite aceito com sucesso',
            'organization': OrganizationSerializer(convite.organization).data
        })

    @action(detail=True, methods=['post'])
    def rejeitar(self, request, pk=None):
        """
        Rejeita um convite
        POST /api/invites/{id}/rejeitar/
        """
        convite = self.get_object()

        if convite.status != 'pending':
            return Response(
                {'error': 'Este convite não está mais pendente'},
                status=status.HTTP_400_BAD_REQUEST
            )

        convite.status = 'cancelled'
        convite.save()

        return Response({'message': 'Convite rejeitado'})
