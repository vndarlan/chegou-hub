# backend/features/metricas_ecomhub/views.py - COM SISTEMA COMPLETO DE TRACKING DE STATUS
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
import requests
import logging
from django.conf import settings
from datetime import datetime, timedelta
from django.utils import timezone

from .models import (
    AnaliseEcomhub, PedidoStatusAtual, HistoricoStatus, 
    ConfiguracaoStatusTracking
)
from .serializers import (
    AnaliseEcomhubSerializer, ProcessamentoSeleniumSerializer,
    PedidoStatusAtualSerializer, PedidoStatusResumoSerializer,
    HistoricoStatusSerializer, ConfiguracaoStatusTrackingSerializer,
    DashboardMetricasSerializer, SincronizacaoStatusSerializer,
    FiltrosPedidosSerializer
)
from .services import status_tracking_service

logger = logging.getLogger(__name__)


class PedidosPagination(PageNumberPagination):
    """Paginação customizada para pedidos"""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class AnaliseEcomhubViewSet(viewsets.ModelViewSet):
    serializer_class = AnaliseEcomhubSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AnaliseEcomhub.objects.all().order_by('-atualizado_em')
    
    @action(detail=False, methods=['post'])
    def processar_selenium(self, request):
        """Envia requisição para servidor externo processar via Selenium - COM SUPORTE A TODOS"""
        serializer = ProcessamentoSeleniumSerializer(data=request.data)
        if serializer.is_valid():
            try:
                data = serializer.validated_data
                
                # URL do servidor externo (configurar no settings)
                servidor_externo_url = getattr(settings, 'ECOMHUB_SELENIUM_SERVER', 'http://localhost:8001')
                
                # Payload para servidor externo
                payload = {
                    'data_inicio': data['data_inicio'].isoformat(),
                    'data_fim': data['data_fim'].isoformat(),
                    'pais_id': data['pais_id']  # Agora pode ser 'todos' ou ID específico
                }
                
                logger.info(f"Enviando requisição para servidor Selenium: {payload}")
                
                # Fazer requisição para servidor externo
                response = requests.post(
                    f"{servidor_externo_url}/api/processar-ecomhub/",
                    json=payload,
                    timeout=300  # 5 minutos timeout
                )
                
                if response.status_code == 200:
                    resultado = response.json()
                    
                    return Response({
                        'status': 'success',
                        'dados_processados': resultado.get('dados_processados'),
                        'estatisticas': resultado.get('estatisticas'),
                        'message': 'Dados processados com sucesso via automação'
                    })
                else:
                    logger.error(f"Erro no servidor externo: {response.status_code} - {response.text}")
                    return Response({
                        'status': 'error',
                        'message': f'Erro no servidor de automação: {response.status_code}'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
            except requests.exceptions.Timeout:
                logger.error("Timeout na requisição para servidor externo")
                return Response({
                    'status': 'error',
                    'message': 'Timeout na automação. Tente novamente com período menor.'
                }, status=status.HTTP_408_REQUEST_TIMEOUT)
                
            except requests.exceptions.ConnectionError:
                logger.error("Erro de conexão com servidor externo")
                return Response({
                    'status': 'error',
                    'message': 'Servidor de automação indisponível. Contate o administrador.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
            except Exception as e:
                logger.error(f"Erro inesperado: {e}")
                return Response({
                    'status': 'error',
                    'message': f'Erro inesperado: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StatusTrackingViewSet(viewsets.ViewSet):
    """ViewSet para sistema de tracking de status de pedidos"""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        GET /api/status-tracking/dashboard/
        Retorna métricas do dashboard de status tracking
        """
        try:
            metricas = status_tracking_service.gerar_metricas_dashboard()
            serializer = DashboardMetricasSerializer(metricas)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Erro no dashboard: {e}")
            return Response({
                'error': 'Erro interno do servidor',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def sincronizar(self, request):
        """
        POST /api/status-tracking/sincronizar/
        Executa sincronização manual dos dados
        """
        serializer = SincronizacaoStatusSerializer(data=request.data)
        if serializer.is_valid():
            try:
                data = serializer.validated_data
                
                resultado = status_tracking_service.sincronizar_dados_pedidos(
                    data_inicio=data.get('data_inicio'),
                    data_fim=data.get('data_fim'),
                    pais_id=data.get('pais_id', 'todos'),
                    forcar=data.get('forcar_sincronizacao', False)
                )
                
                if resultado['status'] == 'success':
                    return Response(resultado)
                else:
                    return Response(resultado, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                logger.error(f"Erro na sincronização: {e}")
                return Response({
                    'status': 'error',
                    'message': f'Erro inesperado: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def pedidos(self, request):
        """
        GET /api/status-tracking/pedidos/
        Lista pedidos com filtros, paginação e ordenação - FOCO EM ATIVOS
        """
        try:
            # POR PADRÃO, MOSTRAR APENAS PEDIDOS ATIVOS
            mostrar_finalizados = request.query_params.get('incluir_finalizados', 'false').lower() == 'true'
            
            if mostrar_finalizados:
                queryset = PedidoStatusAtual.objects.all()
            else:
                # FILTRAR APENAS PEDIDOS ATIVOS (padrão)
                queryset = PedidoStatusAtual.objects.exclude(
                    status_atual__in=PedidoStatusAtual.STATUS_FINAIS
                )
            
            # Aplicar filtros usando query parameters
            filtros = FiltrosPedidosSerializer(data=request.query_params)
            if filtros.is_valid():
                data_filtros = filtros.validated_data
                
                if data_filtros.get('pais'):
                    queryset = queryset.filter(pais__icontains=data_filtros['pais'])
                
                if data_filtros.get('status_atual'):
                    queryset = queryset.filter(status_atual__icontains=data_filtros['status_atual'])
                
                if data_filtros.get('nivel_alerta'):
                    queryset = queryset.filter(nivel_alerta=data_filtros['nivel_alerta'])
                
                if data_filtros.get('tempo_minimo'):
                    queryset = queryset.filter(tempo_no_status_atual__gte=data_filtros['tempo_minimo'])
                
                if data_filtros.get('customer_name'):
                    queryset = queryset.filter(customer_name__icontains=data_filtros['customer_name'])
                
                if data_filtros.get('pedido_id'):
                    queryset = queryset.filter(pedido_id__icontains=data_filtros['pedido_id'])
                
                if data_filtros.get('data_criacao_inicio'):
                    queryset = queryset.filter(data_criacao__gte=data_filtros['data_criacao_inicio'])
                
                if data_filtros.get('data_criacao_fim'):
                    queryset = queryset.filter(data_criacao__lte=data_filtros['data_criacao_fim'])
            
            # Ordenação
            ordenacao = request.query_params.get('ordenacao', '-tempo_no_status_atual')
            if ordenacao:
                queryset = queryset.order_by(ordenacao)
            
            # Paginação
            paginator = PedidosPagination()
            paginated_queryset = paginator.paginate_queryset(queryset, request)
            
            # Serializar dados
            serializer = PedidoStatusResumoSerializer(paginated_queryset, many=True)
            
            return paginator.get_paginated_response(serializer.data)
            
        except Exception as e:
            logger.error(f"Erro listando pedidos: {e}")
            return Response({
                'error': 'Erro interno do servidor',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='historico/(?P<pedido_id>[^/.]+)')
    def historico(self, request, pedido_id=None):
        """
        GET /api/status-tracking/historico/{pedido_id}/
        Histórico completo de mudanças de status de um pedido
        """
        try:
            # Buscar pedido
            try:
                pedido = PedidoStatusAtual.objects.get(pedido_id=pedido_id)
            except PedidoStatusAtual.DoesNotExist:
                return Response({
                    'error': 'Pedido não encontrado',
                    'pedido_id': pedido_id
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Buscar histórico
            historico = HistoricoStatus.objects.filter(pedido=pedido).order_by('-data_mudanca')
            
            # Serializar dados
            pedido_serializer = PedidoStatusAtualSerializer(pedido)
            historico_serializer = HistoricoStatusSerializer(historico, many=True)
            
            return Response({
                'pedido': pedido_serializer.data,
                'historico': historico_serializer.data
            })
            
        except Exception as e:
            logger.error(f"Erro no histórico do pedido {pedido_id}: {e}")
            return Response({
                'error': 'Erro interno do servidor',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def configuracao(self, request):
        """GET /api/status-tracking/configuracao/ - Buscar configurações"""
        try:
            config = ConfiguracaoStatusTracking.get_configuracao()
            serializer = ConfiguracaoStatusTrackingSerializer(config)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Erro buscando configuração: {e}")
            return Response({
                'error': 'Erro interno do servidor',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['put'])
    def configuracao_update(self, request):
        """PUT /api/status-tracking/configuracao/ - Atualizar configurações"""
        try:
            config = ConfiguracaoStatusTracking.get_configuracao()
            serializer = ConfiguracaoStatusTrackingSerializer(config, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Erro atualizando configuração: {e}")
            return Response({
                'error': 'Erro interno do servidor',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def atualizar_tempos(self, request):
        """POST /api/status-tracking/atualizar-tempos/ - Atualizar tempos de status"""
        try:
            atualizados = status_tracking_service.atualizar_tempos_status()
            return Response({
                'status': 'success',
                'pedidos_atualizados': atualizados,
                'message': f'{atualizados} pedidos tiveram seus tempos atualizados'
            })
        except Exception as e:
            logger.error(f"Erro atualizando tempos: {e}")
            return Response({
                'error': 'Erro interno do servidor',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def pedidos_problematicos(self, request):
        """
        GET /api/status-tracking/pedidos-problematicos/
        Retorna apenas pedidos com alertas (amarelo, vermelho, crítico)
        """
        try:
            queryset = PedidoStatusAtual.objects.exclude(
                status_atual__in=PedidoStatusAtual.STATUS_FINAIS
            ).filter(
                nivel_alerta__in=['amarelo', 'vermelho', 'critico']
            ).order_by('-tempo_no_status_atual')
            
            # Paginação
            paginator = PedidosPagination()
            paginated_queryset = paginator.paginate_queryset(queryset, request)
            
            # Serializar dados
            serializer = PedidoStatusResumoSerializer(paginated_queryset, many=True)
            
            return paginator.get_paginated_response({
                'resultados': serializer.data,
                'total_problematicos': queryset.count(),
                'distribuicao': {
                    'criticos': queryset.filter(nivel_alerta='critico').count(),
                    'vermelhos': queryset.filter(nivel_alerta='vermelho').count(),
                    'amarelos': queryset.filter(nivel_alerta='amarelo').count()
                }
            })
            
        except Exception as e:
            logger.error(f"Erro listando pedidos problemáticos: {e}")
            return Response({
                'error': 'Erro interno do servidor',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def resumo_eficiencia(self, request):
        """
        GET /api/status-tracking/resumo-eficiencia/
        Retorna resumo de eficiência focado em pedidos ativos vs finalizados
        """
        try:
            # Totais
            total_todos = PedidoStatusAtual.objects.count()
            total_ativos = PedidoStatusAtual.objects.exclude(
                status_atual__in=PedidoStatusAtual.STATUS_FINAIS
            ).count()
            total_finalizados = PedidoStatusAtual.objects.filter(
                status_atual__in=PedidoStatusAtual.STATUS_FINAIS
            ).count()
            
            # Específicos por status final
            entregues = PedidoStatusAtual.objects.filter(status_atual='delivered').count()
            devolvidos = PedidoStatusAtual.objects.filter(status_atual='returned').count()
            cancelados = PedidoStatusAtual.objects.filter(status_atual='cancelled').count()
            
            # Problemas nos ativos
            com_problemas = PedidoStatusAtual.objects.exclude(
                status_atual__in=PedidoStatusAtual.STATUS_FINAIS
            ).filter(
                nivel_alerta__in=['amarelo', 'vermelho', 'critico']
            ).count()
            
            # Cálculos percentuais
            pct_entregues = round((entregues / total_todos * 100) if total_todos > 0 else 0, 1)
            pct_problemas = round((com_problemas / total_ativos * 100) if total_ativos > 0 else 0, 1)
            pct_finalizados = round((total_finalizados / total_todos * 100) if total_todos > 0 else 0, 1)
            
            return Response({
                'totais': {
                    'todos_pedidos': total_todos,
                    'ativos': total_ativos,
                    'finalizados': total_finalizados
                },
                'finalizados_detalhado': {
                    'entregues': entregues,
                    'devolvidos': devolvidos,
                    'cancelados': cancelados
                },
                'problemas_ativos': {
                    'total_com_problemas': com_problemas,
                    'sem_problemas': total_ativos - com_problemas
                },
                'percentuais': {
                    'eficiencia_entrega': pct_entregues,
                    'taxa_problemas': pct_problemas,
                    'taxa_finalizacao': pct_finalizados
                },
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Erro no resumo de eficiência: {e}")
            return Response({
                'error': 'Erro interno do servidor',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PedidoStatusViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para operações CRUD nos pedidos (principalmente leitura)"""
    
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = PedidosPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    
    # Campos para busca textual
    search_fields = ['pedido_id', 'customer_name', 'customer_email', 'produto_nome']
    
    # Campos para ordenação
    ordering_fields = ['tempo_no_status_atual', 'data_criacao', 'updated_at', 'nivel_alerta']
    ordering = ['-tempo_no_status_atual']
    
    def get_queryset(self):
        # POR PADRÃO, MOSTRAR APENAS PEDIDOS ATIVOS
        mostrar_finalizados = self.request.query_params.get('incluir_finalizados', 'false').lower() == 'true'
        
        if mostrar_finalizados:
            queryset = PedidoStatusAtual.objects.all()
        else:
            # FILTRAR APENAS PEDIDOS ATIVOS (padrão)
            queryset = PedidoStatusAtual.objects.exclude(
                status_atual__in=PedidoStatusAtual.STATUS_FINAIS
            )
        
        # Filtros manuais via query parameters
        status_atual = self.request.query_params.get('status_atual')
        if status_atual:
            queryset = queryset.filter(status_atual__icontains=status_atual)
        
        nivel_alerta = self.request.query_params.get('nivel_alerta')
        if nivel_alerta:
            queryset = queryset.filter(nivel_alerta=nivel_alerta)
        
        pais = self.request.query_params.get('pais')
        if pais:
            queryset = queryset.filter(pais__icontains=pais)
        
        tempo_minimo = self.request.query_params.get('tempo_minimo')
        if tempo_minimo:
            try:
                queryset = queryset.filter(tempo_no_status_atual__gte=int(tempo_minimo))
            except ValueError:
                pass
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PedidoStatusResumoSerializer
        return PedidoStatusAtualSerializer