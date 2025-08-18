from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
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
    permission_classes = [permissions.IsAuthenticated]
    
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
    permission_classes = [permissions.IsAuthenticated]


# ===== ENDPOINTS PROXY PARA API PRIMECOD =====

@api_view(['POST'])
def buscar_orders_primecod(request):
    """
    Proxy para buscar orders da API PrimeCOD de forma segura
    Substitui chamadas diretas do frontend para a API externa
    """
    print("🔥 PRIMECOD VIEW CHAMADA! 🔥")
    logger.error("🔥 PRIMECOD VIEW CHAMADA! 🔥")
    
    # Verificar autenticação manualmente
    logger.error(f"User authenticated: {request.user.is_authenticated}")
    logger.error(f"User: {request.user}")
    
    if not request.user.is_authenticated:
        logger.error("❌ Usuário não autenticado!")
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
        max_paginas = request.data.get('max_paginas', 9999)  # Remover limite artificial - coletar TODAS as páginas
        
        logger.info(f"Usuário: {request.user.username}")
        logger.info(f"Parâmetros recebidos: data_inicio={data_inicio}, data_fim={data_fim}, pais_filtro={pais_filtro}")
        logger.info(f"Max páginas configurado: {max_paginas} (9999 = sem limite artificial)")
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
            resultado = client.get_orders(
                page=1,
                date_range=date_range,
                max_pages=max_paginas,
                country_filter=pais_filtro  # Aplicar filtro de país no cliente
            )
            logger.info(f"Busca concluída. Resultado: {type(resultado)}")
            logger.info(f"Keys do resultado: {list(resultado.keys()) if isinstance(resultado, dict) else 'Não é dict'}")
            
            # Processar os dados dos orders (filtros já aplicados)
            logger.info(f"🔍 DEBUG VIEW: Processando {len(resultado['orders'])} orders")
            orders_processados = client.process_orders_data(
                orders=resultado['orders'],  # resultado já contém os orders filtrados
                pais_filtro=None  # Não reaplicar filtro de país aqui
            )
            
            logger.info(f"🔍 DEBUG VIEW: Dados processados - {len(orders_processados['dados_processados'])} linhas")
            logger.info(f"🔍 DEBUG VIEW: Primeira linha: {orders_processados['dados_processados'][0] if orders_processados['dados_processados'] else 'Nenhuma'}")
            
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
                'message': f"Busca concluída: {resultado.get('total_orders_raw', resultado['total_orders'])} orders coletados, {resultado['total_orders']} após filtros"
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
@permission_classes([permissions.IsAuthenticated])
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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
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
