from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AnalisePrimeCODViewSet,
    StatusMappingPrimeCODViewSet,
    PrimeCODCatalogViewSet,
    buscar_orders_primecod,
    processar_dados_primecod,
    testar_performance_primecod,
    testar_conexao_primecod,
    iniciar_coleta_async_primecod,
    status_job_primecod,
    get_primecod_config,
    testar_token_primecod,
    salvar_primecod_config,
    get_last_sync,
    get_scheduler_status,
    get_product_history,
    buscar_pedidos_primecod
)

router = DefaultRouter()
router.register(r'analises', AnalisePrimeCODViewSet, basename='analise_primecod')
router.register(r'status-mapping', StatusMappingPrimeCODViewSet)
router.register(r'catalog', PrimeCODCatalogViewSet, basename='primecod_catalog')

urlpatterns = [
    path('', include(router.urls)),
    
    # Endpoints Proxy para API PrimeCOD (NOVOS)
    path('buscar-orders/', buscar_orders_primecod, name='buscar_orders_primecod'),
    path('processar-dados/', processar_dados_primecod, name='processar_dados_primecod'),
    path('testar-performance/', testar_performance_primecod, name='testar_performance_primecod'),
    path('testar-conexao/', testar_conexao_primecod, name='testar_conexao_primecod'),
    
    # Endpoints Assíncronos (OTIMIZAÇÃO CRÍTICA!)
    path('coleta-async/', iniciar_coleta_async_primecod, name='iniciar_coleta_async_primecod'),
    path('status-job/<str:job_id>/', status_job_primecod, name='status_job_primecod'),

    # Endpoints de Configuração
    path('config/', get_primecod_config, name='get_primecod_config'),
    path('config/testar/', testar_token_primecod, name='testar_token_primecod'),
    path('config/salvar/', salvar_primecod_config, name='salvar_primecod_config'),

    # Endpoint de Última Sincronização
    path('catalog/last-sync/', get_last_sync, name='catalog_last_sync'),

    # Endpoint de Status do Scheduler
    path('catalog/scheduler-status/', get_scheduler_status, name='catalog_scheduler_status'),

    # Endpoint de Historico de Produto
    path('catalog/<int:product_id>/history/', get_product_history, name='product_history'),

    # Endpoint de Busca de Pedidos em Tempo Real
    path('pedidos/buscar/', buscar_pedidos_primecod, name='buscar_pedidos_primecod'),
]
