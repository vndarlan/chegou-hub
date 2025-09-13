# backend/features/estoque/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProdutoEstoqueViewSet, MovimentacaoEstoqueViewSet, AlertaEstoqueViewSet,
    ProdutoViewSet, MovimentacaoEstoqueCompartilhadoViewSet, AlertaEstoqueCompartilhadoViewSet,
    shopify_order_webhook, webhook_status, webhook_stats, webhook_permissive_info
)
from .produto_unificado_view import ProdutoUnificadoViewSet

# Criar router para os ViewSets
router = DefaultRouter()
router.register(r'produtos', ProdutoEstoqueViewSet, basename='produto-estoque')
router.register(r'movimentacoes', MovimentacaoEstoqueViewSet, basename='movimentacao-estoque')
router.register(r'alertas', AlertaEstoqueViewSet, basename='alerta-estoque')

# Novos endpoints para produtos compartilhados
router.register(r'produtos-compartilhados', ProdutoViewSet, basename='produto-compartilhado')
router.register(r'movimentacoes-compartilhadas', MovimentacaoEstoqueCompartilhadoViewSet, basename='movimentacao-compartilhada')
router.register(r'alertas-compartilhados', AlertaEstoqueCompartilhadoViewSet, basename='alerta-compartilhado')

# Endpoint unificado para interface nova
router.register(r'produtos-unificados', ProdutoUnificadoViewSet, basename='produto-unificado')

urlpatterns = [
    # URLs dos ViewSets via router
    path('', include(router.urls)),
    
    # ===== WEBHOOK ENDPOINTS =====
    # Endpoint principal para receber webhooks do Shopify
    path('webhook/order-created/', shopify_order_webhook, name='shopify-order-webhook'),
    
    # Endpoint alternativo para compatibilidade (mesmo endpoint, URL diferente)
    path('webhook/shopify/', shopify_order_webhook, name='shopify-webhook-alt'),
    
    # Endpoints de monitoramento e estatísticas
    path('webhook/status/', webhook_status, name='webhook-status'),
    path('webhook/stats/', webhook_stats, name='webhook-stats'),
    path('webhook/permissive-info/', webhook_permissive_info, name='webhook-permissive-info'),
]

# URLs disponíveis:

# === PRODUTOS ===
# GET /api/estoque/produtos/ - Lista produtos em estoque
# POST /api/estoque/produtos/ - Cria novo produto
# GET /api/estoque/produtos/{id}/ - Detalhes do produto
# PUT /api/estoque/produtos/{id}/ - Atualiza produto
# DELETE /api/estoque/produtos/{id}/ - Remove produto
# POST /api/estoque/produtos/{id}/adicionar_estoque/ - Adiciona estoque
# POST /api/estoque/produtos/{id}/remover_estoque/ - Remove estoque
# GET /api/estoque/produtos/{id}/movimentacoes/ - Movimentações do produto
# GET /api/estoque/produtos/{id}/alertas/ - Alertas do produto
# GET /api/estoque/produtos/resumo_geral/ - Resumo geral do estoque
# GET /api/estoque/produtos/produtos_reposicao/ - Produtos que precisam reposição

# === PRODUTOS UNIFICADOS (NOVA INTERFACE) ===
# GET /api/estoque/produtos-unificados/ - Lista TODOS os produtos (individuais + compartilhados)
# GET /api/estoque/produtos-unificados/estatisticas_unificadas/ - Estatísticas de todos os produtos

# === MOVIMENTAÇÕES ===
# GET /api/estoque/movimentacoes/ - Lista movimentações
# POST /api/estoque/movimentacoes/ - Cria nova movimentação
# GET /api/estoque/movimentacoes/{id}/ - Detalhes da movimentação
# POST /api/estoque/movimentacoes/criar_movimentacao/ - Cria movimentação (alternativa)
# GET /api/estoque/movimentacoes/relatorio_periodo/ - Relatório por período

# === ALERTAS ===
# GET /api/estoque/alertas/ - Lista alertas
# GET /api/estoque/alertas/{id}/ - Detalhes do alerta
# PUT /api/estoque/alertas/{id}/ - Atualiza alerta
# POST /api/estoque/alertas/{id}/marcar_lido/ - Marca como lido
# POST /api/estoque/alertas/{id}/resolver/ - Resolve alerta
# POST /api/estoque/alertas/resolver_multiplos/ - Resolve múltiplos alertas
# GET /api/estoque/alertas/resumo/ - Resumo dos alertas
# GET /api/estoque/alertas/verificar_alertas_tempo_real/ - Verifica e cria alertas em tempo real

# === WEBHOOKS SHOPIFY (MODO PERMISSIVO) ===
# POST /api/estoque/webhook/order-created/ - Recebe pedidos do Shopify (público, CSRF exempt, MODO PERMISSIVO)
# POST /api/estoque/webhook/shopify/ - Endpoint alternativo para webhooks do Shopify (público, CSRF exempt, MODO PERMISSIVO)
# GET /api/estoque/webhook/status/ - Status do sistema de webhook (público)
# GET /api/estoque/webhook/stats/ - Estatísticas de processamento (autenticado)
# GET /api/estoque/webhook/permissive-info/ - Informações sobre o modo permissivo (público)