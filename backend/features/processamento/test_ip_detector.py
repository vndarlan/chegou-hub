#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de teste para o Detector de IP do Shopify

Este script demonstra como usar as novas APIs implementadas para detectar
pedidos agrupados pelo mesmo IP.

USAR APENAS PARA TESTES DE DESENVOLVIMENTO!
"""

import requests
import json

# Configuração da API
API_BASE = "http://localhost:8000/processamento"
HEADERS = {
    "Content-Type": "application/json",
    "X-CSRFToken": "teste-token",  # Em produção, usar token real
}

def test_listar_lojas():
    """Testa listagem de lojas configuradas"""
    print("🔍 Testando: Listar lojas configuradas")
    
    try:
        response = requests.get(f"{API_BASE}/lojas/", headers=HEADERS)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('lojas'):
                print(f"✅ Encontradas {len(data['lojas'])} lojas:")
                for loja in data['lojas']:
                    print(f"  - ID: {loja['id']} | Nome: {loja['nome_loja']} | URL: {loja['shop_url']}")
                return data['lojas'][0]['id'] if data['lojas'] else None
            else:
                print("❌ Nenhuma loja encontrada")
        else:
            print(f"❌ Erro: {response.text}")
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
    
    return None

def test_buscar_ips_duplicados(loja_id):
    """Testa busca por IPs duplicados"""
    print(f"\n🔍 Testando: Buscar IPs duplicados (Loja ID: {loja_id})")
    
    payload = {
        "loja_id": loja_id,
        "days": 30,
        "min_orders": 2
    }
    
    try:
        response = requests.post(f"{API_BASE}/buscar-ips-duplicados/", 
                                headers=HEADERS, 
                                json=payload)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                ip_data = data['data']
                print(f"✅ Sucesso! Loja: {data['loja_nome']}")
                print(f"  📊 Estatísticas:")
                print(f"    - IPs únicos encontrados: {ip_data['total_ips_found']}")
                print(f"    - Total de pedidos analisados: {ip_data['total_orders_analyzed']}")
                print(f"    - Período: {ip_data['period_days']} dias")
                
                if ip_data['ip_groups']:
                    print(f"\n  🎯 Top IPs com pedidos duplicados:")
                    for i, group in enumerate(ip_data['ip_groups'][:3], 1):
                        print(f"    {i}. IP: {group['ip']}")
                        print(f"       - Pedidos: {group['order_count']}")
                        print(f"       - Clientes únicos: {group['unique_customers']}")
                        print(f"       - Vendas totais: {group['currency']} {group['total_sales']}")
                        print(f"       - Período: {group['date_range']['first'][:10]} até {group['date_range']['last'][:10]}")
                    
                    return ip_data['ip_groups'][0]['ip']  # Retorna primeiro IP para teste detalhado
                else:
                    print("  ℹ️  Nenhum IP com pedidos duplicados encontrado")
            else:
                print(f"❌ Falha na busca: {data}")
        else:
            print(f"❌ Erro HTTP: {response.text}")
    
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
    
    return None

def test_detalhar_ip(loja_id, ip):
    """Testa detalhamento de pedidos de um IP específico"""
    print(f"\n🔍 Testando: Detalhar pedidos do IP {ip}")
    
    payload = {
        "loja_id": loja_id,
        "ip": ip,
        "days": 30
    }
    
    try:
        response = requests.post(f"{API_BASE}/detalhar-ip/", 
                                headers=HEADERS, 
                                json=payload)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                group_data = data['data']
                print(f"✅ Sucesso! IP: {data['ip']}")
                print(f"  📋 Detalhes do grupo:")
                print(f"    - Total de pedidos: {group_data['order_count']}")
                print(f"    - Clientes únicos: {group_data['unique_customers']}")
                print(f"    - Vendas totais: {group_data['currency']} {group_data['total_sales']}")
                
                print(f"\n  📦 Pedidos detalhados:")
                for i, order in enumerate(group_data['orders'][:3], 1):
                    customer = order['customer']
                    print(f"    {i}. Pedido #{order['order_number']} ({order['id']})")
                    print(f"       - Data: {order['created_at'][:10]}")
                    print(f"       - Valor: {order['currency']} {order['total_price']}")
                    print(f"       - Cliente: {customer['first_name']} {customer['last_name']}")
                    print(f"       - Email: {customer['email']}")
                    print(f"       - Telefone: {customer['phone']}")
                    print(f"       - Status: {order['financial_status']}")
                    
                    if order.get('address_details'):
                        addr = order['address_details']['shipping_address']
                        print(f"       - Endereço: {addr['address1']}, {addr['city']}")
            else:
                print(f"❌ Falha no detalhamento: {data}")
        else:
            print(f"❌ Erro HTTP: {response.text}")
    
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")

def test_historico_logs():
    """Testa visualização do histórico de logs"""
    print(f"\n🔍 Testando: Histórico de logs")
    
    try:
        response = requests.get(f"{API_BASE}/historico-logs/", headers=HEADERS)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            logs = data.get('logs', [])
            print(f"✅ {len(logs)} logs encontrados")
            
            busca_ip_logs = [log for log in logs if log['tipo'] == 'Busca por IP']
            if busca_ip_logs:
                print(f"  📊 {len(busca_ip_logs)} logs de busca por IP encontrados:")
                for log in busca_ip_logs[:3]:
                    print(f"    - {log['data_execucao'][:19]} | {log['loja_nome']} | {log['status']}")
                    if log['detalhes']:
                        detalhes = log['detalhes']
                        print(f"      IPs encontrados: {detalhes.get('ips_found', 'N/A')}")
            else:
                print("  ℹ️  Nenhum log de busca por IP encontrado ainda")
        else:
            print(f"❌ Erro HTTP: {response.text}")
    
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")

def main():
    """Executa suite de testes completa"""
    print("🚀 Iniciando testes do Detector de IP do Shopify")
    print("=" * 60)
    
    # 1. Lista lojas disponíveis
    loja_id = test_listar_lojas()
    
    if not loja_id:
        print("\n❌ Não foi possível encontrar lojas para testar")
        print("💡 Configure uma loja primeiro usando o endpoint /lojas/")
        return
    
    # 2. Busca IPs duplicados
    ip_exemplo = test_buscar_ips_duplicados(loja_id)
    
    # 3. Detalha um IP específico (se encontrado)
    if ip_exemplo:
        test_detalhar_ip(loja_id, ip_exemplo)
    
    # 4. Verifica histórico de logs
    test_historico_logs()
    
    print("\n" + "=" * 60)
    print("✅ Testes concluídos!")
    print("💡 Para usar em produção:")
    print("  1. Configure autenticação adequada")
    print("  2. Use tokens CSRF válidos")
    print("  3. Implemente rate limiting")
    print("  4. Monitore performance para lojas com muitos pedidos")

if __name__ == "__main__":
    main()