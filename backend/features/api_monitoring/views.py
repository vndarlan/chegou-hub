import csv
import io
from datetime import datetime, timedelta
from django.db.models import Sum, Max, Count, Q, F
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdminUser
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
    permission_classes = [IsAdminUser]


class ApiKeyViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para gerenciar chaves de API"""
    queryset = ApiKey.objects.filter(is_active=True).select_related('provider')
    serializer_class = ApiKeySerializer
    permission_classes = [IsAdminUser]
    
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
    permission_classes = [IsAdminUser]
    
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
    permission_classes = [IsAdminUser]
    
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
        # Primeiro verificar se há dados de uso relacionados
        usage_data = UsageRecord.objects.filter(
            api_key__in=queryset.values_list('api_key', flat=True).distinct(),
            date__range=[start_date, end_date]
        )
        
        cost_efficiency = None
        if usage_data.exists():
            # Calcular eficiência apenas se houver dados de uso
            efficiency_data = []
            for model in queryset.values('model_name').distinct():
                model_name = model['model_name']
                model_costs = queryset.filter(model_name=model_name).aggregate(
                    total_cost=Sum(F('input_cost') + F('output_cost') + F('cached_cost') + F('other_costs'))
                )
                model_usage = usage_data.filter(model_name=model_name).aggregate(
                    total_tokens=Sum(F('input_tokens') + F('output_tokens'))
                )
                
                if model_costs['total_cost'] and model_usage['total_tokens'] and model_usage['total_tokens'] > 0:
                    efficiency_data.append({
                        'model_name': model_name,
                        'avg_cost': float(model_costs['total_cost']) / float(model_usage['total_tokens'])
                    })
            
            if efficiency_data:
                cost_efficiency = min(efficiency_data, key=lambda x: x['avg_cost'])
        
        insights_data = {
            'most_expensive_api_key': most_expensive['api_key__name'] if most_expensive else 'N/A',
            'most_expensive_cost': float(most_expensive['total']) if most_expensive and most_expensive.get('total') else 0.0,
            'highest_usage_day': highest_day['date'] if highest_day else start_date,
            'highest_usage_amount': float(highest_day['daily_total']) if highest_day and highest_day.get('daily_total') else 0.0,
            'best_cost_efficiency_model': cost_efficiency['model_name'] if cost_efficiency else 'N/A',
            'cost_efficiency_ratio': cost_efficiency.get('avg_cost', 0) if cost_efficiency else 0.0,
        }
        
        serializer = InsightsSerializer(insights_data)
        return Response(serializer.data)


class DataSyncViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para status de sincronização"""
    queryset = DataSync.objects.select_related('provider')
    serializer_class = DataSyncSerializer
    permission_classes = [IsAdminUser]


