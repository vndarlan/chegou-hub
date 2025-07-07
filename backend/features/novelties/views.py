# backend/features/novelties/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import Group
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.db.models import Q, Sum, Avg, Count
from django.utils import timezone
from datetime import datetime, timedelta
import json

from .models import NoveltyExecution, NoveltyFailure
from .serializers import (
    NoveltyExecutionSerializer, 
    NoveltyExecutionCreateSerializer,
    DashboardStatsSerializer,
    NoveltyFailureSerializer
)

# Permissão customizada para novelties
class CanViewNoveltiesPermission:
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Superuser sempre pode
        if request.user.is_superuser:
            return True
        
        # Grupos que podem visualizar novelties
        allowed_groups = ['Diretoria', 'Operacional', 'Gestão', 'IA & Automações']
        user_groups = request.user.groups.values_list('name', flat=True)
        
        return any(group in allowed_groups for group in user_groups)

class NoveltyExecutionViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar execuções de novelties"""
    queryset = NoveltyExecution.objects.all()
    serializer_class = NoveltyExecutionSerializer
    permission_classes = [IsAuthenticated, CanViewNoveltiesPermission]
    
    def get_queryset(self):
        queryset = NoveltyExecution.objects.all()
        
        # Filtros via query params
        country = self.request.query_params.get('country', None)
        status_filter = self.request.query_params.get('status', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if country:
            queryset = queryset.filter(country=country)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(execution_date__date__gte=date_from)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(execution_date__date__lte=date_to)
            except ValueError:
                pass
        
        return queryset.prefetch_related('failures')
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Endpoint para estatísticas do dashboard"""
        try:
            now = timezone.now()
            today = now.date()
            week_ago = today - timedelta(days=7)
            
            # Estatísticas gerais
            all_executions = NoveltyExecution.objects.all()
            total_executions = all_executions.count()
            
            aggregates = all_executions.aggregate(
                total_processed=Sum('total_processed') or 0,
                total_successful=Sum('successful') or 0,
                total_failed=Sum('failed') or 0,
                avg_execution_time=Avg('execution_time') or 0
            )
            
            # Taxa de sucesso geral
            success_rate = 0
            if aggregates['total_processed'] > 0:
                success_rate = round((aggregates['total_successful'] / aggregates['total_processed']) * 100, 1)
            
            # Estatísticas do período
            today_executions = all_executions.filter(execution_date__date=today).count()
            today_processed = all_executions.filter(execution_date__date=today).aggregate(
                total=Sum('total_processed'))['total'] or 0
            
            week_executions = all_executions.filter(execution_date__date__gte=week_ago).count()
            week_processed = all_executions.filter(execution_date__date__gte=week_ago).aggregate(
                total=Sum('total_processed'))['total'] or 0
            
            # Última execução
            last_execution = all_executions.first()
            last_execution_date = last_execution.execution_date if last_execution else None
            last_execution_status = last_execution.status if last_execution else None
            
            # Estatísticas diárias (últimos 7 dias)
            daily_stats = []
            for i in range(7):
                date = today - timedelta(days=i)
                day_executions = all_executions.filter(execution_date__date=date)
                day_stats = day_executions.aggregate(
                    executions=Count('id'),
                    processed=Sum('total_processed') or 0,
                    successful=Sum('successful') or 0,
                    failed=Sum('failed') or 0
                )
                daily_stats.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'day_name': date.strftime('%a'),
                    **day_stats
                })
            
            daily_stats.reverse()  # Ordem cronológica
            
            # Distribuição por status
            status_distribution = {}
            for choice in NoveltyExecution.STATUS_CHOICES:
                status_code, status_name = choice
                count = all_executions.filter(status=status_code).count()
                status_distribution[status_name] = count
            
            stats_data = {
                'total_executions': total_executions,
                'total_processed': aggregates['total_processed'],
                'total_successful': aggregates['total_successful'],
                'total_failed': aggregates['total_failed'],
                'success_rate': success_rate,
                'today_executions': today_executions,
                'today_processed': today_processed,
                'week_executions': week_executions,
                'week_processed': week_processed,
                'last_execution_date': last_execution_date,
                'last_execution_status': last_execution_status,
                'avg_execution_time': round(aggregates['avg_execution_time'] / 60, 2),  # em minutos
                'daily_stats': daily_stats,
                'status_distribution': status_distribution
            }
            
            serializer = DashboardStatsSerializer(stats_data)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])  # Chile Bot chamará sem autenticação
def receive_execution_data(request):
    """
    Endpoint para receber dados de execução do Chile Bot
    URL: /api/novelties/chile-bot/execution/
    """
    try:
        # Log da requisição
        print(f"📊 Recebendo dados do Chile Bot: {request.data}")
        
        # Validar dados básicos
        required_fields = ['country', 'total_processed', 'successful', 'failed', 'execution_time']
        for field in required_fields:
            if field not in request.data:
                return Response({
                    'error': f'Campo obrigatório ausente: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Criar execução
        serializer = NoveltyExecutionCreateSerializer(data=request.data)
        if serializer.is_valid():
            execution = serializer.save()
            
            # Adicionar falhas se existirem
            failed_items = request.data.get('failed_items', [])
            for failed_item in failed_items:
                NoveltyFailure.objects.create(
                    execution=execution,
                    item_id=failed_item.get('id', 'Unknown'),
                    error_type=failed_item.get('error_type', 'Unknown'),
                    error_message=failed_item.get('error', 'Erro não especificado')
                )
            
            print(f"✅ Execução salva: ID {execution.id}, Status: {execution.status}")
            
            return Response({
                'success': True,
                'execution_id': execution.id,
                'status': execution.status,
                'message': 'Dados recebidos e salvos com sucesso'
            }, status=status.HTTP_201_CREATED)
        
        else:
            print(f"❌ Erro de validação: {serializer.errors}")
            return Response({
                'error': 'Dados inválidos',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        print(f"❌ Erro ao processar dados: {str(e)}")
        return Response({
            'error': 'Erro interno do servidor',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_novelties_permissions(request):
    """Verifica se o usuário pode visualizar novelties"""
    permission = CanViewNoveltiesPermission()
    can_view = permission.has_permission(request, None)
    
    return Response({
        'can_view': can_view,
        'user_groups': list(request.user.groups.values_list('name', flat=True))
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated, CanViewNoveltiesPermission])
def recent_executions(request):
    """Retorna execuções recentes para widgets"""
    try:
        limit = int(request.query_params.get('limit', 10))
        executions = NoveltyExecution.objects.all()[:limit]
        serializer = NoveltyExecutionSerializer(executions, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])  
@permission_classes([IsAuthenticated, CanViewNoveltiesPermission])
def execution_trends(request):
    """Retorna dados para gráficos de tendência"""
    try:
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Dados por dia
        daily_data = []
        for i in range(days):
            date = start_date + timedelta(days=i)
            day_executions = NoveltyExecution.objects.filter(execution_date__date=date)
            
            daily_data.append({
                'date': date.strftime('%Y-%m-%d'),
                'executions': day_executions.count(),
                'total_processed': day_executions.aggregate(total=Sum('total_processed'))['total'] or 0,
                'successful': day_executions.aggregate(total=Sum('successful'))['total'] or 0,
                'failed': day_executions.aggregate(total=Sum('failed'))['total'] or 0,
            })
        
        return Response({
            'daily_data': daily_data,
            'period': f'{days} dias'
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)