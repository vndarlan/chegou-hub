"""
Sistema de envio de emails para o ChegouHub
Gerencia emails de convites de organizações, notificações e outras comunicações
"""
import os
import logging
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def send_invite_email(convite):
    """
    Envia email de convite para novo membro de organização

    Args:
        convite: Instância de OrganizationInvite

    Returns:
        bool: True se enviado com sucesso, False caso contrário
    """
    try:
        # URL do frontend para aceitar convite
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        invite_url = f"{frontend_url}/convites/aceitar/{convite.codigo}"

        # Contexto para os templates
        context = {
            'organization_name': convite.organization.nome,
            'inviter_name': convite.convidado_por.get_full_name() or convite.convidado_por.username,
            'inviter_email': convite.convidado_por.email,
            'role': convite.get_role_display(),
            'role_description': _get_role_description(convite.role),
            'invite_url': invite_url,
            'expires_at': convite.expira_em,
            'email': convite.email,
        }

        # Renderizar templates
        html_message = render_to_string('emails/organization_invite.html', context)
        text_message = render_to_string('emails/organization_invite.txt', context)

        # Criar email com HTML e texto alternativo
        subject = f'Convite para {convite.organization.nome} no ChegouHub'

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[convite.email]
        )
        email.attach_alternative(html_message, "text/html")

        # Enviar
        email.send(fail_silently=False)

        logger.info(f"✅ Email de convite enviado com sucesso para {convite.email}")
        return True

    except Exception as e:
        logger.error(f"❌ Erro ao enviar email de convite para {convite.email}: {str(e)}")
        return False


def _get_role_description(role):
    """
    Retorna descrição detalhada do role

    Args:
        role: String com o role (owner, admin, member)

    Returns:
        str: Descrição do role
    """
    descriptions = {
        'owner': 'Você terá controle total sobre a organização, incluindo gerenciamento de membros e configurações.',
        'admin': 'Você poderá gerenciar membros, configurar permissões e acessar todas as funcionalidades.',
        'member': 'Você terá acesso aos módulos e funcionalidades autorizados pela equipe.'
    }
    return descriptions.get(role, 'Você fará parte da equipe desta organização.')


def send_member_removed_email(member, removed_by):
    """
    Envia email notificando que um membro foi removido da organização

    Args:
        member: Instância de OrganizationMember
        removed_by: User que removeu o membro

    Returns:
        bool: True se enviado com sucesso, False caso contrário
    """
    try:
        context = {
            'organization_name': member.organization.nome,
            'removed_by_name': removed_by.get_full_name() or removed_by.username,
            'member_name': member.user.get_full_name() or member.user.username,
        }

        html_message = render_to_string('emails/member_removed.html', context)
        text_message = render_to_string('emails/member_removed.txt', context)

        subject = f'Você foi removido de {member.organization.nome}'

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[member.user.email]
        )
        email.attach_alternative(html_message, "text/html")
        email.send(fail_silently=False)

        logger.info(f"✅ Email de remoção enviado para {member.user.email}")
        return True

    except Exception as e:
        logger.error(f"❌ Erro ao enviar email de remoção: {str(e)}")
        return False


def send_role_changed_email(member, old_role, new_role, changed_by):
    """
    Envia email notificando mudança de role do membro

    Args:
        member: Instância de OrganizationMember
        old_role: Role anterior
        new_role: Novo role
        changed_by: User que mudou o role

    Returns:
        bool: True se enviado com sucesso, False caso contrário
    """
    try:
        context = {
            'organization_name': member.organization.nome,
            'member_name': member.user.get_full_name() or member.user.username,
            'old_role': dict(member._meta.get_field('role').choices)[old_role],
            'new_role': dict(member._meta.get_field('role').choices)[new_role],
            'changed_by_name': changed_by.get_full_name() or changed_by.username,
            'new_role_description': _get_role_description(new_role),
        }

        html_message = render_to_string('emails/role_changed.html', context)
        text_message = render_to_string('emails/role_changed.txt', context)

        subject = f'Seu cargo foi atualizado em {member.organization.nome}'

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[member.user.email]
        )
        email.attach_alternative(html_message, "text/html")
        email.send(fail_silently=False)

        logger.info(f"✅ Email de mudança de role enviado para {member.user.email}")
        return True

    except Exception as e:
        logger.error(f"❌ Erro ao enviar email de mudança de role: {str(e)}")
        return False
