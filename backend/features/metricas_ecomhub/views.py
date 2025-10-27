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
from core.middleware.ultra_logging import ultra_logging

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
    def debug_ultra_detalhado(self, request):
        """ENDPOINT ESPECIAL - Debug ultra-detalhado para investigar diferenças LOCAL vs PRODUÇÃO"""
        try:
            # Extrair parâmetros
            data_inicio = request.data.get('data_inicio')
            data_fim = request.data.get('data_fim')
            pais_id = request.data.get('pais_id', 'todos')
            
            ultra_logging.logger.info("🔍 INICIANDO DEBUG ULTRA-DETALHADO POR SOLICITAÇÃO MANUAL")
            ultra_logging.logger.info(f"📅 Parâmetros recebidos: {data_inicio} a {data_fim}, país: {pais_id}")
            
            # Converter strings de data para objetos date
            from datetime import datetime, date
            if isinstance(data_inicio, str):
                data_inicio = datetime.fromisoformat(data_inicio.replace('Z', '')).date()
            if isinstance(data_fim, str):
                data_fim = datetime.fromisoformat(data_fim.replace('Z', '')).date()
            
            # Chamar o serviço de sincronização que já tem ultra logging
            resultado = status_tracking_service.sincronizar_dados_pedidos(
                data_inicio=data_inicio,
                data_fim=data_fim,
                pais_id=pais_id,
                forcar=True  # Sempre forçar para debug
            )
            
            ultra_logging.logger.info(f"✅ DEBUG COMPLETO - Resultado: {resultado.get('status')}")
            
            return Response({
                'status': 'debug_completed',
                'message': 'Debug ultra-detalhado executado. Verifique os logs para detalhes completos.',
                'resultado_sincronizacao': resultado,
                'ambiente_detectado': ultra_logging.ambiente,
                'logs_gerados': 'Consulte os logs do sistema para análise completa',
                'debug_info': {
                    'periodo_analisado': f'{data_inicio} a {data_fim}',
                    'pais_solicitado': pais_id,
                    'timestamp_debug': timezone.now().isoformat()
                }
            })
            
        except Exception as e:
            ultra_logging.log_erro_detalhado(e, "Endpoint debug_ultra_detalhado")
            return Response({
                'status': 'error',
                'message': f'Erro no debug: {str(e)}',
                'ambiente': ultra_logging.ambiente
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
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
                
                logger.info(f"🚀 ECOMHUB DEBUG - Enviando requisição para servidor Selenium")
                logger.info(f"🔍 URL servidor externo: {servidor_externo_url}")
                logger.info(f"📦 Payload completo: {payload}")
                logger.info(f"⏰ Timeout configurado: 1800 segundos")
                
                # Fazer requisição para servidor externo
                response = requests.post(
                    f"{servidor_externo_url}/api/processar-ecomhub/",
                    json=payload,
                    timeout=1800  # 30 minutos timeout
                )
                
                logger.info(f"📡 Resposta recebida - Status Code: {response.status_code}")
                logger.info(f"📄 Headers da resposta: {dict(response.headers)}")
                logger.info(f"📏 Tamanho do conteúdo: {len(response.text)} characters")
                
                if response.status_code == 200:
                    try:
                        resultado = response.json()
                        logger.info(f"✅ JSON decodificado com sucesso")
                        logger.info(f"🔑 Chaves na resposta: {list(resultado.keys()) if isinstance(resultado, dict) else 'Não é dict'}")
                        
                        dados_processados = resultado.get('dados_processados')
                        logger.info(f"📊 Dados processados - Tipo: {type(dados_processados)}")
                        
                        if isinstance(dados_processados, list):
                            logger.info(f"📋 Lista de pedidos - Quantidade: {len(dados_processados)}")
                        elif isinstance(dados_processados, dict):
                            logger.info(f"📋 Dicionário de dados - Chaves: {list(dados_processados.keys())}")
                            if 'pedidos' in dados_processados:
                                pedidos = dados_processados['pedidos']
                                logger.info(f"📋 Pedidos encontrados - Tipo: {type(pedidos)}, Quantidade: {len(pedidos) if isinstance(pedidos, list) else 'N/A'}")
                        else:
                            logger.info(f"⚠️ Dados processados em formato inesperado: {str(dados_processados)[:200]}...")
                        
                        return Response({
                            'status': 'success',
                            'dados_processados': resultado.get('dados_processados'),
                            'estatisticas': resultado.get('estatisticas'),
                            'message': 'Dados processados com sucesso via automação'
                        })
                    except Exception as json_error:
                        logger.error(f"❌ Erro decodificando JSON: {json_error}")
                        logger.error(f"📄 Conteúdo da resposta (primeiros 1000 chars): {response.text[:1000]}")
                        return Response({
                            'status': 'error',
                            'message': f'Erro decodificando resposta JSON: {str(json_error)}'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
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
    
    @action(detail=False, methods=['post'])
    def investigar_ambiente(self, request):
        """
        POST /api/status-tracking/investigar-ambiente/
        Endpoint específico para investigar diferenças entre LOCAL e PRODUÇÃO
        """
        try:
            # Extrair parâmetros (usar padrões se não fornecidos)
            from datetime import date, timedelta
            
            data_inicio = request.data.get('data_inicio')
            data_fim = request.data.get('data_fim')
            pais_id = request.data.get('pais_id', 'todos')
            
            # Converter datas se fornecidas como string
            if isinstance(data_inicio, str):
                data_inicio = date.fromisoformat(data_inicio)
            if isinstance(data_fim, str):
                data_fim = date.fromisoformat(data_fim)
            
            # Usar defaults se não fornecidas
            if not data_inicio:
                data_inicio = date.today() - timedelta(days=7)
            if not data_fim:
                data_fim = date.today()
            
            ultra_logging.logger.info("🕵️ INVESTIGAÇÃO MANUAL DE AMBIENTE INICIADA")
            ultra_logging.logger.info(f"📋 Parâmetros: {data_inicio} a {data_fim}, país: {pais_id}")
            ultra_logging.logger.info(f"🌍 Ambiente atual: {ultra_logging.ambiente}")
            
            # Executar investigação através do serviço com ultra logging
            resultado = status_tracking_service._buscar_dados_api_externa(
                data_inicio, data_fim, pais_id
            )
            
            # Analisar resultado
            analise = {
                'ambiente_detectado': ultra_logging.ambiente,
                'api_respondeu': resultado.get('success', False),
                'tipo_dados': None,
                'quantidade_dados': 0,
                'estrutura_resposta': None,
                'eh_pedidos_individuais': False,
                'eh_dados_agregados': False,
                'problemas_detectados': []
            }
            
            if resultado.get('success'):
                dados = resultado.get('dados_processados', {})
                analise['tipo_dados'] = type(dados).__name__
                
                if isinstance(dados, list):
                    analise['quantidade_dados'] = len(dados)
                    analise['estrutura_resposta'] = 'LISTA'
                    
                    if len(dados) > 0 and isinstance(dados[0], dict):
                        campos = list(dados[0].keys())
                        pedido_fields = ['pedido_id', 'order_id', 'customer_name', 'status']
                        analise['eh_pedidos_individuais'] = any(field in campos for field in pedido_fields)
                        
                elif isinstance(dados, dict):
                    analise['quantidade_dados'] = len(dados.keys())
                    analise['estrutura_resposta'] = 'DICIONÁRIO'
                    analise['chaves_disponiveis'] = list(dados.keys())
                    
                    # Verificar estruturas conhecidas
                    agregado_keys = ['visualizacao_total', 'stats_total', 'visualizacao_otimizada']
                    analise['eh_dados_agregados'] = any(key in dados for key in agregado_keys)
                    
                    if 'pedidos' in dados:
                        pedidos = dados['pedidos']
                        if isinstance(pedidos, list):
                            analise['eh_pedidos_individuais'] = True
                            analise['quantidade_pedidos_individuais'] = len(pedidos)
            else:
                analise['problemas_detectados'].append(resultado.get('message', 'API não respondeu'))
            
            # Comparação com comportamento esperado
            if ultra_logging.ambiente == 'LOCAL':
                if not analise['eh_pedidos_individuais']:
                    analise['problemas_detectados'].append("LOCAL deveria retornar pedidos individuais mas não está retornando")
            elif ultra_logging.ambiente == 'PRODUÇÃO':
                if analise['eh_pedidos_individuais']:
                    analise['problemas_detectados'].append("PRODUÇÃO está retornando pedidos individuais quando deveria retornar apenas dados agregados")
                elif not analise['eh_dados_agregados']:
                    analise['problemas_detectados'].append("PRODUÇÃO deveria retornar dados agregados mas não está retornando")
            
            ultra_logging.logger.info(f"🎯 ANÁLISE COMPLETA: {analise}")
            
            return Response({
                'status': 'investigation_completed',
                'message': 'Investigação de ambiente completa',
                'analise': analise,
                'periodo_investigado': {
                    'data_inicio': data_inicio.isoformat(),
                    'data_fim': data_fim.isoformat(),
                    'pais_id': pais_id
                },
                'resultado_api_externa': resultado,
                'recomendacoes': self._gerar_recomendacoes(analise),
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            ultra_logging.log_erro_detalhado(e, "Endpoint investigar_ambiente")
            return Response({
                'status': 'error',
                'message': f'Erro na investigação: {str(e)}',
                'ambiente': ultra_logging.ambiente
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _gerar_recomendacoes(self, analise):
        """Gera recomendações baseadas na análise do ambiente"""
        recomendacoes = []
        
        ambiente = analise['ambiente_detectado']
        
        if not analise['api_respondeu']:
            recomendacoes.append("🚨 API externa não está respondendo - verificar conectividade")
            recomendacoes.append("🔍 Verificar se o servidor Selenium está online")
            recomendacoes.append("🌐 Confirmar URLs e configurações de rede")
        
        if ambiente == 'LOCAL':
            if not analise['eh_pedidos_individuais']:
                recomendacoes.append("⚠️ LOCAL deveria retornar pedidos individuais")
                recomendacoes.append("🔧 Verificar se API Selenium local está configurada corretamente")
                recomendacoes.append("🧪 Testar endpoint da API Selenium diretamente")
        
        elif ambiente == 'PRODUÇÃO':
            if analise['eh_pedidos_individuais']:
                recomendacoes.append("🎯 PRODUÇÃO está retornando pedidos individuais - isso é inesperado!")
                recomendacoes.append("📊 API externa em produção mudou comportamento?")
            elif not analise['eh_dados_agregados']:
                recomendacoes.append("📊 PRODUÇÃO deveria retornar dados agregados")
                recomendacoes.append("🔍 Verificar configuração da API externa em produção")
        
        if len(analise['problemas_detectados']) > 0:
            recomendacoes.append("🚨 Problemas detectados - consultar logs detalhados")
            recomendacoes.append("📋 Executar comando: python manage.py debug_diferenca_ambientes")
        
        if not recomendacoes:
            recomendacoes.append("✅ Comportamento está de acordo com o esperado para este ambiente")
        
        return recomendacoes
    
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

# ViewSet para gerenciamento de lojas ECOMHUB
from .models import EcomhubStore
from .serializers import EcomhubStoreSerializer, TestConnectionSerializer


class EcomhubStoreViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar lojas ECOMHUB"""
    queryset = EcomhubStore.objects.all()
    serializer_class = EcomhubStoreSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def test_connection(self, request):
        """
        Testa conexão com API ECOMHUB sem salvar
        POST /api/metricas/ecomhub/stores/test_connection/
        Body: {token, secret}
        """
        serializer = TestConnectionSerializer(data=request.data)

        if serializer.is_valid():
            data = serializer.validated_data
            return Response({
                'valid': True,
                'store_id': data['connection_result']['store_id'],
                'myshopify_domain': data['connection_result']['myshopify_domain'],
                'country': {
                    'id': data['country_result']['country_id'],
                    'name': data['country_result']['country_name']
                },
                'message': 'Conexão estabelecida com sucesso!'
            })
        else:
            return Response({
                'valid': False,
                'error': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
