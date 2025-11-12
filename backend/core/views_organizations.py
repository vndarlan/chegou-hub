from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import SessionAuthentication
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.conf import settings
import logging

from .models import Organization, OrganizationMember, OrganizationInvite, UserModulePermission, MODULES
from .serializers import (
    OrganizationSerializer,
    OrganizationMemberSerializer,
    OrganizationInviteSerializer,
    UserModulePermissionSerializer,
    ModuleListSerializer
)
from .emails import send_invite_email

logger = logging.getLogger(__name__)


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication sem validação CSRF
    Usada especificamente para endpoints que têm problemas de CSRF
    """
    def enforce_csrf(self, request):
        return  # Não validar CSRF


@api_view(['GET'])
@permission_classes([AllowAny])
def debug_csrf_view(request):
    """
    Endpoint de debug para diagnosticar problemas de CSRF
    GET /api/debug-csrf/
    """
    # Pegar informações do usuário
    user_info = {
        'is_authenticated': request.user.is_authenticated,
        'email': request.user.email if request.user.is_authenticated else None,
        'id': request.user.id if request.user.is_authenticated else None,
    }

    # Pegar informações de CSRF
    csrf_info = {
        'csrf_token_header': request.META.get('HTTP_X_CSRFTOKEN', 'NÃO ENVIADO'),
        'csrf_cookie': request.COOKIES.get('csrftoken', 'NÃO ENCONTRADO'),
        'csrf_trusted_origins': settings.CSRF_TRUSTED_ORIGINS,
        'csrf_cookie_secure': settings.CSRF_COOKIE_SECURE,
        'csrf_cookie_samesite': settings.CSRF_COOKIE_SAMESITE,
        'csrf_cookie_httponly': settings.CSRF_COOKIE_HTTPONLY,
    }

    # Pegar informações de CORS
    cors_info = {
        'cors_allowed_origins': settings.CORS_ALLOWED_ORIGINS,
        'cors_allow_credentials': settings.CORS_ALLOW_CREDENTIALS,
    }

    # Pegar informações da requisição
    request_info = {
        'method': request.method,
        'path': request.path,
        'origin': request.META.get('HTTP_ORIGIN', 'NÃO ENVIADO'),
        'referer': request.META.get('HTTP_REFERER', 'NÃO ENVIADO'),
        'user_agent': request.META.get('HTTP_USER_AGENT', 'NÃO ENVIADO'),
    }

    # Verificar organizações do usuário
    organizations_info = []
    if request.user.is_authenticated:
        orgs = Organization.objects.filter(
            membros__user=request.user,
            membros__ativo=True
        ).distinct()
        for org in orgs:
            member = OrganizationMember.objects.get(organization=org, user=request.user, ativo=True)
            organizations_info.append({
                'id': org.id,
                'nome': org.nome,
                'role': member.role,
                'can_invite': member.role in ['owner', 'admin']
            })

    return Response({
        'status': 'debug_info',
        'user': user_info,
        'csrf': csrf_info,
        'cors': cors_info,
        'request': request_info,
        'organizations': organizations_info,
    })


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

    def perform_create(self, serializer):
        """
        Ao criar organização, automaticamente adiciona o usuário como owner
        """
        organization = serializer.save()

        # Criar membership como owner
        OrganizationMember.objects.create(
            organization=organization,
            user=self.request.user,
            role='owner',
            convidado_por=self.request.user,  # Criador é o próprio usuário
            ativo=True
        )

        # Definir como organização ativa na sessão
        self.request.session['active_organization_id'] = organization.id

        logger.info(f"✅ Organização '{organization.nome}' criada por {self.request.user.email} como owner")

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

        NOTA: Usa CsrfExemptSessionAuthentication para evitar problemas de validação CSRF
        """
        # DEBUG: Logs detalhados para investigar erro 403
        logger.info(f"====== CONVIDAR MEMBRO - INÍCIO ======")
        logger.info(f"Usuário: {request.user.email} (ID: {request.user.id})")
        logger.info(f"Organização ID: {pk}")
        logger.info(f"CSRF Token: {request.META.get('HTTP_X_CSRFTOKEN', 'NÃO ENVIADO')}")
        logger.info(f"Is Authenticated: {request.user.is_authenticated}")

        org = self.get_object()
        logger.info(f"Organização encontrada: {org.nome} (ID: {org.id})")

        # Verificar se o usuário é membro
        try:
            member = org.membros.get(user=request.user, ativo=True)
            logger.info(f"✅ Usuário é membro! Role: {member.role}")
        except OrganizationMember.DoesNotExist:
            logger.warning(f"Usuário {request.user.email} tentou convidar membro mas não pertence à organização {org.id}")
            return Response(
                {'error': 'Você não é membro desta organização'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Apenas owner e admin podem convidar
        if member.role not in ['owner', 'admin']:
            logger.warning(f"Usuário {request.user.email} (role: {member.role}) tentou convidar membro sem permissão")
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

        # Validar módulos apenas se role='member'
        if role == 'member' and modulos:
            modulos_validos = {m['key'] for m in MODULES}  # Usar set para melhor performance
            modulos_invalidos = [m for m in modulos if m not in modulos_validos]
            if modulos_invalidos:
                return Response(
                    {'error': f'Módulos inválidos: {", ".join(modulos_invalidos)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif role in ['admin', 'owner']:
            # Admin/Owner não precisa de módulos (acesso total)
            modulos = []

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
        logger.info(f"Criando convite para {email} como {role} com módulos: {modulos}...")
        convite = OrganizationInvite.objects.create(
            organization=org,
            email=email,
            role=role,
            convidado_por=request.user,
            modulos_permitidos=modulos
        )
        logger.info(f"✅ Convite criado! ID: {convite.id}, Código: {convite.codigo}, Módulos: {modulos}")

        # Enviar email de convite
        email_enviado = send_invite_email(convite)
        if not email_enviado:
            logger.warning(f"Falha ao enviar email de convite para {convite.email}")
        else:
            logger.info(f"✅ Email enviado para {convite.email}")

        logger.info(f"====== CONVIDAR MEMBRO - SUCESSO ======")

        serializer = OrganizationInviteSerializer(convite)
        return Response({
            'message': 'Convite enviado com sucesso' if email_enviado else 'Convite criado, mas houve erro ao enviar email',
            'convite': serializer.data,
            'email_enviado': email_enviado
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

        NOTA: Não valida se usuário é membro da organização.
        Apenas verifica se a organização existe.
        """
        # Verificar se a organização existe (sem validar membership)
        try:
            Organization.objects.get(pk=pk, ativo=True)
        except Organization.DoesNotExist:
            return Response(
                {'error': 'Organização não encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

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

    @action(detail=True, methods=['get'])
    def convites_pendentes(self, request, pk=None):
        """
        Lista todos os convites pendentes da organização
        GET /api/organizations/{id}/convites_pendentes/
        """
        org = self.get_object()

        # Verificar se o usuário é membro
        try:
            member = org.membros.get(user=request.user, ativo=True)
        except OrganizationMember.DoesNotExist:
            return Response(
                {'error': 'Você não é membro desta organização'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Apenas owner e admin podem ver convites
        if member.role not in ['owner', 'admin']:
            return Response(
                {'error': 'Apenas Owner e Admin podem visualizar convites'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Listar convites pendentes
        convites = org.convites.filter(status='pending').select_related('convidado_por').order_by('-criado_em')
        serializer = OrganizationInviteSerializer(convites, many=True)

        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reenviar_convite(self, request, pk=None):
        """
        Reenvia email de um convite pendente
        POST /api/organizations/{id}/reenviar_convite/
        Body: {"convite_id": 123}
        """
        org = self.get_object()

        # Verificar se o usuário é membro
        try:
            member = org.membros.get(user=request.user, ativo=True)
        except OrganizationMember.DoesNotExist:
            return Response(
                {'error': 'Você não é membro desta organização'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Apenas owner e admin podem reenviar
        if member.role not in ['owner', 'admin']:
            return Response(
                {'error': 'Apenas Owner e Admin podem reenviar convites'},
                status=status.HTTP_403_FORBIDDEN
            )

        convite_id = request.data.get('convite_id')
        if not convite_id:
            return Response({'error': 'convite_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar convite
        try:
            convite = org.convites.get(id=convite_id, status='pending')
        except OrganizationInvite.DoesNotExist:
            return Response(
                {'error': 'Convite não encontrado ou não está mais pendente'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar se expirou
        if convite.expirado:
            convite.status = 'expired'
            convite.save()
            return Response(
                {'error': 'Este convite expirou'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Reenviar email
        email_enviado = send_invite_email(convite)

        if email_enviado:
            logger.info(f"✅ Convite reenviado com sucesso para {convite.email} por {request.user.email}")
            return Response({
                'message': 'Email de convite reenviado com sucesso',
                'email_enviado': True
            })
        else:
            logger.error(f"❌ Falha ao reenviar convite para {convite.email}")
            return Response(
                {'error': 'Falha ao enviar email. Tente novamente.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def cancelar_convite(self, request, pk=None):
        """
        Cancela um convite pendente
        POST /api/organizations/{id}/cancelar_convite/
        Body: {"convite_id": 123}
        """
        org = self.get_object()

        # Verificar se o usuário é membro
        try:
            member = org.membros.get(user=request.user, ativo=True)
        except OrganizationMember.DoesNotExist:
            return Response(
                {'error': 'Você não é membro desta organização'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Apenas owner e admin podem cancelar
        if member.role not in ['owner', 'admin']:
            return Response(
                {'error': 'Apenas Owner e Admin podem cancelar convites'},
                status=status.HTTP_403_FORBIDDEN
            )

        convite_id = request.data.get('convite_id')
        if not convite_id:
            return Response({'error': 'convite_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar convite
        try:
            convite = org.convites.get(id=convite_id, status='pending')
        except OrganizationInvite.DoesNotExist:
            return Response(
                {'error': 'Convite não encontrado ou não está mais pendente'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Cancelar convite
        convite.status = 'cancelled'
        convite.save()

        logger.info(f"✅ Convite para {convite.email} cancelado por {request.user.email}")
        return Response({'message': 'Convite cancelado com sucesso'})


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
        membro = OrganizationMember.objects.create(
            organization=convite.organization,
            user=request.user,
            role=convite.role,
            convidado_por=convite.convidado_por
        )

        # Criar permissões se role='member' e tem módulos
        if convite.role == 'member' and convite.modulos_permitidos:
            modulos_validos = {m['key'] for m in MODULES}  # Filtrar módulos válidos
            modulos_criados = []

            for module_key in convite.modulos_permitidos:
                if module_key in modulos_validos:  # Garantir que módulo ainda existe
                    UserModulePermission.objects.create(
                        member=membro,
                        module_key=module_key,
                        concedido_por=convite.convidado_por,
                        ativo=True
                    )
                    modulos_criados.append(module_key)

            logger.info(f"✅ Permissões criadas para {request.user.email}: {modulos_criados}")

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

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def verificar_convite(self, request):
        """
        Verifica status de um convite e se o email já tem conta
        GET /api/invites/verificar_convite/?codigo={codigo}

        Retorna:
        - convite_valido: bool
        - email: string (email do convite)
        - email_tem_conta: bool
        - organizacao: string (nome da organização)
        - role: string (cargo oferecido)
        - erro: string (se houver)
        """
        codigo = request.query_params.get('codigo')

        if not codigo:
            return Response(
                {'erro': 'Código do convite é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            convite = OrganizationInvite.objects.select_related('organization').get(codigo=codigo)
        except OrganizationInvite.DoesNotExist:
            return Response({
                'convite_valido': False,
                'erro': 'Convite não encontrado'
            }, status=status.HTTP_404_NOT_FOUND)

        # Verificar se status é pending
        if convite.status != 'pending':
            return Response({
                'convite_valido': False,
                'erro': f'Este convite não está mais disponível (status: {convite.get_status_display()})'
            })

        # Verificar se expirou
        if convite.expirado:
            convite.status = 'expired'
            convite.save()
            return Response({
                'convite_valido': False,
                'erro': 'Este convite expirou'
            })

        # Verificar se email já tem conta
        from django.contrib.auth import get_user_model
        User = get_user_model()
        email_tem_conta = User.objects.filter(email=convite.email).exists()

        return Response({
            'convite_valido': True,
            'email': convite.email,
            'email_tem_conta': email_tem_conta,
            'organizacao': convite.organization.nome,
            'role': convite.get_role_display(),
            'expira_em': convite.expira_em
        })

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    @transaction.atomic
    def aceitar_por_codigo(self, request):
        """
        Aceita um convite usando o código único (com auto-registro se necessário)
        POST /api/invites/aceitar_por_codigo/

        Body:
        - codigo: string (obrigatório)
        - senha: string (obrigatório se email não tem conta)
        """
        from django.contrib.auth import get_user_model, login
        User = get_user_model()

        codigo = request.data.get('codigo')
        senha = request.data.get('senha')

        if not codigo:
            return Response(
                {'error': 'Código do convite é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            convite = OrganizationInvite.objects.get(codigo=codigo)
        except OrganizationInvite.DoesNotExist:
            return Response(
                {'error': 'Convite não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar se o status é pending
        if convite.status != 'pending':
            return Response(
                {'error': f'Este convite não está mais disponível (status: {convite.get_status_display()})'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar se expirou
        if convite.expirado:
            convite.status = 'expired'
            convite.save()
            return Response(
                {'error': 'Este convite expirou'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar se email já tem conta
        usuario_existente = User.objects.filter(email=convite.email).first()

        if not usuario_existente:
            # ===== FLUXO: NOVO USUÁRIO (AUTO-REGISTRO) =====
            if not senha:
                return Response(
                    {'error': 'Senha é obrigatória para criar conta'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validar senha mínima
            if len(senha) < 6:
                return Response(
                    {'error': 'Senha deve ter no mínimo 6 caracteres'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Criar novo usuário
            logger.info(f"🆕 Criando conta automaticamente para {convite.email}")
            usuario = User.objects.create_user(
                username=convite.email,  # Usar email como username
                email=convite.email,
                password=senha
            )

            # Auto-login do usuário recém-criado
            login(request, usuario, backend='django.contrib.auth.backends.ModelBackend')
            logger.info(f"✅ Conta criada e usuário autologado: {usuario.email}")

        else:
            # ===== FLUXO: USUÁRIO EXISTENTE =====
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Você precisa fazer login primeiro'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            if request.user.email != convite.email:
                return Response(
                    {'error': 'Este convite foi enviado para outro email'},
                    status=status.HTTP_403_FORBIDDEN
                )

            usuario = request.user

        # Verificar se já é membro
        if convite.organization.membros.filter(user=usuario, ativo=True).exists():
            return Response(
                {'error': 'Você já é membro desta organização'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Criar membro
        membro = OrganizationMember.objects.create(
            organization=convite.organization,
            user=usuario,
            role=convite.role,
            convidado_por=convite.convidado_por
        )

        # CORREÇÃO: Atualizar sessão para definir nova organização como ativa
        request.session['active_organization_id'] = convite.organization.id
        logger.info(f"✅ Sessão atualizada: organização {convite.organization.nome} (ID: {convite.organization.id}) agora está ativa")

        # Criar permissões se role='member' e tem módulos
        if convite.role == 'member' and convite.modulos_permitidos:
            modulos_validos = {m['key'] for m in MODULES}  # Filtrar módulos válidos
            modulos_criados = []

            for module_key in convite.modulos_permitidos:
                if module_key in modulos_validos:  # Garantir que módulo ainda existe
                    UserModulePermission.objects.create(
                        member=membro,
                        module_key=module_key,
                        concedido_por=convite.convidado_por,
                        ativo=True
                    )
                    modulos_criados.append(module_key)

            logger.info(f"✅ Permissões criadas para {usuario.email}: {modulos_criados}")

        # Atualizar convite
        convite.status = 'accepted'
        convite.aceito_em = timezone.now()
        convite.aceito_por = usuario
        convite.save()

        logger.info(f"✅ Convite aceito! {usuario.email} → {convite.organization.nome} como {convite.role}")

        return Response({
            'message': 'Convite aceito com sucesso! Você agora faz parte da organização.',
            'organization': OrganizationSerializer(convite.organization).data,
            'conta_criada': not usuario_existente,  # Informar se conta foi criada
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def minhas_organizacoes(self, request):
        """
        Lista todas as organizações do usuário autenticado
        GET /organizations/minhas_organizacoes/

        Retorna lista com:
        - id, nome, plano
        - role do usuário (owner/admin/member)
        """
        try:
            # Buscar todos os memberships ativos do usuário
            memberships = OrganizationMember.objects.select_related('organization').filter(
                user=request.user,
                ativo=True,
                organization__ativo=True
            ).order_by('-role', 'organization__nome')  # Ordenar: owner > admin > member > alfabético

            organizacoes = []
            for member in memberships:
                organizacoes.append({
                    'id': member.organization.id,
                    'nome': member.organization.nome,
                    'plano': member.organization.plano,
                    'limite_membros': member.organization.limite_membros,
                    'role': member.role,
                    'ativo': member.organization.id == request.session.get('active_organization_id')
                })

            return Response(organizacoes, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"❌ Erro ao listar organizações: {str(e)}")
            return Response(
                {'error': 'Erro ao listar organizações'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def selecionar_organizacao(self, request):
        """
        Seleciona uma organização como ativa
        POST /organizations/selecionar_organizacao/

        Body:
        {
            "organization_id": 123
        }

        Atualiza a sessão do usuário com a organização selecionada
        """
        try:
            organization_id = request.data.get('organization_id')

            if not organization_id:
                return Response(
                    {'error': 'organization_id é obrigatório'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verificar se usuário é membro desta organização
            try:
                member = OrganizationMember.objects.select_related('organization').get(
                    user=request.user,
                    organization_id=organization_id,
                    ativo=True,
                    organization__ativo=True
                )
            except OrganizationMember.DoesNotExist:
                return Response(
                    {'error': 'Você não é membro desta organização'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Atualizar sessão
            request.session['active_organization_id'] = organization_id

            logger.info(f"✅ Organização trocada: {request.user.email} → {member.organization.nome}")

            return Response({
                'message': 'Organização selecionada com sucesso',
                'organization': OrganizationSerializer(member.organization).data,
                'role': member.role
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"❌ Erro ao selecionar organização: {str(e)}")
            return Response(
                {'error': 'Erro ao selecionar organização'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
