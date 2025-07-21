# backend/features/metricas_dropi/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
import requests
import logging
import time
from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import cache

from .models import AnaliseDropi, DropiToken
from .serializers import AnaliseDropiSerializer, ProcessamentoDropiSerializer

logger = logging.getLogger(__name__)

class AnaliseDropiViewSet(viewsets.ModelViewSet):
    serializer_class = AnaliseDropiSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AnaliseDropi.objects.all().order_by('-atualizado_em')
    
    def get_valid_token(self, pais='mexico'):
        """Obtém token válido do banco ou cache"""
        # Primeiro tenta cache
        cache_key = f'dropi_token_{pais}'
        cached_token = cache.get(cache_key)
        
        if cached_token and cached_token.get('expires_at'):
            expires_at = datetime.fromisoformat(cached_token['expires_at'])
            if expires_at > datetime.now():
                return cached_token['token']
        
        # Se não tem no cache, busca no banco
        try:
            token_obj = DropiToken.objects.filter(
                pais=pais,
                expires_at__gt=datetime.now()
            ).order_by('-created_at').first()
            
            if token_obj:
                # Salva no cache por 3 horas
                cache.set(cache_key, {
                    'token': token_obj.token,
                    'expires_at': token_obj.expires_at.isoformat()
                }, 3 * 60 * 60)
                
                return token_obj.token
        except Exception as e:
            logger.error(f"Erro ao buscar token no banco: {e}")
        
        return None
    
    def extract_orders_direct(self, user_id, date_from, date_until, pais='mexico'):
        """Extrai pedidos diretamente da API Dropi"""
        token = self.get_valid_token(pais)
        if not token:
            raise Exception(f"Token válido não encontrado para {pais}")
        
        # URLs por país
        api_urls = {
            'mexico': 'https://api.dropi.mx/api',
            'colombia': 'https://api.dropi.co/api', 
            'chile': 'https://api.dropi.cl/api'
        }
        
        base_url = api_urls.get(pais)
        if not base_url:
            raise Exception(f"País {pais} não suportado")
            
        headers = {
            'accept': 'application/json, text/plain, */*',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7,es;q=0.6',
            'origin': f'https://app.dropi.{pais[:2]}',
            'referer': f'https://app.dropi.{pais[:2]}/',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
            'x-authorization': f'Bearer {token}'
        }
        
        all_orders = []
        start = 0
        result_number = 100
        
        while True:
            params = {
                'exportAs': 'orderByRow',
                'orderBy': 'id',
                'orderDirection': 'desc',
                'result_number': result_number,
                'start': start,
                'textToSearch': '',
                'status': 'null',
                'supplier_id': 'false',
                'user_id': user_id,
                'from': date_from,
                'until': date_until,
                'filter_product': 'undefined',
                'haveIncidenceProcesamiento': 'false',
                'tag_id': '',
                'warranty': 'false',
                'seller': 'undefined',
                'filter_date_by': 'FECHA DE CREADO',
                'invoiced': 'null'
            }
            
            try:
                response = requests.get(
                    f"{base_url}/orders/myorders",
                    headers=headers,
                    params=params,
                    timeout=30
                )
                
                if response.status_code == 401:
                    # Token expirado, limpa cache
                    cache.delete(f'dropi_token_{pais}')
                    raise Exception("Token expirado. Aguarde renovação automática.")
                
                if response.status_code != 200:
                    raise Exception(f"Erro na API Dropi {pais}: {response.status_code}")
                
                data = response.json()
                orders = data.get('objects', [])
                
                if not orders:
                    break
                    
                all_orders.extend(orders)
                logger.info(f"Página {start//result_number + 1}: {len(orders)} pedidos")
                
                if len(orders) < result_number:
                    break
                    
                start += result_number
                time.sleep(1)  # Rate limiting
                
            except requests.exceptions.Timeout:
                logger.error("Timeout na requisição para API Dropi")
                break
            except Exception as e:
                logger.error(f"Erro na extração: {e}")
                raise
        
        return all_orders
    
    @action(detail=False, methods=['post'])
    def processar_dados(self, request):
        """Processa dados diretamente via API Dropi"""
        serializer = ProcessamentoDropiSerializer(data=request.data)
        if serializer.is_valid():
            try:
                data = serializer.validated_data
                pais = data.get('pais', 'mexico')
                
                logger.info(f"Extraindo pedidos {pais}: {data['data_inicio']} - {data['data_fim']}")
                
                orders = self.extract_orders_direct(
                    user_id=data['user_id'],
                    date_from=data['data_inicio'].isoformat(),
                    date_until=data['data_fim'].isoformat(),
                    pais=pais
                )
                
                # Calcular estatísticas
                total_orders = len(orders)
                total_value = sum(float(order.get('total_order', 0)) for order in orders)
                
                status_count = {}
                for order in orders:
                    status = order.get('status', 'UNKNOWN')
                    status_count[status] = status_count.get(status, 0) + 1
                
                estatisticas = {
                    'total_pedidos': total_orders,
                    'valor_total': total_value,
                    'status_distribution': status_count,
                    'pais': pais
                }
                
                return Response({
                    'status': 'success',
                    'dados_processados': orders,
                    'total_pedidos': total_orders,
                    'estatisticas': estatisticas,
                    'message': f'Dados extraídos com sucesso do {pais.title()}'
                })
                
            except Exception as e:
                logger.error(f"Erro na extração direta: {e}")
                return Response({
                    'status': 'error',
                    'message': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='receive-token')
        def receive_token(self, request):
            """Recebe token do Token Service"""
            try:
                data = request.data
                pais = data.get('pais')
                token = data.get('token')
                expires_at_str = data.get('expires_at')
                
                if not all([pais, token, expires_at_str]):
                    return Response({
                        'error': 'Dados incompletos'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Corrigir timezone
                from django.utils import timezone as django_timezone
                expires_at = datetime.fromisoformat(expires_at_str)
                if expires_at.tzinfo is None:
                    expires_at = django_timezone.make_aware(expires_at)
                
                # Salva no banco
                DropiToken.objects.update_or_create(
                    pais=pais,
                    defaults={
                        'token': token,
                        'expires_at': expires_at
                    }
                )
                
                # Atualiza cache
                cache_key = f'dropi_token_{pais}'
                cache.set(cache_key, {
                    'token': token,
                    'expires_at': expires_at_str
                }, 3 * 60 * 60)
                
                logger.info(f"Token {pais} recebido e salvo")
                
                return Response({
                    'status': 'success',
                    'message': f'Token {pais} recebido'
                })
                
            except Exception as e:
                logger.error(f"Erro ao receber token: {e}")
                return Response({
                    'status': 'error',
                    'message': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def test_connection(self, request):
        """Testa conexão com Token Service e status dos tokens"""
        pais = request.query_params.get('pais', 'mexico')
        
        try:
            # Testa Token Service
            token_service_url = getattr(settings, 'DROPI_TOKEN_SERVICE_URL', 'http://localhost:8002')
            
            response = requests.get(
                f"{token_service_url}/health",
                timeout=10
            )
            
            token_service_status = response.json() if response.status_code == 200 else None
            
            # Verifica token local
            local_token = self.get_valid_token(pais)
            
            return Response({
                'status': 'success',
                'token_service': {
                    'status': 'online' if token_service_status else 'offline',
                    'url': token_service_url,
                    'data': token_service_status
                },
                'local_token': {
                    'status': 'valid' if local_token else 'invalid',
                    'pais': pais
                }
            })
            
        except requests.exceptions.ConnectionError:
            return Response({
                'status': 'warning',
                'message': 'Token Service offline, mas tokens locais podem estar disponíveis',
                'local_token': {
                    'status': 'valid' if self.get_valid_token(pais) else 'invalid',
                    'pais': pais
                }
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'Erro inesperado: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)