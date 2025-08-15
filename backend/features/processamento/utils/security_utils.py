# backend/features/processamento/utils/security_utils.py
import hashlib
import ipaddress
import re
from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponseForbidden
import logging

logger = logging.getLogger(__name__)

class IPSecurityUtils:
    """Utilitários de segurança para manipulação segura de IPs"""
    
    @staticmethod
    def mask_ip(ip_address):
        """
        Mascara um IP para exibição segura no frontend
        
        Args:
            ip_address (str): IP completo
            
        Returns:
            str: IP mascarado (ex: 192.168.xxx.xxx)
        """
        if not ip_address:
            return "xxx.xxx.xxx.xxx"
        
        try:
            # Valida se é um IP válido
            ip_obj = ipaddress.ip_address(ip_address)
            
            # Para IPv4
            if isinstance(ip_obj, ipaddress.IPv4Address):
                parts = str(ip_obj).split('.')
                if len(parts) == 4:
                    return f"{parts[0]}.{parts[1]}.xxx.xxx"
            
            # Para IPv6 - mascarar últimos 64 bits
            elif isinstance(ip_obj, ipaddress.IPv6Address):
                return f"{str(ip_obj)[:19]}xxxx:xxxx:xxxx:xxxx"
                
        except ValueError:
            # Se não for um IP válido, retorna mascarado genérico
            return "xxx.xxx.xxx.xxx"
        
        return "xxx.xxx.xxx.xxx"
    
    @staticmethod
    def hash_ip(ip_address, salt="chegou_hub_ip_salt"):
        """
        Gera hash SHA256 do IP para referência interna
        
        Args:
            ip_address (str): IP completo
            salt (str): Salt para hash
            
        Returns:
            str: Hash SHA256 do IP
        """
        if not ip_address:
            return ""
        
        # Adiciona salt específico do sistema
        salted_ip = f"{salt}_{ip_address}_{settings.SECRET_KEY[:10]}"
        return hashlib.sha256(salted_ip.encode()).hexdigest()
    
    @staticmethod
    def validate_ip_format(ip_address):
        """
        Valida se string é um IP válido
        
        Args:
            ip_address (str): IP para validar
            
        Returns:
            bool: True se válido
        """
        try:
            ipaddress.ip_address(ip_address)
            return True
        except ValueError:
            return False
    
    @staticmethod
    def is_private_ip(ip_address):
        """
        Verifica se IP é privado/local
        
        Args:
            ip_address (str): IP para verificar
            
        Returns:
            bool: True se privado
        """
        try:
            ip_obj = ipaddress.ip_address(ip_address)
            return ip_obj.is_private
        except ValueError:
            return False
    
    @staticmethod
    def sanitize_ip_input(ip_input):
        """
        Sanitiza input de IP para prevenir injection
        
        Args:
            ip_input (str): Input do usuário
            
        Returns:
            str: IP sanitizado ou None se inválido
        """
        if not ip_input or not isinstance(ip_input, str):
            return None
        
        # Remove caracteres suspeitos
        sanitized = re.sub(r'[^0-9a-fA-F.:\/]', '', ip_input.strip())
        
        # Valida formato
        if IPSecurityUtils.validate_ip_format(sanitized):
            return sanitized
        
        return None

