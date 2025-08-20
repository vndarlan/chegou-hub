# backend/features/metricas_ecomhub/urls.py - COM SISTEMA COMPLETO DE TRACKING DE STATUS
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnaliseEcomhubViewSet, StatusTrackingViewSet, PedidoStatusViewSet

router = DefaultRouter()

# Rotas existentes
router.register(r'analises', AnaliseEcomhubViewSet, basename='analise_ecomhub')

# Novas rotas para tracking de status
router.register(r'status-tracking', StatusTrackingViewSet, basename='status_tracking')
router.register(r'pedidos-status', PedidoStatusViewSet, basename='pedidos_status')

urlpatterns = [
    path('', include(router.urls)),
    
    # Mapeamento do endpoint existente para compatibilidade
    path('pedidos-status-tracking/', 
         AnaliseEcomhubViewSet.as_view({'post': 'processar_selenium'}), 
         name='pedidos_status_tracking'),
]