# backend/features/estoque/throttles.py
"""
Classes de throttling específicas para o módulo de estoque
"""
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
import logging

logger = logging.getLogger(__name__)


class EstoqueUserRateThrottle(UserRateThrottle):
    """
    Throttling para usuários autenticados nas operações de estoque
    Rate: 200 requests/hour (configurado em settings.py)
    """
    scope = 'estoque_user'


class EstoqueWebhookRateThrottle(AnonRateThrottle):
    """
    Throttling específico para webhooks (baseado em IP)
    """
    scope = 'estoque_webhook'
    
    def get_cache_key(self, request, view):
        """
        Chave baseada no IP e shop_domain para webhooks Shopify
        """
        ip = self.get_ident(request)
        shop_domain = request.META.get('HTTP_X_SHOPIFY_SHOP_DOMAIN', '')
        
        # Criar chave única combinando IP e domínio da loja
        cache_key = f"{self.scope}:{ip}:{shop_domain}"
        
        # Log para monitoramento
        logger.info(f"Webhook throttle check - IP: {ip}, Shop: {shop_domain}")
        
        return cache_key
    
    def throttle_failure(self):
        """
        Customizar resposta de throttle para webhooks
        """
        ip = self.get_ident(self.request)
        shop_domain = self.request.META.get('HTTP_X_SHOPIFY_SHOP_DOMAIN', 'unknown')
        
        logger.warning(
            f"Webhook rate limit exceeded - IP: {ip}, Shop: {shop_domain}, "
            f"Attempts: {self.num_requests}, Window: {self.duration}s"
        )
        
        return super().throttle_failure()


class EstoqueAPIRateThrottle(UserRateThrottle):
    """
    Throttling para operações sensíveis da API de estoque
    """
    scope = 'estoque_api_sensitive'
    
    def allow_request(self, request, view):
        """
        Permitir mais requests para superusers
        """
        if request.user.is_authenticated and request.user.is_superuser:
            # Superusers têm rate limit mais alto
            self.rate = '1000/hour'
            self.parse_rate(self.rate)
        
        return super().allow_request(request, view)


class EstoqueBulkOperationThrottle(UserRateThrottle):
    """
    Throttling para operações em lote que podem ser pesadas
    Rate: 10 requests/hour (configurado em settings.py)
    """
    scope = 'estoque_bulk'