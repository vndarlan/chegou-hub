# backend/core/middleware/n8n_auth.py
"""
Middleware para autenticação de requisições n8n via API Key
"""
from django.http import JsonResponse
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class N8NAuthMiddleware:
    """
    Middleware que valida API Key para endpoints específicos do n8n

    Configuração necessária no settings.py:
    - N8N_API_KEY: Chave secreta configurada no Railway

    Endpoints protegidos:
    - /metricas/ecomhub/orders/sync/
    """

    # Endpoints que requerem autenticação via API Key
    PROTECTED_ENDPOINTS = [
        '/metricas/ecomhub/orders/sync/',
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Verificar se o endpoint atual precisa de autenticação
        needs_auth = any(
            request.path.startswith(endpoint)
            for endpoint in self.PROTECTED_ENDPOINTS
        )

        if needs_auth:
            # Buscar API Key do header
            provided_key = request.headers.get('X-API-Key')
            expected_key = getattr(settings, 'N8N_API_KEY', None)

            # Validar
            if not expected_key:
                logger.error("N8N_API_KEY não configurada no settings!")
                return JsonResponse({
                    'error': 'Server configuration error',
                    'message': 'API Key não configurada no servidor'
                }, status=500)

            if not provided_key:
                logger.warning(f"Tentativa de acesso sem API Key: {request.path}")
                return JsonResponse({
                    'error': 'Unauthorized',
                    'message': 'Header X-API-Key é obrigatório'
                }, status=401)

            if provided_key != expected_key:
                logger.warning(f"API Key inválida fornecida para {request.path}")
                return JsonResponse({
                    'error': 'Unauthorized',
                    'message': 'API Key inválida'
                }, status=401)

            # API Key válida - logar sucesso
            logger.info(f"✅ n8n autenticado com sucesso: {request.path}")

        # Continuar com a requisição
        response = self.get_response(request)
        return response
