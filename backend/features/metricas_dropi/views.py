# backend/features/metricas_dropi/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
import requests
import logging
from django.conf import settings

from .models import AnaliseDropi
from .serializers import AnaliseDropiSerializer, ProcessamentoDropiSerializer

logger = logging.getLogger(__name__)

class AnaliseDropiViewSet(viewsets.ModelViewSet):
    serializer_class = AnaliseDropiSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AnaliseDropi.objects.all().order_by('-atualizado_em')
    
    @action(detail=False, methods=['post'])
    def processar_dados(self, request):
        """Solicita extração de dados do serviço Dropi"""
        serializer = ProcessamentoDropiSerializer(data=request.data)
        if serializer.is_valid():
            try:
                data = serializer.validated_data
                
                # URL do serviço extrator Dropi
                servidor_dropi_url = getattr(settings, 'DROPI_EXTRACTOR_SERVER', 'http://localhost:8002')
                
                # Payload para serviço extrator
                payload = {
                    'data_inicio': data['data_inicio'].isoformat(),
                    'data_fim': data['data_fim'].isoformat(),
                    'user_id': data['user_id']
                }
                
                logger.info(f"Enviando requisição para extrator Dropi: {payload}")
                
                # Fazer requisição para serviço extrator
                response = requests.post(
                    f"{servidor_dropi_url}/api/extrair-pedidos/",
                    json=payload,
                    timeout=120  # 2 minutos timeout (dados já processados)
                )
                
                if response.status_code == 200:
                    resultado = response.json()
                    
                    return Response({
                        'status': 'success',
                        'dados_processados': resultado.get('pedidos'),
                        'total_pedidos': resultado.get('total_pedidos', 0),
                        'estatisticas': resultado.get('estatisticas'),
                        'message': 'Dados extraídos com sucesso'
                    })
                else:
                    logger.error(f"Erro no extrator Dropi: {response.status_code} - {response.text}")
                    return Response({
                        'status': 'error',
                        'message': f'Erro no extrator: {response.status_code}'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
            except requests.exceptions.Timeout:
                logger.error("Timeout na requisição para extrator Dropi")
                return Response({
                    'status': 'error',
                    'message': 'Timeout na extração. Tente novamente.'
                }, status=status.HTTP_408_REQUEST_TIMEOUT)
                
            except requests.exceptions.ConnectionError:
                logger.error("Erro de conexão com extrator Dropi")
                return Response({
                    'status': 'error',
                    'message': 'Extrator Dropi indisponível. Contate o administrador.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
            except Exception as e:
                logger.error(f"Erro inesperado: {e}")
                return Response({
                    'status': 'error',
                    'message': f'Erro inesperado: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def test_connection(self, request):
        """Testa conexão com serviço extrator"""
        try:
            servidor_dropi_url = getattr(settings, 'DROPI_EXTRACTOR_SERVER', 'http://localhost:8002')
            
            response = requests.get(
                f"{servidor_dropi_url}/health",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return Response({
                    'status': 'success',
                    'extractor_status': data,
                    'connection': 'OK',
                    'url': servidor_dropi_url
                })
            else:
                return Response({
                    'status': 'error',
                    'message': f'Extractor retornou status {response.status_code}',
                    'url': servidor_dropi_url
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
        except requests.exceptions.ConnectionError:
            return Response({
                'status': 'error',
                'message': 'Não foi possível conectar ao extrator',
                'url': getattr(settings, 'DROPI_EXTRACTOR_SERVER', 'N/A')
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'Erro inesperado: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)