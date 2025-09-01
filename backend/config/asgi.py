"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application

# Configurar Django settings antes de importar qualquer coisa
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Inicializar Django
django_asgi_app = get_asgi_application()

# Importar routing após Django estar configurado
from features.sync_realtime.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    # Django HTTP tradicional
    "http": django_asgi_app,
    
    # WebSocket com autenticação
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
