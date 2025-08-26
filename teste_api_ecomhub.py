#!/usr/bin/env python3
"""
Script de teste direto da API EcomHub para diagnóstico
"""
import requests
import json
from datetime import datetime, timedelta

def testar_api_ecomhub():
    """Testa diretamente a API externa EcomHub"""
    
    # URLs para testar
    urls = [
        'http://localhost:8001',  # Local
        'https://ecomhub-selenium-production.up.railway.app'  # Produção
    ]
    
    # Payload padrão (últimos 30 dias)
    data_fim = datetime.now().date()
    data_inicio = (datetime.now() - timedelta(days=30)).date()
    
    payload = {
        'data_inicio': data_inicio.isoformat(),
        'data_fim': data_fim.isoformat(),
        'pais_id': 'todos'
    }
    
    print("="*80)
    print("TESTE DIRETO DA API ECOMHUB")
    print("="*80)
    print(f"Período: {data_inicio} até {data_fim} ({(data_fim - data_inicio).days + 1} dias)")
    print(f"Payload: {payload}")
    print()
    
    for url_base in urls:
        print(f"Testando: {url_base}")
        print("-" * 60)
        
        try:
            # 1. Teste de health check
            print("1. Health check...")
            try:
                health_response = requests.get(f"{url_base}/health", timeout=10)
                print(f"   OK Health: {health_response.status_code}")
            except Exception as e:
                print(f"   ERRO Health: {e}")
            
            # 2. Teste da API principal
            print("2. API processar-ecomhub...")
            
            start_time = datetime.now()
            response = requests.post(
                f"{url_base}/api/processar-ecomhub/",
                json=payload,
                timeout=120,  # 2 minutos
                headers={'Content-Type': 'application/json'}
            )
            end_time = datetime.now()
            
            duration = (end_time - start_time).total_seconds()
            
            print(f"   Tempo: {duration:.2f}s")
            print(f"   Status: {response.status_code}")
            print(f"   Tamanho: {len(response.text)} chars")
            print(f"   Content-Type: {response.headers.get('content-type', 'N/A')}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"   OK JSON válido")
                    print(f"   Chaves: {list(data.keys())}")
                    
                    # Analisar dados_processados
                    dados_proc = data.get('dados_processados', [])
                    print(f"   dados_processados: {type(dados_proc)}")
                    
                    if isinstance(dados_proc, list):
                        print(f"   Lista com {len(dados_proc)} itens")
                    elif isinstance(dados_proc, dict):
                        print(f"   Dict com chaves: {list(dados_proc.keys())}")
                        if 'pedidos' in dados_proc:
                            pedidos = dados_proc['pedidos']
                            print(f"   Pedidos: {type(pedidos)} com {len(pedidos) if isinstance(pedidos, list) else 'N/A'} itens")
                    
                    # Mostrar resumo
                    print(f"   Primeiros 300 chars: {response.text[:300]}...")
                    
                except json.JSONDecodeError as e:
                    print(f"   ERRO JSON inválido: {e}")
                    print(f"   Conteúdo: {response.text[:500]}...")
            else:
                print(f"   ERRO HTTP: {response.text}")
                
        except requests.exceptions.Timeout:
            print(f"   TIMEOUT")
        except requests.exceptions.ConnectionError:
            print(f"   ERRO DE CONEXÃO")
        except Exception as e:
            print(f"   ERRO: {e}")
        
        print()

if __name__ == "__main__":
    testar_api_ecomhub()