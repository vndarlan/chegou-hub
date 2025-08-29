# backend/features/estoque/utils/security_utils.py
"""
Utilitários de segurança para o módulo de estoque
"""
import re
import hmac
import hashlib
import logging
from typing import Dict, Any, Optional
from django.conf import settings

logger = logging.getLogger(__name__)


class LogSanitizer:
    """
    Sanitizador de logs para remover informações sensíveis
    """
    
    # Padrões de dados sensíveis
    SENSITIVE_PATTERNS = {
        'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'phone': r'(\(?\d{2}\)?\s?)?(\d{4,5}[-\s]?\d{4})',
        'cpf': r'\d{3}\.?\d{3}\.?\d{3}[-\.]?\d{2}',
        'cnpj': r'\d{2}\.?\d{3}\.?\d{3}/?\d{4}[-\.]?\d{2}',
        'credit_card': r'\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b',
        'password': r'(password|senha|pwd)["\']?\s*[:=]\s*["\']?([^"\'>\s]+)',
        'token': r'(token|key|secret)["\']?\s*[:=]\s*["\']?([A-Za-z0-9+/=]{20,})',
        'api_key': r'(api_key|apikey|access_key)["\']?\s*[:=]\s*["\']?([A-Za-z0-9+/=]{20,})',
    }
    
    @staticmethod
    def sanitize_string(text: str) -> str:
        """
        Sanitiza uma string removendo dados sensíveis
        
        Args:
            text: Texto a ser sanitizado
            
        Returns:
            Texto sanitizado
        """
        if not text:
            return text
        
        sanitized = text
        
        # Sanitizar cada tipo de dado sensível
        for data_type, pattern in LogSanitizer.SENSITIVE_PATTERNS.items():
            if data_type in ['password', 'token', 'api_key']:
                # Para campos com valor, manter o campo mas mascarar o valor
                sanitized = re.sub(pattern, r'\1: [MASKED]', sanitized, flags=re.IGNORECASE)
            else:
                # Para outros dados, substituir completamente
                if data_type == 'email':
                    sanitized = re.sub(pattern, '[EMAIL_MASKED]', sanitized)
                elif data_type == 'phone':
                    sanitized = re.sub(pattern, '[PHONE_MASKED]', sanitized)
                elif data_type == 'cpf':
                    sanitized = re.sub(pattern, '[CPF_MASKED]', sanitized)
                elif data_type == 'cnpj':
                    sanitized = re.sub(pattern, '[CNPJ_MASKED]', sanitized)
                elif data_type == 'credit_card':
                    sanitized = re.sub(pattern, '[CARD_MASKED]', sanitized)
        
        return sanitized
    
    @staticmethod
    def sanitize_dict(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitiza um dicionário recursivamente
        
        Args:
            data: Dicionário a ser sanitizado
            
        Returns:
            Dicionário sanitizado
        """
        if not isinstance(data, dict):
            return data
        
        sanitized = {}
        
        # Campos que devem ser completamente mascarados
        sensitive_fields = [
            'password', 'senha', 'secret', 'token', 'api_key', 'access_token',
            'email', 'phone', 'telefone', 'cpf', 'cnpj', 'credit_card',
            'card_number', 'customer_email'
        ]
        
        for key, value in data.items():
            key_lower = key.lower()
            
            # Verificar se o campo é sensível
            if any(sensitive_field in key_lower for sensitive_field in sensitive_fields):
                if 'email' in key_lower:
                    sanitized[key] = '[EMAIL_MASKED]'
                elif any(phone_field in key_lower for phone_field in ['phone', 'telefone']):
                    sanitized[key] = '[PHONE_MASKED]'
                else:
                    sanitized[key] = '[MASKED]'
            elif isinstance(value, dict):
                sanitized[key] = LogSanitizer.sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[key] = [LogSanitizer.sanitize_dict(item) if isinstance(item, dict) 
                                else LogSanitizer.sanitize_string(str(item)) if isinstance(item, str) 
                                else item for item in value]
            elif isinstance(value, str):
                sanitized[key] = LogSanitizer.sanitize_string(value)
            else:
                sanitized[key] = value
        
        return sanitized


class WebhookSecurityValidator:
    """
    Validador de segurança para webhooks
    """
    
    @staticmethod
    def validate_hmac_signature(payload: bytes, signature: str, secret: str) -> bool:
        """
        Valida assinatura HMAC de webhook
        
        Args:
            payload: Payload do webhook em bytes
            signature: Assinatura recebida
            secret: Chave secreta
            
        Returns:
            True se válida, False caso contrário
        """
        if not payload or not signature or not secret:
            logger.warning("Parâmetros de validação HMAC incompletos")
            return False
        
        try:
            # Calcular hash esperado
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            # Comparação segura
            is_valid = hmac.compare_digest(expected_signature, signature)
            
            if not is_valid:
                logger.warning(f"Assinatura HMAC inválida detectada")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Erro na validação HMAC: {str(e)}")
            return False
    
    @staticmethod
    def validate_shopify_headers(request) -> Dict[str, bool]:
        """
        Valida headers específicos do Shopify
        
        Args:
            request: Request object Django
            
        Returns:
            Dict com resultado das validações
        """
        validations = {
            'has_topic': False,
            'has_shop_domain': False,
            'has_signature': False,
            'valid_topic': False,
            'valid_shop_domain': False
        }
        
        # Verificar presença de headers
        topic = request.META.get('HTTP_X_SHOPIFY_TOPIC', '')
        shop_domain = request.META.get('HTTP_X_SHOPIFY_SHOP_DOMAIN', '')
        signature = request.META.get('HTTP_X_SHOPIFY_HMAC_SHA256', '')
        
        validations['has_topic'] = bool(topic)
        validations['has_shop_domain'] = bool(shop_domain)
        validations['has_signature'] = bool(signature)
        
        # Validar formato do tópico
        valid_topics = ['orders/create', 'orders/paid', 'orders/updated', 'orders/cancelled']
        validations['valid_topic'] = topic in valid_topics
        
        # Validar formato do domínio da loja
        shop_pattern = r'^[a-zA-Z0-9-]+\.myshopify\.com$'
        validations['valid_shop_domain'] = bool(re.match(shop_pattern, shop_domain))
        
        return validations
    
    @staticmethod
    def is_suspicious_request(request) -> tuple[bool, str]:
        """
        Detecta requisições suspeitas
        
        Args:
            request: Request object Django
            
        Returns:
            Tuple (é_suspeita, razão)
        """
        # Verificar User-Agent suspeito
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
        suspicious_agents = ['curl', 'wget', 'python-requests', 'bot', 'scanner']
        
        if any(agent in user_agent for agent in suspicious_agents):
            return True, f"User-Agent suspeito: {user_agent}"
        
        # Verificar tamanho do payload
        content_length = request.META.get('CONTENT_LENGTH', '0')
        try:
            size = int(content_length)
            if size > 10 * 1024 * 1024:  # 10MB
                return True, f"Payload muito grande: {size} bytes"
        except ValueError:
            pass
        
        # Verificar rate limiting por IP
        ip = request.META.get('REMOTE_ADDR', '')
        if not ip:
            return True, "IP não identificado"
        
        return False, "OK"


class PermissionValidator:
    """
    Validador de permissões para operações sensíveis
    """
    
    @staticmethod
    def validate_store_ownership(user, loja_config) -> bool:
        """
        Valida se o usuário tem permissão para acessar a loja
        
        Args:
            user: Usuário Django
            loja_config: Configuração da loja
            
        Returns:
            True se tem permissão, False caso contrário
        """
        if not user or not user.is_authenticated:
            return False
        
        if user.is_superuser:
            return True
        
        # Verificar se a loja pertence ao usuário
        if hasattr(loja_config, 'user') and loja_config.user == user:
            return True
        
        logger.warning(
            f"Tentativa de acesso não autorizado - Usuário: {user.id}, "
            f"Loja: {loja_config.id if loja_config else 'None'}"
        )
        
        return False
    
    @staticmethod
    def validate_product_ownership(user, produto) -> bool:
        """
        Valida se o usuário tem permissão para acessar o produto
        
        Args:
            user: Usuário Django
            produto: Produto de estoque
            
        Returns:
            True se tem permissão, False caso contrário
        """
        if not user or not user.is_authenticated:
            return False
        
        if user.is_superuser:
            return True
        
        # Verificar se o produto pertence ao usuário
        if produto.user == user:
            return True
        
        logger.warning(
            f"Tentativa de acesso não autorizado a produto - Usuário: {user.id}, "
            f"Produto: {produto.id}, Proprietário: {produto.user.id}"
        )
        
        return False


# Função utilitária para logs seguros
def safe_log_data(data: Any, level: str = 'info') -> None:
    """
    Registra dados de forma segura, removendo informações sensíveis
    
    Args:
        data: Dados a serem logados
        level: Nível do log (info, warning, error)
    """
    try:
        if isinstance(data, dict):
            sanitized_data = LogSanitizer.sanitize_dict(data)
        elif isinstance(data, str):
            sanitized_data = LogSanitizer.sanitize_string(data)
        else:
            sanitized_data = str(data)
        
        log_func = getattr(logger, level.lower(), logger.info)
        log_func(f"[SANITIZED] {sanitized_data}")
        
    except Exception as e:
        logger.error(f"Erro ao registrar log sanitizado: {str(e)}")