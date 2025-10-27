# backend/features/metricas_ecomhub/urls.py - COM SISTEMA COMPLETO DE TRACKING DE STATUS
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AnaliseEcomhubViewSet, StatusTrackingViewSet, PedidoStatusViewSet,
    EcomhubStoreViewSet, EcomhubOrderViewSet, EcomhubAlertConfigViewSet
)

router = DefaultRouter()

# Rotas existentes
router.register(r'analises', AnaliseEcomhubViewSet, basename='analise_ecomhub')

# Rotas para tracking de status (sistema antigo)
router.register(r'status-tracking', StatusTrackingViewSet, basename='status_tracking')
router.register(r'pedidos-status', PedidoStatusViewSet, basename='pedidos_status')

# Rotas para gerenciamento de lojas ECOMHUB
router.register(r'stores', EcomhubStoreViewSet, basename='ecomhub_stores')

# ===========================================
# SPRINT 3: NOVAS ROTAS DA API REST
# ===========================================
router.register(r'orders', EcomhubOrderViewSet, basename='ecomhub-orders')
router.register(r'alert-config', EcomhubAlertConfigViewSet, basename='ecomhub-alert-config')

urlpatterns = [
    path('', include(router.urls)),

    # Mapeamento do endpoint existente para compatibilidade
    path('pedidos-status-tracking/',
         AnaliseEcomhubViewSet.as_view({'post': 'processar_selenium'}),
         name='pedidos_status_tracking'),
]
