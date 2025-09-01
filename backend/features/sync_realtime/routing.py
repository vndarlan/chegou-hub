# backend/features/sync_realtime/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # WebSocket para notificações de estoque em tempo real
    re_path(r'ws/estoque/$', consumers.EstoqueRealtimeConsumer.as_asgi()),
    
    # WebSocket para notificações gerais do sistema
    re_path(r'ws/notifications/$', consumers.NotificacoesGeraisConsumer.as_asgi()),
]