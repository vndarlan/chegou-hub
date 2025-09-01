# backend/features/sync_realtime/admin.py
from django.contrib import admin

# Esta feature não possui models próprios no banco de dados.
# Toda a configuração é feita via:
# 1. API endpoints (/api/sync-realtime/)
# 2. Management commands (python manage.py configure_webhooks)
# 3. WebSocket connections (ws://domain/ws/estoque/)

# A sincronização utiliza:
# - Models de features.processamento (ShopifyConfig)
# - Models de features.estoque (ProdutoEstoque, MovimentacaoEstoque, AlertaEstoque)

# Para gerenciar webhooks e sincronização, acesse:
# - /api/sync-realtime/webhooks-status/ (listar status)
# - /api/sync-realtime/configure-webhooks/ (configurar automaticamente)
# - /api/sync-realtime/status/ (status geral do sistema)