@api_view(['GET'])
@permission_classes([])  # Permitir acesso sem autenticação para teste de conectividade
def validate_api_key(request):
    """
    Endpoint para validar a API key OpenAI
    GET /api/monitoring/validate-key/
    
    Este endpoint pode ser usado sem autenticação para testar a conectividade
    com a API OpenAI. Usado principalmente para diagnósticos e configuração inicial.
    """
    try:
        from .services import OpenAIAPIService
        service = OpenAIAPIService()
        result = service.validate_api_key()
        
        if result.get('valid') and result.get('has_admin_permissions'):
            return Response(result, status=status.HTTP_200_OK)
        elif result.get('valid') and not result.get('has_admin_permissions'):
            return Response(result, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response(result, status=status.HTTP_401_UNAUTHORIZED)
            
    except ValueError as e:
        # API key não configurada ou inválida
        error_msg = str(e)
        
        # Dar instruções específicas baseadas no tipo de erro
        if 'não configurada' in error_msg:
            details = 'Adicione OPENAI_ADMIN_API_KEY=sua-admin-key-aqui no arquivo .env'
        elif 'placeholder' in error_msg:
            details = 'Substitua o placeholder por uma API key real da OpenAI'
        elif 'sk-' in error_msg:
            details = 'Use uma API key válida que comece com "sk-" da OpenAI'
        else:
            details = 'Verifique sua configuração da API key OpenAI'
        
        return Response({
            'valid': False,
            'has_admin_permissions': False,
            'error': error_msg,
            'details': details,
            'next_steps': [
                '1. Acesse https://platform.openai.com/settings/organization/admin-keys',
                '2. Crie uma nova Admin API Key',
                '3. Copie a key e configure como OPENAI_ADMIN_API_KEY',
                '4. Reinicie o servidor'
            ]
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        return Response({
            'valid': False,
            'has_admin_permissions': False,
            'error': f'Erro ao validar API key: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def export_costs_csv(request):
    """
    Endpoint para exportar dados de custos em CSV
    GET /api/monitoring/export/costs/csv/
    """
    try:
        # Parâmetros de data
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=7)
        
        if request.query_params.get('start_date'):
            start_date = datetime.strptime(request.query_params.get('start_date'), '%Y-%m-%d').date()
        if request.query_params.get('end_date'):
            end_date = datetime.strptime(request.query_params.get('end_date'), '%Y-%m-%d').date()
        
        # Buscar dados
        queryset = CostRecord.objects.filter(
            date__range=[start_date, end_date]
        ).select_related('api_key').order_by('-date')
        
        # Criar CSV
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="openai_costs_{start_date}_{end_date}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Data', 'API Key', 'Modelo', 'Projeto ID',
            'Custo Input', 'Custo Output', 'Custo Cache', 
            'Outros Custos', 'Custo Total', 'Moeda'
        ])
        
        for record in queryset:
            total_cost = (
                float(record.input_cost or 0) + 
                float(record.output_cost or 0) + 
                float(record.cached_cost or 0) + 
                float(record.other_costs or 0)
            )
            writer.writerow([
                record.date.strftime('%Y-%m-%d'),
                record.api_key.name,
                record.model_name,
                record.project_id or '',
                float(record.input_cost or 0),
                float(record.output_cost or 0),
                float(record.cached_cost or 0),
                float(record.other_costs or 0),
                total_cost,
                record.currency
            ])
        
        return response
        
    except Exception as e:
        return Response({
            'error': f'Erro ao exportar CSV: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def export_usage_csv(request):
    """
    Endpoint para exportar dados de uso em CSV
    GET /api/monitoring/export/usage/csv/
    """
    try:
        # Parâmetros de data
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=7)
        
        if request.query_params.get('start_date'):
            start_date = datetime.strptime(request.query_params.get('start_date'), '%Y-%m-%d').date()
        if request.query_params.get('end_date'):
            end_date = datetime.strptime(request.query_params.get('end_date'), '%Y-%m-%d').date()
        
        # Buscar dados
        queryset = UsageRecord.objects.filter(
            date__range=[start_date, end_date]
        ).select_related('api_key').order_by('-date')
        
        # Criar CSV
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="openai_usage_{start_date}_{end_date}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Data', 'API Key', 'Modelo', 'Projeto ID',
            'Total Requests', 'Input Tokens', 'Output Tokens', 
            'Cached Tokens', 'Batch'
        ])
        
        for record in queryset:
            writer.writerow([
                record.date.strftime('%Y-%m-%d'),
                record.api_key.name,
                record.model_name,
                record.project_id or '',
                record.total_requests,
                record.input_tokens,
                record.output_tokens,
                record.cached_tokens,
                'Sim' if record.is_batch else 'Não'
            ])
        
        return response
        
    except Exception as e:
        return Response({
            'error': f'Erro ao exportar CSV: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def export_summary_json(request):
    """
    Endpoint para exportar resumo em JSON
    GET /api/monitoring/export/summary/json/
    """
    try:
        # Parâmetros de data
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=7)
        
        if request.query_params.get('start_date'):
            start_date = datetime.strptime(request.query_params.get('start_date'), '%Y-%m-%d').date()
        if request.query_params.get('end_date'):
            end_date = datetime.strptime(request.query_params.get('end_date'), '%Y-%m-%d').date()
        
        # Calcular métricas
        cost_queryset = CostRecord.objects.filter(date__range=[start_date, end_date])
        usage_queryset = UsageRecord.objects.filter(date__range=[start_date, end_date])
        
        # Resumo de custos
        cost_summary = cost_queryset.aggregate(
            total_cost=Sum(F('input_cost') + F('output_cost') + F('cached_cost') + F('other_costs')),
            total_input_cost=Sum('input_cost'),
            total_output_cost=Sum('output_cost'),
            total_cached_cost=Sum('cached_cost'),
            total_other_costs=Sum('other_costs')
        )
        
        # Resumo de uso
        usage_summary = usage_queryset.aggregate(
            total_requests=Sum('total_requests'),
            total_input_tokens=Sum('input_tokens'),
            total_output_tokens=Sum('output_tokens'),
            total_cached_tokens=Sum('cached_tokens')
        )
        
        # Breakdown por modelo
        model_breakdown = cost_queryset.values('model_name').annotate(
            total_cost=Sum(F('input_cost') + F('output_cost') + F('cached_cost') + F('other_costs')),
            total_requests=Count('id')
        ).order_by('-total_cost')
        
        # Breakdown por API key
        key_breakdown = cost_queryset.values('api_key__name').annotate(
            total_cost=Sum(F('input_cost') + F('output_cost') + F('cached_cost') + F('other_costs')),
            total_requests=Count('id')
        ).order_by('-total_cost')
        
        # Timeline diário
        daily_timeline = cost_queryset.values('date').annotate(
            daily_cost=Sum(F('input_cost') + F('output_cost') + F('cached_cost') + F('other_costs'))
        ).order_by('date')
        
        summary_data = {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'cost_summary': {
                'total': float(cost_summary.get('total_cost') or 0),
                'input': float(cost_summary.get('total_input_cost') or 0),
                'output': float(cost_summary.get('total_output_cost') or 0),
                'cached': float(cost_summary.get('total_cached_cost') or 0),
                'other': float(cost_summary.get('total_other_costs') or 0)
            },
            'usage_summary': {
                'requests': usage_summary.get('total_requests') or 0,
                'input_tokens': usage_summary.get('total_input_tokens') or 0,
                'output_tokens': usage_summary.get('total_output_tokens') or 0,
                'cached_tokens': usage_summary.get('total_cached_tokens') or 0
            },
            'model_breakdown': [
                {
                    'model': item['model_name'],
                    'cost': float(item['total_cost'] or 0),
                    'requests': item['total_requests']
                }
                for item in model_breakdown
            ],
            'api_key_breakdown': [
                {
                    'api_key': item['api_key__name'],
                    'cost': float(item['total_cost'] or 0),
                    'requests': item['total_requests']
                }
                for item in key_breakdown
            ],
            'daily_timeline': [
                {
                    'date': item['date'].isoformat(),
                    'cost': float(item['daily_cost'] or 0)
                }
                for item in daily_timeline
            ]
        }
        
        return Response(summary_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Erro ao exportar JSON: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def sync_openai_manual(request):
    """
    Endpoint para sincronização manual de dados OpenAI
    POST /api/monitoring/sync-openai/
    """
    try:
        # Parâmetros opcionais
        days_back = int(request.data.get('days_back', 7))
        
        if days_back > 7:
            return Response({
                'success': False,
                'error': 'Máximo de 7 dias permitido'
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