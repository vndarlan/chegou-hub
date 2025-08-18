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
                   max_pages: int = 400,
                   country_filter: Optional[str] = None) -> Dict:
        """
        Busca TODOS os orders da API PrimeCOD coletando todas as páginas
        e aplicando filtros de data e país localmente após coleta completa.
        
        IMPLEMENTAÇÃO CRÍTICA:
        - API PrimeCOD NÃO suporta filtros de data nem país
        - Deve buscar TODAS as páginas (10 pedidos por página) até página vazia
        - Filtros são aplicados APÓS coletar todos os dados
        
        Args:
            page: Página inicial (sempre 1 para coleta completa)
            date_range: {'start': 'YYYY-MM-DD', 'end': 'YYYY-MM-DD'} - aplicado localmente
            max_pages: Máximo de páginas para buscar (proteção contra loop infinito)
            country_filter: País para filtrar localmente
            
        Returns:
            Dict com orders filtrados, total_pages, filtros aplicados, etc.
        """
        
        # Cache baseado apenas em coleta completa (sem filtros na API)
        cached_result = None
        cache_key = None
        try:
            import hashlib
            # Cache para coleta completa - não inclui filtros pois são aplicados localmente
            cache_data = "primecod_orders_complete_collection"
            cache_key = hashlib.md5(cache_data.encode()).hexdigest()[:20]
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info("🎯 Usando dados completos em cache, aplicando filtros localmente")
                # Aplicar filtros nos dados em cache
                all_orders = cached_result.get('all_orders_raw', [])
                filtered_orders = self._apply_local_filters(all_orders, date_range, country_filter)
                
                return {
                    'orders': filtered_orders,
                    'total_orders': len(filtered_orders),
                    'total_orders_raw': len(all_orders),
                    'pages_processed': cached_result.get('pages_processed', 0),
                    'total_pages': cached_result.get('total_pages', 0),
                    'date_range_applied': date_range,
                    'country_filter_applied': country_filter,
                    'status': 'success',
                    'data_source': 'cache'
                }
        except Exception as e:
            logger.warning(f"Cache não disponível, prosseguindo com coleta completa: {str(e)}")
            cached_result = None
        
        url = f"{self.base_url}/orders"
        
        # CRÍTICO: Payload VAZIO - sem filtros para API
        payload = {}
        
        logger.info(f"🚀 Iniciando coleta COMPLETA de orders PrimeCOD")
        logger.info(f"🚀 URL base: {url}")
        logger.info(f"🚀 Payload (sem filtros): {payload}")
        logger.info(f"🚀 Filtros serão aplicados LOCALMENTE após coleta")
        
        all_orders = []
        current_page = 1  # SEMPRE começar da página 1
        total_pages = None
        pages_processed = 0
        
        try:
            logger.info(f"🚀 Iniciando loop para coletar TODAS as páginas...")
            
            while current_page <= max_pages:
                logger.info(f"📄 Processando página {current_page}")
                
                # Proteção contra loop infinito
                if pages_processed >= max_pages:
                    logger.warning(f"⚠️ Limite de {max_pages} páginas atingido - interrompendo coleta")
                    break
                
                # Fazer requisição para página atual SEM FILTROS
                page_url = f"{url}?page={current_page}"
                logger.info(f"🌐 Requisição: {page_url}")
                
                response = self._make_request('POST', page_url, json=payload)
                logger.info(f"✅ Response recebido - Status: {response.status_code}")
                
                data = response.json()
                logger.info(f"📊 Estrutura da resposta: {list(data.keys()) if isinstance(data, dict) else type(data)}")
                
                # Extrair orders da resposta
                orders = data.get('data', [])
                logger.info(f"📦 Orders na página {current_page}: {len(orders)}")
                
                # CONDIÇÃO DE PARADA: página completamente vazia (0 orders)
                if not orders or len(orders) == 0:
                    logger.info(f"🏁 Página {current_page} completamente vazia (0 orders) - finalizando coleta")
                    break
                
                # Adicionar todos os orders desta página (SEM filtros)
                all_orders.extend(orders)
                
                # Obter informações de paginação da resposta
                if total_pages is None:
                    total_pages = data.get('last_page', current_page)
                    logger.info(f"📊 Total de páginas detectado: {total_pages}")
                
                current_page += 1
                pages_processed += 1
                
                # Log de progresso a cada 5 páginas para melhor visibilidade
                if pages_processed % 5 == 0:
                    logger.info(f"📊 Progresso: {pages_processed} páginas processadas, {len(all_orders)} orders coletados")
                
                # Log mais frequente quando próximo do total esperado
                if total_pages and current_page > total_pages - 5:
                    logger.info(f"🔍 Próximo do fim: página {current_page}/{total_pages}, orders: {len(orders)}")
            
            logger.info(f"🎯 Coleta completa finalizada:")
            logger.info(f"📊 Total de páginas processadas: {pages_processed}")
            logger.info(f"📦 Total de orders coletados: {len(all_orders)}")
            logger.info(f"📄 Última página processada: {current_page - 1}")
            logger.info(f"📊 Total de páginas disponíveis detectado: {total_pages}")
            
            # Verificar se parou porque atingiu o máximo ou porque encontrou página vazia
            if pages_processed >= max_pages:
                logger.warning(f"⚠️ Coleta interrompida: atingiu limite máximo de {max_pages} páginas")
            else:
                logger.info(f"✅ Coleta finalizada normalmente: encontrou página vazia na página {current_page}")
            
            # Salvar dados completos no cache ANTES de aplicar filtros
            if cache_key:
                try:
                    cache_data = {
                        'all_orders_raw': all_orders,
                        'pages_processed': pages_processed,
                        'total_pages': total_pages,
                        'collected_at': datetime.now().isoformat()
                    }
                    cache.set(cache_key, cache_data, 600)  # Cache por 10 minutos
                    logger.info(f"💾 Dados completos salvos no cache")
                except Exception as e:
                    logger.warning(f"⚠️ Falha ao salvar no cache: {str(e)}")
            
            # AGORA aplicar filtros localmente
            logger.info(f"🔍 Aplicando filtros localmente aos {len(all_orders)} orders coletados")
            filtered_orders = self._apply_local_filters(all_orders, date_range, country_filter)
            
            result = {
                'orders': filtered_orders,
                'total_orders': len(filtered_orders),
                'total_orders_raw': len(all_orders),
                'pages_processed': pages_processed,
                'total_pages': total_pages,
                'date_range_applied': date_range,
                'country_filter_applied': country_filter,
                'status': 'success',
                'data_source': 'api'
            }
            
            logger.info(f"✅ Busca finalizada com sucesso:")
            logger.info(f"📦 Orders coletados (bruto): {len(all_orders)}")
            logger.info(f"🔍 Orders após filtros aplicados: {len(filtered_orders)}")
            logger.info(f"📄 Páginas processadas: {pages_processed}")
            logger.info(f"📅 Filtro de data aplicado: {'Sim' if date_range else 'Não'}")
            logger.info(f"🌍 Filtro de país aplicado: {'Não (Todos os países)' if not country_filter or country_filter.lower().strip() in ['todos', 'todos os países', 'all', 'all countries'] else f'Sim ({country_filter})'}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar orders PrimeCOD: {str(e)}")
            raise PrimeCODAPIError(f"Erro na busca de orders: {str(e)}")
    
    def _apply_local_filters(self, orders: List[Dict], date_range: Optional[Dict[str, str]] = None, country_filter: Optional[str] = None) -> List[Dict]:
        """
        Aplica todos os filtros localmente aos orders coletados
        
        Args:
            orders: Lista completa de orders da API
            date_range: Filtro de data {'start': 'YYYY-MM-DD', 'end': 'YYYY-MM-DD'}
            country_filter: Nome do país para filtrar
            
        Returns:
            Lista de orders filtrados
        """
        if not orders:
            logger.info("🔍 Nenhum order para filtrar")
            return orders
        
        filtered_orders = orders.copy()
        logger.info(f"🔍 Iniciando filtros locais: {len(filtered_orders)} orders")
        
        # Aplicar filtro de data se especificado
        if date_range and date_range.get('start') and date_range.get('end'):
            logger.info(f"📅 Aplicando filtro de data: {date_range['start']} até {date_range['end']}")
            filtered_orders = self._filter_orders_by_date(filtered_orders, date_range)
            logger.info(f"📅 Após filtro de data: {len(filtered_orders)} orders")
        
        # Aplicar filtro de país se especificado E se não for "todos"
        if country_filter and country_filter.lower().strip() not in ['todos', 'todos os países', 'all', 'all countries']:
            logger.info(f"🌍 Aplicando filtro de país: {country_filter}")
            filtered_orders = self._filter_orders_by_country(filtered_orders, country_filter)
            logger.info(f"🌍 Após filtro de país: {len(filtered_orders)} orders")
        elif country_filter:
            logger.info(f"🌍 Filtro de país '{country_filter}' detectado como 'TODOS' - pulando filtro de país")
        
        logger.info(f"✅ Filtros aplicados: {len(orders)} -> {len(filtered_orders)} orders")
        return filtered_orders
    
    def _filter_orders_by_date(self, orders: List[Dict], date_range: Dict[str, str]) -> List[Dict]:
        """Filtra orders por data localmente"""
        logger.info(f"📅 Aplicando filtro de data: {date_range}")
        
        if not date_range.get('start') or not date_range.get('end'):
            logger.info("📅 Filtro de data incompleto, retornando todos os orders")
            return orders
        
        try:
            start_date = datetime.strptime(date_range['start'], '%Y-%m-%d').date()
            end_date = datetime.strptime(date_range['end'], '%Y-%m-%d').date()
            
            logger.info(f"📅 Período de filtro: {start_date} até {end_date}")
            
            filtered_orders = []
            orders_without_date = 0
            
            for order in orders:
                # Tentar diferentes campos de data
                order_date_str = order.get('created_at') or order.get('date') or order.get('order_date')
                
                if not order_date_str:
                    orders_without_date += 1
                    continue
                
                try:
                    # Tentar diferentes formatos de data
                    order_date = None
                    # Extrair apenas a parte da data (primeiros 10 caracteres)
                    date_part = str(order_date_str)[:10]
                    
                    for date_format in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                        try:
                            order_date = datetime.strptime(date_part, date_format).date()
                            break
                        except ValueError:
                            continue
                    
                    if not order_date:
                        orders_without_date += 1
                        continue
                    
                    # Verificar se a data está no período especificado
                    if start_date <= order_date <= end_date:
                        filtered_orders.append(order)
                        
                except (ValueError, TypeError) as e:
                    orders_without_date += 1
                    continue
            
            logger.info(f"📅 Resultado do filtro de data:")
            logger.info(f"   - Orders no período: {len(filtered_orders)}")
            logger.info(f"   - Orders sem data válida: {orders_without_date}")
            logger.info(f"   - Total processados: {len(orders)}")
            
            return filtered_orders
            
        except ValueError as e:
            logger.error(f"❌ Erro no filtro de data: {str(e)}")
            return orders
    
    def _filter_orders_by_country(self, orders: List[Dict], country_filter: str) -> List[Dict]:
        """Filtra orders por país localmente"""
        logger.info(f"🌍 Aplicando filtro de país: {country_filter}")
        
        if not country_filter:
            logger.info(f"🌍 Country filter vazio - retornando todos os orders")
            return orders
        
        # Se o filtro for "todos" em qualquer variação, retornar todos
        if country_filter.lower().strip() in ['todos', 'todos os países', 'all', 'all countries']:
            logger.info(f"🌍 Country filter '{country_filter}' detectado como 'TODOS' - retornando todos os orders")
            return orders
        
        filtered_orders = []
        country_filter_lower = country_filter.lower().strip()
        orders_without_country = 0
        
        for order in orders:
            # Extrair país (pode ser objeto ou string)
            country_obj = order.get('country', {})
            
            if isinstance(country_obj, dict):
                country_name = country_obj.get('name', '')
            else:
                country_name = str(country_obj)
            
            if not country_name:
                orders_without_country += 1
                continue
            
            # Comparação case-insensitive
            if country_name.lower().strip() == country_filter_lower:
                filtered_orders.append(order)
        
        logger.info(f"🌍 Resultado do filtro de país:")
        logger.info(f"   - Orders do país '{country_filter}': {len(filtered_orders)}")
        logger.info(f"   - Orders sem país válido: {orders_without_country}")
        logger.info(f"   - Total processados: {len(orders)}")
        
        return filtered_orders
    
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
                    'produto': produto,
                    'pais': pais,
                    'total': 0
                }
            
            # Incrementar contador do status
            if status not in agrupamento[chave]:
                agrupamento[chave][status] = 0
            
            agrupamento[chave][status] += 1
            agrupamento[chave]['total'] += 1
        
        # Converter para lista e ordenar
        dados_processados = list(agrupamento.values())
        dados_processados.sort(key=lambda x: (x['produto'], x['pais']))
        
        # Criar linha de TOTAL agregado
        if dados_processados:
            # Coletar todos os status únicos dos dados
            status_unicos = set()
            for item in dados_processados:
                for key in item.keys():
                    if key not in ['produto', 'pais', 'total']:
                        status_unicos.add(key)
            
            # Calcular totais por status
            total_row = {
                'produto': 'TOTAL',
                'pais': 'Todos',
                'total': sum(item['total'] for item in dados_processados)
            }
            
            # Somar todos os status
            for status in status_unicos:
                total_row[status] = sum(item.get(status, 0) for item in dados_processados)
            
            # Adicionar linha TOTAL ao final
            dados_processados.append(total_row)
        
        # Calcular estatísticas
        estatisticas = {
            'total_orders': len(orders),
            'produtos_unicos': len(produtos),
            'paises_unicos': len(paises),
            'status_unicos': len(status_encontrados),
            'orders_processados': sum(item['total'] for item in dados_processados)
        }
        
        logger.info(f"Processamento concluído: {estatisticas['total_orders']} orders -> {len(dados_processados)} linhas agrupadas")
        
        # DEBUG: Log da estrutura dos dados processados
        logger.info(f"🔍 DEBUG: Primeiros 3 items dos dados processados:")
        for i, item in enumerate(dados_processados[:3]):
            logger.info(f"   [{i}] {item}")
        if len(dados_processados) > 3:
            logger.info(f"   ... e mais {len(dados_processados) - 3} items")
        
        # DEBUG: Log da linha TOTAL se existir
        total_row = next((item for item in dados_processados if item.get('produto') == 'TOTAL'), None)
        if total_row:
            logger.info(f"🔍 DEBUG: Linha TOTAL encontrada: {total_row}")
        else:
            logger.info(f"🔍 DEBUG: Nenhuma linha TOTAL encontrada")
        
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