#!/usr/bin/env python
"""
Script de teste para verificar se o IP 31.217.1.48 está sendo detectado corretamente
"""
import requests
import json

def test_ip_detection():
    """Testa a detecção do IP específico via API"""
    
    # URL do endpoint (ajustar se necessário)
    url = "http://localhost:8000/api/processamento/buscar-ips-duplicados-simples/"
    
    # Dados de teste - usar um loja_id válido
    data = {
        "loja_id": 1,  # Ajustar para um ID válido
        "days": 30
    }
    
    print("🔍 Testando detecção do IP 31.217.1.48...")
    print(f"URL: {url}")
    print(f"Dados: {data}")
    
    try:
        # Fazer requisição POST
        response = requests.post(url, json=data)
        
        print(f"\nStatus: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            # Procurar pelo IP específico
            ip_target = "31.217.1.48"
            found = False
            
            ips_duplicados = result.get('ips_duplicados', [])
            print(f"\nTotal de IPs duplicados encontrados: {len(ips_duplicados)}")
            
            for ip_data in ips_duplicados:
                if ip_data.get('ip') == ip_target:
                    found = True
                    print(f"\n✅ IP {ip_target} ENCONTRADO!")
                    print(f"   Pedidos: {ip_data.get('order_count', 0)}")
                    print(f"   Método: {ip_data.get('method_used', 'N/A')}")
                    print(f"   Detalhes: {json.dumps(ip_data, indent=2, ensure_ascii=False)}")
                    break
            
            if not found:
                print(f"\n❌ IP {ip_target} NÃO encontrado nos resultados")
                print("\nPrimeiros 3 IPs encontrados:")
                for i, ip_data in enumerate(ips_duplicados[:3]):
                    print(f"   {i+1}. {ip_data.get('ip')} - {ip_data.get('order_count')} pedidos")
        
        else:
            print(f"❌ Erro na requisição: {response.text}")
    
    except Exception as e:
        print(f"❌ Erro ao executar teste: {e}")

if __name__ == "__main__":
    test_ip_detection()