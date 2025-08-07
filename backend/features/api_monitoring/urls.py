from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ApiProviderViewSet, ApiKeyViewSet, UsageRecordViewSet, 
    CostRecordViewSet, DataSyncViewSet, sync_openai_manual
)

router = DefaultRouter()
router.register(r'providers', ApiProviderViewSet)
router.register(r'api-keys', ApiKeyViewSet)
router.register(r'usage', UsageRecordViewSet)
router.register(r'costs', CostRecordViewSet)
router.register(r'sync', DataSyncViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('sync-openai/', sync_openai_manual, name='sync_openai_manual'),
]