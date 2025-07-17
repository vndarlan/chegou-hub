# backend/features/metricas_ecomhub/views.py - VERSÃO SIMPLIFICADA
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
import requests
import logging
from django.conf import settings

from .models import AnaliseEcomhub
from .serializers import AnaliseEcomhubSerializer, ProcessamentoSeleniumSerializer

logger = logging.getLogger(__name__)

class AnaliseEcomhubViewSet(viewsets.ModelViewSet):
    serializer_class = AnaliseEcomhubSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AnaliseEcomhub.objects.all().order_by('-atualizado_em')
    
    @action(detail=False, methods=['post'])
    def processar_selenium(self, request):
        """Envia requisição para servidor externo processar via Selenium"""
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
                    'pais_id': data['pais_id']
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