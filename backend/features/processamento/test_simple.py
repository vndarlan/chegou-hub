#!/usr/bin/env python3
"""
Teste simples das correções aplicadas
"""

import json
import requests

def test_api():
    print("=== TESTE DAS CORRECOES ===")
    
    # Teste 1: Buscar IPs duplicados
    print("\n1. Testando buscar IPs duplicados...")
    url1 = "http://127.0.0.1:8000/api/processamento/buscar-ips-duplicados-simples/"
    payload1 = {"loja_id": 1, "days": 30}
    
    try:
        response1 = requests.post(url1, json=payload1, timeout=30)
        print(f"Status: {response1.status_code}")
        
        if response1.status_code == 200:
            data = response1.json()
            print(f"IPs encontrados: {data.get('total_ips', 0)}")
            
            # Mostra primeiros resultados
            for ip_group in data.get('ips_duplicados', [])[:3]:
                ip = ip_group.get('browser_ip', '')
                total = ip_group.get('total_pedidos', 0)
                clientes = ip_group.get('clientes_unicos', 0)
                diferentes = ip_group.get('clientes_diferentes', False)
                print(f"  IP: {ip} | Pedidos: {total} | Clientes unicos: {clientes} | Diferentes: {diferentes}")
        else:
            print(f"Erro: {response1.text}")
    except Exception as e:
        print(f"Erro: {str(e)}")
    
    # Teste 2: Detalhar IP específico  
    print("\n2. Testando detalhar IP...")
    url2 = "http://127.0.0.1:8000/api/processamento/detalhar-ip/"
    payload2 = {"loja_id": 1, "ip": "31.217.1.48", "days": 30}
    
    try:
        response2 = requests.post(url2, json=payload2, timeout=30)
        print(f"Status: {response2.status_code}")
        
        if response2.status_code == 200:
            data = response2.json()
            data_section = data.get('data', {})
            print(f"IP: {data_section.get('ip', '')}")
            print(f"Total pedidos: {data_section.get('total_orders', 0)}")
            print(f"Pedidos ativos: {data_section.get('active_orders', 0)}")
            print(f"Detalhes de clientes: {len(data_section.get('client_details', []))}")
            
            # Mostra primeiro cliente
            clients = data_section.get('client_details', [])
            if clients:
                client = clients[0]
                print(f"  Primeiro cliente: {client.get('customer_name', 'N/A')}")
                print(f"  Email: {client.get('customer_email', 'N/A')}")
                print(f"  Pedido: {client.get('order_number', 'N/A')}")
        else:
            print(f"Erro: {response2.text}")
    except Exception as e:
        print(f"Erro: {str(e)}")

if __name__ == "__main__":
    test_api()