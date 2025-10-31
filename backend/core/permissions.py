"""
Permissões customizadas para o Chegou Hub.
"""
from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """
    Permissão que permite acesso apenas para usuários admin Django.

    Um usuário é considerado admin se:
    - is_staff = True (membro do time)
    - OU is_superuser = True (superadministrador)
    """

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser)
        )
