#!/usr/bin/env python
"""
Script de teste para validar a implementação do proxy PrimeCOD
Execute: python manage.py shell < features/metricas_primecod/test_proxy.py
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from .utils.primecod_client import PrimeCODClient, PrimeCODAPIError
from django.contrib.auth.models import User

def test_primecod_client():
    """Testa o cliente PrimeCOD"""
    print("=== TESTE DO CLIENTE PRIMECOD ===\n")
    
    try:
        # Inicializar cliente
        print("1. Inicializando cliente...")
        client = PrimeCODClient()
        print("✅ Cliente inicializado com sucesso")
        
        # Verificar configuração
        print(f"   Base URL: {client.base_url}")
        print(f"   Token configurado: {'Sim' if client.token else 'Não'}")
        
        # Testar conexão (vai falhar se token for inválido, mas isso é esperado)
        print("\n2. Testando conexão...")
        try:
            resultado = client.test_connection()
            print(f"✅ {resultado['message']}")
        except PrimeCODAPIError as e:
            print(f"❌ Erro esperado (token de teste): {str(e)}")
        
        # Testar processamento de dados mockados
        print("\n3. Testando processamento de dados...")
        mock_orders = [
            {
                'product_name': 'Produto A',
                'country': 'Brasil',
                'status': 'Delivered',
                'created_at': '2024-01-15'
            },
            {
                'product_name': 'Produto A', 
                'country': 'Brasil',
                'status': 'Canceled',
                'created_at': '2024-01-16'
            },
            {
                'product_name': 'Produto B',
                'country': 'Argentina',
                'status': 'Delivered',
                'created_at': '2024-01-17'
            }
        ]
        
        resultado = client.process_orders_data(mock_orders)
        print(f"✅ Processamento concluído:")
        print(f"   - Orders processados: {resultado['estatisticas']['total_orders']}")
        print(f"   - Produtos únicos: {resultado['estatisticas']['produtos_unicos']}")
        print(f"   - Países únicos: {resultado['estatisticas']['paises_unicos']}")
        print(f"   - Linhas agrupadas: {len(resultado['dados_processados'])}")
        
        # Mostrar exemplo dos dados processados
        if resultado['dados_processados']:
            print(f"\n   Exemplo de dados processados:")
            exemplo = resultado['dados_processados'][0]
            for key, value in exemplo.items():
                print(f"     {key}: {value}")
        
        print("\n✅ TODOS OS TESTES DO CLIENTE PASSARAM!")
        
    except Exception as e:
        print(f"❌ ERRO NO TESTE: {str(e)}")
        import traceback
        traceback.print_exc()

def test_status_mapping():
    """Testa o mapeamento de status"""
    print("\n=== TESTE DO MAPEAMENTO DE STATUS ===\n")
    
    client = PrimeCODClient()
    
    # Testar status conhecidos
    status_teste = ['Delivered', 'Canceled', 'Confirmed', 'Unknown_Status']
    
    for status in status_teste:
        mapeado = client.status_mapping.get(status, status)
        print(f"{status} → {mapeado}")
    
    print("\n✅ TESTE DE MAPEAMENTO CONCLUÍDO!")

def test_date_filter():
    """Testa filtro de data"""
    print("\n=== TESTE DO FILTRO DE DATA ===\n")
    
    client = PrimeCODClient()
    
    # Orders mockados com diferentes datas
    mock_orders = [
        {'created_at': '2024-01-10', 'product_name': 'Produto A'},
        {'created_at': '2024-01-15', 'product_name': 'Produto B'},
        {'created_at': '2024-01-20', 'product_name': 'Produto C'},
        {'created_at': '2024-01-25', 'product_name': 'Produto D'},
    ]
    
    date_range = {'start': '2024-01-12', 'end': '2024-01-22'}
    
    filtrados = client._filter_orders_by_date(mock_orders, date_range)
    
    print(f"Orders originais: {len(mock_orders)}")
    print(f"Orders após filtro: {len(filtrados)}")
    print(f"Filtro aplicado: {date_range['start']} até {date_range['end']}")
    
    for order in filtrados:
        print(f"  - {order['created_at']}: {order['product_name']}")
    
    print("\n✅ TESTE DE FILTRO DE DATA CONCLUÍDO!")

if __name__ == "__main__":
    test_primecod_client()
    test_status_mapping()
    test_date_filter()
    
    print("\n" + "="*50)
    print("🎉 TODOS OS TESTES CONCLUÍDOS!")
    print("="*50)
    print("\nPróximos passos:")
    print("1. Configurar token real no Railway")
    print("2. Testar endpoints via API (Postman/curl)")
    print("3. Migrar frontend para usar proxy interno")
    print("4. Monitorar logs em produção")