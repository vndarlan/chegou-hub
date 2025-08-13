# backend/features/novelties/views.py - CORREÇÃO DEFINITIVA
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
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

# CORREÇÃO: Classe de permissão correta para DRF
class CanViewNoveltiesPermission(BasePermission):
    """Permissão para visualizar novelties"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        allowed_groups = ['Diretoria', 'Operacional', 'Gestão', 'IA & Automações']
        user_groups = list(request.user.groups.values_list('name', flat=True))
        
        return any(group in allowed_groups for group in user_groups)

# CORREÇÃO 1: Classe de paginação DRF para NoveltyExecution
class NoveltyExecutionPagination(PageNumberPagination):
    """Paginação personalizada para execuções de novelties"""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class NoveltyExecutionViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar execuções de novelties"""
    queryset = NoveltyExecution.objects.all()
    serializer_class = NoveltyExecutionSerializer
    permission_classes = [IsAuthenticated, CanViewNoveltiesPermission]
    pagination_class = NoveltyExecutionPagination  # CORREÇÃO 1: Paginação DRF
    
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
        """Endpoint para estatísticas do dashboard - MULTI-PAÍS"""
        try:
            # NOVO: Filtro por país
            country_filter = request.query_params.get('country', None)
            
            now = timezone.now()
            today = now.date()
            week_ago = today - timedelta(days=7)
            
            # Estatísticas gerais com filtro
            all_executions = NoveltyExecution.objects.all()
            if country_filter and country_filter != 'all':
                all_executions = all_executions.filter(country=country_filter)
            
            total_executions = all_executions.count()
            
            # Se não há dados, retorna estrutura vazia mas válida
            if total_executions == 0:
                empty_stats = {
                    'total_executions': 0,
                    'total_processed': 0,
                    'total_successful': 0,
                    'total_failed': 0,
                    'success_rate': 0.0,
                    'today_executions': 0,
                    'today_processed': 0,
                    'week_executions': 0,
                    'week_processed': 0,
                    'last_execution_date': None,
                    'last_execution_status': None,
                    'avg_execution_time': 0.0,
                    'daily_stats': [],
                    'status_distribution': {
                        'success': 0,
                        'partial': 0,
                        'failed': 0,
                        'error': 0
                    }
                }
                return Response(empty_stats)
            
            aggregates = all_executions.aggregate(
                total_processed=Sum('total_processed') or 0,
                total_successful=Sum('successful') or 0,
                total_failed=Sum('failed') or 0,
                avg_execution_time=Avg('execution_time') or 0
            )
            
            # Taxa de sucesso geral
            success_rate = 0.0
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
            
            # CORREÇÃO 3: Distribuição por status com códigos padronizados
            status_distribution = {}
            for choice in NoveltyExecution.STATUS_CHOICES:
                status_code, status_name = choice
                count = all_executions.filter(status=status_code).count()
                status_distribution[status_code] = count  # Usar código ao invés do nome
            
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
                'avg_execution_time': round(aggregates['avg_execution_time'] / 60, 2) if aggregates['avg_execution_time'] else 0.0,
                'daily_stats': daily_stats,
                'status_distribution': status_distribution
            }
            
            return Response(stats_data)
            
        except Exception as e:
            print(f"ERROR dashboard_stats: {e}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def receive_execution_data(request):
    """Endpoint para receber dados de execução do Chile Bot"""
    try:
        print(f"📊 Recebendo dados do Chile Bot: {request.data}")
        
        required_fields = ['country', 'total_processed', 'successful', 'failed', 'execution_time']
        for field in required_fields:
            if field not in request.data:
                return Response({
                    'error': f'Campo obrigatório ausente: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
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
    """Retorna execuções recentes - MULTI-PAÍS"""
    try:
        limit = int(request.query_params.get('limit', 10))
        country_filter = request.query_params.get('country', None)
        
        executions = NoveltyExecution.objects.all()
        if country_filter and country_filter != 'all':
            executions = executions.filter(country=country_filter)
            
        executions = executions[:limit]
        serializer = NoveltyExecutionSerializer(executions, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])  
@permission_classes([IsAuthenticated, CanViewNoveltiesPermission])
def execution_trends(request):
    """Retorna dados para gráficos - MULTI-PAÍS"""
    try:
        days = int(request.query_params.get('days', 30))
        country_filter = request.query_params.get('country', None)
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # CORREÇÃO 2: Dados completos para trends com todos os status
        daily_data = []
        for i in range(days):
            date = start_date + timedelta(days=i)
            day_executions = NoveltyExecution.objects.filter(execution_date__date=date)
            
            if country_filter and country_filter != 'all':
                day_executions = day_executions.filter(country=country_filter)
            
            # Contagem por status
            success_count = day_executions.filter(status='success').aggregate(total=Sum('successful'))['total'] or 0
            partial_count = day_executions.filter(status='partial').aggregate(total=Sum('successful'))['total'] or 0
            failed_count = day_executions.filter(status='failed').aggregate(total=Sum('failed'))['total'] or 0
            error_count = day_executions.filter(status='error').aggregate(total=Sum('failed'))['total'] or 0
            
            daily_data.append({
                'date': date.strftime('%Y-%m-%d'),
                'executions': day_executions.count(),
                'total_processed': day_executions.aggregate(total=Sum('total_processed'))['total'] or 0,
                'success': success_count,
                'partial': partial_count,
                'failed': failed_count,
                'error': error_count
            })
        
        return Response({
            'daily_data': daily_data,
            'period': f'{days} dias',
            'country': country_filter or 'all'
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)