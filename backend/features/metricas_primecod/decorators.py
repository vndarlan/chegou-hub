"""
Decorators para validação e controle de acesso nas views de métricas PrimeCOD
"""

from functools import wraps
from rest_framework.response import Response
from rest_framework import status
from .models import PrimeCODConfig


def require_primecod_token(view_func):
    """
    Decorator que valida token PrimeCOD antes de executar a view.

    Retorna erro 400 se token não estiver configurado, caso contrário
    executa a view normalmente.

    Usage:
        @api_view(['POST'])
        @permission_classes([IsAdminUser])
        @require_primecod_token
        def minha_view(request):
            # Token já validado aqui
            pass
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        token = PrimeCODConfig.get_token()
        if not token:
            return Response({
                'status': 'error',
                'message': 'Token da API não configurado. Configure em: Fornecedor > PrimeCOD > Configuração',
                'configured': False
            }, status=status.HTTP_400_BAD_REQUEST)
        return view_func(request, *args, **kwargs)
    return wrapper
