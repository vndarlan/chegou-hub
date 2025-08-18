#!/usr/bin/env python
"""
Teste rápido para verificar se a função corrigida encontra o IP 31.217.1.48
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from datetime import timedelta
from django.utils import timezone
from features.processamento.models import ShopifyConfig
import shopify

def test_ip_fix():
    """Testa se a função corrigida encontra o IP 31.217.1.48"""
    print("TESTANDO CORRECAO DO IP em note_attributes...")
    
    # Busca loja ativa
    config = ShopifyConfig.objects.filter(ativo=True).first()
    if not config:
        print("❌ Nenhuma loja Shopify configurada")
        return
    
    print(f"✅ Loja encontrada: {config.shop_url}")
    
    # Conecta Shopify
    shop_url = config.shop_url
    if not shop_url.startswith('https://'):
        shop_url = f"https://{shop_url}"
    
    session = shopify.Session(shop_url, "2024-07", config.access_token)
    shopify.ShopifyResource.activate_session(session)
    
    # Busca pedidos dos últimos 7 dias
    data_inicial = timezone.now() - timedelta(days=7)
    
    orders = shopify.Order.find(
        status='any',
        created_at_min=data_inicial.isoformat(),
        limit=250
    )
    
    def extract_ip_from_order_FIXED(order_dict):
        """Versão CORRIGIDA da função"""
        
        # MÉTODO 1: note_attributes - IP address (PRIORIDADE MÁXIMA!)
        note_attributes = order_dict.get('note_attributes', [])
        if isinstance(note_attributes, list):
            for note in note_attributes:
                if isinstance(note, dict) and note.get('name') == 'IP address':
                    ip_address = note.get('value')
                    if ip_address and str(ip_address).strip() and str(ip_address).strip() != 'None':
                        return str(ip_address).strip(), 'note_attributes', 0.98
        
        # MÉTODO 2: browser_ip direto
        browser_ip = order_dict.get('browser_ip')
        if browser_ip and str(browser_ip).strip() and str(browser_ip).strip() != 'None':
            return str(browser_ip).strip(), 'browser_ip', 0.95
        
        # MÉTODO 3: client_details.browser_ip
        client_details = order_dict.get('client_details', {})
        if isinstance(client_details, dict):
            client_browser_ip = client_details.get('browser_ip')
            if client_browser_ip and str(client_browser_ip).strip():
                return str(client_browser_ip).strip(), 'client_details', 0.90
        
        return None, 'none', 0.0
    
    # Processa pedidos
    target_ip = "31.217.1.48"
    found_orders = []
    total_processed = 0
    
    print(f"\n🔍 Procurando IP: {target_ip}")
    print("=" * 50)
    
    for order in orders:
        total_processed += 1
        order_dict = order.to_dict()
        
        ip_found, method_used, confidence = extract_ip_from_order_FIXED(order_dict)
        
        if ip_found == target_ip:
            order_number = order_dict.get('order_number', 'N/A')
            created_at = order_dict.get('created_at', 'N/A')
            
            # Nome do cliente
            customer_name = 'N/A'
            customer = order_dict.get('customer', {})
            if isinstance(customer, dict):
                first_name = customer.get('first_name', '') or ''
                last_name = customer.get('last_name', '') or ''
                customer_name = f"{first_name} {last_name}".strip()
                if not customer_name:
                    customer_name = 'N/A'
            
            found_orders.append({
                'order_number': order_number,
                'created_at': created_at,
                'customer_name': customer_name,
                'ip': ip_found,
                'method': method_used,
                'confidence': confidence
            })
            
            print(f"✅ ENCONTRADO! Pedido #{order_number}")
            print(f"   📅 Data: {created_at}")
            print(f"   👤 Cliente: {customer_name}")
            print(f"   🔍 Método: {method_used} (confiança: {confidence})")
            print(f"   🌐 IP: {ip_found}")
            print("-" * 30)
    
    print(f"\n📊 RESUMO:")
    print(f"   📦 Pedidos processados: {total_processed}")
    print(f"   🎯 IP {target_ip} encontrado em: {len(found_orders)} pedidos")
    
    if found_orders:
        print(f"\n🎉 SUCESSO! A correção funcionou!")
        print(f"   ✅ Função agora encontra IP em note_attributes")
        print(f"   ✅ {len(found_orders)} pedidos detectados com mesmo IP")
    else:
        print(f"\n⚠️  IP {target_ip} não encontrado nos últimos 7 dias")
        print(f"   💡 Pode estar em período anterior ou loja diferente")
    
    return found_orders

if __name__ == "__main__":
    test_ip_fix()