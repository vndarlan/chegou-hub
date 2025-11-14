"""
Endpoints temporários de debug - REMOVER APÓS USO!
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import Organization, OrganizationMember
from django.db.models import Q


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_user_organizations(request):
    """
    Debug: Mostra TODAS as informações de organizações do usuário
    Endpoint temporário - REMOVER após debug!
    """
    user = request.user

    # Buscar TODOS os memberships (sem filtros)
    all_members = OrganizationMember.objects.filter(user=user).select_related('organization')

    debug_info = {
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.first_name,
            'is_active': user.is_active,
        },
        'total_memberships_sem_filtros': all_members.count(),
        'memberships': [],
        'filtros_aplicados': {}
    }

    # Listar todos os memberships sem filtros
    for member in all_members:
        org = member.organization
        debug_info['memberships'].append({
            'membership_id': member.id,
            'organization_id': org.id,
            'organization_nome': org.nome,
            'role': member.role,
            'member_ativo': member.ativo,
            'org_ativo': org.ativo,
            'org_status': org.status,
            'org_status_repr': repr(org.status),
            'org_status_is_none': org.status is None,
            'org_status_is_empty_string': org.status == '',
        })

    # Testar cada filtro progressivamente
    test1 = OrganizationMember.objects.filter(user=user).count()
    debug_info['filtros_aplicados']['1_user_only'] = test1

    test2 = OrganizationMember.objects.filter(user=user, ativo=True).count()
    debug_info['filtros_aplicados']['2_user_ativo'] = test2

    test3 = OrganizationMember.objects.filter(
        user=user,
        ativo=True,
        organization__ativo=True
    ).count()
    debug_info['filtros_aplicados']['3_user_ativo_org_ativo'] = test3

    test4 = OrganizationMember.objects.filter(
        user=user,
        ativo=True,
        organization__ativo=True,
        organization__status='approved'
    ).count()
    debug_info['filtros_aplicados']['4_status_approved'] = test4

    test5 = OrganizationMember.objects.filter(
        user=user,
        ativo=True,
        organization__ativo=True,
        organization__status__isnull=True
    ).count()
    debug_info['filtros_aplicados']['5_status_isnull'] = test5

    # Query completa com Q objects (a que estamos usando)
    test6 = OrganizationMember.objects.select_related('organization').filter(
        Q(user=user) &
        Q(ativo=True) &
        Q(organization__ativo=True) &
        (Q(organization__status='approved') | Q(organization__status__isnull=True))
    ).count()
    debug_info['filtros_aplicados']['6_query_completa_com_Q'] = test6

    # Session info
    debug_info['session'] = {
        'active_organization_id': request.session.get('active_organization_id'),
        'session_key': request.session.session_key,
    }

    # Request organization from middleware
    debug_info['middleware'] = {
        'request_organization': request.organization.id if request.organization else None,
        'request_organization_role': request.organization_role,
    }

    return Response(debug_info)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_all_organizations(request):
    """
    Debug: Lista TODAS as organizações no banco
    Endpoint temporário - REMOVER após debug!
    """
    all_orgs = Organization.objects.all()

    orgs_data = []
    for org in all_orgs:
        orgs_data.append({
            'id': org.id,
            'nome': org.nome,
            'status': org.status,
            'status_repr': repr(org.status),
            'status_is_none': org.status is None,
            'status_is_empty': org.status == '',
            'ativo': org.ativo,
            'total_membros': org.membros.count(),
        })

    return Response({
        'total': all_orgs.count(),
        'organizations': orgs_data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_user_invites(request):
    """
    Debug: Mostra TODOS os convites do usuário
    Endpoint temporário - REMOVER após debug!
    """
    from core.models import OrganizationInvite

    user = request.user
    email = user.email

    # Buscar convites por email
    all_invites = OrganizationInvite.objects.filter(email=email).select_related('organization', 'convidado_por', 'aceito_por')

    invites_data = []
    for invite in all_invites:
        invites_data.append({
            'id': invite.id,
            'codigo': invite.codigo[:20] + '...',  # Apenas parte do código
            'email': invite.email,
            'organization_id': invite.organization.id,
            'organization_nome': invite.organization.nome,
            'organization_status': invite.organization.status,
            'organization_ativo': invite.organization.ativo,
            'role': invite.role,
            'status': invite.status,
            'criado_em': str(invite.criado_em),
            'expira_em': str(invite.expira_em),
            'aceito_em': str(invite.aceito_em) if invite.aceito_em else None,
            'convidado_por': invite.convidado_por.email if invite.convidado_por else None,
            'aceito_por': invite.aceito_por.email if invite.aceito_por else None,
        })

    return Response({
        'user_email': email,
        'total_invites': all_invites.count(),
        'invites': invites_data
    })
