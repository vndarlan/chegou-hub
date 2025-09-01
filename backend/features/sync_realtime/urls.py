# backend/features/sync_realtime/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # === CONFIGURAÇÃO DE WEBHOOKS ===
    
    # Configurar webhooks em lote (todas as lojas do usuário)
    path('configure-webhooks/', views.configure_webhooks_bulk, name='configure-webhooks-bulk'),
    
    # Configurar webhooks para uma loja específica
    path('configure-webhook-single/', views.configure_webhooks_single, name='configure-webhook-single'),
    
    # Listar status dos webhooks de todas as lojas
    path('webhooks-status/', views.list_webhooks_status, name='webhooks-status'),
    
    # Remover webhooks antigos do ChegouHub
    path('cleanup-webhooks/', views.cleanup_old_webhooks, name='cleanup-old-webhooks'),
    
    # === TESTES E MONITORAMENTO ===
    
    # Testar conectividade com Shopify API
    path('test-connectivity/', views.webhook_connectivity_test, name='test-connectivity'),
    
    # Status geral do sistema de tempo real (público)
    path('status/', views.realtime_status, name='realtime-status'),
]

# URLs disponíveis:

# === CONFIGURAÇÃO AUTOMÁTICA DE WEBHOOKS ===
# POST /api/sync-realtime/configure-webhooks/
#   - Configura webhooks automaticamente em todas as lojas ativas do usuário
#   - Body: {"base_domain": "https://api.chegouhub.com"} (opcional)
#   - Cria webhooks para: orders/paid, orders/cancelled, orders/refunded

# POST /api/sync-realtime/configure-webhook-single/
#   - Configura webhooks para uma loja específica
#   - Body: {"loja_id": 123, "base_domain": "https://api.chegouhub.com"}

# GET /api/sync-realtime/webhooks-status/
#   - Lista status dos webhooks de todas as lojas do usuário
#   - Mostra quais webhooks estão configurados e quais faltam

# DELETE /api/sync-realtime/cleanup-webhooks/
#   - Remove webhooks antigos do ChegouHub das lojas
#   - Body: {"base_domain": "https://old-api.chegouhub.com"} (opcional)

# === TESTES E DIAGNÓSTICO ===
# GET /api/sync-realtime/test-connectivity/?loja_id=123
#   - Testa conectividade com API Shopify
#   - Se loja_id não fornecido, testa todas as lojas

# GET /api/sync-realtime/status/
#   - Status público do sistema (não requer autenticação)
#   - Mostra se WebSockets estão disponíveis e endpoints

# === WEBSOCKETS (configurados em routing.py) ===
# ws://domain/ws/estoque/?loja_id=123&session_key=abc
#   - WebSocket para notificações de estoque em tempo real
#   - Notifica vendas processadas, alertas, atualizações de estoque

# ws://domain/ws/notifications/?session_key=abc  
#   - WebSocket para notificações gerais do sistema