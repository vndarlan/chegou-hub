from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AnalisePrimeCODViewSet, 
    StatusMappingPrimeCODViewSet,
    buscar_orders_primecod,
    processar_dados_primecod,
    testar_conexao_primecod,
    iniciar_coleta_async_primecod,
    status_job_primecod
)

router = DefaultRouter()
router.register(r'analises', AnalisePrimeCODViewSet, basename='analise_primecod')
router.register(r'status-mapping', StatusMappingPrimeCODViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # Endpoints Proxy para API PrimeCOD (NOVOS)
    path('buscar-orders/', buscar_orders_primecod, name='buscar_orders_primecod'),
    path('processar-dados/', processar_dados_primecod, name='processar_dados_primecod'),
    path('testar-conexao/', testar_conexao_primecod, name='testar_conexao_primecod'),
    
    # Endpoints Assíncronos (OTIMIZAÇÃO CRÍTICA!)
    path('coleta-async/', iniciar_coleta_async_primecod, name='iniciar_coleta_async_primecod'),
    path('status-job/<str:job_id>/', status_job_primecod, name='status_job_primecod'),
]
