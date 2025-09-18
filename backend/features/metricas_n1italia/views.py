# backend/features/metricas_n1italia/views.py
import time
import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction

from .models import AnaliseN1Italia
from .serializers import (
    AnaliseN1ItaliaSerializer, ExcelUploadSerializer,
    ProcessarAnaliseSerializer, ResultadoAnaliseSerializer
)
from .services import n1_italia_processor

logger = logging.getLogger(__name__)


class AnaliseN1ItaliaViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar análises N1 Itália"""

    serializer_class = AnaliseN1ItaliaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AnaliseN1Italia.objects.filter(
            criado_por=self.request.user
        ).order_by('-atualizado_em')

    @action(detail=False, methods=['post'])
    def upload_excel(self, request):
        """
        POST /api/analise-n1italia/upload_excel/
        Upload e leitura inicial do arquivo Excel
        """
        serializer = ExcelUploadSerializer(data=request.data)

        if serializer.is_valid():
            try:
                arquivo = serializer.validated_data['arquivo']
                nome_analise = serializer.validated_data['nome_analise']
                descricao = serializer.validated_data.get('descricao', '')

                logger.info(f"Upload Excel N1 iniciado: {arquivo.name}")

                # Processar arquivo Excel
                dados_excel = n1_italia_processor.processar_arquivo_excel(arquivo)

                # Validar dados básicos
                if not dados_excel:
                    return Response({
                        'status': 'error',
                        'message': 'Arquivo Excel está vazio ou não pôde ser lido'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Verificar campos obrigatórios após mapeamento
                primeiro_registro = dados_excel[0]
                campos_obrigatorios = ['order_number', 'status']

                # Os campos já foram mapeados pelo processador, então devem estar presentes
                # Se não estiverem, significa que o mapeamento não conseguiu identificá-los
                campos_faltando = [campo for campo in campos_obrigatorios if campo not in primeiro_registro]

                if campos_faltando:
                    return Response({
                        'status': 'error',
                        'message': f'Não foi possível identificar as colunas obrigatórias no Excel: {", ".join(campos_faltando)}',
                        'detalhes': 'Verifique se o arquivo contém colunas com nomes similares a: "order_number" (ou "pedido", "numero"), "status" (ou "estado", "situação"), "product_name" (ou "produto", "nome")',
                        'campos_encontrados': list(primeiro_registro.keys())
                    }, status=status.HTTP_400_BAD_REQUEST)

                logger.info(f"Excel processado com sucesso: {len(dados_excel)} registros")

                return Response({
                    'status': 'success',
                    'message': f'Excel processado com sucesso: {len(dados_excel)} registros',
                    'total_registros': len(dados_excel),
                    'campos_detectados': list(primeiro_registro.keys()),
                    'preview_dados': dados_excel[:3],  # Mostrar apenas 3 registros como preview
                    'dados_para_processamento': {
                        'nome_analise': nome_analise,
                        'descricao': descricao,
                        'dados_excel': dados_excel
                    }
                })

            except Exception as e:
                logger.error(f"Erro no upload Excel: {e}")
                return Response({
                    'status': 'error',
                    'message': f'Erro processando arquivo Excel: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def processar(self, request):
        """
        POST /api/analise-n1italia/processar/
        Processa dados e gera relatório completo N1
        """
        serializer = ProcessarAnaliseSerializer(data=request.data)

        if serializer.is_valid():
            try:
                inicio = time.time()

                dados = serializer.validated_data
                nome_analise = dados['nome_analise']
                descricao = dados.get('descricao', '')
                dados_excel = dados['dados_excel']

                logger.info(f"Iniciando processamento N1: {nome_analise}")

                # Processar dados com o service
                dados_processados = n1_italia_processor.processar_excel(dados_excel)

                tempo_processamento = time.time() - inicio

                logger.info(f"Análise N1 processada com sucesso (sem salvar no banco)")

                # Preparar estatísticas para resposta
                estatisticas = dados_processados.get('stats_total', {})

                resultado = {
                    'status': 'success',
                    'message': f'Análise "{nome_analise}" processada com sucesso! Use o botão "Salvar" para armazenar.',
                    'dados_processados': dados_processados,
                    'estatisticas': estatisticas,
                    'tempo_processamento': round(tempo_processamento, 2)
                }

                # Serializar resultado
                resultado_serializer = ResultadoAnaliseSerializer(data=resultado)
                if resultado_serializer.is_valid():
                    return Response(resultado_serializer.data)
                else:
                    return Response(resultado)

            except Exception as e:
                logger.error(f"Erro processando análise N1: {e}")
                return Response({
                    'status': 'error',
                    'message': f'Erro processando análise: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def exportar_dados(self, request, pk=None):
        """
        GET /api/analise-n1italia/{id}/exportar_dados/
        Exporta dados processados da análise
        """
        try:
            analise = self.get_object()

            if not analise.dados_processados:
                return Response({
                    'status': 'error',
                    'message': 'Análise não possui dados processados'
                }, status=status.HTTP_404_NOT_FOUND)

            return Response({
                'status': 'success',
                'analise': {
                    'id': analise.id,
                    'nome': analise.nome,
                    'descricao': analise.descricao,
                    'criado_em': analise.criado_em,
                    'total_pedidos': analise.total_pedidos,
                    'efetividade_parcial': analise.efetividade_parcial,
                    'efetividade_total': analise.efetividade_total
                },
                'dados_processados': analise.dados_processados
            })

        except Exception as e:
            logger.error(f"Erro exportando dados: {e}")
            return Response({
                'status': 'error',
                'message': f'Erro exportando dados: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def estatisticas_gerais(self, request):
        """
        GET /api/analise-n1italia/estatisticas_gerais/
        Retorna estatísticas gerais de todas as análises do usuário
        """
        try:
            analises = self.get_queryset()

            total_analises = analises.count()
            if total_analises == 0:
                return Response({
                    'status': 'success',
                    'message': 'Nenhuma análise encontrada',
                    'estatisticas': {
                        'total_analises': 0,
                        'total_pedidos': 0,
                        'efetividade_media': 0,
                        'analise_mais_recente': None
                    }
                })

            # Calcular estatísticas
            total_pedidos = sum(analise.total_pedidos for analise in analises)
            efetividades = [analise.efetividade_total for analise in analises if analise.efetividade_total > 0]
            efetividade_media = round(sum(efetividades) / len(efetividades), 2) if efetividades else 0

            analise_mais_recente = analises.first()

            return Response({
                'status': 'success',
                'estatisticas': {
                    'total_analises': total_analises,
                    'total_pedidos': total_pedidos,
                    'efetividade_media': efetividade_media,
                    'analise_mais_recente': {
                        'id': analise_mais_recente.id,
                        'nome': analise_mais_recente.nome,
                        'criado_em': analise_mais_recente.criado_em,
                        'total_pedidos': analise_mais_recente.total_pedidos
                    } if analise_mais_recente else None
                }
            })

        except Exception as e:
            logger.error(f"Erro nas estatísticas gerais: {e}")
            return Response({
                'status': 'error',
                'message': f'Erro calculando estatísticas: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def status_mapping(self, request):
        """
        GET /api/analise-n1italia/status_mapping/
        Retorna o mapeamento de status N1 para referência
        """
        return Response({
            'status': 'success',
            'mapeamento_status': n1_italia_processor.STATUS_MAPPING,
            'descricao': {
                'entregues': 'Pedidos que foram entregues com sucesso',
                'finalizados': 'Todos os pedidos que não estão mais em processamento',
                'transito': 'Pedidos em processo de envio/entrega',
                'problemas': 'Pedidos com problemas (inválidos, sem estoque, rejeitados)',
                'devolucao': 'Pedidos devolvidos',
                'cancelados': 'Pedidos cancelados ou rejeitados'
            }
        })