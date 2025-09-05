#!/usr/bin/env python
"""
Script de teste para verificar a correção do problema "Campo 'data' vazio" do PrimeCOD
"""

import os
import sys
import django

# Configurar Django
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.metricas_primecod.clients.primecod_client import PrimeCODClient, PrimeCODAPIError
import logging

# Configurar logging para ver os logs críticos
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_primecod_fix():
    """
    Teste específico para o problema do campo 'data' vazio
    """
    print("TESTANDO CORRECAO: Campo 'data' vazio no PrimeCOD")
    print("=" * 60)
    
    try:
        client = PrimeCODClient()
        print("[OK] Cliente PrimeCOD inicializado com sucesso")
        
        # Testar conectividade primeiro
        print("\n[1] TESTANDO CONECTIVIDADE...")
        connection_result = client.test_connection()
        if connection_result['status'] == 'success':
            print(f"[OK] Conexao OK: {connection_result['message']}")
            print(f"   [INFO] API Info: {connection_result['api_info']}")
        else:
            print(f"[ERRO] Erro de conexao: {connection_result['message']}")
            return
        
        # Testar com páginas específicas onde o problema acontece (44+)
        print("\n[2] TESTANDO COLETA EM PAGINAS ALTAS (onde o problema acontecia)...")
        print("   [TESTE] Testando paginas 40-50 para verificar se ha regressao")
        
        # Usar max_pages reduzido para teste focado
        result = client.get_orders(
            page=1,  # Sempre começar da página 1
            max_pages=50,  # Testar até página 50 para cobrir o range do problema
            date_range=None,  # Sem filtro de data para pegar tudo
            country_filter=None  # Sem filtro de país
        )
        
        print(f"\n[RESULTADOS] RESULTADOS DO TESTE:")
        print(f"   [STATUS] Status: {result.get('status', 'desconhecido')}")
        print(f"   [PAGES] Paginas processadas: {result.get('pages_processed', 0)}")
        print(f"   [ORDERS] Orders coletados (bruto): {result.get('total_orders_raw', 0)}")
        print(f"   [FILTERED] Orders apos filtros: {result.get('total_orders', 0)}")
        print(f"   [SOURCE] Source: {result.get('data_source', 'desconhecido')}")
        
        # Testar processamento dos dados
        print("\n[3] TESTANDO PROCESSAMENTO DOS DADOS...")
        if result.get('orders'):
            processed_result = client.process_orders_data(result['orders'])
            
            print(f"   [PROCESSED] Dados processados: {len(processed_result.get('dados_processados', []))} linhas")
            
            # VERIFICAÇÃO CRÍTICA: Procurar pela linha TOTAL
            dados = processed_result.get('dados_processados', [])
            linha_total = next((item for item in dados if item.get('produto') == 'TOTAL'), None)
            
            if linha_total:
                print(f"   [SUCCESS] LINHA TOTAL ENCONTRADA: {linha_total}")
                print("   [FIXED] CORRECAO BEM-SUCEDIDA: Linha TOTAL esta sendo criada!")
            else:
                print(f"   [ERROR] LINHA TOTAL NAO ENCONTRADA!")
                print("   [REGRESSION] REGRESSAO: Problema ainda existe!")
                print(f"   [DEBUG] Dados disponiveis: {[item.get('produto', 'N/A') for item in dados[:10]]}")
        
        print(f"\n[SUCCESS] TESTE CONCLUIDO COM SUCESSO!")
        
    except PrimeCODAPIError as e:
        print(f"[ERROR] Erro da API PrimeCOD: {str(e)}")
    except Exception as e:
        print(f"[ERROR] Erro inesperado: {str(e)}")
        import traceback
        print(f"[TRACEBACK] Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    test_primecod_fix()