class RateLimitManager:
    """Gerenciador de rate limiting para endpoints de IP"""
    
    # Configurações de rate limiting
    LIMITS = {
        'ip_search': {
            'requests': 10,
            'window': 3600,  # 1 hora
            'key_prefix': 'ip_search_rl'
        },
        'ip_detail': {
            'requests': 20,
            'window': 3600,  # 1 hora  
            'key_prefix': 'ip_detail_rl'
        }
    }
    
    @classmethod
    def check_rate_limit(cls, user, endpoint):
        """
        Verifica se usuário está dentro do rate limit
        
        Args:
            user: Django User object
            endpoint: Nome do endpoint ('ip_search' ou 'ip_detail')
            
        Returns:
            tuple: (allowed: bool, remaining: int)
        """
        if endpoint not in cls.LIMITS:
            return True, 0
        
        config = cls.LIMITS[endpoint]
        cache_key = f"{config['key_prefix']}_{user.id}"
        
        try:
            current_count = cache.get(cache_key, 0)
            
            if current_count >= config['requests']:
                logger.warning(f"Rate limit exceeded for user {user.username} on {endpoint}")
                return False, 0
            
            # Incrementa contador
            cache.set(cache_key, current_count + 1, config['window'])
            remaining = config['requests'] - current_count - 1
            
            return True, remaining
            
        except Exception as e:
            # Fallback: se cache Redis falhar, permite requisição mas loga
            logger.warning(f"Cache Redis indisponível para rate limit: {e}")
            logger.info(f"Permitindo requisição de {user.username} em {endpoint} (fallback mode)")
            
            # Retorna permitido com limite padrão em fallback
            return True, config['requests'] - 1
    
    @classmethod
    def get_rate_limit_response(cls, endpoint):
        """
        Retorna resposta HTTP para rate limit exceeded
        
        Args:
            endpoint: Nome do endpoint
            
        Returns:
            HttpResponseForbidden: Resposta de rate limit
        """
        config = cls.LIMITS.get(endpoint, {})
        message = (
            f"Rate limit exceeded. Maximum {config.get('requests', 0)} requests "
            f"per {config.get('window', 0)} seconds allowed for this endpoint."
        )
        
        response = HttpResponseForbidden(message)
        response['Retry-After'] = str(config.get('window', 3600))
        return response

class AuditLogger:
    """Logger de auditoria para operações sensíveis com IPs"""
    
    @staticmethod
    def log_ip_access(user, request, action, details=None):
        """
        Registra acesso a dados de IP para auditoria
        
        Args:
            user: Django User object
            request: HttpRequest object
            action: Ação realizada ('search', 'detail', 'export')
            details: Detalhes adicionais da operação
        """
        # Captura IP do usuário que fez a requisição
        user_ip = AuditLogger._get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        audit_data = {
            'user_id': user.id,
            'username': user.username,
            'user_ip': user_ip,
            'user_agent': user_agent,
            'action': action,
            'timestamp': None,  # Django logger adiciona automaticamente
            'details': details or {}
        }
        
        logger.info(f"IP_AUDIT: {audit_data}")
        
        # Para casos críticos, também salva em cache para alertas
        if action in ['massive_search', 'suspicious_activity']:
            try:
                cache_key = f"security_alert_{user.id}_{action}"
                cache.set(cache_key, audit_data, 3600)  # 1 hora
            except Exception as e:
                logger.warning(f"Falha ao salvar alerta de segurança no cache: {e}")
                # Continua execução sem falhar
    
    @staticmethod
    def _get_client_ip(request):
        """Extrai IP real do cliente considerando proxies"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip
    
    @staticmethod
    def check_suspicious_activity(user, details):
        """
        Verifica atividade suspeita baseada em padrões
        
        Args:
            user: Django User object
            details: Detalhes da operação atual
            
        Returns:
            bool: True se atividade for suspeita
        """
        # Verifica se usuário está fazendo muitas consultas
        try:
            cache_key = f"user_activity_{user.id}"
            activity_count = cache.get(cache_key, 0)
            
            if activity_count > 100:  # Mais de 100 operações em 1 hora
                return True
            
            cache.set(cache_key, activity_count + 1, 3600)
        except Exception as e:
            logger.warning(f"Cache Redis indisponível para verificação de atividade suspeita: {e}")
            # Fallback: não considera suspeito se cache falhar
        
        # Verifica horário suspeito (fora do horário comercial)
        from datetime import datetime
        current_hour = datetime.now().hour
        if current_hour < 6 or current_hour > 22:  # Fora de 6h às 22h
            return True
        
        # Verifica quantidade de IPs diferentes consultados
        if details and details.get('unique_ips_accessed', 0) > 50:
            return True
        
        return False

class SecurityHeadersManager:
    """Gerenciador de headers de segurança para responses"""
    
    @staticmethod
    def add_security_headers(response):
        """
        Adiciona headers de segurança a uma response
        
        Args:
            response: HttpResponse object
            
        Returns:
            HttpResponse: Response com headers de segurança
        """
        # Headers para prevenir caching de dados sensíveis
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        
        # Headers de segurança
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'no-referrer'
        
        # Header customizado para auditoria
        response['X-Processed-By'] = 'ChegouHub-Security'
        
        return response