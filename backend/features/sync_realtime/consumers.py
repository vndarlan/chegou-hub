# backend/features/sync_realtime/consumers.py
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from django.contrib.auth import get_user
from django.core.exceptions import PermissionDenied

logger = logging.getLogger(__name__)


class EstoqueRealtimeConsumer(AsyncWebsocketConsumer):
    """
    Consumer WebSocket para notificações de estoque em tempo real
    
    Funcionalidades:
    - Notificações de vendas Shopify processadas
    - Alertas de estoque baixo/zerado
    - Updates de estoque em tempo real
    - Filtros por loja específica
    """
    
    async def connect(self):
        """Conexão WebSocket estabelecida"""
        try:
            # Obter usuário da sessão
            self.user = await self.get_user_from_session()
            
            if not self.user or not self.user.is_authenticated:
                logger.warning("WebSocket: Tentativa de conexão sem autenticação")
                await self.close(code=4001)  # Unauthorized
                return
            
            # Obter parâmetros da query string
            self.loja_id = self.scope.get('query_string', b'').decode('utf-8')
            if self.loja_id.startswith('loja_id='):
                self.loja_id = self.loja_id.split('=')[1]
            else:
                self.loja_id = None
            
            # Definir grupos de notificação
            self.user_group = f"estoque_user_{self.user.id}"
            
            # Adicionar aos grupos
            await self.channel_layer.group_add(self.user_group, self.channel_name)
            
            # Se especificou loja, adicionar ao grupo da loja
            if self.loja_id:
                # Validar acesso à loja
                has_access = await self.validate_store_access(self.user.id, self.loja_id)
                if has_access:
                    self.store_group = f"estoque_loja_{self.loja_id}_user_{self.user.id}"
                    await self.channel_layer.group_add(self.store_group, self.channel_name)
                else:
                    logger.warning(f"WebSocket: Usuário {self.user.id} sem acesso à loja {self.loja_id}")
                    await self.close(code=4003)  # Forbidden
                    return
            
            await self.accept()
            
            # Enviar mensagem de boas-vindas
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'Conectado ao sistema de notificações em tempo real',
                'user_id': self.user.id,
                'loja_id': self.loja_id,
                'timestamp': self.get_timestamp()
            }))
            
            logger.info(f"WebSocket conectado: Usuário {self.user.id}, Loja {self.loja_id}")
            
        except Exception as e:
            logger.error(f"Erro na conexão WebSocket: {str(e)}")
            await self.close(code=4000)
    
    async def disconnect(self, close_code):
        """Desconexão WebSocket"""
        try:
            if hasattr(self, 'user_group'):
                await self.channel_layer.group_discard(self.user_group, self.channel_name)
            
            if hasattr(self, 'store_group'):
                await self.channel_layer.group_discard(self.store_group, self.channel_name)
            
            logger.info(f"WebSocket desconectado: Código {close_code}")
        except Exception as e:
            logger.error(f"Erro na desconexão WebSocket: {str(e)}")
    
    async def receive(self, text_data):
        """Mensagens recebidas do cliente"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                # Responder ping para manter conexão viva
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': self.get_timestamp()
                }))
            
            elif message_type == 'subscribe_store':
                # Subscrever a uma loja específica
                loja_id = data.get('loja_id')
                if loja_id:
                    has_access = await self.validate_store_access(self.user.id, loja_id)
                    if has_access:
                        # Remover grupo anterior se existir
                        if hasattr(self, 'store_group'):
                            await self.channel_layer.group_discard(self.store_group, self.channel_name)
                        
                        # Adicionar novo grupo
                        self.store_group = f"estoque_loja_{loja_id}_user_{self.user.id}"
                        self.loja_id = loja_id
                        await self.channel_layer.group_add(self.store_group, self.channel_name)
                        
                        await self.send(text_data=json.dumps({
                            'type': 'subscription_confirmed',
                            'loja_id': loja_id,
                            'message': f'Inscrito nas notificações da loja {loja_id}'
                        }))
                    else:
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': 'Acesso negado à loja especificada'
                        }))
            
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Formato JSON inválido'
            }))
        except Exception as e:
            logger.error(f"Erro ao processar mensagem WebSocket: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Erro interno'
            }))
    
    # === HANDLERS PARA DIFERENTES TIPOS DE NOTIFICAÇÃO ===
    
    async def venda_shopify_processada(self, event):
        """Notificação de venda processada via webhook"""
        await self.send(text_data=json.dumps({
            'type': 'venda_shopify_processada',
            'data': event['data'],
            'timestamp': self.get_timestamp()
        }))
    
    async def estoque_atualizado(self, event):
        """Notificação de atualização de estoque"""
        await self.send(text_data=json.dumps({
            'type': 'estoque_atualizado',
            'data': event['data'],
            'timestamp': self.get_timestamp()
        }))
    
    async def alerta_estoque_gerado(self, event):
        """Notificação de novo alerta de estoque"""
        await self.send(text_data=json.dumps({
            'type': 'alerta_estoque_gerado',
            'data': event['data'],
            'timestamp': self.get_timestamp()
        }))
    
    async def produto_estoque_zero(self, event):
        """Notificação crítica de estoque zerado"""
        await self.send(text_data=json.dumps({
            'type': 'produto_estoque_zero',
            'data': event['data'],
            'priority': 'critical',
            'timestamp': self.get_timestamp()
        }))
    
    async def erro_processamento_webhook(self, event):
        """Notificação de erro no processamento"""
        await self.send(text_data=json.dumps({
            'type': 'erro_processamento_webhook',
            'data': event['data'],
            'priority': 'high',
            'timestamp': self.get_timestamp()
        }))
    
    # === MÉTODOS AUXILIARES ===
    
    @database_sync_to_async
    def get_user_from_session(self):
        """Obter usuário da sessão Django"""
        try:
            from django.contrib.sessions.models import Session
            from django.contrib.auth import get_user_model
            
            # Obter session key dos headers ou cookies
            session_key = None
            
            # Tentar obter da query string primeiro
            query_string = self.scope.get('query_string', b'').decode('utf-8')
            if 'session_key=' in query_string:
                for param in query_string.split('&'):
                    if param.startswith('session_key='):
                        session_key = param.split('=')[1]
                        break
            
            # Tentar obter dos cookies
            if not session_key:
                cookies = {}
                for header_name, header_value in self.scope.get('headers', []):
                    if header_name == b'cookie':
                        cookie_string = header_value.decode('utf-8')
                        for cookie in cookie_string.split(';'):
                            if '=' in cookie:
                                name, value = cookie.strip().split('=', 1)
                                cookies[name] = value
                        session_key = cookies.get('sessionid')
                        break
            
            if not session_key:
                return None
            
            # Obter usuário da sessão
            try:
                session = Session.objects.get(session_key=session_key)
                user_id = session.get_decoded().get('_auth_user_id')
                if user_id:
                    User = get_user_model()
                    return User.objects.get(id=user_id)
            except (Session.DoesNotExist, User.DoesNotExist):
                return None
                
            return None
            
        except Exception as e:
            logger.error(f"Erro ao obter usuário da sessão WebSocket: {str(e)}")
            return None
    
    @database_sync_to_async
    def validate_store_access(self, user_id, loja_id):
        """Validar se o usuário tem acesso à loja especificada"""
        try:
            from features.processamento.models import ShopifyConfig
            
            return ShopifyConfig.objects.filter(
                id=loja_id,
                user_id=user_id,
                ativo=True
            ).exists()
        except Exception as e:
            logger.error(f"Erro ao validar acesso à loja: {str(e)}")
            return False
    
    def get_timestamp(self):
        """Obter timestamp atual em formato ISO"""
        from django.utils import timezone
        return timezone.now().isoformat()


class NotificacoesGeraisConsumer(AsyncWebsocketConsumer):
    """
    Consumer para notificações gerais do sistema (não específicas de estoque)
    """
    
    async def connect(self):
        """Conexão WebSocket estabelecida"""
        self.user = await self.get_user_from_session()
        
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        
        # Grupo geral de notificações do usuário
        self.notification_group = f"notifications_user_{self.user.id}"
        await self.channel_layer.group_add(self.notification_group, self.channel_name)
        
        await self.accept()
        
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Conectado ao sistema de notificações gerais',
            'user_id': self.user.id
        }))
    
    async def disconnect(self, close_code):
        """Desconexão WebSocket"""
        if hasattr(self, 'notification_group'):
            await self.channel_layer.group_discard(self.notification_group, self.channel_name)
    
    async def receive(self, text_data):
        """Mensagens recebidas do cliente"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': self.get_timestamp()
                }))
                
        except Exception as e:
            logger.error(f"Erro no consumer de notificações gerais: {str(e)}")
    
    # === HANDLERS PARA NOTIFICAÇÕES GERAIS ===
    
    async def system_notification(self, event):
        """Notificação geral do sistema"""
        await self.send(text_data=json.dumps({
            'type': 'system_notification',
            'data': event['data'],
            'timestamp': self.get_timestamp()
        }))
    
    async def webhook_status_change(self, event):
        """Notificação de mudança de status de webhook"""
        await self.send(text_data=json.dumps({
            'type': 'webhook_status_change',
            'data': event['data'],
            'timestamp': self.get_timestamp()
        }))
    
    @database_sync_to_async
    def get_user_from_session(self):
        """Método auxiliar para obter usuário (mesmo que no EstoqueRealtimeConsumer)"""
        # Implementação idêntica ao EstoqueRealtimeConsumer
        try:
            from django.contrib.sessions.models import Session
            from django.contrib.auth import get_user_model
            
            session_key = None
            query_string = self.scope.get('query_string', b'').decode('utf-8')
            if 'session_key=' in query_string:
                for param in query_string.split('&'):
                    if param.startswith('session_key='):
                        session_key = param.split('=')[1]
                        break
            
            if not session_key:
                cookies = {}
                for header_name, header_value in self.scope.get('headers', []):
                    if header_name == b'cookie':
                        cookie_string = header_value.decode('utf-8')
                        for cookie in cookie_string.split(';'):
                            if '=' in cookie:
                                name, value = cookie.strip().split('=', 1)
                                cookies[name] = value
                        session_key = cookies.get('sessionid')
                        break
            
            if not session_key:
                return None
            
            try:
                session = Session.objects.get(session_key=session_key)
                user_id = session.get_decoded().get('_auth_user_id')
                if user_id:
                    User = get_user_model()
                    return User.objects.get(id=user_id)
            except (Session.DoesNotExist, User.DoesNotExist):
                return None
                
            return None
            
        except Exception as e:
            logger.error(f"Erro ao obter usuário da sessão WebSocket: {str(e)}")
            return None
    
    def get_timestamp(self):
        """Obter timestamp atual em formato ISO"""
        from django.utils import timezone
        return timezone.now().isoformat()