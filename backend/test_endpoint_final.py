#!/usr/bin/env python
"""
Script para testar o endpoint corrigido via API
"""
import requests
import json
import os
import sys
import django

# Setup Django para buscar a loja
sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.processamento.models import ShopifyConfig

def main():
    print("=== TESTE DO ENDPOINT CORRIGIDO ===\n")
    
    # Busca a loja que criamos
    config = ShopifyConfig.objects.filter(shop_url="769ebn-2d.myshopify.com").first()
    if not config:
        print("[ERROR] Loja de teste nao encontrada")
        return False
    
    print(f"[OK] Loja encontrada: {config.nome_loja} (ID: {config.id})")
    
    # URL do endpoint
    url = "http://127.0.0.1:8000/api/processamento/buscar-ips-duplicados-simples/"
    
    # Dados da requisição
    data = {
        'loja_id': config.id,
        'days': 7  # 7 dias para ter mais dados
    }
    
    print(f"[INFO] Fazendo requisicao para: {url}")
    print(f"[INFO] Dados: {data}")
    
    try:
        # Faz a requisição
        response = requests.post(url, json=data)
        
        print(f"[INFO] Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"\n=== RESULTADO DA API ===")
            print(f"Total IPs duplicados: {result.get('total_ips', 0)}")
            print(f"Total pedidos duplicados: {result.get('total_pedidos', 0)}")
            print(f"Dias pesquisados: {result.get('days_searched', 0)}")
            print(f"Loja: {result.get('loja_nome', 'N/A')}")
            
            # Estatísticas detalhadas
            stats = result.get('statistics', {})
            if stats:
                print(f"\n=== ESTATISTICAS ===")
                print(f"Total processados: {stats.get('total_processed', 0)}")
                print(f"Excluidos: {stats.get('excluded_count', 0)}")
                print(f"IPs unicos encontrados: {stats.get('unique_ips_found', 0)}")
                print(f"Taxa de sucesso: {stats.get('success_rate', 0):.1f}%")
                
                methods = stats.get('methods_used', {})
                if methods:
                    print(f"\n=== METODOS USADOS ===")
                    for method, count in methods.items():
                        print(f"{method}: {count}")
            
            # IPs duplicados
            ips_duplicados = result.get('ips_duplicados', [])
            if ips_duplicados:
                print(f"\n=== IPs COM MULTIPLOS PEDIDOS ===")
                for i, ip_data in enumerate(ips_duplicados[:5]):  # Mostra os 5 primeiros
                    print(f"\n{i+1}. IP: {ip_data['browser_ip']}")
                    print(f"   Metodo: {ip_data.get('method_used', 'N/A')}")
                    print(f"   Confianca: {ip_data.get('confidence', 0)}")
                    print(f"   Total pedidos: {ip_data['total_pedidos']}")
                    
                    pedidos = ip_data.get('pedidos', [])
                    for j, pedido in enumerate(pedidos[:3]):  # Mostra 3 primeiros pedidos
                        print(f"   - Pedido #{pedido.get('number', 'N/A')} | {pedido.get('customer_name', 'N/A')}")
                
                if len(ips_duplicados) > 5:
                    print(f"\n... e mais {len(ips_duplicados) - 5} IPs duplicados")
            else:
                print(f"\n[INFO] Nenhum IP duplicado encontrado")
            
            print(f"\n[SUCCESS] Endpoint funcionando corretamente!")
            return True
            
        else:
            print(f"[ERROR] Erro na requisicao: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Detalhes: {error_data}")
            except:
                print(f"Resposta: {response.text}")
            return False
            
    except Exception as e:
        print(f"[ERROR] Erro na requisicao: {e}")
        return False

if __name__ == "__main__":
    main()