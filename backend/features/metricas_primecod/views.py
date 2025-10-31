from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from core.permissions import IsAdminUser
from .models import AnalisePrimeCOD, StatusMappingPrimeCOD
from .serializers import (
    AnalisePrimeCODSerializer, 
    CSVUploadPrimeCODSerializer, 
    ProcessarAnalisePrimeCODSerializer,
    StatusMappingPrimeCODSerializer
)
from .utils import PrimeCODProcessor
from .clients.primecod_client import PrimeCODClient, PrimeCODAPIError
import pandas as pd
import json
import re
import logging
from collections import defaultdict

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
        
        # Verificar configuração do token antes de inicializar cliente
        from django.conf import settings
        token = getattr(settings, 'PRIMECOD_API_TOKEN', None)
        
        logger.info(f"Token configurado: {'Sim' if token else 'Não'}")
        logger.info(f"Token length: {len(token) if token else 0}")
        
        if not token or token == 'your_primecod_api_token_here':
            logger.warning("PRIMECOD_API_TOKEN não configurado no ambiente")
            return Response({
                'status': 'error',
                'message': 'Token PrimeCOD não configurado. Adicione PRIMECOD_API_TOKEN nas variáveis de ambiente do Railway.',
                'configured': False
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
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
            
            resultado = client.get_orders(
                page=1,
                date_range=date_range,
                max_pages=max_paginas,
                country_filter=pais_filtro  # Aplicar filtro de país no cliente
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
            
            # Processar os dados dos orders (filtros já aplicados)
            logger.info(f"[SUCCESS] DEBUG VIEW: Processando {len(resultado['orders'])} orders")
            orders_processados = client.process_orders_data(
                orders=resultado['orders'],  # resultado já contém os orders filtrados
                pais_filtro=None  # Não reaplicar filtro de país aqui
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
            logger.error(f"Erro na API PrimeCOD: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'Erro na API PrimeCOD: {str(e)}'
            }, status=status.HTTP_502_BAD_GATEWAY)
            
    except Exception as e:
        logger.error(f"Erro inesperado em buscar_orders_primecod: {str(e)}")
        return Response({
            'status': 'error',
            'message': f'Erro interno do servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
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
        
        # Verificar configuração do token antes de inicializar cliente
        from django.conf import settings
        token = getattr(settings, 'PRIMECOD_API_TOKEN', None)
        
        if not token or token == 'your_primecod_api_token_here':
            logger.warning("PRIMECOD_API_TOKEN não configurado no ambiente")
            return Response({
                'status': 'error',
                'message': 'Token PrimeCOD não configurado. Adicione PRIMECOD_API_TOKEN nas variáveis de ambiente do Railway.',
                'configured': False
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
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
        
        # Verificar configuração do token
        from django.conf import settings
        token = getattr(settings, 'PRIMECOD_API_TOKEN', None)
        
        if not token or token == 'your_primecod_api_token_here':
            return Response({
                'status': 'error',
                'message': 'Token PrimeCOD não configurado'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
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
def testar_conexao_primecod(request):
    """
    Testa conectividade com API PrimeCOD
    Endpoint útil para verificar se as credenciais estão funcionando
    """
    try:
        # Primeiro verifica se o token está configurado
        from django.conf import settings
        token = getattr(settings, 'PRIMECOD_API_TOKEN', None)
        
        if not token or token == 'your_primecod_api_token_here':
            logger.warning("PRIMECOD_API_TOKEN não configurado no ambiente")
            return Response({
                'status': 'error',
                'message': 'Token PrimeCOD não configurado. Adicione PRIMECOD_API_TOKEN nas variáveis de ambiente do Railway.',
                'configured': False
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
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
        
        # Verificar configuração do token
        from django.conf import settings
        token = getattr(settings, 'PRIMECOD_API_TOKEN', None)
        
        if not token or token == 'your_primecod_api_token_here':
            logger.warning("PRIMECOD_API_TOKEN não configurado no ambiente")
            return Response({
                'status': 'error',
                'message': 'Token PrimeCOD não configurado. Adicione PRIMECOD_API_TOKEN nas variáveis de ambiente do Railway.',
                'configured': False
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
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
