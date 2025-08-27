#!/usr/bin/env python3
"""
Script para testar diretamente a API Dropi e diagnosticar problemas de timeout.
Executa testes progressivos para identificar onde está o gargalo.
"""

import os
import sys
import django
import requests
import time
import json
from datetime import datetime, date, timedelta

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def test_api_direct(country='mexico', days=1):
    """Testa a API diretamente sem passar pelo Django"""
    
    # URL da API Dropi
    url = f"https://dropi-api.up.railway.app/api/dados/{country}"
    
    # Período de teste
    end_date = date.today()
    start_date = end_date - timedelta(days=days-1)
    
    payload = {
        "data_inicio": start_date.strftime('%Y-%m-%d'),
        "data_fim": end_date.strftime('%Y-%m-%d')
    }
    
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ChegouHub/1.0 DirectTest'
    }
    
    print(f"\n=== TESTE DIRETO DA API {country.upper()} ===")
    print(f"URL: {url}")
    print(f"Período: {days} dias ({start_date} até {end_date})")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print(f"Timestamp início: {datetime.now()}")
    
    try:
        start_time = time.time()
        
        # Fazer requisição
        print(f"\nIniciando requisição às {datetime.now().strftime('%H:%M:%S')}")
        
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=1800  # 30 minutos
        )
        
        elapsed_time = time.time() - start_time
        
        print(f"Resposta recebida às {datetime.now().strftime('%H:%M:%S')}")
        print(f"Tempo decorrido: {elapsed_time:.2f} segundos")
        print(f"Status Code: {response.status_code}")
        print(f"Tamanho da resposta: {len(response.text)} bytes")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"\nRESULTADOS:")
                print(f"Status: {data.get('status', 'N/A')}")
                print(f"Country: {data.get('country', 'N/A')}")
                print(f"Total pedidos: {data.get('total_pedidos', 0)}")
                print(f"Valor total: {data.get('valor_total', 0)}")
                
                pedidos = data.get('pedidos', [])
                print(f"Pedidos na resposta: {len(pedidos)}")
                
                if pedidos:
                    print(f"Primeiro pedido: {pedidos[0].get('id', 'N/A')} - {pedidos[0].get('total_order', 'N/A')}")
                    print(f"Último pedido: {pedidos[-1].get('id', 'N/A')} - {pedidos[-1].get('total_order', 'N/A')}")
                
                return {
                    'success': True,
                    'elapsed_time': elapsed_time,
                    'total_pedidos': data.get('total_pedidos', 0),
                    'status': data.get('status')
                }
                
            except json.JSONDecodeError as e:
                print(f"ERRO ao decodificar JSON: {e}")
                print(f"Primeiros 500 chars da resposta: {response.text[:500]}")
                return {'success': False, 'error': 'JSON decode error'}
        
        else:
            print(f"ERRO HTTP {response.status_code}")
            print(f"Resposta: {response.text[:1000]}")
            return {'success': False, 'error': f'HTTP {response.status_code}'}
            
    except requests.exceptions.Timeout:
        elapsed_time = time.time() - start_time if 'start_time' in locals() else 0
        print(f"TIMEOUT após {elapsed_time:.2f} segundos")
        return {'success': False, 'error': 'timeout', 'elapsed_time': elapsed_time}
        
    except requests.exceptions.ConnectionError as e:
        print(f"ERRO DE CONEXÃO: {e}")
        return {'success': False, 'error': 'connection_error'}
        
    except Exception as e:
        print(f"ERRO INESPERADO: {e}")
        return {'success': False, 'error': str(e)}

def test_health_check():
    """Testa se a API está online"""
    print("\n=== TESTE DE SAUDE DA API ===")
    
    try:
        # Teste simples de conectividade
        response = requests.get(
            "https://dropi-api.up.railway.app/health",
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Resposta: {response.text}")
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"Erro no health check: {e}")
        return False

def run_progressive_tests():
    """Executa testes progressivos para encontrar o limite"""
    print("\n" + "="*60)
    print("DIAGNOSTICO PROGRESSIVO DA API DROPI")
    print("="*60)
    
    # Primeiro, teste de saude
    if not test_health_check():
        print("[ERRO] API nao esta respondendo ao health check")
        return
    
    print("[OK] API esta online")
    
    # Testes progressivos
    test_periods = [1, 3, 7, 15, 31]
    countries = ['mexico']
    
    for country in countries:
        print(f"\n{'='*20} PAIS: {country.upper()} {'='*20}")
        
        for days in test_periods:
            result = test_api_direct(country, days)
            
            if result['success']:
                print(f"[OK] {days} dias: SUCESSO ({result['elapsed_time']:.1f}s, {result['total_pedidos']} pedidos)")
            else:
                print(f"[ERRO] {days} dias: FALHOU - {result.get('error', 'Desconhecido')}")
                
                if 'elapsed_time' in result:
                    print(f"   Tempo ate falha: {result['elapsed_time']:.1f}s")
                
                # Se falhou, nao tenta periodos maiores
                print(f"   Parando testes - limite encontrado entre {test_periods[test_periods.index(days)-1] if days != test_periods[0] else 0} e {days} dias")
                break
            
            # Pausa entre testes
            print("   Aguardando 10s antes do proximo teste...")
            time.sleep(10)

if __name__ == "__main__":
    run_progressive_tests()