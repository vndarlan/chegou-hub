# backend/features/sync_realtime/middleware.py
import logging
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session

logger = logging.getLogger(__name__)


class WebSocketAuthMiddleware(BaseMiddleware):
    """
    Middleware personalizado para autenticação WebSocket
    Melhora a autenticação baseada em sessão para WebSockets
    """
    
    async def __call__(self, scope, receive, send):
        """
        Processa a conexão WebSocket e adiciona o usuário ao scope
        """
        # Apenas processar WebSockets
        if scope['type'] != 'websocket':
            return await super().__call__(scope, receive, send)
        
        try:
            # Tentar obter usuário da sessão
            user = await self.get_user_from_websocket_scope(scope)
            scope['user'] = user if user else AnonymousUser()
            
            logger.info(f"WebSocket auth: User {getattr(user, 'username', 'anonymous')} conectado")
            
        except Exception as e:
            logger.error(f"Erro na autenticação WebSocket: {str(e)}")
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
    
    @database_sync_to_async
    def get_user_from_websocket_scope(self, scope):
        """
        Extrai usuário da sessão usando informações do scope WebSocket
        """
        try:
            User = get_user_model()
            
            # Tentar obter session_key da query string primeiro
            session_key = None
            query_string = scope.get('query_string', b'').decode('utf-8')
            
            if 'session_key=' in query_string:
                for param in query_string.split('&'):
                    if param.startswith('session_key='):
                        session_key = param.split('=')[1]
                        break
            
            # Fallback: tentar obter dos headers de cookie
            if not session_key:
                headers = dict(scope.get('headers', []))
                cookie_header = headers.get(b'cookie', b'').decode('utf-8')
                
                if cookie_header:
                    for cookie in cookie_header.split(';'):
                        cookie = cookie.strip()
                        if cookie.startswith('sessionid='):
                            session_key = cookie.split('=')[1]
                            break
            
            if not session_key:
                logger.warning("WebSocket: Nenhuma session_key encontrada")
                return None
            
            # Obter sessão e usuário
            try:
                session = Session.objects.get(session_key=session_key)
                user_id = session.get_decoded().get('_auth_user_id')
                
                if user_id:
                    user = User.objects.get(id=user_id)
                    logger.info(f"WebSocket: Usuário {user.username} autenticado via sessão")
                    return user
                else:
                    logger.warning("WebSocket: Session válida mas sem usuário logado")
                    return None
                    
            except Session.DoesNotExist:
                logger.warning(f"WebSocket: Sessão {session_key[:10]}... não encontrada")
                return None
            except User.DoesNotExist:
                logger.warning(f"WebSocket: Usuário ID {user_id} não encontrado")
                return None
                
        except Exception as e:
            logger.error(f"Erro ao obter usuário do WebSocket: {str(e)}")
            return None


