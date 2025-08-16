"""
Cliente para integração com API PrimeCOD
Implementação segura de proxy backend para evitar exposição de token no frontend
"""

import requests
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

class PrimeCODAPIError(Exception):
    """Exceção personalizada para erros da API PrimeCOD"""
    pass

class PrimeCODClient:
    """Cliente para comunicação segura com API PrimeCOD"""
    
    def __init__(self):
        self.base_url = "https://api.primecod.app/api"
        self.token = getattr(settings, 'PRIMECOD_API_TOKEN', None)
        
        if not self.token:
            raise PrimeCODAPIError("PRIMECOD_API_TOKEN não configurado no settings")
        
        self.headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json',
            'User-Agent': 'ChegouHub-Backend/1.0'
        }
        
        # Rate limiting
        self.last_request_time = 0
        self.min_request_interval = 0.5  # 500ms entre requests
        
        # Status mapping para padronização (IDs numéricos da API real)
        self.status_mapping = {
            1: 'Placed',
            2: 'Packed', 
            4: 'Shipped',
            6: 'Out for delivery',
            7: 'Delivered',
            8: 'Refused',
            10: 'Returned',
            12: 'Cancelled',
            # Strings para compatibilidade
            'Delivered': 'Delivered',
            'Canceled': 'Cancelled', 
            'Confirmed': 'Placed',
            'Pending': 'Placed',
            'Shipped': 'Shipped',
            'Returned': 'Returned',
        }
    
    def _rate_limit(self):
        """Implementa rate limiting básico"""
        current_time = time.time()
        elapsed = current_time - self.last_request_time
        
        if elapsed < self.min_request_interval:
            sleep_time = self.min_request_interval - elapsed
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def _make_request(self, method: str, url: str, **kwargs) -> requests.Response:
        """Faz requisição HTTP com tratamento de erros e rate limiting"""
        logger.error(f"🌐 _make_request chamado: {method} {url}")
        logger.error(f"🌐 Headers: {self.headers}")
        logger.error(f"🌐 Kwargs: {kwargs}")
        
        self._rate_limit()
        logger.error(f"🌐 Rate limit OK, fazendo requisição...")
        
        try:
            logger.error(f"🌐 Fazendo requests.request...")
            response = requests.request(
                method=method,
                url=url,
                headers=self.headers,
                timeout=30,
                **kwargs
            )
            logger.error(f"🌐 Response recebido: {response.status_code}")
            
            logger.info(f"PrimeCOD API {method} {url} - Status: {response.status_code}")
            
            if response.status_code == 401:
                raise PrimeCODAPIError("Token de autenticação inválido ou expirado")
            elif response.status_code == 429:
                raise PrimeCODAPIError("Rate limit excedido. Tente novamente em alguns minutos")
            elif response.status_code >= 400:
                raise PrimeCODAPIError(f"Erro da API PrimeCOD: {response.status_code} - {response.text}")
            
            return response
            
        except requests.RequestException as e:
            logger.error(f"🌐 ❌ RequestException: {str(e)}")
            logger.error(f"🌐 ❌ Erro na requisição para PrimeCOD: {str(e)}")
            raise PrimeCODAPIError(f"Erro de conectividade: {str(e)}")
        except Exception as e:
            logger.error(f"🌐 ❌ Exception geral: {str(e)}")
            logger.error(f"🌐 ❌ Tipo: {type(e)}")
            raise PrimeCODAPIError(f"Erro inesperado: {str(e)}")
    
    def get_orders(self, 
                   page: int = 1, 
                   date_range: Optional[Dict[str, str]] = None,
                   max_pages: int = 400) -> Dict:
        """
        Busca orders da API PrimeCOD com paginação
        
        Args:
            page: Página inicial
            date_range: {'start': 'YYYY-MM-DD', 'end': 'YYYY-MM-DD'}
            max_pages: Máximo de páginas para buscar
            
        Returns:
            Dict com orders, total_pages, filtros aplicados, etc.
        """
        
        # Tentar usar cache se disponível
        cached_result = None
        cache_key = None
        try:
            # Criar chave de cache válida (sem caracteres especiais)
            import hashlib
            date_str = ""
            if date_range:
                date_str = f"{date_range.get('start', '')}-{date_range.get('end', '')}"
            
            # Hash para evitar caracteres especiais e limitar tamanho
            cache_data = f"primecod_orders_{page}_{date_str}"
            cache_key = hashlib.md5(cache_data.encode()).hexdigest()[:20]
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info(f"Retornando dados em cache para página {page}")
                return cached_result
        except Exception as e:
            logger.warning(f"Cache não disponível, prosseguindo sem cache: {str(e)}")
            cached_result = None
        
        url = f"{self.base_url}/orders"
        
        # Construir payload da requisição
        payload = {}
        if date_range:
            payload['date_range'] = date_range
        
        logger.error(f"🚀 URL: {url}")
        logger.error(f"🚀 Payload: {payload}")
        logger.error(f"🚀 Iniciando loop de páginas...")
        
        all_orders = []
        current_page = page
        total_pages = None
        pages_processed = 0
        
        try:
            logger.error(f"🚀 Entrando no try...")
            while current_page <= max_pages:
                logger.error(f"🚀 Loop página {current_page}")
                if pages_processed >= max_pages:
                    logger.warning(f"Limite de {max_pages} páginas atingido")
                    break
                
                # Fazer requisição para página atual
                page_url = f"{url}?page={current_page}"
                logger.info(f"Buscando página {current_page} de orders PrimeCOD")
                logger.info(f"URL: {page_url}")
                logger.info(f"Payload: {payload}")
                
                logger.error(f"🔄 Fazendo _make_request...")
                response = self._make_request('POST', page_url, json=payload)
                logger.error(f"🔄 Response recebido, processando...")
                logger.info(f"Response status: {response.status_code}")
                logger.info(f"Response headers: {dict(response.headers)}")
                
                logger.error(f"🔄 Fazendo response.json()...")
                data = response.json()
                logger.error(f"🔄 JSON parseado com sucesso!")
                logger.info(f"Response data keys: {list(data.keys()) if isinstance(data, dict) else type(data)}")
                
                # Extrair dados da resposta
                logger.error(f"🔄 Extraindo orders...")
                orders = data.get('data', [])  # CORREÇÃO: API usa 'data' não 'orders'
                logger.error(f"🔄 Orders extraídos: {len(orders)}")
                logger.info(f"Orders encontrados na página {current_page}: {len(orders)}")
                
                if isinstance(data, dict):
                    logger.error(f"🔄 Dados completos da resposta: {data}")
                
                if not orders:
                    logger.error(f"🔄 Nenhum order encontrado, finalizando...")
                    logger.info(f"Nenhum order encontrado na página {current_page}, finalizando busca")
                    break
                
                # Filtrar por data localmente (já que API não funciona direito)
                if date_range:
                    orders = self._filter_orders_by_date(orders, date_range)
                
                all_orders.extend(orders)
                
                # Obter informações de paginação
                if total_pages is None:
                    total_pages = data.get('last_page', current_page)
                
                current_page += 1
                pages_processed += 1
                
                # Log de progresso
                if pages_processed % 10 == 0:
                    logger.info(f"Processadas {pages_processed} páginas, {len(all_orders)} orders encontrados")
            
            result = {
                'orders': all_orders,
                'total_orders': len(all_orders),
                'pages_processed': pages_processed,
                'total_pages': total_pages,
                'date_range_applied': date_range,
                'status': 'success'
            }
            
            # Tentar salvar no cache se disponível
            if cache_key:
                try:
                    cache.set(cache_key, result, 300)  # Cache por 5 minutos
                    logger.info(f"Resultado salvo no cache")
                except Exception as e:
                    logger.warning(f"Falha ao salvar no cache: {str(e)}")
            
            logger.info(f"Busca finalizada: {len(all_orders)} orders em {pages_processed} páginas")
            return result
            
        except Exception as e:
            logger.error(f"Erro ao buscar orders PrimeCOD: {str(e)}")
            raise PrimeCODAPIError(f"Erro na busca de orders: {str(e)}")
    
    def _filter_orders_by_date(self, orders: List[Dict], date_range: Dict[str, str]) -> List[Dict]:
        """Filtra orders por data localmente"""
        logger.error(f"📅 Filtro de data chamado: {date_range}")
        
        if not date_range.get('start') or not date_range.get('end'):
            logger.error("📅 Sem filtro de data, retornando todos os orders")
            return orders
        
        try:
            start_date = datetime.strptime(date_range['start'], '%Y-%m-%d').date()
            end_date = datetime.strptime(date_range['end'], '%Y-%m-%d').date()
            
            logger.error(f"📅 Período: {start_date} até {end_date}")
            
            filtered_orders = []
            for order in orders:
                # Tentar diferentes campos de data
                order_date_str = order.get('created_at') or order.get('date') or order.get('order_date')
                logger.error(f"📅 Order {order.get('id')}: data_str={order_date_str}")
                
                if not order_date_str:
                    logger.error(f"📅 Order {order.get('id')}: SEM DATA, pulando")
                    continue
                
                try:
                    # Tentar diferentes formatos de data
                    order_date = None
                    for date_format in ['%Y-%m-%d', '%Y-%m-%d %H:%M:%S', '%d/%m/%Y']:
                        try:
                            order_date = datetime.strptime(order_date_str[:10], '%Y-%m-%d').date()
                            break
                        except ValueError:
                            continue
                    
                    if not order_date:
                        logger.error(f"📅 Order {order.get('id')}: NÃO conseguiu parsear data {order_date_str}")
                        continue
                    
                    logger.error(f"📅 Order {order.get('id')}: data_parseada={order_date}")
                    
                    if start_date <= order_date <= end_date:
                        logger.error(f"📅 Order {order.get('id')}: ✅ INCLUÍDO no filtro")
                        filtered_orders.append(order)
                    else:
                        logger.error(f"📅 Order {order.get('id')}: ❌ EXCLUÍDO (fora do período)")
                        
                except (ValueError, TypeError) as e:
                    logger.error(f"📅 Order {order.get('id')}: ERRO ao processar data: {e}")
                    continue
            
            logger.error(f"📅 Filtro de data aplicado: {len(orders)} -> {len(filtered_orders)} orders")
            return filtered_orders
            
        except ValueError as e:
            logger.error(f"Erro no filtro de data: {str(e)}")
            return orders
    
    def process_orders_data(self, orders: List[Dict], pais_filtro: Optional[str] = None) -> Dict:
        """
        Processa dados de orders e cria tabela cruzada por Produto x País x Status
        
        Args:
            orders: Lista de orders da API
            pais_filtro: País específico para filtrar (opcional)
            
        Returns:
            Dict com dados processados em formato de tabela cruzada
        """
        
        if not orders:
            return {
                'dados_processados': [],
                'estatisticas': {
                    'total_orders': 0,
                    'produtos_unicos': 0,
                    'paises_unicos': 0,
                    'status_unicos': 0
                },
                'status_nao_mapeados': []
            }
        
        # Agrupar dados por Produto + País + Status
        agrupamento = {}
        status_nao_mapeados = set()
        produtos = set()
        paises = set()
        status_encontrados = set()
        
        for order in orders:
            # Extrair nome do produto dos produtos aninhados
            produto = 'Produto Desconhecido'
            if order.get('products') and len(order['products']) > 0:
                produto = order['products'][0].get('name', 'Produto Desconhecido')
            
            # Extrair país (é um objeto, não string)
            pais_obj = order.get('country', {})
            pais = pais_obj.get('name', 'País Desconhecido') if isinstance(pais_obj, dict) else str(pais_obj)
            
            # Status de shipping  
            status_original = order.get('shipping_status', 'Status Desconhecido')
            
            # Aplicar filtro de país se especificado
            if pais_filtro and pais.lower() != pais_filtro.lower():
                continue
            
            # Mapear status para português
            status = self.status_mapping.get(status_original, status_original)
            if status == status_original and status_original not in self.status_mapping:
                status_nao_mapeados.add(status_original)
            
            produtos.add(produto)
            paises.add(pais)
            status_encontrados.add(status)
            
            # Criar chave única para agrupamento
            chave = (produto, pais)
            
            if chave not in agrupamento:
                agrupamento[chave] = {
                    'Produto': produto,
                    'País': pais,
                    'Total': 0
                }
            
            # Incrementar contador do status
            if status not in agrupamento[chave]:
                agrupamento[chave][status] = 0
            
            agrupamento[chave][status] += 1
            agrupamento[chave]['Total'] += 1
        
        # Converter para lista e ordenar
        dados_processados = list(agrupamento.values())
        dados_processados.sort(key=lambda x: (x['Produto'], x['País']))
        
        # Calcular estatísticas
        estatisticas = {
            'total_orders': len(orders),
            'produtos_unicos': len(produtos),
            'paises_unicos': len(paises),
            'status_unicos': len(status_encontrados),
            'orders_processados': sum(item['Total'] for item in dados_processados)
        }
        
        logger.info(f"Processamento concluído: {estatisticas['total_orders']} orders -> {len(dados_processados)} linhas agrupadas")
        
        return {
            'dados_processados': dados_processados,
            'estatisticas': estatisticas,
            'status_nao_mapeados': list(status_nao_mapeados),
            'status': 'success'
        }
    
    def test_connection(self) -> Dict:
        """Testa conectividade com API PrimeCOD"""
        try:
            # Testar com um endpoint que sabemos que existe (orders página 1)
            # Usar método POST como na documentação real
            response = self._make_request('POST', f"{self.base_url}/orders?page=1", json={})
            
            return {
                'status': 'success',
                'message': 'Conexão com PrimeCOD estabelecida com sucesso',
                'api_status': response.status_code,
                'token_valido': True
            }
            
        except PrimeCODAPIError as e:
            # Se for erro de token (401), reportar especificamente
            if "401" in str(e):
                return {
                    'status': 'error',
                    'message': 'Token PrimeCOD inválido ou expirado',
                    'api_status': 401,
                    'token_valido': False
                }
            else:
                return {
                    'status': 'error',
                    'message': f'Erro na API PrimeCOD: {str(e)}',
                    'api_status': None,
                    'token_valido': False
                }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Erro inesperado ao conectar: {str(e)}',
                'api_status': None,
                'token_valido': False
            }