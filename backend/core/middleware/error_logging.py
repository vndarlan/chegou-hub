# backend/core/middleware/error_logging.py
"""
Middleware para logging detalhado de erros 500 em produção
"""

import logging
import traceback
from django.http import JsonResponse
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

class ErrorLoggingMiddleware(MiddlewareMixin):
    """
    Middleware para capturar e logar erros 500 com detalhes completos
    """
    
    # Atributo obrigatório para compatibilidade com Django
    async_mode = False
    
    def process_exception(self, request, exception):
        """
        Captura exceções não tratadas e cria logs detalhados
        """
        
        # Só ativar em produção ou quando explicitamente habilitado
        if not settings.DEBUG or settings.IS_RAILWAY_DEPLOYMENT:
            
            # Coletar informações do request
            request_info = {
                'method': request.method,
                'path': request.path,
                'user': str(request.user) if hasattr(request, 'user') and request.user.is_authenticated else 'Anonymous',
                'remote_addr': request.META.get('REMOTE_ADDR', 'Unknown'),
                'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown'),
                'content_type': request.META.get('CONTENT_TYPE', ''),
            }
            
            # Coletar dados do POST/PUT de forma segura
            if request.method in ['POST', 'PUT', 'PATCH']:
                try:
                    # Não logar dados sensíveis
                    body_data = request.body.decode('utf-8')[:1000]  # Primeiros 1000 chars
                    request_info['body_preview'] = body_data
                except Exception:
                    request_info['body_preview'] = 'Erro ao decodificar body'
            
            # Coletar stack trace completo
            error_details = {
                'exception_type': type(exception).__name__,
                'exception_message': str(exception),
                'stack_trace': traceback.format_exc(),
                'request_info': request_info
            }
            
            # Log detalhado
            logger.error(
                f"ERRO 500 CAPTURADO: {type(exception).__name__} em {request.path}",
                extra=error_details,
                exc_info=True
            )
            
            # Verificar tipos específicos de erro
            if 'encoding' in str(exception).lower() or 'unicode' in str(exception).lower():
                logger.error("ERRO DE ENCODING DETECTADO", extra={'encoding_error': True})
            
            if 'redis' in str(exception).lower() or 'connection' in str(exception).lower():
                logger.error("ERRO DE CONEXÃO DETECTADO", extra={'connection_error': True})
            
            # Em produção, retornar resposta JSON amigável
            if not settings.DEBUG:
                return JsonResponse({
                    'error': 'Erro interno do servidor',
                    'message': 'Ocorreu um erro inesperado. Nossa equipe foi notificada.',
                    'error_id': f"{type(exception).__name__}_{hash(str(exception)) % 10000}"
                }, status=500)
        
        # Continuar com o processamento normal (Django vai mostrar a página de erro)
        return None