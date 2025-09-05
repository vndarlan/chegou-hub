#!/usr/bin/env python
"""
Teste específico para verificar a lógica de fallback quando campo 'data' está vazio
Simula cenários onde a API PrimeCOD retorna diferentes estruturas de dados
"""

import os
import sys
import django

# Configurar Django
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.metricas_primecod.clients.primecod_client import PrimeCODClient
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MockPrimeCODClient(PrimeCODClient):
    """Cliente mock para testar a lógica de fallback"""
    
    def __init__(self):
        # Não chamar super().__init__() para evitar verificação de token
        self.status_mapping = {
            1: 'Pedido Realizado',
            7: 'Entregue',
            12: 'Cancelado'
        }
    
    def _simulate_api_response_data_empty(self):
        """Simula resposta da API com campo 'data' vazio"""
        return {
            'data': [],  # Campo data vazio (problema original)
            'orders': [  # Dados estão numa chave alternativa
                {
                    'id': '1001',
                    'shipping_status': 1,
                    'country': {'name': 'Brasil'},
                    'products': [{'name': 'Produto Teste 1'}]
                },
                {
                    'id': '1002', 
                    'shipping_status': 7,
                    'country': {'name': 'Brasil'},
                    'products': [{'name': 'Produto Teste 2'}]
                }
            ],
            'total': 2,
            'last_page': 1,
            'current_page': 1
        }
    
    def _simulate_api_response_no_standard_keys(self):
        """Simula resposta com estrutura não padrão"""
        return {
            'data': [],
            'custom_orders': [  # Chave não padrão
                {
                    'id': '2001',
                    'shipping_status': 12,
                    'country': {'name': 'Argentina'},
                    'products': [{'name': 'Produto Argentina'}]
                }
            ],
            'total': 1,
            'last_page': 1
        }

def test_data_fallback_logic():
    """
    Testa a lógica de fallback quando campo 'data' está vazio
    """
    print("TESTANDO LOGICA DE FALLBACK: Campo 'data' vazio")
    print("=" * 55)
    
    client = MockPrimeCODClient()
    
    # TESTE 1: Campo 'data' vazio mas dados em chave 'orders'
    print("\n[TESTE 1] Campo 'data' vazio, dados em chave 'orders'")
    response1 = client._simulate_api_response_data_empty()
    
    print(f"[ESTRUTURA] Resposta: {list(response1.keys())}")
    print(f"[PROBLEMA] Campo 'data': {len(response1.get('data', []))} items")
    print(f"[SOLUCAO] Campo 'orders': {len(response1.get('orders', []))} items")
    
    # Simular a lógica de fallback
    orders = response1.get('data', [])
    if not orders:
        print("[FALLBACK] Campo 'data' vazio! Verificando chaves alternativas...")
        
        # Lista de chaves alternativas (nossa correção)
        possible_keys = ['orders', 'results', 'items', 'records', 'order_data', 'order_list', 'content']
        
        for alt_key in possible_keys:
            if alt_key in response1:
                alt_orders = response1.get(alt_key, [])
                print(f"[ENCONTRADO] Chave '{alt_key}' com {len(alt_orders)} items")
                if alt_orders and isinstance(alt_orders, list):
                    print(f"[SUCESSO] Usando chave '{alt_key}' - {len(alt_orders)} orders encontrados")
                    orders = alt_orders
                    break
    
    if orders:
        print(f"[RESULTADO] {len(orders)} orders extraidos com sucesso!")
        
        # Testar processamento
        processed = client.process_orders_data(orders)
        dados_processados = processed.get('dados_processados', [])
        
        print(f"[PROCESSAMENTO] {len(dados_processados)} linhas processadas")
        
        # Verificar linha TOTAL
        linha_total = next((item for item in dados_processados if item.get('produto') == 'TOTAL'), None)
        if linha_total:
            print(f"[SUCESSO] Linha TOTAL criada: {linha_total}")
        else:
            print("[ERRO] Linha TOTAL NAO foi criada!")
    else:
        print("[ERRO] Nenhum order foi extraido!")
    
    # TESTE 2: Estrutura completamente não padrão
    print(f"\n[TESTE 2] Estrutura nao padrao (chave 'custom_orders')")
    response2 = client._simulate_api_response_no_standard_keys()
    
    print(f"[ESTRUTURA] Resposta: {list(response2.keys())}")
    print(f"[PROBLEMA] Campo 'data': {len(response2.get('data', []))} items")
    print(f"[DESAFIO] Campo 'custom_orders': {len(response2.get('custom_orders', []))} items")
    
    # Simular lógica de emergência (nossa correção avançada)
    orders2 = response2.get('data', [])
    if not orders2:
        print("[FALLBACK] Campo 'data' vazio! Tentando deteccao automatica...")
        
        # Verificar qualquer chave que contenha lista de objetos (lógica de emergência)
        for key, value in response2.items():
            if isinstance(value, list) and value:
                print(f"[DETECTADO] Chave '{key}' contem lista com {len(value)} items")
                first_item = value[0]
                if isinstance(first_item, dict) and any(field in first_item for field in ['id', 'order_id', 'shipping_status', 'products']):
                    print(f"[EMERGENCIA] Chave '{key}' parece conter orders validos!")
                    orders2 = value
                    break
    
    if orders2:
        print(f"[RESULTADO] {len(orders2)} orders extraidos via deteccao automatica!")
        processed2 = client.process_orders_data(orders2)
        dados_processados2 = processed2.get('dados_processados', [])
        print(f"[PROCESSAMENTO] {len(dados_processados2)} linhas processadas")
    else:
        print("[ERRO] Deteccao automatica falhou!")
    
    print(f"\n[CONCLUSAO] Teste da logica de fallback concluido!")
    print("=" * 55)

if __name__ == "__main__":
    test_data_fallback_logic()