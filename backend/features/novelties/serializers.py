# backend/features/novelties/serializers.py
from rest_framework import serializers
from .models import NoveltyExecution, NoveltyFailure

class NoveltyFailureSerializer(serializers.ModelSerializer):
    class Meta:
        model = NoveltyFailure
        fields = ['id', 'item_id', 'error_type', 'error_message', 'timestamp']

class NoveltyExecutionSerializer(serializers.ModelSerializer):
    failures = NoveltyFailureSerializer(many=True, read_only=True)
    success_rate = serializers.ReadOnlyField()
    execution_time_minutes = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = NoveltyExecution
        fields = [
            'id', 'execution_date', 'country', 'total_processed', 
            'successful', 'failed', 'tabs_closed', 'execution_time', 
            'execution_time_minutes', 'found_pagination', 'status', 
            'status_display', 'error_message', 'details', 'success_rate', 
            'failures'
        ]
        read_only_fields = ['execution_date']

class NoveltyExecutionCreateSerializer(serializers.ModelSerializer):
    """Serializer específico para criação via API do Chile Bot"""
    
    class Meta:
        model = NoveltyExecution
        fields = [
            'country', 'total_processed', 'successful', 'failed', 
            'tabs_closed', 'execution_time', 'found_pagination', 
            'error_message', 'details'
        ]
    
    def create(self, validated_data):
        # Determina status automaticamente
        execution = NoveltyExecution(**validated_data)
        execution.status = execution.determine_status()
        execution.save()
        return execution

class DashboardStatsSerializer(serializers.Serializer):
    """Serializer para estatísticas do dashboard"""
    
    # Estatísticas gerais
    total_executions = serializers.IntegerField()
    total_processed = serializers.IntegerField()
    total_successful = serializers.IntegerField()
    total_failed = serializers.IntegerField()
    success_rate = serializers.FloatField()
    
    # Estatísticas do período
    today_executions = serializers.IntegerField()
    today_processed = serializers.IntegerField()
    week_executions = serializers.IntegerField()
    week_processed = serializers.IntegerField()
    
    # Última execução
    last_execution_date = serializers.DateTimeField(allow_null=True)
    last_execution_status = serializers.CharField(allow_null=True)
    
    # Tempo médio
    avg_execution_time = serializers.FloatField()
    
    # Tendências (últimos 7 dias)
    daily_stats = serializers.ListField()
    
    # Status distribution
    status_distribution = serializers.DictField()