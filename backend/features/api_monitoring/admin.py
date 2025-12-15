from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import ApiProvider, ApiKey, UsageRecord, CostRecord, DataSync


@admin.register(ApiProvider)
class ApiProviderAdmin(ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']


@admin.register(ApiKey)
class ApiKeyAdmin(ModelAdmin):
    list_display = ['name', 'provider', 'key_id', 'is_active', 'created_at']
    list_filter = ['provider', 'is_active', 'created_at']
    search_fields = ['name', 'key_id', 'description']
    raw_id_fields = ['provider']


@admin.register(UsageRecord)
class UsageRecordAdmin(ModelAdmin):
    list_display = ['api_key', 'date', 'model_name', 'total_requests', 'total_tokens', 'is_batch']
    list_filter = ['date', 'model_name', 'is_batch', 'api_key__provider']
    search_fields = ['api_key__name', 'model_name', 'project_id']
    raw_id_fields = ['api_key']
    date_hierarchy = 'date'
    
    def total_tokens(self, obj):
        return obj.total_tokens
    total_tokens.short_description = 'Total Tokens'


@admin.register(CostRecord)
class CostRecordAdmin(ModelAdmin):
    list_display = ['api_key', 'date', 'model_name', 'total_cost', 'currency']
    list_filter = ['date', 'model_name', 'currency', 'api_key__provider']
    search_fields = ['api_key__name', 'model_name', 'project_id']
    raw_id_fields = ['api_key']
    date_hierarchy = 'date'
    
    def total_cost(self, obj):
        return f"${obj.total_cost:.4f}"
    total_cost.short_description = 'Custo Total'


@admin.register(DataSync)
class DataSyncAdmin(ModelAdmin):
    list_display = ['provider', 'last_sync_date', 'last_sync_timestamp', 'sync_status']
    list_filter = ['sync_status', 'provider', 'last_sync_date']
    search_fields = ['provider__name', 'error_message']
    raw_id_fields = ['provider']
    readonly_fields = ['last_sync_timestamp']