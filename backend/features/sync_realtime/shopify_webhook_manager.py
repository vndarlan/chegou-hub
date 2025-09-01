# backend/features/sync_realtime/shopify_webhook_manager.py
import logging
import requests
import json
from typing import Dict, Any, List, Optional, Tuple
from django.conf import settings
from django.utils import timezone
from features.processamento.models import ShopifyConfig

logger = logging.getLogger(__name__)


class ShopifyWebhookManager:
    """
    Gerenciador para configuração automática de webhooks nas lojas Shopify
    """
    
    # Webhooks necessários para sincronização de estoque
    REQUIRED_WEBHOOKS = [
        {
            'topic': 'orders/paid',
            'format': 'json',
            'api_version': '2024-07'
        },
        {
            'topic': 'orders/cancelled', 
            'format': 'json',
            'api_version': '2024-07'
        },
        {
            'topic': 'orders/refunded',
            'format': 'json', 
            'api_version': '2024-07'
        }
    ]
    
    def __init__(self, loja_config: ShopifyConfig):
        self.loja_config = loja_config
        self.shop_url = loja_config.shop_url
        self.access_token = loja_config.access_token
        self.api_version = loja_config.api_version or '2024-07'
        self.base_url = f"https://{self.shop_url}/admin/api/{self.api_version}"
        
        # Headers para requisições
        self.headers = {
            'X-Shopify-Access-Token': self.access_token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    
    def configure_all_webhooks(self, webhook_endpoint_url: str) -> Dict[str, Any]:
        """
        Configura todos os webhooks necessários na loja Shopify
        
        Args:
            webhook_endpoint_url: URL completa do endpoint webhook do ChegouHub
            
        Returns:
            Dict com resultado da configuração
        """
        result = {
            'success': True,
            'webhooks_configured': [],
            'webhooks_failed': [],
            'existing_webhooks': [],
            'total_configured': 0,
            'total_failed': 0,
            'messages': []
        }
        
        try:
            # Primeiro, listar webhooks existentes
            existing_webhooks = self.list_existing_webhooks()
            result['existing_webhooks'] = existing_webhooks
            
            # Configurar cada webhook necessário
            for webhook_config in self.REQUIRED_WEBHOOKS:
                topic = webhook_config['topic']
                
                # Verificar se webhook já existe
                existing_webhook = self._find_existing_webhook(existing_webhooks, topic, webhook_endpoint_url)
                
                if existing_webhook:
                    result['messages'].append(f"Webhook {topic} já configurado (ID: {existing_webhook['id']})")
                    result['webhooks_configured'].append({
                        'topic': topic,
                        'id': existing_webhook['id'],
                        'status': 'already_exists',
                        'address': existing_webhook['address']
                    })
                else:
                    # Criar novo webhook
                    webhook_result = self.create_webhook(
                        topic=topic,
                        address=webhook_endpoint_url,
                        format=webhook_config['format']
                    )
                    
                    if webhook_result['success']:
                        result['webhooks_configured'].append({
                            'topic': topic,
                            'id': webhook_result['webhook_id'],
                            'status': 'created',
                            'address': webhook_endpoint_url
                        })
                        result['messages'].append(f"Webhook {topic} criado com sucesso")
                        result['total_configured'] += 1
                    else:
                        result['webhooks_failed'].append({
                            'topic': topic,
                            'error': webhook_result['error']
                        })
                        result['messages'].append(f"Erro ao criar webhook {topic}: {webhook_result['error']}")
                        result['total_failed'] += 1
            
            # Definir sucesso geral
            result['success'] = result['total_failed'] == 0
            
            # Atualizar configuração da loja
            if result['success']:
                self._update_loja_webhook_status(True, "Webhooks configurados com sucesso")
            else:
                self._update_loja_webhook_status(False, f"Alguns webhooks falharam: {result['total_failed']} erros")
            
            logger.info(f"Configuração de webhooks concluída para loja {self.loja_config.nome_loja}: {result['total_configured']} sucessos, {result['total_failed']} falhas")
            
            return result
            
        except Exception as e:
            error_msg = f"Erro geral na configuração de webhooks: {str(e)}"
            logger.error(error_msg)
            result['success'] = False
            result['messages'].append(error_msg)
            self._update_loja_webhook_status(False, error_msg)
            return result
    
    def create_webhook(self, topic: str, address: str, format: str = 'json') -> Dict[str, Any]:
        """
        Cria um webhook individual na loja Shopify
        
        Args:
            topic: Tópico do webhook (ex: 'orders/paid')
            address: URL do endpoint
            format: Formato do webhook (json)
            
        Returns:
            Dict com resultado da criação
        """
        try:
            webhook_data = {
                'webhook': {
                    'topic': topic,
                    'address': address,
                    'format': format
                }
            }
            
            # Se temos webhook_secret configurado, usar para validação HMAC
            if hasattr(self.loja_config, 'webhook_secret') and self.loja_config.webhook_secret:
                # Shopify não aceita secret no create, mas podemos documentar
                logger.info(f"Webhook secret configurado para validação HMAC: loja {self.loja_config.nome_loja}")
            
            response = requests.post(
                f"{self.base_url}/webhooks.json",
                headers=self.headers,
                data=json.dumps(webhook_data),
                timeout=30
            )
            
            if response.status_code == 201:
                webhook = response.json()['webhook']
                return {
                    'success': True,
                    'webhook_id': webhook['id'],
                    'topic': webhook['topic'],
                    'address': webhook['address'],
                    'created_at': webhook['created_at']
                }
            elif response.status_code == 422:
                # Erro de validação
                errors = response.json().get('errors', {})
                error_msg = f"Erro de validação: {errors}"
                return {'success': False, 'error': error_msg}
            else:
                error_msg = f"Erro HTTP {response.status_code}: {response.text}"
                return {'success': False, 'error': error_msg}
                
        except requests.RequestException as e:
            error_msg = f"Erro de conexão: {str(e)}"
            logger.error(f"Erro ao criar webhook {topic}: {error_msg}")
            return {'success': False, 'error': error_msg}
        except Exception as e:
            error_msg = f"Erro inesperado: {str(e)}"
            logger.error(f"Erro ao criar webhook {topic}: {error_msg}")
            return {'success': False, 'error': error_msg}
    
    def list_existing_webhooks(self) -> List[Dict[str, Any]]:
        """
        Lista todos os webhooks existentes na loja
        
        Returns:
            Lista de webhooks existentes
        """
        try:
            response = requests.get(
                f"{self.base_url}/webhooks.json",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                webhooks = response.json().get('webhooks', [])
                logger.info(f"Encontrados {len(webhooks)} webhooks na loja {self.loja_config.nome_loja}")
                return webhooks
            else:
                logger.error(f"Erro ao listar webhooks: HTTP {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Erro ao listar webhooks existentes: {str(e)}")
            return []
    
    def delete_webhook(self, webhook_id: int) -> bool:
        """
        Remove um webhook da loja
        
        Args:
            webhook_id: ID do webhook a ser removido
            
        Returns:
            True se removido com sucesso
        """
        try:
            response = requests.delete(
                f"{self.base_url}/webhooks/{webhook_id}.json",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info(f"Webhook {webhook_id} removido com sucesso da loja {self.loja_config.nome_loja}")
                return True
            else:
                logger.error(f"Erro ao remover webhook {webhook_id}: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Erro ao remover webhook {webhook_id}: {str(e)}")
            return False
    
    def update_webhook(self, webhook_id: int, new_address: str) -> Dict[str, Any]:
        """
        Atualiza a URL de um webhook existente
        
        Args:
            webhook_id: ID do webhook
            new_address: Nova URL
            
        Returns:
            Dict com resultado da atualização
        """
        try:
            webhook_data = {
                'webhook': {
                    'id': webhook_id,
                    'address': new_address
                }
            }
            
            response = requests.put(
                f"{self.base_url}/webhooks/{webhook_id}.json",
                headers=self.headers,
                data=json.dumps(webhook_data),
                timeout=30
            )
            
            if response.status_code == 200:
                webhook = response.json()['webhook']
                return {
                    'success': True,
                    'webhook_id': webhook['id'],
                    'new_address': webhook['address'],
                    'updated_at': webhook['updated_at']
                }
            else:
                error_msg = f"Erro HTTP {response.status_code}: {response.text}"
                return {'success': False, 'error': error_msg}
                
        except Exception as e:
            error_msg = f"Erro ao atualizar webhook: {str(e)}"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}
    
    def test_webhook_connectivity(self) -> Dict[str, Any]:
        """
        Testa a conectividade com a API Shopify
        
        Returns:
            Dict com resultado do teste
        """
        try:
            # Tentar buscar informações da loja
            response = requests.get(
                f"{self.base_url}/shop.json",
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                shop_data = response.json()['shop']
                return {
                    'success': True,
                    'shop_name': shop_data.get('name'),
                    'shop_domain': shop_data.get('domain'),
                    'plan_name': shop_data.get('plan_name'),
                    'api_version': self.api_version
                }
            else:
                return {
                    'success': False,
                    'error': f"HTTP {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f"Erro de conectividade: {str(e)}"
            }
    
    def cleanup_old_webhooks(self, webhook_endpoint_base: str) -> Dict[str, Any]:
        """
        Remove webhooks antigos que apontam para endpoints do ChegouHub
        
        Args:
            webhook_endpoint_base: Base URL dos endpoints (ex: "https://api.chegouhub.com")
            
        Returns:
            Dict com resultado da limpeza
        """
        result = {
            'success': True,
            'webhooks_removed': [],
            'total_removed': 0,
            'messages': []
        }
        
        try:
            existing_webhooks = self.list_existing_webhooks()
            
            for webhook in existing_webhooks:
                webhook_address = webhook.get('address', '')
                
                # Verificar se é um webhook do ChegouHub
                if webhook_endpoint_base in webhook_address:
                    # Verificar se é um webhook dos tópicos que gerenciamos
                    topic = webhook.get('topic')
                    required_topics = [w['topic'] for w in self.REQUIRED_WEBHOOKS]
                    
                    if topic in required_topics:
                        if self.delete_webhook(webhook['id']):
                            result['webhooks_removed'].append({
                                'id': webhook['id'],
                                'topic': topic,
                                'address': webhook_address
                            })
                            result['total_removed'] += 1
                            result['messages'].append(f"Webhook antigo removido: {topic}")
            
            logger.info(f"Limpeza concluída para loja {self.loja_config.nome_loja}: {result['total_removed']} webhooks removidos")
            
            return result
            
        except Exception as e:
            error_msg = f"Erro na limpeza de webhooks: {str(e)}"
            logger.error(error_msg)
            result['success'] = False
            result['messages'].append(error_msg)
            return result
    
    # === MÉTODOS AUXILIARES ===
    
    def _find_existing_webhook(self, webhooks: List[Dict], topic: str, address: str) -> Optional[Dict]:
        """Encontrar webhook existente por tópico e endereço"""
        for webhook in webhooks:
            if webhook.get('topic') == topic and webhook.get('address') == address:
                return webhook
        return None
    
    def _update_loja_webhook_status(self, success: bool, message: str):
        """Atualizar status do webhook na configuração da loja"""
        try:
            # Aqui podemos adicionar campos à model ShopifyConfig para rastrear status dos webhooks
            # Por enquanto, apenas log
            logger.info(f"Status webhook loja {self.loja_config.nome_loja}: {'OK' if success else 'ERRO'} - {message}")
        except Exception as e:
            logger.error(f"Erro ao atualizar status webhook: {str(e)}")


class WebhookBulkManager:
    """
    Gerenciador para configuração em lote de webhooks em múltiplas lojas
    """
    
    @staticmethod
    def configure_webhooks_for_user(user, webhook_endpoint_url: str) -> Dict[str, Any]:
        """
        Configura webhooks para todas as lojas ativas de um usuário
        
        Args:
            user: Usuário Django
            webhook_endpoint_url: URL do endpoint webhook
            
        Returns:
            Dict com resultado geral
        """
        result = {
            'success': True,
            'total_stores': 0,
            'stores_configured': 0,
            'stores_failed': 0,
            'details': []
        }
        
        try:
            # Buscar lojas ativas do usuário
            lojas = ShopifyConfig.objects.filter(user=user, ativo=True)
            result['total_stores'] = lojas.count()
            
            if result['total_stores'] == 0:
                result['success'] = False
                result['message'] = "Nenhuma loja ativa encontrada para o usuário"
                return result
            
            # Configurar webhooks para cada loja
            for loja in lojas:
                try:
                    manager = ShopifyWebhookManager(loja)
                    
                    # Testar conectividade primeiro
                    connectivity_test = manager.test_webhook_connectivity()
                    
                    if not connectivity_test['success']:
                        result['stores_failed'] += 1
                        result['details'].append({
                            'loja_id': loja.id,
                            'loja_nome': loja.nome_loja,
                            'success': False,
                            'error': f"Falha na conectividade: {connectivity_test['error']}"
                        })
                        continue
                    
                    # Configurar webhooks
                    webhook_result = manager.configure_all_webhooks(webhook_endpoint_url)
                    
                    if webhook_result['success']:
                        result['stores_configured'] += 1
                    else:
                        result['stores_failed'] += 1
                    
                    result['details'].append({
                        'loja_id': loja.id,
                        'loja_nome': loja.nome_loja,
                        'success': webhook_result['success'],
                        'webhooks_configured': webhook_result.get('total_configured', 0),
                        'webhooks_failed': webhook_result.get('total_failed', 0),
                        'messages': webhook_result.get('messages', [])
                    })
                    
                except Exception as e:
                    result['stores_failed'] += 1
                    result['details'].append({
                        'loja_id': loja.id,
                        'loja_nome': loja.nome_loja,
                        'success': False,
                        'error': str(e)
                    })
                    logger.error(f"Erro ao configurar webhooks para loja {loja.nome_loja}: {str(e)}")
            
            # Definir sucesso geral
            result['success'] = result['stores_failed'] == 0
            
            logger.info(f"Configuração em lote concluída para usuário {user.username}: {result['stores_configured']} sucessos, {result['stores_failed']} falhas")
            
            return result
            
        except Exception as e:
            logger.error(f"Erro na configuração em lote de webhooks: {str(e)}")
            result['success'] = False
            result['error'] = str(e)
            return result
    
    @staticmethod
    def generate_webhook_endpoint_url(base_domain: str) -> str:
        """
        Gera a URL completa do endpoint webhook
        
        Args:
            base_domain: Domínio base (ex: "https://api.chegouhub.com")
            
        Returns:
            URL completa do webhook
        """
        # Remove barra final se existir
        base_domain = base_domain.rstrip('/')
        
        # Adicionar caminho do webhook
        return f"{base_domain}/api/estoque/webhook/order-created/"