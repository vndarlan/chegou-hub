# backend/features/metricas_ecomhub/urls.py - VERSÃO ATUALIZADA COM SHOPIFY
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AnaliseEcomhubViewSet, 
    StatusMappingEcomhubViewSet,
    LojaShopifyViewSet,
    CacheProdutoShopifyViewSet
)

router = DefaultRouter()
router.register(r'analises', AnaliseEcomhubViewSet, basename='analise_ecomhub')
router.register(r'status-mapping', StatusMappingEcomhubViewSet)
router.register(r'lojas-shopify', LojaShopifyViewSet, basename='loja_shopify')
router.register(r'cache-produtos', CacheProdutoShopifyViewSet, basename='cache_produto_shopify')

urlpatterns = [
    path('', include(router.urls)),
]