# backend/features/estoque/services/shopify_webhook_service.py
import hmac
import hashlib
import json
import logging
from django.conf import settings
from django.utils import timezone
from typing import Dict, Any, List, Optional
from ..utils.security_utils import LogSanitizer, WebhookSecurityValidator, safe_log_data

logger = logging.getLogger(__name__)


class ShopifyWebhookService:
    """Serviço para validação e processamento seguro de webhooks do Shopify"""
    
    @staticmethod
    def validate_webhook_request(request) -> tuple[bool, str]:
        """
        Valida requisição de webhook com múltiplas verificações de segurança
        
        Args:
            request: Request object Django
            
        Returns:
            Tuple (is_valid, error_message)
        """
        try:
            # Verificar headers do Shopify
            header_validations = WebhookSecurityValidator.validate_shopify_headers(request)
            
            if not header_validations['has_topic']:
                return False, "Header X-Shopify-Topic ausente"
            
            if not header_validations['valid_topic']:
                return False, "Tópico de webhook inválido ou não suportado"
            
            if not header_validations['has_shop_domain']:
                return False, "Header X-Shopify-Shop-Domain ausente"
            
            if not header_validations['valid_shop_domain']:
                return False, "Formato de domínio da loja inválido"
            
            if not header_validations['has_signature']:
                return False, "Assinatura HMAC ausente - webhook rejeitado por segurança"
            
            # Verificar se a requisição é suspeita
            is_suspicious, reason = WebhookSecurityValidator.is_suspicious_request(request)
            if is_suspicious:
                return False, f"Requisição suspeita detectada: {reason}"
            
            return True, "Validação passou"
            
        except Exception as e:
            logger.error(f"Erro na validação do webhook: {str(e)}")
            return False, f"Erro interno na validação: {str(e)}"
    
    @staticmethod
    def verify_webhook_signature(request_body: bytes, shopify_signature: str, webhook_secret: str) -> bool:
        """
        Verifica a assinatura HMAC do webhook do Shopify de forma obrigatória
        
        Args:
            request_body: Corpo da requisição em bytes
            shopify_signature: Header X-Shopify-Hmac-Sha256
            webhook_secret: Secret configurado no webhook
            
        Returns:
            bool: True se a assinatura for válida
        """
        # Validação HMAC é OBRIGATÓRIA - nunca pular esta verificação
        if not shopify_signature:
            logger.error("SECURITY: Webhook recebido sem assinatura HMAC - REJEITADO")
            return False
            
        if not webhook_secret:
            logger.error("SECURITY: Secret do webhook não configurado - REJEITADO")
            return False
            
        if not request_body:
            logger.error("SECURITY: Payload vazio no webhook - REJEITADO")
            return False
        
        # Usar validador de segurança
        is_valid = WebhookSecurityValidator.validate_hmac_signature(
            request_body, shopify_signature, webhook_secret
        )
        
        if not is_valid:
            logger.error("SECURITY: Assinatura HMAC inválida - Possível ataque detectado")
            
        return is_valid
    
    @staticmethod
    def extract_order_data(webhook_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extrai dados relevantes do payload do webhook de pedido com sanitização
        
        Args:
            webhook_payload: Payload JSON do webhook
            
        Returns:
            Dict com dados extraídos do pedido (sanitizados para logs)
        """
        try:
            order_data = {
                'shopify_order_id': webhook_payload.get('id'),
                'order_number': webhook_payload.get('order_number'),
                'financial_status': webhook_payload.get('financial_status'),
                'fulfillment_status': webhook_payload.get('fulfillment_status'),
                'created_at': webhook_payload.get('created_at'),
                'total_price': webhook_payload.get('total_price'),
                'currency': webhook_payload.get('currency'),
                'customer_email': webhook_payload.get('email'),  # Será sanitizado nos logs
                'shop_domain': webhook_payload.get('shop_domain'),
                'line_items': []
            }
            
            # Extrair line items com SKUs
            for item in webhook_payload.get('line_items', []):
                line_item = {
                    'shopify_product_id': item.get('product_id'),
                    'shopify_variant_id': item.get('variant_id'),
                    'sku': item.get('sku'),
                    'title': item.get('title'),
                    'name': item.get('name'),
                    'quantity': item.get('quantity', 0),
                    'price': item.get('price'),
                    'variant_title': item.get('variant_title')
                }
                order_data['line_items'].append(line_item)
            
            # Log seguro dos dados extraídos (sem dados sensíveis)
            safe_log_data({
                'event': 'order_data_extracted',
                'order_id': order_data.get('shopify_order_id'),
                'order_number': order_data.get('order_number'),
                'items_count': len(order_data['line_items']),
                'total_price': order_data.get('total_price')
            }, 'info')
            
            return order_data
            
        except Exception as e:
            logger.error(f"Erro ao extrair dados do pedido: {str(e)}")
            raise
    
    @staticmethod
    def should_process_order(order_data: Dict[str, Any]) -> tuple[bool, str]:
        """
        Verifica se o pedido deve ser processado para decremento de estoque
        
        Args:
            order_data: Dados do pedido extraídos
            
        Returns:
            tuple: (should_process: bool, reason: str)
        """
        try:
            # Verificar se o pedido foi pago
            financial_status = order_data.get('financial_status', '').lower()
            if financial_status not in ['paid', 'partially_paid']:
                return False, f"Pedido não pago. Status financeiro: {financial_status}"
            
            # Verificar se há line items
            line_items = order_data.get('line_items', [])
            if not line_items:
                return False, "Pedido sem itens"
            
            # Verificar se há pelo menos um item com SKU válido
            items_with_sku = [item for item in line_items if item.get('sku')]
            if not items_with_sku:
                return False, "Nenhum item com SKU encontrado"
            
            return True, "Pedido válido para processamento"
            
        except Exception as e:
            logger.error(f"Erro ao validar se deve processar pedido: {str(e)}")
            return False, f"Erro na validação: {str(e)}"
    
    @staticmethod
    def log_webhook_received(shop_domain: str, order_id: str, event_type: str, success: bool, details: Dict[str, Any]):
        """
        Registra log do webhook recebido de forma segura (sanitizado)
        
        Args:
            shop_domain: Domínio da loja
            order_id: ID do pedido
            event_type: Tipo do evento (order_created, order_paid, etc.)
            success: Se o processamento foi bem-sucedido
            details: Detalhes adicionais para log
        """
        try:
            log_message = {
                'event': 'shopify_webhook_received',
                'shop_domain': shop_domain,
                'order_id': order_id,
                'event_type': event_type,
                'success': success,
                'timestamp': timezone.now().isoformat(),
                'details': details
            }
            
            # Usar log seguro para evitar vazar dados sensíveis
            safe_log_data(log_message, 'info' if success else 'error')
                
        except Exception as e:
            logger.error(f"Erro ao criar log do webhook: {str(e)}")
    
    @staticmethod
    def get_shop_config_by_domain(shop_domain: str):
        """
        Busca a configuração da loja pelo domínio com validação de segurança
        
        Args:
            shop_domain: Domínio da loja (ex: minha-loja.myshopify.com)
            
        Returns:
            ShopifyConfig ou None se não encontrado
        """
        try:
            from features.processamento.models import ShopifyConfig
            
            # Validar formato do domínio antes de buscar no banco
            if not shop_domain or len(shop_domain) > 255:
                logger.warning(f"Domínio inválido fornecido: {shop_domain[:50]}...")
                return None
            
            # Normalizar domínio (remover protocolo se houver)
            domain = shop_domain.replace('https://', '').replace('http://', '').strip()
            
            # Validação adicional: deve ser um domínio Shopify válido
            if not domain.endswith('.myshopify.com') and not domain.endswith('.shopifypreview.com'):
                logger.warning(f"SECURITY: Domínio não é do Shopify - possível ataque: {domain}")
                return None
            
            # Buscar configuração ativa por shop_url com select_related para otimização
            config = ShopifyConfig.objects.select_related('user').filter(
                shop_url=domain,
                ativo=True
            ).first()
            
            if not config:
                logger.warning(f"Configuração não encontrada para domínio: {domain}")
            else:
                logger.info(f"Configuração encontrada para loja: {domain}")
            
            return config
            
        except Exception as e:
            logger.error(f"Erro ao buscar configuração da loja: {str(e)}")
            return None