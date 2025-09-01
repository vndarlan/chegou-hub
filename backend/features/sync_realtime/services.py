# backend/features/sync_realtime/services.py
import logging
import asyncio
from typing import Dict, Any, List, Optional
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.auth.models import User
from django.utils import timezone

logger = logging.getLogger(__name__)


class RealtimeNotificationService:
    """
    Serviço central para envio de notificações em tempo real via WebSockets
    """
    
    def __init__(self):
        self.channel_layer = get_channel_layer()
    
    # === NOTIFICAÇÕES DE ESTOQUE ===
    
    def notify_venda_shopify_processada(self, user: User, loja_config, order_data: Dict[str, Any], 
                                       result: Dict[str, Any]) -> bool:
        """
        Notifica que uma venda Shopify foi processada
        
        Args:
            user: Usuário proprietário da loja
            loja_config: Configuração da loja Shopify
            order_data: Dados do pedido
            result: Resultado do processamento
        """
        try:
            notification_data = {
                'order_number': order_data.get('order_number'),
                'shopify_order_id': order_data.get('shopify_order_id'),
                'total_price': order_data.get('total_price'),
                'currency': order_data.get('currency'),
                'customer_email': self._mask_email(order_data.get('customer_email', '')),
                'loja_nome': loja_config.nome_loja,
                'loja_id': loja_config.id,
                'items_processados': result.get('items_processados', 0),
                'items_com_erro': result.get('items_com_erro', 0),
                'success': result.get('success', False),
                'message': result.get('message', ''),
                'alertas_gerados': len(result.get('alertas_gerados', [])),
                'processed_at': timezone.now().isoformat()
            }
            
            # Enviar para grupo do usuário
            self._send_to_user_group(
                user.id, 
                'venda_shopify_processada', 
                notification_data
            )
            
            # Enviar para grupo específico da loja
            self._send_to_store_group(
                loja_config.id, 
                user.id, 
                'venda_shopify_processada', 
                notification_data
            )
            
            logger.info(f"Notificação de venda enviada: Pedido {order_data.get('order_number')} da loja {loja_config.nome_loja}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao enviar notificação de venda: {str(e)}")
            return False
    
    def notify_estoque_atualizado(self, produto, quantidade_anterior: int, 
                                 tipo_movimento: str, observacao: str = "") -> bool:
        """
        Notifica atualização de estoque de um produto
        
        Args:
            produto: Instância de ProdutoEstoque
            quantidade_anterior: Quantidade anterior do estoque
            tipo_movimento: Tipo da movimentação
            observacao: Observação da movimentação
        """
        try:
            notification_data = {
                'produto_id': produto.id,
                'sku': produto.sku,
                'nome_produto': produto.nome,
                'loja_nome': produto.loja_config.nome_loja,
                'loja_id': produto.loja_config.id,
                'estoque_anterior': quantidade_anterior,
                'estoque_atual': produto.estoque_atual,
                'diferenca': produto.estoque_atual - quantidade_anterior,
                'tipo_movimento': tipo_movimento,
                'observacao': observacao,
                'estoque_baixo': produto.estoque_baixo,
                'estoque_disponivel': produto.estoque_disponivel,
                'updated_at': timezone.now().isoformat()
            }
            
            # Enviar para usuário proprietário
            self._send_to_user_group(
                produto.user.id, 
                'estoque_atualizado', 
                notification_data
            )
            
            # Enviar para grupo da loja
            self._send_to_store_group(
                produto.loja_config.id, 
                produto.user.id, 
                'estoque_atualizado', 
                notification_data
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Erro ao enviar notificação de estoque atualizado: {str(e)}")
            return False
    
    def notify_alerta_estoque_gerado(self, alerta) -> bool:
        """
        Notifica que um novo alerta de estoque foi gerado
        
        Args:
            alerta: Instância de AlertaEstoque
        """
        try:
            notification_data = {
                'alerta_id': alerta.id,
                'tipo_alerta': alerta.tipo_alerta,
                'prioridade': alerta.prioridade,
                'titulo': alerta.titulo,
                'descricao': alerta.descricao,
                'produto_sku': alerta.produto.sku,
                'produto_nome': alerta.produto.nome,
                'loja_nome': alerta.produto.loja_config.nome_loja,
                'loja_id': alerta.produto.loja_config.id,
                'valor_atual': alerta.valor_atual,
                'valor_limite': alerta.valor_limite,
                'acao_sugerida': alerta.acao_sugerida,
                'pode_resolver_automaticamente': alerta.pode_resolver_automaticamente,
                'created_at': alerta.data_criacao.isoformat()
            }
            
            # Definir prioridade da notificação baseada na prioridade do alerta
            event_type = 'alerta_estoque_gerado'
            if alerta.tipo_alerta == 'estoque_zero':
                event_type = 'produto_estoque_zero'  # Evento especial para estoque zero
            
            # Enviar para usuário proprietário
            self._send_to_user_group(
                alerta.produto.user.id, 
                event_type, 
                notification_data
            )
            
            # Enviar para grupo da loja
            self._send_to_store_group(
                alerta.produto.loja_config.id, 
                alerta.produto.user.id, 
                event_type, 
                notification_data
            )
            
            logger.info(f"Notificação de alerta enviada: {alerta.tipo_alerta} para produto {alerta.produto.sku}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao enviar notificação de alerta: {str(e)}")
            return False
    
    def notify_erro_processamento_webhook(self, user: User, loja_config, 
                                        error_details: Dict[str, Any]) -> bool:
        """
        Notifica erro no processamento de webhook
        
        Args:
            user: Usuário proprietário da loja
            loja_config: Configuração da loja
            error_details: Detalhes do erro
        """
        try:
            notification_data = {
                'loja_nome': loja_config.nome_loja,
                'loja_id': loja_config.id,
                'error_type': error_details.get('error_type', 'unknown'),
                'error_message': error_details.get('error_message', ''),
                'order_number': error_details.get('order_number'),
                'shopify_order_id': error_details.get('shopify_order_id'),
                'webhook_topic': error_details.get('webhook_topic', ''),
                'occurred_at': timezone.now().isoformat(),
                'suggested_action': error_details.get('suggested_action', 'Verifique as configurações da loja')
            }
            
            # Enviar para usuário
            self._send_to_user_group(
                user.id, 
                'erro_processamento_webhook', 
                notification_data
            )
            
            # Enviar para grupo da loja
            self._send_to_store_group(
                loja_config.id, 
                user.id, 
                'erro_processamento_webhook', 
                notification_data
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Erro ao enviar notificação de erro webhook: {str(e)}")
            return False
    
    # === NOTIFICAÇÕES GERAIS ===
    
    def notify_system_message(self, user: User, message: str, priority: str = 'info') -> bool:
        """
        Envia notificação geral do sistema para um usuário
        
        Args:
            user: Usuário destinatário
            message: Mensagem a ser enviada
            priority: Prioridade (info, warning, error, success)
        """
        try:
            notification_data = {
                'message': message,
                'priority': priority,
                'sent_at': timezone.now().isoformat()
            }
            
            if self.channel_layer:
                async_to_sync(self.channel_layer.group_send)(
                    f"notifications_user_{user.id}",
                    {
                        'type': 'system_notification',
                        'data': notification_data
                    }
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Erro ao enviar notificação do sistema: {str(e)}")
            return False
    
    def notify_webhook_status_change(self, user: User, loja_config, 
                                   old_status: str, new_status: str) -> bool:
        """
        Notifica mudança de status de webhook
        
        Args:
            user: Usuário proprietário
            loja_config: Configuração da loja
            old_status: Status anterior
            new_status: Novo status
        """
        try:
            notification_data = {
                'loja_nome': loja_config.nome_loja,
                'loja_id': loja_config.id,
                'old_status': old_status,
                'new_status': new_status,
                'changed_at': timezone.now().isoformat()
            }
            
            if self.channel_layer:
                async_to_sync(self.channel_layer.group_send)(
                    f"notifications_user_{user.id}",
                    {
                        'type': 'webhook_status_change',
                        'data': notification_data
                    }
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Erro ao notificar mudança de status webhook: {str(e)}")
            return False
    
    # === MÉTODOS AUXILIARES ===
    
    def _send_to_user_group(self, user_id: int, event_type: str, data: Dict[str, Any]):
        """Enviar notificação para grupo do usuário"""
        if self.channel_layer:
            async_to_sync(self.channel_layer.group_send)(
                f"estoque_user_{user_id}",
                {
                    'type': event_type,
                    'data': data
                }
            )
    
    def _send_to_store_group(self, loja_id: int, user_id: int, 
                           event_type: str, data: Dict[str, Any]):
        """Enviar notificação para grupo específico da loja"""
        if self.channel_layer:
            async_to_sync(self.channel_layer.group_send)(
                f"estoque_loja_{loja_id}_user_{user_id}",
                {
                    'type': event_type,
                    'data': data
                }
            )
    
    def _mask_email(self, email: str) -> str:
        """Mascarar email para logs seguros"""
        if not email or '@' not in email:
            return 'N/A'
        
        local, domain = email.split('@')
        if len(local) <= 2:
            masked_local = '*' * len(local)
        else:
            masked_local = local[0] + '*' * (len(local) - 2) + local[-1]
        
        return f"{masked_local}@{domain}"
    
    def is_available(self) -> bool:
        """Verificar se o serviço de notificações está disponível"""
        return self.channel_layer is not None


# === INSTÂNCIA SINGLETON ===

# Criar instância global do serviço
realtime_service = RealtimeNotificationService()


# === FUNÇÕES DE CONVENIÊNCIA ===

def notify_venda_shopify(user: User, loja_config, order_data: Dict[str, Any], 
                        result: Dict[str, Any]) -> bool:
    """Função de conveniência para notificar venda Shopify processada"""
    return realtime_service.notify_venda_shopify_processada(user, loja_config, order_data, result)


def notify_estoque_update(produto, quantidade_anterior: int, 
                         tipo_movimento: str, observacao: str = "") -> bool:
    """Função de conveniência para notificar atualização de estoque"""
    return realtime_service.notify_estoque_atualizado(produto, quantidade_anterior, tipo_movimento, observacao)


def notify_alerta_gerado(alerta) -> bool:
    """Função de conveniência para notificar alerta gerado"""
    return realtime_service.notify_alerta_estoque_gerado(alerta)


def notify_webhook_error(user: User, loja_config, error_details: Dict[str, Any]) -> bool:
    """Função de conveniência para notificar erro de webhook"""
    return realtime_service.notify_erro_processamento_webhook(user, loja_config, error_details)


def notify_system(user: User, message: str, priority: str = 'info') -> bool:
    """Função de conveniência para notificação do sistema"""
    return realtime_service.notify_system_message(user, message, priority)