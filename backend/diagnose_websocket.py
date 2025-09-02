#!/usr/bin/env python
"""
Script simples para diagnosticar WebSocket
"""

import os
import sys
import django
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from channels.layers import get_channel_layer

def main():
    print("=== DIAGNOSTICO WEBSOCKET ===")
    
    # Informações básicas
    is_railway = getattr(settings, 'IS_RAILWAY_DEPLOYMENT', False)
    redis_available = getattr(settings, 'REDIS_AVAILABLE', False)
    redis_url = getattr(settings, 'REDIS_URL', 'Nao configurado')
    
    print(f"Ambiente: {'Railway' if is_railway else 'Local'}")
    print(f"Redis disponivel: {redis_available}")
    print(f"Redis URL: {redis_url}")
    
    # Testar Channel Layer
    channel_layer = get_channel_layer()
    if channel_layer:
        layer_type = channel_layer.__class__.__name__
        print(f"Channel Layer: {layer_type}")
        
        if layer_type == 'InMemoryChannelLayer':
            print("AVISO: Usando InMemory - WebSocket limitado")
        elif layer_type == 'RedisChannelLayer':
            print("OK: Usando Redis - WebSocket deve funcionar")
        else:
            print(f"INFO: Tipo desconhecido: {layer_type}")
    else:
        print("ERRO: Channel Layer nao configurado")
    
    # Verificar imports
    try:
        from features.sync_realtime.consumers import EstoqueRealtimeConsumer
        print("OK: Consumer importado")
    except Exception as e:
        print(f"ERRO: Consumer nao importado - {e}")
    
    # Recomendações
    print("\n=== RECOMENDACOES ===")
    
    if not redis_available:
        print("1. Redis nao disponivel - WebSocket limitado")
        print("2. Configure REDIS_URL no Railway se em producao")
        print("3. Use modo fallback para garantir funcionamento")
    
    if channel_layer and channel_layer.__class__.__name__ == 'InMemoryChannelLayer':
        print("4. InMemory channel nao funciona entre processos")
        print("5. Em producao, isso causa erro 1006")
        
    print("\nPara testar em producao:")
    print("GET https://chegouhubteste.up.railway.app/api/sync-realtime/diagnostic/")

if __name__ == "__main__":
    main()