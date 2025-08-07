from rest_framework import serializers
from .models import ApiProvider, ApiKey, UsageRecord, CostRecord, DataSync


class ApiProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiProvider
        fields = ['id', 'name', 'is_active', 'created_at']


class ApiKeySerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.get_name_display', read_only=True)
    
    class Meta:
        model = ApiKey
        fields = ['id', 'name', 'key_id', 'description', 'provider', 'provider_name', 'is_active', 'created_at']


class UsageRecordSerializer(serializers.ModelSerializer):
    api_key_name = serializers.CharField(source='api_key.name', read_only=True)
    provider_name = serializers.CharField(source='api_key.provider.get_name_display', read_only=True)
    total_tokens = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = UsageRecord
        fields = [
            'id', 'date', 'model_name', 'api_key_name', 'provider_name',
            'total_requests', 'input_tokens', 'output_tokens', 'cached_tokens', 
            'total_tokens', 'is_batch', 'project_id'
        ]


class CostRecordSerializer(serializers.ModelSerializer):
    api_key_name = serializers.CharField(source='api_key.name', read_only=True)
    provider_name = serializers.CharField(source='api_key.provider.get_name_display', read_only=True)
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)
    
    class Meta:
        model = CostRecord
        fields = [
            'id', 'date', 'model_name', 'api_key_name', 'provider_name',
            'input_cost', 'output_cost', 'cached_cost', 'other_costs', 
            'total_cost', 'currency', 'project_id'
        ]


class DataSyncSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.get_name_display', read_only=True)
    
    class Meta:
        model = DataSync
        fields = ['id', 'provider', 'provider_name', 'last_sync_date', 'last_sync_timestamp', 'sync_status', 'error_message']


class UsageSummarySerializer(serializers.Serializer):
    """Serializer para resumos de uso"""
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=4)
    total_requests = serializers.IntegerField()
    total_tokens = serializers.IntegerField()
    top_model = serializers.CharField()
    top_api_key = serializers.CharField()


class InsightsSerializer(serializers.Serializer):
    """Serializer para insights automáticos"""
    most_expensive_api_key = serializers.CharField()
    most_expensive_cost = serializers.DecimalField(max_digits=10, decimal_places=4)
    highest_usage_day = serializers.DateField()
    highest_usage_amount = serializers.DecimalField(max_digits=10, decimal_places=4)
    best_cost_efficiency_model = serializers.CharField()
    cost_efficiency_ratio = serializers.DecimalField(max_digits=10, decimal_places=6)