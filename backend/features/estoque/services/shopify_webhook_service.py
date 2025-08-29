# backend/features/estoque/services/shopify_webhook_service.py
import hmac
import hashlib
import json
import logging
from django.conf import settings
from django.utils import timezone
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class ShopifyWebhookService:
    """Serviço para validação e processamento de webhooks do Shopify"""
    
    @staticmethod
    def verify_webhook_signature(request_body: bytes, shopify_signature: str, webhook_secret: str) -> bool:
        """
        Verifica a assinatura HMAC do webhook do Shopify
        
        Args:
            request_body: Corpo da requisição em bytes
            shopify_signature: Header X-Shopify-Hmac-Sha256
            webhook_secret: Secret configurado no webhook
            
        Returns:
            bool: True se a assinatura for válida
        """
        try:
            if not shopify_signature or not webhook_secret:
                logger.warning("Assinatura ou secret do webhook não fornecidos")
                return False
            
            # Gerar HMAC SHA256
            expected_signature = hmac.new(
                webhook_secret.encode('utf-8'),
                request_body,
                hashlib.sha256
            ).hexdigest()
            
            # Comparar assinaturas de forma segura
            is_valid = hmac.compare_digest(expected_signature, shopify_signature)
            
            if not is_valid:
                logger.warning(f"Assinatura inválida do webhook. Esperada: {expected_signature}, Recebida: {shopify_signature}")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Erro ao verificar assinatura do webhook: {str(e)}")
            return False
    
    @staticmethod
    def extract_order_data(webhook_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extrai dados relevantes do payload do webhook de pedido
        
        Args:
            webhook_payload: Payload JSON do webhook
            
        Returns:
            Dict com dados extraídos do pedido
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
                'customer_email': webhook_payload.get('email'),
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
        Registra log do webhook recebido
        
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
            
            if success:
                logger.info(f"Webhook processado com sucesso: {json.dumps(log_message)}")
            else:
                logger.error(f"Erro no processamento do webhook: {json.dumps(log_message)}")
                
        except Exception as e:
            logger.error(f"Erro ao criar log do webhook: {str(e)}")
    
    @staticmethod
    def get_shop_config_by_domain(shop_domain: str):
        """
        Busca a configuração da loja pelo domínio
        
        Args:
            shop_domain: Domínio da loja (ex: minha-loja.myshopify.com)
            
        Returns:
            ShopifyConfig ou None se não encontrado
        """
        try:
            from features.processamento.models import ShopifyConfig
            
            # Normalizar domínio (remover protocolo se houver)
            domain = shop_domain.replace('https://', '').replace('http://', '')
            
            # Buscar configuração ativa por shop_url
            config = ShopifyConfig.objects.filter(
                shop_url=domain,
                ativo=True
            ).first()
            
            if not config:
                logger.warning(f"Configuração não encontrada para domínio: {domain}")
            
            return config
            
        except Exception as e:
            logger.error(f"Erro ao buscar configuração da loja: {str(e)}")
            return None