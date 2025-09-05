"""
Script de teste para verificar as melhorias de timeout do PrimeCOD
Execute: python manage.py shell < test_primecod_timeout.py
"""

import os
import django
import time
from datetime import datetime, timedelta

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.metricas_primecod.clients.primecod_client import PrimeCODClient, PrimeCODAPIError

def test_timeout_improvements():
    """Testa as melhorias implementadas no sistema de timeout"""
    
    print("=== TESTE DAS MELHORIAS DE TIMEOUT PRIMECOD ===")
    print(f"Horário de início: {datetime.now()}")
    
    try:
        # Testar inicialização do cliente
        print("\n1. Testando inicialização do cliente...")
        client = PrimeCODClient()
        print("✅ Cliente inicializado com sucesso")
        print(f"   - Rate limit configurado: {client.min_request_interval}s (50ms)")
        print(f"   - Timeout de requisição: 120s")
        
        # Testar conexão
        print("\n2. Testando conexão com API...")
        connection_result = client.test_connection()
        print(f"   - Status: {connection_result['status']}")
        print(f"   - Token válido: {connection_result['token_valido']}")
        
        if connection_result['status'] == 'success':
            api_info = connection_result.get('api_info', {})
            print(f"   - Total orders disponíveis: {api_info.get('total_orders', 'N/A')}")
            print(f"   - Total páginas: {api_info.get('total_paginas', 'N/A')}")
            
        # Testar coleta com timeout inteligente
        print("\n3. Testando coleta com timeout inteligente (5 páginas)...")
        
        # Data range de teste (últimos 7 dias)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        date_range = {
            'start': start_date.strftime('%Y-%m-%d'),
            'end': end_date.strftime('%Y-%m-%d')
        }
        
        start_time = time.time()
        result = client.get_orders(
            page=1,
            date_range=date_range,
            max_pages=5,  # Limite pequeno para teste
            country_filter=None
        )
        end_time = time.time()
        
        duration = end_time - start_time
        print(f"✅ Coleta concluída em {duration:.2f}s")
        print(f"   - Orders coletados: {result['total_orders']}")
        print(f"   - Páginas processadas: {result['pages_processed']}")
        print(f"   - Fonte dos dados: {result.get('data_source', 'N/A')}")
        
        # Verificar se há dados em cache
        if result.get('data_source') == 'cache':
            print("✅ Sistema de cache funcionando corretamente")
        else:
            print("ℹ️  Primeira execução - dados coletados diretamente da API")
            
        print("\n4. Testando processamento dos dados...")
        processed_data = client.process_orders_data(
            orders=result['orders'],
            pais_filtro=None
        )
        
        print(f"✅ Dados processados com sucesso")
        print(f"   - Linhas de dados: {len(processed_data['dados_processados'])}")
        print(f"   - Status únicos: {processed_data['estatisticas'].get('status_unicos', 0)}")
        print(f"   - Países únicos: {processed_data['estatisticas'].get('paises_unicos', 0)}")
        
        # Verificar linha TOTAL
        total_row = next((item for item in processed_data['dados_processados'] if item.get('produto') == 'TOTAL'), None)
        if total_row:
            print("✅ Linha TOTAL encontrada nos dados processados")
        else:
            print("⚠️  Linha TOTAL não encontrada")
            
    except PrimeCODAPIError as e:
        print(f"❌ Erro da API PrimeCOD: {e}")
        if "Token" in str(e):
            print("   - Configure PRIMECOD_API_TOKEN nas variáveis de ambiente")
        
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        
    print(f"\nHorário de término: {datetime.now()}")
    print("=== FIM DO TESTE ===")

if __name__ == "__main__":
    test_timeout_improvements()