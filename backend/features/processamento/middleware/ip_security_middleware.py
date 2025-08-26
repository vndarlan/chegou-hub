# backend/features/processamento/middleware/ip_security_middleware.py
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
import logging
import json
from ..utils.security_utils import RateLimitManager, AuditLogger

logger = logging.getLogger(__name__)

class IPDetectorSecurityMiddleware(MiddlewareMixin):
    """
    Middleware de segurança específico para endpoints do Detector de IP
    
    Aplica rate limiting, logging de auditoria e validações de segurança
    apenas nas rotas relacionadas a IPs para não impactar outras funcionalidades
    """
    
    # Atributo obrigatório para compatibilidade com Django
    async_mode = False
    
    # URLs que devem passar pelo middleware de segurança
    PROTECTED_URLS = [
        'buscar-ips-duplicados',
        'detalhar-ip',
    ]
    
    def process_request(self, request):
        """Processa request antes de chegar na view"""
        
        # Verifica se é uma rota protegida
        if not self._is_protected_url(request.path):
            return None
        
        # Só aplica para usuários autenticados
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
        
        # Rate limiting
        endpoint = self._get_endpoint_name(request.path)
        if endpoint:
            allowed, remaining = RateLimitManager.check_rate_limit(
                request.user, 
                endpoint
            )
            
            if not allowed:
                # Log tentativa de abuse
                AuditLogger.log_ip_access(
                    request.user,
                    request,
                    'rate_limit_exceeded',
                    {'endpoint': endpoint, 'path': request.path}
                )
                
                return JsonResponse({
                    'error': 'Rate limit exceeded',
                    'message': f'Muitas requisições. Limite: {RateLimitManager.LIMITS[endpoint]["requests"]} por hora.',
                    'retry_after': RateLimitManager.LIMITS[endpoint]['window']
                }, status=429)
            
            # Adiciona header com limite restante
            request.rate_limit_remaining = remaining
        
        return None
    
    def process_response(self, request, response):
        """Processa response antes de enviar ao cliente"""
        
        # Aplica apenas para rotas protegidas
        if not self._is_protected_url(request.path):
            return response
        
        # Adiciona headers de rate limiting
        if hasattr(request, 'rate_limit_remaining'):
            response['X-RateLimit-Remaining'] = str(request.rate_limit_remaining)
        
        # Adiciona headers de segurança para dados sensíveis
        if response.status_code == 200:
            response['Cache-Control'] = 'no-store, no-cache, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-Frame-Options'] = 'DENY'
        
        # Log da operação para auditoria
        if hasattr(request, 'user') and request.user.is_authenticated:
            endpoint = self._get_endpoint_name(request.path)
            
            # Extrai informações da resposta para audit log
            details = {
                'endpoint': endpoint,
                'status_code': response.status_code,
                'path': request.path
            }
            
            # Se response contém dados, analisa para detectar atividade suspeita
            if response.status_code == 200 and hasattr(response, 'content'):
                try:
                    data = json.loads(response.content.decode('utf-8'))
                    
                    # Conta quantos IPs únicos foram retornados
                    if 'data' in data and 'ip_groups' in data['data']:
                        unique_ips = len(data['data']['ip_groups'])
                        details['unique_ips_accessed'] = unique_ips
                        
                        # Verifica atividade suspeita
                        if AuditLogger.check_suspicious_activity(request.user, details):
                            AuditLogger.log_ip_access(
                                request.user,
                                request,
                                'suspicious_activity',
                                details
                            )
                    
                except (json.JSONDecodeError, KeyError):
                    pass
            
            AuditLogger.log_ip_access(
                request.user,
                request,
                self._get_action_name(request.method, endpoint),
                details
            )
        
        return response
    
    def _is_protected_url(self, path):
        """Verifica se URL deve ser protegida pelo middleware"""
        return any(protected in path for protected in self.PROTECTED_URLS)
    
    def _get_endpoint_name(self, path):
        """Mapeia path para nome do endpoint para rate limiting"""
        if 'buscar-ips-duplicados' in path:
            return 'ip_search'
        elif 'detalhar-ip' in path:
            return 'ip_detail'
        return None
    
    def _get_action_name(self, method, endpoint):
        """Gera nome da ação para audit log"""
        action_map = {
            'GET': 'view',
            'POST': 'search'
        }
        
        base_action = action_map.get(method, 'unknown')
        
        if endpoint == 'ip_search':
            return f'ip_{base_action}_bulk'
        elif endpoint == 'ip_detail':
            return f'ip_{base_action}_detail'
        
        return f'ip_{base_action}'

class SecurityAuditMiddleware(MiddlewareMixin):
    """
    Middleware adicional para auditoria geral de segurança
    
    Monitora tentativas de acesso não autorizadas e comportamentos suspeitos
    """
    
    # Atributo obrigatório para compatibilidade com Django
    async_mode = False
    
    def process_request(self, request):
        """Monitora requests suspeitas"""
        
        # Detecta tentativas de SQL injection nos parâmetros (ajustado para reduzir falsos positivos)
        suspicious_patterns = [
            'union select', 'drop table', 'delete from', 
            'update set', 'insert into', '--', 
            # Removido ';' pois pode aparecer em dados legítimos como timestamps ou URLs
            '<script>', 'javascript:', 'eval(',
            '../', '..\\', '/etc/passwd'
        ]
        
        # Verifica parâmetros GET e POST
        all_params = {}
        all_params.update(request.GET.dict())
        if hasattr(request, 'POST'):
            all_params.update(request.POST.dict())
        
        for param, value in all_params.items():
            if isinstance(value, str):
                value_lower = value.lower()
                for pattern in suspicious_patterns:
                    if pattern in value_lower:
                        logger.warning(
                            f"Suspicious request detected: {request.path} "
                            f"from {self._get_client_ip(request)} "
                            f"param={param} value={value[:100]}"
                        )
                        
                        return JsonResponse({
                            'error': 'Request blocked by security policy',
                            'message': 'Requisição contém padrões suspeitos'
                        }, status=400)
        
        return None
    
    def _get_client_ip(self, request):
        """Extrai IP do cliente"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip