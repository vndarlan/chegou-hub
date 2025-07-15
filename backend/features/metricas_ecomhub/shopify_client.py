# backend/features/metricas_ecomhub/shopify_client.py - CORREÇÃO DA BUSCA
import requests
from django.utils import timezone
from .models import CacheProdutoShopify
from .config import get_shopify_config
import logging

logger = logging.getLogger(__name__)

class ShopifyClient:
    """Cliente para interagir com API Shopify"""
    
    def __init__(self, loja_shopify):
        self.loja = loja_shopify
        self.domain = loja_shopify.shopify_domain
        self.access_token = loja_shopify.decrypt_token()
        self.api_version = loja_shopify.api_version
        self.base_url = f"https://{self.domain}/admin/api/{self.api_version}"
        
        # Carregar configurações
        self.config = get_shopify_config()
        
        if not self.access_token:
            raise ValueError("Access token inválido ou não descriptografado")
    
    def _make_request(self, endpoint, method='GET', params=None):
        """Faz requisição à API Shopify"""
        url = f"{self.base_url}/{endpoint}"
        headers = {
            'X-Shopify-Access-Token': self.access_token,
            'Content-Type': 'application/json'
        }
        
        try:
            timeout = self.config['timeout']
            
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=timeout)
            else:
                response = requests.request(method, url, headers=headers, json=params, timeout=timeout)
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro na requisição Shopify: {e}")
            raise Exception(f"Erro ao conectar com Shopify: {str(e)}")
    
    def get_shop_info(self):
        """Obtém informações da loja para teste de conexão"""
        try:
            data = self._make_request('shop.json')
            return data.get('shop', {})
        except Exception as e:
            raise Exception(f"Falha ao obter informações da loja: {str(e)}")
    
    def get_order_by_number(self, order_number):
        """Busca pedido pelo número - VERSÃO CORRIGIDA"""
        try:
            # Primeiro tenta buscar no cache
            cache_entry = CacheProdutoShopify.objects.filter(
                loja_shopify=self.loja,
                order_number=str(order_number)
            ).first()
            
            if cache_entry:
                logger.info(f"Produto encontrado no cache para pedido #{order_number}")
                return {
                    'produto_nome': cache_entry.produto_nome,
                    'produto_id': cache_entry.produto_id,
                    'variant_id': cache_entry.variant_id,
                    'sku': cache_entry.sku,
                    'from_cache': True
                }
            
            # Se não está no cache, busca na API usando diferentes estratégias
            logger.info(f"Buscando pedido #{order_number} na API Shopify")
            
            # Estratégia 1: Buscar por nome do pedido
            params = {
                'name': f"#{order_number}",
                'limit': 1,
                'fields': 'id,name,line_items',
                'status': 'any'
            }
            
            data = self._make_request('orders.json', params=params)
            orders = data.get('orders', [])
            
            # Estratégia 2: Se não encontrou, buscar sem #
            if not orders:
                logger.info(f"Tentando buscar pedido {order_number} sem #")
                params['name'] = str(order_number)
                data = self._make_request('orders.json', params=params)
                orders = data.get('orders', [])
            
            # Estratégia 3: Se ainda não encontrou, buscar por order_number field
            if not orders:
                logger.info(f"Tentando buscar pedido {order_number} por order_number")
                params = {
                    'order_number': str(order_number),
                    'limit': 1,
                    'fields': 'id,name,line_items,order_number',
                    'status': 'any'
                }
                data = self._make_request('orders.json', params=params)
                orders = data.get('orders', [])
            
            if not orders:
                logger.warning(f"Pedido #{order_number} não encontrado em nenhuma estratégia")
                return None
            
            order = orders[0]
            logger.info(f"Pedido encontrado: {order.get('name', 'N/A')} (ID: {order.get('id', 'N/A')})")
            
            line_items = order.get('line_items', [])
            
            if not line_items:
                logger.warning(f"Pedido #{order_number} sem produtos")
                return None
            
            # Pega o primeiro produto
            first_item = line_items[0]
            
            produto_info = {
                'produto_nome': first_item.get('name', 'Produto Desconhecido'),
                'produto_id': str(first_item.get('product_id', '')),
                'variant_id': str(first_item.get('variant_id', '')),
                'sku': first_item.get('sku', ''),
                'from_cache': False
            }
            
            logger.info(f"Produto encontrado: {produto_info['produto_nome']}")
            
            # Salva no cache
            try:
                CacheProdutoShopify.objects.update_or_create(
                    loja_shopify=self.loja,
                    order_number=str(order_number),
                    defaults={
                        'produto_nome': produto_info['produto_nome'],
                        'produto_id': produto_info['produto_id'],
                        'variant_id': produto_info['variant_id'],
                        'sku': produto_info['sku']
                    }
                )
                logger.info(f"Produto salvo no cache para pedido #{order_number}")
            except Exception as cache_error:
                logger.error(f"Erro ao salvar no cache: {cache_error}")
            
            return produto_info
            
        except Exception as e:
            logger.error(f"Erro ao buscar pedido #{order_number}: {e}")
            return None
    
    def get_orders_batch(self, order_numbers):
        """Busca múltiplos pedidos de uma vez - VERSÃO CORRIGIDA"""
        results = {}
        
        # Primeiro verifica cache
        cached_orders = CacheProdutoShopify.objects.filter(
            loja_shopify=self.loja,
            order_number__in=[str(num) for num in order_numbers]
        )
        
        for cache_entry in cached_orders:
            results[cache_entry.order_number] = {
                'produto_nome': cache_entry.produto_nome,
                'produto_id': cache_entry.produto_id,
                'variant_id': cache_entry.variant_id,
                'sku': cache_entry.sku,
                'from_cache': True
            }
        
        # Busca os que não estão em cache individualmente
        missing_orders = [num for num in order_numbers if str(num) not in results]
        
        logger.info(f"Cache: {len(results)} encontrados, {len(missing_orders)} para buscar na API")
        
        if missing_orders:
            for order_number in missing_orders:
                logger.info(f"Buscando individualmente pedido #{order_number}")
                produto_info = self.get_order_by_number(order_number)
                
                if produto_info:
                    results[str(order_number)] = produto_info
                else:
                    logger.warning(f"Pedido #{order_number} não encontrado")
        
        logger.info(f"Total de produtos encontrados: {len(results)}")
        return results
    
    def clear_cache(self):
        """Limpa cache de produtos desta loja"""
        deleted_count = CacheProdutoShopify.objects.filter(loja_shopify=self.loja).delete()[0]
        logger.info(f"Cache limpo: {deleted_count} entradas removidas")
        return deleted_count