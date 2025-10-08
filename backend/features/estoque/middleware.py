# backend/features/estoque/middleware.py
"""
Middleware de debug para investigar problemas de CSRF
"""
import logging

logger = logging.getLogger(__name__)


class CSRFDebugMiddleware:
    """Middleware para debug de problemas de CSRF"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Log antes do processamento
        if request.path.startswith('/api/estoque/produtos-compartilhados'):
            logger.info("=" * 80)
            logger.info("=== CSRF DEBUG MIDDLEWARE - REQUEST RECEBIDA ===")
            logger.info(f"Path: {request.path}")
            logger.info(f"Method: {request.method}")
            logger.info(f"User: {request.user}")
            logger.info(f"Is authenticated: {request.user.is_authenticated if hasattr(request, 'user') else 'N/A'}")

            # Cookies
            logger.info("Cookies recebidos:")
            for cookie_name, cookie_value in request.COOKIES.items():
                if 'csrf' in cookie_name.lower() or 'session' in cookie_name.lower():
                    logger.info(f"  - {cookie_name}: {cookie_value[:20]}..." if len(cookie_value) > 20 else f"  - {cookie_name}: {cookie_value}")

            # Headers CSRF
            csrf_token_header = request.META.get('HTTP_X_CSRFTOKEN', None)
            csrf_token_cookie = request.COOKIES.get('csrftoken', None)

            logger.info(f"CSRF Token (Header X-CSRFToken): {csrf_token_header[:20] if csrf_token_header else 'NONE'}...")
            logger.info(f"CSRF Token (Cookie): {csrf_token_cookie[:20] if csrf_token_cookie else 'NONE'}...")

            # Origin e Referer
            logger.info(f"Origin: {request.META.get('HTTP_ORIGIN', 'NONE')}")
            logger.info(f"Referer: {request.META.get('HTTP_REFERER', 'NONE')}")
            logger.info(f"Host: {request.META.get('HTTP_HOST', 'NONE')}")

            # Session
            if hasattr(request, 'session'):
                logger.info(f"Session key exists: {bool(request.session.session_key)}")
                logger.info(f"Session is empty: {request.session.is_empty()}")

            logger.info("=" * 80)

        response = self.get_response(request)

        # Log depois do processamento
        if request.path.startswith('/api/estoque/produtos-compartilhados'):
            logger.info("=" * 80)
            logger.info("=== CSRF DEBUG MIDDLEWARE - RESPONSE ===")
            logger.info(f"Status Code: {response.status_code}")
            logger.info(f"Reason: {getattr(response, 'reason_phrase', 'N/A')}")

            if response.status_code == 403:
                logger.error("🚨 RESPONSE 403 FORBIDDEN DETECTADO!")
                logger.error(f"Response content: {getattr(response, 'content', b'')[:500]}")

            logger.info("=" * 80)

        return response

    def process_exception(self, request, exception):
        """Capturar exceções durante processamento"""
        if request.path.startswith('/api/estoque/produtos-compartilhados'):
            logger.error("=" * 80)
            logger.error("=== CSRF DEBUG MIDDLEWARE - EXCEPTION ===")
            logger.error(f"Exception type: {type(exception).__name__}")
            logger.error(f"Exception message: {str(exception)}")
            logger.error("=" * 80)

        return None  # Deixar Django processar normalmente
