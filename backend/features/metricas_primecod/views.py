from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from core.permissions import IsAdminUser
from .decorators import require_primecod_token
from .pagination import CatalogPagination
from .models import (
    AnalisePrimeCOD,
    StatusMappingPrimeCOD,
    PrimeCODCatalogProduct,
    PrimeCODCatalogSnapshot,
    PrimeCODConfig
)
from .serializers import (
    AnalisePrimeCODSerializer,
    CSVUploadPrimeCODSerializer,
    ProcessarAnalisePrimeCODSerializer,
    StatusMappingPrimeCODSerializer,
    PrimeCODCatalogProductSerializer,
    PrimeCODCatalogProductResumoSerializer,
    PrimeCODCatalogSnapshotSerializer,
    PrimeCODConfigSerializer,
    CatalogSyncLogSerializer
)
import requests
from .utils import PrimeCODProcessor
from .clients.primecod_client import PrimeCODClient, PrimeCODAPIError
import pandas as pd
import json
import re
import logging
from collections import defaultdict
from datetime import date, timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)

class AnalisePrimeCODViewSet(viewsets.ModelViewSet):
    serializer_class = AnalisePrimeCODSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        queryset = AnalisePrimeCOD.objects.all().order_by('-atualizado_em')
        
        # Filtro por tipo para compatibilidade frontend
        tipo = self.request.query_params.get('tipo', None)
        if tipo:
            queryset = queryset.filter(tipo=tipo)
            
        return queryset
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_csv(self, request):
        """Upload e processamento inicial de CSV"""
        serializer = CSVUploadPrimeCODSerializer(data=request.data)
        if serializer.is_valid():
            try:
                df = serializer.process_csv()
                tipo_arquivo = serializer.validated_data['tipo_arquivo']
                
                if tipo_arquivo == 'leads':
                    resultado = PrimeCODProcessor.process_leads_file(df)
                elif tipo_arquivo == 'orders':
                    resultado = PrimeCODProcessor.process_orders_file(df)
                
                return Response({
                    'status': 'success',
                    'tipo': tipo_arquivo,
                    'dados_processados': resultado['dados'],
                    'estatisticas': resultado.get('stats', {}),
                    'status_nao_mapeados': resultado.get('unmapped_statuses', [])
                })
                
            except Exception as e:
                return Response({
                    'status': 'error',
                    'message': f"Erro no processamento: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def processar_analise(self, request):
        """Processa dados e salva análise completa"""
        serializer = ProcessarAnalisePrimeCODSerializer(data=request.data)
        if serializer.is_valid():
            try:
                data = serializer.validated_data
                
                # Criar análise combinada
                resultado = self._criar_analise_primecod(data)
                
                # Salvar análise
                analise_data = {
                    'nome': data['nome_analise'],
                    'tipo': data.get('tipo', 'PRIMECOD'),
                    'criado_por': request.user
                }
                
                # Compatibilidade: aceitar dados_processados ou campos separados
                if data.get('dados_processados'):
                    analise_data['dados_processados'] = data['dados_processados']
                    # Também popular campos específicos se possível
                    if data.get('dados_leads'):
                        analise_data['dados_leads'] = data['dados_leads']
                    if data.get('dados_orders'):
                        analise_data['dados_orders'] = data['dados_orders']
                else:
                    # Modo legacy
                    analise_data['dados_leads'] = data.get('dados_leads')
                    analise_data['dados_orders'] = data.get('dados_orders')
                
                # Adicionar dados de efetividade se calculados
                if resultado.get('dados_efetividade'):
                    analise_data['dados_efetividade'] = resultado['dados_efetividade']
                    # Se não tem dados_processados, usar efetividade
                    if not analise_data.get('dados_processados'):
                        analise_data['dados_processados'] = resultado['dados_efetividade']
                
                analise = AnalisePrimeCOD.objects.create(**analise_data)
                
                # Serializar resposta com compatibilidade
                serializer = AnalisePrimeCODSerializer(analise)
                return Response({
                    'status': 'success',
                    'analise_id': analise.id,
                    'analise': serializer.data,
                    'message': f"Análise '{analise.nome}' salva com sucesso!"
                })
                
            except Exception as e:
                return Response({
                    'status': 'error',
                    'message': f"Erro ao processar análise: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _criar_analise_primecod(self, data):
        """Cria análise combinada Prime COD"""
        leads_data = data['dados_leads']
        orders_data = data.get('dados_orders', {})
        
        if not orders_data:
            return {'dados_efetividade': None}
        
        # Criar tabela de efetividade
        efetividade_data = []
        
        for lead_row in leads_data:
            if lead_row["Product"] == "Total":
                continue
                
            product = lead_row["Product"]
            confirmed = lead_row["Confirmed"]
            total_minus_dup = lead_row["Total - duplicados"]
            
            order_info = orders_data.get(product, {})
            delivered = order_info.get("Delivered", 0)
            
            efetividade = (delivered / total_minus_dup * 100) if total_minus_dup > 0 else 0
            
            row = {
                "Product": product,
                "Confirmed (Leads)": confirmed,
                "Delivered": delivered,
                **{k: v for k, v in order_info.items() if k != "Delivered"},
                "Efetividade": f"{efetividade:.0f}%"
            }
            efetividade_data.append(row)
        
        # Adicionar totais para efetividade
        if efetividade_data:
            totals = {"Product": "Total"}
            numeric_cols = [k for k in efetividade_data[0].keys() if k not in ["Product", "Efetividade"]]
            
            for col in numeric_cols:
                totals[col] = sum(row[col] for row in efetividade_data)
            
            total_delivered = totals["Delivered"]
            total_leads = sum(row["Total - duplicados"] for row in leads_data if row["Product"] != "Total")
            efetividade_media = (total_delivered / total_leads * 100) if total_leads > 0 else 0
            totals["Efetividade"] = f"{efetividade_media:.0f}% (Média)"
            
            efetividade_data.append(totals)
        
        return {'dados_efetividade': efetividade_data}

class StatusMappingPrimeCODViewSet(viewsets.ModelViewSet):
    queryset = StatusMappingPrimeCOD.objects.all()
    serializer_class = StatusMappingPrimeCODSerializer
    permission_classes = [IsAdminUser]


# ===== ENDPOINTS PROXY PARA API PRIMECOD =====

@api_view(['POST'])
@require_primecod_token
def buscar_orders_primecod(request):
    """
    Proxy para buscar orders da API PrimeCOD de forma segura
    Substitui chamadas diretas do frontend para a API externa
    """
    print("[CRITICAL] PRIMECOD VIEW CHAMADA!")
    logger.error("[CRITICAL] PRIMECOD VIEW CHAMADA!")

    # Verificar autenticação manualmente
    logger.error(f"User authenticated: {request.user.is_authenticated}")
    logger.error(f"User: {request.user}")

    if not request.user.is_authenticated:
        logger.error("[EMOJI] Usuario nao autenticado!")
        return Response({
            'status': 'error',
            'message': 'Usuário não autenticado'
        }, status=status.HTTP_401_UNAUTHORIZED)

    try:
        logger.info("=== INÍCIO DA BUSCA PRIMECOD ===")

        # Extrair parâmetros da requisição
        data_inicio = request.data.get('data_inicio')
        data_fim = request.data.get('data_fim')
        pais_filtro = request.data.get('pais_filtro')
        max_paginas = request.data.get('max_paginas', 99999)  # SEM LIMITES! Coletar TUDO

        logger.info(f"Usuário: {request.user.username}")
        logger.info(f"Parâmetros recebidos: data_inicio={data_inicio}, data_fim={data_fim}, pais_filtro={pais_filtro}")
        logger.info(f"[SUCCESS] SEM LIMITES: max_paginas={max_paginas} - coletará TUDO até não haver mais dados")
        logger.info(f"[SUCCESS] ULTRA-OTIMIZAÇÃO: Rate limit 50ms (4x mais rápido) + Heartbeat logs!")
        logger.info(f"Request data completo: {request.data}")

        # Validar parâmetros
        if not data_inicio or not data_fim:
            logger.error("Parâmetros obrigatórios ausentes")
            return Response({
                'status': 'error',
                'message': 'Parâmetros data_inicio e data_fim são obrigatórios'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Inicializar cliente PrimeCOD
        logger.info("Inicializando cliente PrimeCOD...")
        try:
            client = PrimeCODClient()
            logger.info("Cliente PrimeCOD inicializado com sucesso")
        except PrimeCODAPIError as e:
            logger.error(f"Erro ao inicializar cliente PrimeCOD: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Erro de configuração da API PrimeCOD. Contate o administrador.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Preparar filtro de data
        date_range = {
            'start': data_inicio,
            'end': data_fim
        }
        
        logger.info(f"Date range preparado: {date_range}")
        
        # Buscar orders com paginação progressiva
        logger.info("Iniciando busca de orders via API...")
        try:
            # LOG CRÍTICO: Monitorar se está próximo de timeout
            import time
            start_time = time.time()
            logger.info(f"[TIME] INICIANDO COLETA - Hora de início: {start_time}")
            
            # Normalizar pais_filtro para None se for "todos"
            country_filter_normalized = None
            if pais_filtro and pais_filtro.lower().strip() not in ['todos', 'all', 'todos os países', 'all countries', '']:
                country_filter_normalized = pais_filtro
                logger.info(f"[FILTRO] País específico selecionado: {pais_filtro}")
            else:
                logger.info(f"[FILTRO] Todos os países selecionado (pais_filtro={pais_filtro})")

            resultado = client.get_orders(
                page=1,
                date_range=date_range,
                max_pages=max_paginas,
                country_filter=country_filter_normalized
            )
            
            # LOG DE DEBUG DETALHADO: Verificar o que retornou da API
            logger.info(f"[DEBUG] RESULTADO DA API PrimeCOD:")
            logger.info(f"[DEBUG]   - Tipo: {type(resultado)}")
            logger.info(f"[DEBUG]   - Keys: {list(resultado.keys()) if isinstance(resultado, dict) else 'Não é dict'}")
            
            if isinstance(resultado, dict):
                logger.info(f"[DEBUG]   - Total orders brutos: {resultado.get('total_orders_raw', 'N/A')}")
                logger.info(f"[DEBUG]   - Total orders filtrados: {resultado.get('total_orders', 'N/A')}")
                logger.info(f"[DEBUG]   - Status da resposta: {resultado.get('status', 'N/A')}")
                logger.info(f"[DEBUG]   - Páginas processadas: {resultado.get('pages_processed', 'N/A')}")
                logger.info(f"[DEBUG]   - Filtros aplicados via JSON: {resultado.get('filtros_payload_json_aplicados', 'N/A')}")
                logger.info(f"[DEBUG]   - Filtro de data aplicado: {resultado.get('date_range_applied', 'N/A')}")
                logger.info(f"[DEBUG]   - Filtro de país aplicado: {resultado.get('country_filter_applied', 'N/A')}")
                
                if 'orders' in resultado:
                    orders_count = len(resultado['orders'])
                    logger.info(f"[DEBUG]   - Número de orders retornados: {orders_count}")
                    
                    if resultado['orders']:
                        first_order = resultado['orders'][0]
                        logger.info(f"[DEBUG]   - Primeiro order:")
                        logger.info(f"[DEBUG]     * ID: {first_order.get('id', 'N/A')}")
                        logger.info(f"[DEBUG]     * Status: {first_order.get('shipping_status', 'N/A')}")
                        logger.info(f"[DEBUG]     * País: {first_order.get('country', {}).get('name', 'N/A') if isinstance(first_order.get('country'), dict) else first_order.get('country', 'N/A')}")
                        logger.info(f"[DEBUG]     * Produtos: {len(first_order.get('products', []))}")
                        if first_order.get('products'):
                            first_product = first_order['products'][0]
                            logger.info(f"[DEBUG]     * Primeiro produto: {first_product.get('name', 'N/A')}")
                    
                    # Verificação crítica: Se período grande retornou 0 orders
                    if orders_count == 0 and data_inicio and data_fim:
                        from datetime import datetime
                        try:
                            start_date = datetime.strptime(data_inicio, '%Y-%m-%d')
                            end_date = datetime.strptime(data_fim, '%Y-%m-%d')
                            days_diff = (end_date - start_date).days
                            
                            if days_diff > 7:
                                logger.error(f"[CRITICAL] PROBLEMA DETECTADO:")
                                logger.error(f"[CRITICAL]   - Período solicitado: {days_diff} dias")
                                logger.error(f"[CRITICAL]   - Orders retornados: 0")
                                logger.error(f"[CRITICAL]   - Filtro via JSON aplicado: {resultado.get('filtros_payload_json_aplicados', False)}")
                                logger.error(f"[CRITICAL]   - Possível causa: API não aceita filtros de data para períodos grandes")
                        except Exception as e:
                            logger.warning(f"[DEBUG] Erro ao calcular diferença de dias: {str(e)}")
                else:
                    logger.warning(f"[WARNING] Chave 'orders' não encontrada no resultado!")
            
            # LOG CRÍTICO: Tempo total gasto
            end_time = time.time()
            duration = end_time - start_time
            logger.info(f"[TIME] COLETA FINALIZADA - Duração total: {duration:.2f} segundos")
            
            # LOG INFORMATIVO: Apenas registrar duração (sem alertas de timeout)
            logger.info(f"[SUCCESS] Coleta finalizada em {duration:.2f}s - sucesso!")
            if duration > 60:  # Apenas informativo para coletas longas
                logger.info(f"[SUCCESS] Coleta longa ({duration:.1f}s) - consideração: usar processamento assíncrono para UX")
            logger.info(f"Busca concluída. Resultado: {type(resultado)}")
            logger.info(f"Keys do resultado: {list(resultado.keys()) if isinstance(resultado, dict) else 'Não é dict'}")
            
            # Processar os dados dos orders (filtros já aplicados pela API)
            logger.info(f"[SUCCESS] DEBUG VIEW: Processando {len(resultado['orders'])} orders (filtrados pela API)")
            orders_processados = client.process_orders_data(
                orders=resultado['orders'],  # Orders já filtrados pela API
                pais_filtro=None  # NÃO reaplicar filtro - API já filtrou
            )
            
            logger.info(f"[SUCCESS] DEBUG VIEW: Dados processados - {len(orders_processados['dados_processados'])} linhas")
            logger.info(f"[SUCCESS] DEBUG VIEW: Primeira linha: {orders_processados['dados_processados'][0] if orders_processados['dados_processados'] else 'Nenhuma'}")
            
            # LOG DE DEBUG: Verificar estatísticas do processamento
            if 'estatisticas' in orders_processados:
                stats = orders_processados['estatisticas']
                logger.info(f"[DEBUG] Estatísticas do processamento:")
                logger.info(f"   - Total orders: {stats.get('total_orders', 'N/A')}")
                logger.info(f"   - Produtos únicos: {stats.get('produtos_unicos', 'N/A')}")
                logger.info(f"   - Países únicos: {stats.get('paises_unicos', 'N/A')}")
                logger.info(f"   - Status únicos: {stats.get('status_unicos', 'N/A')}")
                
            # LOG DE DEBUG: Verificar alguns orders individualmente
            if resultado['orders']:
                for i, order in enumerate(resultado['orders'][:3]):  # Primeiros 3 orders
                    logger.info(f"[DEBUG] Order {i+1}:")
                    logger.info(f"   - ID: {order.get('id', 'N/A')}")
                    logger.info(f"   - Status original: {order.get('shipping_status', 'N/A')}")
                    logger.info(f"   - País: {order.get('country', 'N/A')}")
                    logger.info(f"   - Produtos: {[p.get('name', 'N/A') for p in order.get('products', [])]}")
                    
            # LOG DE DEBUG: Verificar linha TOTAL nos dados processados
            total_row = next((item for item in orders_processados['dados_processados'] if item.get('produto') == 'TOTAL'), None)
            if total_row:
                logger.info(f"[DEBUG] LINHA TOTAL encontrada: {total_row}")
            else:
                logger.warning(f"[WARNING] LINHA TOTAL não encontrada nos dados processados!")
            
            # Combinar resultados
            resposta = {
                'status': 'success',
                'dados_brutos': {
                    'total_orders_raw': resultado.get('total_orders_raw', resultado['total_orders']),
                    'total_orders_filtered': resultado['total_orders'],
                    'pages_processed': resultado['pages_processed'],
                    'date_range_applied': resultado['date_range_applied'],
                    'country_filter_applied': resultado.get('country_filter_applied'),
                    'data_source': resultado.get('data_source', 'api')
                },
                'dados_processados': orders_processados['dados_processados'],
                'estatisticas': orders_processados['estatisticas'],
                'status_nao_mapeados': orders_processados['status_nao_mapeados'],
                'message': f"Busca concluída em {duration:.1f}s: {resultado.get('total_orders_raw', resultado['total_orders'])} orders coletados, {resultado['total_orders']} após filtros" + (f" (filtro de data aplicado {'via API' if resultado.get('filtros_payload_json_aplicados') else 'localmente'})" if resultado.get('date_range_applied') else "")
            }
            
            logger.info(f"Busca PrimeCOD concluída para {request.user.username}: {resultado['total_orders']} orders")
            return Response(resposta)
            
        except PrimeCODAPIError as e:
            logger.error(f"Erro na API PrimeCOD ao buscar orders: {str(e)}")
            # Mensagens específicas baseadas no tipo de erro
            error_msg = str(e)
            if "401" in error_msg or "inválido" in error_msg.lower():
                message = "Token de autenticação inválido ou expirado. Verifique a configuração em: Fornecedor > PrimeCOD > Configuração"
            elif "429" in error_msg or "rate limit" in error_msg.lower():
                message = "Limite de requisições excedido na API PrimeCOD. Aguarde alguns minutos e tente novamente."
            elif "timeout" in error_msg.lower() or "conectividade" in error_msg.lower():
                message = "Erro de conexão com a API PrimeCOD. Verifique sua conexão com a internet e tente novamente."
            else:
                message = f"Erro ao buscar dados da API PrimeCOD: {error_msg}"

            return Response({
                'status': 'error',
                'message': message
            }, status=status.HTTP_502_BAD_GATEWAY)
            
    except Exception as e:
        logger.error(f"Erro inesperado em buscar_orders_primecod: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'Erro interno do servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
@require_primecod_token
def processar_dados_primecod(request):
    """
    Processa dados já buscados da API PrimeCOD
    Permite reprocessamento com diferentes filtros sem nova busca na API
    """
    try:
        # Extrair dados da requisição
        orders_data = request.data.get('orders_data', [])
        pais_filtro = request.data.get('pais_filtro')
        nome_analise = request.data.get('nome_analise')

        if not orders_data:
            return Response({
                'status': 'error',
                'message': 'Dados de orders são obrigatórios para processamento'
            }, status=status.HTTP_400_BAD_REQUEST)

        logger.info(f"Processamento de dados PrimeCOD para {request.user.username}: {len(orders_data)} orders")
        
        # Inicializar cliente para processar dados
        try:
            client = PrimeCODClient()
        except PrimeCODAPIError as e:
            logger.error(f"Erro ao inicializar cliente PrimeCOD: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Erro de configuração da API PrimeCOD. Contate o administrador.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Processar dados
        resultado = client.process_orders_data(
            orders=orders_data,
            pais_filtro=pais_filtro
        )
        
        # Se nome_analise foi fornecido, salvar a análise
        if nome_analise:
            try:
                analise = AnalisePrimeCOD.objects.create(
                    nome=nome_analise,
                    tipo='PRIMECOD_API',
                    criado_por=request.user,
                    dados_processados=resultado['dados_processados'],
                    dados_orders=orders_data  # Manter dados originais também
                )
                
                serializer = AnalisePrimeCODSerializer(analise)
                
                return Response({
                    'status': 'success',
                    'analise_salva': True,
                    'analise_id': analise.id,
                    'analise': serializer.data,
                    'dados_processados': resultado['dados_processados'],
                    'estatisticas': resultado['estatisticas'],
                    'status_nao_mapeados': resultado['status_nao_mapeados'],
                    'message': f"Análise '{nome_analise}' salva com sucesso!"
                })
                
            except Exception as e:
                logger.error(f"Erro ao salvar análise: {str(e)}")
                # Retornar dados processados mesmo se falhou ao salvar
                return Response({
                    'status': 'warning',
                    'analise_salva': False,
                    'dados_processados': resultado['dados_processados'],
                    'estatisticas': resultado['estatisticas'],
                    'status_nao_mapeados': resultado['status_nao_mapeados'],
                    'message': f"Dados processados com sucesso, mas erro ao salvar: {str(e)}"
                })
        
        # Retornar apenas dados processados
        return Response({
            'status': 'success',
            'analise_salva': False,
            'dados_processados': resultado['dados_processados'],
            'estatisticas': resultado['estatisticas'],
            'status_nao_mapeados': resultado['status_nao_mapeados'],
            'message': 'Dados processados com sucesso'
        })
        
    except Exception as e:
        logger.error(f"Erro em processar_dados_primecod: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'Erro ao processar dados: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
@require_primecod_token
def testar_performance_primecod(request):
    """
    Testa performance comparativa: Paginação vs Coleta Completa
    Período de teste: 2025-08-01 a 2025-09-10 (como solicitado)
    """
    try:
        # Extrair período do request ou usar padrão
        data_inicio = request.data.get('data_inicio', '2025-08-01')
        data_fim = request.data.get('data_fim', '2025-09-10')

        logger.info(f"=== TESTE DE PERFORMANCE PRIMECOD ===")
        logger.info(f"Usuário: {request.user.username}")
        logger.info(f"Período: {data_inicio} até {data_fim}")
        
        # Importar teste de performance
        from .clients.performance_test import PrimeCODPerformanceTest
        
        # Executar teste comparativo
        teste = PrimeCODPerformanceTest()
        
        date_range = {
            'start': data_inicio,
            'end': data_fim
        }
        
        resultado_comparacao = teste.run_performance_comparison(date_range)
        
        return Response({
            'status': 'success',
            'periodo_testado': f"{data_inicio} até {data_fim}",
            'usuario': request.user.username,
            'resultado': resultado_comparacao,
            'message': f'Teste de performance concluído para período {data_inicio} - {data_fim}'
        })
        
    except Exception as e:
        logger.error(f"Erro em testar_performance_primecod: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'Erro no teste de performance: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
@require_primecod_token
def testar_conexao_primecod(request):
    """
    Testa conectividade com API PrimeCOD
    Endpoint útil para verificar se as credenciais estão funcionando
    """
    try:
        
        client = PrimeCODClient()
        resultado = client.test_connection()
        
        if resultado['status'] == 'success':
            return Response(resultado)
        else:
            return Response(resultado, status=status.HTTP_502_BAD_GATEWAY)
            
    except PrimeCODAPIError as e:
        logger.error(f"Erro PrimeCOD API: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_502_BAD_GATEWAY)
    except Exception as e:
        logger.error(f"Erro inesperado em testar_conexao_primecod: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'Erro inesperado: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
@require_primecod_token
def iniciar_coleta_async_primecod(request):
    """
    Inicia coleta assíncrona de orders PrimeCOD usando Django-RQ
    Evita timeouts do worker permitindo coletas longas em background
    """
    try:
        # Extrair parâmetros da requisição
        data_inicio = request.data.get('data_inicio')
        data_fim = request.data.get('data_fim')
        pais_filtro = request.data.get('pais_filtro')
        max_paginas = request.data.get('max_paginas', 1000)  # [SUCCESS] ULTRA-OTIMIZADO: 1000+ páginas sem timeout
        nome_analise = request.data.get('nome_analise')

        logger.info(f"Iniciando coleta assíncrona PrimeCOD para {request.user.username}")
        logger.info(f"Parâmetros: data_inicio={data_inicio}, data_fim={data_fim}, pais_filtro={pais_filtro}")
        logger.info(f"[SUCCESS] ULTRA-OTIMIZADO: {max_paginas} páginas com rate limit 50ms + heartbeat logs")

        # Validar parâmetros obrigatórios
        if not data_inicio or not data_fim:
            return Response({
                'status': 'error',
                'message': 'Parâmetros data_inicio e data_fim são obrigatórios'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar se Django-RQ está disponível
        try:
            import django_rq
            from .jobs import coletar_orders_primecod_async
            
            # Obter queue
            queue = django_rq.get_queue('default')
            
            # Criar job assíncrono com timeout inteligente
            job = queue.enqueue(
                coletar_orders_primecod_async,
                user_id=request.user.id,
                data_inicio=data_inicio,
                data_fim=data_fim,
                pais_filtro=pais_filtro,
                max_paginas=max_paginas,
                nome_analise=nome_analise,
                timeout_limite=20 * 60,  # 20 minutos de coleta (10 min buffer)
                job_timeout='30m',       # 30 minutos totais para job
                result_ttl='2h',         # Manter resultado por 2 horas
                failure_ttl='1h'         # Manter erros por 1 hora
            )
            
            # Atualizar job com seu próprio ID para tracking
            job.meta['job_id'] = job.id
            job.save_meta()
            
            logger.info(f"Job assíncrono criado: {job.id} para usuário {request.user.username}")
            
            return Response({
                'status': 'success',
                'job_id': job.id,
                'message': 'Coleta assíncrona iniciada! Use o endpoint de status para acompanhar.',
                'estimated_time': 'Estimativa: 10-15 minutos para coleta completa',
                'progress_endpoint': f'/api/metricas/primecod/status-job/{job.id}/'
            })
            
        except ImportError:
            # Fallback: se RQ não disponível, usar coleta síncrona limitada
            logger.warning("Django-RQ não disponível, usando coleta síncrona limitada")
            
            # Manter limite do usuário mesmo no fallback síncrono
            max_paginas_sync = max_paginas
            logger.info(f"Fallback síncrono: coletando {max_paginas_sync} páginas conforme solicitado")
            
            # Fazer coleta síncrona
            client = PrimeCODClient()
            
            date_range = {
                'start': data_inicio,
                'end': data_fim
            }
            
            resultado = client.get_orders(
                page=1,
                date_range=date_range,
                max_pages=max_paginas_sync,
                country_filter=pais_filtro
            )
            
            # Processar dados
            orders_processados = client.process_orders_data(
                orders=resultado['orders'],
                pais_filtro=None
            )
            
            return Response({
                'status': 'success',
                'sync_fallback': True,
                'dados_brutos': {
                    'total_orders_raw': resultado.get('total_orders_raw', resultado['total_orders']),
                    'total_orders_filtered': resultado['total_orders'],
                    'pages_processed': resultado['pages_processed'],
                    'max_pages_limit': max_paginas_sync,
                    'date_range_applied': resultado['date_range_applied'],
                    'country_filter_applied': resultado.get('country_filter_applied'),
                    'data_source': 'sync_fallback'
                },
                'dados_processados': orders_processados['dados_processados'],
                'estatisticas': orders_processados['estatisticas'],
                'status_nao_mapeados': orders_processados['status_nao_mapeados'],
                'message': f'RQ indisponível - coleta síncrona limitada: {resultado["total_orders"]} orders de {max_paginas_sync} páginas'
            })
            
    except Exception as e:
        logger.error(f"Erro em iniciar_coleta_async_primecod: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'Erro ao iniciar coleta assíncrona: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def status_job_primecod(request, job_id):
    """
    Verifica status de job assíncrono PrimeCOD
    """
    try:
        # Verificar cache de progresso primeiro
        from django.core.cache import cache
        progress_key = f"primecod_job_progress_{job_id}"
        progress = cache.get(progress_key)
        
        if progress:
            return Response({
                'status': 'success',
                'job_id': job_id,
                'job_status': progress.get('status', 'unknown'),
                'progress': progress,
                'cache_source': True
            })
        
        # Tentar buscar via Django-RQ
        try:
            import django_rq
            from rq.job import Job
            
            # Obter queue e job
            queue = django_rq.get_queue('default')
            job = Job.fetch(job_id, connection=queue.connection)
            
            # Status mapping RQ -> frontend
            status_map = {
                'queued': 'pendente',
                'started': 'executando', 
                'finished': 'concluido',
                'failed': 'erro',
                'deferred': 'adiado',
                'canceled': 'cancelado'
            }
            
            job_status = status_map.get(job.status, job.status)
            
            response_data = {
                'status': 'success',
                'job_id': job_id,
                'job_status': job_status,
                'created_at': job.created_at.isoformat() if job.created_at else None,
                'started_at': job.started_at.isoformat() if job.started_at else None,
                'ended_at': job.ended_at.isoformat() if job.ended_at else None,
                'cache_source': False
            }
            
            # Se job finalizado, incluir resultado
            if job.status == 'finished' and job.result:
                response_data['resultado'] = job.result
            elif job.status == 'failed':
                response_data['error'] = str(job.exc_info) if job.exc_info else 'Erro desconhecido'
            
            return Response(response_data)
            
        except ImportError:
            return Response({
                'status': 'error',
                'message': 'Django-RQ não disponível para verificar status'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            return Response({
                'status': 'error',
                'job_id': job_id,
                'message': f'Job não encontrado ou erro: {str(e)}'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"Erro em status_job_primecod: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'Erro ao verificar status: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===========================================
# VIEWSET PARA CATÁLOGO PRIMECOD
# ===========================================

class PrimeCODCatalogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para catálogo de produtos PrimeCOD

    Endpoints:
    - GET /api/primecod/catalog/ - Lista todos produtos com variações
    - GET /api/primecod/catalog/{id}/ - Detalhes de um produto
    - POST /api/primecod/catalog/sync/ - Força sincronização manual

    Filtros disponíveis:
    - country: Filtra por país (ex: ?country=Brazil)
    - stock_label: Filtra por nível de estoque (High/Medium/Low)
    - is_new: Filtra produtos novos (true/false)
    - search: Busca por nome ou SKU

    Ordenação:
    - ordering: total_units_sold, quantity, name, -updated_at (- para descendente)

    Paginação:
    - page_size: 10 produtos por página (padrão)
    - Customizável via ?page_size=N (máximo 100)
    """

    permission_classes = [IsAdminUser]
    pagination_class = CatalogPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'sku', 'description']
    ordering_fields = ['total_units_sold', 'quantity', 'name', 'updated_at', 'price', 'cost']
    ordering = ['-total_units_sold']  # Padrão: ordenar por mais vendidos

    def get_queryset(self):
        """
        Retorna queryset com filtros aplicados
        """
        queryset = PrimeCODCatalogProduct.objects.all()

        # Filtro por país
        country = self.request.query_params.get('country', None)
        if country:
            # Filtra produtos que contêm o país na lista de países disponíveis
            queryset = queryset.filter(countries__icontains=country)

        # Filtro por nível de estoque
        stock_label = self.request.query_params.get('stock_label', None)
        if stock_label:
            queryset = queryset.filter(stock_label__iexact=stock_label)

        # Filtro por produtos novos
        is_new = self.request.query_params.get('is_new', None)
        if is_new is not None:
            is_new_bool = is_new.lower() in ['true', '1', 'yes']
            queryset = queryset.filter(is_new=is_new_bool)

        # Prefetch snapshots para otimizar cálculo de deltas
        queryset = queryset.prefetch_related('snapshots')

        return queryset

    def get_serializer_class(self):
        """
        Usa serializer resumido para listagem, completo para detalhes
        """
        if self.action == 'list':
            return PrimeCODCatalogProductResumoSerializer
        return PrimeCODCatalogProductSerializer

    @action(detail=False, methods=['post'])
    def sync(self, request):
        """
        Força sincronização manual do catálogo PrimeCOD

        Body (todos opcionais):
        {
            "force": true,  // Força sync mesmo se recente
            "create_snapshot": true  // Cria snapshot após sync
        }
        """
        # Validar token antes de processar
        token = PrimeCODConfig.get_token()
        if not token:
            return Response({
                'status': 'error',
                'message': 'Token da API não configurado. Configure em: Fornecedor > PrimeCOD > Configuração',
                'configured': False
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            force = request.data.get('force', False)
            create_snapshot = request.data.get('create_snapshot', True)

            logger.info(f"Iniciando sync manual do catálogo PrimeCOD - Usuário: {request.user.username}")

            # Chamar job de sincronização
            from .jobs import sync_primecod_catalog

            resultado = sync_primecod_catalog()

            if resultado.get('status') == 'success':
                return Response(resultado)
            else:
                return Response(resultado, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            logger.error(f"Erro em sync manual do catálogo: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'Erro ao sincronizar catálogo: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Retorna estatísticas gerais do catálogo

        Response:
        {
            "total_products": 150,
            "new_products": 12,
            "by_stock_level": {
                "High": 80,
                "Medium": 50,
                "Low": 20
            },
            "by_country": {
                "Brazil": 100,
                "Portugal": 80
            },
            "top_selling": [...],  // Top 10 produtos mais vendidos
            "low_stock_alerts": [...]  // Produtos com estoque baixo
        }
        """
        try:
            queryset = self.get_queryset()

            # Estatísticas básicas
            total_products = queryset.count()
            new_products = queryset.filter(is_new=True).count()

            # Distribuição por nível de estoque
            by_stock_level = {}
            for label in ['High', 'Medium', 'Low']:
                count = queryset.filter(stock_label=label).count()
                if count > 0:
                    by_stock_level[label] = count

            # Top 10 mais vendidos
            top_selling = queryset.order_by('-total_units_sold')[:10]
            top_selling_data = PrimeCODCatalogProductResumoSerializer(top_selling, many=True).data

            # Produtos com estoque baixo (Low + menos de 10 unidades)
            low_stock = queryset.filter(stock_label='Low', quantity__lt=10)
            low_stock_data = PrimeCODCatalogProductResumoSerializer(low_stock, many=True).data

            # Distribuição por país (análise do campo JSON countries)
            by_country = {}
            for product in queryset:
                if product.countries:
                    for country in product.countries:
                        country_name = country if isinstance(country, str) else country.get('name', 'Unknown')
                        by_country[country_name] = by_country.get(country_name, 0) + 1

            return Response({
                'status': 'success',
                'total_products': total_products,
                'new_products': new_products,
                'by_stock_level': by_stock_level,
                'by_country': by_country,
                'top_selling': top_selling_data,
                'low_stock_alerts': low_stock_data
            })

        except Exception as e:
            logger.error(f"Erro ao calcular estatísticas do catálogo: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'Erro ao calcular estatísticas: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Retorna histórico de snapshots de um produto específico

        Query params:
        - days: número de dias de histórico (padrão: 30)
        """
        try:
            product = self.get_object()
            days = int(request.query_params.get('days', 30))

            # Buscar snapshots dos últimos N dias
            since_date = date.today() - timedelta(days=days)
            snapshots = product.snapshots.filter(
                snapshot_date__gte=since_date
            ).order_by('-snapshot_date')

            serializer = PrimeCODCatalogSnapshotSerializer(snapshots, many=True)

            return Response({
                'status': 'success',
                'product_id': product.id,
                'product_sku': product.sku,
                'product_name': product.name,
                'days_requested': days,
                'snapshots_count': snapshots.count(),
                'snapshots': serializer.data
            })

        except Exception as e:
            logger.error(f"Erro ao buscar histórico do produto {pk}: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'Erro ao buscar histórico: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===========================================
# ENDPOINTS PARA CONFIGURAÇÃO PRIMECOD
# ===========================================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_primecod_config(request):
    """
    Retorna a configuração atual da API PrimeCOD (token mascarado)
    """
    try:
        config = PrimeCODConfig.get_config()

        if config:
            serializer = PrimeCODConfigSerializer(config)
            return Response({
                'status': 'success',
                'configured': True,
                'config': serializer.data
            })
        else:
            return Response({
                'status': 'success',
                'configured': False,
                'config': None,
                'message': 'Nenhuma configuração encontrada'
            })

    except Exception as e:
        logger.error(f"Erro ao buscar config PrimeCOD: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'Erro ao buscar configuração: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def testar_token_primecod(request):
    """
    Testa um token da API PrimeCOD antes de salvar
    Faz uma requisição ao endpoint de catálogo para validar
    """
    try:
        token = request.data.get('api_token')

        if not token:
            return Response({
                'status': 'error',
                'message': 'Token é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Testar token fazendo requisição ao endpoint de catálogo
        try:
            response = requests.post(
                "https://api.primecod.app/api/catalog/products",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                params={"page": 1},
                json={},
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                total_products = data.get('total', 0)
                return Response({
                    'status': 'success',
                    'valid': True,
                    'message': 'Token válido!',
                    'total_products': total_products
                })
            elif response.status_code == 401:
                return Response({
                    'status': 'error',
                    'valid': False,
                    'message': 'Token inválido ou expirado'
                })
            elif response.status_code == 429:
                return Response({
                    'status': 'error',
                    'valid': False,
                    'message': 'Rate limit excedido. Aguarde 24h para testar novamente.'
                })
            else:
                return Response({
                    'status': 'error',
                    'valid': False,
                    'message': f'Erro na API PrimeCOD: Status {response.status_code}'
                })

        except requests.exceptions.Timeout:
            return Response({
                'status': 'error',
                'valid': False,
                'message': 'Timeout ao conectar com API PrimeCOD'
            })
        except requests.exceptions.RequestException as e:
            return Response({
                'status': 'error',
                'valid': False,
                'message': f'Erro de conexão: {str(e)}'
            })

    except Exception as e:
        logger.error(f"Erro ao testar token PrimeCOD: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'Erro interno: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_last_sync(request):
    """
    Retorna informações da última sincronização bem-sucedida do catálogo PrimeCOD
    """
    try:
        from .models import CatalogSyncLog

        last_sync = CatalogSyncLog.objects.filter(status='success').first()

        if last_sync:
            serializer = CatalogSyncLogSerializer(last_sync)
            return Response({
                'status': 'success',
                'last_sync': serializer.data
            })

        return Response({
            'status': 'success',
            'last_sync': None,
            'message': 'Nenhuma sincronização bem-sucedida encontrada'
        })

    except Exception as e:
        logger.error(f"Erro ao buscar última sincronização: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'Erro ao buscar última sincronização: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def salvar_primecod_config(request):
    """
    Salva a configuração da API PrimeCOD
    O token deve ser testado antes de chamar este endpoint
    """
    try:
        token = request.data.get('api_token')

        if not token:
            return Response({
                'status': 'error',
                'message': 'Token é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Buscar config existente ou criar nova
        config = PrimeCODConfig.get_config()

        if config:
            # Atualizar existente
            serializer = PrimeCODConfigSerializer(
                config,
                data={'api_token': token},
                partial=True,
                context={'request': request}
            )
        else:
            # Criar nova
            serializer = PrimeCODConfigSerializer(
                data={'api_token': token},
                context={'request': request}
            )

        if serializer.is_valid():
            serializer.save()
            return Response({
                'status': 'success',
                'message': 'Configuração salva com sucesso!',
                'config': serializer.data
            })
        else:
            return Response({
                'status': 'error',
                'message': 'Dados inválidos',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Erro ao salvar config PrimeCOD: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'Erro ao salvar: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_product_history(request, product_id):
    """
    Retorna histórico de snapshots de um produto

    GET /api/primecod/catalog/{product_id}/history/?days=30

    Query params:
        - days: número de dias para retornar (padrão: 30)

    Returns:
        {
            "product": {...},
            "snapshots": [
                {
                    "date": "2025-01-15",
                    "quantity": 100,
                    "quantity_delta": +10,
                    "total_units_sold": 50,
                    "units_sold_delta": +5
                },
                ...
            ]
        }
    """
    try:
        from datetime import datetime, timedelta

        # Buscar produto
        product = get_object_or_404(PrimeCODCatalogProduct, id=product_id)

        # Número de dias para retornar (padrão 30)
        days = int(request.GET.get('days', 30))

        # Data inicial
        start_date = datetime.now().date() - timedelta(days=days)

        # Buscar snapshots do produto
        snapshots = PrimeCODCatalogSnapshot.objects.filter(
            product=product,
            snapshot_date__gte=start_date
        ).order_by('snapshot_date')

        # Processar snapshots com deltas
        history = []
        prev_snapshot = None

        for snapshot in snapshots:
            # Calcular deltas
            quantity_delta = 0
            units_sold_delta = 0

            if prev_snapshot:
                quantity_delta = snapshot.quantity - prev_snapshot.quantity
                units_sold_delta = snapshot.total_units_sold - prev_snapshot.total_units_sold

            history.append({
                'snapshot_date': snapshot.snapshot_date.isoformat(),
                'quantity': snapshot.quantity,
                'quantity_delta': quantity_delta,
                'total_units_sold': snapshot.total_units_sold,
                'units_sold_delta': units_sold_delta,
            })

            prev_snapshot = snapshot

        # Serializar produto
        product_serializer = PrimeCODCatalogProductResumoSerializer(product)

        return Response({
            'product': product_serializer.data,
            'snapshots': history,
            'total_days': len(history)
        })

    except ValueError:
        return Response({
            'status': 'error',
            'message': 'Parâmetro "days" inválido'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Erro ao obter histórico do produto {product_id}: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'Erro ao obter histórico: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_scheduler_status(request):
    """
    Retorna status do scheduler automático de sincronização

    GET /api/primecod/catalog/scheduler-status/

    Returns:
        {
            "enabled": true/false,
            "schedule": "Diariamente às 6h (horário de Brasília)",
            "next_run_estimated": "2025-01-15T06:00:00-03:00",
            "timezone": "America/Sao_Paulo"
        }
    """
    from django.conf import settings
    from datetime import datetime, time, timedelta
    import pytz

    try:
        # Verificar se scheduler está habilitado
        should_enable_scheduler = (
            not settings.DEBUG or
            getattr(settings, 'ENABLE_SCHEDULER', False)
        )

        # Timezone de Brasília
        tz = pytz.timezone('America/Sao_Paulo')
        now = datetime.now(tz)

        # Calcular próxima execução (6h da manhã)
        next_run = now.replace(hour=6, minute=0, second=0, microsecond=0)
        if now.hour >= 6:
            # Se já passou das 6h hoje, agendar para amanhã
            next_run = next_run + timedelta(days=1)

        return Response({
            'enabled': should_enable_scheduler,
            'schedule': 'Diariamente às 6h (horário de Brasília)',
            'next_run_estimated': next_run.isoformat(),
            'timezone': 'America/Sao_Paulo',
            'current_time': now.isoformat()
        })

    except Exception as e:
        logger.error(f"Erro ao obter status do scheduler: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'Erro ao obter status: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
