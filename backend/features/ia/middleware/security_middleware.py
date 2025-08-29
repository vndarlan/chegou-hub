# backend/features/ia/middleware/security_middleware.py - MIDDLEWARE DE SEGURANÇA
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache
from django.contrib.auth.models import AnonymousUser
from ..security_audit import security_audit
import logging
import time
import json

logger = logging.getLogger(__name__)

class WhatsAppSecurityMiddleware(MiddlewareMixin):
    """Middleware de segurança para endpoints WhatsApp Business"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.protected_paths = [
            '/api/ia/business-managers/',
            '/api/ia/whatsapp-phone-numbers/',
            '/api/ia/quality-alerts/',
            '/api/ia/sincronizar-meta-api/',
        ]
        super().__init__(get_response)
    
    def process_request(self, request):
        """Processa requisições para endpoints protegidos"""
        
        # Verificar se é endpoint protegido
        if not any(path in request.path for path in self.protected_paths):
            return None
        
        # Obter IP real
        ip_address = self.get_client_ip(request)
        
        # Rate limiting por IP
        if not self.check_ip_rate_limit(ip_address):
            logger.warning(f"Rate limit por IP excedido: {ip_address}")
            return JsonResponse({
                'error': 'Muitas requisições. Tente novamente em alguns minutos.',
                'code': 'RATE_LIMIT_EXCEEDED'
            }, status=429)
        
        # Detectar padrões suspeitos
        if self.detect_suspicious_patterns(request, ip_address):
            logger.warning(f"Padrão suspeito detectado de {ip_address}")
            return JsonResponse({
                'error': 'Acesso negado por questões de segurança.',
                'code': 'SUSPICIOUS_ACTIVITY'
            }, status=403)
        
        # Adicionar informações de segurança ao request
        request.security_context = {
            'ip_address': ip_address,
            'timestamp': time.time(),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200]
        }
        
        return None
    
    def process_response(self, request, response):
        """Processa respostas para auditoria"""
        
        if not hasattr(request, 'security_context'):
            return response
        
        # Log apenas para endpoints protegidos
        if any(path in request.path for path in self.protected_paths):
            user = request.user if hasattr(request, 'user') and not isinstance(request.user, AnonymousUser) else None
            
            # Determinar ação baseada no método e path
            action = self.determine_action(request.method, request.path)
            
            # Log da auditoria
            security_audit.log_access_attempt(
                user=user,
                action=action,
                resource=request.path,
                success=200 <= response.status_code < 400,
                ip_address=request.security_context['ip_address'],
                details={
                    'method': request.method,
                    'status_code': response.status_code,
                    'user_agent': request.security_context['user_agent']
                }
            )
        
        return response
    
    def get_client_ip(self, request):
        """Obtém o IP real do cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip
    
    def check_ip_rate_limit(self, ip_address, max_requests=30, window_minutes=15):
        """Verifica rate limiting por IP"""
        cache_key = f"ip_rate_limit_{ip_address}"
        
        current_time = time.time()
        requests = cache.get(cache_key, [])
        
        # Remove requests antigas
        cutoff_time = current_time - (window_minutes * 60)
        requests = [req_time for req_time in requests if req_time > cutoff_time]
        
        # Verifica limite
        if len(requests) >= max_requests:
            return False
        
        # Adiciona request atual
        requests.append(current_time)
        cache.set(cache_key, requests, window_minutes * 60)
        
        return True
    
    def detect_suspicious_patterns(self, request, ip_address):
        """Detecta padrões suspeitos de acesso"""
        
        # Lista de IPs bloqueados (em prod, usar BD)
        blocked_ips = cache.get('blocked_ips', [])
        if ip_address in blocked_ips:
            return True
        
        # Detectar user agents suspeitos
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
        suspicious_agents = ['bot', 'crawler', 'spider', 'scraper', 'hack', 'attack']
        if any(agent in user_agent for agent in suspicious_agents):
            if not any(allowed in user_agent for allowed in ['googlebot', 'bingbot']):
                return True
        
        # Detectar tentativas de path traversal ou injeção
        suspicious_patterns = ['../', '<script', 'javascript:', 'eval(', 'exec(']
        full_path = request.get_full_path().lower()
        if any(pattern in full_path for pattern in suspicious_patterns):
            return True
        
        # Verificar se há muitos headers suspeitos
        suspicious_headers = ['x-forwarded-for', 'x-real-ip', 'client-ip']
        header_count = sum(1 for header in suspicious_headers if request.META.get(f'HTTP_{header.upper().replace("-", "_")}'))
        if header_count > 2:
            return True
        
        return False
    
    def determine_action(self, method, path):
        """Determina a ação baseada no método e path"""
        
        if 'business-managers' in path:
            if method == 'POST':
                return 'create_business_manager'
            elif method == 'PUT' or method == 'PATCH':
                return 'update_business_manager'
            elif method == 'DELETE':
                return 'delete_business_manager'
            else:
                return 'view_business_manager'
        
        elif 'sincronizar' in path:
            return 'sync_whatsapp_data'
        
        elif 'quality-alerts' in path:
            return 'view_quality_alerts'
        
        elif 'whatsapp-phone-numbers' in path:
            return 'view_phone_numbers'
        
        return f"{method.lower()}_{path.split('/')[-2] if '/' in path else 'unknown'}"


class TokenValidationMiddleware(MiddlewareMixin):
    """Middleware para validar tokens em requests específicos"""
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        """Valida tokens em views específicas"""
        
        # Aplicar apenas a views que lidam com Business Managers
        if 'BusinessManagerViewSet' in str(view_func):
            
            # Se é POST (criação), validar token no body
            if request.method == 'POST':
                try:
                    body = json.loads(request.body) if request.body else {}
                    access_token = body.get('access_token')
                    
                    if access_token and self.is_token_suspicious(access_token):
                        logger.warning(f"Token suspeito detectado de {request.user}")
                        return JsonResponse({
                            'error': 'Token de acesso inválido ou suspeito.',
                            'code': 'INVALID_TOKEN'
                        }, status=400)
                        
                except (json.JSONDecodeError, AttributeError):
                    pass
        
        return None
    
    def is_token_suspicious(self, token):
        """Verifica se um token é suspeito"""
        
        if not token or not isinstance(token, str):
            return True
        
        # Muito curto
        if len(token) < 50:
            return True
        
        # Muito longo (tokens Meta normalmente < 500 chars)
        if len(token) > 1000:
            return True
        
        # Contém caracteres suspeitos
        import re
        if not re.match(r'^[A-Za-z0-9_\-|.]+$', token):
            return True
        
        # Padrões conhecidos de teste ou fake
        suspicious_patterns = [
            'test', 'fake', 'dummy', 'example', 'sample',
            '123456', 'abcdef', 'xxxxxx'
        ]
        token_lower = token.lower()
        if any(pattern in token_lower for pattern in suspicious_patterns):
            return True
        
        return False