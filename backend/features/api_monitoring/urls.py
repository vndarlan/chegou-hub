from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ApiProviderViewSet, ApiKeyViewSet, UsageRecordViewSet, 
    CostRecordViewSet, DataSyncViewSet, sync_openai_manual, validate_api_key,
    export_costs_csv, export_usage_csv, export_summary_json
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
    path('validate-key/', validate_api_key, name='validate_api_key'),
    path('export/costs/csv/', export_costs_csv, name='export_costs_csv'),
    path('export/usage/csv/', export_usage_csv, name='export_usage_csv'),
    path('export/summary/json/', export_summary_json, name='export_summary_json'),
]