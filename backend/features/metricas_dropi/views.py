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
from django.utils import timezone as django_timezone

from .models import AnaliseDropi, DropiToken
from .serializers import AnaliseDropiSerializer, ProcessamentoDropiSerializer, ProcessamentoDropiNovaApiSerializer

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
                expires_at__gt=django_timezone.now()
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
            
            # Parse datetime com timezone
            expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
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
    
    def test_api_health_with_small_period(self, country):
        """Testa a saúde da API com um período pequeno (1 dia)"""
        try:
            from datetime import date
            today = date.today()
            
            url = f"https://dropi-api.up.railway.app/api/dados/{country}"
            payload = {
                "data_inicio": today.strftime('%Y-%m-%d'),
                "data_fim": today.strftime('%Y-%m-%d')
            }
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'ChegouHub/1.0 HealthCheck'
            }
            
            logger.info(f"Testando saúde da API {country} com período de 1 dia")
            
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=60  # 1 minuto para teste
            )
            
            return {
                'healthy': response.status_code == 200,
                'status_code': response.status_code,
                'response_time': response.elapsed.total_seconds() if response.elapsed else 0
            }
            
        except Exception as e:
            logger.error(f"Erro no teste de saúde da API {country}: {e}")
            return {
                'healthy': False,
                'error': str(e)
            }

    @action(detail=False, methods=['post'])
    def extract_orders_new_api(self, request):
        """Extrai pedidos usando a nova API unificada da Dropi"""
        serializer = ProcessamentoDropiNovaApiSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                data = serializer.validated_data
                country = data['pais']  # Recebe país do payload validado
                
                logger.info(f"Extraindo pedidos via nova API {country}: {data['data_inicio']} - {data['data_fim']}")
                
                # Teste rápido da saúde da API antes da requisição principal
                health_check = self.test_api_health_with_small_period(country)
                if not health_check.get('healthy'):
                    logger.warning(f"API {country} não está saudável: {health_check}")
                    return Response({
                        'status': 'error',
                        'message': f'API {country} não está respondendo corretamente',
                        'health_check': health_check,
                        'fallback_available': True
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
                logger.info(f"API {country} está saudável (tempo resposta: {health_check.get('response_time', 0):.1f}s)")
                logger.info(f"Iniciando requisição principal às {datetime.now()}")
                
                # URL da nova API unificada
                url = f"https://dropi-api.up.railway.app/api/dados/{country}"
                
                payload = {
                    "data_inicio": data['data_inicio'].strftime('%Y-%m-%d'),
                    "data_fim": data['data_fim'].strftime('%Y-%m-%d')
                }
                
                headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'ChegouHub/1.0'
                }
                
                # Calcular período em dias para ajustar timeout
                periodo_dias = (data['data_fim'] - data['data_inicio']).days + 1
                
                # Timeout baseado no período: mínimo 10min, máximo 30min
                timeout_base = max(600, min(1800, periodo_dias * 10))  # 10s por dia (otimizado)
                logger.info(f"Período: {periodo_dias} dias, timeout: {timeout_base}s")
                
                try:
                    start_time = time.time()
                    logger.info(f"Iniciando requisição para {url} com timeout de {timeout_base}s")
                    
                    response = requests.post(
                        url,
                        json=payload,
                        headers=headers,
                        timeout=timeout_base  # Timeout dinâmico baseado no período
                    )
                    
                    elapsed_time = time.time() - start_time
                    logger.info(f"Requisição completada em {elapsed_time:.2f}s")
                    
                    if response.status_code == 200:
                        logger.info("RESPOSTA RECEBIDA - Status 200")
                        
                        try:
                            response_data = response.json()
                            logger.info(f"RESPOSTA ULTRA-DETALHADA: {type(response_data)} com {len(str(response_data))} caracteres")
                        except Exception as json_error:
                            logger.error(f"Erro ao fazer parse JSON: {json_error}")
                            logger.error(f"Conteúdo da resposta (primeiros 1000 chars): {response.text[:1000]}")
                            raise
                        
                        # Valida estrutura da resposta
                        if response_data.get('status') == 'success':
                            pedidos_count = len(response_data.get('pedidos', []))
                            logger.info(f"Processamento concluído: {pedidos_count} pedidos extraídos")
                            
                            return Response({
                                'status': 'success',
                                'country': response_data.get('country', country),
                                'period': response_data.get('period'),
                                'total_pedidos': response_data.get('total_pedidos', 0),
                                'valor_total': response_data.get('valor_total', 0.0),
                                'status_distribution': response_data.get('status_distribution', {}),
                                'pedidos': response_data.get('pedidos', []),
                                'processing_time': elapsed_time,
                                'message': f'Dados extraídos com sucesso via nova API - {country.title()} ({pedidos_count} pedidos em {elapsed_time:.1f}s)'
                            })
                        else:
                            # API retornou erro
                            error_msg = response_data.get('message', 'Erro desconhecido na API')
                            logger.error(f"Erro na nova API {country}: {error_msg}")
                            
                            return Response({
                                'status': 'error',
                                'message': f'Erro na nova API: {error_msg}',
                                'fallback_available': True
                            }, status=status.HTTP_502_BAD_GATEWAY)
                    
                    elif response.status_code == 404:
                        return Response({
                            'status': 'error',
                            'message': f'País {country} não está disponível na nova API',
                            'fallback_available': True
                        }, status=status.HTTP_404_NOT_FOUND)
                    
                    elif response.status_code == 422:
                        return Response({
                            'status': 'error',
                            'message': 'Dados inválidos enviados para a API',
                            'details': response.text
                        }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
                    
                    else:
                        # Outros erros HTTP
                        logger.error(f"Erro HTTP {response.status_code} na nova API {country}: {response.text}")
                        return Response({
                            'status': 'error',
                            'message': f'Erro HTTP {response.status_code} na nova API',
                            'details': response.text[:500],  # Limita detalhes
                            'fallback_available': True
                        }, status=status.HTTP_502_BAD_GATEWAY)
                
                except requests.exceptions.Timeout:
                    elapsed_time = time.time() - start_time if 'start_time' in locals() else 0
                    logger.error(f"TIMEOUT na nova API {country} após {elapsed_time:.1f}s (limite: {timeout_base}s)")
                    logger.error(f"Período solicitado: {periodo_dias} dias ({data['data_inicio']} - {data['data_fim']})")
                    
                    return Response({
                        'status': 'error',
                        'message': f'Timeout na requisição para nova API (>{timeout_base//60}min para {periodo_dias} dias)',
                        'timeout_used': timeout_base,
                        'period_days': periodo_dias,
                        'elapsed_time': elapsed_time,
                        'suggestion': 'Tente um período menor (7-15 dias) ou use a API legada',
                        'fallback_available': True
                    }, status=status.HTTP_504_GATEWAY_TIMEOUT)
                
                except requests.exceptions.ConnectionError as e:
                    elapsed_time = time.time() - start_time if 'start_time' in locals() else 0
                    logger.error(f"ERRO DE CONEXÃO com nova API {country} após {elapsed_time:.1f}s: {e}")
                    
                    return Response({
                        'status': 'error',
                        'message': 'Erro de conexão com a nova API - serviço pode estar offline',
                        'details': str(e)[:200],
                        'elapsed_time': elapsed_time,
                        'fallback_available': True
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
                except requests.exceptions.RequestException as e:
                    elapsed_time = time.time() - start_time if 'start_time' in locals() else 0
                    logger.error(f"ERRO NA REQUISIÇÃO para nova API {country} após {elapsed_time:.1f}s: {e}")
                    logger.error(f"Tipo do erro: {type(e).__name__}")
                    
                    return Response({
                        'status': 'error',
                        'message': f'Erro na requisição ({type(e).__name__}): {str(e)[:300]}',
                        'elapsed_time': elapsed_time,
                        'error_type': type(e).__name__,
                        'fallback_available': True
                    }, status=status.HTTP_502_BAD_GATEWAY)
            
            except Exception as e:
                logger.error(f"Erro inesperado na nova API {country}: {e}")
                return Response({
                    'status': 'error',
                    'message': f'Erro inesperado: {str(e)}',
                    'fallback_available': True
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def extract_orders_small_period(self, request):
        """Extrai pedidos com período reduzido para teste (máximo 7 dias)"""
        serializer = ProcessamentoDropiNovaApiSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                data = serializer.validated_data
                country = data['pais']
                
                # Limitar período a máximo 7 dias
                periodo_original = (data['data_fim'] - data['data_inicio']).days + 1
                if periodo_original > 7:
                    # Usar apenas os últimos 7 dias
                    nova_data_inicio = data['data_fim'] - timedelta(days=6)
                    logger.info(f"Período reduzido de {periodo_original} para 7 dias: {nova_data_inicio} - {data['data_fim']}")
                else:
                    nova_data_inicio = data['data_inicio']
                
                # URL da nova API unificada
                url = f"https://dropi-api.up.railway.app/api/dados/{country}"
                
                payload = {
                    "data_inicio": nova_data_inicio.strftime('%Y-%m-%d'),
                    "data_fim": data['data_fim'].strftime('%Y-%m-%d')
                }
                
                headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'ChegouHub/1.0 SmallPeriod'
                }
                
                logger.info(f"Testando período pequeno para {country}: {payload}")
                
                try:
                    start_time = time.time()
                    response = requests.post(
                        url,
                        json=payload,
                        headers=headers,
                        timeout=300  # 5 minutos para período pequeno
                    )
                    
                    elapsed_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        response_data = response.json()
                        
                        if response_data.get('status') == 'success':
                            pedidos_count = len(response_data.get('pedidos', []))
                            
                            return Response({
                                'status': 'success',
                                'country': country,
                                'original_period_days': periodo_original,
                                'tested_period_days': (data['data_fim'] - nova_data_inicio).days + 1,
                                'period': response_data.get('period'),
                                'total_pedidos': response_data.get('total_pedidos', 0),
                                'valor_total': response_data.get('valor_total', 0.0),
                                'status_distribution': response_data.get('status_distribution', {}),
                                'pedidos': response_data.get('pedidos', []),
                                'processing_time': elapsed_time,
                                'message': f'Teste com período reduzido bem-sucedido - {country.title()} ({pedidos_count} pedidos em {elapsed_time:.1f}s)'
                            })
                        else:
                            return Response({
                                'status': 'error',
                                'message': f'API retornou erro: {response_data.get("message", "Desconhecido")}'
                            }, status=status.HTTP_502_BAD_GATEWAY)
                    else:
                        return Response({
                            'status': 'error',
                            'message': f'HTTP {response.status_code}: {response.text[:200]}'
                        }, status=status.HTTP_502_BAD_GATEWAY)
                        
                except requests.exceptions.Timeout:
                    elapsed_time = time.time() - start_time if 'start_time' in locals() else 0
                    return Response({
                        'status': 'error',
                        'message': f'Timeout mesmo com período pequeno ({elapsed_time:.1f}s)'
                    }, status=status.HTTP_504_GATEWAY_TIMEOUT)
                
            except Exception as e:
                logger.error(f"Erro no teste com período pequeno: {e}")
                return Response({
                    'status': 'error',
                    'message': f'Erro no teste com período reduzido: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)