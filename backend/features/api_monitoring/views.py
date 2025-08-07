from datetime import datetime, timedelta
from django.db.models import Sum, Max, Count, Q, F
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ApiProvider, ApiKey, UsageRecord, CostRecord, DataSync
from .serializers import (
    ApiProviderSerializer, ApiKeySerializer, UsageRecordSerializer,
    CostRecordSerializer, DataSyncSerializer, UsageSummarySerializer, InsightsSerializer
)
from .services import APIMonitoringService


class ApiProviderViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para gerenciar provedores de API"""
    queryset = ApiProvider.objects.filter(is_active=True)
    serializer_class = ApiProviderSerializer
    permission_classes = [IsAuthenticated]


class ApiKeyViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para gerenciar chaves de API"""
    queryset = ApiKey.objects.filter(is_active=True).select_related('provider')
    serializer_class = ApiKeySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        provider = self.request.query_params.get('provider')
        if provider:
            queryset = queryset.filter(provider__name=provider)
        return queryset


class UsageRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para registros de uso"""
    queryset = UsageRecord.objects.select_related('api_key', 'api_key__provider')
    serializer_class = UsageRecordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros de data
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
            
        # Filtro por API keys
        api_keys = self.request.query_params.getlist('api_keys')
        if api_keys:
            queryset = queryset.filter(api_key__id__in=api_keys)
            
        # Filtro por modelo
        model_name = self.request.query_params.get('model')
        if model_name:
            queryset = queryset.filter(model_name=model_name)
            
        return queryset.order_by('-date', '-created_at')


class CostRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para registros de custo"""
    queryset = CostRecord.objects.select_related('api_key', 'api_key__provider')
    serializer_class = CostRecordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros de data
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
            
        # Filtro por API keys
        api_keys = self.request.query_params.getlist('api_keys')
        if api_keys:
            queryset = queryset.filter(api_key__id__in=api_keys)
            
        # Filtro por modelo
        model_name = self.request.query_params.get('model')
        if model_name:
            queryset = queryset.filter(model_name=model_name)
            
        return queryset.order_by('-date', '-created_at')
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Endpoint para resumo de custos"""
        # Parâmetros padrão (últimos 7 dias)
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=7)
        
        # Parâmetros customizados
        if request.query_params.get('start_date'):
            start_date = datetime.strptime(request.query_params.get('start_date'), '%Y-%m-%d').date()
        if request.query_params.get('end_date'):
            end_date = datetime.strptime(request.query_params.get('end_date'), '%Y-%m-%d').date()
            
        # Filtros de API keys
        queryset = self.get_queryset().filter(date__range=[start_date, end_date])
        
        # Calcular métricas
        cost_summary = queryset.aggregate(
            total_cost=Sum(F('input_cost') + F('output_cost') + F('cached_cost') + F('other_costs'))
        )
        
        usage_summary = UsageRecord.objects.filter(
            api_key__in=queryset.values_list('api_key', flat=True).distinct(),
            date__range=[start_date, end_date]
        ).aggregate(
            total_requests=Sum('total_requests'),
            total_tokens=Sum(F('input_tokens') + F('output_tokens'))
        )
        
        # Modelo mais usado
        top_model = queryset.values('model_name').annotate(
            total=Sum(F('input_cost') + F('output_cost') + F('cached_cost') + F('other_costs'))
        ).order_by('-total').first()
        
        # API Key mais usada
        top_api_key = queryset.values('api_key__name').annotate(
            total=Sum(F('input_cost') + F('output_cost') + F('cached_cost') + F('other_costs'))
        ).order_by('-total').first()
        
        summary_data = {
            'period_start': start_date,
            'period_end': end_date,
            'total_cost': cost_summary.get('total_cost', 0) or 0,
            'total_requests': usage_summary.get('total_requests', 0) or 0,
            'total_tokens': usage_summary.get('total_tokens', 0) or 0,
            'top_model': top_model['model_name'] if top_model else 'N/A',
            'top_api_key': top_api_key['api_key__name'] if top_api_key else 'N/A',
        }
        
        serializer = UsageSummarySerializer(summary_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def daily_timeline(self, request):
        """Timeline de gastos diários"""
        # Parâmetros padrão (últimos 7 dias)
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=7)
        
        if request.query_params.get('start_date'):
            start_date = datetime.strptime(request.query_params.get('start_date'), '%Y-%m-%d').date()
        if request.query_params.get('end_date'):
            end_date = datetime.strptime(request.query_params.get('end_date'), '%Y-%m-%d').date()
        
        queryset = self.get_queryset().filter(date__range=[start_date, end_date])
        
        # Agrupar por data e API key
        timeline_data = queryset.values('date', 'api_key__name').annotate(
            daily_cost=Sum(F('input_cost') + F('output_cost') + F('cached_cost') + F('other_costs'))
        ).order_by('date', 'api_key__name')
        
        return Response(timeline_data)
    
    @action(detail=False, methods=['get'])
    def model_breakdown(self, request):
        """Breakdown de gastos por modelo"""
        # Parâmetros de data
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=7)
        
        if request.query_params.get('start_date'):
            start_date = datetime.strptime(request.query_params.get('start_date'), '%Y-%m-%d').date()
        if request.query_params.get('end_date'):
            end_date = datetime.strptime(request.query_params.get('end_date'), '%Y-%m-%d').date()
        
        queryset = self.get_queryset().filter(date__range=[start_date, end_date])
        
        # Agrupar por modelo
        model_data = queryset.values('model_name').annotate(
            total_cost=Sum(F('input_cost') + F('output_cost') + F('cached_cost') + F('other_costs')),
            total_requests=Count('id')
        ).order_by('-total_cost')
        
        return Response(model_data)
    
    @action(detail=False, methods=['get'])
    def insights(self, request):
        """Insights automáticos dos dados"""
        # Parâmetros de data
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=7)
        
        if request.query_params.get('start_date'):
            start_date = datetime.strptime(request.query_params.get('start_date'), '%Y-%m-%d').date()
        if request.query_params.get('end_date'):
            end_date = datetime.strptime(request.query_params.get('end_date'), '%Y-%m-%d').date()
        
        queryset = self.get_queryset().filter(date__range=[start_date, end_date])
        
        # API Key mais cara
        most_expensive = queryset.values('api_key__name').annotate(
            total=Sum(F('input_cost') + F('output_cost') + F('cached_cost') + F('other_costs'))
        ).order_by('-total').first()
        
        # Dia de maior gasto
        highest_day = queryset.values('date').annotate(
            daily_total=Sum(F('input_cost') + F('output_cost') + F('cached_cost') + F('other_costs'))
        ).order_by('-daily_total').first()
        
        # Melhor custo/benefício (menor custo por token)
        cost_efficiency = queryset.values('model_name').annotate(
            avg_cost=Sum(F('input_cost') + F('output_cost') + F('cached_cost') + F('other_costs')) / Sum(F('usagerecord__input_tokens') + F('usagerecord__output_tokens'))
        ).filter(avg_cost__gt=0).order_by('avg_cost').first()
        
        insights_data = {
            'most_expensive_api_key': most_expensive['api_key__name'] if most_expensive else 'N/A',
            'most_expensive_cost': most_expensive['total'] if most_expensive else 0,
            'highest_usage_day': highest_day['date'] if highest_day else start_date,
            'highest_usage_amount': highest_day['daily_total'] if highest_day else 0,
            'best_cost_efficiency_model': cost_efficiency['model_name'] if cost_efficiency else 'N/A',
            'cost_efficiency_ratio': cost_efficiency['avg_cost'] if cost_efficiency else 0,
        }
        
        serializer = InsightsSerializer(insights_data)
        return Response(serializer.data)


class DataSyncViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para status de sincronização"""
    queryset = DataSync.objects.select_related('provider')
    serializer_class = DataSyncSerializer
    permission_classes = [IsAuthenticated]


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_openai_manual(request):
    """
    Endpoint para sincronização manual de dados OpenAI
    POST /api/monitoring/sync-openai/
    """
    try:
        # Parâmetros opcionais
        days_back = int(request.data.get('days_back', 7))
        
        if days_back > 30:
            return Response({
                'success': False,
                'error': 'Máximo de 30 dias permitido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Executar sincronização
        service = APIMonitoringService()
        result = service.sync_openai_data(days_back=days_back)
        
        if result['success']:
            return Response({
                'success': True,
                'message': 'Sincronização concluída com sucesso',
                'data': {
                    'usage_records_synced': result['usage_records_synced'],
                    'cost_records_synced': result['cost_records_synced'],
                    'sync_period': result['sync_period']
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except ValueError as e:
        return Response({
            'success': False,
            'error': 'Parâmetro days_back deve ser um número inteiro'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'success': False,
            'error': f'Erro inesperado: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)