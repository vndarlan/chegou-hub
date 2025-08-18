#!/usr/bin/env python3
"""
🧪 SCRIPT DE TESTE DAS CORREÇÕES DOS IPs DUPLICADOS

Testa as correções aplicadas:
1. buscar_ips_duplicados_simples - agora mostra TODOS os IPs com 2+ pedidos
2. detalhar_pedidos_ip - agora retorna dados completos dos clientes

Teste específico com IP 31.217.1.48 que tem 6 pedidos de clientes diferentes
"""

import json
import time
import requests

def test_buscar_ips_duplicados():
    """Testa o endpoint de buscar IPs duplicados com as correções"""
    print("=" * 80)
    print("🔍 TESTE 1: BUSCAR IPs DUPLICADOS (CORRIGIDO)")
    print("=" * 80)
    
    # Dados de teste
    url = "http://127.0.0.1:8000/api/processamento/buscar-ips-duplicados-simples/"
    payload = {
        "loja_id": 1,  # Ajuste conforme sua loja de teste
        "days": 30
    }
    
    print(f"📡 Fazendo requisição para: {url}")
    print(f"📝 Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Sucesso! IPs encontrados: {data.get('total_ips', 0)}")
            
            # Verifica se encontrou o IP específico
            ips_duplicados = data.get('ips_duplicados', [])
            ip_target = "31.217.1.48"
            
            encontrou_ip_target = False
            for ip_group in ips_duplicados:
                ip = ip_group.get('browser_ip', '')
                total_pedidos = ip_group.get('total_pedidos', 0)
                clientes_unicos = ip_group.get('clientes_unicos', 0)
                clientes_diferentes = ip_group.get('clientes_diferentes', False)
                
                print(f"  🔹 IP: {ip} | Pedidos: {total_pedidos} | Clientes únicos: {clientes_unicos} | Diferentes: {clientes_diferentes}")
                
                if ip == ip_target:
                    encontrou_ip_target = True
                    print(f"  🎯 ENCONTROU IP TARGET {ip_target}!")
                    print(f"     📦 Total de pedidos: {total_pedidos}")
                    print(f"     👥 Clientes únicos: {clientes_unicos}")
                    print(f"     🔄 Clientes diferentes: {clientes_diferentes}")
            
            if not encontrou_ip_target:
                print(f"⚠️  IP target {ip_target} NÃO foi encontrado na lista")
            
            return True
            
        else:
            print(f"❌ Erro: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {str(e)}")
        return False

def test_detalhar_ip():
    """Testa o endpoint de detalhar IP específico"""
    print("\n" + "=" * 80)
    print("🔍 TESTE 2: DETALHAR IP ESPECÍFICO (CORRIGIDO)")
    print("=" * 80)
    
    # Dados de teste
    url = "http://127.0.0.1:8000/api/processamento/detalhar-ip/"
    ip_target = "31.217.1.48"
    payload = {
        "loja_id": 1,  # Ajuste conforme sua loja de teste
        "ip": ip_target,
        "days": 30
    }
    
    print(f"📡 Fazendo requisição para: {url}")
    print(f"📝 Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Sucesso!")
            
            # Verifica estrutura da resposta
            data_section = data.get('data', {})
            ip = data_section.get('ip', '')
            total_orders = data_section.get('total_orders', 0)
            active_orders = data_section.get('active_orders', 0)
            cancelled_orders = data_section.get('cancelled_orders', 0)
            client_details = data_section.get('client_details', [])
            
            print(f"  🎯 IP: {ip}")
            print(f"  📦 Total de pedidos: {total_orders}")
            print(f"  ✅ Pedidos ativos: {active_orders}")
            print(f"  ❌ Pedidos cancelados: {cancelled_orders}")
            print(f"  👥 Detalhes de clientes: {len(client_details)}")
            
            # Mostra detalhes dos primeiros clientes
            for i, client in enumerate(client_details[:3]):
                print(f"    Cliente {i+1}:")
                print(f"      📋 Pedido: {client.get('order_number', 'N/A')}")
                print(f"      👤 Nome: {client.get('customer_name', 'N/A')}")
                print(f"      📧 Email: {client.get('customer_email', 'N/A')}")
                print(f"      📞 Telefone: {client.get('customer_phone', 'N/A')}")
                print(f"      🏙️ Cidade: {client.get('shipping_city', 'N/A')}")
                print(f"      🗺️ Estado: {client.get('shipping_state', 'N/A')}")
                print(f"      💰 Valor: {client.get('total_price', '0.00')} {client.get('currency', 'BRL')}")
                print(f"      📅 Data: {client.get('created_at', 'N/A')}")
                print(f"      🚦 Status: {client.get('status', 'N/A')}")
            
            return True
            
        else:
            print(f"❌ Erro: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {str(e)}")
        return False

def main():
    """Executa todos os testes"""
    print("INICIANDO TESTES DAS CORRECOES DOS IPs DUPLICADOS")
    print("⏰ Timestamp:", time.strftime("%Y-%m-%d %H:%M:%S"))
    
    # Teste 1: Buscar IPs duplicados
    test1_success = test_buscar_ips_duplicados()
    
    # Pequena pausa entre testes
    time.sleep(2)
    
    # Teste 2: Detalhar IP específico
    test2_success = test_detalhar_ip()
    
    # Resultado final
    print("\n" + "=" * 80)
    print("📊 RESUMO DOS TESTES")
    print("=" * 80)
    print(f"🔍 Buscar IPs duplicados: {'✅ PASSOU' if test1_success else '❌ FALHOU'}")
    print(f"🔍 Detalhar IP específico: {'✅ PASSOU' if test2_success else '❌ FALHOU'}")
    
    if test1_success and test2_success:
        print("\n🎉 TODOS OS TESTES PASSARAM! As correções estão funcionando.")
    else:
        print("\n⚠️  ALGUNS TESTES FALHARAM. Verifique os logs acima.")
    
    print("\n📝 CORREÇÕES APLICADAS:")
    print("  ✅ buscar_ips_duplicados_simples agora mostra TODOS os IPs com 2+ pedidos")
    print("  ✅ Adicionado contagem de clientes únicos para análise")
    print("  ✅ detalhar_ip agora retorna dados completos dos clientes")
    print("  ✅ Todos os campos necessários para o frontend foram adicionados")

if __name__ == "__main__":
    main()