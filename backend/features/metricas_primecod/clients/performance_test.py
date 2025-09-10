"""
Teste de Performance PrimeCOD - Comparação de Métodos de Coleta
Testa duas abordagens: Paginação com filtros vs Coleta completa + filtro local
"""

import time
import logging
from typing import Dict, Tuple
from .primecod_client import PrimeCODClient

logger = logging.getLogger(__name__)

class PrimeCODPerformanceTest:
    """Testa performance de diferentes métodos de coleta"""
    
    def __init__(self):
        self.client = PrimeCODClient()
    
    def test_paginated_with_filters(self, date_range: Dict[str, str]) -> Tuple[Dict, float]:
        """
        Teste 1: Paginação com filtros de data via API
        """
        logger.info(f"[TESTE 1] INICIANDO: Paginação com filtros via API")
        logger.info(f"[TESTE 1] Período: {date_range['start']} até {date_range['end']}")
        
        start_time = time.time()
        
        try:
            # Usar método original com filtros
            resultado = self.client.get_orders_paginated_with_filters(
                date_range=date_range,
                max_pages=500  # Limite seguro
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            logger.info(f"[TESTE 1] CONCLUÍDO em {duration:.2f}s")
            logger.info(f"[TESTE 1] Orders coletados: {len(resultado.get('orders', []))}")
            
            return resultado, duration
            
        except Exception as e:
            end_time = time.time()
            duration = end_time - start_time
            
            logger.error(f"[TESTE 1] FALHOU em {duration:.2f}s: {str(e)}")
            return {"error": str(e), "orders": []}, duration
    
    def test_full_collection_with_local_filter(self, date_range: Dict[str, str]) -> Tuple[Dict, float]:
        """
        Teste 2: Coleta completa sem filtros + filtro local
        """
        logger.info(f"[TESTE 2] INICIANDO: Coleta completa + filtro local")
        logger.info(f"[TESTE 2] Período: {date_range['start']} até {date_range['end']}")
        
        start_time = time.time()
        
        try:
            # Coletar todos os dados sem filtros
            resultado_completo = self.client.get_orders_complete_no_filters(
                max_pages=500  # Limite seguro
            )
            
            # Aplicar filtro de data localmente
            all_orders = resultado_completo.get('orders', [])
            filtered_orders = self.client._apply_local_filters(
                orders=all_orders,
                date_range=date_range,
                country_filter=None
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            logger.info(f"[TESTE 2] CONCLUÍDO em {duration:.2f}s")
            logger.info(f"[TESTE 2] Orders coletados (total): {len(all_orders)}")
            logger.info(f"[TESTE 2] Orders após filtro: {len(filtered_orders)}")
            
            resultado = {
                'orders': filtered_orders,
                'total_orders': len(filtered_orders),
                'total_orders_raw': len(all_orders),
                'pages_processed': resultado_completo.get('pages_processed', 0),
                'method': 'complete_collection_local_filter'
            }
            
            return resultado, duration
            
        except Exception as e:
            end_time = time.time()
            duration = end_time - start_time
            
            logger.error(f"[TESTE 2] FALHOU em {duration:.2f}s: {str(e)}")
            return {"error": str(e), "orders": []}, duration
    
    def run_performance_comparison(self, date_range: Dict[str, str]) -> Dict:
        """
        Executa ambos os testes e compara performance
        """
        logger.info(f"[COMPARAÇÃO] INICIANDO testes de performance")
        logger.info(f"[COMPARAÇÃO] Período de teste: {date_range['start']} - {date_range['end']}")
        
        # Executar Teste 1: Paginação com filtros
        resultado1, tempo1 = self.test_paginated_with_filters(date_range)
        
        # Pausa entre testes para não sobrecarregar API
        time.sleep(5)
        
        # Executar Teste 2: Coleta completa + filtro local
        resultado2, tempo2 = self.test_full_collection_with_local_filter(date_range)
        
        # Comparação de resultados
        orders1 = len(resultado1.get('orders', []))
        orders2 = len(resultado2.get('orders', []))
        
        # Determinar vencedor
        if tempo1 < tempo2:
            vencedor = "Teste 1 (Paginação com filtros)"
            diferenca = tempo2 - tempo1
            percentual = ((tempo2 - tempo1) / tempo2) * 100
        else:
            vencedor = "Teste 2 (Coleta completa + filtro local)"
            diferenca = tempo1 - tempo2
            percentual = ((tempo1 - tempo2) / tempo1) * 100
        
        resultado_comparacao = {
            'teste1_paginacao_com_filtros': {
                'tempo': tempo1,
                'orders': orders1,
                'erro': 'error' in resultado1,
                'detalhes': resultado1
            },
            'teste2_coleta_completa_filtro_local': {
                'tempo': tempo2,
                'orders': orders2,
                'erro': 'error' in resultado2,
                'detalhes': resultado2
            },
            'comparacao': {
                'vencedor': vencedor,
                'diferenca_segundos': diferenca,
                'diferenca_percentual': percentual,
                'consistencia_dados': orders1 == orders2
            }
        }
        
        # Log resultado final
        logger.info(f"[COMPARAÇÃO] RESULTADO FINAL:")
        logger.info(f"   Teste 1 (Paginação): {tempo1:.2f}s - {orders1} orders")
        logger.info(f"   Teste 2 (Coleta completa): {tempo2:.2f}s - {orders2} orders")
        logger.info(f"   Vencedor: {vencedor}")
        logger.info(f"   Diferença: {diferenca:.2f}s ({percentual:.1f}% mais rápido)")
        logger.info(f"   Consistência de dados: {orders1 == orders2}")
        
        return resultado_comparacao


# Métodos auxiliares para o cliente PrimeCOD
def add_performance_methods():
    """Adiciona métodos de teste ao PrimeCODClient"""
    
    def get_orders_paginated_with_filters(self, date_range=None, max_pages=200):
        """Método de paginação com filtros - versão corrigida"""
        
        url = f"{self.base_url}/orders"
        payload = {"page": 1}
        
        # Aplicar filtros de data
        if date_range and date_range.get('start') and date_range.get('end'):
            payload["start_date"] = date_range['start']
            payload["end_date"] = date_range['end']
        
        all_orders = []
        current_page = 1
        pages_processed = 0
        consecutive_empty_pages = 0
        
        logger.info(f"[PAGINAÇÃO] Iniciando coleta paginada com filtros")
        
        while current_page <= max_pages:
            payload["page"] = current_page
            
            try:
                response = self._make_request('POST', url, json=payload)
                data = response.json()
                
                # Informações de paginação
                current_page_api = data.get('current_page', current_page)
                last_page = data.get('last_page', 1)
                total = data.get('total', 0)
                
                logger.info(f"[PAGINAÇÃO] Página {current_page}: current_page={current_page_api}, last_page={last_page}, total={total}")
                
                # CORREÇÃO CRÍTICA: Múltiplas verificações de parada
                if current_page_api > last_page:
                    logger.info(f"[PAGINAÇÃO] FIM: Página {current_page_api} > last_page {last_page}")
                    break
                
                # CORREÇÃO ADICIONAL: Parar se current_page (nossa variável) > last_page
                if current_page > last_page:
                    logger.info(f"[PAGINAÇÃO] FIM: current_page {current_page} > last_page {last_page} - fim por limite de paginação")
                    break
                
                # Extrair orders
                orders = data.get('data', [])
                
                if not orders:
                    consecutive_empty_pages += 1
                    logger.info(f"[PAGINAÇÃO] Página {current_page} vazia ({consecutive_empty_pages} consecutivas)")
                    
                    # CORREÇÃO CRÍTICA: Parar se chegamos ao fim da paginação
                    if current_page_api >= last_page or current_page > last_page:
                        logger.info(f"[PAGINAÇÃO] FIM: Página vazia E chegou ao fim (página {current_page_api}/{last_page})")
                        break
                    
                    # Se 3 páginas vazias consecutivas, parar
                    if consecutive_empty_pages >= 3:
                        logger.info(f"[PAGINAÇÃO] FIM: 3 páginas vazias consecutivas")
                        break
                else:
                    consecutive_empty_pages = 0
                    all_orders.extend(orders)
                    logger.info(f"[PAGINAÇÃO] Página {current_page}: +{len(orders)} orders (total: {len(all_orders)})")
                
                pages_processed += 1
                
                # CORREÇÃO CRÍTICA: Parar ANTES de incrementar se já atingiu última página
                if current_page >= last_page:
                    logger.info(f"[PAGINAÇÃO] FIM: Atingiu última página {last_page} - PARANDO")
                    break
                
                current_page += 1
                
                # PROTEÇÃO FINAL: Nunca passar do max_pages
                if current_page > max_pages:
                    logger.info(f"[PAGINAÇÃO] FIM: Atingiu max_pages {max_pages}")
                    break
                
            except Exception as e:
                logger.error(f"[PAGINAÇÃO] Erro na página {current_page}: {str(e)}")
                break
        
        return {
            'orders': all_orders,
            'total_orders': len(all_orders),
            'pages_processed': pages_processed,
            'method': 'paginated_with_filters'
        }
    
    def get_orders_complete_no_filters(self, max_pages=200):
        """Método de coleta completa sem filtros - versão corrigida"""
        
        url = f"{self.base_url}/orders"
        payload = {"page": 1}
        
        all_orders = []
        current_page = 1
        pages_processed = 0
        consecutive_empty_pages = 0
        
        logger.info(f"[COLETA_COMPLETA] Iniciando coleta completa sem filtros")
        
        while current_page <= max_pages:
            payload["page"] = current_page
            
            try:
                response = self._make_request('POST', url, json=payload)
                data = response.json()
                
                # Informações de paginação
                current_page_api = data.get('current_page', current_page)
                last_page = data.get('last_page', 1)
                total = data.get('total', 0)
                
                logger.info(f"[COLETA_COMPLETA] Página {current_page}: current_page={current_page_api}, last_page={last_page}, total={total}")
                
                # CORREÇÃO CRÍTICA: Parar se current_page > last_page
                if current_page_api > last_page:
                    logger.info(f"[COLETA_COMPLETA] FIM: Página {current_page_api} > last_page {last_page}")
                    break
                
                # Extrair orders
                orders = data.get('data', [])
                
                if not orders:
                    consecutive_empty_pages += 1
                    logger.info(f"[COLETA_COMPLETA] Página {current_page} vazia ({consecutive_empty_pages} consecutivas)")
                    
                    # Se 3 páginas vazias consecutivas, parar
                    if consecutive_empty_pages >= 3:
                        logger.info(f"[COLETA_COMPLETA] FIM: 3 páginas vazias consecutivas")
                        break
                else:
                    consecutive_empty_pages = 0
                    all_orders.extend(orders)
                    logger.info(f"[COLETA_COMPLETA] Página {current_page}: +{len(orders)} orders (total: {len(all_orders)})")
                
                current_page += 1
                pages_processed += 1
                
                # Parar se atingiu última página conhecida
                if current_page > last_page:
                    logger.info(f"[COLETA_COMPLETA] FIM: Atingiu última página {last_page}")
                    break
                
            except Exception as e:
                logger.error(f"[COLETA_COMPLETA] Erro na página {current_page}: {str(e)}")
                break
        
        return {
            'orders': all_orders,
            'total_orders': len(all_orders),
            'pages_processed': pages_processed,
            'method': 'complete_no_filters'
        }
    
    # Adicionar métodos à classe PrimeCODClient
    PrimeCODClient.get_orders_paginated_with_filters = get_orders_paginated_with_filters
    PrimeCODClient.get_orders_complete_no_filters = get_orders_complete_no_filters

# Executar ao importar
add_performance_methods()