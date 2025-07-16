from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AnaliseEcomhubViewSet, 
    StatusMappingEcomhubViewSet,
    LojaShopifyViewSet,
    CacheProdutoShopifyViewSet,
    ProcessamentoJobViewSet,
    job_progress_stream
)

router = DefaultRouter()
router.register(r'analises', AnaliseEcomhubViewSet, basename='analise_ecomhub')
router.register(r'status-mapping', StatusMappingEcomhubViewSet)
router.register(r'lojas-shopify', LojaShopifyViewSet, basename='loja_shopify')
router.register(r'cache-produtos', CacheProdutoShopifyViewSet, basename='cache_produto_shopify')
router.register(r'jobs', ProcessamentoJobViewSet, basename='processamento_job')

urlpatterns = [
    path('', include(router.urls)),
    # Server-Sent Events para progresso
    path('jobs/<str:job_id>/progress/', job_progress_stream, name='job_progress_stream'),
]