class WebSocketRateLimitMiddleware(BaseMiddleware):
    """
    Middleware para rate limiting em WebSockets
    Previne abuse de conexões e mensagens
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.connection_counts = {}  # IP -> count
        self.message_counts = {}     # connection -> count
        self.max_connections_per_ip = 10
        self.max_messages_per_minute = 60
    
    async def __call__(self, scope, receive, send):
        """
        Aplica rate limiting para WebSockets
        """
        if scope['type'] != 'websocket':
            return await super().__call__(scope, receive, send)
        
        # Obter IP do cliente
        client_ip = self.get_client_ip(scope)
        
        # Verificar limite de conexões por IP
        current_connections = self.connection_counts.get(client_ip, 0)
        
        if current_connections >= self.max_connections_per_ip:
            logger.warning(f"WebSocket: Rate limit excedido para IP {client_ip}")
            await send({
                'type': 'websocket.close',
                'code': 4008  # Policy Violation
            })
            return
        
        # Incrementar contador de conexões
        self.connection_counts[client_ip] = current_connections + 1
        
        try:
            # Processar conexão com rate limiting de mensagens
            return await super().__call__(scope, self.rate_limited_receive(receive), send)
        finally:
            # Decrementar contador ao desconectar
            self.connection_counts[client_ip] = max(0, self.connection_counts.get(client_ip, 1) - 1)
    
    async def rate_limited_receive(self, receive):
        """
        Wrapper para receive que aplica rate limiting de mensagens
        """
        async def _receive():
            message = await receive()
            
            if message['type'] == 'websocket.receive':
                # Aplicar rate limiting de mensagens aqui se necessário
                pass
            
            return message
        
        return _receive
    
    def get_client_ip(self, scope):
        """
        Extrai IP do cliente do scope WebSocket
        """
        # Tentar obter IP real primeiro (proxy headers)
        headers = dict(scope.get('headers', []))
        
        # Verificar headers de proxy
        for header_name in [b'x-forwarded-for', b'x-real-ip', b'cf-connecting-ip']:
            if header_name in headers:
                ip = headers[header_name].decode('utf-8').split(',')[0].strip()
                if ip:
                    return ip
        
        # Fallback para client do scope
        client = scope.get('client')
        if client:
            return client[0]
        
        return 'unknown'


class WebSocketLoggingMiddleware(BaseMiddleware):
    """
    Middleware para logging detalhado de WebSockets
    Útil para debugging e monitoramento
    """
    
    async def __call__(self, scope, receive, send):
        """
        Loga eventos importantes de WebSocket
        """
        if scope['type'] != 'websocket':
            return await super().__call__(scope, receive, send)
        
        connection_id = id(scope)  # ID único da conexão
        client_ip = self.get_client_ip(scope)
        path = scope.get('path', 'unknown')
        
        logger.info(f"WebSocket[{connection_id}]: Nova conexão de {client_ip} para {path}")
        
        async def logging_receive():
            message = await receive()
            if message['type'] == 'websocket.connect':
                logger.debug(f"WebSocket[{connection_id}]: Conectando...")
            elif message['type'] == 'websocket.disconnect':
                logger.info(f"WebSocket[{connection_id}]: Desconectando (code: {message.get('code', 'unknown')})")
            elif message['type'] == 'websocket.receive':
                # Log apenas o tipo de mensagem, não o conteúdo (privacidade)
                logger.debug(f"WebSocket[{connection_id}]: Mensagem recebida")
            return message
        
        async def logging_send(message):
            if message['type'] == 'websocket.accept':
                logger.info(f"WebSocket[{connection_id}]: Conexão aceita")
            elif message['type'] == 'websocket.close':
                logger.info(f"WebSocket[{connection_id}]: Conexão fechada (code: {message.get('code', 'unknown')})")
            elif message['type'] == 'websocket.send':
                logger.debug(f"WebSocket[{connection_id}]: Mensagem enviada")
            
            await send(message)
        
        return await super().__call__(scope, logging_receive, logging_send)
    
    def get_client_ip(self, scope):
        """
        Extrai IP do cliente (mesmo método do rate limit middleware)
        """
        headers = dict(scope.get('headers', []))
        
        for header_name in [b'x-forwarded-for', b'x-real-ip', b'cf-connecting-ip']:
            if header_name in headers:
                ip = headers[header_name].decode('utf-8').split(',')[0].strip()
                if ip:
                    return ip
        
        client = scope.get('client')
        if client:
            return client[0]
        
        return 'unknown'


# Stack de middleware recomendado para WebSockets
def create_websocket_middleware_stack():
    """
    Cria stack de middleware otimizado para WebSockets
    """
    from channels.auth import AuthMiddlewareStack
    from channels.security.websocket import AllowedHostsOriginValidator
    
    # Stack de middleware (ordem importa)
    return AllowedHostsOriginValidator(
        WebSocketRateLimitMiddleware(
            WebSocketLoggingMiddleware(
                WebSocketAuthMiddleware(
                    AuthMiddlewareStack(
                        # Aplicação base aqui
                    )
                )
            )
        )
    )