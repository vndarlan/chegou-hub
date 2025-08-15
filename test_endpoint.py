#!/usr/bin/env python3
"""
Script para testar o endpoint detalhar-ip em produção
"""

import requests
import json
import time
import sys

def test_endpoint():
    # URL do endpoint em produção
    base_url = "https://chegou-hubb-production.up.railway.app"
    
    # Testa primeiro o endpoint simples (sem autenticação)
    print("Testando endpoint simples (sem auth)...")
    try:
        response = requests.post(
            f"{base_url}/api/processamento/test-simple/",
            json={"test": "data"},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code == 200:
            print("OK: Endpoint simples funcionando!")
        else:
            print("ERRO: Endpoint simples com problema")
            
    except Exception as e:
        print(f"ERRO ao testar endpoint simples: {str(e)}")
    
    print("\n" + "="*50 + "\n")
    
    # Testa endpoint detalhar-ip (sem autenticação - deve dar 403)
    print("Testando endpoint detalhar-ip (deve dar 403 por falta de auth)...")
    try:
        response = requests.post(
            f"{base_url}/api/processamento/detalhar-ip/",
            json={
                "loja_id": 1,
                "ip": "192.168.1.1"
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code == 403:
            print("OK: Endpoint detalhar-ip esta respondendo (403 e esperado sem auth)")
        elif response.status_code == 500:
            print("ERRO 500 AINDA PERSISTE!")
            print("Detalhes do erro:")
            try:
                error_data = response.json()
                print(json.dumps(error_data, indent=2))
            except:
                print("Nao foi possivel parsear JSON do erro")
        else:
            print(f"Status inesperado: {response.status_code}")
            
    except Exception as e:
        print(f"ERRO ao testar endpoint detalhar-ip: {str(e)}")
    
    print("\n" + "="*50 + "\n")
    
    # Testa endpoint test-detalhar-ip (deve dar 403)
    print("Testando endpoint test-detalhar-ip...")
    try:
        response = requests.post(
            f"{base_url}/api/processamento/test-detalhar-ip/",
            json={
                "loja_id": 1,
                "ip": "192.168.1.1"
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code == 403:
            print("OK: Endpoint test esta respondendo (403 e esperado sem auth)")
        elif response.status_code == 500:
            print("ERRO 500 no endpoint de teste tambem!")
        else:
            print(f"Status inesperado: {response.status_code}")
            
    except Exception as e:
        print(f"ERRO ao testar endpoint test: {str(e)}")

def wait_for_deploy():
    """Aguarda o deploy terminar testando o health check"""
    print("Aguardando deploy do Railway...")
    
    for i in range(60):  # Testa por até 5 minutos
        try:
            response = requests.get("https://chegou-hubb-production.up.railway.app/health/", timeout=5)
            if response.status_code == 200:
                print(f"Deploy concluido apos {i*5} segundos")
                return True
        except:
            pass
        
        print(f"Aguardando... ({i*5}s)")
        time.sleep(5)
    
    print("Timeout aguardando deploy")
    return False

if __name__ == "__main__":
    print("Testador de Endpoint - Chegou Hub")
    print("="*50)
    
    # Aguarda deploy se necessário
    if "--wait" in sys.argv:
        wait_for_deploy()
        time.sleep(10)  # Aguarda mais 10s para garantir
    
    # Executa testes
    test_endpoint()
    
    print("\nTestes concluídos!")